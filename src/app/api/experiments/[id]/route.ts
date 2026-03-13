import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { ExperimentStatus, ExperimentOutcome, TargetMetric } from "@/lib/supabase";

/**
 * PATCH /api/experiments/[id]
 * Updates an experiment (status transitions, outcome, etc.).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { id } = await params;

  // Verify ownership
  const { data: exp } = await supabaseAdmin
    .from("experiments")
    .select("id, user_id, status")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!exp) return NextResponse.json({ error: "Experiment not found" }, { status: 404 });

  const body = await request.json();
  const {
    title,
    hypothesis,
    status,
    targetMetric,
    expectedDurationDays,
    preWindowDays,
    postWindowDays,
    outcome,
    outcomeNotes,
    connectedAppId,
  } = body as {
    title?: string;
    hypothesis?: string;
    status?: ExperimentStatus;
    targetMetric?: TargetMetric;
    expectedDurationDays?: number;
    preWindowDays?: number;
    postWindowDays?: number;
    outcome?: ExperimentOutcome;
    outcomeNotes?: string;
    connectedAppId?: string;
  };

  // Auto-set timestamps on status transitions
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title;
  if (hypothesis !== undefined) updates.hypothesis = hypothesis;
  if (targetMetric !== undefined) updates.target_metric = targetMetric;
  if (expectedDurationDays !== undefined) updates.expected_duration_days = expectedDurationDays;
  if (preWindowDays !== undefined) updates.pre_window_days = preWindowDays;
  if (postWindowDays !== undefined) updates.post_window_days = postWindowDays;
  if (outcome !== undefined) updates.outcome = outcome;
  if (outcomeNotes !== undefined) updates.outcome_notes = outcomeNotes;
  if (connectedAppId !== undefined) updates.connected_app_id = connectedAppId;

  if (status !== undefined) {
    updates.status = status;
    if (status === "live" && exp.status !== "live") {
      updates.started_at = new Date().toISOString();
    }
    if (status === "evaluated" && exp.status !== "evaluated") {
      updates.ended_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabaseAdmin
    .from("experiments")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ experiment: data });
}

/**
 * DELETE /api/experiments/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("experiments")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
