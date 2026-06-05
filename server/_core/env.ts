import { logger } from "./logger.js";

// ─── Required env vars ────────────────────────────────────────────────────────
// Fail fast at startup if any critical variable is missing or too short.

const REQUIRED: Array<{ key: string; minLength?: number; description: string }> = [
  { key: "VITE_APP_ID", description: "Manus OAuth application ID" },
  { key: "JWT_SECRET", minLength: 32, description: "Session cookie signing secret (≥32 chars)" },
  { key: "DATABASE_URL", description: "MySQL/TiDB connection string" },
  { key: "OAUTH_SERVER_URL", description: "Manus OAuth backend base URL" },
  { key: "BUILT_IN_FORGE_API_URL", description: "Manus built-in API base URL" },
  { key: "BUILT_IN_FORGE_API_KEY", description: "Manus built-in API bearer token" },
  { key: "ENCRYPTION_KEY", minLength: 32, description: "AES-256-GCM encryption key for gateway credentials (≥32 chars)" },
];

let startupErrors = 0;
for (const { key, minLength, description } of REQUIRED) {
  const val = process.env[key];
  if (!val) {
    logger.error({ envVar: key }, `[env] Missing required env var: ${key} — ${description}`);
    startupErrors++;
  } else if (minLength && val.length < minLength) {
    logger.error(
      { envVar: key, length: val.length, required: minLength },
      `[env] Env var ${key} is too short (${val.length} < ${minLength})`
    );
    startupErrors++;
  }
}

if (startupErrors > 0 && process.env.NODE_ENV === "production") {
  logger.error({ startupErrors }, "[env] Aborting: missing required env vars in production");
  process.exit(1);
} else if (startupErrors > 0) {
  logger.warn({ startupErrors }, "[env] Missing env vars — continuing in dev mode with defaults");
}

// ─── Parsed ALLOWED_ORIGINS ───────────────────────────────────────────────────
// Comma-separated list of allowed CORS origins, e.g.:
//   ALLOWED_ORIGINS=https://jutjut.com,https://www.jutjut.com
// If not set, defaults to allowing the Manus-hosted domain in production,
// or all origins in development.

function parseAllowedOrigins(): string[] | RegExp[] | boolean {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) {
    // Dev: allow all; Production: lock down (caller must set ALLOWED_ORIGINS)
    return process.env.NODE_ENV === "production" ? false : true;
  }
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

// ─── Exported ENV object ──────────────────────────────────────────────────────

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  allowedOrigins: parseAllowedOrigins(),
  // PinPayments
  pinPaymentsSecretKey: process.env.PIN_PAYMENTS_SECRET_KEY ?? "",
  pinPaymentsPublishableKey: process.env.PIN_PAYMENTS_PUBLISHABLE_KEY ?? "",
  pinPaymentsWebhookSecret: process.env.PIN_PAYMENTS_WEBHOOK_SECRET ?? "",
  pinPaymentsBaseUrl: process.env.PIN_PAYMENTS_BASE_URL ?? "https://test-api.pinpayments.com/1",
};
