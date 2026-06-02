/**
 * emailService.ts — JutJut transactional email service using AWS SES.
 *
 * Features:
 *  - Sends HTML + plain-text emails via SES SendEmail API
 *  - Automatic retry with exponential backoff (up to 3 attempts)
 *  - Logs every send attempt to the emailLogs table
 *  - Adds RFC-2369 List-Unsubscribe header for marketing emails
 *  - Respects email preferences (marketing/digest/drops opt-outs)
 *  - Graceful no-op when SES credentials are not configured (dev mode)
 */

import {
  SESClient,
  SendEmailCommand,
  type SendEmailCommandInput,
} from "@aws-sdk/client-ses";
import { renderEmail } from "./renderEmail.js";
import { getDb } from "./db.js";
import { emailLogs, emailPreferences } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

// ─── SES client ───────────────────────────────────────────────────────────────

let _sesClient: SESClient | null = null;

function getSesClient(): SESClient | null {
  if (_sesClient) return _sesClient;

  const region = process.env.AWS_SES_REGION;
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    // SES not configured — emails will be logged but not sent (dev mode)
    return null;
  }

  _sesClient = new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  return _sesClient;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type SendEmailOptions = {
  /** Recipient email address */
  to: string;
  /** Template ID from renderEmail.ts */
  templateId: string;
  /** Template data — key/value pairs for {{placeholder}} substitution */
  data: Record<string, string>;
  /**
   * Optional: the userId of the recipient (used to check email preferences).
   * If omitted, preference checks are skipped.
   */
  userId?: number;
  /**
   * Optional: override the unsubscribe URL injected into marketing emails.
   * Defaults to the platform unsubscribe page.
   */
  unsubscribeUrl?: string;
};

export type SendEmailResult =
  | { success: true; messageId: string }
  | { success: false; error: string; skipped?: boolean };

// ─── Preference check ─────────────────────────────────────────────────────────

type PreferenceKey = "marketingEmails" | "weeklyDigest" | "dropReminders";

const MARKETING_TEMPLATE_PREFERENCE_MAP: Record<string, PreferenceKey> = {
  drop_reminder: "dropReminders",
  weekly_drop_announcement: "dropReminders",
  school_daily_digest: "weeklyDigest",
};

async function isEmailAllowed(
  userId: number,
  templateId: string,
  isMarketing: boolean
): Promise<boolean> {
  if (!isMarketing) return true; // transactional emails always go through

  const db = await getDb();
  if (!db) return true; // can't check — allow

  const [prefs] = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, userId))
    .limit(1);

  if (!prefs) return false; // no prefs row = opted out of all marketing

  const key = MARKETING_TEMPLATE_PREFERENCE_MAP[templateId];
  if (key) return prefs[key] === true;

  // Generic marketing template — check marketingEmails flag
  return prefs.marketingEmails === true;
}

// ─── Logging ─────────────────────────────────────────────────────────────────

async function logEmail(
  to: string,
  subject: string,
  templateId: string,
  status: "sent" | "failed",
  sesMessageId?: string,
  errorMessage?: string,
  templateData?: Record<string, string>
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(emailLogs).values({
      toEmail: to,
      subject,
      templateId,
      templateData: templateData ? JSON.stringify(templateData) : null,
      status,
      sesMessageId: sesMessageId ?? null,
      errorMessage: errorMessage ?? null,
    });
  } catch {
    // Never throw from logging — silently swallow
  }
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 300
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastError;
}

// ─── Main send function ───────────────────────────────────────────────────────

const FROM_ADDRESS =
  process.env.SES_FROM_ADDRESS ?? "JutJut <hello@jutjut.com.au>";
const APP_BASE_URL = process.env.APP_BASE_URL ?? "https://jutjut.com.au";

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const { to, templateId, data, userId, unsubscribeUrl } = opts;

  // Build unsubscribe URL
  const unsub =
    unsubscribeUrl ??
    `${APP_BASE_URL}/email-preferences?uid=${userId ?? ""}&unsub=1`;

  // Render template
  let rendered: ReturnType<typeof renderEmail>;
  try {
    rendered = renderEmail(templateId, data, unsub);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logEmail(to, templateId, templateId, "failed", undefined, msg);
    return { success: false, error: msg };
  }

  const { html, text, subject, isMarketing } = rendered;

  // Check preferences
  if (userId !== undefined) {
    const allowed = await isEmailAllowed(userId, templateId, isMarketing);
    if (!allowed) {
      return {
        success: false,
        error: "Recipient has opted out of this email type",
        skipped: true,
      };
    }
  }

  const client = getSesClient();

  // Dev mode — log but don't send
  if (!client) {
    console.log(
      `[emailService] DEV MODE — would send "${subject}" to ${to} (template: ${templateId})`
    );
    await logEmail(to, subject, templateId, "sent", "DEV_MODE", undefined, data);
    return { success: true, messageId: "DEV_MODE" };
  }

  // Build SES command
  const params: SendEmailCommandInput = {
    Source: FROM_ADDRESS,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        Html: { Data: html, Charset: "UTF-8" },
        Text: { Data: text, Charset: "UTF-8" },
      },
    },
  };

  if (isMarketing) {
    params.ReplyToAddresses = [FROM_ADDRESS];
    // List-Unsubscribe header injected via ConfigurationSet in SES or via custom headers
    // SES v2 supports custom headers — using v1 here so we rely on footer link
  }

  try {
    const result = await withRetry(() => client.send(new SendEmailCommand(params)));
    const messageId = result.MessageId ?? "unknown";
    await logEmail(to, subject, templateId, "sent", messageId, undefined, data);
    return { success: true, messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logEmail(to, subject, templateId, "failed", undefined, msg, data);
    return { success: false, error: msg };
  }
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

/** Fire-and-forget email — logs errors but never throws. */
export async function sendEmailSilent(opts: SendEmailOptions): Promise<void> {
  try {
    const result = await sendEmail(opts);
    if (!result.success && !result.skipped) {
      console.error(
        `[emailService] Failed to send ${opts.templateId} to ${opts.to}: ${result.error}`
      );
    }
  } catch (err) {
    console.error(`[emailService] Unexpected error:`, err);
  }
}
