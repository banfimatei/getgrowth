import { NextRequest, NextResponse } from "next/server";
import { syncAllConnections } from "@/lib/metrics-sync";
import { scanAllTrackedKeywords } from "@/lib/keyword-scanner";
import { supabaseAdmin } from "@/lib/supabase";
import { sendRankAlertDigest } from "@/lib/email";
import { buildAndSaveProfile } from "@/lib/profile-compiler";
import type { RankAlert } from "@/lib/keyword-scanner";

export const maxDuration = 300; // 5 min — cron jobs can run longer on pro plans

/**
 * POST /api/cron/sync-metrics
 * Daily cron job:
 *  1. Sync store metrics for all active connections (Apple/Google)
 *  2. Scan all tracked keywords and record rank snapshots
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startedAt = Date.now();
  try {
    // 1. Sync store metrics
    const metricsResults = await syncAllConnections();
    const totalApps = metricsResults.reduce((s, r) => s + r.appsProcessed, 0);
    const totalErrors = metricsResults.reduce((s, r) => s + r.appsErrored, 0);

    // 2. Scan tracked keywords
    const keywordScan = await scanAllTrackedKeywords();

    // 3. Send rank alert digest emails (group alerts by userId)
    if (keywordScan.alerts.length > 0) {
      const byUser: Record<string, RankAlert[]> = {};
      for (const alert of keywordScan.alerts) {
        (byUser[alert.userId] ??= []).push(alert);
      }
      // Resolve user emails
      const userIds = Object.keys(byUser);
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id, email")
        .in("id", userIds);
      const emailMap: Record<string, string> = {};
      for (const u of users ?? []) emailMap[u.id] = u.email;

      const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://getgrowth.eu";
      for (const [uid, alerts] of Object.entries(byUser)) {
        const email = emailMap[uid];
        if (!email) continue;
        try {
          await sendRankAlertDigest({
            to: email,
            alerts,
            dashboardUrl: `${APP_URL}/dashboard`,
          });
        } catch (e) {
          console.error(`[cron/sync-metrics] Failed to send rank alert to ${email}:`, e);
        }
      }
      console.log(`[cron/sync-metrics] Sent rank alerts to ${Object.keys(byUser).length} users`);
    }

    // 4. Rebuild app context profiles for all connected apps
    let profilesRebuilt = 0;
    const { data: allConnectedApps } = await supabaseAdmin
      .from("connected_apps")
      .select("saved_app_id, user_id")
      .eq("sync_enabled", true);

    if (allConnectedApps?.length) {
      for (const ca of allConnectedApps) {
        if (!ca.saved_app_id || !ca.user_id) continue;
        try {
          await buildAndSaveProfile(ca.saved_app_id, ca.user_id);
          profilesRebuilt++;
        } catch (e) {
          console.error(`[cron/sync-metrics] Profile rebuild failed for ${ca.saved_app_id}:`, e);
        }
      }
    }

    const duration = Date.now() - startedAt;
    console.log(
      `[cron/sync-metrics] Done in ${duration}ms. ` +
      `Connections: ${metricsResults.length}, Apps synced: ${totalApps}, Errors: ${totalErrors}. ` +
      `Keywords scanned: ${keywordScan.snapshotted}/${keywordScan.tracked}, Skipped: ${keywordScan.skipped}, Errors: ${keywordScan.errors}. ` +
      `Profiles rebuilt: ${profilesRebuilt}`
    );

    return NextResponse.json({
      ok: true,
      metrics: {
        connections: metricsResults.length,
        appsProcessed: totalApps,
        appsErrored: totalErrors,
        results: metricsResults,
      },
      keywords: keywordScan,
      durationMs: duration,
    });
  } catch (error) {
    console.error("[cron/sync-metrics] Fatal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

// Also support GET for manual triggering in development
export async function GET(request: NextRequest) {
  return POST(request);
}
