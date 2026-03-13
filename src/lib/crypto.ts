import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const keyHex = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!keyHex) throw new Error("CREDENTIALS_ENCRYPTION_KEY env var is not set");
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) throw new Error("CREDENTIALS_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
  return key;
}

export interface EncryptedCredentials {
  ciphertext: string; // base64
  iv: string;         // base64
  tag: string;        // base64
}

/**
 * Encrypts a credentials object to AES-256-GCM ciphertext.
 * The plaintext is JSON-serialized before encryption.
 */
export function encryptCredentials(credentials: Record<string, unknown>): EncryptedCredentials {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(credentials);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

/**
 * Decrypts credentials from AES-256-GCM ciphertext back to an object.
 */
export function decryptCredentials(
  ciphertext: string,
  iv: string,
  tag: string
): Record<string, unknown> {
  const key = getKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}
