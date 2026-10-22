/**
 * PinPayments webhook handler.
 * Endpoint: POST /webhooks/pinpayments
 *
 * Handles charge.succeeded events:
 * - Adds credits to employer_credits
 * - Logs credit transaction
 * - Increments promo code usage if applicable
 */

import type { Express, Request, Response } from "express";
import { ENV } from "../_core/env";
import { logger } from "../_core/logger";
import { verifyWebhookSignature } from "../pinpayments";

interface PinWebhookPayload {
  event: {
    type: string;
    token: string;
    created_at: string;
  };
  data: {
    token: string;
    success: boolean;
    amount: number;
    currency: string;
    description: string;
    email: string;
    metadata?: Record<string, string>;
    status_message: string;
  };
}

export function registerPinPaymentsWebhook(app: Express) {
  // Raw body is needed for signature verification — must be registered before express.json()
  app.post(
    "/webhooks/pinpayments",
    express_rawBody,
    async (req: Request & { rawBody?: string }, res: Response) => {
      const signature = req.headers["x-pin-signature"] as string | undefined;
      const rawBody = req.rawBody ?? "";

      // Verify signature if webhook secret is configured
      if (ENV.pinPaymentsWebhookSecret && signature) {
        const valid = verifyWebhookSignature(rawBody, signature, ENV.pinPaymentsWebhookSecret);
        if (!valid) {
          logger.warn("[Webhook] Invalid PinPayments signature");
          res.status(401).json({ error: "Invalid signature" });
          return;
        }
      } else if (ENV.pinPaymentsWebhookSecret && !signature) {
        logger.warn("[Webhook] Missing PinPayments signature header");
        res.status(401).json({ error: "Missing signature" });
        return;
      }

      let payload: PinWebhookPayload;
      try {
        payload = JSON.parse(rawBody) as PinWebhookPayload;
      } catch {
        res.status(400).json({ error: "Invalid JSON body" });
        return;
      }

      const eventType = payload.event?.type;
      logger.info({ eventType }, `[Webhook] PinPayments event: ${eventType}`);

      if (eventType === "charge.succeeded") {
        // Settlement is paused until provider event identity, transaction state
        // and credit grant are reconciled atomically. A webhook must never be a
        // second path that grants the same browser-settled purchase twice.
        logger.warn({ eventType }, "[Webhook] Ignored PinPayments settlement while credit purchases are disabled");
      }

      // Always respond 200 quickly so PinPayments doesn't retry
      res.status(200).json({ received: true });
    }
  );
}

/**
 * Middleware to capture raw body before JSON parsing.
 * Required for HMAC signature verification.
 */
function express_rawBody(
  req: Request & { rawBody?: string },
  _res: Response,
  next: () => void
) {
  let data = "";
  req.setEncoding("utf8");
  req.on("data", (chunk: string) => {
    data += chunk;
  });
  req.on("end", () => {
    req.rawBody = data;
    next();
  });
}
