import { NextResponse } from "next/server";
import Stripe from "stripe";
import { CREDIT_PACKS } from "@/lib/supabase";

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY;
  const starterPrice = process.env.STRIPE_PRICE_STARTER;
  const nextPublicStarter = process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER;

  const diagnosis: Record<string, unknown> = {
    hasSecretKey: !!key,
    secretKeyPrefix: key ? key.slice(0, 10) + "..." : null,
    stripeMode: key?.startsWith("sk_live_") ? "live" : key?.startsWith("sk_test_") ? "test" : "unknown",
    starterPriceEnv: starterPrice ?? null,
    nextPublicStarterEnv: nextPublicStarter ?? null,
    creditPackKeys: Object.keys(CREDIT_PACKS),
    creditPackHasStarter: !!(starterPrice && CREDIT_PACKS[starterPrice]),
  };

  if (!key) {
    return NextResponse.json({ ...diagnosis, error: "STRIPE_SECRET_KEY is not set" }, { status: 500 });
  }

  try {
    const stripe = new Stripe(key);
    const price = await stripe.prices.retrieve(starterPrice ?? "");
    diagnosis.stripeApiOk = true;
    diagnosis.priceFound = true;
    diagnosis.priceActive = price.active;
    diagnosis.priceCurrency = price.currency;
    diagnosis.priceUnit = price.unit_amount;
  } catch (err) {
    diagnosis.stripeApiOk = false;
    diagnosis.stripeError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(diagnosis);
}
