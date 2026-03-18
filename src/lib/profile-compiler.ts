import { supabaseAdmin } from "@/lib/supabase";
import type { AppProfileContext } from "@/lib/supabase";

/**
 * Compile a complete context profile for a saved app by aggregating
 * every data source: store metadata, audit history, keywords, metrics,
 * competitors, and experiments.
 *
 * This profile is the foundation for the agentic layer — it gives the AI
 * full situational awareness about an app in a single read.
 */
export async function compileProfile(savedAppId: string, userId: string): Promise<AppProfileContext> {
  const [
    { data: savedApp },
    { data: audits },
    { data: connectedApps },
    { data: competitors },
    { data: keywordTracks },
    { data: experiments },
  ] = await Promise.all([
    supabaseAdmin.from("saved_apps").select("*").eq("id", savedAppId).single(),
    supabaseAdmin
      .from("audits")
      .select("*")
      .eq("saved_app_id", savedAppId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("connected_apps")
      .select("id, store_connection_id, sync_enabled")
      .eq("saved_app_id", savedAppId)
      .eq("sync_enabled", true),
    supabaseAdmin
      .from("competitors")
      .select("*")
      .eq("saved_app_id", savedAppId),
    supabaseAdmin
      .from("keyword_tracks")
      .select("*")
      .eq("saved_app_id", savedAppId)
      .eq("is_active", true),
    supabaseAdmin
      .from("experiments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!savedApp) throw new Error("Saved app not found");

  // --- Identity & store listing from the latest audit's app_data ---
  const latestAudit = audits?.[0];
  const appData = latestAudit?.app_data ?? {};

  const identity: AppProfileContext["identity"] = {
    storeId: savedApp.store_id,
    platform: savedApp.platform,
    name: savedApp.name,
    developer: appData.developerName ?? "",
    category: appData.category ?? "",
    iconUrl: savedApp.icon_url ?? appData.iconUrl ?? "",
    url: appData.url ?? "",
  };

  const storeListing: AppProfileContext["storeListing"] = {
    title: appData.title ?? savedApp.name,
    subtitle: appData.subtitle ?? null,
    shortDescription: appData.shortDescription ?? null,
    description: appData.description ?? "",
    keywordField: appData.keywordField ?? null,
    promotionalText: appData.promotionalText ?? null,
    whatsNew: appData.whatsNew ?? null,
    screenshotCount: appData.screenshotCount ?? appData.screenshots?.length ?? 0,
    hasVideo: appData.hasVideo ?? false,
    version: appData.version ?? null,
    lastUpdated: appData.lastUpdated ?? null,
    rating: appData.rating ?? 0,
    ratingsCount: appData.ratingsCount ?? 0,
    price: appData.price ?? null,
    contentRating: appData.contentRating ?? null,
  };

  // --- ASO health from audit history ---
  const auditHistory: AppProfileContext["auditHistory"] = (audits ?? []).map((a) => ({
    date: a.created_at,
    score: a.overall_score,
    source: a.source ?? "manual",
    aiPowered: a.ai_powered ?? false,
  }));

  const currentScore = latestAudit?.overall_score ?? 0;
  const previousAudit = audits?.[1];
  const previousScore = previousAudit?.overall_score ?? null;
  const categoryScores: Record<string, number> = latestAudit?.category_scores ?? {};

  const scoreDelta = previousScore !== null ? currentScore - previousScore : 0;
  const scoreTrend: AppProfileContext["asoHealth"]["scoreTrend"] =
    previousScore === null ? "new" :
    scoreDelta >= 3 ? "improving" :
    scoreDelta <= -3 ? "declining" :
    "stable";

  const sortedCats = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
  const strengths = sortedCats.slice(0, 3).map(([k]) => k);
  const weaknesses = sortedCats.slice(-3).reverse().map(([k]) => k);

  const asoHealth: AppProfileContext["asoHealth"] = {
    currentScore,
    previousScore,
    scoreTrend,
    categoryScores,
    strengths,
    weaknesses,
    lastAuditAt: latestAudit?.created_at ?? "",
    aiPowered: latestAudit?.ai_powered ?? false,
  };

  // --- Action plan summary from latest audit ---
  const rawPlan: Array<{ priority?: string; effort?: string; title?: string; category?: string }> =
    latestAudit?.action_plan ?? [];
  const actionPlan: AppProfileContext["actionPlan"] = {
    total: rawPlan.length,
    critical: rawPlan.filter((a) => a.priority === "critical").length,
    high: rawPlan.filter((a) => a.priority === "high").length,
    topActions: rawPlan.slice(0, 5).map((a) => ({
      title: a.title ?? "",
      priority: a.priority ?? "medium",
      effort: a.effort ?? "medium",
      category: a.category ?? "",
    })),
  };

  // --- Keywords ---
  const kwTracks = keywordTracks ?? [];
  let keywordProfiles: AppProfileContext["keywords"]["tracked"] = [];

  if (kwTracks.length > 0) {
    const trackIds = kwTracks.map((t) => t.id);
    const { data: latestRanks } = await supabaseAdmin
      .from("keyword_rank_history")
      .select("keyword_track_id, rank, popularity, date")
      .in("keyword_track_id", trackIds)
      .order("date", { ascending: false })
      .limit(trackIds.length * 2);

    const { data: olderRanks } = await supabaseAdmin
      .from("keyword_rank_history")
      .select("keyword_track_id, rank, date")
      .in("keyword_track_id", trackIds)
      .lt("date", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
      .order("date", { ascending: false })
      .limit(trackIds.length);

    const latestByTrack = new Map<string, { rank: number | null; popularity: number | null }>();
    for (const r of latestRanks ?? []) {
      if (!latestByTrack.has(r.keyword_track_id)) {
        latestByTrack.set(r.keyword_track_id, { rank: r.rank, popularity: r.popularity });
      }
    }

    const olderByTrack = new Map<string, number | null>();
    for (const r of olderRanks ?? []) {
      if (!olderByTrack.has(r.keyword_track_id)) {
        olderByTrack.set(r.keyword_track_id, r.rank);
      }
    }

    keywordProfiles = kwTracks.map((t) => {
      const latest = latestByTrack.get(t.id);
      const older = olderByTrack.get(t.id);
      let trend: "improving" | "declining" | "stable" | "new" = "new";
      if (latest?.rank != null && older != null) {
        const delta = older - latest.rank; // positive = improved (lower rank number = better)
        trend = delta >= 3 ? "improving" : delta <= -3 ? "declining" : "stable";
      }
      return {
        keyword: t.keyword,
        country: t.country,
        currentRank: latest?.rank ?? null,
        popularity: latest?.popularity ?? null,
        trend,
      };
    });
  }

  const keywords: AppProfileContext["keywords"] = {
    tracked: keywordProfiles,
    totalTracked: kwTracks.length,
  };

  // --- Metrics ---
  const connectedApp = connectedApps?.[0];
  let metrics: AppProfileContext["metrics"] = {
    hasStoreConnection: !!connectedApp,
    latestDate: null,
    last7d: null,
    last30d: null,
    trends: { installs: null, cvr: null, rating: null },
  };

  if (connectedApp) {
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const { data: recentMetrics } = await supabaseAdmin
      .from("app_metrics")
      .select("date, impressions, installs, conversion_rate, rating_avg")
      .eq("connected_app_id", connectedApp.id)
      .gte("date", d30)
      .order("date", { ascending: false });

    if (recentMetrics?.length) {
      metrics.latestDate = recentMetrics[0].date;

      const last7 = recentMetrics.filter(
        (m) => new Date(m.date) >= new Date(now.getTime() - 7 * 86400000)
      );
      const last30 = recentMetrics;

      const agg = (rows: typeof recentMetrics) => {
        if (!rows.length) return null;
        const imp = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
        const inst = rows.reduce((s, r) => s + (r.installs ?? 0), 0);
        const avgCvr = rows.reduce((s, r) => s + (r.conversion_rate ?? 0), 0) / rows.length;
        return {
          impressions: imp,
          installs: inst,
          cvr: Math.round(avgCvr * 100) / 100,
        };
      };

      metrics.last7d = agg(last7);
      metrics.last30d = agg(last30);

      // Trend: compare first half vs second half of 30d window
      if (last30.length >= 6) {
        const mid = Math.floor(last30.length / 2);
        const recent = last30.slice(0, mid);
        const older = last30.slice(mid);
        const avgField = (rows: typeof last30, field: "installs" | "conversion_rate" | "rating_avg") =>
          rows.reduce((s, r) => s + (r[field] ?? 0), 0) / rows.length;

        const trendCalc = (field: "installs" | "conversion_rate" | "rating_avg") => {
          const r = avgField(recent, field);
          const o = avgField(older, field);
          if (o === 0) return "stable" as const;
          const pct = ((r - o) / o) * 100;
          return pct >= 5 ? ("improving" as const) : pct <= -5 ? ("declining" as const) : ("stable" as const);
        };

        metrics.trends = {
          installs: trendCalc("installs"),
          cvr: trendCalc("conversion_rate"),
          rating: trendCalc("rating_avg"),
        };
      }
    }
  }

  // --- Competitors ---
  const competitorProfiles: AppProfileContext["competitors"] = (competitors ?? []).map((c) => ({
    name: c.competitor_name,
    storeId: c.competitor_store_id,
    platform: c.competitor_platform,
    lastAuditScore: null, // populated below
  }));

  if (competitorProfiles.length > 0) {
    const compIds = (competitors ?? []).map((c) => c.id);
    const { data: compAudits } = await supabaseAdmin
      .from("audits")
      .select("competitor_id, overall_score")
      .in("competitor_id", compIds)
      .order("created_at", { ascending: false });

    if (compAudits?.length) {
      const scoreByComp = new Map<string, number>();
      for (const a of compAudits) {
        if (a.competitor_id && !scoreByComp.has(a.competitor_id)) {
          scoreByComp.set(a.competitor_id, a.overall_score);
        }
      }
      for (let i = 0; i < competitorProfiles.length; i++) {
        const comp = competitors?.[i];
        if (comp) {
          competitorProfiles[i].lastAuditScore = scoreByComp.get(comp.id) ?? null;
        }
      }
    }
  }

  // --- Experiments (filter to those linked to this app's connected_app) ---
  const appExperiments = (experiments ?? []).filter(
    (e) => e.connected_app_id === connectedApp?.id || !e.connected_app_id
  );
  const evaluated = appExperiments.filter((e) => e.status === "evaluated");

  const experimentsSection: AppProfileContext["experiments"] = {
    total: appExperiments.length,
    active: appExperiments.filter((e) => e.status === "live" || e.status === "in_progress").length,
    wins: evaluated.filter((e) => e.outcome === "win").length,
    losses: evaluated.filter((e) => e.outcome === "loss").length,
    recentOutcomes: evaluated.slice(0, 5).map((e) => {
      let topDelta: string | null = null;
      if (e.metrics_delta?.metrics) {
        const sorted = Object.entries(e.metrics_delta.metrics as Record<string, { relativeDelta?: number }>)
          .filter(([, v]) => v.relativeDelta != null)
          .sort((a, b) => Math.abs(b[1].relativeDelta ?? 0) - Math.abs(a[1].relativeDelta ?? 0));
        if (sorted.length > 0) {
          const [metric, val] = sorted[0];
          const sign = (val.relativeDelta ?? 0) >= 0 ? "+" : "";
          topDelta = `${metric}: ${sign}${Math.round(val.relativeDelta ?? 0)}%`;
        }
      }
      return {
        title: e.title,
        outcome: e.outcome ?? null,
        topDelta,
      };
    }),
  };

  // --- Brand Voice (derived from store listing text) ---
  const brandVoice = deriveBrandVoice(appData);

  // --- ICP (derived from store listing + metadata) ---
  const icp = deriveICP(appData, storeListing, competitorProfiles);

  const now = new Date().toISOString();

  return {
    identity,
    storeListing,
    asoHealth,
    auditHistory,
    actionPlan,
    keywords,
    metrics,
    competitors: competitorProfiles,
    experiments: experimentsSection,
    brandVoice,
    icp,
    compiledAt: now,
    version: 1,
  };
}

// ---------------------------------------------------------------------------
// Brand Voice derivation — heuristic analysis of store listing text
// ---------------------------------------------------------------------------

const EMOJI_RE = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
const POWER_WORDS_POOL = [
  "free", "new", "exclusive", "premium", "unlimited", "powerful", "fast",
  "easy", "beautiful", "smart", "best", "instant", "secure", "personalized",
  "award", "loved", "top", "ultimate", "pro", "advanced", "simple",
  "discover", "explore", "transform", "boost", "unlock", "save", "create",
  "enjoy", "stream", "track", "customize", "optimize", "connect", "share",
];
const CTA_PATTERNS = [
  /download\s+(?:now|today|free)/i,
  /try\s+(?:it\s+)?(?:now|today|free)/i,
  /get\s+started/i,
  /start\s+(?:your|a)\s+/i,
  /join\s+\d/i,
  /sign\s+up/i,
  /subscribe/i,
  /upgrade/i,
  /install\s+now/i,
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deriveBrandVoice(appData: Record<string, any>): AppProfileContext["brandVoice"] {
  const desc: string = appData.description ?? "";
  const subtitle: string = appData.subtitle ?? appData.shortDescription ?? "";
  const promo: string = appData.promotionalText ?? "";
  const whatsNew: string = appData.whatsNew ?? "";
  const allText = [desc, subtitle, promo, whatsNew].filter(Boolean).join("\n");

  if (!allText.trim()) {
    return {
      tone: "neutral", sentenceStyle: "mixed", usesEmoji: false,
      emojiDensity: "none", usesBullets: false, capitalization: "standard",
      powerWords: [], ctaStyle: null, vocabularyLevel: "simple",
      samples: { openingLine: null, ctaLine: null },
    };
  }

  const sentences = allText
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  // Sentence style
  const avgLen = sentences.reduce((s, x) => s + x.split(/\s+/).length, 0) / Math.max(sentences.length, 1);
  const sentenceStyle: "short" | "mixed" | "long" =
    avgLen <= 8 ? "short" : avgLen >= 18 ? "long" : "mixed";

  // Emoji analysis
  const emojiMatches = allText.match(EMOJI_RE) ?? [];
  const usesEmoji = emojiMatches.length > 0;
  const emojiPer100 = (emojiMatches.length / Math.max(allText.length, 1)) * 100;
  const emojiDensity: "none" | "light" | "heavy" =
    !usesEmoji ? "none" : emojiPer100 > 0.5 ? "heavy" : "light";

  // Bullets
  const usesBullets = /^[\s]*[•\-✓✔★▸►●○◆→⭐]/m.test(desc);

  // Capitalization
  const allCapsWords = (allText.match(/\b[A-Z]{3,}\b/g) ?? []).length;
  const titleCaseWords = (allText.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+){2,}/g) ?? []).length;
  const totalWords = allText.split(/\s+/).length;
  const capitalization: "standard" | "title-case-heavy" | "all-caps-heavy" =
    allCapsWords / totalWords > 0.05 ? "all-caps-heavy" :
    titleCaseWords > 3 ? "title-case-heavy" : "standard";

  // Tone classification
  const playfulSignals = emojiMatches.length + (allText.match(/!{2,}/g)?.length ?? 0) +
    (allText.match(/\b(fun|awesome|amazing|wow|cool|love|yay)\b/gi)?.length ?? 0);
  const formalSignals = (allText.match(/\b(utilize|leverage|optimize|facilitate|comprehensive|robust|enterprise)\b/gi)?.length ?? 0);
  const technicalSignals = (allText.match(/\b(API|SDK|algorithm|encryption|protocol|framework|runtime|backend|sync|latency|bandwidth)\b/gi)?.length ?? 0);
  const casualSignals = (allText.match(/\b(just|super|pretty|really|totally|gonna|wanna|stuff|things|check out)\b/gi)?.length ?? 0);

  const maxSignal = Math.max(playfulSignals, formalSignals, technicalSignals, casualSignals, 1);
  const tone: AppProfileContext["brandVoice"]["tone"] =
    technicalSignals === maxSignal ? "technical" :
    formalSignals === maxSignal ? "formal" :
    playfulSignals === maxSignal ? "playful" :
    casualSignals === maxSignal ? "casual" : "neutral";

  // Vocabulary level
  const longWords = (allText.match(/\b\w{10,}\b/g) ?? []).length;
  const longWordRatio = longWords / Math.max(totalWords, 1);
  const vocabularyLevel: "simple" | "moderate" | "technical" =
    technicalSignals >= 3 || longWordRatio > 0.08 ? "technical" :
    longWordRatio > 0.04 ? "moderate" : "simple";

  // Power words found in the text
  const lowerText = allText.toLowerCase();
  const powerWords = POWER_WORDS_POOL
    .filter((w) => lowerText.includes(w))
    .slice(0, 8);

  // CTA detection
  let ctaStyle: string | null = null;
  let ctaLine: string | null = null;
  for (const pattern of CTA_PATTERNS) {
    const match = allText.match(pattern);
    if (match) {
      ctaStyle = match[0];
      const idx = allText.indexOf(match[0]);
      const lineStart = allText.lastIndexOf("\n", idx) + 1;
      const lineEnd = allText.indexOf("\n", idx);
      ctaLine = allText.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim().slice(0, 120);
      break;
    }
  }

  // Opening line
  const firstLine = desc.split(/[.\n]/).map((s) => s.trim()).find((s) => s.length > 10) ?? null;
  const openingLine = firstLine ? firstLine.slice(0, 120) : null;

  return {
    tone,
    sentenceStyle,
    usesEmoji,
    emojiDensity,
    usesBullets,
    capitalization,
    powerWords,
    ctaStyle,
    vocabularyLevel,
    samples: { openingLine, ctaLine },
  };
}

// ---------------------------------------------------------------------------
// ICP derivation — heuristic ideal customer profile from store listing
// ---------------------------------------------------------------------------

const AUDIENCE_PATTERNS: Array<{ pattern: RegExp; audience: string }> = [
  { pattern: /\b(developer|programmer|coder|engineer)\b/i, audience: "Software developers" },
  { pattern: /\b(designer|creative|artist)\b/i, audience: "Designers & creatives" },
  { pattern: /\b(gamer|gaming|game)\b/i, audience: "Gamers" },
  { pattern: /\b(student|learn|education|study|school|university)\b/i, audience: "Students & learners" },
  { pattern: /\b(business|entrepreneur|startup|enterprise|B2B)\b/i, audience: "Business professionals" },
  { pattern: /\b(fitness|workout|gym|exercise|health)\b/i, audience: "Fitness & health enthusiasts" },
  { pattern: /\b(music|musician|DJ|audio|listen)\b/i, audience: "Music enthusiasts" },
  { pattern: /\b(photo|photography|camera|selfie|edit)\b/i, audience: "Photography enthusiasts" },
  { pattern: /\b(travel|trip|flight|hotel|explore)\b/i, audience: "Travelers" },
  { pattern: /\b(parent|kid|child|family|baby)\b/i, audience: "Parents & families" },
  { pattern: /\b(cook|recipe|food|meal|restaurant)\b/i, audience: "Food & cooking enthusiasts" },
  { pattern: /\b(meditat|mindful|calm|sleep|relax|mental health)\b/i, audience: "Wellness seekers" },
  { pattern: /\b(invest|stock|trading|crypto|finance|money|budget)\b/i, audience: "Finance-minded users" },
  { pattern: /\b(shop|deal|coupon|sale|price|buy)\b/i, audience: "Shoppers & deal seekers" },
  { pattern: /\b(social|friend|chat|message|connect with)\b/i, audience: "Social connectors" },
  { pattern: /\b(productiv|task|todo|organize|plan|schedule|calendar)\b/i, audience: "Productivity seekers" },
];

const PAIN_POINT_PATTERNS: Array<{ pattern: RegExp; painPoint: string }> = [
  { pattern: /\b(without ads|ad[- ]free|no ads)\b/i, painPoint: "Ad fatigue in competing apps" },
  { pattern: /\b(offline|no internet|without wifi)\b/i, painPoint: "Need for offline access" },
  { pattern: /\b(privacy|private|secure|encrypt)\b/i, painPoint: "Privacy & data security concerns" },
  { pattern: /\b(simple|easy to use|intuitive|beginner)\b/i, painPoint: "Complexity of existing solutions" },
  { pattern: /\b(fast|quick|instant|speed)\b/i, painPoint: "Slow alternatives" },
  { pattern: /\b(all[- ]in[- ]one|everything you need)\b/i, painPoint: "Tool fragmentation" },
  { pattern: /\b(save time|time[- ]saving)\b/i, painPoint: "Time constraints" },
  { pattern: /\b(save money|affordable|free|budget)\b/i, painPoint: "Cost of alternatives" },
  { pattern: /\b(custom|personali[sz]e)\b/i, painPoint: "One-size-fits-all limitations" },
  { pattern: /\b(sync|cross[- ]device|cloud)\b/i, painPoint: "Multi-device fragmentation" },
];

function deriveICP(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appData: Record<string, any>,
  storeListing: AppProfileContext["storeListing"],
  competitors: AppProfileContext["competitors"]
): AppProfileContext["icp"] {
  const desc: string = appData.description ?? "";
  const subtitle: string = appData.subtitle ?? appData.shortDescription ?? "";
  const allText = [desc, subtitle].filter(Boolean).join("\n");
  const lowerText = allText.toLowerCase();

  // Primary audience
  const matchedAudiences: string[] = [];
  for (const { pattern, audience } of AUDIENCE_PATTERNS) {
    if (pattern.test(allText) && !matchedAudiences.includes(audience)) {
      matchedAudiences.push(audience);
    }
  }
  const primaryAudience = matchedAudiences.length > 0
    ? matchedAudiences.slice(0, 2).join(" & ")
    : `${appData.category ?? "General"} app users`;

  // Use cases — extract from feature-like sentences
  const useCases: string[] = [];
  const featurePatterns = [
    /(?:you can|allows you to|lets you|enables? you to|helps? you)\s+([^.!?\n]{10,60})/gi,
    /(?:easily|quickly|instantly)\s+([^.!?\n]{10,50})/gi,
  ];
  for (const pattern of featurePatterns) {
    let match;
    while ((match = pattern.exec(allText)) !== null && useCases.length < 5) {
      const uc = match[1].trim().replace(/^(to\s+)/i, "");
      if (uc.length > 10 && !useCases.some((u) => u.toLowerCase() === uc.toLowerCase())) {
        useCases.push(uc.charAt(0).toUpperCase() + uc.slice(1));
      }
    }
  }

  // Pain points
  const painPoints: string[] = [];
  for (const { pattern, painPoint } of PAIN_POINT_PATTERNS) {
    if (pattern.test(allText) && !painPoints.includes(painPoint)) {
      painPoints.push(painPoint);
    }
  }

  // Key features — extract from bullet points or short lines
  const keyFeatures: string[] = [];
  const lines = desc.split("\n").map((l) => l.trim());
  for (const line of lines) {
    if (/^[•\-✓✔★▸►●○◆→⭐]\s*/.test(line) && keyFeatures.length < 8) {
      const clean = line.replace(/^[•\-✓✔★▸►●○◆→⭐]\s*/, "").trim();
      if (clean.length > 5 && clean.length < 120) {
        keyFeatures.push(clean);
      }
    }
  }
  if (keyFeatures.length === 0) {
    // Fallback: use short sentences that look feature-like
    const shortSentences = lines.filter((l) => l.length > 10 && l.length < 80 && !l.startsWith("http"));
    keyFeatures.push(...shortSentences.slice(0, 5));
  }

  // Pricing position
  const price = (appData.price ?? "").toLowerCase();
  const pricingPosition: AppProfileContext["icp"]["pricingPosition"] =
    /subscription|\/month|\/year|\/week/i.test(allText) ? "subscription" :
    price.includes("free") || price === "$0.00" || price === "0" ? (
      /premium|upgrade|pro version|in[- ]app purchas/i.test(allText) ? "freemium" : "free"
    ) :
    price && !price.includes("free") ? "premium" : "unknown";

  // Platform signals
  const platformSignals: string[] = [];
  if (/\bipad\b/i.test(allText)) platformSignals.push("iPad optimized");
  if (/\bapple watch|watchos\b/i.test(allText)) platformSignals.push("Apple Watch");
  if (/\bwidget/i.test(allText)) platformSignals.push("Home screen widgets");
  if (/\bcarplay\b/i.test(allText)) platformSignals.push("CarPlay");
  if (/\bsiri|shortcut/i.test(allText)) platformSignals.push("Siri / Shortcuts");
  if (/\bandroid auto\b/i.test(allText)) platformSignals.push("Android Auto");
  if (/\btablet\b/i.test(allText)) platformSignals.push("Tablet optimized");
  if (/\bwear\s*os\b/i.test(allText)) platformSignals.push("Wear OS");
  if (/\bchromebook\b/i.test(allText)) platformSignals.push("Chromebook");
  if (/\boffline/i.test(lowerText)) platformSignals.push("Offline support");

  // Demographic signals
  const contentRating = storeListing.contentRating;
  let broadAge: string | null = null;
  if (contentRating) {
    if (/4\+|Everyone/i.test(contentRating)) broadAge = "All ages";
    else if (/9\+|10\+|Teen/i.test(contentRating)) broadAge = "Teens & up";
    else if (/12\+|13\+/i.test(contentRating)) broadAge = "13+";
    else if (/17\+|18\+|Mature/i.test(contentRating)) broadAge = "Adults only";
  }

  // Competitive positioning
  let competitivePosition: string | null = null;
  if (competitors.length > 0) {
    const scores = competitors.filter((c) => c.lastAuditScore != null).map((c) => c.lastAuditScore!);
    if (scores.length > 0) {
      const avgCompScore = scores.reduce((s, x) => s + x, 0) / scores.length;
      const ownScore = storeListing.rating;
      if (ownScore > 4.5 && avgCompScore < 70) {
        competitivePosition = "Strong — higher user rating than competitors' ASO scores";
      } else if (competitors.length >= 3) {
        competitivePosition = `Tracking ${competitors.length} competitors, avg ASO score: ${Math.round(avgCompScore)}`;
      }
    }
  }

  return {
    primaryAudience,
    useCases: useCases.slice(0, 5),
    painPoints: painPoints.slice(0, 5),
    keyFeatures: keyFeatures.slice(0, 8),
    pricingPosition,
    platformSignals,
    demographicSignals: {
      contentRating,
      category: appData.category ?? storeListing.title ?? "",
      broadAge,
    },
    competitivePosition,
  };
}

/**
 * Compile and persist (upsert) the profile for a saved app.
 * Returns the compiled context.
 */
export async function buildAndSaveProfile(
  savedAppId: string,
  userId: string
): Promise<AppProfileContext> {
  const context = await compileProfile(savedAppId, userId);

  const { data: existing } = await supabaseAdmin
    .from("app_profiles")
    .select("id, version")
    .eq("saved_app_id", savedAppId)
    .single();

  const nextVersion = (existing?.version ?? 0) + 1;
  context.version = nextVersion;

  await supabaseAdmin.from("app_profiles").upsert(
    {
      saved_app_id: savedAppId,
      user_id: userId,
      context,
      version: nextVersion,
      built_at: new Date().toISOString(),
    },
    { onConflict: "saved_app_id" }
  );

  return context;
}
