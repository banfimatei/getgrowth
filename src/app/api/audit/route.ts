import { NextRequest, NextResponse } from "next/server";
import { fetchAppStoreData, fetchGooglePlayData } from "@/lib/store-scraper";
import { runAudit, calculateOverallScore } from "@/lib/aso-rules";
import { generateActionPlan } from "@/lib/action-plan";

export async function GET(request: NextRequest) {
  const appId = request.nextUrl.searchParams.get("id");
  const platform = request.nextUrl.searchParams.get("platform") as "ios" | "android";
  const country = request.nextUrl.searchParams.get("country") || "us";

  if (!appId || !platform) {
    return NextResponse.json({ error: "Missing id or platform parameter" }, { status: 400 });
  }

  try {
    const appData = platform === "ios"
      ? await fetchAppStoreData(appId, country)
      : await fetchGooglePlayData(appId, country);

    const categories = runAudit(appData);
    const overallScore = calculateOverallScore(categories);
    const actionPlan = generateActionPlan(appData, categories, overallScore);

    return NextResponse.json({
      app: {
        title: appData.title,
        developer: appData.developerName,
        platform: appData.platform,
        rating: appData.rating,
        ratingsCount: appData.ratingsCount,
        icon: appData.iconUrl,
        url: appData.url,
      },
      overallScore,
      categories,
      actionPlan,
    });
  } catch (error) {
    console.error("Audit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Audit failed" },
      { status: 500 }
    );
  }
}
