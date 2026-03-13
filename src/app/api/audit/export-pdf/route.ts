import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { hasAiUnlock } from "@/lib/tier-guard";
import type { AuditPdfData } from "@/lib/pdf-template";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in required", needsCredits: true },
      { status: 401 }
    );
  }

  const { auditData, storeId, platform } = await request.json() as {
    auditData: AuditPdfData;
    storeId?: string;
    platform?: string;
  };

  if (!auditData) {
    return NextResponse.json({ error: "Missing auditData" }, { status: 400 });
  }

  // PDF export is included with the AI audit purchase
  if (storeId && platform) {
    const unlocked = await hasAiUnlock(userId, storeId, platform);
    if (!unlocked) {
      return NextResponse.json(
        { error: "Purchase a Full Audit to export PDF for this app.", needsCredits: true },
        { status: 403 }
      );
    }
  }

  try {
    const { renderToBuffer }   = await import("@react-pdf/renderer");
    const { AuditPdfDocument } = await import("@/lib/pdf-template");

    const pdfNodeBuffer = await renderToBuffer(AuditPdfDocument({ auditData }));
    const pdfBuffer = new Uint8Array(pdfNodeBuffer);

    const filename = `aso-audit-${auditData.appTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`;
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json(
      { error: `PDF export failed: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 500 }
    );
  }
}
