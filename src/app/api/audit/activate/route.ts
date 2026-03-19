import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { addCredits, consumeCredit } from "@/lib/tier-guard";

export const maxDuration = 30;

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY ?? "").trim());

const CORE_DEEP_DIVE_SECTIONS = ["title", "keywords", "description", "screenshots", "icon"];

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer"],
    });

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
    }

    const email = session.customer_details?.email;
    if (!email) {
      return NextResponse.json({ error: "No email found on checkout session" }, { status: 400 });
    }

    const appId = session.metadata?.appId;
    const platform = session.metadata?.platform || "ios";
    const country = session.metadata?.country || "us";
    const credits = parseInt(session.metadata?.credits ?? "1", 10);
    const appName = session.metadata?.appName;
    const appIconUrl = session.metadata?.appIconUrl;

    // Idempotency: skip if already processed
    const { count: purchaseCount } = await supabaseAdmin
      .from("purchases")
      .select("*", { count: "exact", head: true })
      .eq("stripe_session_id", sessionId);

    if ((purchaseCount ?? 0) > 0) {
      const { data: purchase } = await supabaseAdmin
        .from("purchases")
        .select("user_id")
        .eq("stripe_session_id", sessionId)
        .single();

      if (purchase?.user_id) {
        const clerk = await clerkClient();
        const token = await clerk.signInTokens.createSignInToken({
          userId: purchase.user_id,
          expiresInSeconds: 300,
        });

        return NextResponse.json({
          signInToken: token.token,
          userId: purchase.user_id,
          appId,
          platform,
          country,
          deepDiveSections: CORE_DEEP_DIVE_SECTIONS,
          alreadyProcessed: true,
        });
      }
    }

    // Find or create Clerk user
    const clerk = await clerkClient();
    let clerkUserId: string;

    if (session.metadata?.clerk_user_id) {
      clerkUserId = session.metadata.clerk_user_id;
    } else {
      const existingUsers = await clerk.users.getUserList({
        emailAddress: [email],
        limit: 1,
      });

      if (existingUsers.data.length > 0) {
        clerkUserId = existingUsers.data[0].id;
      } else {
        const newUser = await clerk.users.createUser({
          emailAddress: [email],
          skipPasswordRequirement: true,
        });
        clerkUserId = newUser.id;
      }
    }

    // Ensure Supabase user row
    await supabaseAdmin.from("users").upsert(
      { id: clerkUserId, email, updated_at: new Date().toISOString() },
      { onConflict: "id", ignoreDuplicates: false }
    );

    // Add credits from purchase
    await addCredits(clerkUserId, credits);

    // Immediately consume 1 credit to unlock the purchased app
    if (appId) {
      await consumeCredit(clerkUserId, appId, platform, appName, appIconUrl);
    }

    // Log purchase
    await supabaseAdmin.from("purchases").insert({
      user_id: clerkUserId,
      stripe_session_id: sessionId,
      credits,
      amount_cents: session.amount_total ?? 0,
      currency: session.currency ?? "eur",
    });

    // Link Stripe customer to user
    const stripeCustomerId = typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

    if (stripeCustomerId) {
      await supabaseAdmin
        .from("users")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", clerkUserId);
    }

    // Generate sign-in token
    const signInToken = await clerk.signInTokens.createSignInToken({
      userId: clerkUserId,
      expiresInSeconds: 300,
    });

    const deepDiveSections = [...CORE_DEEP_DIVE_SECTIONS];

    console.log(`[activate] ${email}: +${credits} credits, consumed 1 for ${appId}/${platform}`);

    return NextResponse.json({
      signInToken: signInToken.token,
      userId: clerkUserId,
      appId,
      platform,
      country,
      deepDiveSections,
      alreadyProcessed: false,
    });
  } catch (error) {
    console.error("[activate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Activation failed" },
      { status: 500 }
    );
  }
}
