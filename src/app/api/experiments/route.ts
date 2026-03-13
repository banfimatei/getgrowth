import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { ExperimentStatus, TargetMetric } from "@/lib/supabase";

/**
 * GET /api/experiments?connectedAppId=&status=
 * Lists experiments for the current user, optionally filtered.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const connectedAppId = request.nextUrl.searchParams.get("connectedAppId");
  const status = request.nextUrl.searchParams.get("status") as ExperimentStatus | null;

  let query = supabaseAdmin
    .from("experiments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (connectedAppId) query = query.eq("connected_app_id", connectedAppId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ experiments: data ?? [] });
}

/**
 * POST /api/experiments
 * Creates a new experiment.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await request.json();
  const {
    connectedAppId,
    auditFindingId,
    title,
    hypothesis,
    targetMetric,
    expectedDurationDays,
    preWindowDays,
    postWindowDays,
  } = body as {
    connectedAppId?: string;
    auditFindingId?: string;
    title: string;
    hypothesis?: string;
    targetMetric?: TargetMetric;
    expectedDurationDays?: number;
    preWindowDays?: number;
    postWindowDays?: number;
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("experiments")
    .insert({
      user_id: userId,
      connected_app_id: connectedAppId ?? null,
      audit_finding_id: auditFindingId ?? null,
      title: title.trim(),
      hypothesis: hypothesis ?? null,
      status: "backlog",
      target_metric: targetMetric ?? null,
      expected_duration_days: expectedDurationDays ?? 14,
      pre_window_days: preWindowDays ?? 7,
      post_window_days: postWindowDays ?? 7,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ experiment: data });
}
