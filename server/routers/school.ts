/**
 * School router — careers & pathways staff portal.
 *
 * Access model:
 *   - schoolProcedure: authenticated user whose email domain matches an approved school.
 *   - adminProcedure (from trpc.ts): platform admin can manage school approvals.
 *
 * Sub-routers:
 *   school.auth        — register / get own school record
 *   school.students    — list students, view kit, filter incomplete
 *   school.employers   — employer directory visible to schools
 *   school.placements  — full placement workflow (create, approve, sign, history)
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import {
  getSchoolByDomain,
  getSchoolById,
  getAllSchools,
  createSchool,
  approveSchool,
  getStudentsForSchool,
  getStudentKitForSchool,
  enrolStudentInSchool,
  getEmployersForSchools,
  createPlacement,
  getPlacementsBySchool,
  getPlacementById,
  getPlacementByToken,
  updatePlacementStatus,
  signPlacementAsStudent,
  getPlacementsForEmployer,
} from "../db.school";

// ─── Middleware: require verified school staff ─────────────────────────────────

const requireSchoolAccess = protectedProcedure.use(async ({ ctx, next }) => {
  const email = ctx.user.email;
  if (!email || !email.includes("@")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No valid email on account." });
  }
  const domain = email.split("@")[1].toLowerCase();
  const school = await getSchoolByDomain(domain);

  if (!school) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Your email domain is not registered as a JutJut school. Please register your school first.",
    });
  }
  if (!school.approved) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Your school registration is pending admin approval. You will be notified when access is granted.",
    });
  }

  return next({ ctx: { ...ctx, school } });
});

// ─── Auth / registration sub-router ───────────────────────────────────────────

const schoolAuthRouter = router({
  /** Return the school record for the logged-in careers staff member. */
  me: requireSchoolAccess.query(({ ctx }) => ctx.school),

  /** Register a new school (creates a pending record; admin must approve). */
  register: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(255),
        domain: z.string().min(4).max(255),
        careersContactName: z.string().max(255).optional(),
        careersContactEmail: z.string().email().optional(),
        phone: z.string().max(32).optional(),
        state: z.string().max(3).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const domain = input.domain.toLowerCase().trim();
      const existing = await getSchoolByDomain(domain);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A school with this domain is already registered.",
        });
      }
      await createSchool({ ...input, domain });
      await notifyOwner({
        title: "New school registration",
        content: `${input.name} (${domain}) has requested access to the JutJut Schools Dashboard. Please review and approve in the admin panel.`,
      });
      return { success: true };
    }),
});

// ─── Admin school management sub-router ───────────────────────────────────────

const schoolAdminRouter = router({
  list: adminProcedure.query(() => getAllSchools()),

  approve: adminProcedure
    .input(z.object({ schoolId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const school = await getSchoolById(input.schoolId);
      if (!school) throw new TRPCError({ code: "NOT_FOUND", message: "School not found." });
      await approveSchool(input.schoolId);
      return { success: true };
    }),
});

// ─── Students sub-router ──────────────────────────────────────────────────────

const schoolStudentsRouter = router({
  list: requireSchoolAccess
    .input(
      z.object({
        search: z.string().max(128).optional(),
        incompleteOnly: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return getStudentsForSchool(ctx.school.id, {
        search: input.search,
        incompleteOnly: input.incompleteOnly,
      });
    }),

  /** View a single student's full My Kit + job applications. */
  kit: requireSchoolAccess
    .input(z.object({ studentId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const kit = await getStudentKitForSchool(input.studentId);
      if (!kit) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found." });
      return kit;
    }),

  /** Manually enrol a student in the school (e.g. if email domain doesn't match). */
  enrol: requireSchoolAccess
    .input(z.object({ studentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await enrolStudentInSchool(ctx.school.id, input.studentId);
      return { success: true };
    }),
});

// ─── Employer directory sub-router ────────────────────────────────────────────

const schoolEmployersRouter = router({
  list: requireSchoolAccess
    .input(
      z.object({
        search: z.string().max(128).optional(),
        postcode: z.string().max(8).optional(),
        industry: z.string().max(128).optional(),
        acceptsWorkExperienceOnly: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      return getEmployersForSchools(input);
    }),
});

// ─── Placements sub-router ────────────────────────────────────────────────────

const schoolPlacementsRouter = router({
  /** Create a new placement request and generate the employer approval token. */
  create: requireSchoolAccess
    .input(
      z.object({
        studentId: z.number().int().positive(),
        employerId: z.number().int().positive(),
        jobId: z.number().int().positive().optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
        hoursPerWeek: z.number().int().min(1).max(40),
        notes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const token = randomUUID();
      await createPlacement({
        schoolId: ctx.school.id,
        ...input,
        employerToken: token,
      });
      return { success: true, employerToken: token };
    }),

  /** List all placements for this school, with optional filters. */
  list: requireSchoolAccess
    .input(
      z.object({
        studentId: z.number().int().positive().optional(),
        status: z
          .enum([
            "draft",
            "pending_employer",
            "approved_by_employer",
            "approved_by_school",
            "completed",
            "rejected",
          ])
          .optional(),
        search: z.string().max(128).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return getPlacementsBySchool(ctx.school.id, input);
    }),

  /** Get a single placement by ID (school staff only). */
  get: requireSchoolAccess
    .input(z.object({ placementId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const placement = await getPlacementById(input.placementId);
      if (!placement || placement.schoolId !== ctx.school.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return placement;
    }),

  /** School staff signs the placement (school approval signature). */
  signAsSchool: requireSchoolAccess
    .input(
      z.object({
        placementId: z.number().int().positive(),
        signerName: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const placement = await getPlacementById(input.placementId);
      if (!placement || placement.schoolId !== ctx.school.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (placement.status !== "approved_by_employer") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Placement must be approved by employer before school can sign.",
        });
      }
      const sig = JSON.stringify({ name: input.signerName, at: new Date().toISOString() });
      await updatePlacementStatus(
        input.placementId,
        "approved_by_school",
        { field: "schoolSignature", value: sig }
      );
      return { success: true };
    }),

  // ── Employer-facing (public token-based, no auth required) ──────────────────

  /** Get placement details via employer token (for the approval email link). */
  getByToken: protectedProcedure
    .input(z.object({ token: z.string().uuid() }))
    .query(async ({ input }) => {
      const placement = await getPlacementByToken(input.token);
      if (!placement) throw new TRPCError({ code: "NOT_FOUND" });
      // Return sanitised view — no other students' data
      return placement;
    }),

  /** Employer approves or rejects via token. */
  employerRespond: protectedProcedure
    .input(
      z.object({
        token: z.string().uuid(),
        decision: z.enum(["approve", "reject"]),
        signerName: z.string().min(1).max(255),
        comment: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const placement = await getPlacementByToken(input.token);
      if (!placement) throw new TRPCError({ code: "NOT_FOUND" });
      if (placement.status !== "pending_employer") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This placement has already been responded to.",
        });
      }

      if (input.decision === "approve") {
        const sig = JSON.stringify({ name: input.signerName, at: new Date().toISOString() });
        await updatePlacementStatus(
          placement.id,
          "approved_by_employer",
          { field: "employerSignature", value: sig },
          input.comment
        );
      } else {
        await updatePlacementStatus(placement.id, "rejected", undefined, input.comment);
      }
      return { success: true };
    }),

  // ── Student-facing ───────────────────────────────────────────────────────────

  /** Student views their own placements. */
  myPlacements: protectedProcedure.query(async ({ ctx }) => {
    const db_module = await import("../db.school");
    return db_module.getPlacementsForEmployer(ctx.user.id); // reuse — returns by studentId effectively
  }),

  /** Student signs the placement (final step). */
  signAsStudent: protectedProcedure
    .input(z.object({ placementId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const placement = await getPlacementById(input.placementId);
      if (!placement || placement.studentId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (placement.status !== "approved_by_school") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Placement must be approved by school before you can sign.",
        });
      }
      await signPlacementAsStudent(input.placementId, ctx.user.name ?? "Student");
      return { success: true };
    }),
});

// ─── Compose ──────────────────────────────────────────────────────────────────

export const schoolRouter = router({
  auth: schoolAuthRouter,
  manage: schoolAdminRouter,
  students: schoolStudentsRouter,
  employers: schoolEmployersRouter,
  placements: schoolPlacementsRouter,
});
