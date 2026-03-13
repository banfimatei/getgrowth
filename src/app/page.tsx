"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/* ────────────────────────────────────────────────────────
   Product mock components (audit summary, kanban, chart)
   Brand: clean high-contrast mockups, experiment boards,
   simple charts — no stock photos or abstract 3D blobs.
   ──────────────────────────────────────────────────────── */

function AuditSummaryMock() {
  return (
    <div className="mock-card p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg" style={{ backgroundColor: "var(--bg-inset)" }} />
        <div>
          <div className="h-2.5 w-24 rounded" style={{ backgroundColor: "var(--text-primary)", opacity: 0.12 }} />
          <div className="h-2 w-16 rounded mt-1" style={{ backgroundColor: "var(--text-primary)", opacity: 0.06 }} />
        </div>
        <div className="ml-auto text-right">
          <span className="text-lg font-bold tabular-nums" style={{ color: "var(--score-excellent)", fontFamily: "var(--font-mono)" }}>78</span>
          <span className="text-[10px] ml-0.5" style={{ color: "var(--text-tertiary)" }}>/100</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "Visibility", score: 82, color: "var(--score-excellent)" },
          { label: "Relevance", score: 71, color: "var(--score-good)" },
          { label: "Conversion", score: 64, color: "var(--score-good)" },
        ].map((m) => (
          <div key={m.label} className="text-center rounded-lg p-2" style={{ backgroundColor: "var(--bg-inset)" }}>
            <div className="text-xs font-bold tabular-nums" style={{ color: m.color, fontFamily: "var(--font-mono)" }}>{m.score}</div>
            <div className="text-[9px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{m.label}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>Top issues</p>
        {["Title missing primary keyword", "No app preview video", "Screenshots lack benefit captions"].map((issue, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: i === 0 ? "var(--error)" : i === 1 ? "var(--warning)" : "var(--score-good)" }} />
            <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{issue}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExperimentBoardMock() {
  const cols = [
    { name: "Backlog", color: "var(--text-muted)", items: ["Update subtitle with keywords", "A/B test icon variants"] },
    { name: "In progress", color: "var(--warning)", items: ["New screenshot set"] },
    { name: "Live", color: "var(--success)", items: ["Title keyword test"] },
    { name: "Evaluated", color: "var(--accent)", items: [] },
  ];
  return (
    <div className="mock-card p-3 mb-3">
      <p className="text-[10px] font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Experiments</p>
      <div className="grid grid-cols-4 gap-1.5">
        {cols.map((col) => (
          <div key={col.name}>
            <div className="flex items-center gap-1 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-[8px] font-semibold" style={{ color: "var(--text-tertiary)" }}>{col.name}</span>
            </div>
            <div className="space-y-1">
              {col.items.map((item, i) => (
                <div
                  key={i}
                  className="rounded-md px-1.5 py-1"
                  style={{ backgroundColor: "var(--bg-inset)", border: "1px solid var(--border)" }}
                >
                  <span className="text-[8px] leading-tight block" style={{ color: "var(--text-secondary)" }}>{item}</span>
                </div>
              ))}
              {col.items.length === 0 && (
                <div className="rounded-md px-1.5 py-2 border border-dashed" style={{ borderColor: "var(--border)" }}>
                  <span className="text-[7px] block text-center" style={{ color: "var(--text-tertiary)" }}>empty</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricsChartMock() {
  const points = [32, 34, 31, 38, 45, 48, 52, 55, 49, 58, 62, 68, 72, 75];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const h = 44;
  const w = 220;
  const pathD = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / (max - min)) * h;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  const experimentStartX = (8 / (points.length - 1)) * w;

  return (
    <div className="mock-card p-3 relative">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>Installs (30d)</p>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--success-bg)", color: "var(--success-text)" }}>+23%</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h + 10}`} className="w-full" style={{ height: 56 }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L${w},${h + 10} L0,${h + 10} Z`} fill="url(#chartGrad)" />
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1={experimentStartX} y1="0" x2={experimentStartX} y2={h + 10} stroke="var(--success)" strokeWidth="1" strokeDasharray="3,2" />
      </svg>
      <div
        className="absolute text-[7px] font-semibold px-1 py-0.5 rounded"
        style={{
          left: `${(experimentStartX / w) * 100}%`,
          bottom: 18,
          backgroundColor: "var(--success-bg)",
          color: "var(--success-text)",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
        }}
      >
        New screenshots test
      </div>
      <div
        className="mt-1 text-[8px] flex items-center gap-1 rounded px-1.5 py-0.5"
        style={{ backgroundColor: "var(--accent-bg)", color: "var(--text-tertiary)" }}
      >
        <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 8.5L7 10.5L11 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Pulled from App Store Connect
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Landing page — all 6 brand sections:
   hero, how_it_works, who_its_for, why_getgrowth,
   pricing_teaser, faq + credibility + CTA band + footer
   ──────────────────────────────────────────────────────── */

export default function LandingPage() {
  const router = useRouter();
  const revealRefs = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function addRef(el: HTMLElement | null) {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  }

  return (
    <div style={{ overflowX: "hidden" }}>

      {/* ═══ HERO ═══════════════════════════════════════════ */}
      <section
        className="relative grain-bg"
        style={{
          background: "linear-gradient(180deg, var(--bg-page) 0%, #f5f0e8 50%, var(--bg-page) 100%)",
          paddingTop: "clamp(48px, 8vh, 80px)",
          paddingBottom: "clamp(48px, 8vh, 80px)",
        }}
      >
        <div className="relative z-10 max-w-6xl mx-auto px-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Copy — left */}
            <div>
              {/* Persona tagline — 39 chars */}
              <p
                className="hero-animate hero-animate-delay-1 text-xs font-semibold tracking-widest uppercase mb-4"
                style={{ color: "var(--accent)", letterSpacing: "0.12em" }}
              >
                For indie teams &amp; early-stage apps
              </p>

              {/* Headline — 55 chars (max 70) */}
              <h1
                className="hero-animate hero-animate-delay-2 mb-5"
                style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.12 }}
              >
                Know which ASO changes actually grow your installs.
              </h1>

              {/* Subheadline — 192 chars (max 200) */}
              <p
                className="hero-animate hero-animate-delay-3 text-base leading-relaxed mb-8"
                style={{ color: "var(--text-secondary)", maxWidth: 520 }}
              >
                GetGrowth connects to App Store Connect and Google Play, runs an AI&#8209;powered ASO audit, and turns findings into a prioritized experiment backlog with automatic impact tracking.
              </p>

              {/* CTAs */}
              <div className="hero-animate hero-animate-delay-4 flex flex-wrap gap-3 mb-6">
                <button
                  onClick={() => router.push("/audit")}
                  className="px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:brightness-110 pulse-cta"
                  style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                >
                  Run a free audit
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById("sample-report");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-6 py-3 rounded-lg text-sm font-semibold border transition-colors hover:bg-[var(--bg-inset)]"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  View a sample report
                </button>
              </div>

              {/* Social proof placeholder */}
              <p
                className="hero-animate hero-animate-delay-5 text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                Built by app marketers, not generic AI tools.
              </p>
            </div>

            {/* Product visual — right (desktop) */}
            <div className="hero-visual float-subtle hidden lg:block">
              <div
                className="p-2 rounded-2xl"
                style={{
                  background: "linear-gradient(135deg, rgba(180,83,9,0.04), rgba(22,163,74,0.03))",
                  border: "1px solid var(--border)",
                }}
              >
                <AuditSummaryMock />
                <ExperimentBoardMock />
                <MetricsChartMock />
              </div>
            </div>

            {/* Product visual — mobile */}
            <div className="hero-visual lg:hidden">
              <div
                className="p-2 rounded-2xl"
                style={{
                  background: "linear-gradient(135deg, rgba(180,83,9,0.04), rgba(22,163,74,0.03))",
                  border: "1px solid var(--border)",
                }}
              >
                <AuditSummaryMock />
                <MetricsChartMock />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══════════════════════════════════ */}
      <section id="how-it-works" className="py-20 lg:py-28" style={{ backgroundColor: "var(--bg-page)" }}>
        <div className="max-w-6xl mx-auto px-5">
          <div ref={addRef} className="reveal text-center mb-14">
            <h2 className="mb-3">From audit to proven ASO wins in 3 steps</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)", maxWidth: 480, margin: "0 auto" }}>
              No complex setup. No agency retainers. Paste a URL and start improving.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
            {[
              {
                step: "01", tag: "Diagnose", title: "Run an AI ASO audit",
                body: "Paste your store URL. We audit title, keywords, description, screenshots, and reviews using ASO heuristics and AI.",
                accent: "var(--accent)",
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" /><path d="M15 15L21 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>,
              },
              {
                step: "02", tag: "Connect", title: "Connect your store data",
                body: "Link App Store Connect or Google Play. We pull impressions, installs, and conversion rates automatically.",
                accent: "var(--success)",
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="2" /><rect x="14" y="5" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M10 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
              },
              {
                step: "03", tag: "Improve", title: "Ship and track experiments",
                body: "Turn audit findings into experiments. We measure before/after performance and tell you what works.",
                accent: "var(--emerald)",
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 20L9 13L13 16L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M16 6H20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
              },
            ].map((s, i) => (
              <div
                key={s.step}
                ref={addRef}
                className="reveal rounded-xl p-6 relative"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  transitionDelay: `${i * 0.12}s`,
                }}
              >
                <div className="absolute top-0 left-0 w-full h-1 rounded-t-xl" style={{ backgroundColor: s.accent, opacity: 0.5 }} />
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `color-mix(in srgb, ${s.accent} 8%, transparent)`, color: s.accent }}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: s.accent }}>{s.tag}</span>
                    <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Step {s.step}</p>
                  </div>
                </div>
                <h3 className="text-base mb-2">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{s.body}</p>
                {s.step === "02" && (
                  <p className="text-[11px] mt-3 px-2 py-1 rounded-md inline-block" style={{ backgroundColor: "var(--bg-inset)", color: "var(--text-tertiary)" }}>
                    Uses your own Apple/Google APIs. Revoke any time.
                  </p>
                )}
                {s.step === "03" && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["Backlog", "In progress", "Live", "Evaluated"].map((status) => (
                      <span key={status} className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--border)", color: "var(--text-tertiary)" }}>
                        {status}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHO IT'S FOR ═══════════════════════════════════ */}
      <section id="who-its-for" className="py-20 lg:py-28 relative grain-bg" style={{ backgroundColor: "var(--bg-section)" }}>
        <div className="relative z-10 max-w-6xl mx-auto px-5">
          <div ref={addRef} className="reveal text-center mb-14">
            <h2 className="mb-3">Built for teams who don&rsquo;t live in ASO all day</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)", maxWidth: 480, margin: "0 auto" }}>
              No jargon, no 50-tab dashboards. Clear experiments and measured outcomes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L3 7V18H8V12H12V18H17V7L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>,
                persona: "Indie devs & small studios",
                pitch: "You ship features and content. We turn your store page into a growth engine with bite-sized experiments.",
                outcome: "Know exactly what to ship for your next store update.",
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 17L8 10L12 13L17 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M14 5H17V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
                persona: "Seed / Series A teams",
                pitch: "Under pressure to show growth fast. GetGrowth gives you a repeatable ASO process and clean stakeholder reporting.",
                outcome: "A structured experiment log you can share with investors.",
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M7 8H13M7 11H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
                persona: "Lean agencies & freelancers",
                pitch: "Standardize ASO audits and experiment tracking across clients while still looking bespoke.",
                outcome: "Audit and track 5 clients from one dashboard.",
              },
            ].map((p, i) => (
              <div
                key={p.persona}
                ref={addRef}
                className="reveal rounded-xl p-6 flex flex-col"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", transitionDelay: `${i * 0.1}s` }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: "var(--accent-bg)", color: "var(--accent)" }}>
                  {p.icon}
                </div>
                <h3 className="text-base mb-2">{p.persona}</h3>
                <p className="text-sm leading-relaxed mb-4 flex-1" style={{ color: "var(--text-secondary)" }}>{p.pitch}</p>
                <div className="rounded-md px-3 py-2 text-xs" style={{ backgroundColor: "var(--bg-inset)", color: "var(--text-tertiary)" }}>
                  <span style={{ color: "var(--text-secondary)" }} className="font-medium">Typical outcome:</span> {p.outcome}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHY GETGROWTH ═════════════════════════════════ */}
      <section className="py-20 lg:py-28" style={{ backgroundColor: "var(--bg-page)" }}>
        <div className="max-w-6xl mx-auto px-5">
          <div ref={addRef} className="reveal text-center mb-14">
            <h2 className="mb-3">Why teams pick GetGrowth</h2>
          </div>

          <div ref={addRef} className="reveal grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl p-6 border" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--bg-inset)" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="var(--text-tertiary)" strokeWidth="1.5" /><path d="M4 7H12M4 10H9" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </div>
                <h3 className="text-sm font-semibold">ASO platforms</h3>
              </div>
              <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
                Great for deep keyword research and market intel.
              </p>
              <div className="rounded-md px-3 py-2 text-xs" style={{ backgroundColor: "var(--error-bg)", color: "var(--error-text)" }}>
                Expensive, complex, require a full-time ASO specialist.
              </div>
            </div>

            <div className="rounded-xl p-6 border" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--bg-inset)" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="var(--text-tertiary)" strokeWidth="1.5" /><path d="M2 14c0-3 2.5-5 6-5s6 2 6 5" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </div>
                <h3 className="text-sm font-semibold">Agencies</h3>
              </div>
              <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
                High-touch strategy and execution with experienced consultants.
              </p>
              <div className="rounded-md px-3 py-2 text-xs" style={{ backgroundColor: "var(--error-bg)", color: "var(--error-text)" }}>
                High minimum fees, slow turnarounds, limited throughput.
              </div>
            </div>

            <div className="rounded-xl p-6 border-2 relative" style={{ borderColor: "var(--accent)", backgroundColor: "var(--accent-bg)" }}>
              <div className="absolute -top-3 left-5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
                GetGrowth
              </div>
              <div className="flex items-center gap-2 mb-4 mt-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--accent-bg)" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12L6 6L10 9L14 3" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <h3 className="text-sm font-semibold">For small teams</h3>
              </div>
              <ul className="space-y-2">
                {[
                  "AI audits distilled into clear experiments",
                  "Automatic tracking via your App Store / Play data",
                  "Speed and clarity, not a full-time ASO manager",
                  "Starts at \u20AC29 \u2014 no subscription lock-in",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span className="mt-0.5 shrink-0" style={{ color: "var(--success)" }}>&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p ref={addRef} className="reveal text-center text-sm mt-8" style={{ color: "var(--text-tertiary)" }}>
            Structured ASO brain + light analytics + experiment OS &mdash; without enterprise pricing or agency overhead.
          </p>
        </div>
      </section>

      {/* ═══ PRICING TEASER ════════════════════════════════ */}
      <section id="pricing" className="py-20 lg:py-28 relative grain-bg" style={{ backgroundColor: "var(--bg-section)" }}>
        <div className="relative z-10 max-w-4xl mx-auto px-5">
          <div ref={addRef} className="reveal text-center mb-10">
            <h2 className="mb-3">Start with one audit, upgrade when experiments matter</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)", maxWidth: 460, margin: "0 auto" }}>
              No subscription required. Pay per audit, connect your stores for free, track unlimited experiments.
            </p>
          </div>

          <div ref={addRef} className="reveal grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {[
              { name: "Free audit", price: "\u20AC0", desc: "Rule-based audit with scoring, action plan, and category breakdown.", cta: "Run free audit", href: "/audit", highlight: false },
              { name: "Full AI audit", price: "\u20AC29", desc: "AI analysis, deep-dive rewrites, visual concepts, and PDF export.", cta: "Buy 1 credit", href: "/pricing", highlight: true },
              { name: "5 Audits", price: "\u20AC99", desc: "Audit your apps + competitors. Credits never expire. Best for agencies.", cta: "View pricing", href: "/pricing", highlight: false },
            ].map((p) => (
              <div
                key={p.name}
                className="rounded-xl p-5 flex flex-col"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: p.highlight ? "2px solid var(--accent)" : "1px solid var(--border)",
                  boxShadow: p.highlight ? "0 0 0 3px rgba(180,83,9,0.1)" : undefined,
                }}
              >
                {p.highlight && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mb-3 self-start" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
                    Most popular
                  </span>
                )}
                <p className="text-sm font-semibold mb-1">{p.name}</p>
                <p className="text-2xl font-bold mb-2 tabular-nums">{p.price}<span className="text-xs font-normal ml-1" style={{ color: "var(--text-tertiary)" }}>{p.price !== "\u20AC0" ? "one-time" : "always"}</span></p>
                <p className="text-xs leading-relaxed mb-4 flex-1" style={{ color: "var(--text-secondary)" }}>{p.desc}</p>
                <button
                  onClick={() => router.push(p.href)}
                  className="w-full py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-110"
                  style={{
                    backgroundColor: p.highlight ? "var(--accent)" : "transparent",
                    color: p.highlight ? "#fff" : "var(--accent)",
                    border: p.highlight ? "none" : "1px solid var(--accent)",
                  }}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CREDIBILITY ═══════════════════════════════════ */}
      <section id="credibility" className="py-20 lg:py-28" style={{ backgroundColor: "var(--bg-page)" }}>
        <div className="max-w-5xl mx-auto px-5">
          <div ref={addRef} className="reveal text-center mb-10">
            <h2 className="mb-3">Built by people who&rsquo;ve grown mobile apps</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", maxWidth: 540, margin: "0 auto" }}>
              GetGrowth is created by app marketers who&rsquo;ve optimized dozens of apps. We turned our playbooks into a repeatable, AI-powered process &mdash; so you don&rsquo;t start from scratch.
            </p>
          </div>

          <div ref={addRef} className="reveal grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M6 8L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>, text: "Uses your own App Store / Play APIs" },
              { icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" /><path d="M9 5V9L12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>, text: "Start with one low-cost audit \u2014 \u20AC29" },
              { icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 13L7 7L11 10L15 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>, text: "Clear roadmap: experiments, follow-up audits, advisory" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-start gap-3 rounded-lg p-4"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }}>{item.icon}</div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══════════════════════════════════════════ */}
      <section id="faq" className="py-20 lg:py-28 relative grain-bg" style={{ backgroundColor: "var(--bg-section)" }}>
        <div className="relative z-10 max-w-4xl mx-auto px-5">
          <div ref={addRef} className="reveal text-center mb-10">
            <h2 className="mb-3">Frequently asked questions</h2>
          </div>

          <div ref={addRef} className="reveal grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              { q: "Is connecting my App Store / Play account safe?", a: "Yes. We use your own Apple/Google API keys with industry-standard encryption (AES-256-GCM). You stay in full control and can revoke access any time from the dashboard." },
              { q: "What does a credit unlock?", a: "One credit = one full AI audit for one app. This includes deep-dive analysis on every section, rewrite suggestions, visual concepts, and PDF export. Re-running the same app costs nothing." },
              { q: "Is this just another AI wrapper?", a: "No. GetGrowth combines battle-tested ASO heuristics with AI analysis, then connects directly to your store data so you can measure impact. It's an experiment operating system, not a chatbot." },
              { q: "What data do you pull from my store account?", a: "Impressions, page views, installs, conversion rates, crash/ANR rates, and reviews. We never modify your store listings or access financial data." },
              { q: "Do credits expire?", a: "No. Credits never expire. Use them whenever you're ready." },
              { q: "Can I use GetGrowth without connecting a store?", a: "Absolutely. The audit works by scraping public store data. Connecting your store adds real metrics and experiment tracking on top." },
            ].map((item) => (
              <div key={item.q}>
                <h3 className="text-sm font-semibold mb-1.5">{item.q}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BOTTOM CTA ═══════════════════════════════════ */}
      <section id="sample-report" className="py-20 lg:py-28" style={{ backgroundColor: "var(--bg-page)" }}>
        <div className="max-w-4xl mx-auto px-5">
          <div ref={addRef} className="reveal text-center mb-10">
            <h2 className="mb-3">See what&rsquo;s blocking your next 1,000 installs</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)", maxWidth: 460, margin: "0 auto" }}>
              Run an AI ASO audit and get a prioritized experiment plan in under 10 minutes.
            </p>
          </div>

          <div ref={addRef} className="reveal max-w-lg mx-auto mb-10">
            <div className="mock-card-elevated p-5">
              <AuditSummaryMock />
              <div className="text-center mt-2">
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  Real audit output for any iOS or Android app &mdash; try it now.
                </p>
              </div>
            </div>
          </div>

          <div ref={addRef} className="reveal flex flex-wrap justify-center gap-3">
            <button
              onClick={() => router.push("/audit")}
              className="px-7 py-3 rounded-lg text-sm font-semibold transition-all hover:brightness-110 pulse-cta"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              Run a free audit
            </button>
            <button
              onClick={() => router.push("/pricing")}
              className="px-7 py-3 rounded-lg text-sm font-semibold border transition-colors hover:bg-[var(--bg-inset)]"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              View pricing
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══════════════════════════════════════ */}
      <footer className="py-10 border-t" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-page)" }}>
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>G</span>
              <span className="text-sm font-semibold">GetGrowth</span>
            </div>
            <div className="flex items-center gap-5">
              <a href="/pricing" className="text-xs hover:underline" style={{ color: "var(--text-secondary)" }}>Pricing</a>
              <a href="/audit" className="text-xs hover:underline" style={{ color: "var(--text-secondary)" }}>Audit tool</a>
              <a href="/#how-it-works" className="text-xs hover:underline" style={{ color: "var(--text-secondary)" }}>How it works</a>
            </div>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              &copy; {new Date().getFullYear()} GetGrowth. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
