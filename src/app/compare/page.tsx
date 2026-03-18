"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import ScoreRing from "@/components/ScoreRing";

interface AppResult {
  storeId: string;
  platform: string;
  title: string;
  developer: string;
  iconUrl?: string;
  rating: number;
  ratingsCount: number;
  overallScore: number;
  categoryScores: Record<string, number>;
  metadata: {
    titleLength: number;
    subtitleLength: number;
    shortDescLength: number;
    descriptionLength: number;
    keywordFieldLength: number;
    screenshotCount: number;
    hasVideo: boolean;
    hasRatings: boolean;
    price: string;
  };
}

interface CompareResult {
  apps: AppResult[];
  highlights: string[];
}

type CompareState = "idle" | "loading" | "done" | "error";

const CATEGORY_COLORS: Record<string, string> = {
  metadata: "#1E1B4B",
  visuals:  "#8b5cf6",
  ratings:  "#f59e0b",
  conversion: "#10b981",
  technical: "#3b82f6",
};

const CATEGORY_NAMES: Record<string, string> = {
  metadata: "Metadata",
  visuals: "Visuals",
  ratings: "Ratings",
  conversion: "Conversion",
  technical: "Technical",
};

function getColor(score: number) {
  if (score >= 75) return "#10b981";
  if (score >= 55) return "#f59e0b";
  return "#ef4444";
}

function CompareContent() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-fill from query string
  const prefillId       = searchParams.get("id")        ?? "";
  const prefillPlatform = (searchParams.get("platform") ?? "ios") as "ios" | "android";
  const prefillName     = searchParams.get("name")       ?? "";
  const prefillBId      = searchParams.get("bid")        ?? "";
  const prefillBPlat    = (searchParams.get("bplatform") ?? "ios") as "ios" | "android";
  const prefillSavedAppId = searchParams.get("savedAppId") ?? "";

  const [appAId,       setAppAId]       = useState(prefillId);
  const [appAPlatform, setAppAPlatform] = useState<"ios" | "android">(prefillPlatform);
  const [appBId,       setAppBId]       = useState(prefillBId);
  const [appBPlatform, setAppBPlatform] = useState<"ios" | "android">(prefillBPlat);

  const [result,        setResult]        = useState<CompareResult | null>(null);
  const [state,         setState]         = useState<CompareState>("idle");
  const [error,         setError]         = useState("");

  // Save as competitor
  const [savedCompetitor, setSavedCompetitor] = useState(false);
  const [savingCompetitor, setSavingCompetitor] = useState(false);
  const [savedAppId, setSavedAppId] = useState(prefillSavedAppId);

  const handleCompare = useCallback(async () => {
    if (!appAId.trim() || !appBId.trim()) {
      setError("Please enter both app IDs to compare.");
      return;
    }
    setState("loading");
    setError("");
    setResult(null);
    setSavedCompetitor(false);
    try {
      const params = new URLSearchParams();
      params.append("id", appAId.trim());
      params.append("platform", appAPlatform);
      params.append("id", appBId.trim());
      params.append("platform", appBPlatform);
      params.set("country", "us");

      const res = await fetch(`/api/compare?${params}`);
      if (!res.ok) throw new Error("Comparison failed");
      const data: CompareResult = await res.json();
      setResult(data);
      setState("done");

      // Resolve saved_app_id if not pre-filled
      if (!savedAppId && isSignedIn) {
        const appsRes = await fetch("/api/apps");
        if (appsRes.ok) {
          const appsData = await appsRes.json();
          const match = appsData.apps?.find(
            (a: { store_id: string; platform: string }) =>
              a.store_id === appAId.trim() && a.platform === appAPlatform
          );
          if (match) setSavedAppId(match.id);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed");
      setState("error");
    }
  }, [appAId, appBId, appAPlatform, appBPlatform, isSignedIn, savedAppId]);

  // Auto-run if both IDs are pre-filled
  useEffect(() => {
    if (prefillId && prefillBId) handleCompare();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveCompetitor = async () => {
    if (!result || !savedAppId || !isSignedIn) return;
    const compApp = result.apps[1];
    if (!compApp) return;

    setSavingCompetitor(true);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saved_app_id: savedAppId,
          competitor_store_id: compApp.storeId,
          platform: compApp.platform,
          name: compApp.title,
          icon_url: compApp.iconUrl ?? null,
        }),
      });
      if (res.ok) setSavedCompetitor(true);
    } catch {
      // silently fail
    } finally {
      setSavingCompetitor(false);
    }
  };

  if (!isLoaded) return null;

  const appA = result?.apps[0] ?? null;
  const appB = result?.apps[1] ?? null;

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Compare apps</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Side-by-side ASO score comparison. Enter any two app store IDs.
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-sm px-3 py-1.5 rounded-lg border transition-opacity hover:opacity-80"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          ← Back
        </button>
      </div>

      {/* Upsell for unauthenticated users */}
      {!isSignedIn && (
        <div
          className="rounded-2xl border p-6 mb-8 flex items-center justify-between flex-wrap gap-4"
          style={{ borderColor: "var(--accent)", backgroundColor: "rgba(30,27,75,0.04)" }}
        >
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              Sign in to save competitors
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Sign in to save compare results as competitors and track them over time.
            </p>
          </div>
          <SignInButton mode="modal">
            <button
              className="text-sm px-4 py-2 rounded-xl font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              Sign in free
            </button>
          </SignInButton>
        </div>
      )}

      {/* Input form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {[
          { label: "Your app", id: appAId, setId: setAppAId, platform: appAPlatform, setPlatform: setAppAPlatform, defaultName: prefillName },
          { label: "Competitor", id: appBId, setId: setAppBId, platform: appBPlatform, setPlatform: setAppBPlatform, defaultName: "" },
        ].map((col, i) => (
          <div
            key={i}
            className="rounded-2xl border p-5"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
              {col.label}
            </p>
            <input
              value={col.id}
              onChange={(e) => col.setId(e.target.value)}
              placeholder={i === 0 ? "App Store ID or bundle ID" : "Competitor app ID"}
              className="w-full px-3 py-2 text-sm border rounded-lg mb-3"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)", backgroundColor: "var(--bg-page)" }}
            />
            <div className="flex gap-2">
              {(["ios", "android"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => col.setPlatform(p)}
                  className="flex-1 py-1.5 text-xs rounded-lg border transition-colors"
                  style={{
                    borderColor: col.platform === p ? "var(--accent)" : "var(--border)",
                    backgroundColor: col.platform === p ? "rgba(30,27,75,0.08)" : "transparent",
                    color: col.platform === p ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  {p === "ios" ? "iOS" : "Android"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleCompare}
        disabled={state === "loading"}
        className="w-full py-3 rounded-xl text-sm font-medium mb-8 transition-opacity hover:opacity-80 disabled:opacity-60"
        style={{ backgroundColor: "var(--accent)", color: "#fff" }}
      >
        {state === "loading" ? "Analyzing both apps…" : "Compare →"}
      </button>

      {error && (
        <p className="text-sm text-red-600 text-center mb-6">{error}</p>
      )}

      {/* Results */}
      {state === "done" && appA && appB && result && (
        <div className="space-y-6">
          {/* Overall scores */}
          <div className="grid grid-cols-2 gap-5">
            {[appA, appB].map((app, i) => (
              <div
                key={i}
                className="rounded-2xl border p-6 text-center"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
              >
                {app.iconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={app.iconUrl} alt={app.title} className="w-14 h-14 rounded-2xl mx-auto mb-3 object-cover" />
                )}
                <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>{app.title}</p>
                <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>{app.developer}</p>
                <ScoreRing score={app.overallScore} size={80} />
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  {app.rating?.toFixed(1)} ★ · {app.ratingsCount?.toLocaleString()} ratings
                </p>
              </div>
            ))}
          </div>

          {/* Category comparison bars */}
          <div
            className="rounded-2xl border p-6"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
          >
            <h2 className="text-sm font-semibold mb-5" style={{ color: "var(--text-primary)" }}>
              Category breakdown
            </h2>
            <div className="space-y-4">
              {Object.entries(appA.categoryScores).map(([catId, scoreA]) => {
                const scoreB = appB.categoryScores[catId] ?? 0;
                const diff = scoreA - scoreB;
                return (
                  <div key={catId}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                        {CATEGORY_NAMES[catId] ?? catId}
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: diff > 5 ? "#10b981" : diff < -5 ? "#ef4444" : "var(--text-muted)" }}
                      >
                        {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "tie"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[scoreA, scoreB].map((score, idx) => (
                        <div key={idx} className="relative h-6 rounded-lg overflow-hidden" style={{ backgroundColor: "var(--bg-section)" }}>
                          <div
                            className="absolute inset-y-0 left-0 rounded-lg transition-all"
                            style={{ width: `${score}%`, backgroundColor: CATEGORY_COLORS[catId] ?? "var(--accent)", opacity: 0.8 }}
                          />
                          <span
                            className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                            style={{ color: "#fff", mixBlendMode: "overlay" }}
                          >
                            {score}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-0.5">
                      <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>{appA.title.split(" ")[0]}</p>
                      <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>{appB.title.split(" ")[0]}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Highlights from compare API */}
          {result.highlights.length > 0 && (
            <div
              className="rounded-2xl p-5 text-sm space-y-1"
              style={{ backgroundColor: "rgba(30,27,75,0.06)", border: "1px solid rgba(30,27,75,0.2)" }}
            >
              {result.highlights.map((h, i) => (
                <p key={i} style={{ color: "var(--text-secondary)" }}>• {h}</p>
              ))}
            </div>
          )}

          {/* Winner summary */}
          {(() => {
            const winner = appA.overallScore >= appB.overallScore ? appA : appB;
            const loser  = winner === appA ? appB : appA;
            const gap    = Math.abs(appA.overallScore - appB.overallScore);
            return (
              <div
                className="rounded-2xl p-5 text-sm"
                style={{ backgroundColor: "rgba(30,27,75,0.06)", border: "1px solid rgba(30,27,75,0.2)" }}
              >
                <p style={{ color: "var(--text-primary)" }}>
                  <strong>{winner.title}</strong> leads by <strong style={{ color: getColor(winner.overallScore) }}>{gap} points</strong>.{" "}
                  {gap <= 5
                    ? "Both apps are at a similar ASO level. Small metadata improvements could shift the ranking."
                    : gap <= 20
                    ? `${loser.title} has clear room for improvement. Focus on the highest-gap categories above.`
                    : `${loser.title} is significantly behind. A full metadata + visuals overhaul is recommended.`}
                </p>
              </div>
            );
          })()}

          {/* Save as competitor */}
          {isSignedIn && savedAppId && (
            <div className="flex justify-end">
              <button
                onClick={handleSaveCompetitor}
                disabled={savedCompetitor || savingCompetitor}
                className="text-sm px-4 py-2 rounded-xl border font-medium transition-all"
                style={{
                  borderColor: savedCompetitor ? "#10b981" : "var(--border)",
                  color: savedCompetitor ? "#10b981" : "var(--text-secondary)",
                  backgroundColor: savedCompetitor ? "rgba(16,185,129,0.06)" : "var(--bg-card)",
                  opacity: savingCompetitor ? 0.6 : 1,
                }}
              >
                {savedCompetitor ? "✓ Saved as competitor" : savingCompetitor ? "Saving…" : `Save ${appB.title} as competitor →`}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense>
      <CompareContent />
    </Suspense>
  );
}
