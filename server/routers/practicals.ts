/**
 * JutJut Practicals router.
 *
 * Institutions control course pathway and completion approval. Businesses can
 * submit clearly-scoped host opportunities. Students can link a requirement,
 * discover approved opportunities, apply, complete milestones and raise a
 * concern. The router deliberately does not represent course eligibility as an
 * automatic promise before the institution approves the relevant arrangement.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  confirmArrangementCommencement,
  confirmBusinessCompletion,
  confirmInstitutionCompletion,
  confirmMilestone,
  createCoursePathway,
  createPracticalApplication,
  createPracticalConcern,
  createPracticalOpportunity,
  createStudentRequirement,
  createStudentSourcedPractical,
  getBusinessArrangements,
  getEmployerForPracticalUser,
  getInstitutionApplications,
  getInstitutionArrangements,
  getInstitutionByDomain,
  getInstitutionConcerns,
  getInstitutionMemberForUser,
  getInstitutionOpportunityReviews,
  getInstitutionStudentSourcedPracticals,
  getMatchedOpportunities,
  getStudentApplications,
  getStudentArrangements,
  getStudentRequirements,
  getStudentSourcedPracticals,
  listActiveCoursePathways,
  listBusinessPracticalOpportunities,
  listCoursePathways,
  registerInstitution,
  reviewPracticalOpportunity,
  reviewStudentApplication,
  reviewStudentSourcedPractical,
  startBusinessArrangement,
  submitCompletionReflection,
  submitMilestone,
  updateCoursePathwayStatus,
  updateInstitutionConcern,
} from "../db.practicals";

const practicalTypeSchema = z.enum(["placement", "project", "cohort_brief"]);
const pathwayTypeSchema = z.enum(["placement", "project", "cohort_brief", "mixed"]);
const deliveryModeSchema = z.enum(["on_site", "remote", "hybrid"]);

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

// ─── Access middleware ───────────────────────────────────────────────────────

const institutionProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const membership = await getInstitutionMemberForUser(ctx.user.id);
  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have a JutJut Practicals institution role. Register your institution or ask its administrator to add you.",
    });
  }
  if (!membership.institution.approved) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your institution registration is awaiting JutJut approval. Course pathways cannot be published until approval is complete.",
    });
  }
  return next({ ctx: { ...ctx, institutionMember: membership.member, institution: membership.institution } });
});

const hostBusinessProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const employer = await getEmployerForPracticalUser(ctx.user.id);
  if (!employer) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Set up your business profile before hosting a practical opportunity.",
    });
  }
  if (employer.status !== "active") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your business profile is not currently active." });
  }
  return next({ ctx: { ...ctx, employer } });
});

const coursePathwayInput = z.object({
  title: z.string().trim().min(3).max(255),
  courseName: z.string().trim().min(3).max(255),
  unitName: optionalText(255),
  discipline: z.string().trim().min(2).max(255),
  level: optionalText(128),
  practicalType: pathwayTypeSchema,
  description: optionalText(4000),
  learningOutcomes: optionalText(6000),
  eligibilitySummary: optionalText(3000),
  requiredHours: z.number().int().min(1).max(2000).optional().nullable(),
  requiredDeliverables: optionalText(3000),
  allowedDeliveryModes: z.array(deliveryModeSchema).min(1).max(3).optional(),
  applicationOpenAt: z.date().optional().nullable(),
  applicationCloseAt: z.date().optional().nullable(),
  practicalStartAt: z.date().optional().nullable(),
  practicalEndAt: z.date().optional().nullable(),
  status: z.enum(["draft", "active", "paused", "archived"]).default("draft"),
});

const opportunityInput = z.object({
  coursePathwayId: z.number().int().positive(),
  type: practicalTypeSchema,
  title: z.string().trim().min(4).max(255),
  businessNeed: z.string().trim().min(30).max(5000),
  description: z.string().trim().min(50).max(8000),
  deliveryMode: deliveryModeSchema,
  location: optionalText(255),
  proposedStartAt: z.date().optional().nullable(),
  proposedEndAt: z.date().optional().nullable(),
  estimatedHours: z.number().int().min(1).max(2000).optional().nullable(),
  maxParticipants: z.number().int().min(1).max(100).default(1),
  suggestedCourseAreas: z.array(z.string().trim().min(2).max(100)).min(1).max(10),
  deliverables: z.string().trim().min(20).max(5000),
  scopeExclusions: optionalText(3000),
  toolsProvided: optionalText(3000),
  supervisorName: z.string().trim().min(2).max(255),
  supervisorTitle: optionalText(255),
  supervisorEmail: z.string().email().max(320),
  supervisionCadence: z.string().trim().min(2).max(128),
  accessibilityInfo: optionalText(3000),
  paymentDetails: optionalText(2000),
  safetyAcknowledged: z.literal(true, { error: "You must acknowledge safe supervision and a defined educational scope." }),
});

// ─── Institution portal ──────────────────────────────────────────────────────

const institutionAuthRouter = router({
  /** Returns institution registration / approval status based on the current user's email domain. */
  status: protectedProcedure.query(async ({ ctx }) => {
    const email = ctx.user.email;
    const domain = email?.includes("@") ? email.split("@")[1].toLowerCase() : null;
    const institution = domain ? await getInstitutionByDomain(domain) : null;
    const membership = await getInstitutionMemberForUser(ctx.user.id);
    return {
      emailDomain: domain,
      institution,
      membership: membership?.member ?? null,
      isApprovedMember: Boolean(membership?.institution.approved && membership.member.active),
    };
  }),

  register: protectedProcedure
    .input(z.object({
      name: z.string().trim().min(2).max(255),
      domain: z.string().trim().min(4).max(255),
      providerType: z.enum(["university", "tafe", "school", "other"]),
      contactName: z.string().trim().min(2).max(255),
      contactEmail: z.string().email().max(320),
      state: z.string().trim().min(2).max(3).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const emailDomain = ctx.user.email?.includes("@") ? ctx.user.email.split("@")[1].toLowerCase() : null;
      if (emailDomain && input.domain.toLowerCase() !== emailDomain) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Use the domain associated with your signed-in institutional email." });
      }
      return registerInstitution({ ...input, domain: input.domain.toLowerCase(), userId: ctx.user.id });
    }),
});

const institutionPathwaysRouter = router({
  list: institutionProcedure.query(({ ctx }) => listCoursePathways(ctx.institution.id)),

  create: institutionProcedure.input(coursePathwayInput).mutation(async ({ ctx, input }) => {
    return createCoursePathway({
      ...input,
      institutionId: ctx.institution.id,
      createdByUserId: ctx.user.id,
      allowedDeliveryModes: input.allowedDeliveryModes ? JSON.stringify(input.allowedDeliveryModes) : null,
    });
  }),

  setStatus: institutionProcedure
    .input(z.object({ pathwayId: z.number().int().positive(), status: z.enum(["draft", "active", "paused", "archived"]) }))
    .mutation(async ({ ctx, input }) => {
      await updateCoursePathwayStatus(input.pathwayId, ctx.institution.id, input.status);
      return { success: true };
    }),

  activeDirectory: protectedProcedure.query(() => listActiveCoursePathways()),
});

const institutionReviewRouter = router({
  opportunities: institutionProcedure.query(({ ctx }) => getInstitutionOpportunityReviews(ctx.institution.id)),

  decideOpportunity: institutionProcedure
    .input(z.object({
      reviewId: z.number().int().positive(),
      status: z.enum(["needs_information", "approved", "declined"]),
      reviewNotes: optionalText(4000),
      conditions: optionalText(3000),
      studentVisibility: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const reviewed = await reviewPracticalOpportunity({ ...input, institutionId: ctx.institution.id, reviewerUserId: ctx.user.id });
      if (!reviewed) throw new TRPCError({ code: "NOT_FOUND", message: "Opportunity review not found." });
      return { success: true };
    }),

  applications: institutionProcedure.query(({ ctx }) => getInstitutionApplications(ctx.institution.id)),

  decideApplication: institutionProcedure
    .input(z.object({
      applicationId: z.number().int().positive(),
      status: z.enum(["shortlisted", "approved", "waitlisted", "declined"]),
      reviewNote: optionalText(3000),
    }))
    .mutation(async ({ ctx, input }) => {
      const reviewed = await reviewStudentApplication({ ...input, institutionId: ctx.institution.id, reviewerUserId: ctx.user.id });
      if (!reviewed) throw new TRPCError({ code: "NOT_FOUND", message: "Student application not found." });
      return { success: true, arrangementId: reviewed.arrangementId };
    }),

  selfSourced: institutionProcedure.query(({ ctx }) => getInstitutionStudentSourcedPracticals(ctx.institution.id)),

  decideSelfSourced: institutionProcedure
    .input(z.object({
      proposalId: z.number().int().positive(),
      status: z.enum(["awaiting_host", "under_review", "approved", "declined"]),
      coordinatorNote: optionalText(3000),
    }))
    .mutation(async ({ ctx, input }) => {
      const reviewed = await reviewStudentSourcedPractical({ ...input, institutionId: ctx.institution.id, reviewerUserId: ctx.user.id });
      if (!reviewed) throw new TRPCError({ code: "NOT_FOUND", message: "Student-sourced proposal not found." });
      return reviewed;
    }),

  arrangements: institutionProcedure.query(({ ctx }) => getInstitutionArrangements(ctx.institution.id)),

  concerns: institutionProcedure.query(({ ctx }) => getInstitutionConcerns(ctx.institution.id)),

  updateConcern: institutionProcedure
    .input(z.object({
      concernId: z.number().int().positive(),
      status: z.enum(["under_review", "resolved"]),
      resolution: optionalText(4000),
    }).superRefine((value, ctx) => {
      if (value.status === "resolved" && (!value.resolution || value.resolution.trim().length < 20)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["resolution"], message: "Record a resolution of at least 20 characters before closing a concern." });
      }
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await updateInstitutionConcern({ ...input, institutionId: ctx.institution.id, coordinatorUserId: ctx.user.id });
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Concern not found for this institution." });
      return result;
    }),

  confirmCompletion: institutionProcedure
    .input(z.object({ arrangementId: z.number().int().positive(), outcomeSummary: z.string().trim().min(20).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const result = await confirmInstitutionCompletion({ ...input, institutionId: ctx.institution.id, coordinatorUserId: ctx.user.id });
      if (!result) throw new TRPCError({ code: "BAD_REQUEST", message: "This practical is not ready for final completion approval." });
      if ("error" in result) throw new TRPCError({ code: "BAD_REQUEST", message: "Supervisor confirmation is required before final academic approval." });
      return result;
    }),
});

const institutionRouter = router({ auth: institutionAuthRouter, pathways: institutionPathwaysRouter, review: institutionReviewRouter });

// ─── Business host portal ────────────────────────────────────────────────────

const hostRouter = router({
  dashboard: hostBusinessProcedure.query(async ({ ctx }) => ({
    employer: ctx.employer,
    opportunities: await listBusinessPracticalOpportunities(ctx.employer.id),
    arrangements: await getBusinessArrangements(ctx.employer.id),
  })),

  submitOpportunity: hostBusinessProcedure.input(opportunityInput).mutation(async ({ ctx, input }) => {
    const pathway = (await listActiveCoursePathways()).find(item => item.pathway.id === input.coursePathwayId);
    if (!pathway) throw new TRPCError({ code: "BAD_REQUEST", message: "Select an active course pathway before submitting this opportunity." });
    return createPracticalOpportunity({
      employerId: ctx.employer.id,
      createdByUserId: ctx.user.id,
      type: input.type,
      title: input.title,
      businessNeed: input.businessNeed,
      description: input.description,
      deliveryMode: input.deliveryMode,
      location: input.location,
      proposedStartAt: input.proposedStartAt,
      proposedEndAt: input.proposedEndAt,
      estimatedHours: input.estimatedHours,
      maxParticipants: input.maxParticipants,
      suggestedCourseAreas: JSON.stringify(input.suggestedCourseAreas),
      deliverables: input.deliverables,
      scopeExclusions: input.scopeExclusions,
      toolsProvided: input.toolsProvided,
      supervisorName: input.supervisorName,
      supervisorTitle: input.supervisorTitle,
      supervisorEmail: input.supervisorEmail,
      supervisionCadence: input.supervisionCadence,
      accessibilityInfo: input.accessibilityInfo,
      paymentDetails: input.paymentDetails,
      safetyAcknowledged: input.safetyAcknowledged,
    }, input.coursePathwayId);
  }),

  startArrangement: hostBusinessProcedure
    .input(z.object({ arrangementId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const result = await startBusinessArrangement(input.arrangementId, ctx.employer.id);
      if (!result) throw new TRPCError({ code: "BAD_REQUEST", message: "The student must complete the commencement checklist before you can start this practical." });
      return result;
    }),

  confirmMilestone: hostBusinessProcedure
    .input(z.object({ milestoneId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const result = await confirmMilestone(input.milestoneId, ctx.employer.id, ctx.user.id);
      if (!result) throw new TRPCError({ code: "BAD_REQUEST", message: "This milestone is not ready for confirmation." });
      return result;
    }),

  confirmCompletion: hostBusinessProcedure
    .input(z.object({ arrangementId: z.number().int().positive(), supervisorFeedback: optionalText(4000) }))
    .mutation(async ({ ctx, input }) => {
      const result = await confirmBusinessCompletion(input.arrangementId, ctx.employer.id, input.supervisorFeedback);
      if (!result) throw new TRPCError({ code: "BAD_REQUEST", message: "The student must submit their completion reflection before you can confirm." });
      return result;
    }),
});

// ─── Student portal ──────────────────────────────────────────────────────────

const studentRouter = router({
  pathwayDirectory: protectedProcedure.query(() => listActiveCoursePathways()),
  requirements: protectedProcedure.query(({ ctx }) => getStudentRequirements(ctx.user.id)),

  linkRequirement: protectedProcedure
    .input(z.object({ coursePathwayId: z.number().int().positive(), plannedCompletionAt: z.date().optional().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const activePathway = (await listActiveCoursePathways()).some(item => item.pathway.id === input.coursePathwayId);
      if (!activePathway) throw new TRPCError({ code: "BAD_REQUEST", message: "This course pathway is not currently available." });
      return createStudentRequirement(ctx.user.id, input.coursePathwayId, input.plannedCompletionAt);
    }),

  opportunities: protectedProcedure
    .input(z.object({ coursePathwayId: z.number().int().positive().optional() }).optional())
    .query(({ ctx, input }) => getMatchedOpportunities(ctx.user.id, input?.coursePathwayId)),

  applications: protectedProcedure.query(({ ctx }) => getStudentApplications(ctx.user.id)),

  submitApplication: protectedProcedure
    .input(z.object({
      opportunityId: z.number().int().positive(),
      coursePathwayId: z.number().int().positive(),
      availability: optionalText(2000),
      statement: z.string().trim().min(30).max(4000),
      skillsSummary: optionalText(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await createPracticalApplication({ ...input, studentUserId: ctx.user.id });
      if ("error" in result) {
        const messages = {
          OPPORTUNITY_NOT_APPROVED: "This opportunity is not currently approved for student applications.",
          REQUIREMENT_NOT_LINKED: "Link this course pathway in My Practicals before applying.",
          ALREADY_APPLIED: "You have already applied for this practical opportunity.",
        } as const;
        throw new TRPCError({ code: "BAD_REQUEST", message: messages[result.error as keyof typeof messages] });
      }
      return result;
    }),

  selfSourced: router({
    list: protectedProcedure.query(({ ctx }) => getStudentSourcedPracticals(ctx.user.id)),
    submit: protectedProcedure
      .input(z.object({
        coursePathwayId: z.number().int().positive(),
        hostOrganisationName: z.string().trim().min(2).max(255),
        hostContactName: optionalText(255),
        hostContactEmail: z.string().email().max(320).optional().nullable(),
        proposedTitle: z.string().trim().min(4).max(255),
        proposedDescription: z.string().trim().min(40).max(5000),
      }))
      .mutation(async ({ ctx, input }) => createStudentSourcedPractical({ ...input, studentUserId: ctx.user.id })),
  }),

  arrangements: protectedProcedure.query(({ ctx }) => getStudentArrangements(ctx.user.id)),

  confirmCommencement: protectedProcedure
    .input(z.object({ arrangementId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const result = await confirmArrangementCommencement(input.arrangementId, ctx.user.id);
      if (!result) throw new TRPCError({ code: "BAD_REQUEST", message: "This practical is not ready for commencement confirmation." });
      return result;
    }),

  submitMilestone: protectedProcedure
    .input(z.object({ milestoneId: z.number().int().positive(), studentNote: optionalText(4000), evidenceUrl: z.string().url().max(2048).optional().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const result = await submitMilestone({ ...input, studentUserId: ctx.user.id });
      if (!result) throw new TRPCError({ code: "BAD_REQUEST", message: "Milestones can only be submitted while your practical is active." });
      return result;
    }),

  submitCompletion: protectedProcedure
    .input(z.object({ arrangementId: z.number().int().positive(), studentReflection: z.string().trim().min(30).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      const result = await submitCompletionReflection(input.arrangementId, ctx.user.id, input.studentReflection);
      if (!result) throw new TRPCError({ code: "BAD_REQUEST", message: "This practical is not ready for a completion reflection." });
      return result;
    }),

  raiseConcern: protectedProcedure
    .input(z.object({
      arrangementId: z.number().int().positive(),
      category: z.enum(["safety", "wellbeing", "conduct", "scope_change", "other"]),
      description: z.string().trim().min(20).max(5000),
    }))
    .mutation(async ({ ctx, input }) => createPracticalConcern({ ...input, raisedByUserId: ctx.user.id })),
});

export const practicalsRouter = router({
  institution: institutionRouter,
  host: hostRouter,
  student: studentRouter,
});
