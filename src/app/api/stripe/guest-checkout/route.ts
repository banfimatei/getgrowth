import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { CREDIT_PACKS } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://getgrowth.eu";

const STARTER_PRICE_ID = process.env.STRIPE_PRICE_STARTER ?? "";

export async function POST(request: NextRequest) {
  const { appId, platform, country, priceId } = await request.json();

  if (!appId || !platform) {
    return NextResponse.json({ error: "Missing appId or platform" }, { status: 400 });
  }

  const resolvedPriceId = priceId || STARTER_PRICE_ID;
  const pack = CREDIT_PACKS[resolvedPriceId];
  if (!pack) {
    return NextResponse.json({ error: "Invalid price configuration" }, { status: 400 });
  }

  // If user is already signed in, redirect to the normal checkout
  const { userId } = await auth();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [{ price: resolvedPriceId, quantity: 1 }],
    success_url: `${APP_URL}/audit?session_id={CHECKOUT_SESSION_ID}&id=${encodeURIComponent(appId)}&platform=${platform}&country=${country || "us"}`,
    cancel_url: `${APP_URL}/audit?id=${encodeURIComponent(appId)}&platform=${platform}&country=${country || "us"}`,
    metadata: {
      appId,
      platform,
      country: country || "us",
      credits: String(pack.credits),
      ...(userId ? { clerk_user_id: userId } : {}),
    },
    allow_promotion_codes: true,
  };

  if (userId) {
    sessionParams.metadata!.clerk_user_id = userId;
  } else {
    // Guest checkout — Stripe collects email, creates a Customer object
    sessionParams.customer_creation = "always";
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return NextResponse.json({ url: session.url });
}
