import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/connected-apps
 * Lists all connected apps with metrics tracking for the current user.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("connected_apps")
    .select(`
      id,
      store_app_id,
      platform,
      name,
      bundle_id,
      sync_enabled,
      created_at,
      store_connections (
        id,
        display_name,
        status,
        last_synced_at
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ apps: data ?? [] });
}
