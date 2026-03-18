"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, useSignIn, useClerk } from "@clerk/nextjs";
import { Suspense } from "react";

const AUDIT_PACKS = [
  {
    qty: 1,
    label: "1 Audit",
    price: 29,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER?.trim(),
  },
  {
    qty: 2,
    label: "2 Audits",
    price: 49,
    savings: "Save €9",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH?.trim(),
  },
  {
    qty: 5,
    label: "5 Audits",
    price: 99,
    savings: "Save €46",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PORTFOLIO?.trim(),
  },
] as const;

const AUDIT_FEATURES = [
  "Deep AI analysis across every metadata field",
  "AI-written rewrites for title, subtitle & keywords",
  "Icon + screenshot visual concepts",
  "Experiment suggestions from audit findings",
  "PDF export",
  "Unlimited re-runs for the same app",
];

const PLATFORM_FEATURES = [
  "2 full AI audits per month",
  "Experiment tracking — measure impact in App Store Connect & Play Console",
  "Keyword intelligence — rankings, gaps, opportunity scoring",
  "Competitor audits (unlimited comparisons)",
  "Dashboard & team access",
  "Priority support",
];

const ADVISORY_FEATURES = [
  "Async ASO review with written recommendations",
  "1-on-1 strategy call (60 min)",
  "Custom audit report for your app portfolio",
  "Experiment prioritisation workshop",
  "Ongoing Slack access for 30 days",
];

function PricingContent() {
  const { isSignedIn } = useUser();
  const { signIn } = useSignIn();
  const { setActive } = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedQty, setSelectedQty] = useState<1 | 2 | 5>(1);
  const [buyingAudit, setBuyingAudit] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activationAttempted = useRef(false);

  const selectedPack = AUDIT_PACKS.find((p) => p.qty === selectedQty)!;

  // Post-payment: handle Stripe redirect back to /pricing?session_id=...
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId || activationAttempted.current) return;
    activationAttempted.current = true;

    window.history.replaceState({}, "", "/pricing");

    (async () => {
      setActivating(true);
      try {
        const res = await fetch("/api/audit/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok) throw new Error("Activation failed");
        const activation = await res.json();

        if (activation.signInToken && signIn && setActive) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await (signIn as any).create({
              strategy: "ticket",
              ticket: activation.signInToken,
            });
            if (result?.createdSessionId) {
              await setActive({ session: result.createdSessionId });
            }
          } catch {
            // sign-in token errors are non-fatal; user can log in manually
          }
        }

        router.push("/dashboard?purchased=1");
      } catch {
        setActivating(false);
      }
    })();
  }, [searchParams, signIn, setActive, router]);

  async function buyAuditPack() {
    if (!selectedPack.priceId) {
      setError("Price configuration is missing. Please contact support.");
      return;
    }
    setError(null);
    setBuyingAudit(true);
    try {
      const endpoint = isSignedIn ? "/api/stripe/checkout" : "/api/stripe/guest-checkout";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: selectedPack.priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Could not start checkout. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBuyingAudit(false);
    }
  }

  if (activating) {
    return (
      <main className="max-w-5xl mx-auto px-5 py-32 text-center">
        <div
          className="inline-block w-6 h-6 border-2 rounded-full animate-spin mb-4"
          style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
        />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Setting up your account…</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-5 py-16">
      {error && (
        <div
          className="mb-6 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3"
          style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
          role="alert"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100 flex-shrink-0 text-base leading-none">×</button>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-14">
        <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--accent)", letterSpacing: "0.12em" }}>
          Pricing
        </p>
        <h1 className="text-4xl font-bold mb-4 leading-tight" style={{ color: "var(--text-primary)" }}>
          Grow your app on your terms
        </h1>
        <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          Start with a one-time audit. Scale to the full platform when you&apos;re ready.
        </p>
      </div>

      {/* Free tier strip */}
      <div
        className="rounded-2xl border px-5 py-4 mb-10 flex items-center justify-between gap-4 flex-wrap"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">∞</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Free — always</p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Unlimited audits with scoring, category breakdown &amp; action plan. No account needed.
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/audit")}
          className="text-xs px-4 py-2 rounded-xl border font-medium transition-opacity hover:opacity-70 shrink-0"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          Run free audit →
        </button>
      </div>

      {/* Three pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-14">

        {/* ── Pillar 1: AI Audit ── */}
        <div
          className="rounded-2xl border p-6 flex flex-col"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
        >
          <div className="mb-5">
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text-tertiary)", letterSpacing: "0.1em" }}>
              One-time
            </p>
            <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>AI Audit</h2>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Buy credits and use them anytime. Credits never expire.
            </p>
          </div>

          {/* Quantity selector */}
          <div
            className="flex rounded-xl p-1 mb-4 gap-1"
            style={{ backgroundColor: "var(--bg-inset)" }}
          >
            {AUDIT_PACKS.map((pack) => (
              <button
                key={pack.qty}
                onClick={() => setSelectedQty(pack.qty)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  backgroundColor: selectedQty === pack.qty ? "var(--bg-card)" : "transparent",
                  color: selectedQty === pack.qty ? "var(--accent)" : "var(--text-tertiary)",
                  boxShadow: selectedQty === pack.qty ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {pack.qty === 1 ? "×1" : pack.qty === 2 ? "×2" : "×5"}
              </button>
            ))}
          </div>

          {/* Dynamic price */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
              €{selectedPack.price}
            </span>
            <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>one-time</span>
          </div>
          {"savings" in selectedPack && selectedPack.savings && (
            <p className="text-xs font-semibold mb-4" style={{ color: "#10b981" }}>
              {selectedPack.savings}
            </p>
          )}
          {!("savings" in selectedPack && selectedPack.savings) && <div className="mb-4" />}

          {/* CTA — no sign-in gate; guest checkout collects email via Stripe */}
          <button
            onClick={buyAuditPack}
            disabled={buyingAudit || !selectedPack.priceId}
            className="w-full py-2.5 rounded-xl text-sm font-semibold mb-6 transition-all hover:brightness-110 disabled:opacity-50"
            style={{ backgroundColor: "var(--text-primary)", color: "#fff" }}
          >
            {buyingAudit ? "Loading…" : `Buy ${selectedPack.label}`}
          </button>

          <ul className="space-y-2.5 flex-1">
            {AUDIT_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                <span className="shrink-0 mt-px" style={{ color: "#10b981" }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Pillar 2: Platform (highlighted) ── */}
        <div
          className="rounded-2xl border-2 p-6 flex flex-col relative"
          style={{
            borderColor: "var(--accent)",
            backgroundColor: "rgba(30,27,75,0.03)",
            boxShadow: "0 0 0 4px rgba(30,27,75,0.06)",
          }}
        >
          <div className="absolute -top-3.5 left-6">
            <span
              className="text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full"
              style={{ backgroundColor: "var(--accent)", color: "#fff", letterSpacing: "0.1em" }}
            >
              Most popular
            </span>
          </div>

          <div className="mb-5 mt-1">
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "var(--accent)", letterSpacing: "0.1em" }}>
              Monthly
            </p>
            <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Platform</h2>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              The full growth OS — audits, experiments, and keyword intelligence in one place.
            </p>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>€149</span>
            <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>/month</span>
          </div>
          <p className="text-xs mb-6" style={{ color: "var(--text-tertiary)" }}>
            Billed monthly · cancel anytime
          </p>

          <button
            onClick={() => window.location.href = "mailto:hello@getgrowth.eu?subject=Platform access"}
            className="w-full py-2.5 rounded-xl text-sm font-semibold mb-6 transition-all hover:brightness-110"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            Get early access →
          </button>

          <ul className="space-y-2.5 flex-1">
            {PLATFORM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                <span className="shrink-0 mt-px" style={{ color: "var(--accent)" }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Pillar 3: Advisory ── */}
        <div
          className="rounded-2xl border p-6 flex flex-col"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
        >
          <div className="mb-5">
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text-tertiary)", letterSpacing: "0.1em" }}>
              Advisory
            </p>
            <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Expert Review</h2>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Hands-on strategy from an ASO specialist. Best for teams launching or relaunching an app.
            </p>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Custom</span>
          </div>
          <p className="text-xs mb-6" style={{ color: "var(--text-tertiary)" }}>
            Scoped per engagement
          </p>

          <button
            onClick={() => window.location.href = "mailto:hello@getgrowth.eu?subject=Expert advisory"}
            className="w-full py-2.5 rounded-xl text-sm font-semibold mb-6 transition-all hover:brightness-110 border"
            style={{ borderColor: "var(--accent)", color: "var(--accent)", backgroundColor: "transparent" }}
          >
            Book a call →
          </button>

          <ul className="space-y-2.5 flex-1">
            {ADVISORY_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                <span className="shrink-0 mt-px" style={{ color: "var(--text-tertiary)" }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* FAQ */}
      <div
        className="rounded-2xl border p-8"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
      >
        <h3 className="text-base font-semibold mb-6" style={{ color: "var(--text-primary)" }}>Common questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              q: "Do I need to create an account?",
              a: "No. Enter your email at checkout — we create your account automatically and sign you straight in. No separate sign-up step needed.",
            },
            {
              q: "What does one audit credit unlock?",
              a: "A full AI-powered audit for one app: deep analysis on every metadata field, AI-written rewrites, visual concept generation, experiment suggestions, and PDF export. Re-running the same app never costs an extra credit.",
            },
            {
              q: "Do credits expire?",
              a: "No. Credits are yours forever. Buy a 5-pack now and use them across different apps over the next year.",
            },
            {
              q: "Is the free audit actually useful?",
              a: "Yes — it gives you a real ASO score, category-by-category breakdown, and a prioritised action plan. The paid audit layers in AI-generated recommendations, rewrites, and visual briefs.",
            },
          ].map((item) => (
            <div key={item.q}>
              <p className="text-sm font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>{item.q}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}
