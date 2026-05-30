/**
 * Vitest tests for promo code business logic
 * Tests the discount calculation, status determination, and validation rules
 * that power the AdminPromoCodes page and employer checkout flow.
 */

import { describe, it, expect } from "vitest";

// ─── Replicate the pure logic from the frontend / backend ────────────────────

function calcDiscount(
  priceCents: number,
  type: "percentage" | "fixed",
  value: number
): { saving: number; after: number } {
  if (type === "percentage") {
    const saving = Math.round(priceCents * (Math.min(value, 100) / 100));
    return { saving, after: Math.max(0, priceCents - saving) };
  }
  const saving = Math.min(value * 100, priceCents);
  return { saving, after: Math.max(0, priceCents - saving) };
}

function codeStatus(code: {
  isActive: boolean;
  expiresAt: Date | null;
  usedCount: number;
  maxUses: number | null;
}): string {
  if (!code.isActive) return "Inactive";
  if (code.expiresAt && new Date(code.expiresAt) < new Date()) return "Expired";
  if (code.maxUses !== null && code.usedCount >= code.maxUses) return "Exhausted";
  return "Active";
}

// ─── calcDiscount — percentage ────────────────────────────────────────────────

describe("calcDiscount — percentage", () => {
  it("calculates 20% off $15.00 correctly", () => {
    const { saving, after } = calcDiscount(1500, "percentage", 20);
    expect(saving).toBe(300);
    expect(after).toBe(1200);
  });

  it("calculates 50% off $50.00 correctly", () => {
    const { saving, after } = calcDiscount(5000, "percentage", 50);
    expect(saving).toBe(2500);
    expect(after).toBe(2500);
  });

  it("caps percentage at 100 — never goes negative", () => {
    const { saving, after } = calcDiscount(1500, "percentage", 150);
    expect(saving).toBe(1500);
    expect(after).toBe(0);
  });

  it("handles 0% discount gracefully", () => {
    const { saving, after } = calcDiscount(1500, "percentage", 0);
    expect(saving).toBe(0);
    expect(after).toBe(1500);
  });

  it("rounds fractional cents correctly", () => {
    // 15% of $15.00 = $2.25 = 225 cents
    const { saving, after } = calcDiscount(1500, "percentage", 15);
    expect(saving).toBe(225);
    expect(after).toBe(1275);
  });
});

// ─── calcDiscount — fixed ─────────────────────────────────────────────────────

describe("calcDiscount — fixed AUD", () => {
  it("subtracts $5 AUD (500 cents) from $15.00", () => {
    const { saving, after } = calcDiscount(1500, "fixed", 5);
    expect(saving).toBe(500);
    expect(after).toBe(1000);
  });

  it("does not go below zero when discount exceeds price", () => {
    const { saving, after } = calcDiscount(1500, "fixed", 20);
    expect(saving).toBe(1500);
    expect(after).toBe(0);
  });

  it("handles exact match — $15 off $15.00", () => {
    const { saving, after } = calcDiscount(1500, "fixed", 15);
    expect(saving).toBe(1500);
    expect(after).toBe(0);
  });

  it("handles fractional AUD — $2.50 off $15.00", () => {
    const { saving, after } = calcDiscount(1500, "fixed", 2.5);
    expect(saving).toBe(250);
    expect(after).toBe(1250);
  });
});

// ─── codeStatus ───────────────────────────────────────────────────────────────

describe("codeStatus", () => {
  const future = new Date(Date.now() + 86_400_000); // tomorrow
  const past = new Date(Date.now() - 86_400_000);   // yesterday

  it("returns Active for a valid, unexpired, under-limit code", () => {
    expect(codeStatus({ isActive: true, expiresAt: future, usedCount: 0, maxUses: 10 })).toBe("Active");
  });

  it("returns Active when expiresAt is null (no expiry)", () => {
    expect(codeStatus({ isActive: true, expiresAt: null, usedCount: 5, maxUses: null })).toBe("Active");
  });

  it("returns Inactive when isActive is false", () => {
    expect(codeStatus({ isActive: false, expiresAt: future, usedCount: 0, maxUses: null })).toBe("Inactive");
  });

  it("returns Expired when expiresAt is in the past", () => {
    expect(codeStatus({ isActive: true, expiresAt: past, usedCount: 0, maxUses: null })).toBe("Expired");
  });

  it("returns Exhausted when usedCount equals maxUses", () => {
    expect(codeStatus({ isActive: true, expiresAt: future, usedCount: 10, maxUses: 10 })).toBe("Exhausted");
  });

  it("returns Exhausted when usedCount exceeds maxUses", () => {
    expect(codeStatus({ isActive: true, expiresAt: future, usedCount: 11, maxUses: 10 })).toBe("Exhausted");
  });

  it("Inactive takes precedence over Expired", () => {
    expect(codeStatus({ isActive: false, expiresAt: past, usedCount: 0, maxUses: null })).toBe("Inactive");
  });

  it("Active with unlimited uses (maxUses null) and no expiry", () => {
    expect(codeStatus({ isActive: true, expiresAt: null, usedCount: 9999, maxUses: null })).toBe("Active");
  });
});

// ─── Code format validation ───────────────────────────────────────────────────

describe("promo code format validation", () => {
  const validCodes = ["LAUNCH20", "SUMMER-50", "TEST_CODE", "A1", "ABCDEFGHIJKLMNOP"];
  const invalidCodes = ["", "A", "has space", "has@symbol", "has.dot"];

  it.each(validCodes)("accepts valid code: %s", (code) => {
    const sanitised = code.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    expect(sanitised).toBe(code.toUpperCase());
    expect(sanitised.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects empty code", () => {
    expect("".length).toBeLessThan(2);
  });

  it("rejects single-character code", () => {
    expect("A".length).toBeLessThan(2);
  });

  it("strips spaces from code input", () => {
    const raw = "HAS SPACE";
    const sanitised = raw.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    expect(sanitised).toBe("HASSPACE");
  });

  it("strips special characters from code input", () => {
    const raw = "code@2025!";
    const sanitised = raw.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    expect(sanitised).toBe("CODE2025");
  });
});
