import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/store/connections
 * Lists all store connections for the current user (no credentials returned).
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("store_connections")
    .select("id, platform, display_name, status, last_synced_at, last_error, created_at")
    .eq("user_id", userId)
    .neq("status", "revoked")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // For each connection, count connected apps
  const connectionsWithCounts = await Promise.all(
    (data ?? []).map(async (conn) => {
      const { count } = await supabaseAdmin
        .from("connected_apps")
        .select("*", { count: "exact", head: true })
        .eq("store_connection_id", conn.id)
        .eq("sync_enabled", true);
      return { ...conn, app_count: count ?? 0 };
    })
  );

  return NextResponse.json({ connections: connectionsWithCounts });
}
