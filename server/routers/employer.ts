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
import {
  createStripeCharge,
  createOrUpdateStripeCustomer,
} from "../stripe";
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
        // PinPayments: card_token from Hosted Fields
        cardToken: z.string().optional(),
        // Stripe: PaymentMethod ID from Stripe Elements (pm_...)
        paymentMethodId: z.string().optional(),
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

      const employerId = employer.id;
      const activeGateway = await getActiveGateway();
      const chargeDescription = `JutJut ${pack.credits} credit${pack.credits > 1 ? "s" : ""} (${input.packId})`;
      const chargeMetadata = {
        employer_id: String(employerId),
        credit_pack_id: input.packId,
        credit_pack_size: String(pack.credits),
        promo_code: promo?.code ?? "",
        user_id: String(ctx.user.id),
      };

      let chargeRef: string; // charge token (Pin) or PaymentIntent ID (Stripe)
      let pinpaymentsChargeId: string | null = null;
      let stripeChargeId: string | null = null;

      if (activeGateway === "stripe") {
        // ── Stripe path ────────────────────────────────────────────────────────
        if (!input.paymentMethodId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A Stripe PaymentMethod ID is required when Stripe is the active gateway.",
          });
        }

        let pmId = input.paymentMethodId;

        // Optionally save card as Stripe customer for auto-repost
        if (input.saveCard && ctx.user.email) {
          try {
            const customer = await createOrUpdateStripeCustomer({
              email: ctx.user.email,
              paymentMethodId: input.paymentMethodId,
            });
            // Store Stripe customer ID in the paymentToken field (reused)
            await setEmployerPaymentToken(employer.id, customer.customerId);
            pmId = customer.paymentMethodId;
            const refreshed = await getEmployerByUserId(ctx.user.id);
            if (refreshed) employer = refreshed;
          } catch (err) {
            logger.warn({ err }, "[Stripe] Could not create/update customer");
          }
        }

        const stripeResult = await createStripeCharge({
          amountCents: totalCents,
          description: chargeDescription,
          email: ctx.user.email ?? "noreply@jutjut.com.au",
          paymentMethodId: pmId,
          metadata: chargeMetadata,
        });

        if (!stripeResult.success) {
          throw new TRPCError({
            code: "PAYMENT_REQUIRED",
            message: `Payment declined: ${stripeResult.statusMessage}`,
          });
        }

        stripeChargeId = stripeResult.chargeId;
        chargeRef = stripeResult.chargeId;
      } else {
        // ── PinPayments path ───────────────────────────────────────────────────
        if (!input.cardToken) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A card token is required when PinPayments is the active gateway.",
          });
        }

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
            logger.warn({ err }, "[PinPayments] Could not create customer");
          }
        }

        const charge = await createCharge({
          amount: totalCents,
          description: chargeDescription,
          email: ctx.user.email ?? "noreply@jutjut.com.au",
          ipAddress: input.ipAddress,
          cardToken: chargeToken,
          metadata: chargeMetadata,
        });

        if (!charge.success) {
          throw new TRPCError({
            code: "PAYMENT_REQUIRED",
            message: `Payment declined: ${charge.status_message}`,
          });
        }

        pinpaymentsChargeId = charge.token;
        chargeRef = charge.token;
      }

      // ── Record transaction in DB ───────────────────────────────────────────
      const db = await getDb();
      if (db) {
        await db.insert(transactions).values({
          employerId,
          amountCents: totalCents,
          pinpaymentsChargeId,
          stripeChargeId,
          gateway: activeGateway,
          status: "succeeded",
          description: chargeDescription,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Add credits
      await adjustCredits({
        employerId,
        amount: pack.credits,
        type: "purchase",
        reference: chargeRef,
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

      // Record per-user redemption for admin detail view
      if (promo) {
        await recordPromoRedemption({
          promoCodeId: promo.id,
          promoCode: promo.code,
          redeemedByUserId: ctx.user.id,
          redeemedByEmployerId: employerId,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          bonusCreditsAwarded: promo.bonusCredits,
          chargeToken: chargeRef,
        });
      }

      const newBalance = await getCreditBalance(employerId);

      // Send purchase receipt email
      void sendEmailSilent({
        to: ctx.user.email ?? "",
        templateId: "credit_purchase_receipt",
        userId: ctx.user.id,
        data: {
          employer_name: employer.businessName,
          credits_purchased: String(pack.credits + (promo?.bonusCredits ?? 0)),
          amount_paid: `$${(totalCents / 100).toFixed(2)}`,
          charge_reference: chargeRef,
          new_balance: String(newBalance),
          purchase_date: new Date().toLocaleDateString("en-AU"),
          dashboard_url: `${process.env.APP_BASE_URL ?? "https://jutjut.com.au"}/employer`,
        },
      });

      // In-app notification: credit purchase confirmed
      void createNotification({
        userId: ctx.user.id,
        type: "credit_purchase",
        title: `Credits added: ${pack.credits + (promo?.bonusCredits ?? 0)} credits`,
        body: `Payment of $${(totalCents / 100).toFixed(2)} confirmed. New balance: ${newBalance} credits.`,
        link: "/employer",
      });
      return {
        success: true,
        chargeToken: chargeRef,
        creditsAdded: pack.credits + (promo?.bonusCredits ?? 0),
        newBalance,
        subtotalCents,
        gstCents,
        totalCents,
        gateway: activeGateway,
      };
    }),

  /** Returns the currently active payment gateway so the frontend can render the correct payment UI */
  activeGateway: protectedProcedure.query(async () => {
    const gateway = await getActiveGateway();
    return { gateway };
  }),

  /** Returns the Stripe publishable key (safe to expose to frontend) */
  stripePublishableKey: protectedProcedure.query(async () => {
    const { getStripePublishableKey } = await import("../stripe");
    const key = await getStripePublishableKey();
    return { publishableKey: key };
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
          new_balance: String(balance - 1),
        },
      });

      // In-app notification: job post confirmed
      void createNotification({
        userId: ctx.user.id,
        type: "job_post",
        title: `Job posted: ${input.title}`,
        body: `Your listing is live and expires ${expiresAt.toLocaleDateString("en-AU")}. Credits remaining: ${balance - 1}.`,
        link: "/employer",
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
