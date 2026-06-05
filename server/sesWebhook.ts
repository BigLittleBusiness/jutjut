/**
 * sesWebhook.ts — AWS SNS → SES notification handler.
 *
 * Register this as an Express route:
 *   app.post('/webhooks/aws-ses', sesWebhookHandler);
 *
 * SNS sends a JSON body with a "Type" field:
 *   - SubscriptionConfirmation: auto-confirms the SNS subscription
 *   - Notification: contains a SES event (Bounce, Complaint, Delivery)
 *
 * On Bounce or Complaint, the emailLogs row is updated and the
 * email address is suppressed (emailPreferences.marketingEmails = false).
 */

import type { Request, Response } from "express";
import { getDb } from "./db.js";
import { emailLogs, emailPreferences, users } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "./_core/logger.js";

// ─── Types ────────────────────────────────────────────────────────────────────

type SnsMessage = {
  Type: "SubscriptionConfirmation" | "Notification" | "UnsubscribeConfirmation";
  SubscribeURL?: string;
  Message?: string;
  MessageId?: string;
};

type SesNotification = {
  notificationType: "Bounce" | "Complaint" | "Delivery";
  bounce?: { bouncedRecipients: Array<{ emailAddress: string }> };
  complaint?: { complainedRecipients: Array<{ emailAddress: string }> };
  delivery?: { recipients: string[]; timestamp: string };
  mail?: { messageId: string };
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function sesWebhookHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // SNS sends Content-Type: text/plain for JSON — parse manually if needed
    const body: SnsMessage =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // Auto-confirm SNS subscription
    if (body.Type === "SubscriptionConfirmation" && body.SubscribeURL) {
      await fetch(body.SubscribeURL);
      logger.info({ event: "sns_subscription_confirmed" }, "[sesWebhook] SNS subscription confirmed");
      res.status(200).send("OK");
      return;
    }

    if (body.Type !== "Notification" || !body.Message) {
      res.status(200).send("OK");
      return;
    }

    const notification: SesNotification = JSON.parse(body.Message);
    const messageId = notification.mail?.messageId;

    const db = await getDb();

    switch (notification.notificationType) {
      case "Bounce": {
        const emails =
          notification.bounce?.bouncedRecipients.map((r) => r.emailAddress) ??
          [];
        for (const email of emails) {
          await suppressEmail(db, email, "bounced", messageId);
        }
        logger.info({ event: "ses_bounce", emails }, `[sesWebhook] Bounce recorded for: ${emails.join(", ")}`);
        break;
      }

      case "Complaint": {
        const emails =
          notification.complaint?.complainedRecipients.map(
            (r) => r.emailAddress
          ) ?? [];
        for (const email of emails) {
          await suppressEmail(db, email, "complaint", messageId);
        }
        logger.info({ event: "ses_complaint", emails }, `[sesWebhook] Complaint recorded for: ${emails.join(", ")}`);
        break;
      }

      case "Delivery": {
        if (messageId && db) {
          await db
            .update(emailLogs)
            .set({ status: "delivered" })
            .where(eq(emailLogs.sesMessageId, messageId));
        }
        break;
      }
    }

    res.status(200).send("OK");
  } catch (err) {
    logger.error({ err }, "[sesWebhook] Error processing SNS notification");
    // Always return 200 to SNS to prevent retry storms
    res.status(200).send("OK");
  }
}

// ─── Suppression helper ───────────────────────────────────────────────────────

async function suppressEmail(
  db: Awaited<ReturnType<typeof getDb>>,
  email: string,
  status: "bounced" | "complaint",
  messageId?: string
): Promise<void> {
  if (!db) return;

  // Update the log entry status
  if (messageId) {
    await db
      .update(emailLogs)
      .set({ status })
      .where(eq(emailLogs.sesMessageId, messageId));
  }

  // Find user by email using a parameterised Drizzle query (no string interpolation)
  try {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const user = rows[0];

    if (user?.id) {
      // Upsert: disable all marketing for this user
      await db
        .insert(emailPreferences)
        .values({
          userId: user.id,
          userType: "student",
          marketingEmails: false,
          weeklyDigest: false,
          dropReminders: false,
        })
        .onDuplicateKeyUpdate({
          set: {
            marketingEmails: false,
            weeklyDigest: false,
            dropReminders: false,
          },
        });
    }
  } catch {
    // Non-fatal — suppression best-effort
  }
}
