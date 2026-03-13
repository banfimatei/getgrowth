"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts";
import type { DbExperiment } from "@/lib/supabase";

interface AppMetric {
  date: string;
  impressions: number | null;
  page_views: number | null;
  installs: number | null;
  conversion_rate: number | null;
  crashes: number | null;
  anr_count: number | null;
  rating_avg: number | null;
  rating_count: number | null;
}

interface ConnectedAppDetail {
  id: string;
  name: string;
  platform: string;
  store_app_id: string;
  bundle_id: string | null;
  sync_enabled: boolean;
  store_connections: {
    id: string;
    display_name: string;
    status: string;
    last_synced_at: string | null;
  } | null;
}

type MetricKey = "impressions" | "installs" | "conversion_rate" | "crashes" | "page_views";

const METRIC_OPTIONS: Array<{ key: MetricKey; label: string; color: string; format: (v: number) => string }> = [
  { key: "impressions", label: "Impressions", color: "#b45309", format: (v) => v.toLocaleString() },
  { key: "installs", label: "Installs", color: "#10b981", format: (v) => v.toLocaleString() },
  { key: "page_views", label: "Page Views", color: "#f59e0b", format: (v) => v.toLocaleString() },
  { key: "conversion_rate", label: "CVR", color: "#8b5cf6", format: (v) => `${(v * 100).toFixed(2)}%` },
  { key: "crashes", label: "Crashes", color: "#ef4444", format: (v) => v.toLocaleString() },
];

function AppDetailContent() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const [app, setApp] = useState<ConnectedAppDetail | null>(null);
  const [metrics, setMetrics] = useState<AppMetric[]>([]);
  const [experiments, setExperiments] = useState<DbExperiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [activeMetric, setActiveMetric] = useState<MetricKey>("installs");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [metricsRes, experimentsRes] = await Promise.all([
        fetch(`/api/connected-apps/${appId}/metrics?days=${days}`),
        fetch(`/api/experiments?connectedAppId=${appId}`),
      ]);

      if (!metricsRes.ok) {
        setError("App not found or no access.");
        return;
      }

      const metricsData = await metricsRes.json();
      const expData = experimentsRes.ok ? await experimentsRes.json() : { experiments: [] };

      setApp(metricsData.app);
      setMetrics(metricsData.metrics ?? []);
      setExperiments(expData.experiments ?? []);
    } finally {
      setLoading(false);
    }
  }, [appId, days]);

  useEffect(() => { loadData(); }, [loadData]);

  // Chart data with experiment start markers
  const liveExperiments = experiments.filter((e) => e.started_at);
  const chartData = metrics.map((m) => ({
    date: m.date,
    value: m[activeMetric] ?? null,
    shortDate: new Date(m.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
  }));

  const activeMeta = METRIC_OPTIONS.find((o) => o.key === activeMetric)!;

  // Summary stats
  const recentMetrics = metrics.slice(-7);
  const prevMetrics = metrics.slice(-14, -7);
  const avgRecent = (key: MetricKey) => {
    const vals = recentMetrics.map((m) => m[key]).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const avgPrev = (key: MetricKey) => {
    const vals = prevMetrics.map((m) => m[key]).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const trend = (key: MetricKey): string => {
    const r = avgRecent(key);
    const p = avgPrev(key);
    if (r === null || p === null || p === 0) return "";
    const pct = ((r - p) / Math.abs(p)) * 100;
    return pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
  };

  const statusColors: Record<DbExperiment["status"], string> = {
    backlog: "var(--text-muted)",
    in_progress: "#f59e0b",
    live: "#10b981",
    evaluated: "#b45309",
  };

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-12 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />
      </main>
    );
  }

  if (error || !app) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-12">
        <button onClick={() => router.back()} className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>← Back</button>
        <p style={{ color: "var(--fail-text)" }}>{error || "App not found."}</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <button onClick={() => router.push("/dashboard")} className="text-xs mb-2 block" style={{ color: "var(--text-muted)" }}>
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{app.name}</h1>
          <p className="text-xs mt-0.5 font-mono" style={{ color: "var(--text-muted)" }}>
            {app.store_app_id} · {app.platform}
            {app.store_connections?.last_synced_at && (
              <> · Last synced {new Date(app.store_connections.last_synced_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>
            )}
          </p>
        </div>
        <button
          onClick={() => router.push(`/dashboard/apps/${appId}/experiments`)}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          Experiments board →
        </button>
      </div>

      {/* Connection status warning */}
      {app.store_connections?.status === "error" && (
        <div className="rounded-xl border px-4 py-3 mb-5 text-sm" style={{ borderColor: "var(--fail-border)", backgroundColor: "var(--fail-bg)", color: "var(--fail-text)" }}>
          Sync error. Check your store connection credentials.
        </div>
      )}

      {/* KPI Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {METRIC_OPTIONS.filter((m) => m.key !== "page_views").map((opt) => {
          const val = avgRecent(opt.key);
          const t = trend(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => setActiveMetric(opt.key)}
              className="rounded-2xl border p-4 text-left transition-all"
              style={{
                borderColor: activeMetric === opt.key ? opt.color : "var(--border)",
                backgroundColor: "var(--bg-card)",
                boxShadow: activeMetric === opt.key ? `0 0 0 2px ${opt.color}33` : undefined,
              }}
            >
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{opt.label}</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: val !== null ? opt.color : "var(--text-muted)" }}>
                {val !== null ? opt.format(val) : "—"}
              </p>
              {t && (
                <p className="text-xs mt-0.5" style={{ color: t.startsWith("+") ? "#10b981" : "#ef4444" }}>
                  {t} vs prev 7d
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Metric chart */}
      <div
        className="rounded-2xl border p-5 mb-6"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex gap-2">
            {METRIC_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setActiveMetric(opt.key)}
                className="text-xs px-3 py-1 rounded-full transition-all"
                style={{
                  backgroundColor: activeMetric === opt.key ? opt.color : "var(--bg-section)",
                  color: activeMetric === opt.key ? "#fff" : "var(--text-secondary)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="text-xs px-2 py-1 rounded"
                style={{
                  backgroundColor: days === d ? "var(--bg-section)" : "transparent",
                  color: days === d ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {chartData.filter((d) => d.value !== null).length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 0, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis dataKey="shortDate" tick={{ fontSize: 10, fill: "var(--text-muted)" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} width={40}
                  tickFormatter={(v) => activeMetric === "conversion_rate" ? `${(v * 100).toFixed(1)}%` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)" }}
                  formatter={(v) => [activeMeta.format(v as number), activeMeta.label]}
                  labelFormatter={(l) => l}
                />
                {/* Experiment start markers */}
                {liveExperiments.map((e) => e.started_at && (
                  <ReferenceLine
                    key={e.id}
                    x={new Date(e.started_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    stroke="#f59e0b"
                    strokeDasharray="4 2"
                    label={{ value: "▲", fill: "#f59e0b", fontSize: 10 }}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={activeMeta.color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>No metrics yet</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Metrics sync daily. First data will appear tomorrow.</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent experiments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Experiments</h2>
          <button
            onClick={() => router.push(`/dashboard/apps/${appId}/experiments`)}
            className="text-xs" style={{ color: "var(--accent)" }}
          >
            View all →
          </button>
        </div>

        {experiments.length > 0 ? (
          <div className="space-y-2">
            {experiments.slice(0, 5).map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between rounded-xl border px-4 py-3"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{exp.title}</p>
                  {exp.target_metric && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Target: {exp.target_metric}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {exp.outcome && (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: exp.outcome === "win" ? "var(--pass-bg)" : exp.outcome === "loss" ? "var(--fail-bg)" : "var(--bg-section)",
                        color: exp.outcome === "win" ? "var(--pass-text)" : exp.outcome === "loss" ? "var(--fail-text)" : "var(--text-muted)",
                      }}
                    >
                      {exp.outcome}
                    </span>
                  )}
                  <span
                    className="text-xs capitalize px-2 py-0.5 rounded-full"
                    style={{ color: statusColors[exp.status], backgroundColor: `${statusColors[exp.status]}18` }}
                  >
                    {exp.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl border-2 border-dashed p-6 text-center"
            style={{ borderColor: "var(--border)" }}
          >
            <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
              No experiments yet. Create one from an audit finding or start fresh.
            </p>
            <button
              onClick={() => router.push(`/dashboard/apps/${appId}/experiments`)}
              className="text-sm px-4 py-2 rounded-xl font-medium"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              Start first experiment
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AppDetailPage() {
  return (
    <Suspense>
      <AppDetailContent />
    </Suspense>
  );
}
