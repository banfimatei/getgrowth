import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/leads/[token]
 * Returns a saved lead audit by magic token.
 * Public — no auth required. Token acts as the access key.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { data: lead } = await supabaseAdmin
    .from("audit_leads")
    .select("id, token, app_name, app_icon_url, store_id, platform, score, category_scores, created_at, claimed_user_id")
    .eq("token", token)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  return NextResponse.json({ lead });
}
