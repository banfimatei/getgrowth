import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hasAiUnlock } from "@/lib/tier-guard";

const MAX_TRACKED_PER_APP = 20;

/**
 * POST /api/keywords/track
 * Add a keyword to tracking for a saved app.
 * Requires AI unlock (paid audit) for that app.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { saved_app_id, keyword, country = "us", track_id, store_id, platform } = body ?? {};

  if (!saved_app_id || !keyword) {
    return NextResponse.json({ error: "saved_app_id and keyword are required" }, { status: 400 });
  }

  // Verify app belongs to user
  const { data: savedApp } = await supabaseAdmin
    .from("saved_apps")
    .select("id, store_id, platform")
    .eq("id", saved_app_id)
    .eq("user_id", userId)
    .single();

  if (!savedApp) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  // Keyword tracking requires AI unlock
  const appStoreId = store_id || savedApp.store_id;
  const appPlatform = platform || savedApp.platform;
  const unlocked = await hasAiUnlock(userId, appStoreId, appPlatform);
  if (!unlocked) {
    return NextResponse.json(
      { error: "Full AI audit required to track keywords", needsCredits: true },
      { status: 403 }
    );
  }

  // Enforce per-app limit
  const { count } = await supabaseAdmin
    .from("keyword_tracks")
    .select("*", { count: "exact", head: true })
    .eq("saved_app_id", saved_app_id)
    .eq("user_id", userId)
    .eq("is_active", true);

  if ((count ?? 0) >= MAX_TRACKED_PER_APP) {
    return NextResponse.json(
      { error: `Maximum ${MAX_TRACKED_PER_APP} tracked keywords per app` },
      { status: 422 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("keyword_tracks")
    .upsert(
      {
        user_id: userId,
        saved_app_id,
        keyword: keyword.toLowerCase().trim(),
        country,
        track_id: track_id ?? null,
        is_active: true,
      },
      { onConflict: "saved_app_id,keyword,country" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ track: data });
}

/**
 * GET /api/keywords/track?appId=<saved_app_id>
 * List all active tracked keywords for an app, with latest rank snapshot.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const appId = request.nextUrl.searchParams.get("appId");
  if (!appId) {
    return NextResponse.json({ error: "appId is required" }, { status: 400 });
  }

  const { data: tracks } = await supabaseAdmin
    .from("keyword_tracks")
    .select("*")
    .eq("saved_app_id", appId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (!tracks?.length) {
    return NextResponse.json({ tracks: [] });
  }

  // Fetch rank history for delta calculation — limit to last 7 days per batch
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const trackIds = tracks.map((t) => t.id);
  const { data: latestRanks } = await supabaseAdmin
    .from("keyword_rank_history")
    .select("keyword_track_id, rank, popularity, difficulty, daily_searches, opportunity, date")
    .in("keyword_track_id", trackIds)
    .gte("date", sevenDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: false });

  type RankRow = { keyword_track_id: string; rank: number | null; popularity: number | null; difficulty: number | null; daily_searches: number | null; opportunity: number | null; date: string };

  // Get previous-day rank for delta calculation
  const latestByTrack: Record<string, RankRow> = {};
  const prevByTrack: Record<string, RankRow> = {};
  for (const row of latestRanks ?? []) {
    if (!latestByTrack[row.keyword_track_id]) {
      latestByTrack[row.keyword_track_id] = row;
    } else if (!prevByTrack[row.keyword_track_id]) {
      prevByTrack[row.keyword_track_id] = row;
    }
  }

  const enriched = tracks.map((track) => {
    const latest = latestByTrack[track.id] ?? null;
    const prev = prevByTrack[track.id] ?? null;
    const rankDelta =
      latest?.rank != null && prev?.rank != null
        ? prev.rank - latest.rank // positive = improved (rank number decreased)
        : null;

    return {
      ...track,
      latestRank: latest?.rank ?? null,
      latestDate: latest?.date ?? null,
      popularity: latest?.popularity ?? null,
      difficulty: latest?.difficulty ?? null,
      dailySearches: latest?.daily_searches ?? null,
      opportunity: latest?.opportunity ?? null,
      rankDelta,
    };
  });

  return NextResponse.json({ tracks: enriched });
}
