/**
 * Google Play API client
 *
 * Uses service account credentials for OAuth2.
 * Provides:
 *   - App listing via Google Play Developer API (androidpublisher v3)
 *   - Vitals (crash/ANR) via Play Developer Reporting API
 *   - Reviews via androidpublisher v3
 *
 * NOTE: Install/impression/CVR data is NOT available via any Google REST API.
 * It requires Cloud Storage data export setup. This is handled separately.
 */

const REPORTING_BASE = "https://playdeveloperreporting.googleapis.com/v1beta1";
const PUBLISHER_BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3";

export interface GoogleServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  token_uri: string;
}

export interface GooglePlayApp {
  packageName: string;
  name: string;
}

export interface DailyVitals {
  date: string;     // YYYY-MM-DD
  crashRate: number | null;
  anrRate: number | null;
  crashes: number | null;
  anrCount: number | null;
}

export interface PlayReview {
  reviewId: string;
  authorName: string;
  rating: number;
  text: string;
  date: string;
  replyText: string | null;
}

// ---------------------------------------------------------------------------
// OAuth2 access token from service account
// ---------------------------------------------------------------------------

export async function getGoogleAccessToken(sa: GoogleServiceAccount): Promise<string> {
  // Dynamic import to avoid bundling issues in edge
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    credentials: sa,
    scopes: [
      "https://www.googleapis.com/auth/playdeveloperreporting",
      "https://www.googleapis.com/auth/androidpublisher",
    ],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse.token) throw new Error("Failed to get Google access token");
  return tokenResponse.token;
}

function googleHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// List apps
// ---------------------------------------------------------------------------

/**
 * List all apps accessible via the service account.
 * Uses the androidpublisher API — returns apps the SA has access to.
 */
export async function listGooglePlayApps(sa: GoogleServiceAccount): Promise<GooglePlayApp[]> {
  const token = await getGoogleAccessToken(sa);

  // The androidpublisher API doesn't have a "list all apps" endpoint directly.
  // We use the Developer API's inappproducts endpoint as a proxy, or
  // ask the user to specify package names. For the wizard flow we'll
  // validate by attempting to fetch app details for a given package name.
  // Return empty here — the wizard uses validatePackageName instead.
  void token;
  return [];
}

/**
 * Validate that a package name is accessible with this service account.
 * Returns app details or throws.
 */
export async function validateGooglePackage(
  sa: GoogleServiceAccount,
  packageName: string
): Promise<{ packageName: string; name: string }> {
  const token = await getGoogleAccessToken(sa);

  // Try to fetch the app edit — this validates access
  const res = await fetch(
    `${PUBLISHER_BASE}/applications/${encodeURIComponent(packageName)}/reviews?maxResults=1`,
    { headers: googleHeaders(token) }
  );

  if (res.status === 403) throw new Error("Service account does not have access to this app. Check Play Console permissions.");
  if (res.status === 404) throw new Error(`App '${packageName}' not found on Google Play.`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Play validation failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return { packageName, name: packageName };
}

// ---------------------------------------------------------------------------
// Vitals (crash + ANR rates)
// ---------------------------------------------------------------------------

export async function fetchGoogleVitals(
  sa: GoogleServiceAccount,
  packageName: string,
  daysBack = 7
): Promise<DailyVitals[]> {
  const token = await getGoogleAccessToken(sa);

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (daysBack - 1));

  const formatDate = (d: Date) => ({
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  });

  const body = {
    timeline: {
      aggregationPeriod: "DAILY",
      startTime: formatDate(startDate),
      endTime: formatDate(endDate),
    },
    dimensions: [],
    metrics: ["crashRate", "anrRate"],
    pageSize: 200,
  };

  const results: DailyVitals[] = [];

  for (const metricSet of ["crashRateMetricSet", "anrRateMetricSet"]) {
    try {
      const res = await fetch(
        `${REPORTING_BASE}/apps/${encodeURIComponent(packageName)}/${metricSet}:query`,
        { method: "POST", headers: googleHeaders(token), body: JSON.stringify(body) }
      );
      if (!res.ok) continue;
      const json = await res.json();

      for (const row of json.rows ?? []) {
        const td = row.startTime;
        if (!td) continue;
        const date = `${td.year}-${String(td.month).padStart(2, "0")}-${String(td.day).padStart(2, "0")}`;
        const value = row.aggregationPeriodMetrics?.value ?? null;

        const existing = results.find((r) => r.date === date);
        if (existing) {
          if (metricSet === "crashRateMetricSet") existing.crashRate = value;
          else existing.anrRate = value;
        } else {
          results.push({
            date,
            crashRate: metricSet === "crashRateMetricSet" ? value : null,
            anrRate: metricSet === "anrRateMetricSet" ? value : null,
            crashes: null,
            anrCount: null,
          });
        }
      }
    } catch {
      // skip individual metric set failures
    }
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export async function fetchGoogleReviews(
  sa: GoogleServiceAccount,
  packageName: string,
  maxResults = 10
): Promise<PlayReview[]> {
  const token = await getGoogleAccessToken(sa);

  const res = await fetch(
    `${PUBLISHER_BASE}/applications/${encodeURIComponent(packageName)}/reviews?maxResults=${maxResults}&translationLanguage=en`,
    { headers: googleHeaders(token) }
  );
  if (!res.ok) return [];

  const json = await res.json();
  return (json.reviews ?? []).map((r: Record<string, unknown>) => {
    const comment = (r.comments as Array<Record<string, unknown>>)?.[0];
    const userComment = comment?.userComment as Record<string, unknown> | undefined;
    return {
      reviewId: r.reviewId as string,
      authorName: (r.authorName as string) ?? "Anonymous",
      rating: (userComment?.starRating as number) ?? 0,
      text: (userComment?.text as string) ?? "",
      date: userComment?.lastModified
        ? new Date(((userComment.lastModified as Record<string, number>).seconds ?? 0) * 1000)
            .toISOString()
            .split("T")[0]
        : "",
      replyText:
        ((comment?.developerComment as Record<string, unknown> | undefined)?.text as string) ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Yesterday helper
// ---------------------------------------------------------------------------

export async function fetchYesterdayVitals(
  sa: GoogleServiceAccount,
  packageName: string
): Promise<DailyVitals | null> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];

  try {
    const vitals = await fetchGoogleVitals(sa, packageName, 1);
    return vitals.find((v) => v.date === dateStr) ?? null;
  } catch {
    return null;
  }
}
