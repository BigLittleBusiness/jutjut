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

// ─── Date range filter logic ─────────────────────────────────────────────────

type MockRedemption = {
  id: number;
  redeemedAt: Date;
  discountType: "percentage" | "fixed";
  discountValue: number;
  bonusCreditsAwarded: number;
  userName: string | null;
  userEmail: string | null;
  redeemedByUserId: number | null;
  redeemedByEmployerId: number | null;
  chargeToken: string | null;
};

function filterByDateRange(
  redemptions: MockRedemption[],
  from?: Date,
  to?: Date
): MockRedemption[] {
  return redemptions.filter(r => {
    const d = new Date(r.redeemedAt);
    if (from && d < from) return false;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  });
}

function buildTrendData(redemptions: MockRedemption[]): { date: string; redemptions: number }[] {
  const counts: Record<string, number> = {};
  redemptions.forEach(r => {
    const day = new Date(r.redeemedAt).toLocaleDateString("en-CA");
    counts[day] = (counts[day] ?? 0) + 1;
  });
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, redemptions: count }));
}

const mockRedemptions: MockRedemption[] = [
  { id: 1, redeemedAt: new Date("2026-01-05T10:00:00Z"), discountType: "percentage", discountValue: 20, bonusCreditsAwarded: 0, userName: "Alice", userEmail: "alice@a.com", redeemedByUserId: 1, redeemedByEmployerId: null, chargeToken: null },
  { id: 2, redeemedAt: new Date("2026-01-10T14:00:00Z"), discountType: "fixed", discountValue: 5, bonusCreditsAwarded: 2, userName: "Bob", userEmail: "bob@b.com", redeemedByUserId: 2, redeemedByEmployerId: null, chargeToken: "ch_abc" },
  { id: 3, redeemedAt: new Date("2026-02-01T09:00:00Z"), discountType: "percentage", discountValue: 10, bonusCreditsAwarded: 0, userName: null, userEmail: "carol@c.com", redeemedByUserId: 3, redeemedByEmployerId: null, chargeToken: null },
  { id: 4, redeemedAt: new Date("2026-02-15T16:00:00Z"), discountType: "percentage", discountValue: 25, bonusCreditsAwarded: 1, userName: "Dave", userEmail: "dave@d.com", redeemedByUserId: 4, redeemedByEmployerId: null, chargeToken: "ch_xyz" },
];

describe("Date range filter", () => {
  it("returns all redemptions when no range is provided", () => {
    expect(filterByDateRange(mockRedemptions)).toHaveLength(4);
  });

  it("filters by from date only", () => {
    const result = filterByDateRange(mockRedemptions, new Date("2026-02-01"));
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toEqual([3, 4]);
  });

  it("filters by to date only", () => {
    const result = filterByDateRange(mockRedemptions, undefined, new Date("2026-01-31"));
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toEqual([1, 2]);
  });

  it("filters by both from and to", () => {
    const result = filterByDateRange(mockRedemptions, new Date("2026-01-08"), new Date("2026-01-31"));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("includes redemptions on the exact from date", () => {
    const result = filterByDateRange(mockRedemptions, new Date("2026-01-05"));
    expect(result.map(r => r.id)).toContain(1);
  });

  it("includes redemptions on the exact to date (end of day)", () => {
    const result = filterByDateRange(mockRedemptions, undefined, new Date("2026-01-10"));
    expect(result.map(r => r.id)).toContain(2);
  });

  it("returns empty array when range excludes all redemptions", () => {
    const result = filterByDateRange(mockRedemptions, new Date("2027-01-01"));
    expect(result).toHaveLength(0);
  });
});

describe("Trend data generation", () => {
  it("groups redemptions by day", () => {
    const trend = buildTrendData(mockRedemptions);
    expect(trend).toHaveLength(4); // 4 distinct days
  });

  it("sorts trend data chronologically", () => {
    const trend = buildTrendData(mockRedemptions);
    const dates = trend.map(t => t.date);
    expect(dates).toEqual([...dates].sort());
  });

  it("counts multiple redemptions on the same day correctly", () => {
    const sameDay: MockRedemption[] = [
      { ...mockRedemptions[0], id: 10, redeemedAt: new Date("2026-03-01T08:00:00Z") },
      { ...mockRedemptions[1], id: 11, redeemedAt: new Date("2026-03-01T15:00:00Z") },
      { ...mockRedemptions[2], id: 12, redeemedAt: new Date("2026-03-01T20:00:00Z") },
    ];
    const trend = buildTrendData(sameDay);
    expect(trend).toHaveLength(1);
    expect(trend[0].redemptions).toBe(3);
  });

  it("returns empty array for empty input", () => {
    expect(buildTrendData([])).toHaveLength(0);
  });

  it("returns single entry for single redemption", () => {
    const trend = buildTrendData([mockRedemptions[0]]);
    expect(trend).toHaveLength(1);
    expect(trend[0].redemptions).toBe(1);
  });
});

describe("CSV export content", () => {
  function buildCsvRows(redemptions: MockRedemption[], code: string) {
    const rows: string[][] = [
      ["Code", "User Name", "User Email", "Discount Type", "Discount Value", "Bonus Credits", "Charge Token", "Redeemed At"],
    ];
    redemptions.forEach(r => {
      rows.push([
        code,
        r.userName ?? "",
        r.userEmail ?? "",
        r.discountType,
        String(r.discountValue),
        String(r.bonusCreditsAwarded ?? 0),
        r.chargeToken ?? "",
        new Date(r.redeemedAt).toISOString(),
      ]);
    });
    return rows;
  }

  it("includes header row", () => {
    const rows = buildCsvRows(mockRedemptions, "LAUNCH20");
    expect(rows[0][0]).toBe("Code");
    expect(rows[0]).toHaveLength(8);
  });

  it("includes one data row per redemption", () => {
    const rows = buildCsvRows(mockRedemptions, "LAUNCH20");
    expect(rows).toHaveLength(mockRedemptions.length + 1); // +1 for header
  });

  it("fills empty string for null userName", () => {
    const rows = buildCsvRows([mockRedemptions[2]], "LAUNCH20"); // Carol has null userName
    expect(rows[1][1]).toBe("");
    expect(rows[1][2]).toBe("carol@c.com");
  });

  it("fills empty string for null chargeToken", () => {
    const rows = buildCsvRows([mockRedemptions[0]], "LAUNCH20"); // Alice has null chargeToken
    expect(rows[1][6]).toBe("");
  });

  it("includes chargeToken when present", () => {
    const rows = buildCsvRows([mockRedemptions[1]], "LAUNCH20"); // Bob has ch_abc
    expect(rows[1][6]).toBe("ch_abc");
  });

  it("uses ISO format for redeemedAt", () => {
    const rows = buildCsvRows([mockRedemptions[0]], "LAUNCH20");
    expect(rows[1][7]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
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
