import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/tier-guard";
import { fetchAppStoreData, fetchGooglePlayData } from "@/lib/store-scraper";
import { runAudit, calculateOverallScore } from "@/lib/aso-rules";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Compare is available to all authenticated users
  const tierCheck = await requireAuth();
  if (!tierCheck.allowed) {
    return NextResponse.json(
      { error: tierCheck.reason ?? "Sign in required" },
      { status: 401 }
    );
  }

  const ids       = request.nextUrl.searchParams.getAll("id");
  const platforms = request.nextUrl.searchParams.getAll("platform");
  const country   = request.nextUrl.searchParams.get("country") || "us";

  if (ids.length < 2 || ids.length !== platforms.length) {
    return NextResponse.json({ error: "Provide at least 2 id+platform pairs" }, { status: 400 });
  }

  try {
    const appResults = await Promise.all(
      ids.map(async (id, i) => {
        const platform = platforms[i] as "ios" | "android";
        const appData  = platform === "ios"
          ? await fetchAppStoreData(id, country)
          : await fetchGooglePlayData(id, country);
        const categories   = runAudit(appData);
        const overallScore = calculateOverallScore(categories);
        const categoryScores: Record<string, number> = {};
        for (const cat of categories) categoryScores[cat.id] = cat.score;

        return {
          storeId: id,
          platform,
          title:         appData.title,
          developer:     appData.developerName,
          iconUrl:       appData.iconUrl,
          rating:        appData.rating,
          ratingsCount:  appData.ratingsCount,
          overallScore,
          categoryScores,
          metadata: {
            titleLength:       appData.title?.length ?? 0,
            subtitleLength:    appData.subtitle?.length ?? 0,
            shortDescLength:   appData.shortDescription?.length ?? 0,
            descriptionLength: appData.description?.length ?? 0,
            keywordFieldLength: appData.keywordField?.length ?? 0,
            screenshotCount:   appData.screenshotCount ?? 0,
            hasVideo:          appData.hasVideo ?? false,
            hasRatings:        (appData.ratingsCount ?? 0) > 0,
            price:             appData.price,
          },
        };
      })
    );

    const [primary, ...competitors] = appResults;
    const highlights: string[] = [];

    for (const comp of competitors) {
      const scoreDiff = primary.overallScore - comp.overallScore;
      if (scoreDiff > 0) {
        highlights.push(`Your app scores ${scoreDiff} points higher overall than ${comp.title}.`);
      } else if (scoreDiff < 0) {
        highlights.push(`${comp.title} scores ${Math.abs(scoreDiff)} points higher overall — see category gaps below.`);
      }
      for (const [catId, score] of Object.entries(primary.categoryScores)) {
        const compScore = comp.categoryScores[catId];
        if (compScore !== undefined && Math.abs(score - compScore) >= 15) {
          highlights.push(`${catId} — your app is ${score > compScore ? "stronger" : "weaker"} (${score} vs ${compScore}).`);
        }
      }
    }

    return NextResponse.json({ apps: appResults, highlights });
  } catch (error) {
    console.error("Compare error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Compare failed" }, { status: 500 });
  }
}
