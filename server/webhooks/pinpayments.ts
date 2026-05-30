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
import { verifyWebhookSignature } from "../pinpayments";
import { adjustCredits, getPromoCode, incrementPromoCodeUsage, recordPromoRedemption } from "../db";

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
          console.warn("[Webhook] Invalid PinPayments signature");
          res.status(401).json({ error: "Invalid signature" });
          return;
        }
      } else if (ENV.pinPaymentsWebhookSecret && !signature) {
        console.warn("[Webhook] Missing PinPayments signature header");
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
      console.log(`[Webhook] PinPayments event: ${eventType}`);

      if (eventType === "charge.succeeded") {
        await handleChargeSucceeded(payload.data);
      }

      // Always respond 200 quickly so PinPayments doesn't retry
      res.status(200).json({ received: true });
    }
  );
}

async function handleChargeSucceeded(data: PinWebhookPayload["data"]) {
  const meta = data.metadata ?? {};
  const employerId = meta.employer_id ? parseInt(meta.employer_id, 10) : null;
  const creditPackSize = meta.credit_pack_size ? parseInt(meta.credit_pack_size, 10) : null;
  const promoCode = meta.promo_code ?? null;
  const userId = meta.user_id ? parseInt(meta.user_id, 10) : null;

  if (!employerId || !creditPackSize) {
    console.warn("[Webhook] charge.succeeded missing employer_id or credit_pack_size in metadata");
    return;
  }

  // Add credits
  await adjustCredits({
    employerId,
    amount: creditPackSize,
    type: "purchase",
    reference: data.token,
    description: `Webhook: charge.succeeded — ${data.description}`,
  });

  console.log(`[Webhook] Added ${creditPackSize} credit(s) to employer ${employerId} (charge ${data.token})`);

  // Handle promo code bonus credits
  if (promoCode) {
    const promo = await getPromoCode(promoCode);
    if (promo && promo.bonusCredits > 0) {
      await adjustCredits({
        employerId,
        amount: promo.bonusCredits,
        type: "promo_bonus",
        reference: promo.code,
        description: `Webhook: bonus credits from promo ${promo.code}`,
      });
      await incrementPromoCodeUsage(promo.id);
      console.log(`[Webhook] Added ${promo.bonusCredits} bonus credit(s) from promo ${promo.code}`);
    } else if (promo) {
      await incrementPromoCodeUsage(promo.id);
    }
    // Record per-user redemption for admin detail view
    if (promo) {
      await recordPromoRedemption({
        promoCodeId: promo.id,
        promoCode: promo.code,
        redeemedByUserId: userId,
        redeemedByEmployerId: employerId,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        bonusCreditsAwarded: promo.bonusCredits,
        chargeToken: data.token,
      });
    }
  }
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
