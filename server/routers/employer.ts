/**
 * Employer router — credit purchases, job posting, promo codes, analytics.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getEmployerByUserId,
  upsertEmployer,
  setEmployerPaymentToken,
  getCreditBalance,
  adjustCredits,
  getTransactionHistory,
  getPromoCode,
  incrementPromoCodeUsage,
  getJobsByPostedUser,
  getJobById,
  getJobAnalyticsForUser,
  recordJobView,
} from "../db";
import {
  createCharge,
  createCustomer,
  getCreditPack,
  calculateChargeAmount,
  CREDIT_PACKS,
  type CreditPackId,
} from "../pinpayments";
import { getDb } from "../db";
import { jobs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Employer profile ─────────────────────────────────────────────────────────

const employerProfileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return getEmployerByUserId(ctx.user.id);
  }),

  upsert: protectedProcedure
    .input(
      z.object({
        businessName: z.string().min(1).max(255),
        abn: z.string().max(16).optional().nullable(),
        contactEmail: z.string().email().optional().nullable(),
        isGstRegistered: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return upsertEmployer({ userId: ctx.user.id, ...input });
    }),
});

// ─── Credits ─────────────────────────────────────────────────────────────────

const creditsRouter = router({
  balance: protectedProcedure.query(async ({ ctx }) => {
    const employer = await getEmployerByUserId(ctx.user.id);
    if (!employer) return { balance: 0 };
    const balance = await getCreditBalance(employer.id);
    return { balance };
  }),

  packs: protectedProcedure.query(() => {
    return CREDIT_PACKS.map(p => ({
      id: p.id,
      credits: p.credits,
      priceAud: p.priceAud / 100, // return as dollars
      priceCents: p.priceAud,
    }));
  }),

  history: protectedProcedure.query(async ({ ctx }) => {
    const employer = await getEmployerByUserId(ctx.user.id);
    if (!employer) return [];
    return getTransactionHistory(employer.id);
  }),

  validatePromo: protectedProcedure
    .input(z.object({ code: z.string(), packId: z.string() }))
    .mutation(async ({ input }) => {
      const promo = await getPromoCode(input.code);
      if (!promo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired promo code." });
      }
      const pack = getCreditPack(input.packId as CreditPackId);
      const { subtotalCents, gstCents, totalCents } = calculateChargeAmount({
        baseAmountCents: pack.priceAud,
        discountType: promo.discountType,
        discountValue: promo.discountType === "fixed" ? promo.discountValue * 100 : promo.discountValue,
        includeGst: false, // GST added at final step based on employer setting
      });
      return {
        promoId: promo.id,
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        bonusCredits: promo.bonusCredits,
        subtotalCents,
        gstCents,
        totalCents,
        originalCents: pack.priceAud,
        savingsCents: pack.priceAud - subtotalCents,
      };
    }),

  purchase: protectedProcedure
    .input(
      z.object({
        packId: z.enum(["pack_1", "pack_5"]),
        cardToken: z.string().min(1),
        saveCard: z.boolean().default(false),
        promoCode: z.string().optional(),
        includeGst: z.boolean().default(false),
        ipAddress: z.string().default("0.0.0.0"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Ensure employer profile exists
      let employer = await getEmployerByUserId(ctx.user.id);
      if (!employer) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Please complete your employer profile before purchasing credits.",
        });
      }

      const pack = getCreditPack(input.packId);

      // Validate promo code if provided
      let promo = input.promoCode ? await getPromoCode(input.promoCode) : null;

      const { subtotalCents, gstCents, totalCents } = calculateChargeAmount({
        baseAmountCents: pack.priceAud,
        discountType: promo?.discountType,
        discountValue:
          promo?.discountType === "fixed"
            ? promo.discountValue * 100
            : promo?.discountValue,
        includeGst: input.includeGst,
      });

      // Optionally save card as customer token for auto-repost
      let chargeToken = input.cardToken;
      if (input.saveCard && ctx.user.email) {
        try {
          const customer = await createCustomer({
            email: ctx.user.email,
            cardToken: input.cardToken,
          });
          await setEmployerPaymentToken(employer.id, customer.token);
          chargeToken = customer.token;
          const refreshed = await getEmployerByUserId(ctx.user.id);
          if (refreshed) employer = refreshed;
        } catch (err) {
          // Non-fatal: fall back to one-time card token
          console.warn("[PinPayments] Could not create customer:", err);
        }
      }

      const employerId = employer.id;

      // Create the charge
      const charge = await createCharge({
        amount: totalCents,
        description: `JutJut ${pack.credits} credit${pack.credits > 1 ? "s" : ""} (${input.packId})`,
        email: ctx.user.email ?? "noreply@jutjut.com.au",
        ipAddress: input.ipAddress,
        cardToken: chargeToken,
        metadata: {
          employer_id: String(employerId),
          credit_pack_id: input.packId,
          credit_pack_size: String(pack.credits),
          promo_code: promo?.code ?? "",
          user_id: String(ctx.user.id),
        },
      });

      if (!charge.success) {
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message: `Payment declined: ${charge.status_message}`,
        });
      }

      // Add credits
      await adjustCredits({
        employerId,
        amount: pack.credits,
        type: "purchase",
        reference: charge.token,
        description: `Purchased ${pack.credits} credit(s) — ${input.packId}`,
      });

      // Add bonus credits from promo
      if (promo && promo.bonusCredits > 0) {
        await adjustCredits({
          employerId,
          amount: promo.bonusCredits,
          type: "promo_bonus",
          reference: promo.code,
          description: `Bonus credits from promo ${promo.code}`,
        });
        await incrementPromoCodeUsage(promo.id);
      } else if (promo) {
        await incrementPromoCodeUsage(promo.id);
      }

      const newBalance = await getCreditBalance(employerId);

      return {
        success: true,
        chargeToken: charge.token,
        creditsAdded: pack.credits + (promo?.bonusCredits ?? 0),
        newBalance,
        subtotalCents,
        gstCents,
        totalCents,
      };
    }),
});

// ─── Jobs ─────────────────────────────────────────────────────────────────────

const employerJobsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getJobsByPostedUser(ctx.user.id);
  }),

  post: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        employer: z.string().min(1).max(255),
        description: z.string().optional(),
        wage: z.string().max(64).optional(),
        distance: z.string().max(64).optional(),
        type: z.enum(["casual", "part-time", "full-time", "volunteer"]).default("casual"),
        noCoverLetter: z.boolean().default(false),
        isFeatured: z.boolean().default(false),
        autoRepostEnabled: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const employerProfile = await getEmployerByUserId(ctx.user.id);
      if (!employerProfile) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Please complete your employer profile before posting a job.",
        });
      }

      const balance = await getCreditBalance(employerProfile.id);
      if (balance < 1) {
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message: "You need at least 1 credit to post a job. Please buy credits.",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const featuredUntil = input.isFeatured
        ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
        : null;
      const autoRepostNextDate = input.autoRepostEnabled
        ? new Date(expiresAt.getTime() + 24 * 60 * 60 * 1000) // expiry + 1 day
        : null;

      const [result] = await db.insert(jobs).values({
        title: input.title,
        employer: input.employer,
        description: input.description ?? null,
        wage: input.wage ?? null,
        distance: input.distance ?? null,
        type: input.type,
        noCoverLetter: input.noCoverLetter,
        isActive: true,
        postedByUserId: ctx.user.id,
        isFeatured: input.isFeatured,
        featuredUntil,
        expiresAt,
        autoRepostEnabled: input.autoRepostEnabled,
        autoRepostNextDate,
        viewCount: 0,
        applyCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      const jobId = (result as { insertId: number }).insertId;

      // Deduct 1 credit
      await adjustCredits({
        employerId: employerProfile.id,
        amount: -1,
        type: "job_post",
        reference: String(jobId),
        description: `Job post: ${input.title}${input.isFeatured ? " (featured)" : ""}`,
      });

      return { jobId, expiresAt, newBalance: balance - 1 };
    }),

  recordView: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await recordJobView(input.jobId, ctx.user.id);
      return { ok: true };
    }),

  analytics: protectedProcedure.query(async ({ ctx }) => {
    return getJobAnalyticsForUser(ctx.user.id);
  }),
});

// ─── Compose employer router ──────────────────────────────────────────────────

export const employerRouter = router({
  profile: employerProfileRouter,
  credits: creditsRouter,
  jobs: employerJobsRouter,
});
