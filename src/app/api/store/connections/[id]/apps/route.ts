import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptCredentials } from "@/lib/crypto";
import { listAppleApps, type AppleCredentials } from "@/lib/apple-connect";

export const maxDuration = 30;

/**
 * GET /api/store/connections/[id]/apps
 * Lists apps available in the connected store account.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { id } = await params;

  const { data: conn } = await supabaseAdmin
    .from("store_connections")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  const credentials = decryptCredentials(
    conn.credentials_encrypted,
    conn.credentials_iv,
    conn.credentials_tag
  );

  if (conn.platform === "ios") {
    const apps = await listAppleApps(credentials as unknown as AppleCredentials);
    // Also fetch which ones are already connected
    const { data: existing } = await supabaseAdmin
      .from("connected_apps")
      .select("store_app_id")
      .eq("store_connection_id", id);
    const existingIds = new Set((existing ?? []).map((e) => e.store_app_id));
    return NextResponse.json({
      apps: apps.map((a) => ({ ...a, alreadyConnected: existingIds.has(a.id) })),
    });
  } else {
    // For Android, the service account doesn't enumerate apps — user specifies package names
    const { data: existing } = await supabaseAdmin
      .from("connected_apps")
      .select("store_app_id, name")
      .eq("store_connection_id", id);
    return NextResponse.json({ apps: existing ?? [], manualEntry: true });
  }
}

/**
 * POST /api/store/connections/[id]/apps
 * Enable tracking for one or more apps.
 * Body: { apps: Array<{ storeAppId, name, bundleId?, packageName? }> }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { id } = await params;

  const { data: conn } = await supabaseAdmin
    .from("store_connections")
    .select("id, user_id, platform")
    .eq("id", id)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  const body = await request.json();
  const appsToAdd = body.apps as Array<{
    storeAppId: string;
    name: string;
    bundleId?: string;
  }>;

  if (!appsToAdd?.length) {
    return NextResponse.json({ error: "No apps provided" }, { status: 400 });
  }

  // For Android, validate each package name
  if (conn.platform === "android") {
    const { data: connData } = await supabaseAdmin
      .from("store_connections")
      .select("credentials_encrypted, credentials_iv, credentials_tag")
      .eq("id", id)
      .single();
    if (connData) {
      const creds = decryptCredentials(
        connData.credentials_encrypted,
        connData.credentials_iv,
        connData.credentials_tag
      );
      const { validateGooglePackage } = await import("@/lib/google-play-api");
      const sa = (creds as Record<string, unknown>).serviceAccountJson as Parameters<typeof validateGooglePackage>[0];
      for (const app of appsToAdd) {
        try {
          await validateGooglePackage(sa, app.storeAppId);
        } catch (err) {
          return NextResponse.json(
            { error: `Package '${app.storeAppId}': ${err instanceof Error ? err.message : "validation failed"}` },
            { status: 422 }
          );
        }
      }
    }
  }

  const rows = appsToAdd.map((a) => ({
    user_id: userId,
    store_connection_id: id,
    store_app_id: a.storeAppId,
    platform: conn.platform,
    name: a.name,
    bundle_id: a.bundleId ?? null,
    sync_enabled: true,
  }));

  const { data: inserted, error } = await supabaseAdmin
    .from("connected_apps")
    .upsert(rows, { onConflict: "store_connection_id,store_app_id" })
    .select("id, store_app_id, name, platform, sync_enabled");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ apps: inserted });
}
