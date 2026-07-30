/**
 * Student router — public-facing data for authenticated students.
 * Exposes active jobs, active drops, and the social feed.
 * Also provides QR code generation and status polling for The Drop redemption system.
 */
import { z } from "zod";
import { desc, eq, and, gt, isNull, or } from "drizzle-orm";
import { getDb } from "../db";
import { jobs, drops, posts, users, dropClaims, dropRedemptionTokens } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

/** Token TTL in milliseconds (10 minutes) */
const TOKEN_TTL_MS = 10 * 60 * 1000;

// ─── Public Jobs (student-facing) ────────────────────────────────────────────
const studentJobsRouter = router({
  /** List all active, non-expired jobs for the Job Board */
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
    const now = new Date();
    return db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.isActive, true),
          or(isNull(jobs.expiresAt), gt(jobs.expiresAt, now))
        )
      )
      .orderBy(desc(jobs.isFeatured), desc(jobs.createdAt))
      .limit(100);
  }),
});

// ─── Public Drops (student-facing) ───────────────────────────────────────────
const studentDropsRouter = router({
  /** List all active drops for The Drop page */
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
    return db
      .select()
      .from(drops)
      .where(eq(drops.status, "active"))
      .orderBy(desc(drops.createdAt))
      .limit(50);
  }),

  /**
   * Generate (or return existing active) QR token for a drop claim.
   *
   * Per-listing claim policy:
   *   - Each distinct drop listing is a fresh claim opportunity.
   *   - If the student has already claimed this drop, we look for an existing
   *     active (non-expired, non-redeemed) token and return it.
   *   - If no active token exists, we create a new claim + token.
   *   - If the student already has a redeemed claim for this listing, they
   *     cannot claim again (the offer was already used for this listing).
   */
  generateQR: protectedProcedure
    .input(z.object({ dropId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      // 1. Verify drop is active
      const dropRows = await db
        .select()
        .from(drops)
        .where(eq(drops.id, input.dropId))
        .limit(1);
      const drop = dropRows[0];
      if (!drop || drop.status !== "active") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Drop not found or not active." });
      }

      // 2. Check max claims
      if (drop.maxClaims !== null && drop.claimCount >= drop.maxClaims) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This drop has reached its maximum number of claims.",
        });
      }

      // 3. Check for existing claim on this listing
      const existingClaims = await db
        .select()
        .from(dropClaims)
        .where(and(eq(dropClaims.dropId, input.dropId), eq(dropClaims.userId, ctx.user.id)))
        .limit(1);

      const existingClaim = existingClaims[0] ?? null;

      // 4. If already redeemed, deny
      if (existingClaim?.redeemedAt) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You have already redeemed this drop.",
        });
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);

      // 5. If claim exists but not yet redeemed, look for an active token
      if (existingClaim) {
        const activeTokens = await db
          .select()
          .from(dropRedemptionTokens)
          .where(
            and(
              eq(dropRedemptionTokens.claimId, existingClaim.id),
              isNull(dropRedemptionTokens.redeemedAt),
              gt(dropRedemptionTokens.expiresAt, now)
            )
          )
          .orderBy(desc(dropRedemptionTokens.createdAt))
          .limit(1);

        if (activeTokens.length > 0) {
          // Return the existing active token
          const t = activeTokens[0];
          return {
            token: t.token,
            expiresAt: t.expiresAt,
            claimId: existingClaim.id,
            redeemUrl: `/api/redeem/${t.token}`,
          };
        }

        // Existing claim but no active token — issue a fresh token
        const newToken = crypto.randomUUID();
        await db.insert(dropRedemptionTokens).values({
          token: newToken,
          dropId: input.dropId,
          userId: ctx.user.id,
          claimId: existingClaim.id,
          expiresAt,
          createdAt: now,
        });
        return {
          token: newToken,
          expiresAt,
          claimId: existingClaim.id,
          redeemUrl: `/api/redeem/${newToken}`,
        };
      }

      // 6. No existing claim — create claim + token atomically
      const { sql } = await import("drizzle-orm");
      const [claimResult] = await db.insert(dropClaims).values({
        dropId: input.dropId,
        userId: ctx.user.id,
        claimedAt: now,
      });
      const claimId = (claimResult as { insertId: number }).insertId;

      // Increment claim count
      await db
        .update(drops)
        .set({ claimCount: sql`claim_count + 1` })
        .where(eq(drops.id, input.dropId));

      // Create token
      const newToken = crypto.randomUUID();
      await db.insert(dropRedemptionTokens).values({
        token: newToken,
        dropId: input.dropId,
        userId: ctx.user.id,
        claimId,
        expiresAt,
        createdAt: now,
      });

      return {
        token: newToken,
        expiresAt,
        claimId,
        redeemUrl: `/api/redeem/${newToken}`,
      };
    }),

  /**
   * Refresh an expired (or soon-to-expire) QR token.
   * The student must have an existing, unredeemed claim for this drop.
   */
  refreshQR: protectedProcedure
    .input(z.object({ dropId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      // Verify drop is still active
      const dropRows = await db
        .select({ status: drops.status })
        .from(drops)
        .where(eq(drops.id, input.dropId))
        .limit(1);
      if (!dropRows[0] || dropRows[0].status !== "active") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Drop not found or not active." });
      }

      // Find existing unredeemed claim
      const claimRows = await db
        .select()
        .from(dropClaims)
        .where(
          and(
            eq(dropClaims.dropId, input.dropId),
            eq(dropClaims.userId, ctx.user.id),
            isNull(dropClaims.redeemedAt)
          )
        )
        .limit(1);

      if (claimRows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active claim found. Please claim the drop first.",
        });
      }

      const claim = claimRows[0];
      const now = new Date();
      const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
      const newToken = crypto.randomUUID();

      await db.insert(dropRedemptionTokens).values({
        token: newToken,
        dropId: input.dropId,
        userId: ctx.user.id,
        claimId: claim.id,
        expiresAt,
        createdAt: now,
      });

      return {
        token: newToken,
        expiresAt,
        claimId: claim.id,
        redeemUrl: `/api/redeem/${newToken}`,
      };
    }),

  /**
   * Check the redemption status of a token.
   * Polled every 3 seconds by the QR display UI so it can auto-dismiss
   * when the staff member marks the token as redeemed.
   */
  checkRedemptionStatus: protectedProcedure
    .input(z.object({ token: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      const tokenRows = await db
        .select()
        .from(dropRedemptionTokens)
        .where(
          and(
            eq(dropRedemptionTokens.token, input.token),
            eq(dropRedemptionTokens.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (tokenRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Token not found." });
      }

      const t = tokenRows[0];
      const now = new Date();

      if (t.redeemedAt) {
        return { status: "redeemed" as const, redeemedAt: t.redeemedAt };
      }
      if (now > t.expiresAt) {
        return { status: "expired" as const, expiresAt: t.expiresAt };
      }
      return { status: "active" as const, expiresAt: t.expiresAt };
    }),
});

// ─── Social Feed ─────────────────────────────────────────────────────────────
const feedRouter = router({
  /** List the most recent feed posts (global feed, no squad filter) */
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
    const rows = await db
      .select({
        id: posts.id,
        content: posts.content,
        isAnonymous: posts.isAnonymous,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        createdAt: posts.createdAt,
        authorName: users.name,
        authorId: users.id,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .where(isNull(posts.squadId)) // global feed only
      .orderBy(desc(posts.createdAt))
      .limit(30);
    return rows;
  }),

  /** Create a new feed post */
  create: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(2000),
        isAnonymous: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const [result] = await db.insert(posts).values({
        userId: ctx.user.id,
        content: input.content,
        isAnonymous: input.isAnonymous,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { id: (result as { insertId: number }).insertId };
    }),
});

export const studentRouter = router({
  jobs: studentJobsRouter,
  drops: studentDropsRouter,
  feed: feedRouter,
});
