import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { computeMetricsDelta } from "@/lib/experiment-metrics";

/**
 * GET /api/experiments/[id]/metrics
 * Computes pre/post metric deltas for a live or evaluated experiment.
 * Also persists the computed delta back to the experiment record.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { id } = await params;

  const { data: exp } = await supabaseAdmin
    .from("experiments")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!exp) return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  if (!exp.connected_app_id) {
    return NextResponse.json({ error: "No connected app — link an app to compute metrics" }, { status: 422 });
  }
  if (!exp.started_at) {
    return NextResponse.json({ error: "Experiment has not started yet" }, { status: 422 });
  }

  const delta = await computeMetricsDelta(exp);

  // Persist delta
  if (Object.keys(delta.metrics).length > 0) {
    await supabaseAdmin
      .from("experiments")
      .update({ metrics_delta: delta as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  return NextResponse.json({ delta });
}
