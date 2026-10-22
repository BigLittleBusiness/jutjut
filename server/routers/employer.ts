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
  createJobWithCreditSpend,
  adjustCredits,
  getTransactionHistory,
  getPromoCode,
  incrementPromoCodeUsage,
  recordPromoRedemption,
  getJobsByPostedUser,
  getJobById,
  getJobAnalyticsForUser,
  getJobAnalyticsDetail,
  applyToJob,
  recordJobView,
  updateUserPrivacy,
  getDb,
} from "../db";
import {
  createCharge,
  createCustomer,
  getCreditPack,
  calculateChargeAmount,
  CREDIT_PACKS,
  type CreditPackId,
} from "../pinpayments";
import { jobs, users, transactions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendEmailSilent } from "../emailService";
import { createNotification, getActiveGateway } from "../db.admin";
import { getStudentKitForSchool } from "../db.school";
import { logger } from "../_core/logger";

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
        contactPhone: z.string().max(32).optional().nullable(),
        industry: z.string().max(128).optional().nullable(),
        postcode: z.string().max(8).optional().nullable(),
        visibleToSchools: z.boolean().optional(),
        acceptsWorkExperience: z.boolean().optional(),
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
        cardToken: z.string().optional(),
        paymentMethodId: z.string().optional(),
        saveCard: z.boolean().default(false),
        promoCode: z.string().optional(),
        includeGst: z.boolean().default(false),
        ipAddress: z.string().default("0.0.0.0"),
      })
    )
    .mutation(async () => {
      // Do not charge a card or grant credits until the end-to-end provider
      // contract is verified: idempotent settlement, signed webhooks, provider
      // refunds and reconciliation must all be in place together.
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Credit purchases are temporarily unavailable while payment settlement is being verified. No card was charged and no credits were added.",
      });
    }),

  /** Payment configuration is retained for administrators, but checkout is intentionally disabled. */
  activeGateway: protectedProcedure.query(async () => ({
    gateway: await getActiveGateway(),
    purchasesEnabled: false,
  })),

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

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const featuredUntil = input.isFeatured
        ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
        : null;
      const posted = await createJobWithCreditSpend({
        employerId: employerProfile.id,
        postedByUserId: ctx.user.id,
        title: input.title,
        // A listing is always attributed to the verified business profile, not a browser-provided name.
        employer: employerProfile.businessName,
        description: input.description ?? null,
        wage: input.wage ?? null,
        distance: input.distance ?? null,
        type: input.type,
        noCoverLetter: input.noCoverLetter,
        isFeatured: input.isFeatured,
        featuredUntil,
        expiresAt,
        now,
      });
      if (!posted.success) {
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message: "You need at least one available credit to post a job. Your balance was not changed.",
        });
      }
      const { jobId, newBalance } = posted;

      // Send job post confirmation email
      void sendEmailSilent({
        to: ctx.user.email ?? "",
        templateId: "job_post_confirmation",
        userId: ctx.user.id,
        data: {
          employer_name: input.employer,
          job_title: input.title,
          job_type: input.type,
          expires_date: expiresAt.toLocaleDateString("en-AU"),
          job_url: `${process.env.APP_BASE_URL ?? "https://jutjut.com.au"}/jobs/${jobId}`,
          dashboard_url: `${process.env.APP_BASE_URL ?? "https://jutjut.com.au"}/employer`,
          new_balance: String(newBalance),
        },
      });

      // In-app notification: job post confirmed
      void createNotification({
        userId: ctx.user.id,
        type: "job_post",
        title: `Job posted: ${input.title}`,
        body: `Your listing is live and expires ${expiresAt.toLocaleDateString("en-AU")}. Credits remaining: ${newBalance}.`,
        link: "/employer",
      });
      return { jobId, expiresAt, newBalance };
    }),

  recordView: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const job = await getJobById(input.jobId);
      if (!job || !job.isActive || (job.expiresAt && job.expiresAt <= new Date())) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found or no longer available." });
      }
      await recordJobView(input.jobId, ctx.user.id);
      return { ok: true };
    }),

  analytics: protectedProcedure.query(async ({ ctx }) => {
    return getJobAnalyticsForUser(ctx.user.id);
  }),

  analyticsDetail: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const detail = await getJobAnalyticsDetail(input.jobId, ctx.user.id);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found or access denied." });
      return detail;
    }),

  applyForJob: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      coverLetter: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const job = await getJobById(input.jobId);
      if (!job || !job.isActive || (job.expiresAt && job.expiresAt <= new Date())) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found or no longer available." });
      }
      if (job.postedByUserId === ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot apply to your own job listing." });
      }
      const userRows = await db.select({ shareContactWithEmployers: users.shareContactWithEmployers }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const contactShared = userRows[0]?.shareContactWithEmployers ?? false;
      const result = await applyToJob({
        jobId: input.jobId,
        userId: ctx.user.id,
        coverLetter: input.coverLetter ?? null,
        contactSharedAtApplication: contactShared,
      });
      if (result.alreadyApplied) throw new TRPCError({ code: "CONFLICT", message: "You have already applied to this job." });
      return { success: true };
    }),
});

// ─── Privacy settings ─────────────────────────────────────────────────────────

const privacyRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
    const rows = await db.select({
      shareContactWithEmployers: users.shareContactWithEmployers,
      yearLevel: users.yearLevel,
      postcode: users.postcode,
    }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
    return rows[0] ?? { shareContactWithEmployers: false, yearLevel: null, postcode: null };
  }),
  update: protectedProcedure
    .input(z.object({
      shareContactWithEmployers: z.boolean().optional(),
      yearLevel: z.string().max(64).nullable().optional(),
      postcode: z.string().max(10).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateUserPrivacy(ctx.user.id, input);
      return { success: true };
    }),

  /**
   * Returns the student's own profile exactly as an employer would see it.
   * Respects the current shareContactWithEmployers flag so the student
   * can verify what is and isn't visible before applying.
   */
  previewProfile: protectedProcedure.query(async ({ ctx }) => {
    const kit = await getStudentKitForSchool(ctx.user.id);
    if (!kit) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found." });

    const shareContact = kit.user.shareContactWithEmployers ?? false;

    return {
      shareContact,
      // Identity — only visible to employers when shareContact is true
      name: shareContact ? (kit.user.name ?? null) : null,
      email: shareContact ? (kit.user.email ?? null) : null,
      // Profile enrichment — visible in anonymised analytics only
      yearLevel: kit.user.yearLevel ?? null,
      postcode: kit.user.postcode ?? null,
      // Kit — always visible to employers
      credentials: kit.credentials.map((c) => ({
        id: c.id,
        title: c.title,
        issuer: c.issuer,
        issuedAt: c.issuedAt,
        type: c.type,
      })),
      vouches: kit.vouches.map((v) => ({
        id: v.id,
        voucherName: v.voucherName,
        voucherTitle: v.voucherTitle ?? null,
        voucherOrg: v.voucherOrg ?? null,
        message: v.message ?? null,
        status: v.status,
        createdAt: v.createdAt,
      })),
      reportCards: kit.reportCards.map((r) => ({
        id: r.id,
        aiGrade: r.aiGrade ?? null,
        aiGpa: r.aiGpa ?? null,
        verified: r.verified,
        createdAt: r.createdAt,
      })),
      applications: kit.applications.map((a) => ({
        id: a.id,
        jobTitle: a.jobTitle,
        employer: a.employer,
        status: a.status,
        createdAt: a.createdAt,
      })),
    };
  }),
});

// ─── Compose employer router ──────────────────────────────────────────────────

export const employerRouter = router({
  profile: employerProfileRouter,
  credits: creditsRouter,
  jobs: employerJobsRouter,
  privacy: privacyRouter,
});
