"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import type { DbExperiment, ExperimentStatus, ExperimentOutcome, TargetMetric } from "@/lib/supabase";

const COLUMNS: Array<{ status: ExperimentStatus; label: string; color: string }> = [
  { status: "backlog", label: "Backlog", color: "var(--text-muted)" },
  { status: "in_progress", label: "In Progress", color: "#f59e0b" },
  { status: "live", label: "Live", color: "#10b981" },
  { status: "evaluated", label: "Evaluated", color: "#b45309" },
];

const TARGET_METRICS: TargetMetric[] = ["installs", "conversion_rate", "impressions", "crashes", "rating_avg"];

interface MetricsDelta {
  metrics: Record<string, {
    preMean: number | null;
    postMean: number | null;
    relativeDelta: number | null;
    direction: "up" | "down" | "flat" | "no_data";
  }>;
  dataAvailable: boolean;
}

function ExperimentCard({
  exp,
  onMove,
  onDelete,
  onEvaluate,
  connectedAppId,
}: {
  exp: DbExperiment;
  onMove: (id: string, status: ExperimentStatus) => void;
  onDelete: (id: string) => void;
  onEvaluate: (id: string, outcome: ExperimentOutcome, notes: string) => void;
  connectedAppId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [outcome, setOutcome] = useState<ExperimentOutcome>("win");
  const [notes, setNotes] = useState(exp.outcome_notes ?? "");
  const [delta, setDelta] = useState<MetricsDelta | null>(null);
  const [loadingDelta, setLoadingDelta] = useState(false);

  async function loadDelta() {
    if (delta || !exp.started_at) return;
    setLoadingDelta(true);
    try {
      const res = await fetch(`/api/experiments/${exp.id}/metrics`);
      if (res.ok) {
        const data = await res.json();
        setDelta(data.delta);
      }
    } finally {
      setLoadingDelta(false);
    }
  }

  const nextStatuses = COLUMNS.map((c) => c.status).filter((s) => s !== exp.status);
  const col = COLUMNS.find((c) => c.status === exp.status)!;

  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-page)" }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p
          className="text-sm font-medium leading-tight cursor-pointer flex-1"
          style={{ color: "var(--text-primary)" }}
          onClick={() => { setExpanded(!expanded); if (!expanded && exp.started_at) loadDelta(); }}
        >
          {exp.title}
        </p>
        <button
          onClick={() => onDelete(exp.id)}
          className="text-xs opacity-30 hover:opacity-70 flex-shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          ×
        </button>
      </div>

      {exp.target_metric && (
        <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
          Target: <span style={{ color: col.color }}>{exp.target_metric.replace("_", " ")}</span>
        </p>
      )}

      {exp.outcome && (
        <span
          className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2"
          style={{
            backgroundColor: exp.outcome === "win" ? "var(--pass-bg)" : exp.outcome === "loss" ? "var(--fail-bg)" : "var(--bg-section)",
            color: exp.outcome === "win" ? "var(--pass-text)" : exp.outcome === "loss" ? "var(--fail-text)" : "var(--text-muted)",
          }}
        >
          {exp.outcome === "win" ? "✓ Win" : exp.outcome === "loss" ? "✗ Loss" : "~ Neutral"}
        </span>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-2 pt-2 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
          {exp.hypothesis && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              <strong>Hypothesis:</strong> {exp.hypothesis}
            </p>
          )}
          {exp.started_at && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Started {new Date(exp.started_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              {exp.ended_at && ` · Ended ${new Date(exp.ended_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
            </p>
          )}

          {/* Metrics delta */}
          {loadingDelta && (
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Loading metrics…</div>
          )}
          {delta?.dataAvailable && (
            <div className="rounded-lg p-2" style={{ backgroundColor: "var(--bg-section)" }}>
              <p className="text-xs font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Pre/post impact</p>
              {Object.entries(delta.metrics)
                .filter(([, v]) => v.direction !== "no_data")
                .map(([key, v]) => (
                  <div key={key} className="flex items-center justify-between text-xs mb-0.5">
                    <span style={{ color: "var(--text-secondary)" }}>{key.replace("_", " ")}</span>
                    <span style={{ color: v.direction === "up" ? "#10b981" : v.direction === "down" ? "#ef4444" : "var(--text-muted)" }}>
                      {v.relativeDelta !== null ? `${v.relativeDelta >= 0 ? "+" : ""}${(v.relativeDelta * 100).toFixed(1)}%` : "—"}
                    </span>
                  </div>
                ))
              }
            </div>
          )}

          {/* Evaluate form */}
          {exp.status === "live" && !exp.outcome && (
            <div>
              {!evaluating ? (
                <button
                  onClick={() => setEvaluating(true)}
                  className="text-xs px-3 py-1.5 rounded-lg w-full text-center"
                  style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                >
                  Evaluate experiment
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {(["win", "neutral", "loss"] as ExperimentOutcome[]).map((o) => (
                      <button
                        key={o}
                        onClick={() => setOutcome(o)}
                        className="flex-1 py-1 rounded text-xs font-medium capitalize"
                        style={{
                          backgroundColor: outcome === o
                            ? o === "win" ? "var(--pass-bg)" : o === "loss" ? "var(--fail-bg)" : "var(--bg-section)"
                            : "transparent",
                          color: outcome === o
                            ? o === "win" ? "var(--pass-text)" : o === "loss" ? "var(--fail-text)" : "var(--text-muted)"
                            : "var(--text-muted)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes / learnings…"
                    rows={2}
                    className="w-full px-2 py-1.5 text-xs border rounded"
                    style={{ backgroundColor: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEvaluating(false)} className="flex-1 py-1 text-xs border rounded" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                      Cancel
                    </button>
                    <button
                      onClick={() => { onEvaluate(exp.id, outcome, notes); setEvaluating(false); }}
                      className="flex-1 py-1 text-xs rounded font-medium"
                      style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Move to next status */}
      {exp.status !== "evaluated" && (
        <div className="mt-2 flex gap-1 flex-wrap">
          {nextStatuses.filter((s) => {
            // Only allow forward moves and back to backlog
            const order = COLUMNS.map((c) => c.status);
            const cur = order.indexOf(exp.status);
            const next = order.indexOf(s);
            return next === cur + 1 || s === "backlog";
          }).map((s) => {
            const col = COLUMNS.find((c) => c.status === s)!;
            return (
              <button
                key={s}
                onClick={() => onMove(exp.id, s)}
                className="text-xs px-2 py-0.5 rounded-full border capitalize"
                style={{ borderColor: col.color, color: col.color, opacity: 0.8 }}
              >
                → {s.replace("_", " ")}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewExperimentForm({
  connectedAppId,
  onCreated,
  onCancel,
  prefill,
}: {
  connectedAppId: string;
  onCreated: (exp: DbExperiment) => void;
  onCancel: () => void;
  prefill?: { title?: string; hypothesis?: string; auditFindingId?: string; targetMetric?: TargetMetric };
}) {
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [hypothesis, setHypothesis] = useState(prefill?.hypothesis ?? "");
  const [targetMetric, setTargetMetric] = useState<TargetMetric | "">(prefill?.targetMetric ?? "");
  const [duration, setDuration] = useState(14);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectedAppId,
          auditFindingId: prefill?.auditFindingId,
          title: title.trim(),
          hypothesis: hypothesis.trim() || undefined,
          targetMetric: targetMetric || undefined,
          expectedDurationDays: duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      onCreated(data.experiment);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--accent)", backgroundColor: "rgba(180,83,9,0.04)" }}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Experiment title…"
        className="w-full px-3 py-2 text-sm border rounded-lg"
        style={{ backgroundColor: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        autoFocus
      />
      <textarea
        value={hypothesis}
        onChange={(e) => setHypothesis(e.target.value)}
        placeholder="Hypothesis: If we change X, we expect Y because Z…"
        rows={2}
        className="w-full px-3 py-2 text-xs border rounded-lg"
        style={{ backgroundColor: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
      />
      <div className="flex gap-2">
        <select
          value={targetMetric}
          onChange={(e) => setTargetMetric(e.target.value as TargetMetric | "")}
          className="flex-1 px-2 py-1.5 text-xs border rounded"
          style={{ backgroundColor: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        >
          <option value="">Target metric…</option>
          {TARGET_METRICS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
        </select>
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-24 px-2 py-1.5 text-xs border rounded"
          style={{ backgroundColor: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        >
          {[7, 14, 21, 30].map((d) => <option key={d} value={d}>{d} days</option>)}
        </select>
      </div>
      {error && <p className="text-xs" style={{ color: "var(--fail-text)" }}>{error}</p>}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-1.5 text-xs border rounded" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          Cancel
        </button>
        <button onClick={create} disabled={saving} className="flex-1 py-1.5 text-xs rounded font-medium disabled:opacity-60" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
          {saving ? "Creating…" : "Create"}
        </button>
      </div>
    </div>
  );
}

function ExperimentsContent() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const [experiments, setExperiments] = useState<DbExperiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [appName, setAppName] = useState("");
  const [showNew, setShowNew] = useState<ExperimentStatus | null>(null);

  const loadExperiments = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, appRes] = await Promise.all([
        fetch(`/api/experiments?connectedAppId=${appId}`),
        fetch(`/api/connected-apps/${appId}/metrics?days=1`),
      ]);
      const expData = await expRes.json();
      if (appRes.ok) {
        const appData = await appRes.json();
        setAppName(appData.app?.name ?? "");
      }
      setExperiments(expData.experiments ?? []);
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => { loadExperiments(); }, [loadExperiments]);

  async function moveExperiment(id: string, status: ExperimentStatus) {
    setExperiments((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
    await fetch(`/api/experiments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteExperiment(id: string) {
    if (!confirm("Delete this experiment?")) return;
    setExperiments((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/experiments/${id}`, { method: "DELETE" });
  }

  async function evaluateExperiment(id: string, outcome: ExperimentOutcome, notes: string) {
    setExperiments((prev) => prev.map((e) => e.id === id ? { ...e, status: "evaluated", outcome, outcome_notes: notes } : e));
    await fetch(`/api/experiments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "evaluated", outcome, outcomeNotes: notes }),
    });
  }

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-12 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <button onClick={() => router.push(`/dashboard/apps/${appId}`)} className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
            ← {appName || "App detail"}
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Experiments</h1>
        </div>
        <button
          onClick={() => setShowNew("backlog")}
          className="text-sm px-4 py-2 rounded-xl font-medium"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          + New experiment
        </button>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colExps = experiments.filter((e) => e.status === col.status);
          return (
            <div key={col.status}>
              {/* Column header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{col.label}</span>
                  <span
                    className="text-xs w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "var(--bg-section)", color: "var(--text-muted)" }}
                  >
                    {colExps.length}
                  </span>
                </div>
                {col.status === "backlog" && (
                  <button
                    onClick={() => setShowNew("backlog")}
                    className="text-xs"
                    style={{ color: "var(--accent)" }}
                  >
                    +
                  </button>
                )}
              </div>

              {/* Cards */}
              <div
                className="rounded-2xl p-3 min-h-32 space-y-2"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                {showNew === col.status && (
                  <NewExperimentForm
                    connectedAppId={appId}
                    onCreated={(exp) => {
                      setExperiments((prev) => [exp, ...prev]);
                      setShowNew(null);
                    }}
                    onCancel={() => setShowNew(null)}
                  />
                )}
                {colExps.map((exp) => (
                  <ExperimentCard
                    key={exp.id}
                    exp={exp}
                    onMove={moveExperiment}
                    onDelete={deleteExperiment}
                    onEvaluate={evaluateExperiment}
                    connectedAppId={appId}
                  />
                ))}
                {colExps.length === 0 && !showNew && (
                  <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
                    {col.status === "backlog" ? "Add experiments from audit findings" : "No experiments here yet"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

export default function ExperimentsPage() {
  return (
    <Suspense>
      <ExperimentsContent />
    </Suspense>
  );
}
