import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchAppStoreData, fetchGooglePlayData } from "@/lib/store-scraper";
import { runAudit, calculateOverallScore } from "@/lib/aso-rules";
import { generateActionPlan } from "@/lib/action-plan";
import { analyzeWithAI } from "@/lib/ai-analyzer";
import { getDbUser, hasAiUnlock, consumeCredit } from "@/lib/tier-guard";
import {
  analyzeKeywords,
  toFreeView,
  type KeywordAnalysis,
  type KeywordAnalysisFree,
} from "@/lib/keyword-intelligence";

export const maxDuration = 120;

const NOISE_WORDS = new Set([
  // Common English stop words
  "the", "and", "for", "with", "your", "you", "from", "that", "this",
  "app", "our", "will", "can", "has", "have", "are", "was", "been",
  "not", "all", "but", "its", "also", "more", "most", "very", "just",
  "any", "each", "than", "them", "into", "over", "about", "now", "new",
  "get", "use", "one", "two", "like", "way", "even", "make", "take",
  "free", "download", "best", "great",
  // URL / protocol fragments — appear when descriptions contain links
  "http", "https", "www", "com", "net", "org", "edu", "gov", "html",
  "php", "utm", "href", "url", "visit", "click", "here", "link",
]);

function extractAuditKeywords(title: string, subtitle?: string, description?: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const titleWords = title.toLowerCase().replace(/[^a-z0-9\s\-']/g, " ").split(/\s+/).filter(w => w.length >= 3 && !NOISE_WORDS.has(w));
  for (const w of titleWords) {
    if (!seen.has(w)) { seen.add(w); result.push(w); }
  }

  if (subtitle) {
    const subWords = subtitle.toLowerCase().replace(/[^a-z0-9\s\-']/g, " ").split(/\s+/).filter(w => w.length >= 3 && !NOISE_WORDS.has(w));
    for (const w of subWords) {
      if (!seen.has(w)) { seen.add(w); result.push(w); }
    }
  }

  if (description && result.length < 10) {
    const descWords = description.toLowerCase().replace(/[^a-z0-9\s\-']/g, " ").split(/\s+/).filter(w => w.length >= 3 && !NOISE_WORDS.has(w));
    const freq = new Map<string, number>();
    for (const w of descWords) freq.set(w, (freq.get(w) || 0) + 1);
    const sorted = [...freq.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]);
    for (const [w] of sorted) {
      if (!seen.has(w) && result.length < 10) { seen.add(w); result.push(w); }
    }
  }

  return result.slice(0, 10);
}

export async function GET(request: NextRequest) {
  const appId    = request.nextUrl.searchParams.get("id");
  const platform = request.nextUrl.searchParams.get("platform") as "ios" | "android";
  const country  = request.nextUrl.searchParams.get("country") || "us";

  if (!appId || !platform) {
    return NextResponse.json({ error: "Missing id or platform parameter" }, { status: 400 });
  }

  const { userId } = await auth();
  let aiEnabled = false;
  let creditsRemaining = 0;
  let justUnlocked = false;

  if (userId) {
    const dbUser = await getDbUser(userId);
    creditsRemaining = dbUser?.audit_credits ?? 0;

    const alreadyUnlocked = await hasAiUnlock(userId, appId, platform);
    if (alreadyUnlocked) {
      aiEnabled = true;
    } else if (creditsRemaining > 0) {
      const consumed = await consumeCredit(userId, appId, platform);
      if (consumed) {
        aiEnabled = true;
        justUnlocked = true;
        creditsRemaining = Math.max(0, creditsRemaining - 1);
      }
    }
  }

  try {
    const appData = platform === "ios"
      ? await fetchAppStoreData(appId, country)
      : await fetchGooglePlayData(appId, country);

    // Extract keywords for keyword intelligence (iOS only)
    const keywords = platform === "ios"
      ? extractAuditKeywords(appData.title, appData.subtitle, appData.description)
      : [];

    const trackId = platform === "ios" ? parseInt(appId, 10) : undefined;

    // Run audit, AI analysis, and keyword intelligence in parallel
    const [categories, aiAnalysis, keywordResults] = await Promise.all([
      Promise.resolve(runAudit(appData)),
      aiEnabled ? analyzeWithAI(appData) : Promise.resolve(null),
      keywords.length > 0
        ? analyzeKeywords(keywords, country, trackId || undefined, 5)
        : Promise.resolve([] as KeywordAnalysis[]),
    ]);

    const overallScore = calculateOverallScore(categories);

    const hasTextAI   = !!(aiAnalysis?.title?.suggestions?.length);
    const hasVisualAI = !!(aiAnalysis?.screenshots?.perScreenshot?.length);

    // Gate keyword intelligence: free users get partial view (no download/tier details)
    const keywordIntelligence: (KeywordAnalysis | KeywordAnalysisFree)[] = aiEnabled
      ? keywordResults
      : keywordResults.map(toFreeView);

    // Action plan uses the same gated view so free users don't see paid-only details
    const actionPlan = generateActionPlan(appData, categories, overallScore, aiAnalysis ?? undefined, keywordIntelligence.length > 0 ? keywordIntelligence : undefined);

    return NextResponse.json({
      app: {
        title:        appData.title,
        developer:    appData.developerName,
        platform:     appData.platform,
        rating:       appData.rating,
        ratingsCount: appData.ratingsCount,
        icon:         appData.iconUrl,
        url:          appData.url,
        storeId:      appId,
      },
      overallScore,
      categories,
      actionPlan,
      keywordIntelligence,
      aiPowered:    hasTextAI || hasVisualAI,
      aiText:       hasTextAI,
      aiScreenshots: hasVisualAI,
      aiEnabled,
      creditsRemaining,
      justUnlocked,
      appData: {
        platform:         appData.platform,
        title:            appData.title,
        subtitle:         appData.subtitle,
        shortDescription: appData.shortDescription,
        description:      appData.description,
        keywordField:     appData.keywordField,
        developerName:    appData.developerName,
        category:         appData.category,
        rating:           appData.rating,
        ratingsCount:     appData.ratingsCount,
        version:          appData.version,
        lastUpdated:      appData.lastUpdated,
        screenshotCount:  appData.screenshotCount,
        hasVideo:         appData.hasVideo,
        price:            appData.price,
        size:             appData.size,
        contentRating:    appData.contentRating,
        installs:         appData.installs,
        url:              appData.url,
        iconUrl:          appData.iconUrl,
        screenshots:      appData.screenshots,
        whatsNew:         appData.whatsNew,
        promotionalText:  appData.promotionalText,
        featureGraphicUrl: appData.featureGraphicUrl,
      },
    });
  } catch (error) {
    console.error("Audit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Audit failed" },
      { status: 500 },
    );
  }
}
