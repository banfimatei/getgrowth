import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin, creditsForPriceId } from "@/lib/supabase";
import { addCredits, createAiUnlock } from "@/lib/tier-guard";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body      = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Idempotency: skip if already processed by /api/audit/activate
      const { count: existingPurchase } = await supabaseAdmin
        .from("purchases")
        .select("*", { count: "exact", head: true })
        .eq("stripe_session_id", session.id);

      if ((existingPurchase ?? 0) > 0) {
        console.log(`[webhook] Session ${session.id} already processed — skipping`);
        return NextResponse.json({ received: true });
      }

      // Resolve user: prefer metadata clerk_user_id, then lookup by email
      let clerkUserId = session.metadata?.clerk_user_id;

      if (!clerkUserId) {
        const email = session.customer_details?.email;
        if (email) {
          const { data: dbUser } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("email", email)
            .single();
          clerkUserId = dbUser?.id;
        }
      }

      if (!clerkUserId) {
        console.warn(`[webhook] No user found for session ${session.id} — will be reconciled on next login`);
        return NextResponse.json({ received: true });
      }

      let credits = parseInt(session.metadata?.credits ?? "0", 10);
      if (!credits) {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
        const priceId = lineItems.data[0]?.price?.id;
        if (priceId) credits = creditsForPriceId(priceId) ?? 0;
      }

      if (credits > 0) {
        await addCredits(clerkUserId, credits);

        // If this was a guest checkout with app metadata, create the unlock
        const appId = session.metadata?.appId;
        const platform = session.metadata?.platform;
        if (appId && platform) {
          await createAiUnlock(clerkUserId, appId, platform);
        }

        await supabaseAdmin.from("purchases").insert({
          user_id:           clerkUserId,
          stripe_session_id: session.id,
          credits,
          amount_cents:      session.amount_total ?? 0,
          currency:          session.currency ?? "eur",
        });

        console.log(`[webhook] Added ${credits} credits to user ${clerkUserId} (session ${session.id})`);
      }
    }
  } catch (err) {
    console.error("[webhook] Stripe handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
