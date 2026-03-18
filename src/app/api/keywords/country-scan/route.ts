import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { hasAiUnlock } from "@/lib/tier-guard";
import { scanCountries } from "@/lib/keyword-intelligence";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("keyword");
  const appId = request.nextUrl.searchParams.get("appId");
  const platform = request.nextUrl.searchParams.get("platform");
  const trackIdStr = request.nextUrl.searchParams.get("trackId");

  if (!keyword) {
    return NextResponse.json({ error: "Missing keyword parameter" }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId || !appId || !platform) {
    return NextResponse.json({ error: "Authentication and app context required", needsCredits: true }, { status: 403 });
  }

  const unlocked = await hasAiUnlock(userId, appId, platform);
  if (!unlocked) {
    return NextResponse.json({ error: "AI unlock required for country scanning", needsCredits: true }, { status: 403 });
  }

  try {
    const trackId = trackIdStr ? parseInt(trackIdStr, 10) : undefined;
    const results = await scanCountries(keyword, trackId, 5);

    return NextResponse.json({
      keyword,
      totalCountries: results.length,
      results,
    });
  } catch (error) {
    console.error("Country scan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Country scan failed" },
      { status: 500 },
    );
  }
}
