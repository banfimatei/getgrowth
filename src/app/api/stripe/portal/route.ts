import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://getgrowth.eu";

// Opens the Stripe Customer Portal for receipts and payment history
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: dbUser } = await supabaseAdmin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (!dbUser?.stripe_customer_id) {
    return NextResponse.json({ error: "No purchase history found" }, { status: 404 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer:   dbUser.stripe_customer_id,
    return_url: `${APP_URL}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
