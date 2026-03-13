import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchAppStoreData, fetchGooglePlayData } from "@/lib/store-scraper";
import { runAudit, calculateOverallScore } from "@/lib/aso-rules";
import { generateActionPlan } from "@/lib/action-plan";
import { analyzeWithAI } from "@/lib/ai-analyzer";
import { getDbUser, hasAiUnlock, consumeCredit } from "@/lib/tier-guard";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const appId    = request.nextUrl.searchParams.get("id");
  const platform = request.nextUrl.searchParams.get("platform") as "ios" | "android";
  const country  = request.nextUrl.searchParams.get("country") || "us";

  if (!appId || !platform) {
    return NextResponse.json({ error: "Missing id or platform parameter" }, { status: 400 });
  }

  // Determine AI entitlement
  const { userId } = await auth();
  let aiEnabled = false;
  let creditsRemaining = 0;
  let justUnlocked = false;

  if (userId) {
    const dbUser = await getDbUser(userId);
    creditsRemaining = dbUser?.audit_credits ?? 0;

    // Already unlocked for this app? AI is free.
    const alreadyUnlocked = await hasAiUnlock(userId, appId, platform);
    if (alreadyUnlocked) {
      aiEnabled = true;
    } else if (creditsRemaining > 0) {
      // Has credits — consume one and unlock
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

    const [categories, aiAnalysis] = await Promise.all([
      Promise.resolve(runAudit(appData)),
      aiEnabled ? analyzeWithAI(appData) : Promise.resolve(null),
    ]);

    const overallScore = calculateOverallScore(categories);
    const actionPlan   = generateActionPlan(appData, categories, overallScore, aiAnalysis ?? undefined);

    const hasTextAI   = !!(aiAnalysis?.title?.suggestions?.length);
    const hasVisualAI = !!(aiAnalysis?.screenshots?.perScreenshot?.length);

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
      { status: 500 }
    );
  }
}
