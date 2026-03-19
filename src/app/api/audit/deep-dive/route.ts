import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runDeepDive, type DeepDiveSection } from "@/lib/ai-analyzer";
import { hasAiUnlock } from "@/lib/tier-guard";
import type { AppData } from "@/lib/aso-rules";

export const maxDuration = 120;

const VALID_SECTIONS: DeepDiveSection[] = [
  "title", "subtitle", "keywords", "shortDescription",
  "description", "screenshots", "icon", "ratings",
  "video", "maintenance", "localization", "cpp",
];

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    // #region agent log
    fetch('http://127.0.0.1:7545/ingest/dd4ba4f6-7884-4467-a639-03d0e318b30b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cfcd9d'},body:JSON.stringify({sessionId:'cfcd9d',location:'deep-dive/route.ts:auth',message:'deep-dive auth check',data:{userId:userId||null},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in required", needsCredits: true },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { appData, section, storeId } = body as {
      appData: AppData;
      section: DeepDiveSection;
      storeId?: string;
    };

    if (!appData || !section) {
      return NextResponse.json({ error: "Missing appData or section" }, { status: 400 });
    }
    if (!VALID_SECTIONS.includes(section)) {
      return NextResponse.json(
        { error: `Invalid section: ${section}. Valid: ${VALID_SECTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Check AI unlock for this app
    const resolvedStoreId = storeId || appData.url || appData.title;
    const unlocked = await hasAiUnlock(userId, resolvedStoreId, appData.platform);
    if (!unlocked) {
      return NextResponse.json(
        { error: "Purchase a Full Audit to unlock deep AI analysis for this app.", needsCredits: true },
        { status: 403 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "AI not configured — GEMINI_API_KEY missing" }, { status: 503 });
    }

    const result = await runDeepDive(appData, section);
    if (!result) {
      return NextResponse.json(
        { error: `AI analysis for "${section}" returned no result — check logs` },
        { status: 502 }
      );
    }

    return NextResponse.json({ section, analysis: result });
  } catch (error) {
    console.error("Deep-dive error:", error);
    return NextResponse.json(
      { error: `Deep-dive crashed: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 500 }
    );
  }
}
