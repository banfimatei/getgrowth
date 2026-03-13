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
  }

  if (type === "user.deleted") {
    const id = data.id as string;
    await supabaseAdmin.from("users").delete().eq("id", id);
  }

  return NextResponse.json({ received: true });
}
