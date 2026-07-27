/**
 * Teacher / Coach portal router.
 *
 * A "teacher" is any authenticated user who has received vouch requests
 * addressed to their email address. No separate account type is required —
 * teachers sign in with Manus OAuth and see requests sent to their email.
 */
import { z } from "zod";
import { eq, desc, and, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { vouches, users } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

/** Helper: get the authenticated teacher's email */
async function getTeacherEmail(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.email ?? null;
}

export const teacherRouter = router({
  vouches: router({
    /** Pending vouch requests addressed to this teacher's email */
    pending: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const email = await getTeacherEmail(ctx.user.id);
      if (!email) return [];

      const rows = await db
        .select({
          id: vouches.id,
          skillName: vouches.skillName,
          message: vouches.message,
          status: vouches.status,
          createdAt: vouches.createdAt,
          studentUserId: vouches.studentUserId,
        })
        .from(vouches)
        .where(and(eq(vouches.voucherEmail, email), eq(vouches.status, "pending")))
        .orderBy(desc(vouches.createdAt));

      const studentIds = Array.from(new Set(rows.map(r => r.studentUserId)));
      let studentMap: Record<number, string> = {};
      if (studentIds.length > 0) {
        const studentRows = await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, studentIds));
        studentMap = Object.fromEntries(studentRows.map(s => [s.id, s.name ?? "Unknown"]));
      }

      return rows.map(r => ({
        id: r.id,
        skill: r.skillName ?? "Skill",
        message: r.message,
        status: r.status,
        createdAt: r.createdAt,
        studentName: studentMap[r.studentUserId] ?? null,
      }));
    }),

    /** All resolved (approved/declined) vouch requests for this teacher */
    history: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const email = await getTeacherEmail(ctx.user.id);
      if (!email) return [];

      const rows = await db
        .select({
          id: vouches.id,
          skillName: vouches.skillName,
          status: vouches.status,
          createdAt: vouches.createdAt,
          studentUserId: vouches.studentUserId,
        })
        .from(vouches)
        .where(and(eq(vouches.voucherEmail, email), inArray(vouches.status, ["verified", "rejected"])))
        .orderBy(desc(vouches.createdAt));

      const studentIds = Array.from(new Set(rows.map(r => r.studentUserId)));
      let studentMap: Record<number, string> = {};
      if (studentIds.length > 0) {
        const studentRows = await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, studentIds));
        studentMap = Object.fromEntries(studentRows.map(s => [s.id, s.name ?? "Unknown"]));
      }

      return rows.map(r => ({
        id: r.id,
        skill: r.skillName ?? "Skill",
        status: r.status,
        createdAt: r.createdAt,
        studentName: studentMap[r.studentUserId] ?? null,
      }));
    }),

    /** Approve a vouch request */
    approve: protectedProcedure
      .input(z.object({ vouchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
        const email = await getTeacherEmail(ctx.user.id);
        if (!email) throw new TRPCError({ code: "UNAUTHORIZED", message: "No email on account." });
        const vouchRows = await db.select().from(vouches).where(eq(vouches.id, input.vouchId)).limit(1);
        const vouch = vouchRows[0];
        if (!vouch) throw new TRPCError({ code: "NOT_FOUND", message: "Vouch request not found." });
        if (vouch.voucherEmail !== email) throw new TRPCError({ code: "FORBIDDEN", message: "This vouch was not sent to your email." });
        await db.update(vouches).set({ status: "verified" }).where(eq(vouches.id, input.vouchId));
        return { success: true };
      }),

    /** Decline a vouch request */
    decline: protectedProcedure
      .input(z.object({ vouchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
        const email = await getTeacherEmail(ctx.user.id);
        if (!email) throw new TRPCError({ code: "UNAUTHORIZED", message: "No email on account." });
        const vouchRows = await db.select().from(vouches).where(eq(vouches.id, input.vouchId)).limit(1);
        const vouch = vouchRows[0];
        if (!vouch) throw new TRPCError({ code: "NOT_FOUND", message: "Vouch request not found." });
        if (vouch.voucherEmail !== email) throw new TRPCError({ code: "FORBIDDEN", message: "This vouch was not sent to your email." });
        await db.update(vouches).set({ status: "rejected" }).where(eq(vouches.id, input.vouchId));
        return { success: true };
      }),
  }),
});
