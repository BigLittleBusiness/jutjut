/**
 * Admin router — promo code management, user management.
 * All procedures require admin role.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAllPromoCodes,
  createPromoCode,
  updatePromoCode,
} from "../db";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
  }
  return next({ ctx });
});

export const adminRouter = router({
  promoCodes: router({
    list: adminProcedure.query(async () => {
      return getAllPromoCodes();
    }),

    create: adminProcedure
      .input(
        z.object({
          code: z.string().min(2).max(64).regex(/^[A-Z0-9_-]+$/i, "Code must be alphanumeric"),
          discountType: z.enum(["fixed", "percentage"]),
          discountValue: z.number().int().min(1),
          bonusCredits: z.number().int().min(0).default(0),
          maxUses: z.number().int().min(1).optional().nullable(),
          expiresAt: z.string().datetime().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createPromoCode({
          code: input.code,
          discountType: input.discountType,
          discountValue: input.discountValue,
          bonusCredits: input.bonusCredits,
          maxUses: input.maxUses ?? null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          createdByUserId: ctx.user.id,
        });
        return { ok: true };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number().int(),
          isActive: z.boolean().optional(),
          maxUses: z.number().int().min(1).optional().nullable(),
          expiresAt: z.string().datetime().optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        await updatePromoCode(input.id, {
          isActive: input.isActive,
          maxUses: input.maxUses ?? null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        });
        return { ok: true };
      }),
  }),
});
