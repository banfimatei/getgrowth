import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin, DbUser } from "./supabase";

// ---------------------------------------------------------------------------
// Get the authenticated user's DB row
// ---------------------------------------------------------------------------

export async function getDbUser(clerkUserId: string): Promise<DbUser | null> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", clerkUserId)
    .single();
  return data ?? null;
}

// ---------------------------------------------------------------------------
// Require authentication (returns userId or rejects)
// ---------------------------------------------------------------------------

export async function requireAuth(): Promise<{
  allowed: boolean;
  userId: string | null;
  user: DbUser | null;
  reason?: string;
}> {
  const { userId } = await auth();
  if (!userId) {
    return { allowed: false, userId: null, user: null, reason: "Sign in required" };
  }
  const user = await getDbUser(userId);
  return { allowed: true, userId, user };
}

// ---------------------------------------------------------------------------
// Check if user has AI unlock for a specific app
// ---------------------------------------------------------------------------

export async function hasAiUnlock(
  userId: string,
  storeId: string,
  platform: string
): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from("ai_unlocks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("store_id", storeId)
    .eq("platform", platform);
  return (count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Create an AI unlock (when a credit is consumed)
// ---------------------------------------------------------------------------

export async function createAiUnlock(
  userId: string,
  storeId: string,
  platform: string
): Promise<void> {
  await supabaseAdmin
    .from("ai_unlocks")
    .upsert(
      { user_id: userId, store_id: storeId, platform },
      { onConflict: "user_id,store_id,platform" }
    );
}

// ---------------------------------------------------------------------------
// Consume 1 credit + create unlock. Returns false if insufficient credits.
// ---------------------------------------------------------------------------

export async function consumeCredit(
  userId: string,
  storeId: string,
  platform: string
): Promise<boolean> {
  // Check current credits
  const user = await getDbUser(userId);
  if (!user || user.audit_credits < 1) return false;

  // Decrement atomically
  const { error } = await supabaseAdmin.rpc("decrement_credit", { uid: userId });
  if (error) {
    console.error("consumeCredit RPC error:", error);
    // Fallback: manual decrement
    const { error: updateErr } = await supabaseAdmin
      .from("users")
      .update({ audit_credits: Math.max(0, user.audit_credits - 1) })
      .eq("id", userId)
      .gte("audit_credits", 1);
    if (updateErr) return false;
  }

  await createAiUnlock(userId, storeId, platform);
  return true;
}

// ---------------------------------------------------------------------------
// Add credits to a user (after purchase)
// ---------------------------------------------------------------------------

export async function addCredits(userId: string, credits: number): Promise<void> {
  const user = await getDbUser(userId);
  if (!user) return;
  await supabaseAdmin
    .from("users")
    .update({
      audit_credits: user.audit_credits + credits,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}
