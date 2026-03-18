/**
 * POST /api/stripe/reconcile
 * Called by the dashboard for authenticated users who have 0 credits.
 * Checks Stripe for any completed checkout sessions tied to this email
 * that haven't been credited yet, and applies them.
 */
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { supabaseAdmin, creditsForPriceId } from "@/lib/supabase";
import { addCredits, createAiUnlock } from "@/lib/tier-guard";

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY ?? "").trim());

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress;
  if (!email) {
    return NextResponse.json({ error: "No email on account" }, { status: 400 });
  }

  // Ensure user row exists in DB
  await supabaseAdmin.from("users").upsert(
    { id: userId, email, updated_at: new Date().toISOString() },
    { onConflict: "id", ignoreDuplicates: false }
  );

  // Find all completed Stripe sessions for this email (last 100)
  const sessions = await stripe.checkout.sessions.list({
    customer_details: { email },
    status: "complete",
    limit: 100,
  });

  let totalCredited = 0;

  for (const session of sessions.data) {
    if (session.payment_status !== "paid") continue;

    // Skip already processed sessions
    const { count } = await supabaseAdmin
      .from("purchases")
      .select("*", { count: "exact", head: true })
      .eq("stripe_session_id", session.id);

    if ((count ?? 0) > 0) continue;

    // Resolve credit count
    let credits = parseInt(session.metadata?.credits ?? "0", 10);
    if (!credits) {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
      const priceId = lineItems.data[0]?.price?.id;
      if (priceId) credits = creditsForPriceId(priceId) ?? 0;
    }

    if (credits <= 0) continue;

    await addCredits(userId, credits);

    const appId = session.metadata?.appId;
    const platform = session.metadata?.platform;
    if (appId && platform) {
      await createAiUnlock(userId, appId, platform);
    }

    await supabaseAdmin.from("purchases").insert({
      user_id:           userId,
      stripe_session_id: session.id,
      credits,
      amount_cents:      session.amount_total ?? 0,
      currency:          session.currency ?? "eur",
    });

    totalCredited += credits;
    console.log(`[reconcile] Applied ${credits} credits to ${userId} from session ${session.id}`);
  }

  return NextResponse.json({ credited: totalCredited });
}
