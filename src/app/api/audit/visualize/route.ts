import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateVisualConcepts } from "@/lib/ai-analyzer";
import { hasAiUnlock } from "@/lib/tier-guard";
import type { AppData } from "@/lib/aso-rules";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in required", needsCredits: true },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { appData, section, brief, storeId } = body as {
      appData: AppData;
      section: "icon" | "screenshots";
      brief: string;
      storeId?: string;
    };

    if (!appData || !section || !brief) {
      return NextResponse.json({ error: "Missing appData, section, or brief" }, { status: 400 });
    }
    if (section !== "icon" && section !== "screenshots") {
      return NextResponse.json({ error: `Invalid section: ${section}` }, { status: 400 });
    }

    const resolvedStoreId = storeId || appData.url || appData.title;
    const unlocked = await hasAiUnlock(userId, resolvedStoreId, appData.platform);
    if (!unlocked) {
      return NextResponse.json(
        { error: "Purchase a Full Audit to unlock visual generation for this app.", needsCredits: true },
        { status: 403 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "AI not configured — GEMINI_API_KEY missing" }, { status: 503 });
    }

    const concepts = await generateVisualConcepts(appData, section, brief);
    return NextResponse.json({ section, concepts });
  } catch (error) {
    console.error("Visualize error:", error);
    return NextResponse.json(
      { error: `Visual generation failed: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 500 }
    );
  }
}
