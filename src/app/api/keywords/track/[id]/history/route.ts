import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/keywords/track/[id]/history?days=30
 * Full rank history for a single tracked keyword.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { id } = await params;
  const days = parseInt(request.nextUrl.searchParams.get("days") ?? "30", 10);

  // Verify ownership via keyword_tracks
  const { data: track } = await supabaseAdmin
    .from("keyword_tracks")
    .select("id, keyword, country, track_id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!track) {
    return NextResponse.json({ error: "Keyword track not found" }, { status: 404 });
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: history } = await supabaseAdmin
    .from("keyword_rank_history")
    .select("date, rank, popularity, difficulty, daily_searches, opportunity")
    .eq("keyword_track_id", id)
    .gte("date", since.toISOString().split("T")[0])
    .order("date", { ascending: true });

  return NextResponse.json({
    track,
    history: history ?? [],
  });
}
