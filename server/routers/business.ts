/**
 * Business router — Drop retailers can manage their drops and view analytics.
 * A "business" user is any authenticated user who has created at least one drop.
 * The businessId on the drops table stores the userId of the creator.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { getDropAnalyticsDetail, recordDropView } from "../db";
import { drops, dropClaims } from "../../drizzle/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

// ─── Drops management ─────────────────────────────────────────────────────────

const dropsRouter = router({
  /** List all drops owned by the authenticated user */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
    return db
      .select()
      .from(drops)
      .where(eq(drops.businessId, ctx.user.id))
      .orderBy(desc(drops.createdAt));
  }),

  /** Submit a new drop for admin approval */
  submit: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      maxClaims: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const [result] = await db.insert(drops).values({
        title: input.title,
        description: input.description ?? null,
        businessId: ctx.user.id,
        status: "draft",
        claimCount: 0,
        maxClaims: input.maxClaims ?? null,
        sponsorshipFee: 0,
        impressions: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const dropId = (result as { insertId: number }).insertId;
      return { dropId };
    }),

  /** Record a view on a drop (called when a student views the drop card) */
  recordView: protectedProcedure
    .input(z.object({
      dropId: z.number(),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await recordDropView({
        dropId: input.dropId,
        studentId: ctx.user.id,
        sessionId: input.sessionId ?? null,
      });
      return { ok: true };
    }),

  /** Claim a drop — student redeems the offer */
  claim: protectedProcedure
    .input(z.object({ dropId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      // Check drop exists and is active
      const dropRows = await db.select().from(drops).where(eq(drops.id, input.dropId)).limit(1);
      const drop = dropRows[0];
      if (!drop || drop.status !== "active") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Drop not found or not active." });
      }
      // Check max claims
      if (drop.maxClaims !== null && drop.claimCount >= drop.maxClaims) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This drop has reached its maximum number of claims." });
      }
      // Check duplicate claim
      const existing = await db
        .select({ id: dropClaims.id })
        .from(dropClaims)
        .where(and(eq(dropClaims.dropId, input.dropId), eq(dropClaims.userId, ctx.user.id)))
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "You have already claimed this drop." });
      }
      await db.insert(dropClaims).values({
        dropId: input.dropId,
        userId: ctx.user.id,
        claimedAt: new Date(),
      });
      // Increment claim count
      const { sql } = await import("drizzle-orm");
      await db.update(drops).set({ claimCount: sql`claim_count + 1` }).where(eq(drops.id, input.dropId));
      return { success: true };
    }),

  /** Full analytics detail for a single drop — business owner only */
  analytics: protectedProcedure
    .input(z.object({ dropId: z.number() }))
    .query(async ({ ctx, input }) => {
      const detail = await getDropAnalyticsDetail(input.dropId, ctx.user.id);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Drop not found or access denied." });
      return detail;
    }),

  /** Summary list of all drops with key metrics for the dashboard overview */
  analyticsSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
    const ownedDrops = await db
      .select({
        id: drops.id,
        title: drops.title,
        status: drops.status,
        impressions: drops.impressions,
        claimCount: drops.claimCount,
        sponsorshipFee: drops.sponsorshipFee,
        scheduledDate: drops.scheduledDate,
        createdAt: drops.createdAt,
      })
      .from(drops)
      .where(eq(drops.businessId, ctx.user.id))
      .orderBy(desc(drops.createdAt));

    return ownedDrops.map(d => {
      const claimRate = d.impressions > 0 ? Math.round((d.claimCount / d.impressions) * 10000) / 100 : 0;
      const costPerClaim = d.claimCount > 0 ? Math.round((d.sponsorshipFee / 100 / d.claimCount) * 100) / 100 : 0;
      return {
        id: d.id,
        title: d.title,
        status: d.status,
        impressions: d.impressions,
        claims: d.claimCount,
        claimRate,
        sponsorshipFeeDollars: d.sponsorshipFee / 100,
        costPerClaim,
        scheduledDate: d.scheduledDate,
        createdAt: d.createdAt,
      };
    });
  }),
});

// ─── Compose business router ──────────────────────────────────────────────────

export const businessRouter = router({
  drops: dropsRouter,
});
