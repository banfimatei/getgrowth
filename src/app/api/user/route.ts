import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data } = await supabaseAdmin
    .from("users")
    .select("id, email, name, audit_credits, stripe_customer_id, created_at")
    .eq("id", userId)
    .single();

  if (!data) {
    return NextResponse.json(
      { id: userId, email: null, audit_credits: 0 },
      { status: 200 }
    );
  }

  // Also fetch their unlocked apps
  const { data: unlocks } = await supabaseAdmin
    .from("ai_unlocks")
    .select("store_id, platform, app_name, app_icon_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Recent purchases
  const { data: purchases } = await supabaseAdmin
    .from("purchases")
    .select("credits, amount_cents, currency, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    ...data,
    unlocks: unlocks ?? [],
    purchases: purchases ?? [],
  });
}
