import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/apps/[id]/audits — get audit history for a saved app
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership
  const { data: app } = await supabaseAdmin
    .from("saved_apps")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("audits")
    .select("id, overall_score, category_scores, ai_powered, created_at")
    .eq("saved_app_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ audits: data });
}
