import { NextRequest, NextResponse } from "next/server";
import { reAuditAll } from "@/lib/re-audit";

export const maxDuration = 300;

/**
 * POST /api/cron/re-audit
 * Weekly cron job (Saturdays 07:00 UTC):
 * Heuristic re-audit for all connected apps and their saved competitors.
 * No AI — uses runAudit() which is free/stateless.
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
    const results = await reAuditAll();
    const duration = Date.now() - startedAt;

    console.log(
      `[cron/re-audit] Done in ${duration}ms. ` +
      `Apps: ${results.connectedApps.processed} processed, ${results.connectedApps.errored} errors. ` +
      `Competitors: ${results.competitors.processed} processed, ${results.competitors.errored} errors.`
    );

    return NextResponse.json({ ok: true, results, durationMs: duration });
  } catch (error) {
    console.error("[cron/re-audit] Fatal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Re-audit failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
