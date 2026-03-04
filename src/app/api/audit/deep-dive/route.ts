import { NextRequest, NextResponse } from "next/server";
import { runDeepDive, type DeepDiveSection } from "@/lib/ai-analyzer";
import type { AppData } from "@/lib/aso-rules";

export const maxDuration = 120;

const VALID_SECTIONS: DeepDiveSection[] = [
  "title", "subtitle", "keywords", "shortDescription",
  "description", "screenshots", "icon", "ratings",
  "video", "maintenance", "localization",
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

    const result = await runDeepDive(appData, section);

    if (!result) {
      return NextResponse.json(
        { error: "AI analysis failed — check server logs" },
        { status: 502 },
      );
    }

    return NextResponse.json({ section, analysis: result });
  } catch (error) {
    console.error("Deep-dive error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Deep-dive failed" },
      { status: 500 },
    );
  }
}
