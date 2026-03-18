import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { supabaseAdmin, CREDIT_PACKS } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://getgrowth.eu";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { priceId } = await request.json();
  if (!priceId) {
    return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
  }

  // Validate price ID and resolve credit amount
  const pack = CREDIT_PACKS[priceId];
  if (!pack) {
    return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
  }

  // Get or create Stripe customer
  const { data: dbUser } = await supabaseAdmin
    .from("users")
    .select("stripe_customer_id, email, name")
    .eq("id", userId)
    .single();

  let customerId = dbUser?.stripe_customer_id;

  if (!customerId) {
    const clerkUser = await currentUser();
    const customer = await stripe.customers.create({
      email: dbUser?.email || clerkUser?.emailAddresses[0]?.emailAddress,
      name:  dbUser?.name  || `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim() || undefined,
      metadata: { clerk_user_id: userId },
    });
    customerId = customer.id;
    await supabaseAdmin
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
  }

  // One-time payment (not subscription)
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/dashboard?purchased=1`,
      cancel_url:  `${APP_URL}/pricing`,
      metadata: {
        clerk_user_id: userId,
        credits:       String(pack.credits),
      },
      allow_promotion_codes: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe/checkout] Stripe error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
