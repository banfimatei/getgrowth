import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

async function enrichUnlockIcons(unlocks: { store_id: string; platform: string; app_name: string | null; app_icon_url: string | null; created_at: string }[]) {
  const needsEnrichment = unlocks.filter(u => !u.app_icon_url || !u.app_name);
  if (needsEnrichment.length === 0) return unlocks;

  const enriched = await Promise.all(unlocks.map(async (u) => {
    if (u.app_icon_url && u.app_name) return u;
    try {
      if (u.platform === "ios") {
        const res = await fetch(`https://itunes.apple.com/lookup?id=${u.store_id}&country=us`, { next: { revalidate: 86400 } });
        if (res.ok) {
          const data = await res.json();
          const app = data.results?.[0];
          if (app) {
            const icon = app.artworkUrl100 || app.artworkUrl512 || null;
            const name = app.trackName || null;
            if (icon || name) {
              await supabaseAdmin.from("ai_unlocks").update({
                ...(icon && !u.app_icon_url ? { app_icon_url: icon } : {}),
                ...(name && !u.app_name ? { app_name: name } : {}),
              }).eq("store_id", u.store_id).eq("platform", u.platform);
            }
            return { ...u, app_icon_url: u.app_icon_url || icon, app_name: u.app_name || name };
          }
        }
      }
    } catch { /* non-critical */ }
    return u;
  }));
  return enriched;
}

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

  const { data: rawUnlocks } = await supabaseAdmin
    .from("ai_unlocks")
    .select("store_id, platform, app_name, app_icon_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const unlocks = await enrichUnlockIcons(rawUnlocks ?? []);

  const { data: purchases } = await supabaseAdmin
    .from("purchases")
    .select("credits, amount_cents, currency, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    ...data,
    unlocks,
    purchases: purchases ?? [],
  });
}
