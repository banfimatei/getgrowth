import { NextRequest, NextResponse } from "next/server";
import { syncAllConnections } from "@/lib/metrics-sync";

export const maxDuration = 300; // 5 min — cron jobs can run longer on pro plans

/**
 * POST /api/cron/sync-metrics
 * Daily cron job to sync metrics for all active store connections.
 * Protected by CRON_SECRET header (set by Vercel for cron invocations).
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
    const results = await syncAllConnections();
    const totalApps = results.reduce((s, r) => s + r.appsProcessed, 0);
    const totalErrors = results.reduce((s, r) => s + r.appsErrored, 0);

    console.log(`[cron/sync-metrics] Done in ${Date.now() - startedAt}ms. Connections: ${results.length}, Apps synced: ${totalApps}, Errors: ${totalErrors}`);

    return NextResponse.json({
      ok: true,
      connections: results.length,
      appsProcessed: totalApps,
      appsErrored: totalErrors,
      durationMs: Date.now() - startedAt,
      results,
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
