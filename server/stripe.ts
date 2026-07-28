/**
 * Stripe payment helper
 * Docs: https://stripe.com/docs/api
 *
 * Keys are stored encrypted in the paymentGatewaySettings table and read at
 * runtime via getActiveGatewayKey() so the admin can rotate them without a
 * redeploy.
 *
 * Required gateway keys (set via Admin Dashboard → Payments → Gateway Settings):
 *   stripe_secret_key        — sk_live_... or sk_test_...
 *   stripe_publishable_key   — pk_live_... or pk_test_...  (read by frontend)
 *   stripe_webhook_secret    — whsec_...  (for webhook signature verification)
 */

import Stripe from "stripe";
import { getPaymentGatewaySettings } from "./db.admin";
import { decrypt } from "./encryption";

// ─── Key resolution ───────────────────────────────────────────────────────────

async function getStripeKey(keyName: string): Promise<string | null> {
  const rows = await getPaymentGatewaySettings();
  const row = rows.find((r) => r.keyName === keyName);
  if (!row) return null;
  try {
    return decrypt(row.encryptedValue);
  } catch {
    return null;
  }
}

async function getStripeClient(): Promise<Stripe> {
  const secretKey = await getStripeKey("stripe_secret_key");
  if (!secretKey) {
    throw new Error(
      "Stripe secret key not configured. Set stripe_secret_key in Admin → Payments → Gateway Settings."
    );
  }
  return new Stripe(secretKey, { apiVersion: "2026-06-24.dahlia" });
}

// ─── Charge creation ──────────────────────────────────────────────────────────

export interface StripeChargeParams {
  /** Amount in cents (AUD) */
  amountCents: number;
  description: string;
  email: string;
  /** Stripe PaymentMethod ID (pm_...) from Stripe Elements on the frontend */
  paymentMethodId: string;
  metadata?: Record<string, string>;
}

export interface StripeChargeResult {
  success: boolean;
  chargeId: string;
  status: string;
  statusMessage: string;
}

export async function createStripeCharge(
  params: StripeChargeParams
): Promise<StripeChargeResult> {
  const stripe = await getStripeClient();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amountCents,
    currency: "aud",
    description: params.description,
    receipt_email: params.email,
    payment_method: params.paymentMethodId,
    confirm: true,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
    metadata: params.metadata ?? {},
  });

  const success =
    paymentIntent.status === "succeeded" ||
    paymentIntent.status === "processing";

  return {
    success,
    chargeId: paymentIntent.id,
    status: paymentIntent.status,
    statusMessage: success
      ? "Payment confirmed"
      : `Payment ${paymentIntent.status}`,
  };
}

// ─── Customer management ──────────────────────────────────────────────────────

export interface StripeCustomerParams {
  email: string;
  paymentMethodId: string;
  name?: string;
}

export interface StripeCustomerResult {
  customerId: string;
  paymentMethodId: string;
}

export async function createOrUpdateStripeCustomer(
  params: StripeCustomerParams
): Promise<StripeCustomerResult> {
  const stripe = await getStripeClient();

  // Search for existing customer by email
  const existing = await stripe.customers.list({
    email: params.email,
    limit: 1,
  });

  let customerId: string;

  if (existing.data.length > 0) {
    customerId = existing.data[0].id;
    // Attach new payment method to existing customer
    await stripe.paymentMethods.attach(params.paymentMethodId, {
      customer: customerId,
    });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: params.paymentMethodId },
    });
  } else {
    const customer = await stripe.customers.create({
      email: params.email,
      name: params.name,
      payment_method: params.paymentMethodId,
      invoice_settings: { default_payment_method: params.paymentMethodId },
    });
    customerId = customer.id;
  }

  return { customerId, paymentMethodId: params.paymentMethodId };
}

// ─── Webhook signature verification ──────────────────────────────────────────

export async function verifyStripeWebhook(
  rawBody: Buffer,
  signature: string
): Promise<Stripe.Event> {
  const webhookSecret = await getStripeKey("stripe_webhook_secret");
  if (!webhookSecret) {
    throw new Error(
      "Stripe webhook secret not configured. Set stripe_webhook_secret in Admin → Payments → Gateway Settings."
    );
  }
  const stripe = await getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

// ─── Publishable key (safe to expose to frontend via tRPC) ───────────────────

export async function getStripePublishableKey(): Promise<string | null> {
  return getStripeKey("stripe_publishable_key");
}
