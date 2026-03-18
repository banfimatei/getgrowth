"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

interface AuditLead {
  id: string;
  token: string;
  app_name: string;
  app_icon_url: string | null;
  store_id: string;
  platform: "ios" | "android";
  score: number;
  category_scores: Record<string, number>;
  created_at: string;
  claimed_user_id: string | null;
}

const SCORE_COLOR = (s: number) =>
  s >= 75 ? "#10b981" : s >= 50 ? "#f59e0b" : "#ef4444";

const SCORE_LABEL = (s: number) =>
  s >= 75 ? "Strong" : s >= 50 ? "Needs work" : "Critical";

function ScoreArc({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = SCORE_COLOR(score);
  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      <circle cx="64" cy="64" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
      <circle
        cx="64" cy="64" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 64 64)"
      />
      <text x="64" y="60" textAnchor="middle" fontSize="26" fontWeight="800" fill="var(--text-primary)">{score}</text>
      <text x="64" y="76" textAnchor="middle" fontSize="11" fill="var(--text-muted)">/100</text>
    </svg>
  );
}

function SavedAuditContent() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { isSignedIn, isLoaded } = useUser();

  const [lead, setLead] = useState<AuditLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/leads/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.lead) setLead(d.lead);
        else setError("Audit not found or link has expired.");
      })
      .catch(() => setError("Failed to load audit."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin opacity-30" />
      </main>
    );
  }

  if (error || !lead) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: "var(--bg-page)" }}>
        <p style={{ color: "var(--fail-text)" }}>{error || "Audit not found."}</p>
        <Link href="/audit" style={{ color: "var(--accent)", fontSize: 14 }}>← Run a new audit</Link>
      </main>
    );
  }

  const categories = Object.entries(lead.category_scores).sort((a, b) => a[1] - b[1]);
  const auditUrl = `/audit?id=${encodeURIComponent(lead.store_id)}&platform=${lead.platform}`;
  const checkoutUrl = `/api/stripe/guest-checkout?appId=${encodeURIComponent(lead.store_id)}&platform=${lead.platform}`;

  const savedDate = new Date(lead.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <main className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-20 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-page)" }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-base" style={{ color: "var(--accent-dark)" }}>
            GetGrowth
          </Link>
          {isLoaded && !isSignedIn && (
            <Link
              href={`/sign-in?redirect_url=${encodeURIComponent(`/audit/saved/${token}`)}`}
              className="text-sm font-medium px-4 py-1.5 rounded-lg border"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Sign in
            </Link>
          )}
          {isLoaded && isSignedIn && (
            <Link href="/dashboard" className="text-sm font-medium" style={{ color: "var(--accent)" }}>
              Dashboard →
            </Link>
          )}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Hero score card */}
        <div
          className="rounded-2xl border p-6 sm:p-8"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
        >
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            {/* App identity */}
            <div className="flex flex-col items-center sm:items-start gap-3">
              {lead.app_icon_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lead.app_icon_url} alt="" className="w-16 h-16 rounded-2xl border" style={{ borderColor: "var(--border)" }} />
              )}
              <div className="text-center sm:text-left">
                <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{lead.app_name}</h1>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {lead.platform === "ios" ? "App Store" : "Google Play"} · Audited {savedDate}
                </p>
              </div>
            </div>

            {/* Score arc */}
            <div className="flex flex-col items-center sm:ml-auto">
              <ScoreArc score={lead.score} />
              <span
                className="text-sm font-semibold mt-1"
                style={{ color: SCORE_COLOR(lead.score) }}
              >
                {SCORE_LABEL(lead.score)}
              </span>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="mt-6 space-y-2">
            {categories.map(([cat, score]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-sm w-40 flex-shrink-0 truncate" style={{ color: "var(--text-secondary)" }}>{cat}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-section)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${score}%`, background: SCORE_COLOR(score) }}
                  />
                </div>
                <span className="text-sm font-semibold w-8 text-right tabular-nums" style={{ color: SCORE_COLOR(score) }}>{score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upsell CTA — always visible, prominent */}
        <div
          className="rounded-2xl border-2 p-6 sm:p-8 text-center"
          style={{ borderColor: "#F59E0B", backgroundColor: "rgba(245,158,11,0.04)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#F59E0B" }}>
            Full AI Audit
          </p>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            See exactly what&apos;s holding your listing back
          </h2>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
            The free score shows the what. The full audit tells you the why — with AI-powered keyword gaps,
            copy rewrites, screenshot analysis, and a step-by-step action plan.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={checkoutUrl}
              className="inline-block px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: "#F59E0B", color: "#1E1B4B" }}
            >
              Get full audit — €29 one-time
            </a>
            <button
              onClick={() => router.push(auditUrl)}
              className="px-6 py-3 rounded-xl text-sm border font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Preview free audit again
            </button>
          </div>
          <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
            One-time payment · No subscription · Instant results
          </p>
        </div>

        {/* What you get section */}
        <div
          className="rounded-2xl border p-6"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
        >
          <h3 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            What&apos;s in the full audit
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ["AI copy rewrites", "Title, subtitle, and description rewritten to rank higher"],
              ["Keyword gap analysis", "Find high-traffic keywords you're missing with demand data"],
              ["Screenshot feedback", "AI review of each screenshot for conversion impact"],
              ["Step-by-step action plan", "Prioritised fixes ranked by expected impact"],
              ["Score tracking", "We re-check your listing weekly and alert you to changes"],
              ["Competitor compare", "See how you stack up against top competitors"],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3">
                <span style={{ color: "#10b981", flexShrink: 0 }}>✓</span>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{title}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create account CTA (for non-signed-in users) */}
        {isLoaded && !isSignedIn && (
          <div
            className="rounded-2xl border p-5 flex flex-col sm:flex-row items-center gap-4"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
          >
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Save your audit to your account</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Create a free account to track your score over time, manage keywords, and compare competitors.
              </p>
            </div>
            <Link
              href={`/sign-up?redirect_url=${encodeURIComponent(`/audit/saved/${token}`)}`}
              className="flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              Create free account →
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}

export default function SavedAuditPage() {
  return (
    <Suspense>
      <SavedAuditContent />
    </Suspense>
  );
}
