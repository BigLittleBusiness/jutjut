/**
 * Symmetric AES-256-GCM encryption for sensitive values (PinPayments API keys).
 * Uses ENCRYPTION_KEY from environment — must be a 64-char hex string (32 bytes).
 *
 * To generate a key:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? "";
  if (raw.length !== 64) {
    // In development fall back to a deterministic key so the app boots without config.
    // In production ENCRYPTION_KEY must be set — the warning is intentional.
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY must be a 64-character hex string in production.");
    }
    return Buffer.alloc(32, 0); // dev-only zero key — NOT secure
  }
  return Buffer.from(raw, "hex");
}

/**
 * Encrypt a plaintext string.
 * Returns a base64-encoded string: iv(12) + tag(16) + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Pack: iv | tag | ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypt a value produced by encrypt().
 */
export function decrypt(encoded: string): string {
  const key = getKey();
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/**
 * Mask a sensitive string for display: show first 4 and last 4 chars, rest as *.
 */
export function mask(value: string): string {
  if (value.length <= 8) return "****";
  return value.slice(0, 4) + "*".repeat(value.length - 8) + value.slice(-4);
}
