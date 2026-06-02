/**
 * emailPreferences router — manage per-user email opt-in/out preferences.
 *
 * Procedures:
 *   email.preferences.get    — returns the current user's preferences (or defaults)
 *   email.preferences.update — update one or more preference flags
 *   email.preferences.unsubscribeAll — opt out of all marketing emails (one-click)
 *   email.preferences.unsubscribeByToken — public procedure for one-click unsubscribe links
 */

import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc.js";
import { getDb } from "../db.js";
import { emailPreferences } from "../../drizzle/schema.js";

const DEFAULT_PREFS = {
  marketingEmails: false,
  weeklyDigest: false,
  dropReminders: false,
};

export const emailPreferencesRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { ...DEFAULT_PREFS, userId: ctx.user.id };

    const [prefs] = await db
      .select()
      .from(emailPreferences)
      .where(eq(emailPreferences.userId, ctx.user.id))
      .limit(1);

    if (!prefs) return { ...DEFAULT_PREFS, userId: ctx.user.id };

    return {
      userId: prefs.userId,
      marketingEmails: prefs.marketingEmails,
      weeklyDigest: prefs.weeklyDigest,
      dropReminders: prefs.dropReminders,
    };
  }),

  update: protectedProcedure
    .input(
      z.object({
        marketingEmails: z.boolean().optional(),
        weeklyDigest: z.boolean().optional(),
        dropReminders: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Determine user type from role (simplified — extend if needed)
      const userType = ctx.user.role === "admin" ? "student" : "student";

      await db
        .insert(emailPreferences)
        .values({
          userId: ctx.user.id,
          userType,
          marketingEmails: input.marketingEmails ?? false,
          weeklyDigest: input.weeklyDigest ?? false,
          dropReminders: input.dropReminders ?? false,
        })
        .onDuplicateKeyUpdate({
          set: {
            ...(input.marketingEmails !== undefined && {
              marketingEmails: input.marketingEmails,
            }),
            ...(input.weeklyDigest !== undefined && {
              weeklyDigest: input.weeklyDigest,
            }),
            ...(input.dropReminders !== undefined && {
              dropReminders: input.dropReminders,
            }),
          },
        });

      return { success: true };
    }),

  unsubscribeAll: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    await db
      .insert(emailPreferences)
      .values({
        userId: ctx.user.id,
        userType: "student",
        marketingEmails: false,
        weeklyDigest: false,
        dropReminders: false,
      })
      .onDuplicateKeyUpdate({
        set: {
          marketingEmails: false,
          weeklyDigest: false,
          dropReminders: false,
        },
      });

    return { success: true };
  }),

  // Public procedure — used by one-click unsubscribe links in emails
  unsubscribeByToken: publicProcedure
    .input(
      z.object({
        uid: z.coerce.number().int().positive(),
        token: z.string().optional(), // reserved for future HMAC validation
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      await db
        .insert(emailPreferences)
        .values({
          userId: input.uid,
          userType: "student",
          marketingEmails: false,
          weeklyDigest: false,
          dropReminders: false,
        })
        .onDuplicateKeyUpdate({
          set: {
            marketingEmails: false,
            weeklyDigest: false,
            dropReminders: false,
          },
        });

      return { success: true };
    }),
});
