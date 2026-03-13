/**
 * Pre/post metric delta computation for experiments.
 *
 * Given an experiment with start_date, pre_window_days, and post_window_days,
 * fetches app_metrics for both windows and computes the delta.
 */

import { supabaseAdmin } from "./supabase";
import type { DbExperiment } from "./supabase";

export interface MetricWindow {
  from: string;   // YYYY-MM-DD
  to: string;     // YYYY-MM-DD
  days: number;
  avg: Record<string, number | null>;
  sum: Record<string, number | null>;
}

export interface MetricsDelta {
  experimentId: string;
  pre: MetricWindow;
  post: MetricWindow;
  metrics: Record<
    string,
    {
      preMean: number | null;
      postMean: number | null;
      absoluteDelta: number | null;
      relativeDelta: number | null; // as fraction, e.g. 0.12 = +12%
      direction: "up" | "down" | "flat" | "no_data";
    }
  >;
  dataAvailable: boolean;
  computedAt: string;
}

const METRIC_KEYS = [
  "impressions",
  "page_views",
  "installs",
  "conversion_rate",
  "crashes",
  "anr_count",
  "rating_avg",
] as const;

export async function computeMetricsDelta(exp: DbExperiment): Promise<MetricsDelta> {
  const startDate = new Date(exp.started_at!);
  const preWindowDays = exp.pre_window_days ?? 7;
  const postWindowDays = exp.post_window_days ?? 7;

  // Pre window: N days before experiment start
  const preStart = new Date(startDate);
  preStart.setDate(preStart.getDate() - preWindowDays);
  const preEnd = new Date(startDate);
  preEnd.setDate(preEnd.getDate() - 1);

  // Post window: N days after experiment start (or until ended_at)
  const postStart = new Date(startDate);
  const postEnd = exp.ended_at
    ? new Date(exp.ended_at)
    : new Date(startDate);
  if (!exp.ended_at) postEnd.setDate(postEnd.getDate() + postWindowDays);

  const toISO = (d: Date) => d.toISOString().split("T")[0];

  const [preData, postData] = await Promise.all([
    fetchMetricsWindow(exp.connected_app_id!, toISO(preStart), toISO(preEnd)),
    fetchMetricsWindow(exp.connected_app_id!, toISO(postStart), toISO(postEnd)),
  ]);

  const preWindow: MetricWindow = {
    from: toISO(preStart),
    to: toISO(preEnd),
    days: preWindowDays,
    avg: computeAvg(preData),
    sum: computeSum(preData),
  };
  const postWindow: MetricWindow = {
    from: toISO(postStart),
    to: toISO(postEnd),
    days: postWindowDays,
    avg: computeAvg(postData),
    sum: computeSum(postData),
  };

  const metricsResult: MetricsDelta["metrics"] = {};
  for (const key of METRIC_KEYS) {
    const preMean = preWindow.avg[key] ?? null;
    const postMean = postWindow.avg[key] ?? null;

    if (preMean === null && postMean === null) {
      metricsResult[key] = {
        preMean: null,
        postMean: null,
        absoluteDelta: null,
        relativeDelta: null,
        direction: "no_data",
      };
      continue;
    }

    const absDelta = preMean !== null && postMean !== null ? postMean - preMean : null;
    const relDelta = absDelta !== null && preMean !== null && preMean !== 0
      ? absDelta / Math.abs(preMean)
      : null;

    let direction: "up" | "down" | "flat" | "no_data" = "flat";
    if (relDelta !== null) {
      if (relDelta > 0.02) direction = "up";
      else if (relDelta < -0.02) direction = "down";
    }

    metricsResult[key] = { preMean, postMean, absoluteDelta: absDelta, relativeDelta: relDelta, direction };
  }

  return {
    experimentId: exp.id,
    pre: preWindow,
    post: postWindow,
    metrics: metricsResult,
    dataAvailable: preData.length > 0 || postData.length > 0,
    computedAt: new Date().toISOString(),
  };
}

async function fetchMetricsWindow(
  connectedAppId: string,
  from: string,
  to: string
): Promise<Array<Record<string, number | null>>> {
  const { data } = await supabaseAdmin
    .from("app_metrics")
    .select("impressions, page_views, installs, conversion_rate, crashes, anr_count, rating_avg")
    .eq("connected_app_id", connectedAppId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  return (data ?? []) as Array<Record<string, number | null>>;
}

function computeAvg(rows: Array<Record<string, number | null>>): Record<string, number | null> {
  if (rows.length === 0) return {};
  const result: Record<string, number | null> = {};
  for (const key of METRIC_KEYS) {
    const values = rows.map((r) => r[key]).filter((v): v is number => v !== null);
    result[key] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }
  return result;
}

function computeSum(rows: Array<Record<string, number | null>>): Record<string, number | null> {
  if (rows.length === 0) return {};
  const result: Record<string, number | null> = {};
  for (const key of METRIC_KEYS) {
    const values = rows.map((r) => r[key]).filter((v): v is number => v !== null);
    result[key] = values.length > 0 ? values.reduce((a, b) => a + b, 0) : null;
  }
  return result;
}
