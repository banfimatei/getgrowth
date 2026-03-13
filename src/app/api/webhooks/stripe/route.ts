import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin, creditsForPriceId } from "@/lib/supabase";
import { addCredits } from "@/lib/tier-guard";

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
      const clerkUserId = session.metadata?.clerk_user_id;

      if (clerkUserId) {
        let credits = parseInt(session.metadata?.credits ?? "0", 10);

        if (!credits) {
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
          const priceId = lineItems.data[0]?.price?.id;
          if (priceId) credits = creditsForPriceId(priceId) ?? 0;
        }

        if (credits > 0) {
          await addCredits(clerkUserId, credits);

          await supabaseAdmin.from("purchases").insert({
            user_id:           clerkUserId,
            stripe_session_id: session.id,
            credits,
            amount_cents:      session.amount_total ?? 0,
            currency:          session.currency ?? "eur",
          });

          console.log(`Added ${credits} credits to user ${clerkUserId} (session ${session.id})`);
        }
      }
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
