/**
 * PinPayments API helper
 * Docs: https://docs.pinpayments.com
 *
 * Uses Basic Auth: secret_key as username, empty password.
 * Sandbox base URL: https://test-api.pinpayments.com/1
 * Live base URL:    https://api.pinpayments.com/1
 */

import { ENV } from "./_core/env";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PinCharge {
  token: string;
  success: boolean;
  amount: number; // cents
  currency: string;
  description: string;
  email: string;
  ip_address: string;
  created_at: string;
  status_message: string;
  error_message: string | null;
  card: {
    token: string;
    display_number: string;
    scheme: string;
    address_line1: string | null;
    address_city: string | null;
    address_country: string | null;
  };
  metadata: Record<string, string>;
}

export interface PinChargeResponse {
  response: PinCharge;
}

export interface PinCardToken {
  token: string;
  display_number: string;
  scheme: string;
  expiry_month: number;
  expiry_year: number;
  name: string;
  address_line1: string | null;
  address_city: string | null;
  address_country: string | null;
}

export interface PinCustomer {
  token: string;
  email: string;
  card: PinCardToken;
  created_at: string;
}

export interface PinCustomerResponse {
  response: PinCustomer;
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

const authHeader = () => {
  const encoded = Buffer.from(`${ENV.pinPaymentsSecretKey}:`).toString("base64");
  return `Basic ${encoded}`;
};

const baseUrl = () => ENV.pinPaymentsBaseUrl;

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Create a charge using a card token or customer token.
 * amount is in AUD cents (e.g. 1500 = $15.00 AUD).
 */
export async function createCharge(params: {
  amount: number; // cents
  currency?: string;
  description: string;
  email: string;
  ipAddress: string;
  cardToken?: string;
  customerToken?: string;
  metadata?: Record<string, string>;
}): Promise<PinCharge> {
  const body = new URLSearchParams();
  body.append("amount", String(params.amount));
  body.append("currency", params.currency ?? "AUD");
  body.append("description", params.description);
  body.append("email", params.email);
  body.append("ip_address", params.ipAddress);

  if (params.cardToken) body.append("card_token", params.cardToken);
  if (params.customerToken) body.append("customer_token", params.customerToken);

  if (params.metadata) {
    for (const [k, v] of Object.entries(params.metadata)) {
      body.append(`metadata[${k}]`, v);
    }
  }

  const res = await fetch(`${baseUrl()}/charges`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const json = (await res.json()) as { response?: PinCharge; error?: string; error_description?: string };

  if (!res.ok || !json.response) {
    throw new Error(
      `PinPayments charge failed: ${json.error ?? res.status} – ${json.error_description ?? res.statusText}`
    );
  }

  return json.response;
}

/**
 * Create or update a PinPayments customer (stores a reusable card token).
 */
export async function createCustomer(params: {
  email: string;
  cardToken: string;
}): Promise<PinCustomer> {
  const body = new URLSearchParams();
  body.append("email", params.email);
  body.append("card_token", params.cardToken);

  const res = await fetch(`${baseUrl()}/customers`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const json = (await res.json()) as { response?: PinCustomer; error?: string; error_description?: string };

  if (!res.ok || !json.response) {
    throw new Error(
      `PinPayments customer create failed: ${json.error ?? res.status} – ${json.error_description ?? res.statusText}`
    );
  }

  return json.response;
}

/**
 * Verify a PinPayments webhook signature.
 * PinPayments signs the raw body with HMAC-SHA256 using the webhook secret.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require("crypto") as typeof import("crypto");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  // Constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

// ─── Credit pack pricing ──────────────────────────────────────────────────────

export const CREDIT_PACKS = [
  { id: "pack_1", credits: 1, priceAud: 15_00 }, // $15.00 AUD in cents
  { id: "pack_5", credits: 5, priceAud: 50_00 }, // $50.00 AUD in cents
] as const;

export type CreditPackId = (typeof CREDIT_PACKS)[number]["id"];

export function getCreditPack(id: CreditPackId) {
  const pack = CREDIT_PACKS.find(p => p.id === id);
  if (!pack) throw new Error(`Unknown credit pack: ${id}`);
  return pack;
}

/** Calculate final charge amount in cents after discount and optional GST. */
export function calculateChargeAmount(params: {
  baseAmountCents: number;
  discountType?: "fixed" | "percentage";
  discountValue?: number; // cents for fixed, integer percent for percentage
  includeGst: boolean;
}): { subtotalCents: number; gstCents: number; totalCents: number } {
  let subtotal = params.baseAmountCents;

  if (params.discountType === "fixed" && params.discountValue) {
    subtotal = Math.max(0, subtotal - params.discountValue);
  } else if (params.discountType === "percentage" && params.discountValue) {
    subtotal = Math.round(subtotal * (1 - params.discountValue / 100));
  }

  const gst = params.includeGst ? Math.round(subtotal * 0.1) : 0;
  return {
    subtotalCents: subtotal,
    gstCents: gst,
    totalCents: subtotal + gst,
  };
}
