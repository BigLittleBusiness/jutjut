/**
 * Student router — public-facing data for authenticated students.
 * Exposes active jobs, active drops, and the social feed.
 */
import { z } from "zod";
import { desc, eq, and, gt, isNull, or } from "drizzle-orm";
import { getDb } from "../db";
import { jobs, drops, posts, users } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

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
