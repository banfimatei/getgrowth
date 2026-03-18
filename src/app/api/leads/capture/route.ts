import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendLeadWelcome } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://getgrowth.eu";

/**
 * POST /api/leads/capture
 * Captures a free-audit visitor's email and saves their audit snapshot.
 * No authentication required — works for anonymous visitors.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { email, store_id, platform, app_name, app_icon_url, score, category_scores } = body ?? {};

  if (!email || !store_id || !platform || !app_name || score == null) {
    return NextResponse.json(
      { error: "email, store_id, platform, app_name, and score are required" },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Upsert lead — if this email already has a lead for this app, update the score
  const { data: lead, error } = await supabaseAdmin
    .from("audit_leads")
    .upsert(
      {
        email: email.toLowerCase().trim(),
        store_id,
        platform,
        app_name,
        app_icon_url: app_icon_url ?? null,
        score,
        category_scores: category_scores ?? {},
        last_checked_at: new Date().toISOString(),
      },
      { onConflict: "email,store_id,platform" }
    )
    .select("id, token")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const savedAuditUrl = `${APP_URL}/audit/saved/${lead.token}`;

  // Send welcome email (fire-and-forget — don't fail if Resend not configured)
  sendLeadWelcome({ to: email.toLowerCase().trim(), appName: app_name, score, savedAuditUrl }).catch(
    (e) => console.error("[leads/capture] Welcome email failed:", e)
  );

  return NextResponse.json({ token: lead.token, savedAuditUrl });
}
