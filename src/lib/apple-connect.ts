/**
 * Apple App Store Connect API client
 *
 * Uses JWT-based auth (ES256, signed with .p8 private key).
 * Analytics reports use the /v1/analyticsReportRequests async workflow:
 *   1. POST request -> get requestId
 *   2. Poll GET until reports are AVAILABLE
 *   3. GET individual report segments, download + parse CSV
 */

import { sign } from "jsonwebtoken";

const ASC_BASE = "https://api.appstoreconnect.apple.com/v1";

export interface AppleCredentials {
  issuerId: string;
  keyId: string;
  privateKey: string; // contents of the .p8 file (PEM format)
}

export interface AppleApp {
  id: string;          // Apple numeric App ID
  name: string;
  bundleId: string;
  sku: string;
}

export interface DailyMetrics {
  date: string;       // YYYY-MM-DD
  impressions: number | null;
  pageViews: number | null;
  installs: number | null;
  conversionRate: number | null;
  crashes: number | null;
  sessions: number | null;
}

// ---------------------------------------------------------------------------
// JWT auth
// ---------------------------------------------------------------------------

export function generateAppleJwt(creds: AppleCredentials): string {
  const payload = {
    iss: creds.issuerId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 1200, // 20 min
    aud: "appstoreconnect-v1",
  };
  return sign(payload, creds.privateKey, {
    algorithm: "ES256",
    header: { alg: "ES256", kid: creds.keyId, typ: "JWT" },
  });
}

function authHeaders(creds: AppleCredentials): Record<string, string> {
  return {
    Authorization: `Bearer ${generateAppleJwt(creds)}`,
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// List apps
// ---------------------------------------------------------------------------

export async function listAppleApps(creds: AppleCredentials): Promise<AppleApp[]> {
  const res = await fetch(`${ASC_BASE}/apps?limit=200&fields[apps]=name,bundleId,sku`, {
    headers: authHeaders(creds),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apple listApps failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  return (json.data || []).map((d: Record<string, unknown>) => {
    const attrs = d.attributes as Record<string, string>;
    return {
      id: d.id as string,
      name: attrs.name,
      bundleId: attrs.bundleId,
      sku: attrs.sku ?? "",
    };
  });
}

// ---------------------------------------------------------------------------
// Analytics report request/fetch/parse
// ---------------------------------------------------------------------------

type ReportType = "APP_STORE_ENGAGEMENT" | "APP_USAGE" | "PERFORMANCE";

/**
 * Request an analytics report for a date range.
 * Returns the report request ID to poll.
 */
export async function requestAnalyticsReport(
  creds: AppleCredentials,
  appId: string,
  reportType: ReportType,
  startDate: string, // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
): Promise<string> {
  const body = {
    data: {
      type: "analyticsReportRequests",
      attributes: {
        accessType: "ONE_TIME_SNAPSHOT",
      },
      relationships: {
        app: { data: { type: "apps", id: appId } },
      },
    },
  };

  const res = await fetch(`${ASC_BASE}/analyticsReportRequests`, {
    method: "POST",
    headers: authHeaders(creds),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apple requestReport failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.data.id as string;
}

/**
 * Poll until reports are available, then download and parse them.
 * Retries up to maxAttempts (default 10) with exponential backoff.
 */
export async function fetchAnalyticsReports(
  creds: AppleCredentials,
  requestId: string,
  maxAttempts = 10
): Promise<DailyMetrics[]> {
  let delay = 3000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(delay);
    delay = Math.min(delay * 1.5, 30000);

    const res = await fetch(`${ASC_BASE}/analyticsReportRequests/${requestId}/reports`, {
      headers: authHeaders(creds),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Apple fetchReports failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const json = await res.json();
    const reports = (json.data || []) as Array<Record<string, unknown>>;

    if (reports.length === 0) continue; // not ready yet

    // Download and parse all report segments
    const allMetrics: DailyMetrics[] = [];
    for (const report of reports) {
      const attrs = report.attributes as Record<string, unknown>;
      if (attrs.processingState !== "COMPLETE") continue;

      // Get the download segments
      const segRes = await fetch(
        `${ASC_BASE}/analyticsReportRequests/${requestId}/reports/${report.id}/segments`,
        { headers: authHeaders(creds) }
      );
      if (!segRes.ok) continue;
      const segJson = await segRes.json();

      for (const segment of segJson.data || []) {
        const segAttrs = segment.attributes as Record<string, string>;
        if (!segAttrs.url) continue;
        try {
          const csvRes = await fetch(segAttrs.url);
          if (!csvRes.ok) continue;
          const csv = await csvRes.text();
          const parsed = parseAnalyticsCsv(csv);
          allMetrics.push(...parsed);
        } catch {
          // skip individual segment failures
        }
      }
    }

    if (allMetrics.length > 0) return allMetrics;
  }
  return [];
}

// ---------------------------------------------------------------------------
// CSV parser for App Store Connect analytics reports
// ---------------------------------------------------------------------------

export function parseAnalyticsCsv(csv: string): DailyMetrics[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split("\t").map((h) => h.trim().toLowerCase());

  const dateIdx  = findIdx(headers, ["date", "day"]);
  const impIdx   = findIdx(headers, ["impressions", "impression"]);
  const pvIdx    = findIdx(headers, ["product page views", "page views", "pageviews"]);
  const dlIdx    = findIdx(headers, ["total downloads", "downloads", "installs"]);
  const sessIdx  = findIdx(headers, ["sessions"]);
  const crashIdx = findIdx(headers, ["crashes"]);

  const results: DailyMetrics[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    if (cols.length < 2) continue;

    const date = dateIdx >= 0 ? cols[dateIdx]?.trim() : null;
    if (!date || !date.match(/\d{4}-\d{2}-\d{2}/)) continue;

    const impressions  = parseNum(cols[impIdx]);
    const pageViews    = parseNum(cols[pvIdx]);
    const installs     = parseNum(cols[dlIdx]);
    const sessions     = parseNum(cols[sessIdx]);
    const crashes      = parseNum(cols[crashIdx]);
    const convRate     = impressions && installs ? installs / impressions : null;

    results.push({ date, impressions, pageViews, installs, conversionRate: convRate, crashes, sessions });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findIdx(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const i = headers.findIndex((h) => h.includes(c));
    if (i >= 0) return i;
  }
  return -1;
}

function parseNum(val: string | undefined): number | null {
  if (val === undefined || val === "" || val === "--") return null;
  const n = parseFloat(val.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Simplified daily sync helper (yesterday's data only)
// ---------------------------------------------------------------------------

export async function fetchYesterdayMetrics(
  creds: AppleCredentials,
  appId: string
): Promise<DailyMetrics | null> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];

  try {
    const requestId = await requestAnalyticsReport(
      creds, appId, "APP_STORE_ENGAGEMENT", dateStr, dateStr
    );
    const metrics = await fetchAnalyticsReports(creds, requestId);
    return metrics.find((m) => m.date === dateStr) ?? null;
  } catch {
    return null;
  }
}
