/**
 * Admin router — all admin procedures for the JutJut Admin Dashboard.
 * Sections: overview, school management, promo codes, The Drop queue,
 * employer moderation, student support, payments, admin management,
 * global search, and system logs.
 * All procedures require admin role.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAllPromoCodes,
  createPromoCode,
  updatePromoCode,
  getPromoCodeRedemptions,
} from "../db";
import {
  getOverviewMetrics,
  getSignupsLast30Days,
  writeAdminLog,
  getAdminLogs,
  getAllSchoolRequests,
  getSchoolRequestById,
  createSchoolRequest,
  updateSchoolRequestStatus,
  adminListSchools,
  adminCreateSchool,
  adminUpdateSchool,
  getGroupsForSchool,
  createSchoolGroup,
  updateSchoolGroup,
  deleteSchoolGroup,
  getGroupMembers,
  addStudentToGroup,
  removeStudentFromGroup,
  adminListEmployers,
  adminUpdateEmployer,
  getEmployerJobs,
  getFlaggedJobs,
  adminUpdateJob,
  adminSearchStudents,
  adminGetStudentById,
  adminUpdateUser,
  adminSuspendUser,
  adminReinstateUser,
  adminListDrops,
  adminUpdateDrop,
  adminDeleteDrop,
  adminListTransactions,
  adminUpdateTransactionStatus,
  getPaymentGatewaySettings,
  upsertPaymentGatewaySetting,
  listAdminUsers,
  promoteToAdmin,
  demoteFromAdmin,
  getUserByEmail,
  globalUserSearch,
  adminAdjustCredits,
  listEmployersWithTokens,
  clearEmployerPaymentToken,
  getWaitlistSummary,
} from "../db.admin";
import { encrypt, decrypt, mask } from "../encryption";
import { sendEmailSilent } from "../emailService";

// ─── Admin middleware ─────────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
  }
  return next({ ctx });
});

// ─── Helper: log an admin action ──────────────────────────────────────────────

async function log(
  adminId: number,
  action: string,
  targetType?: string,
  targetId?: number,
  details?: Record<string, unknown>
) {
  await writeAdminLog({ adminId, action, targetType, targetId, details });
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const adminRouter = router({

  // ── 1. Overview ────────────────────────────────────────────────────────────

  overview: router({
    metrics: adminProcedure.query(async () => {
      const [metrics, signups, waitlist] = await Promise.all([
        getOverviewMetrics(),
        getSignupsLast30Days(),
        getWaitlistSummary(),
      ]);
      return { ...metrics, signupsLast30Days: signups, waitlistTotal: waitlist.total };
    }),
  }),

  // ── 2. School management ───────────────────────────────────────────────────

  schools: router({
    // School access requests (self-service form)
    requests: router({
      list: adminProcedure
        .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }))
        .query(async ({ input }) => getAllSchoolRequests(input.status)),

      get: adminProcedure
        .input(z.object({ id: z.number().int() }))
        .query(async ({ input }) => {
          const req = await getSchoolRequestById(input.id);
          if (!req) throw new TRPCError({ code: "NOT_FOUND" });
          return req;
        }),

      // Public — any user can submit a school access request
      submit: protectedProcedure
        .input(z.object({
          schoolName: z.string().min(2).max(255),
          domain: z.string().min(3).max(255),
          contactName: z.string().min(2).max(255),
          contactEmail: z.string().email().max(320),
          phone: z.string().max(32).optional(),
        }))
        .mutation(async ({ input }) => {
          await createSchoolRequest(input);

          // Auto-reply to the submitter
          void sendEmailSilent({
            to: input.contactEmail,
            templateId: "school_request_autoreply",
            data: {
              contact_name: input.contactName,
              school_name: input.schoolName,
              submitted_date: new Date().toLocaleDateString("en-AU"),
            },
          });

          return { ok: true };
        }),

      approve: adminProcedure
        .input(z.object({ id: z.number().int(), adminNote: z.string().optional() }))
        .mutation(async ({ ctx, input }) => {
          const req = await getSchoolRequestById(input.id);
          await updateSchoolRequestStatus(input.id, "approved", input.adminNote);
          await log(ctx.user.id, "approve_school_request", "schoolRequest", input.id);

          if (req?.contactEmail) {
            void sendEmailSilent({
              to: req.contactEmail,
              templateId: "school_approved",
              data: {
                school_name: req.schoolName,
                contact_name: req.contactName,
                portal_url: `${process.env.APP_BASE_URL ?? "https://jutjut.com.au"}/school-portal`,
              },
            });
          }

          return { ok: true };
        }),

      reject: adminProcedure
        .input(z.object({ id: z.number().int(), adminNote: z.string().optional() }))
        .mutation(async ({ ctx, input }) => {
          const req = await getSchoolRequestById(input.id);
          await updateSchoolRequestStatus(input.id, "rejected", input.adminNote);
          await log(ctx.user.id, "reject_school_request", "schoolRequest", input.id);

          if (req?.contactEmail) {
            void sendEmailSilent({
              to: req.contactEmail,
              templateId: "school_rejected",
              data: {
                school_name: req.schoolName,
                contact_name: req.contactName,
                admin_note: input.adminNote ?? "",
              },
            });
          }

          return { ok: true };
        }),
    }),

    // Approved schools
    list: adminProcedure
      .input(z.object({ search: z.string().optional() }))
      .query(async ({ input }) => adminListSchools(input.search)),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(2).max(255),
        domain: z.string().min(3).max(255),
        careersContactName: z.string().max(255).optional(),
        careersContactEmail: z.string().email().max(320).optional(),
        phone: z.string().max(32).optional(),
        state: z.string().max(3).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await adminCreateSchool(input);
        await log(ctx.user.id, "create_school", "school", undefined, { name: input.name });
        return { ok: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number().int(),
        name: z.string().max(255).optional(),
        domain: z.string().max(255).optional(),
        careersContactName: z.string().max(255).optional(),
        careersContactEmail: z.string().email().max(320).optional(),
        phone: z.string().max(32).optional(),
        state: z.string().max(3).optional(),
        approved: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await adminUpdateSchool(id, data);
        await log(ctx.user.id, "update_school", "school", id, data as Record<string, unknown>);
        return { ok: true };
      }),

    // Student groups
    groups: router({
      list: adminProcedure
        .input(z.object({ schoolId: z.number().int() }))
        .query(async ({ input }) => getGroupsForSchool(input.schoolId)),

      create: adminProcedure
        .input(z.object({
          schoolId: z.number().int(),
          groupName: z.string().min(1).max(255),
          description: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const id = await createSchoolGroup(input);
          await log(ctx.user.id, "create_school_group", "schoolGroup", id, { name: input.groupName });
          return { ok: true, id };
        }),

      update: adminProcedure
        .input(z.object({
          id: z.number().int(),
          groupName: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const { id, ...data } = input;
          await updateSchoolGroup(id, data);
          await log(ctx.user.id, "update_school_group", "schoolGroup", id);
          return { ok: true };
        }),

      delete: adminProcedure
        .input(z.object({ id: z.number().int() }))
        .mutation(async ({ ctx, input }) => {
          await deleteSchoolGroup(input.id);
          await log(ctx.user.id, "delete_school_group", "schoolGroup", input.id);
          return { ok: true };
        }),

      members: adminProcedure
        .input(z.object({ groupId: z.number().int() }))
        .query(async ({ input }) => getGroupMembers(input.groupId)),

      addStudent: adminProcedure
        .input(z.object({ studentId: z.number().int(), groupId: z.number().int() }))
        .mutation(async ({ ctx, input }) => {
          await addStudentToGroup(input.studentId, input.groupId);
          await log(ctx.user.id, "add_student_to_group", "schoolGroup", input.groupId, { studentId: input.studentId });
          return { ok: true };
        }),

      removeStudent: adminProcedure
        .input(z.object({ studentId: z.number().int(), groupId: z.number().int() }))
        .mutation(async ({ ctx, input }) => {
          await removeStudentFromGroup(input.studentId, input.groupId);
          await log(ctx.user.id, "remove_student_from_group", "schoolGroup", input.groupId, { studentId: input.studentId });
          return { ok: true };
        }),
    }),
  }),

  // ── 3. Promo codes (existing + extended) ───────────────────────────────────

  promoCodes: router({
    list: adminProcedure.query(async () => getAllPromoCodes()),

    create: adminProcedure
      .input(z.object({
        code: z.string().min(2).max(64).regex(/^[A-Z0-9_-]+$/i, "Code must be alphanumeric"),
        discountType: z.enum(["fixed", "percentage"]),
        discountValue: z.number().int().min(1),
        bonusCredits: z.number().int().min(0).default(0),
        maxUses: z.number().int().min(1).optional().nullable(),
        expiresAt: z.string().datetime().optional().nullable(),
      }))
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
        await log(ctx.user.id, "create_promo_code", "promoCode", undefined, { code: input.code });
        return { ok: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number().int(),
        isActive: z.boolean().optional(),
        maxUses: z.number().int().min(1).optional().nullable(),
        expiresAt: z.string().datetime().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updatePromoCode(input.id, {
          isActive: input.isActive,
          maxUses: input.maxUses ?? null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        });
        await log(ctx.user.id, "update_promo_code", "promoCode", input.id);
        return { ok: true };
      }),

    redemptions: adminProcedure
      .input(z.object({ promoCodeId: z.number().int() }))
      .query(async ({ input }) => getPromoCodeRedemptions(input.promoCodeId)),
  }),

  // ── 4. The Drop queue ──────────────────────────────────────────────────────

  drops: router({
    list: adminProcedure
      .input(z.object({ status: z.enum(["draft", "active", "expired"]).optional() }))
      .query(async ({ input }) => adminListDrops(input.status)),

    publish: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await adminUpdateDrop(input.id, { status: "active" });
        await log(ctx.user.id, "publish_drop", "drop", input.id);
        return { ok: true };
      }),

    schedule: adminProcedure
      .input(z.object({ id: z.number().int(), scheduledDate: z.string().datetime() }))
      .mutation(async ({ ctx, input }) => {
        await adminUpdateDrop(input.id, { scheduledDate: new Date(input.scheduledDate) });
        await log(ctx.user.id, "schedule_drop", "drop", input.id, { scheduledDate: input.scheduledDate });
        return { ok: true };
      }),

    reject: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await adminDeleteDrop(input.id);
        await log(ctx.user.id, "reject_drop", "drop", input.id);
        return { ok: true };
      }),
  }),

  // ── 5. Employer moderation ─────────────────────────────────────────────────

  employers: router({
    list: adminProcedure
      .input(z.object({
        search: z.string().optional(),
        status: z.enum(["active", "suspended"]).optional(),
      }))
      .query(async ({ input }) => adminListEmployers(input)),

    suspend: adminProcedure
      .input(z.object({ id: z.number().int(), reason: z.string().min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        await adminUpdateEmployer(input.id, {
          status: "suspended",
          suspendedAt: new Date(),
          suspendedReason: input.reason,
        });
        await log(ctx.user.id, "suspend_employer", "employer", input.id, { reason: input.reason });
        return { ok: true };
      }),

    reinstate: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await adminUpdateEmployer(input.id, {
          status: "active",
          suspendedAt: null,
          suspendedReason: null,
        });
        await log(ctx.user.id, "reinstate_employer", "employer", input.id);
        return { ok: true };
      }),

    adjustCredits: adminProcedure
      .input(z.object({
        employerId: z.number().int(),
        delta: z.number().int(),
        reason: z.string().min(1).max(255),
      }))
      .mutation(async ({ ctx, input }) => {
        await adminAdjustCredits(input.employerId, input.delta, input.reason);
        await log(ctx.user.id, "adjust_employer_credits", "employer", input.employerId, { delta: input.delta, reason: input.reason });
        return { ok: true };
      }),

    jobs: adminProcedure
      .input(z.object({ employerId: z.number().int() }))
      .query(async ({ input }) => getEmployerJobs(input.employerId)),

    flaggedJobs: adminProcedure.query(async () => getFlaggedJobs()),

    resolveJob: adminProcedure
      .input(z.object({
        jobId: z.number().int(),
        action: z.enum(["clear_flag", "deactivate"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.action === "clear_flag") {
          await adminUpdateJob(input.jobId, { reported: false, reportReason: null });
        } else {
          await adminUpdateJob(input.jobId, { isActive: false });
        }
        await log(ctx.user.id, `job_${input.action}`, "job", input.jobId);
        return { ok: true };
      }),

    paymentTokens: adminProcedure.query(async () => listEmployersWithTokens()),

    clearPaymentToken: adminProcedure
      .input(z.object({ employerId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await clearEmployerPaymentToken(input.employerId);
        await log(ctx.user.id, "clear_employer_payment_token", "employer", input.employerId);
        return { ok: true };
      }),
  }),

  // ── 6. Student support ─────────────────────────────────────────────────────

  students: router({
    search: adminProcedure
      .input(z.object({ query: z.string().min(1).max(100) }))
      .query(async ({ input }) => adminSearchStudents(input.query)),

    get: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ input }) => {
        const result = await adminGetStudentById(input.id);
        if (!result) throw new TRPCError({ code: "NOT_FOUND" });
        return result;
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number().int(),
        name: z.string().max(255).optional(),
        email: z.string().email().max(320).optional(),
        yearLevel: z.string().max(32).optional(),
        bio: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await adminUpdateUser(id, data);
        await log(ctx.user.id, "update_student", "user", id, data as Record<string, unknown>);
        return { ok: true };
      }),

    suspend: adminProcedure
      .input(z.object({
        id: z.number().int(),
        reason: z.string().min(1, "Reason is required").max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        await adminSuspendUser(input.id, input.reason);
        await log(ctx.user.id, "suspend_user", "user", input.id, { reason: input.reason });
        return { ok: true };
      }),

    reinstate: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await adminReinstateUser(input.id);
        await log(ctx.user.id, "reinstate_user", "user", input.id);
        return { ok: true };
      }),
  }),

  // ── 7. Payment management ──────────────────────────────────────────────────

  payments: router({
    transactions: adminProcedure
      .input(z.object({
        employerId: z.number().int().optional(),
        status: z.enum(["pending", "succeeded", "refunded"]).optional(),
        limit: z.number().int().max(500).default(100),
        offset: z.number().int().default(0),
      }))
      .query(async ({ input }) => adminListTransactions(input)),

    refund: adminProcedure
      .input(z.object({ transactionId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await adminUpdateTransactionStatus(input.transactionId, "refunded");
        await log(ctx.user.id, "refund_transaction", "transaction", input.transactionId);
        return { ok: true };
      }),

    // Gateway settings — encrypted at rest
    gatewaySettings: adminProcedure.query(async () => {
      const rows = await getPaymentGatewaySettings();
      // Return masked values — never expose plaintext keys to the frontend
      return rows.map(r => ({
        id: r.id,
        keyName: r.keyName,
        maskedValue: mask(decrypt(r.encryptedValue)),
        updatedAt: r.updatedAt,
        updatedBy: r.updatedBy,
      }));
    }),

    setGatewaySetting: adminProcedure
      .input(z.object({
        keyName: z.string().min(1).max(128),
        plainValue: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const encrypted = encrypt(input.plainValue);
        await upsertPaymentGatewaySetting(input.keyName, encrypted, ctx.user.id);
        await log(ctx.user.id, "update_gateway_setting", "paymentGateway", undefined, { keyName: input.keyName });
        return { ok: true };
      }),
  }),

  // ── 8. Admin management ────────────────────────────────────────────────────

  admins: router({
    list: adminProcedure.query(async () => listAdminUsers()),

    promote: adminProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "No user found with that email." });
        if (user.role === "admin") throw new TRPCError({ code: "BAD_REQUEST", message: "User is already an admin." });
        await promoteToAdmin(user.id);
        await log(ctx.user.id, "promote_to_admin", "user", user.id, { email: input.email });
        return { ok: true };
      }),

    demote: adminProcedure
      .input(z.object({ userId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot demote yourself." });
        }
        await demoteFromAdmin(input.userId);
        await log(ctx.user.id, "demote_from_admin", "user", input.userId);
        return { ok: true };
      }),
  }),

  // ── 9. Global search ───────────────────────────────────────────────────────

  search: adminProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ input }) => globalUserSearch(input.query)),

  // ── 10. System / audit logs ────────────────────────────────────────────────

  logs: router({
    list: adminProcedure
      .input(z.object({
        adminId: z.number().int().optional(),
        action: z.string().optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        limit: z.number().int().max(500).default(100),
        offset: z.number().int().default(0),
      }))
      .query(async ({ input }) => {
        return getAdminLogs({
          adminId: input.adminId,
          action: input.action,
          from: input.from ? new Date(input.from) : undefined,
          to: input.to ? new Date(input.to) : undefined,
          limit: input.limit,
          offset: input.offset,
        });
      }),
  }),
});
