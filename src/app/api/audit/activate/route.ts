import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { addCredits, createAiUnlock } from "@/lib/tier-guard";

export const maxDuration = 30;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const CORE_DEEP_DIVE_SECTIONS = ["title", "keywords", "description", "screenshots", "icon"];

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    // 1. Retrieve and verify Stripe session
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

    // 2. Check if already processed (idempotent)
    const { count: purchaseCount } = await supabaseAdmin
      .from("purchases")
      .select("*", { count: "exact", head: true })
      .eq("stripe_session_id", sessionId);

    if ((purchaseCount ?? 0) > 0) {
      // Already processed — find the user and return sign-in token
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

    // 3. Find or create Clerk user
    const clerk = await clerkClient();
    let clerkUserId: string;

    // Check if metadata has a clerk_user_id (signed-in user went through guest checkout)
    if (session.metadata?.clerk_user_id) {
      clerkUserId = session.metadata.clerk_user_id;
    } else {
      // Search by email
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

    // 4. Ensure Supabase user row
    await supabaseAdmin.from("users").upsert(
      {
        id: clerkUserId,
        email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id", ignoreDuplicates: false }
    );

    // 5. Add credits + create AI unlock for this specific app
    await addCredits(clerkUserId, credits);

    if (appId) {
      await createAiUnlock(clerkUserId, appId, platform);
    }

    // 6. Log purchase
    await supabaseAdmin.from("purchases").insert({
      user_id: clerkUserId,
      stripe_session_id: sessionId,
      credits,
      amount_cents: session.amount_total ?? 0,
      currency: session.currency ?? "eur",
    });

    // 7. Link Stripe customer to user
    const stripeCustomerId = typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

    if (stripeCustomerId) {
      await supabaseAdmin
        .from("users")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", clerkUserId);
    }

    // 8. Generate sign-in token
    const signInToken = await clerk.signInTokens.createSignInToken({
      userId: clerkUserId,
      expiresInSeconds: 300,
    });

    // 9. Determine deep-dive sections (core 5 always included)
    const deepDiveSections = [...CORE_DEEP_DIVE_SECTIONS];

    console.log(`[activate] Created account for ${email}, unlocked ${appId}/${platform}, ${credits} credits`);

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
