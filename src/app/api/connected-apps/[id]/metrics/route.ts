import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/connected-apps/[id]/metrics?days=30
 * Returns metric time-series for a connected app.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { id } = await params;
  const days = parseInt(request.nextUrl.searchParams.get("days") ?? "30", 10);

  // Verify ownership
  const { data: app } = await supabaseAdmin
    .from("connected_apps")
    .select("id, user_id, name, platform")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  const { data: metrics, error } = await supabaseAdmin
    .from("app_metrics")
    .select("date, impressions, page_views, installs, uninstalls, conversion_rate, crashes, anr_count, rating_avg, rating_count")
    .eq("connected_app_id", id)
    .gte("date", sinceStr)
    .order("date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ app, metrics: metrics ?? [] });
}
