"use client";

import { useState, useCallback, type FormEvent } from "react";
import ScoreRing from "@/components/ScoreRing";
import CategoryCard from "@/components/CategoryCard";
import ActionPlan from "@/components/ActionPlan";
import type { AuditCategory } from "@/lib/aso-rules";
import type { ActionItem } from "@/lib/action-plan";

interface DeepDiveEnhancement {
  brief: string;
  copyOptions?: string[];
  deliverables?: string[];
}

interface VisualConceptResult {
  data: string;
  mimeType: string;
  label: string;
  commentary: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDeepDiveResult(section: string, analysis: any, platform?: string): DeepDiveEnhancement | null {
  if (!analysis) return null;

  if (section === "screenshots") {
    return formatScreenshotsDeepDive(analysis, platform || "ios");
  } else if (section === "description") {
    return formatDescriptionDeepDive(analysis);
  } else if (section === "title" || section === "subtitle" || section === "keywords" || section === "shortDescription") {
    return formatTitleDeepDive(analysis);
  } else if (section === "icon") {
    return formatIconDeepDive(analysis, platform || "ios");
  }
  return { brief: JSON.stringify(analysis, null, 2) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatScreenshotsDeepDive(ai: any, platform: string): DeepDiveEnhancement {
  const isIOS = platform === "ios";
  let b = "";

  b += `**AI Screenshot Analysis** (deep-dive, vision-powered):\n`;
  if (ai.overallAssessment) b += `${ai.overallAssessment}\n`;
  if (ai.galleryCoherence) b += `**Gallery coherence:** ${ai.galleryCoherence}/10\n`;
  if (ai.visualIdentity) b += `**Visual identity:** ${ai.visualIdentity}\n`;
  b += "\n";

  if (ai.firstThreeVerdict) b += `**First 3 Rule verdict:** ${ai.firstThreeVerdict}\n\n`;

  b += `**Per-screenshot analysis:**\n`;
  if (ai.perScreenshot?.length) {
    for (const ss of ai.perScreenshot) {
      b += `\n  \u2705 **Slot ${ss.slot}:**\n`;
      b += `     Shows: ${ss.whatItShows}\n`;
      if (ss.style) b += `     Style: ${ss.style}\n`;
      if (ss.captionVisible && ss.captionVisible !== "none") b += `     Visible caption: "${ss.captionVisible}"\n`;
      if (ss.captionQuality) b += `     Caption assessment: ${ss.captionQuality}\n`;
      if (ss.captionSuggestions?.length) {
        b += `     Suggested captions: ${ss.captionSuggestions.map((c: string) => `"${c}"`).join(" | ")}\n`;
      } else if (ss.captionSuggestion) {
        b += `     Suggested caption: "${ss.captionSuggestion}"\n`;
      }
      if (ss.issues?.length) {
        for (const issue of ss.issues) b += `     \u274C ${issue}\n`;
      }
      if (ss.designBrief) b += `     **Design brief:** ${ss.designBrief}\n`;
    }
  }

  if (ai.missingSlots?.length) {
    b += `\n**Missing screenshots to add** *(verify each feature is live in your app before shooting)*:\n`;
    for (const ms of ai.missingSlots) {
      b += `\n  \u274C **Slot ${ms.slot}:**\n`;
      b += `     What to show: ${ms.whatToShow}\n`;
      b += `     Suggested caption: "${ms.captionSuggestion}"\n`;
      if (ms.recommendedStyle) b += `     Recommended style: ${ms.recommendedStyle}\n`;
      if (ms.designBrief) b += `     **Design brief:** ${ms.designBrief}\n`;
    }
  }

  if (ai.commonMistakesFound?.length) {
    b += `\n**Common mistakes detected:**\n`;
    for (const m of ai.commonMistakesFound) b += `  \u274C ${m}\n`;
  }

  if (ai.galleryReorderSuggestion) b += `\n**Reorder suggestion:** ${ai.galleryReorderSuggestion}\n`;
  if (ai.ocrOptimization) b += `\n**OCR optimization:** ${ai.ocrOptimization}\n`;

  // Compact reference (same as initial brief)
  b += `\n**Caption rules:** 2-5 words \u2022 benefit-focused \u2022 40pt+ bold sans-serif \u2022 keyword-aware\n`;
  if (isIOS) {
    b += `**iOS OCR:** Apple indexes caption text as keywords \u2014 first 3 screenshots carry most weight. Align captions with your title + subtitle keywords.\n`;
    b += `**Design specs:** 1320\u00D72868px (6.9") | 1290\u00D72796px (6.7") | 1242\u00D72208px (5.5") \u2014 upload 6.9" and Apple scales down.\n`;
    b += `**Device frame:** iPhone 16 Pro (Dynamic Island, no home button)\n`;
    b += `**A/B test:** Apple PPO supports up to 3 treatments. Test screenshot order, caption copy, and visual style.\n`;
  } else {
    b += `**Android:** Keep promo text under 20% of image area. Use Store Listing Experiments (7+ days, 50%+ traffic).\n`;
    b += `**Design specs:** 1080\u00D71920px (standard) | 1440\u00D72560px (high-res) | Feature graphic 1024\u00D7500px\n`;
    b += `**Device frame:** Pixel 9 or current flagship Android device\n`;
  }

  // Extract caption copy options
  const copyOptions: string[] = [];
  if (ai.perScreenshot?.length) {
    for (const ss of ai.perScreenshot) {
      if (ss.captionSuggestions?.length) {
        copyOptions.push(ss.captionSuggestions[0]);
      } else if (ss.captionSuggestion) {
        copyOptions.push(ss.captionSuggestion);
      }
    }
  }
  if (ai.missingSlots?.length) {
    for (const ms of ai.missingSlots) {
      if (ms.captionSuggestion) copyOptions.push(ms.captionSuggestion);
    }
  }

  // Build deliverables
  const deliverables: string[] = [];
  const existingCount = ai.perScreenshot?.length || 0;
  const missingCount = ai.missingSlots?.length || 0;
  const hasFrameIssues = JSON.stringify(ai.perScreenshot || []).toLowerCase().includes("outdated");
  const hasUIIssues = JSON.stringify(ai.perScreenshot || []).toLowerCase().match(/2019|2020|outdated ui/);

  if (hasFrameIssues) deliverables.push(`Reshoot all ${existingCount} existing screenshots with current-gen device frames (${isIOS ? "iPhone 16 Pro" : "Pixel 9"})`);
  if (hasUIIssues) deliverables.push("Update all screenshots to show the current app version (outdated UI/dates detected)");
  if (missingCount > 0) deliverables.push(`Design ${missingCount} new screenshots for slots ${existingCount + 1}-${existingCount + missingCount} (see above)`);
  deliverables.push(`Export at platform-required resolutions`);
  deliverables.push(`Upload to ${isIOS ? "App Store Connect \u203A Media Manager" : "Google Play Console \u203A Store Listing"}`);
  if (isIOS) deliverables.push("Verify OCR readability (zoom to 25% test)");
  deliverables.push("Set up A/B test with current vs new screenshots");

  return { brief: b, copyOptions: copyOptions.length > 0 ? copyOptions : undefined, deliverables };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDescriptionDeepDive(ai: any): DeepDiveEnhancement {
  let b = "**AI Description Analysis** (deep-dive):\n\n";

  if (ai.keywordStrategy) b += `**Keyword Strategy:**\n${ai.keywordStrategy}\n\n`;

  if (ai.structuralChanges?.length) {
    b += `**Structural Changes:**\n`;
    for (const c of ai.structuralChanges) b += `  \u2022 ${c}\n`;
    b += "\n";
  }

  const copyOptions: string[] = [];

  if (ai.primaryRewrite) {
    b += `---\n\n`;
    b += `**Recommended Description** (${ai.charCounts?.primary || "?"} chars, ready to copy-paste):\n\n`;
    b += `${ai.primaryRewrite}\n\n`;
    copyOptions.push(ai.primaryRewrite);
  }

  if (ai.alternativeA) {
    b += `---\n\n`;
    b += `**Alternative A** (${ai.charCounts?.altA || "?"} chars):\n\n`;
    b += `${ai.alternativeA}\n\n`;
    copyOptions.push(ai.alternativeA);
  }

  if (ai.alternativeB) {
    b += `---\n\n`;
    b += `**Alternative B** (${ai.charCounts?.altB || "?"} chars):\n\n`;
    b += `${ai.alternativeB}\n\n`;
    copyOptions.push(ai.alternativeB);
  }

  const deliverables = [
    "Choose preferred description variant (or combine best elements)",
    "Paste into store listing and verify character count",
    "Run keyword density check on final version",
    "Set up A/B test (current vs new description)",
  ];

  return { brief: b, copyOptions: copyOptions.length > 0 ? copyOptions : undefined, deliverables };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTitleDeepDive(ai: any): DeepDiveEnhancement {
  let b = "**AI Title Analysis** (deep-dive):\n\n";

  if (ai.currentAnalysis) b += `${ai.currentAnalysis}\n\n`;

  if (ai.variants?.length) {
    b += `**Title Variants:**\n`;
    for (const v of ai.variants) {
      b += `  \u2022 "${v.title}" (${v.charCount}ch) \u2014 ${v.strategy}: ${v.reasoning}\n`;
    }
    b += "\n";
  }

  if (ai.recommendation) b += `**Recommendation:** ${ai.recommendation}\n`;

  const copyOptions: string[] = [];
  if (ai.variants?.length) {
    for (const v of ai.variants) {
      if (v.title) copyOptions.push(v.title);
    }
  }

  return { brief: b, copyOptions: copyOptions.length > 0 ? copyOptions : undefined };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatIconDeepDive(ai: any, platform: string): DeepDiveEnhancement {
  let b = "**AI Icon Analysis** (deep-dive, vision-powered):\n";
  if (ai.assessment) b += `${ai.assessment}\n\n`;

  if (ai.issues?.length) {
    b += `**Issues found:**\n`;
    for (const issue of ai.issues) b += `  \u2022 ${issue}\n`;
    b += "\n";
  }

  if (ai.colorAnalysis) b += `**Color analysis:** ${ai.colorAnalysis}\n\n`;
  if (ai.competitorComparison) b += `**vs Competitors:** ${ai.competitorComparison}\n\n`;
  if (ai.redesignBrief) b += `**Redesign brief:** ${ai.redesignBrief}\n\n`;

  if (ai.suggestions?.length) {
    b += `**Suggestions:**\n`;
    for (const s of ai.suggestions) b += `  \u2022 ${s}\n`;
    b += "\n";
  }

  b += `**Icon best practices:**\n`;
  b += `  \u2022 Must be recognizable at 60x60px \u2014 the smallest display size\n`;
  b += `  \u2022 Simple, bold shapes with high contrast\n`;
  b += `  \u2022 Should communicate the app's purpose at a glance\n`;
  b += `  \u2022 Test against both light and dark backgrounds\n`;
  b += `  \u2022 Unique within your category \u2014 avoid looking like competitors`;

  const deliverables = [
    "Design 2-3 icon variants addressing the issues above",
    "Test at 60x60px, 120x120px, and 1024x1024px sizes",
    `Upload to ${platform === "ios" ? "App Store Connect" : "Google Play Console"}`,
    `A/B test with ${platform === "ios" ? "Apple PPO" : "Google Play Store Listing Experiments"}`,
  ];

  return { brief: b, deliverables };
}

interface SearchResult {
  id: string;
  name: string;
  developer: string;
  icon: string;
  rating: number;
  platform: "ios" | "android";
  url: string;
}

interface CachedAppData {
  platform: "ios" | "android";
  title: string;
  subtitle?: string;
  shortDescription?: string;
  description: string;
  keywordField?: string;
  developerName: string;
  category: string;
  rating: number;
  ratingsCount: number;
  version: string;
  lastUpdated: string;
  screenshotCount: number;
  hasVideo: boolean;
  price: string;
  size?: string;
  contentRating?: string;
  installs?: string;
  url: string;
  iconUrl?: string;
  screenshots?: string[];
  whatsNew?: string;
  promotionalText?: string;
  featureGraphicUrl?: string;
}

interface AuditReport {
  app: {
    title: string;
    developer: string;
    platform: string;
    rating: number;
    ratingsCount: number;
    icon?: string;
    url?: string;
  };
  overallScore: number;
  categories: AuditCategory[];
  actionPlan: ActionItem[];
  aiPowered?: boolean;
  aiText?: boolean;
  aiScreenshots?: boolean;
  appData?: CachedAppData;
}

type ViewState = "search" | "results" | "auditing" | "report";

export default function Home() {
  const [view, setView] = useState<ViewState>("search");
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<"ios" | "android" | "both">("both");
  const [country, setCountry] = useState("us");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const [deepDiveLoading, setDeepDiveLoading] = useState<string | null>(null);

  const handleDeepDive = useCallback(async (section: string, actionId: string): Promise<DeepDiveEnhancement | string | null> => {
    if (!report?.appData) return null;
    setDeepDiveLoading(actionId);
    try {
      const resp = await fetch("/api/audit/deep-dive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appData: report.appData, section }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => null);
        return `__ERROR__${errData?.error || `AI analysis failed (${resp.status})`}`;
      }
      const data = await resp.json();
      return formatDeepDiveResult(section, data.analysis, report.appData.platform);
    } catch {
      return "__ERROR__Network error — please try again";
    } finally {
      setDeepDiveLoading(null);
    }
  }, [report]);

  const handleVisualize = useCallback(async (section: "icon" | "screenshots", brief: string): Promise<VisualConceptResult[] | string> => {
    if (!report?.appData) return "__ERROR__No app data available";
    try {
      const resp = await fetch("/api/audit/visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appData: report.appData, section, brief }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => null);
        return `__ERROR__${errData?.error || `Visual generation failed (${resp.status})`}`;
      }
      const data = await resp.json();
      return (data.concepts || []).map((c: { data: string; mimeType: string; label: string; commentary: string }) => ({
        data: c.data,
        mimeType: c.mimeType,
        label: c.label,
        commentary: c.commentary,
      }));
    } catch {
      return "__ERROR__Network error — please try again";
    }
  }, [report]);

  const handleSearch = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setError("");
    setSearching(true);

    try {
      const params = new URLSearchParams({ q: query, platform, country });
      const resp = await fetch(`/api/search?${params}`);
      if (!resp.ok) throw new Error("Search failed");
      const data = await resp.json();
      setResults(data.results || []);
      setView("results");
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [query, platform, country]);

  const handleAudit = useCallback(async (app: SearchResult) => {
    setView("auditing");
    setError("");

    try {
      const params = new URLSearchParams({ id: app.id, platform: app.platform, country });
      const resp = await fetch(`/api/audit?${params}`);
      if (!resp.ok) throw new Error("Audit failed");
      const data = await resp.json();
      setReport(data);
      setView("report");
    } catch {
      setError("Audit failed. Please try again.");
      setView("results");
    }
  }, [country]);

  const handleBack = useCallback(() => {
    if (view === "report") setView("results");
    else if (view === "results") setView("search");
  }, [view]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-page)" }}>
      <header className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
              aria-hidden="true"
            >
              G
            </div>
            <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              GetGrowth
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "var(--accent-bg)", color: "var(--accent)", fontWeight: 500 }}
            >
              ASO Audit
            </span>
          </div>
          {view !== "search" && (
            <button
              onClick={handleBack}
              className="text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
              style={{ color: "var(--text-secondary)", backgroundColor: "transparent" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-inset)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              &larr; Back
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* SEARCH VIEW */}
        {view === "search" && (
          <div className="fade-in">
            <div className="text-center mb-10">
              <h1 className="text-3xl mb-3" style={{ color: "var(--text-primary)" }}>
                Free ASO Audit
              </h1>
              <p className="text-base" style={{ color: "var(--text-secondary)", maxWidth: "480px", margin: "0 auto" }}>
                Analyze any app&rsquo;s metadata, visual assets, ratings, and conversion signals against ASO best practices. Powered by the ASO Stack framework.
              </p>
            </div>

            <form
              onSubmit={handleSearch}
              className="border rounded-lg p-5"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
            >
              <div className="mb-4">
                <label htmlFor="search-input" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                  App name or keyword
                </label>
                <input
                  id="search-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Spotify, Headspace\u2026"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full px-3.5 py-2.5 text-sm border rounded-md transition-colors"
                  style={{
                    backgroundColor: "var(--bg-page)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-body)",
                  }}
                />
              </div>

              <div className="flex gap-4 mb-5">
                <fieldset className="flex-1">
                  <legend className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                    Platform
                  </legend>
                  <div className="flex gap-2" role="radiogroup" aria-label="Platform selection">
                    {(["both", "ios", "android"] as const).map((p) => (
                      <label
                        key={p}
                        className="flex-1 cursor-pointer text-center text-sm py-2 px-3 border rounded-md transition-colors"
                        style={{
                          backgroundColor: platform === p ? "var(--accent-bg)" : "var(--bg-page)",
                          borderColor: platform === p ? "var(--accent)" : "var(--border)",
                          color: platform === p ? "var(--accent)" : "var(--text-secondary)",
                          fontWeight: platform === p ? 600 : 400,
                        }}
                      >
                        <input
                          type="radio"
                          name="platform"
                          value={p}
                          checked={platform === p}
                          onChange={() => setPlatform(p)}
                          className="sr-only"
                        />
                        {p === "both" ? "Both" : p === "ios" ? "iOS" : "Android"}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="w-24">
                  <label htmlFor="country-select" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                    Region
                  </label>
                  <select
                    id="country-select"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border rounded-md"
                    style={{
                      backgroundColor: "var(--bg-page)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="us">US</option>
                    <option value="gb">UK</option>
                    <option value="de">DE</option>
                    <option value="jp">JP</option>
                    <option value="br">BR</option>
                    <option value="kr">KR</option>
                    <option value="fr">FR</option>
                    <option value="au">AU</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="w-full py-2.5 text-sm font-semibold rounded-md transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "var(--accent)", color: "#fff" }}
              >
                {searching ? "Searching\u2026" : "Search Apps"}
              </button>
            </form>

            {error && (
              <p className="mt-4 text-sm text-center" style={{ color: "var(--fail-text)" }} role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        {/* RESULTS VIEW */}
        {view === "results" && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl mb-1" style={{ color: "var(--text-primary)" }}>
                Search Results
              </h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {results.length} apps found for &ldquo;{query}&rdquo;. Select one to audit.
              </p>
            </div>

            {results.length === 0 ? (
              <div
                className="border rounded-lg p-8 text-center"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  No apps found. Try a different search term.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((app, i) => (
                  <button
                    key={`${app.platform}-${app.id}`}
                    onClick={() => handleAudit(app)}
                    className="fade-in w-full text-left border rounded-lg p-4 flex items-center gap-4 transition-colors"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      borderColor: "var(--border)",
                      animationDelay: `${i * 0.04}s`,
                      opacity: 0,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-card-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-card)"; }}
                  >
                    {app.icon ? (
                      <img
                        src={app.icon}
                        alt=""
                        width={44}
                        height={44}
                        className="rounded-lg shrink-0"
                        style={{ backgroundColor: "var(--bg-inset)" }}
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-lg shrink-0"
                        style={{ backgroundColor: "var(--bg-inset)" }}
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {app.name}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                        {app.developer}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {app.rating > 0 && (
                        <span className="text-xs font-mono tabular-nums" style={{ color: "var(--text-secondary)" }}>
                          {app.rating.toFixed(1)} {"\u2605"}
                        </span>
                      )}
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: app.platform === "ios" ? "var(--info-bg)" : "var(--pass-bg)",
                          color: app.platform === "ios" ? "var(--info-text)" : "var(--pass-text)",
                        }}
                      >
                        {app.platform === "ios" ? "iOS" : "Android"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-center" style={{ color: "var(--fail-text)" }} role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        {/* AUDITING VIEW */}
        {view === "auditing" && (
          <div className="py-20 text-center fade-in">
            <div
              className="w-16 h-16 mx-auto mb-6 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "var(--bg-inset)" }}
              aria-hidden="true"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="animate-spin" style={{ animationDuration: "2s" }}>
                <circle cx="12" cy="12" r="10" stroke="var(--border)" strokeWidth="2.5" />
                <path d="M12 2a10 10 0 019.95 9" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-xl mb-2" style={{ color: "var(--text-primary)" }}>
              Running ASO Audit
            </h2>
            <p className="text-sm loading-ellipsis" style={{ color: "var(--text-secondary)" }}>
              Fetching store data and analyzing metadata
            </p>
          </div>
        )}

        {/* REPORT VIEW */}
        {view === "report" && report && (
          <div>
            {/* Report Header */}
            <div className="mb-8 fade-in">
              <div className="flex items-start gap-5 mb-6">
                {report.app.icon && (
                  <img
                    src={report.app.icon}
                    alt=""
                    width={64}
                    height={64}
                    className="rounded-2xl shrink-0"
                    style={{ backgroundColor: "var(--bg-inset)" }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl mb-1 truncate" style={{ color: "var(--text-primary)" }}>
                    {report.app.title}
                  </h2>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {report.app.developer} &middot; {report.app.platform === "ios" ? "App Store" : "Google Play"}
                    {report.app.rating > 0 && (
                      <> {"\u00B7"} {report.app.rating.toFixed(1)} {"\u2605"} ({report.app.ratingsCount.toLocaleString()})</>
                    )}
                  </p>
                </div>
              </div>

              <div
                className="border rounded-lg p-6 flex items-center gap-6"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <ScoreRing score={report.overallScore} size={100} label="Overall" />
                <div className="flex-1">
                  <h3 className="text-lg mb-2" style={{ color: "var(--text-primary)" }}>
                    ASO Health Score
                  </h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {report.overallScore >= 80
                      ? "Strong ASO foundation. Focus on the warning areas below for further gains."
                      : report.overallScore >= 60
                        ? "Decent baseline with clear optimization opportunities. Address the failing areas first."
                        : report.overallScore >= 40
                          ? "Significant gaps in ASO coverage. Prioritize the failing categories below."
                          : "Critical ASO issues detected. Start with the highest-weighted failing rules."}
                  </p>
                </div>
              </div>
            </div>

            {/* Category Scores Grid */}
            <div
              className="grid grid-cols-3 gap-3 mb-8 fade-in fade-in-delay-1"
              role="list"
              aria-label="Category scores"
            >
              {report.categories.map((cat) => (
                <div
                  key={cat.id}
                  className="border rounded-lg p-3.5 text-center"
                  style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
                  role="listitem"
                >
                  <div
                    className="text-xl font-semibold tabular-nums mb-0.5"
                    style={{ color: cat.score >= 80 ? "var(--score-excellent)" : cat.score >= 60 ? "var(--score-good)" : cat.score >= 40 ? "var(--score-warning)" : "var(--score-fail)" }}
                  >
                    {cat.score}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {cat.name}
                  </div>
                </div>
              ))}
            </div>

            {/* AI Status Banner */}
            {report.aiPowered && !report.aiScreenshots && (
              <div
                className="border rounded-lg p-4 mb-6 fade-in fade-in-delay-2"
                style={{ backgroundColor: "rgba(234, 179, 8, 0.08)", borderColor: "rgba(234, 179, 8, 0.3)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  <strong style={{ color: "rgb(234, 179, 8)" }}>AI Vision Unavailable</strong> — Screenshot and icon analysis fell back to rule-based mode. This usually means images couldn&apos;t be downloaded or the visual AI call timed out. Use the &quot;Enhance with AI&quot; button on screenshot items to retry per-item analysis.
                </p>
              </div>
            )}
            {!report.aiPowered && (
              <div
                className="border rounded-lg p-4 mb-6 fade-in fade-in-delay-2"
                style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", borderColor: "rgba(239, 68, 68, 0.3)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  <strong style={{ color: "rgb(239, 68, 68)" }}>AI Analysis Unavailable</strong> — The audit used rule-based analysis only. AI-powered recommendations were not generated. Use the &quot;Enhance with AI&quot; buttons to get AI analysis per item.
                </p>
              </div>
            )}

            {/* Action Plan */}
            {report.actionPlan && report.actionPlan.length > 0 && (
              <div className="mb-8 fade-in fade-in-delay-2">
                <h3 className="text-lg mb-3" style={{ color: "var(--text-primary)" }}>
                  Action Plan
                </h3>
                <ActionPlan actions={report.actionPlan} onDeepDive={handleDeepDive} deepDiveLoading={deepDiveLoading} onVisualize={handleVisualize} />
              </div>
            )}

            {/* Detailed Results */}
            <div className="space-y-3 fade-in fade-in-delay-2">
              <h3 className="text-lg mb-3" style={{ color: "var(--text-primary)" }}>
                Detailed Analysis
              </h3>
              {report.categories.map((cat) => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
            </div>

            {/* Footer */}
            <div className="mt-10 pt-6 border-t text-center fade-in fade-in-delay-3" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                A <strong style={{ color: "var(--text-secondary)" }}>GetGrowth</strong> tool.
                Based on the ASO Stack framework &amp; store best practices.
                Keyword volumes are estimates. Store algorithms are proprietary and change without notice.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
