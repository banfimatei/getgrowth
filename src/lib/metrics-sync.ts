/**
 * Metrics sync orchestrator
 * Called by the daily cron job to sync metrics for all active store connections.
 */

import { supabaseAdmin } from "./supabase";
import { decryptCredentials } from "./crypto";
import {
  fetchYesterdayMetrics,
  type AppleCredentials,
} from "./apple-connect";
import {
  fetchYesterdayVitals,
  type GoogleServiceAccount,
} from "./google-play-api";

export interface SyncResult {
  connectionId: string;
  platform: string;
  appsProcessed: number;
  appsErrored: number;
  errors: string[];
}

/**
 * Sync metrics for all active connections.
 * Returns a summary of what was processed.
 */
export async function syncAllConnections(): Promise<SyncResult[]> {
  const { data: connections } = await supabaseAdmin
    .from("store_connections")
    .select("id, user_id, platform, credentials_encrypted, credentials_iv, credentials_tag")
    .eq("status", "active");

  if (!connections?.length) return [];

  const results: SyncResult[] = [];

  for (const conn of connections) {
    const result: SyncResult = {
      connectionId: conn.id,
      platform: conn.platform,
      appsProcessed: 0,
      appsErrored: 0,
      errors: [],
    };

    try {
      const credentials = decryptCredentials(
        conn.credentials_encrypted,
        conn.credentials_iv,
        conn.credentials_tag
      );

      const { data: apps } = await supabaseAdmin
        .from("connected_apps")
        .select("id, store_app_id, name")
        .eq("store_connection_id", conn.id)
        .eq("sync_enabled", true);

      if (!apps?.length) {
        await supabaseAdmin
          .from("store_connections")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", conn.id);
        results.push(result);
        continue;
      }

      for (const app of apps) {
        try {
          if (conn.platform === "ios") {
            await syncAppleApp(credentials as unknown as AppleCredentials, app.id, app.store_app_id);
          } else {
            const sa = (credentials as Record<string, unknown>).serviceAccountJson as GoogleServiceAccount;
            await syncGoogleApp(sa, app.id, app.store_app_id);
          }
          result.appsProcessed++;
        } catch (err) {
          result.appsErrored++;
          result.errors.push(`${app.name}: ${err instanceof Error ? err.message : "unknown"}`);
        }
      }

      await supabaseAdmin
        .from("store_connections")
        .update({ last_synced_at: new Date().toISOString(), last_error: null, status: "active" })
        .eq("id", conn.id);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "unknown error";
      result.errors.push(errMsg);
      await supabaseAdmin
        .from("store_connections")
        .update({ status: "error", last_error: errMsg })
        .eq("id", conn.id);
    }

    results.push(result);
  }

  return results;
}

/**
 * Sync metrics for a single connected app (on-demand, per-user).
 */
export async function syncSingleApp(
  connectedAppId: string,
  userId: string
): Promise<{ rowsUpserted: number }> {
  const { data: app } = await supabaseAdmin
    .from("connected_apps")
    .select("id, store_app_id, store_connection_id")
    .eq("id", connectedAppId)
    .single();

  if (!app) throw new Error("App not found");

  const { data: conn } = await supabaseAdmin
    .from("store_connections")
    .select("id, user_id, platform, credentials_encrypted, credentials_iv, credentials_tag")
    .eq("id", app.store_connection_id)
    .eq("user_id", userId)
    .single();

  if (!conn) throw new Error("Connection not found or access denied");

  const credentials = decryptCredentials(
    conn.credentials_encrypted,
    conn.credentials_iv,
    conn.credentials_tag
  );

  if (conn.platform === "ios") {
    await syncAppleApp(credentials as unknown as AppleCredentials, app.id, app.store_app_id);
  } else {
    const sa = (credentials as Record<string, unknown>).serviceAccountJson as GoogleServiceAccount;
    await syncGoogleApp(sa, app.id, app.store_app_id);
  }

  return { rowsUpserted: 1 };
}

async function syncAppleApp(
  creds: AppleCredentials,
  connectedAppId: string,
  appId: string
): Promise<void> {
  const metrics = await fetchYesterdayMetrics(creds, appId);
  if (!metrics) return;

  await supabaseAdmin
    .from("app_metrics")
    .upsert(
      {
        connected_app_id: connectedAppId,
        date: metrics.date,
        impressions: metrics.impressions,
        page_views: metrics.pageViews,
        installs: metrics.installs,
        conversion_rate: metrics.conversionRate,
        crashes: metrics.crashes,
      },
      { onConflict: "connected_app_id,date" }
    );
}

async function syncGoogleApp(
  sa: GoogleServiceAccount,
  connectedAppId: string,
  packageName: string
): Promise<void> {
  const vitals = await fetchYesterdayVitals(sa, packageName);
  if (!vitals) return;

  // Google Play Reporting API only provides rates (crashRate/anrRate), not raw counts.
  // Store rates in the crashes/anr_count columns for display, and preserve raw values in raw_data.
  await supabaseAdmin
    .from("app_metrics")
    .upsert(
      {
        connected_app_id: connectedAppId,
        date: vitals.date,
        crashes: vitals.crashRate != null ? Math.round(vitals.crashRate * 10000) : null, // store as integer (x10000 for precision)
        anr_count: vitals.anrRate != null ? Math.round(vitals.anrRate * 10000) : null,
        raw_data: { crashRate: vitals.crashRate, anrRate: vitals.anrRate },
      },
      { onConflict: "connected_app_id,date" }
    );
}
