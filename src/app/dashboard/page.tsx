"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { DbSavedApp, DbAiUnlock } from "@/lib/supabase";

interface ConnectedAppSummary {
  id: string;
  name: string;
  platform: string;
  store_app_id: string;
  sync_enabled: boolean;
  store_connections: { display_name: string; status: string; last_synced_at: string | null } | null;
}

interface AuditRecord {
  id: string;
  overall_score: number;
  ai_powered: boolean;
  created_at: string;
}

interface AppWithAudits extends DbSavedApp {
  audits: AuditRecord[];
}

interface Purchase {
  credits: number;
  amount_cents: number;
  currency: string;
  created_at: string;
}

function DashboardContent() {
  const { isSignedIn, isLoaded, user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchased = searchParams.get("purchased") === "1";
  const newExperiment = searchParams.get("newExperiment") === "1";

  const [apps, setApps] = useState<AppWithAudits[]>([]);
  const [connectedApps, setConnectedApps] = useState<ConnectedAppSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [unlocks, setUnlocks] = useState<DbAiUnlock[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch user info + saved apps + connected apps in parallel
      const [uRes, aRes, caRes] = await Promise.all([
        fetch("/api/user"),
        fetch("/api/apps"),
        fetch("/api/connected-apps"),
      ]);
      const uData = await uRes.json();
      const aData = await aRes.json();
      const caData = caRes.ok ? await caRes.json() : { apps: [] };

      setCredits(uData.audit_credits ?? 0);
      setUnlocks(uData.unlocks ?? []);
      setPurchases(uData.purchases ?? []);
      setConnectedApps(caData.apps ?? []);

      const rawApps: DbSavedApp[] = aData.apps ?? [];

      const appsWithAudits = await Promise.all(
        rawApps.map(async (app) => {
          const aRes = await fetch(`/api/apps/${app.id}/audits`);
          const aData = await aRes.json();
          return { ...app, audits: aData.audits ?? [] } as AppWithAudits;
        })
      );
      setApps(appsWithAudits);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/audit");
    if (isSignedIn) loadData();
  }, [isLoaded, isSignedIn, router, loadData]);

  async function deleteApp(id: string) {
    if (!confirm("Remove this app from your dashboard?")) return;
    await fetch(`/api/apps?id=${id}`, { method: "DELETE" });
    setApps((prev) => prev.filter((a) => a.id !== id));
  }

  async function openPortal() {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  if (!isLoaded || loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      {/* Experiment saved — no connected app yet */}
      {newExperiment && (
        <div
          className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-4 flex-wrap text-sm"
          style={{ backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", color: "var(--text-primary)" }}
        >
          <span>
            <strong>Experiment saved to backlog.</strong>{" "}
            <span style={{ color: "var(--text-secondary)" }}>Connect a store account to automatically track its impact.</span>
          </span>
          <button
            onClick={() => router.push("/dashboard/connect")}
            className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#10b981", color: "#fff" }}
          >
            Connect store →
          </button>
        </div>
      )}

      {/* Purchase success banner */}
      {purchased && (
        <div
          className="rounded-xl px-4 py-3 mb-6 text-sm font-medium"
          style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "var(--text-primary)", border: "1px solid rgba(16,185,129,0.3)" }}
        >
          Payment received! Your audit credits are ready. Run an audit on any app to use them.
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            Dashboard
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {user?.firstName ? `Hi ${user.firstName} — ` : ""}
            <span className="font-semibold" style={{ color: credits > 0 ? "#10b981" : "var(--text-muted)" }}>
              {credits} audit credit{credits === 1 ? "" : "s"}
            </span>
            {" · "}{unlocks.length} app{unlocks.length === 1 ? "" : "s"} unlocked
          </p>
        </div>
        <div className="flex items-center gap-2">
          {purchases.length > 0 && (
            <button
              onClick={openPortal}
              className="text-xs px-3 py-2 rounded-lg border transition-opacity hover:opacity-80"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Receipts & billing
            </button>
          )}
          <button
            onClick={() => router.push("/pricing")}
            className="text-xs px-3 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            {credits > 0 ? "Buy more credits" : "Buy audit credits"}
          </button>
        </div>
      </div>

      {/* Credits card */}
      <div
        className="rounded-2xl border p-5 mb-6 flex items-center justify-between flex-wrap gap-4"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Audit credits
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {credits > 0
              ? `You have ${credits} credit${credits === 1 ? "" : "s"}. Run an audit on a new app to use one.`
              : "No credits remaining. Purchase more to unlock full AI analysis for new apps."
            }
          </p>
        </div>
        <div
          className="text-3xl font-bold tabular-nums"
          style={{ color: credits > 0 ? "#10b981" : "var(--text-muted)" }}
        >
          {credits}
        </div>
      </div>

      {/* Connected apps — experiments OS hub */}
      {connectedApps.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Connected apps
            </h2>
            <button
              onClick={() => router.push("/dashboard/connect")}
              className="text-xs"
              style={{ color: "var(--accent)" }}
            >
              + Connect another
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {connectedApps.map((ca) => (
              <div
                key={ca.id}
                className="rounded-2xl border p-4"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{ca.platform === "ios" ? "🍎" : "🤖"}</span>
                    <div>
                      <p className="text-sm font-medium leading-tight" style={{ color: "var(--text-primary)" }}>{ca.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {ca.store_connections?.display_name ?? ca.platform}
                        {ca.store_connections?.last_synced_at && (
                          <> · synced {new Date(ca.store_connections.last_synced_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>
                        )}
                      </p>
                    </div>
                  </div>
                  {ca.store_connections?.status === "error" && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--fail-bg)", color: "var(--fail-text)" }}>
                      sync error
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/apps/${ca.id}`)}
                    className="flex-1 text-xs py-1.5 rounded-lg border transition-opacity hover:opacity-80"
                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                  >
                    Metrics
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/apps/${ca.id}/experiments`)}
                    className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
                  >
                    ⚗ Experiments
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No connected apps yet — nudge to connect */}
      {connectedApps.length === 0 && (apps.length > 0 || unlocks.length > 0) && (
        <div
          className="rounded-2xl border p-4 mb-6 flex items-center justify-between gap-4 flex-wrap"
          style={{ borderColor: "rgba(180,83,9,0.2)", backgroundColor: "rgba(180,83,9,0.04)" }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Track experiment outcomes</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Connect App Store Connect or Google Play to measure the impact of your audit changes.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/connect")}
            className="shrink-0 text-xs font-medium px-4 py-2 rounded-xl transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            Connect store →
          </button>
        </div>
      )}

      {/* Unlocked apps (AI audit) */}
      {unlocks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Unlocked apps (full AI audit)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {unlocks.map((u) => {
              const matchingApp = apps.find(a => a.store_id === u.store_id && a.platform === u.platform);
              const displayName = matchingApp?.name ?? u.store_id;
              return (
                <button
                  key={`${u.store_id}-${u.platform}`}
                  onClick={() => router.push(`/audit?id=${u.store_id}&platform=${u.platform}`)}
                  className="rounded-xl border p-3 text-left transition-opacity hover:opacity-80"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{u.platform === "ios" ? "🍎" : "🤖"}</span>
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{displayName}</p>
                  </div>
                  <p className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>
                    {u.platform} · unlocked {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Saved apps with audits */}
      {apps.length > 0 && (
        <>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Saved apps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {apps.map((app) => {
              const chartData = [...app.audits].reverse().map((a, i) => ({
                index: i + 1,
                score: a.overall_score,
                date: new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
              }));
              const latestScore = app.audits[0]?.overall_score;

              return (
                <div
                  key={app.id}
                  className="rounded-2xl border p-5"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {app.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={app.icon_url} alt={app.name} className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                          style={{ backgroundColor: "var(--bg-section)" }}>
                          📱
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{app.name}</p>
                        <p className="text-xs capitalize mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {app.platform} · {app.audits.length} audit{app.audits.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    {latestScore !== undefined && (
                      <div
                        className="text-xl font-bold tabular-nums"
                        style={{ color: latestScore >= 75 ? "#10b981" : latestScore >= 55 ? "#f59e0b" : "#ef4444" }}
                      >
                        {latestScore}
                      </div>
                    )}
                  </div>

                  {chartData.length > 1 && (
                    <div className="h-20 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <XAxis dataKey="date" hide />
                          <YAxis domain={[0, 100]} hide />
                          <Tooltip
                            contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)" }}
                            formatter={(v) => [`Score: ${v}`, ""]}
                            labelFormatter={(label) => label}
                          />
                          <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => router.push(`/audit?id=${app.store_id}&platform=${app.platform}&savedAppId=${app.id}`)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
                      style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                    >
                      Run audit
                    </button>
                    <button
                      onClick={() => deleteApp(app.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border transition-opacity hover:opacity-80 ml-auto"
                      style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* CTA for empty state */}
      {apps.length === 0 && unlocks.length === 0 && (
        <div
          className="rounded-2xl border-2 border-dashed p-8 text-center"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            No audits yet
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            {credits > 0
              ? "You have credits ready. Run an audit to see the full AI analysis."
              : "Run a free audit to see your app's ASO score, or buy credits for the full AI-powered analysis."
            }
          </p>
          <button
            onClick={() => router.push("/audit")}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            Run an audit
          </button>
        </div>
      )}

      {/* Purchase history */}
      {purchases.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Purchase history
          </h2>
          <div className="space-y-2">
            {purchases.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border px-4 py-2.5"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
              >
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                    {p.credits} audit credit{p.credits === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                  €{(p.amount_cents / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
