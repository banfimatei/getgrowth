import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { syncSingleApp } from "@/lib/metrics-sync";

export const maxDuration = 60;

// POST /api/apps/[id]/sync — on-demand sync for a single connected app
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { id } = await params;

  try {
    const result = await syncSingleApp(id, userId);
    return NextResponse.json({ ok: true, rowsUpserted: result.rowsUpserted });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sync failed" }, { status: 500 });
  }
}
