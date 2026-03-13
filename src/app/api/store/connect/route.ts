import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { encryptCredentials } from "@/lib/crypto";
import { listAppleApps, generateAppleJwt, type AppleCredentials } from "@/lib/apple-connect";
import { validateGooglePackage, type GoogleServiceAccount } from "@/lib/google-play-api";

export const maxDuration = 30;

/**
 * POST /api/store/connect
 * Validates, encrypts, and stores store API credentials.
 * Body: { platform, displayName, credentials }
 *   iOS credentials:   { issuerId, keyId, privateKey }
 *   Android creds:     { serviceAccountJson, packageName }
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await request.json();
  const { platform, displayName, credentials } = body as {
    platform: "ios" | "android";
    displayName: string;
    credentials: Record<string, unknown>;
  };

  if (!platform || !displayName || !credentials) {
    return NextResponse.json({ error: "Missing platform, displayName, or credentials" }, { status: 400 });
  }

  // Validate credentials by testing the connection
  try {
    if (platform === "ios") {
      const creds = credentials as unknown as AppleCredentials;
      if (!creds.issuerId || !creds.keyId || !creds.privateKey) {
        return NextResponse.json({ error: "Apple credentials require issuerId, keyId, and privateKey" }, { status: 400 });
      }
      // Test by generating a JWT (validates the private key format) and listing apps
      generateAppleJwt(creds);
      await listAppleApps(creds); // throws if invalid
    } else {
      const { serviceAccountJson, packageName } = credentials as {
        serviceAccountJson: GoogleServiceAccount;
        packageName?: string;
      };
      if (!serviceAccountJson?.private_key || !serviceAccountJson?.client_email) {
        return NextResponse.json({ error: "Google credentials require a valid service account JSON" }, { status: 400 });
      }
      if (packageName) {
        await validateGooglePackage(serviceAccountJson, packageName);
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Credential validation failed: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 422 }
    );
  }

  // Encrypt and store
  const encrypted = encryptCredentials(credentials);

  const { data, error } = await supabaseAdmin
    .from("store_connections")
    .insert({
      user_id: userId,
      platform,
      display_name: displayName,
      credentials_encrypted: encrypted.ciphertext,
      credentials_iv: encrypted.iv,
      credentials_tag: encrypted.tag,
      status: "active",
    })
    .select("id, platform, display_name, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connection: data });
}
