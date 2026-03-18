import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { buildAndSaveProfile } from "@/lib/profile-compiler";

/**
 * GET /api/apps/[id]/profile
 * Returns the cached profile if fresh enough, otherwise compiles on-demand.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { id: savedAppId } = await params;

  const { data: app } = await supabaseAdmin
    .from("saved_apps")
    .select("id, user_id")
    .eq("id", savedAppId)
    .eq("user_id", userId)
    .single();

  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const { data: existing } = await supabaseAdmin
    .from("app_profiles")
    .select("context, version, built_at")
    .eq("saved_app_id", savedAppId)
    .single();

  if (existing) {
    const age = Date.now() - new Date(existing.built_at).getTime();
    const STALE_MS = 6 * 60 * 60 * 1000; // 6 hours
    if (age < STALE_MS) {
      return NextResponse.json({ profile: existing.context, cached: true });
    }
  }

  const context = await buildAndSaveProfile(savedAppId, userId);
  return NextResponse.json({ profile: context, cached: false });
}

/**
 * POST /api/apps/[id]/profile
 * Force-rebuild the profile (e.g., after a new audit or experiment evaluation).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { id: savedAppId } = await params;

  const { data: app } = await supabaseAdmin
    .from("saved_apps")
    .select("id, user_id")
    .eq("id", savedAppId)
    .eq("user_id", userId)
    .single();

  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const context = await buildAndSaveProfile(savedAppId, userId);
  return NextResponse.json({ profile: context, rebuilt: true });
}
