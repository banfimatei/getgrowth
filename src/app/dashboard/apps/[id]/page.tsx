"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts";
import type { DbExperiment } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  saved_app_id: string | null;
  store_connections: {
    id: string;
    display_name: string;
    status: string;
    last_synced_at: string | null;
  } | null;
}

interface TrackedKeyword {
  id: string;
  keyword: string;
  country: string;
  track_id: number | null;
  latestRank: number | null;
  latestDate: string | null;
  popularity: number | null;
  difficulty: number | null;
  dailySearches: number | null;
  opportunity: number | null;
  rankDelta: number | null;
}

interface Competitor {
  id: string;
  competitor_store_id: string;
  competitor_platform: string;
  competitor_name: string;
  competitor_icon_url: string | null;
  latestScore: number | null;
}

type MetricKey = "impressions" | "installs" | "conversion_rate" | "crashes" | "page_views";

const METRIC_OPTIONS: Array<{ key: MetricKey; label: string; color: string; format: (v: number) => string }> = [
  { key: "impressions", label: "Impressions", color: "#1E1B4B", format: (v) => v.toLocaleString() },
  { key: "installs", label: "Installs", color: "#10b981", format: (v) => v.toLocaleString() },
  { key: "page_views", label: "Page Views", color: "#f59e0b", format: (v) => v.toLocaleString() },
  { key: "conversion_rate", label: "CVR", color: "#4338CA", format: (v) => `${(v * 100).toFixed(2)}%` },
  { key: "crashes", label: "Crashes", color: "#ef4444", format: (v) => v.toLocaleString() },
];

// ---------------------------------------------------------------------------
// Delta badge
// ---------------------------------------------------------------------------

function RankDelta({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>;
  if (delta === 0) return <span className="text-xs" style={{ color: "var(--text-muted)" }}>±0</span>;
  const improved = delta > 0;
  return (
    <span
      className="text-xs font-semibold px-1.5 py-0.5 rounded"
      style={{
        backgroundColor: improved ? "var(--pass-bg)" : "var(--fail-bg)",
        color: improved ? "var(--pass-text)" : "var(--fail-text)",
      }}
    >
      {improved ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

function AppDetailContent() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const [app, setApp] = useState<ConnectedAppDetail | null>(null);
  const [metrics, setMetrics] = useState<AppMetric[]>([]);
  const [experiments, setExperiments] = useState<DbExperiment[]>([]);
  const [trackedKeywords, setTrackedKeywords] = useState<TrackedKeyword[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [auditHistory, setAuditHistory] = useState<Array<{ id: string; overall_score: number; category_scores: Record<string, number>; created_at: string; source: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [days, setDays] = useState(30);
  const [activeMetric, setActiveMetric] = useState<MetricKey>("installs");
  const [error, setError] = useState("");

  // Keyword tracking form
  const [kwInput, setKwInput] = useState("");
  const [kwCountry, setKwCountry] = useState("us");
  const [kwAdding, setKwAdding] = useState(false);
  const [kwError, setKwError] = useState("");

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

      // Load keyword tracks, competitors, and audit history if we have a saved_app_id
      const savedAppId = metricsData.app?.saved_app_id;
      if (savedAppId) {
        const [kwRes, compRes, auditsRes] = await Promise.all([
          fetch(`/api/keywords/track?appId=${savedAppId}`),
          fetch(`/api/competitors?appId=${savedAppId}`),
          fetch(`/api/apps/${savedAppId}/audits`),
        ]);
        if (kwRes.ok) {
          const kwData = await kwRes.json();
          setTrackedKeywords(kwData.tracks ?? []);
        }
        if (compRes.ok) {
          const compData = await compRes.json();
          setCompetitors(compData.competitors ?? []);
        }
        if (auditsRes.ok) {
          const auditsData = await auditsRes.json();
          setAuditHistory(auditsData.audits ?? []);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [appId, days]);

  useEffect(() => { loadData(); }, [loadData]);

  // ---- Chart data ----
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
    evaluated: "#1E1B4B",
  };

  // ---- Sync now ----
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/apps/${appId}/sync`, { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      await loadData();
    } catch {
      // silently fail — user sees stale data
    } finally {
      setSyncing(false);
    }
  };

  // ---- Track keyword ----
  const handleTrackKeyword = async () => {
    if (!kwInput.trim() || !app?.saved_app_id) return;
    setKwAdding(true);
    setKwError("");
    try {
      const res = await fetch("/api/keywords/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saved_app_id: app.saved_app_id,
          keyword: kwInput.trim(),
          country: kwCountry,
          track_id: app.platform === "ios" ? parseInt(app.store_app_id, 10) || null : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setKwError(data.error ?? "Could not add keyword");
        return;
      }
      setKwInput("");
      // Reload keyword tracks
      const kwRes = await fetch(`/api/keywords/track?appId=${app.saved_app_id}`);
      if (kwRes.ok) setTrackedKeywords((await kwRes.json()).tracks ?? []);
    } catch {
      setKwError("Could not add keyword");
    } finally {
      setKwAdding(false);
    }
  };

  // ---- Remove tracked keyword ----
  const handleRemoveKeyword = async (trackId: string) => {
    await fetch(`/api/keywords/track/${trackId}`, { method: "DELETE" });
    setTrackedKeywords((prev) => prev.filter((k) => k.id !== trackId));
  };

  // ---- Remove competitor ----
  const handleRemoveCompetitor = async (compId: string) => {
    await fetch(`/api/competitors/${compId}`, { method: "DELETE" });
    setCompetitors((prev) => prev.filter((c) => c.id !== compId));
  };

  // ---------------------------------------------------------------------------
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
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/* Header */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-start justify-between flex-wrap gap-3">
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
        <div className="flex gap-2 flex-wrap">
          {/* Sync now button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-2 rounded-xl text-sm font-medium border transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg-card)" }}
          >
            {syncing ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin inline-block" />
                Syncing…
              </span>
            ) : "Sync now"}
          </button>
          <button
            onClick={() => router.push(`/dashboard/apps/${appId}/experiments`)}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            Experiments board →
          </button>
        </div>
      </div>

      {/* Connection status warning */}
      {app.store_connections?.status === "error" && (
        <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--fail-border)", backgroundColor: "var(--fail-bg)", color: "var(--fail-text)" }}>
          Sync error. Check your store connection credentials.
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* KPI Summary cards */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

      {/* ------------------------------------------------------------------ */}
      {/* Metric chart */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="rounded-2xl border p-5"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
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
                {liveExperiments.map((e) => e.started_at && (
                  <ReferenceLine
                    key={e.id}
                    x={new Date(e.started_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    stroke="#f59e0b"
                    strokeDasharray="4 2"
                    label={{ value: "▲", fill: "#f59e0b", fontSize: 10 }}
                  />
                ))}
                <Line type="monotone" dataKey="value" stroke={activeMeta.color} strokeWidth={2} dot={false} connectNulls />
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

      {/* ------------------------------------------------------------------ */}
      {/* Keyword rank tracking */}
      {/* ------------------------------------------------------------------ */}
      {app.platform === "ios" && app.saved_app_id && (
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Keyword Rank Tracking</h2>

          {/* Add keyword form */}
          <div
            className="rounded-2xl border p-4 mb-4"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
          >
            <div className="flex gap-2 flex-wrap">
              <input
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTrackKeyword()}
                placeholder="Add keyword to track…"
                className="flex-1 min-w-0 px-3 py-2 text-sm border rounded-lg"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)", backgroundColor: "var(--bg-page)" }}
              />
              <select
                value={kwCountry}
                onChange={(e) => setKwCountry(e.target.value)}
                className="px-2 py-2 text-sm border rounded-lg"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg-page)" }}
              >
                {[["us", "🇺🇸 US"], ["gb", "🇬🇧 UK"], ["de", "🇩🇪 DE"], ["fr", "🇫🇷 FR"], ["au", "🇦🇺 AU"], ["ca", "🇨🇦 CA"]].map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
              <button
                onClick={handleTrackKeyword}
                disabled={kwAdding || !kwInput.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: "var(--accent)", color: "#fff" }}
              >
                {kwAdding ? "Adding…" : "Track"}
              </button>
            </div>
            {kwError && <p className="text-xs mt-2" style={{ color: "var(--fail-text)" }}>{kwError}</p>}
          </div>

          {trackedKeywords.length > 0 ? (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "var(--bg-section)", borderBottom: "1px solid var(--border)" }}>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Keyword</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Rank</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Change</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Pop</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Diff</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Opp</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {trackedKeywords.map((kw, i) => (
                    <tr
                      key={kw.id}
                      style={{
                        borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                      }}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{kw.keyword}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{kw.country.toUpperCase()}{kw.latestDate ? ` · ${kw.latestDate}` : ""}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {kw.latestRank != null ? `#${kw.latestRank}` : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <RankDelta delta={kw.rankDelta} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
                          {kw.popularity ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
                          {kw.difficulty ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className="text-xs tabular-nums font-semibold"
                          style={{ color: (kw.opportunity ?? 0) > 50 ? "#10b981" : "var(--text-secondary)" }}
                        >
                          {kw.opportunity ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => handleRemoveKeyword(kw.id)}
                          className="text-xs hover:opacity-70"
                          style={{ color: "var(--text-muted)" }}
                          title="Remove tracking"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className="rounded-2xl border-2 border-dashed p-6 text-center"
              style={{ borderColor: "var(--border)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No keywords tracked yet. Add keywords to monitor your daily ranking.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Competitors */}
      {/* ------------------------------------------------------------------ */}
      {app.saved_app_id && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Competitors</h2>
            <button
              onClick={() => router.push(`/compare?id=${app.store_app_id}&platform=${app.platform}&name=${encodeURIComponent(app.name)}`)}
              className="text-xs"
              style={{ color: "var(--accent)" }}
            >
              + Add via compare →
            </button>
          </div>

          {competitors.length > 0 ? (
            <div className="space-y-2">
              {competitors.map((comp) => (
                <div
                  key={comp.id}
                  className="flex items-center justify-between rounded-xl border px-4 py-3"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
                >
                  <div className="flex items-center gap-3">
                    {comp.competitor_icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={comp.competitor_icon_url} alt={comp.competitor_name} className="w-9 h-9 rounded-xl object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold" style={{ backgroundColor: "var(--bg-section)", color: "var(--text-muted)" }}>
                        {comp.competitor_name[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{comp.competitor_name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{comp.competitor_platform} · {comp.competitor_store_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {comp.latestScore != null && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: "var(--bg-section)",
                          color: comp.latestScore >= 75 ? "#10b981" : comp.latestScore >= 55 ? "#f59e0b" : "#ef4444",
                        }}
                      >
                        {comp.latestScore}
                      </span>
                    )}
                    <button
                      onClick={() => router.push(`/compare?id=${app.store_app_id}&platform=${app.platform}&name=${encodeURIComponent(app.name)}&bid=${comp.competitor_store_id}&bplatform=${comp.competitor_platform}`)}
                      className="text-xs"
                      style={{ color: "var(--accent)" }}
                    >
                      Compare →
                    </button>
                    <button
                      onClick={() => handleRemoveCompetitor(comp.id)}
                      className="text-xs hover:opacity-70"
                      style={{ color: "var(--text-muted)" }}
                    >
                      ✕
                    </button>
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
                No competitors saved. Use Compare to run a side-by-side and save apps as competitors.
              </p>
              <button
                onClick={() => router.push(`/compare?id=${app.store_app_id}&platform=${app.platform}&name=${encodeURIComponent(app.name)}`)}
                className="text-sm px-4 py-2 rounded-xl font-medium"
                style={{ backgroundColor: "var(--bg-section)", color: "var(--text-primary)" }}
              >
                Go to Compare →
              </button>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Score Trend (F3) */}
      {/* ------------------------------------------------------------------ */}
      {auditHistory.filter((a) => a.source === "auto_public" && !("competitor_id" in a && a.competitor_id)).length >= 2 && (() => {
        const autoAudits = auditHistory
          .filter((a) => a.source === "auto_public")
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latest = autoAudits[0];
        const previous = autoAudits[1];
        const delta = latest.overall_score - previous.overall_score;
        const improved = delta > 0;
        const flat = delta === 0;

        const categoryDiffs = Object.keys({ ...previous.category_scores, ...latest.category_scores })
          .map((cat) => ({
            cat,
            prev: previous.category_scores[cat] ?? 0,
            curr: latest.category_scores[cat] ?? 0,
            diff: (latest.category_scores[cat] ?? 0) - (previous.category_scores[cat] ?? 0),
          }))
          .filter((d) => Math.abs(d.diff) >= 3)
          .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
          .slice(0, 4);

        return (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Listing Score Trend</h2>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Updated {new Date(latest.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            </div>
            <div
              className="rounded-2xl border p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
            >
              {/* Score comparison */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: "var(--text-muted)" }}>{previous.overall_score}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Before</p>
                </div>
                <span style={{ color: "var(--text-muted)" }}>→</span>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: flat ? "var(--text-primary)" : improved ? "#10b981" : "#ef4444" }}>
                    {latest.overall_score}
                  </p>
                  <p
                    className="text-xs font-semibold mt-0.5"
                    style={{ color: flat ? "var(--text-muted)" : improved ? "#10b981" : "#ef4444" }}
                  >
                    {flat ? "No change" : `${improved ? "+" : ""}${delta} pts`}
                  </p>
                </div>
              </div>

              {/* Category diffs */}
              {categoryDiffs.length > 0 && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                    {improved ? "Most improved" : "Most affected areas"}
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {categoryDiffs.map(({ cat, diff }) => (
                      <div key={cat} className="flex justify-between text-xs">
                        <span style={{ color: "var(--text-secondary)" }} className="truncate">{cat}</span>
                        <span
                          className="font-semibold ml-2 flex-shrink-0"
                          style={{ color: diff > 0 ? "#10b981" : "#ef4444" }}
                        >
                          {diff > 0 ? "+" : ""}{diff}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* ------------------------------------------------------------------ */}
      {/* Experiments */}
      {/* ------------------------------------------------------------------ */}
      <section>
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
      </section>
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
