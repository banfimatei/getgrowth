import { NextRequest, NextResponse } from "next/server";
import { generateVisualConcepts } from "@/lib/ai-analyzer";
import type { AppData } from "@/lib/aso-rules";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appData, section, brief } = body as {
      appData: AppData;
      section: "icon" | "screenshots";
      brief: string;
    };

    if (!appData || !section || !brief) {
      return NextResponse.json(
        { error: "Missing appData, section, or brief" },
        { status: 400 },
      );
    }

    if (section !== "icon" && section !== "screenshots") {
      return NextResponse.json(
        { error: `Invalid section for visual generation: ${section}. Valid: icon, screenshots` },
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

    const concepts = await generateVisualConcepts(appData, section, brief);

    return NextResponse.json({ section, concepts });
  } catch (error) {
    console.error("Visualize error:", error);
    const msg = error instanceof Error ? error.message : "Visual generation failed";
    return NextResponse.json(
      { error: `Visual generation failed: ${msg}` },
      { status: 500 },
    );
  }
}
