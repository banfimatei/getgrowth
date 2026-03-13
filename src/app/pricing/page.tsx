"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";

const PACKS = [
  {
    name: "1 Audit",
    price: 29,
    credits: 1,
    description: "Full AI-powered audit for one app.",
    features: [
      "Everything in the free audit",
      "AI-powered metadata analysis",
      "Deep-dive on every section",
      "Icon + screenshot visual concepts",
      "PDF export",
      "Unlimited re-runs for this app",
    ],
    highlight: false,
    priceEnv: "NEXT_PUBLIC_STRIPE_PRICE_STARTER",
  },
  {
    name: "2 Audits",
    price: 49,
    credits: 2,
    savings: "Save €9",
    description: "For studios with 2 apps to optimize.",
    features: [
      "Everything in 1 Audit × 2 apps",
      "Best for comparing your own apps",
      "Use anytime — credits never expire",
    ],
    highlight: true,
    priceEnv: "NEXT_PUBLIC_STRIPE_PRICE_GROWTH",
  },
  {
    name: "5 Audits",
    price: 99,
    credits: 5,
    savings: "Save €46",
    description: "For agencies and larger portfolios.",
    features: [
      "Everything in 1 Audit × 5 apps",
      "Audit your apps + competitors",
      "Ideal for agency client reports",
      "Use anytime — credits never expire",
    ],
    highlight: false,
    priceEnv: "NEXT_PUBLIC_STRIPE_PRICE_PORTFOLIO",
  },
];

const PRICE_IDS: Record<string, string | undefined> = {
  "1 Audit":  process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
  "2 Audits": process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH,
  "5 Audits": process.env.NEXT_PUBLIC_STRIPE_PRICE_PORTFOLIO,
};

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function buyPack(packName: string) {
    const priceId = PRICE_IDS[packName];
    if (!priceId) return;
    setLoading(packName);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
          Get the full AI audit
        </h1>
        <p className="text-base mb-2" style={{ color: "var(--text-secondary)" }}>
          One-time purchase. No subscription. Pay per app.
        </p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          The free audit gives you scores + action items. The full audit adds agency-grade AI analysis, deep-dive recommendations, visual concepts, and PDF export.
        </p>
      </div>

      {/* Free tier callout */}
      <div
        className="rounded-2xl border p-5 mb-8 flex items-center justify-between flex-wrap gap-4"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
      >
        <div>
          <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
            Free — always
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Unlimited rule-based audits with scoring, category breakdown, and prioritized action plan. No account needed.
          </p>
        </div>
        <button
          onClick={() => router.push("/audit")}
          className="text-xs px-4 py-2 rounded-xl border font-medium transition-opacity hover:opacity-80"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        >
          Run free audit
        </button>
      </div>

      {/* Credit packs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
        {PACKS.map((pack) => (
          <div
            key={pack.name}
            className="rounded-2xl border p-6 flex flex-col"
            style={{
              borderColor: pack.highlight ? "var(--accent)" : "var(--border)",
              backgroundColor: pack.highlight ? "rgba(30,27,75,0.04)" : "var(--bg-card)",
              boxShadow: pack.highlight ? "0 0 0 2px rgba(30,27,75,0.25)" : undefined,
            }}
          >
            {pack.highlight && (
              <div className="mb-3">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                >
                  Best value
                </span>
              </div>
            )}
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              {pack.name}
            </h2>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                €{pack.price}
              </span>
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>one-time</span>
            </div>
            {pack.savings && (
              <p className="text-xs font-medium mb-3" style={{ color: "#10b981" }}>
                {pack.savings}
              </p>
            )}
            <p className="text-xs mb-5" style={{ color: "var(--text-secondary)" }}>
              {pack.description}
            </p>

            {isSignedIn ? (
              <button
                onClick={() => buyPack(pack.name)}
                disabled={loading === pack.name}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 mb-5 disabled:opacity-60"
                style={{ backgroundColor: pack.highlight ? "var(--accent)" : "var(--text-primary)", color: "#fff" }}
              >
                {loading === pack.name ? "Loading…" : `Buy ${pack.name}`}
              </button>
            ) : (
              <SignInButton mode="modal" forceRedirectUrl="/pricing">
                <button
                  className="w-full py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 mb-5"
                  style={{ backgroundColor: pack.highlight ? "var(--accent)" : "var(--text-primary)", color: "#fff" }}
                >
                  Sign in to buy
                </button>
              </SignInButton>
            )}

            <ul className="space-y-2 flex-1">
              {pack.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span className="mt-0.5 text-green-500 flex-shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Coming soon: upsells */}
      <div
        className="rounded-2xl border-2 border-dashed p-6 text-center mb-10"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Coming soon
        </p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          90-day Growth Program (scheduled re-audits + experiment tracking) and Expert Advisory (async review + strategy call).
        </p>
      </div>

      {/* FAQ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            q: "What does a credit unlock?",
            a: "One credit = one full AI audit for one app. This includes the initial AI analysis, unlimited deep-dives on all sections, visual concept generation, and PDF export. Re-running the same app doesn't cost another credit.",
          },
          {
            q: "Do credits expire?",
            a: "No. Credits never expire. Use them whenever you're ready.",
          },
          {
            q: "Is the free audit actually useful?",
            a: "Yes — it gives you a real score, category breakdown, and prioritized action items based on ASO best practices. The paid audit adds AI-powered analysis with rewrite suggestions, keyword strategies, and visual briefs.",
          },
        ].map((item) => (
          <div key={item.q}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{item.q}</h3>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.a}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
