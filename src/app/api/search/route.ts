import { NextRequest, NextResponse } from "next/server";
import { searchAppStore, searchGooglePlay } from "@/lib/store-scraper";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  const platform = request.nextUrl.searchParams.get("platform") || "both";
  const country = request.nextUrl.searchParams.get("country") || "us";

  if (!query) {
    return NextResponse.json({ error: "Missing search query" }, { status: 400 });
  }

  try {
    const results = [];

    if (platform === "ios" || platform === "both") {
      try {
        const ios = await searchAppStore(query, country);
        results.push(...ios);
      } catch (e) {
        console.error("iOS search error:", e);
      }
    }

    if (platform === "android" || platform === "both") {
      try {
        const android = await searchGooglePlay(query, country);
        results.push(...android);
      } catch (e) {
        console.error("Android search error:", e);
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
