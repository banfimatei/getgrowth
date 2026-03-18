import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { CREDIT_PACKS } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://getgrowth.eu";

const STARTER_PRICE_ID = process.env.STRIPE_PRICE_STARTER ?? "";

export async function POST(request: NextRequest) {
  const { appId, platform, country, priceId } = await request.json();

  const resolvedPriceId = priceId || STARTER_PRICE_ID;
  if (!resolvedPriceId) {
    return NextResponse.json({ error: "STRIPE_PRICE_STARTER is not configured" }, { status: 500 });
  }
  const pack = CREDIT_PACKS[resolvedPriceId];
  if (!pack) {
    return NextResponse.json({ error: "Invalid price configuration — price ID not found in CREDIT_PACKS" }, { status: 400 });
  }

  const { userId } = await auth();

  // Success/cancel URLs differ depending on whether we have an audit context
  const hasAppContext = !!(appId && platform);
  const successUrl = hasAppContext
    ? `${APP_URL}/audit?session_id={CHECKOUT_SESSION_ID}&id=${encodeURIComponent(appId)}&platform=${platform}&country=${country || "us"}`
    : `${APP_URL}/pricing?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = hasAppContext
    ? `${APP_URL}/audit?id=${encodeURIComponent(appId)}&platform=${platform}&country=${country || "us"}`
    : `${APP_URL}/pricing`;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [{ price: resolvedPriceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      ...(appId ? { appId } : {}),
      ...(platform ? { platform } : {}),
      country: country || "us",
      credits: String(pack.credits),
      ...(userId ? { clerk_user_id: userId } : {}),
    },
    allow_promotion_codes: true,
  };

  if (!userId) {
    // Guest checkout — Stripe collects the email and creates a Customer record
    sessionParams.customer_creation = "always";
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(sessionParams);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe/guest-checkout] Stripe error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
