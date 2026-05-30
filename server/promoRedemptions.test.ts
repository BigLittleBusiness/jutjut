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

describe("Financial summary calculations", () => {
  const avgPackCents = (1500 + 5000) / 2; // 3250

  function calcSavedCents(discountType: "percentage" | "fixed", discountValue: number) {
    if (discountType === "percentage") {
      return Math.round(avgPackCents * (Math.min(discountValue, 100) / 100));
    }
    return discountValue * 100;
  }

  function calcRevenueCents(discountType: "percentage" | "fixed", discountValue: number) {
    if (discountType === "percentage") {
      const saving = Math.round(avgPackCents * (Math.min(discountValue, 100) / 100));
      return Math.max(0, avgPackCents - saving);
    }
    const saving = Math.min(discountValue * 100, avgPackCents);
    return Math.max(0, avgPackCents - saving);
  }

  it("calculates total saved for a single 20% redemption", () => {
    const saved = calcSavedCents("percentage", 20);
    expect(saved).toBe(Math.round(3250 * 0.2)); // 650
  });

  it("calculates total saved for a single $5 fixed redemption", () => {
    const saved = calcSavedCents("fixed", 5);
    expect(saved).toBe(500);
  });

  it("calculates revenue for a 20% discount redemption", () => {
    const rev = calcRevenueCents("percentage", 20);
    expect(rev).toBe(3250 - Math.round(3250 * 0.2)); // 2600
  });

  it("calculates revenue for a $5 fixed discount redemption", () => {
    const rev = calcRevenueCents("fixed", 5);
    expect(rev).toBe(3250 - 500); // 2750
  });

  it("sums total saved across multiple redemptions", () => {
    const redemptions = [
      { discountType: "percentage" as const, discountValue: 20, bonusCreditsAwarded: 0 },
      { discountType: "fixed" as const, discountValue: 5, bonusCreditsAwarded: 2 },
      { discountType: "percentage" as const, discountValue: 10, bonusCreditsAwarded: 0 },
    ];
    const totalSaved = redemptions.reduce((sum, r) => sum + calcSavedCents(r.discountType, r.discountValue), 0);
    const expected = Math.round(3250 * 0.2) + 500 + Math.round(3250 * 0.1);
    expect(totalSaved).toBe(expected);
  });

  it("sums total revenue across multiple redemptions", () => {
    const redemptions = [
      { discountType: "percentage" as const, discountValue: 20 },
      { discountType: "fixed" as const, discountValue: 5 },
    ];
    const totalRev = redemptions.reduce((sum, r) => sum + calcRevenueCents(r.discountType, r.discountValue), 0);
    const expected = (3250 - Math.round(3250 * 0.2)) + (3250 - 500);
    expect(totalRev).toBe(expected);
  });

  it("sums bonus credits issued across redemptions", () => {
    const redemptions = [
      { bonusCreditsAwarded: 2 },
      { bonusCreditsAwarded: 0 },
      { bonusCreditsAwarded: 3 },
    ];
    const total = redemptions.reduce((sum, r) => sum + (r.bonusCreditsAwarded ?? 0), 0);
    expect(total).toBe(5);
  });

  it("clamps 100% discount so revenue is zero", () => {
    const rev = calcRevenueCents("percentage", 100);
    expect(rev).toBe(0);
  });

  it("clamps oversized fixed discount so revenue is zero", () => {
    const rev = calcRevenueCents("fixed", 100); // $100 > $32.50 avg
    expect(rev).toBe(0);
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
