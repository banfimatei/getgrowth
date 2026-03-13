import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * DELETE /api/store/connections/[id]
 * Revokes a store connection (sets status=revoked, clears credentials).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { id } = await params;

  // Verify ownership
  const { data: conn } = await supabaseAdmin
    .from("store_connections")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  // Clear credentials and mark revoked
  const { error } = await supabaseAdmin
    .from("store_connections")
    .update({
      status: "revoked",
      credentials_encrypted: "",
      credentials_iv: "",
      credentials_tag: "",
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ revoked: true });
}
