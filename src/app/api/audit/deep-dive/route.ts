import { NextRequest, NextResponse } from "next/server";
import { runDeepDive, type DeepDiveSection } from "@/lib/ai-analyzer";
import type { AppData } from "@/lib/aso-rules";

export const maxDuration = 120;

const VALID_SECTIONS: DeepDiveSection[] = [
  "title", "subtitle", "keywords", "shortDescription",
  "description", "screenshots", "icon", "ratings",
  "video", "maintenance", "localization", "cpp",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appData, section } = body as {
      appData: AppData;
      section: DeepDiveSection;
    };

    if (!appData || !section) {
      return NextResponse.json(
        { error: "Missing appData or section" },
        { status: 400 },
      );
    }

    if (!VALID_SECTIONS.includes(section)) {
      return NextResponse.json(
        { error: `Invalid section: ${section}. Valid: ${VALID_SECTIONS.join(", ")}` },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI not configured — GEMINI_API_KEY missing from environment" },
        { status: 503 },
      );
    }

    const result = await runDeepDive(appData, section);

    if (!result) {
      return NextResponse.json(
        { error: `AI analysis for "${section}" returned no result — the Gemini API may have returned an error or timed out. Check Vercel function logs for details.` },
        { status: 502 },
      );
    }

    return NextResponse.json({ section, analysis: result });
  } catch (error) {
    console.error("Deep-dive error:", error);
    const msg = error instanceof Error ? error.message : "Deep-dive failed";
    return NextResponse.json(
      { error: `Deep-dive crashed: ${msg}` },
      { status: 500 },
    );
  }
}
