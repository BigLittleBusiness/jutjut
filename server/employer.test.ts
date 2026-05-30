/**
 * Tests for employer monetisation logic:
 * - Credit pack pricing
 * - Charge amount calculation (discount + GST)
 * - Promo code validation helpers
 * - Webhook signature verification
 */

import { describe, it, expect } from "vitest";
import {
  getCreditPack,
  calculateChargeAmount,
  CREDIT_PACKS,
  verifyWebhookSignature,
} from "./pinpayments";

// ─── Credit packs ─────────────────────────────────────────────────────────────

describe("getCreditPack", () => {
  it("returns pack_1 correctly", () => {
    const pack = getCreditPack("pack_1");
    expect(pack.credits).toBe(1);
    expect(pack.priceAud).toBe(1500); // $15.00 in cents
  });

  it("returns pack_5 correctly", () => {
    const pack = getCreditPack("pack_5");
    expect(pack.credits).toBe(5);
    expect(pack.priceAud).toBe(5000); // $50.00 in cents
  });

  it("throws for unknown pack id", () => {
    // @ts-expect-error intentional invalid input
    expect(() => getCreditPack("pack_99")).toThrow("Unknown credit pack");
  });

  it("CREDIT_PACKS has exactly 2 packs", () => {
    expect(CREDIT_PACKS.length).toBe(2);
  });
});

// ─── Charge amount calculation ────────────────────────────────────────────────

describe("calculateChargeAmount", () => {
  it("returns base amount with no discount and no GST", () => {
    const result = calculateChargeAmount({
      baseAmountCents: 1500,
      includeGst: false,
    });
    expect(result.subtotalCents).toBe(1500);
    expect(result.gstCents).toBe(0);
    expect(result.totalCents).toBe(1500);
  });

  it("applies percentage discount correctly", () => {
    const result = calculateChargeAmount({
      baseAmountCents: 1500,
      discountType: "percentage",
      discountValue: 20, // 20% off
      includeGst: false,
    });
    expect(result.subtotalCents).toBe(1200); // 1500 * 0.80
    expect(result.totalCents).toBe(1200);
  });

  it("applies fixed discount correctly", () => {
    const result = calculateChargeAmount({
      baseAmountCents: 1500,
      discountType: "fixed",
      discountValue: 300, // $3.00 off
      includeGst: false,
    });
    expect(result.subtotalCents).toBe(1200);
    expect(result.totalCents).toBe(1200);
  });

  it("adds 10% GST when includeGst is true", () => {
    const result = calculateChargeAmount({
      baseAmountCents: 1500,
      includeGst: true,
    });
    expect(result.gstCents).toBe(150); // 10% of 1500
    expect(result.totalCents).toBe(1650);
  });

  it("applies discount then adds GST", () => {
    const result = calculateChargeAmount({
      baseAmountCents: 1500,
      discountType: "percentage",
      discountValue: 20,
      includeGst: true,
    });
    expect(result.subtotalCents).toBe(1200);
    expect(result.gstCents).toBe(120); // 10% of 1200
    expect(result.totalCents).toBe(1320);
  });

  it("does not go below zero with large fixed discount", () => {
    const result = calculateChargeAmount({
      baseAmountCents: 1500,
      discountType: "fixed",
      discountValue: 9999, // larger than base
      includeGst: false,
    });
    expect(result.subtotalCents).toBe(0);
    expect(result.totalCents).toBe(0);
  });

  it("handles 100% percentage discount", () => {
    const result = calculateChargeAmount({
      baseAmountCents: 1500,
      discountType: "percentage",
      discountValue: 100,
      includeGst: false,
    });
    expect(result.subtotalCents).toBe(0);
    expect(result.totalCents).toBe(0);
  });
});

// ─── Webhook signature verification ──────────────────────────────────────────

describe("verifyWebhookSignature", () => {
  it("returns true for a valid HMAC-SHA256 signature", () => {
    const secret = "test_webhook_secret";
    const body = JSON.stringify({ event: { type: "charge.succeeded" } });
    const crypto = require("crypto") as typeof import("crypto");
    const sig = crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");

    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
  });

  it("returns false for a tampered body", () => {
    const secret = "test_webhook_secret";
    const originalBody = JSON.stringify({ event: { type: "charge.succeeded" } });
    const tamperedBody = JSON.stringify({ event: { type: "charge.failed" } });
    const crypto = require("crypto") as typeof import("crypto");
    const sig = crypto.createHmac("sha256", secret).update(originalBody, "utf8").digest("hex");

    expect(verifyWebhookSignature(tamperedBody, sig, secret)).toBe(false);
  });

  it("returns false for a wrong secret", () => {
    const secret = "correct_secret";
    const wrongSecret = "wrong_secret";
    const body = "test body";
    const crypto = require("crypto") as typeof import("crypto");
    const sig = crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");

    expect(verifyWebhookSignature(body, sig, wrongSecret)).toBe(false);
  });

  it("returns false for an empty signature", () => {
    expect(verifyWebhookSignature("body", "", "secret")).toBe(false);
  });
});
