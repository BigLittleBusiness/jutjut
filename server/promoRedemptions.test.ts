/**
 * Tests for promo redemption history logic.
 */
import { describe, it, expect } from "vitest";

// ─── Helpers mirrored from the DB layer ───────────────────────────────────────

function calcDiscountCents(
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

function buildRedemptionRecord(data: {
  promoCodeId: number;
  promoCode: string;
  redeemedByUserId?: number | null;
  redeemedByEmployerId?: number | null;
  discountType: "fixed" | "percentage";
  discountValue: number;
  bonusCreditsAwarded?: number;
  chargeToken?: string | null;
}) {
  return {
    promoCodeId: data.promoCodeId,
    promoCode: data.promoCode.toUpperCase(),
    redeemedByUserId: data.redeemedByUserId ?? null,
    redeemedByEmployerId: data.redeemedByEmployerId ?? null,
    discountType: data.discountType,
    discountValue: data.discountValue,
    bonusCreditsAwarded: data.bonusCreditsAwarded ?? 0,
    chargeToken: data.chargeToken ?? null,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Promo redemption record builder", () => {
  it("normalises code to uppercase", () => {
    const r = buildRedemptionRecord({
      promoCodeId: 1,
      promoCode: "launch20",
      discountType: "percentage",
      discountValue: 20,
    });
    expect(r.promoCode).toBe("LAUNCH20");
  });

  it("defaults bonusCreditsAwarded to 0 when not provided", () => {
    const r = buildRedemptionRecord({
      promoCodeId: 1,
      promoCode: "SAVE5",
      discountType: "fixed",
      discountValue: 5,
    });
    expect(r.bonusCreditsAwarded).toBe(0);
  });

  it("preserves bonusCreditsAwarded when provided", () => {
    const r = buildRedemptionRecord({
      promoCodeId: 2,
      promoCode: "BONUS",
      discountType: "percentage",
      discountValue: 10,
      bonusCreditsAwarded: 3,
    });
    expect(r.bonusCreditsAwarded).toBe(3);
  });

  it("defaults redeemedByUserId to null when omitted", () => {
    const r = buildRedemptionRecord({
      promoCodeId: 3,
      promoCode: "ANON",
      discountType: "fixed",
      discountValue: 10,
    });
    expect(r.redeemedByUserId).toBeNull();
  });

  it("defaults chargeToken to null when omitted", () => {
    const r = buildRedemptionRecord({
      promoCodeId: 4,
      promoCode: "NOCHARGE",
      discountType: "percentage",
      discountValue: 15,
    });
    expect(r.chargeToken).toBeNull();
  });

  it("stores chargeToken when provided", () => {
    const r = buildRedemptionRecord({
      promoCodeId: 5,
      promoCode: "CHARGED",
      discountType: "percentage",
      discountValue: 25,
      chargeToken: "ch_abc123",
    });
    expect(r.chargeToken).toBe("ch_abc123");
  });
});

describe("Discount calculation for redemption preview", () => {
  it("calculates percentage discount correctly for pack_1 (1500 cents)", () => {
    const { saving, after } = calcDiscountCents(1500, "percentage", 20);
    expect(saving).toBe(300);
    expect(after).toBe(1200);
  });

  it("calculates percentage discount correctly for pack_5 (5000 cents)", () => {
    const { saving, after } = calcDiscountCents(5000, "percentage", 20);
    expect(saving).toBe(1000);
    expect(after).toBe(4000);
  });

  it("calculates fixed discount correctly ($5 AUD = 500 cents off 1500)", () => {
    const { saving, after } = calcDiscountCents(1500, "fixed", 5);
    expect(saving).toBe(500);
    expect(after).toBe(1000);
  });

  it("clamps fixed discount so price never goes below zero", () => {
    const { saving, after } = calcDiscountCents(1500, "fixed", 100);
    expect(saving).toBe(1500);
    expect(after).toBe(0);
  });

  it("clamps percentage discount at 100%", () => {
    const { saving, after } = calcDiscountCents(5000, "percentage", 150);
    expect(saving).toBe(5000);
    expect(after).toBe(0);
  });

  it("returns zero saving for 0% discount", () => {
    const { saving, after } = calcDiscountCents(1500, "percentage", 0);
    expect(saving).toBe(0);
    expect(after).toBe(1500);
  });

  it("handles 50% off pack_5 correctly", () => {
    const { saving, after } = calcDiscountCents(5000, "percentage", 50);
    expect(saving).toBe(2500);
    expect(after).toBe(2500);
  });
});

describe("Redemption display helpers", () => {
  it("formats user display name from name field", () => {
    const r = { userName: "Alex Mercer", userEmail: "alex@school.edu", redeemedByUserId: 1, redeemedByEmployerId: null };
    const display = r.userName || r.userEmail || `User #${r.redeemedByUserId ?? r.redeemedByEmployerId ?? "?"}`;
    expect(display).toBe("Alex Mercer");
  });

  it("falls back to email when name is null", () => {
    const r = { userName: null, userEmail: "alex@school.edu", redeemedByUserId: 1, redeemedByEmployerId: null };
    const display = r.userName || r.userEmail || `User #${r.redeemedByUserId ?? r.redeemedByEmployerId ?? "?"}`;
    expect(display).toBe("alex@school.edu");
  });

  it("falls back to User #id when both name and email are null", () => {
    const r = { userName: null, userEmail: null, redeemedByUserId: 42, redeemedByEmployerId: null };
    const display = r.userName || r.userEmail || `User #${r.redeemedByUserId ?? r.redeemedByEmployerId ?? "?"}`;
    expect(display).toBe("User #42");
  });

  it("uses employer id when user id is null", () => {
    const r = { userName: null, userEmail: null, redeemedByUserId: null, redeemedByEmployerId: 7 };
    const display = r.userName || r.userEmail || `User #${r.redeemedByUserId ?? r.redeemedByEmployerId ?? "?"}`;
    expect(display).toBe("User #7");
  });

  it("formats discount label for percentage type", () => {
    const discountType = "percentage";
    const discountValue = 20;
    const label = discountType === "percentage" ? `${discountValue}% off` : `$${discountValue} AUD off`;
    expect(label).toBe("20% off");
  });

  it("formats discount label for fixed type", () => {
    const discountType = "fixed";
    const discountValue = 5;
    const label = discountType === "percentage" ? `${discountValue}% off` : `$${discountValue} AUD off`;
    expect(label).toBe("$5 AUD off");
  });
});
