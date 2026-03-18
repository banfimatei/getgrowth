import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const svixId        = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await request.text();

  let event: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = event;

  if (type === "user.created" || type === "user.updated") {
    const id    = data.id as string;
    const email = (data.email_addresses as Array<{ email_address: string }>)?.[0]?.email_address ?? "";
    const name  = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

    await supabaseAdmin.from("users").upsert(
      { id, email, name, updated_at: new Date().toISOString() },
      { onConflict: "id", ignoreDuplicates: false }
    );

    // On new user: find any unclaimed audit leads with this email and auto-claim them
    if (type === "user.created" && email) {
      const { data: leads } = await supabaseAdmin
        .from("audit_leads")
        .select("id, store_id, platform, app_name, app_icon_url")
        .eq("email", email.toLowerCase())
        .is("claimed_user_id", null);

      if (leads?.length) {
        for (const lead of leads) {
          try {
            // Auto-save the app to saved_apps
            const { data: savedApp } = await supabaseAdmin
              .from("saved_apps")
              .upsert(
                {
                  user_id: id,
                  store_id: lead.store_id,
                  platform: lead.platform,
                  name: lead.app_name,
                  icon_url: lead.app_icon_url ?? null,
                },
                { onConflict: "user_id,store_id,platform" }
              )
              .select("id")
              .single();

            // Mark lead as claimed
            await supabaseAdmin
              .from("audit_leads")
              .update({ claimed_user_id: id })
              .eq("id", lead.id);

            console.log(`[clerk/webhook] Claimed lead for ${email}, saved_app: ${savedApp?.id}`);
          } catch (e) {
            console.error(`[clerk/webhook] Failed to claim lead for ${email}:`, e);
          }
        }
      }
    }
  }

  if (type === "user.deleted") {
    const id = data.id as string;
    await supabaseAdmin.from("users").delete().eq("id", id);
  }

  return NextResponse.json({ received: true });
}
