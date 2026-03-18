import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_COMPETITORS_PER_APP = 5;

/**
 * POST /api/competitors
 * Save a competitor for a saved app.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { saved_app_id, competitor_store_id, platform, name, icon_url } = body ?? {};

  if (!saved_app_id || !competitor_store_id || !platform || !name) {
    return NextResponse.json(
      { error: "saved_app_id, competitor_store_id, platform, and name are required" },
      { status: 400 }
    );
  }

  // Verify the saved_app belongs to the user
  const { data: savedApp } = await supabaseAdmin
    .from("saved_apps")
    .select("id")
    .eq("id", saved_app_id)
    .eq("user_id", userId)
    .single();

  if (!savedApp) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  // Enforce per-app limit
  const { count } = await supabaseAdmin
    .from("competitors")
    .select("*", { count: "exact", head: true })
    .eq("saved_app_id", saved_app_id)
    .eq("user_id", userId);

  if ((count ?? 0) >= MAX_COMPETITORS_PER_APP) {
    return NextResponse.json(
      { error: `Maximum ${MAX_COMPETITORS_PER_APP} competitors per app` },
      { status: 422 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("competitors")
    .upsert(
      {
        user_id: userId,
        saved_app_id,
        competitor_store_id,
        competitor_platform: platform,
        competitor_name: name,
        competitor_icon_url: icon_url ?? null,
      },
      { onConflict: "saved_app_id,competitor_store_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ competitor: data });
}

/**
 * GET /api/competitors?appId=<saved_app_id>
 * List saved competitors for an app, with latest audit score.
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

  const { data: competitors } = await supabaseAdmin
    .from("competitors")
    .select("id, competitor_store_id, competitor_platform, competitor_name, competitor_icon_url")
    .eq("saved_app_id", appId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!competitors?.length) {
    return NextResponse.json({ competitors: [] });
  }

  // Attach latest audit score for each competitor
  const enriched = await Promise.all(
    competitors.map(async (comp) => {
      const { data: latestAudit } = await supabaseAdmin
        .from("audits")
        .select("overall_score, created_at")
        .eq("saved_app_id", appId)
        .eq("competitor_id", comp.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        ...comp,
        latestScore: latestAudit?.overall_score ?? null,
        latestAuditAt: latestAudit?.created_at ?? null,
      };
    })
  );

  return NextResponse.json({ competitors: enriched });
}
