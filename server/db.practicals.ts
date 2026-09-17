/**
 * JutJut Practicals data access.
 *
 * This module deliberately scopes every multi-party query to the calling role.
 * Institutions decide course suitability; businesses host; students apply and
 * complete an approved arrangement. It does not decide whether an individual
 * opportunity meets external regulatory or course requirements.
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import {
  coursePathways,
  employers,
  institutionMembers,
  institutions,
  practicalApplications,
  practicalArrangements,
  practicalCompletionRecords,
  practicalConcerns,
  practicalMilestones,
  practicalOpportunities,
  practicalOpportunityReviews,
  studentPracticalRequirements,
  studentSourcedPracticals,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";

export type PracticalOpportunityInput = {
  employerId: number;
  createdByUserId: number;
  type: "placement" | "project" | "cohort_brief";
  title: string;
  businessNeed: string;
  description: string;
  deliveryMode: "on_site" | "remote" | "hybrid";
  location?: string | null;
  proposedStartAt?: Date | null;
  proposedEndAt?: Date | null;
  estimatedHours?: number | null;
  maxParticipants?: number;
  suggestedCourseAreas?: string | null;
  deliverables: string;
  scopeExclusions?: string | null;
  toolsProvided?: string | null;
  supervisorName: string;
  supervisorTitle?: string | null;
  supervisorEmail: string;
  supervisionCadence: string;
  accessibilityInfo?: string | null;
  paymentDetails?: string | null;
  safetyAcknowledged: boolean;
};

// ─── Access and institution setup ────────────────────────────────────────────

export async function getInstitutionByDomain(domain: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(institutions).where(eq(institutions.domain, domain)).limit(1);
  return rows[0] ?? null;
}

export async function getInstitutionMemberForUser(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ member: institutionMembers, institution: institutions })
    .from(institutionMembers)
    .innerJoin(institutions, eq(institutions.id, institutionMembers.institutionId))
    .where(and(eq(institutionMembers.userId, userId), eq(institutionMembers.active, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function registerInstitution(data: {
  name: string;
  domain: string;
  providerType: "university" | "tafe" | "school" | "other";
  contactName: string;
  contactEmail: string;
  state?: string | null;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const existing = await getInstitutionByDomain(data.domain);
  if (existing) return { institution: existing, alreadyExists: true };

  const result = await db.insert(institutions).values({
    name: data.name,
    domain: data.domain.toLowerCase().trim(),
    providerType: data.providerType,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    state: data.state ?? null,
    approved: false,
  });
  const institutionId = Number((result as unknown as { insertId: number }).insertId);
  await db.insert(institutionMembers).values({
    institutionId,
    userId: data.userId,
    role: "admin",
    active: true,
  });
  const institution = await getInstitutionByDomain(data.domain);
  return { institution, alreadyExists: false };
}

export async function getEmployerForPracticalUser(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(employers).where(eq(employers.userId, userId)).limit(1);
  return rows[0] ?? null;
}

// ─── Course pathways and student requirements ────────────────────────────────

export async function listCoursePathways(institutionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(coursePathways)
    .where(eq(coursePathways.institutionId, institutionId))
    .orderBy(desc(coursePathways.updatedAt));
}

export async function listActiveCoursePathways() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ pathway: coursePathways, institution: institutions })
    .from(coursePathways)
    .innerJoin(institutions, eq(institutions.id, coursePathways.institutionId))
    .where(and(eq(coursePathways.status, "active"), eq(institutions.approved, true)))
    .orderBy(coursePathways.discipline, coursePathways.title);
}

export async function createCoursePathway(data: {
  institutionId: number;
  createdByUserId: number;
  title: string;
  courseName: string;
  unitName?: string | null;
  discipline: string;
  level?: string | null;
  practicalType: "placement" | "project" | "cohort_brief" | "mixed";
  description?: string | null;
  learningOutcomes?: string | null;
  eligibilitySummary?: string | null;
  requiredHours?: number | null;
  requiredDeliverables?: string | null;
  allowedDeliveryModes?: string | null;
  applicationOpenAt?: Date | null;
  applicationCloseAt?: Date | null;
  practicalStartAt?: Date | null;
  practicalEndAt?: Date | null;
  status: "draft" | "active" | "paused" | "archived";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(coursePathways).values(data);
  return { id: Number((result as unknown as { insertId: number }).insertId) };
}

export async function updateCoursePathwayStatus(
  pathwayId: number,
  institutionId: number,
  status: "draft" | "active" | "paused" | "archived"
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(coursePathways)
    .set({ status })
    .where(and(eq(coursePathways.id, pathwayId), eq(coursePathways.institutionId, institutionId)));
}

export async function createStudentRequirement(studentUserId: number, coursePathwayId: number, plannedCompletionAt?: Date | null) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db
    .select()
    .from(studentPracticalRequirements)
    .where(and(eq(studentPracticalRequirements.studentUserId, studentUserId), eq(studentPracticalRequirements.coursePathwayId, coursePathwayId)))
    .limit(1);
  if (existing[0]) return { id: existing[0].id, existing: true };
  const result = await db.insert(studentPracticalRequirements).values({
    studentUserId,
    coursePathwayId,
    plannedCompletionAt: plannedCompletionAt ?? null,
    status: "finding",
  });
  return { id: Number((result as unknown as { insertId: number }).insertId), existing: false };
}

export async function getStudentRequirements(studentUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ requirement: studentPracticalRequirements, pathway: coursePathways, institution: institutions })
    .from(studentPracticalRequirements)
    .innerJoin(coursePathways, eq(coursePathways.id, studentPracticalRequirements.coursePathwayId))
    .innerJoin(institutions, eq(institutions.id, coursePathways.institutionId))
    .where(eq(studentPracticalRequirements.studentUserId, studentUserId))
    .orderBy(desc(studentPracticalRequirements.updatedAt));
}

// ─── Business opportunities and institution review ────────────────────────────

export async function listBusinessPracticalOpportunities(employerId: number) {
  const db = await getDb();
  if (!db) return [];
  const opportunities = await db
    .select()
    .from(practicalOpportunities)
    .where(eq(practicalOpportunities.employerId, employerId))
    .orderBy(desc(practicalOpportunities.updatedAt));
  if (opportunities.length === 0) return [];
  const ids = opportunities.map(o => o.id);
  const reviews = await db
    .select({ review: practicalOpportunityReviews, pathway: coursePathways, institution: institutions })
    .from(practicalOpportunityReviews)
    .innerJoin(coursePathways, eq(coursePathways.id, practicalOpportunityReviews.coursePathwayId))
    .innerJoin(institutions, eq(institutions.id, coursePathways.institutionId))
    .where(inArray(practicalOpportunityReviews.opportunityId, ids));
  return opportunities.map(opportunity => ({
    opportunity,
    reviews: reviews.filter(r => r.review.opportunityId === opportunity.id),
  }));
}

export async function createPracticalOpportunity(input: PracticalOpportunityInput, coursePathwayId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(practicalOpportunities).values({ ...input, status: "submitted" });
  const opportunityId = Number((result as unknown as { insertId: number }).insertId);
  await db.insert(practicalOpportunityReviews).values({
    opportunityId,
    coursePathwayId,
    status: "submitted",
    studentVisibility: false,
  });
  return { id: opportunityId };
}

export async function getInstitutionOpportunityReviews(institutionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      review: practicalOpportunityReviews,
      opportunity: practicalOpportunities,
      pathway: coursePathways,
      employer: employers,
    })
    .from(practicalOpportunityReviews)
    .innerJoin(coursePathways, eq(coursePathways.id, practicalOpportunityReviews.coursePathwayId))
    .innerJoin(practicalOpportunities, eq(practicalOpportunities.id, practicalOpportunityReviews.opportunityId))
    .innerJoin(employers, eq(employers.id, practicalOpportunities.employerId))
    .where(eq(coursePathways.institutionId, institutionId))
    .orderBy(desc(practicalOpportunityReviews.updatedAt));
}

export async function reviewPracticalOpportunity(data: {
  reviewId: number;
  institutionId: number;
  reviewerUserId: number;
  status: "needs_information" | "approved" | "declined";
  reviewNotes?: string | null;
  conditions?: string | null;
  studentVisibility?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select({ review: practicalOpportunityReviews, opportunityId: practicalOpportunities.id })
    .from(practicalOpportunityReviews)
    .innerJoin(coursePathways, eq(coursePathways.id, practicalOpportunityReviews.coursePathwayId))
    .innerJoin(practicalOpportunities, eq(practicalOpportunities.id, practicalOpportunityReviews.opportunityId))
    .where(and(eq(practicalOpportunityReviews.id, data.reviewId), eq(coursePathways.institutionId, data.institutionId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  await db.update(practicalOpportunityReviews).set({
    status: data.status,
    reviewNotes: data.reviewNotes ?? null,
    conditions: data.conditions ?? null,
    studentVisibility: data.status === "approved" ? Boolean(data.studentVisibility ?? true) : false,
    reviewerUserId: data.reviewerUserId,
    reviewedAt: new Date(),
  }).where(eq(practicalOpportunityReviews.id, data.reviewId));

  const opportunityStatus = data.status === "approved" ? "open" : data.status === "needs_information" ? "needs_information" : "closed";
  await db.update(practicalOpportunities).set({ status: opportunityStatus }).where(eq(practicalOpportunities.id, row.opportunityId));
  return row;
}

// ─── Student discovery, applications and self-sourced route ──────────────────

export async function getMatchedOpportunities(studentUserId: number, coursePathwayId?: number) {
  const db = await getDb();
  if (!db) return [];
  const requirements = await db
    .select({ coursePathwayId: studentPracticalRequirements.coursePathwayId })
    .from(studentPracticalRequirements)
    .where(eq(studentPracticalRequirements.studentUserId, studentUserId));
  const pathwayIds = coursePathwayId ? [coursePathwayId] : requirements.map(item => item.coursePathwayId);
  if (pathwayIds.length === 0) return [];
  return db
    .select({
      opportunity: practicalOpportunities,
      review: practicalOpportunityReviews,
      pathway: coursePathways,
      employer: employers,
    })
    .from(practicalOpportunityReviews)
    .innerJoin(practicalOpportunities, eq(practicalOpportunities.id, practicalOpportunityReviews.opportunityId))
    .innerJoin(coursePathways, eq(coursePathways.id, practicalOpportunityReviews.coursePathwayId))
    .innerJoin(employers, eq(employers.id, practicalOpportunities.employerId))
    .where(and(
      inArray(practicalOpportunityReviews.coursePathwayId, pathwayIds),
      eq(practicalOpportunityReviews.status, "approved"),
      eq(practicalOpportunityReviews.studentVisibility, true),
      eq(practicalOpportunities.status, "open")
    ))
    .orderBy(desc(practicalOpportunities.updatedAt));
}

export async function createPracticalApplication(data: {
  opportunityId: number;
  coursePathwayId: number;
  studentUserId: number;
  availability?: string | null;
  statement: string;
  skillsSummary?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const approvedReview = await db
    .select()
    .from(practicalOpportunityReviews)
    .where(and(
      eq(practicalOpportunityReviews.opportunityId, data.opportunityId),
      eq(practicalOpportunityReviews.coursePathwayId, data.coursePathwayId),
      eq(practicalOpportunityReviews.status, "approved"),
      eq(practicalOpportunityReviews.studentVisibility, true)
    ))
    .limit(1);
  if (!approvedReview[0]) return { error: "OPPORTUNITY_NOT_APPROVED" as const };
  const requirement = await db
    .select()
    .from(studentPracticalRequirements)
    .where(and(eq(studentPracticalRequirements.studentUserId, data.studentUserId), eq(studentPracticalRequirements.coursePathwayId, data.coursePathwayId)))
    .limit(1);
  if (!requirement[0]) return { error: "REQUIREMENT_NOT_LINKED" as const };
  const existing = await db
    .select()
    .from(practicalApplications)
    .where(and(eq(practicalApplications.opportunityId, data.opportunityId), eq(practicalApplications.studentUserId, data.studentUserId)))
    .limit(1);
  if (existing[0]) return { error: "ALREADY_APPLIED" as const };
  const result = await db.insert(practicalApplications).values({ ...data, status: "submitted" });
  await db.update(studentPracticalRequirements).set({ status: "applying" }).where(eq(studentPracticalRequirements.id, requirement[0].id));
  return { id: Number((result as unknown as { insertId: number }).insertId) };
}

export async function getStudentApplications(studentUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ application: practicalApplications, opportunity: practicalOpportunities, pathway: coursePathways, employer: employers })
    .from(practicalApplications)
    .innerJoin(practicalOpportunities, eq(practicalOpportunities.id, practicalApplications.opportunityId))
    .innerJoin(coursePathways, eq(coursePathways.id, practicalApplications.coursePathwayId))
    .innerJoin(employers, eq(employers.id, practicalOpportunities.employerId))
    .where(eq(practicalApplications.studentUserId, studentUserId))
    .orderBy(desc(practicalApplications.updatedAt));
}

export async function createStudentSourcedPractical(data: {
  studentUserId: number;
  coursePathwayId: number;
  hostOrganisationName: string;
  hostContactName?: string | null;
  hostContactEmail?: string | null;
  proposedTitle: string;
  proposedDescription: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(studentSourcedPracticals).values({ ...data, status: "submitted" });
  return { id: Number((result as unknown as { insertId: number }).insertId) };
}

export async function getStudentSourcedPracticals(studentUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ proposal: studentSourcedPracticals, pathway: coursePathways, institution: institutions })
    .from(studentSourcedPracticals)
    .innerJoin(coursePathways, eq(coursePathways.id, studentSourcedPracticals.coursePathwayId))
    .innerJoin(institutions, eq(institutions.id, coursePathways.institutionId))
    .where(eq(studentSourcedPracticals.studentUserId, studentUserId))
    .orderBy(desc(studentSourcedPracticals.updatedAt));
}

export async function getInstitutionStudentSourcedPracticals(institutionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ proposal: studentSourcedPracticals, pathway: coursePathways, student: users })
    .from(studentSourcedPracticals)
    .innerJoin(coursePathways, eq(coursePathways.id, studentSourcedPracticals.coursePathwayId))
    .innerJoin(users, eq(users.id, studentSourcedPracticals.studentUserId))
    .where(eq(coursePathways.institutionId, institutionId))
    .orderBy(desc(studentSourcedPracticals.updatedAt));
}

export async function reviewStudentSourcedPractical(data: {
  proposalId: number;
  institutionId: number;
  reviewerUserId: number;
  status: "awaiting_host" | "under_review" | "approved" | "declined";
  coordinatorNote?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select({ proposal: studentSourcedPracticals })
    .from(studentSourcedPracticals)
    .innerJoin(coursePathways, eq(coursePathways.id, studentSourcedPracticals.coursePathwayId))
    .where(and(eq(studentSourcedPracticals.id, data.proposalId), eq(coursePathways.institutionId, data.institutionId)))
    .limit(1);
  if (!rows[0]) return null;
  await db.update(studentSourcedPracticals).set({
    status: data.status,
    coordinatorNote: data.coordinatorNote ?? null,
    reviewedByUserId: data.reviewerUserId,
    reviewedAt: new Date(),
  }).where(eq(studentSourcedPracticals.id, data.proposalId));
  return { success: true };
}

// ─── Matching, arrangements, milestones and completion ───────────────────────

export async function getInstitutionApplications(institutionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      application: practicalApplications,
      student: users,
      opportunity: practicalOpportunities,
      pathway: coursePathways,
      employer: employers,
    })
    .from(practicalApplications)
    .innerJoin(coursePathways, eq(coursePathways.id, practicalApplications.coursePathwayId))
    .innerJoin(practicalOpportunities, eq(practicalOpportunities.id, practicalApplications.opportunityId))
    .innerJoin(employers, eq(employers.id, practicalOpportunities.employerId))
    .innerJoin(users, eq(users.id, practicalApplications.studentUserId))
    .where(eq(coursePathways.institutionId, institutionId))
    .orderBy(desc(practicalApplications.updatedAt));
}

export async function reviewStudentApplication(data: {
  applicationId: number;
  institutionId: number;
  reviewerUserId: number;
  status: "shortlisted" | "approved" | "waitlisted" | "declined";
  reviewNote?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select({ application: practicalApplications, opportunity: practicalOpportunities, pathway: coursePathways })
    .from(practicalApplications)
    .innerJoin(coursePathways, eq(coursePathways.id, practicalApplications.coursePathwayId))
    .innerJoin(practicalOpportunities, eq(practicalOpportunities.id, practicalApplications.opportunityId))
    .where(and(eq(practicalApplications.id, data.applicationId), eq(coursePathways.institutionId, data.institutionId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  await db.update(practicalApplications).set({
    status: data.status,
    reviewNote: data.reviewNote ?? null,
    reviewedByUserId: data.reviewerUserId,
    reviewedAt: new Date(),
  }).where(eq(practicalApplications.id, data.applicationId));

  if (data.status !== "approved") return { ...row, arrangementId: null };

  const existing = await db
    .select()
    .from(practicalArrangements)
    .where(eq(practicalArrangements.applicationId, data.applicationId))
    .limit(1);
  if (existing[0]) return { ...row, arrangementId: existing[0].id };

  const arrangementResult = await db.insert(practicalArrangements).values({
    institutionId: data.institutionId,
    coursePathwayId: row.application.coursePathwayId,
    opportunityId: row.application.opportunityId,
    applicationId: row.application.id,
    employerId: row.opportunity.employerId,
    studentUserId: row.application.studentUserId,
    approvedByUserId: data.reviewerUserId,
    supervisorName: row.opportunity.supervisorName,
    supervisorEmail: row.opportunity.supervisorEmail,
    status: "approved",
  });
  const arrangementId = Number((arrangementResult as unknown as { insertId: number }).insertId);
  await db.insert(practicalCompletionRecords).values({ arrangementId, status: "pending" });
  await db.insert(practicalMilestones).values([
    { arrangementId, title: "Commencement confirmed", description: "Confirm that the practical arrangement is ready to begin.", sortOrder: 1 },
    { arrangementId, title: "Mid-point check-in", description: "Share progress and any support needed with your supervisor and coordinator.", sortOrder: 2 },
    { arrangementId, title: "Final deliverable", description: "Submit the agreed work or evidence of completed placement activities.", sortOrder: 3 },
    { arrangementId, title: "Completion confirmation", description: "Supervisor and coordinator confirm that the practical is complete.", sortOrder: 4 },
  ]);
  await db
    .update(studentPracticalRequirements)
    .set({ status: "approved" })
    .where(and(eq(studentPracticalRequirements.studentUserId, row.application.studentUserId), eq(studentPracticalRequirements.coursePathwayId, row.application.coursePathwayId)));
  await db.update(practicalOpportunities).set({ status: "matching" }).where(eq(practicalOpportunities.id, row.application.opportunityId));
  return { ...row, arrangementId };
}

export async function getStudentArrangements(studentUserId: number) {
  const db = await getDb();
  if (!db) return [];
  const arrangements = await db
    .select({ arrangement: practicalArrangements, opportunity: practicalOpportunities, pathway: coursePathways, employer: employers, completion: practicalCompletionRecords })
    .from(practicalArrangements)
    .innerJoin(practicalOpportunities, eq(practicalOpportunities.id, practicalArrangements.opportunityId))
    .innerJoin(coursePathways, eq(coursePathways.id, practicalArrangements.coursePathwayId))
    .innerJoin(employers, eq(employers.id, practicalArrangements.employerId))
    .leftJoin(practicalCompletionRecords, eq(practicalCompletionRecords.arrangementId, practicalArrangements.id))
    .where(eq(practicalArrangements.studentUserId, studentUserId))
    .orderBy(desc(practicalArrangements.updatedAt));
  if (arrangements.length === 0) return [];
  const ids = arrangements.map(item => item.arrangement.id);
  const milestones = await db
    .select()
    .from(practicalMilestones)
    .where(inArray(practicalMilestones.arrangementId, ids))
    .orderBy(practicalMilestones.sortOrder);
  return arrangements.map(item => ({ ...item, milestones: milestones.filter(m => m.arrangementId === item.arrangement.id) }));
}

export async function getBusinessArrangements(employerId: number) {
  const db = await getDb();
  if (!db) return [];
  const arrangements = await db
    .select({ arrangement: practicalArrangements, opportunity: practicalOpportunities, pathway: coursePathways, student: users, completion: practicalCompletionRecords })
    .from(practicalArrangements)
    .innerJoin(practicalOpportunities, eq(practicalOpportunities.id, practicalArrangements.opportunityId))
    .innerJoin(coursePathways, eq(coursePathways.id, practicalArrangements.coursePathwayId))
    .innerJoin(users, eq(users.id, practicalArrangements.studentUserId))
    .leftJoin(practicalCompletionRecords, eq(practicalCompletionRecords.arrangementId, practicalArrangements.id))
    .where(eq(practicalArrangements.employerId, employerId))
    .orderBy(desc(practicalArrangements.updatedAt));
  return arrangements;
}

export async function confirmArrangementCommencement(arrangementId: number, studentUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const row = await db.select().from(practicalArrangements).where(and(eq(practicalArrangements.id, arrangementId), eq(practicalArrangements.studentUserId, studentUserId))).limit(1);
  if (!row[0] || row[0].status !== "approved") return null;
  await db.update(practicalArrangements).set({ status: "ready_to_commence", agreementConfirmedAt: new Date() }).where(eq(practicalArrangements.id, arrangementId));
  await db.update(practicalMilestones).set({ status: "confirmed", confirmedByUserId: studentUserId, confirmedAt: new Date() }).where(and(eq(practicalMilestones.arrangementId, arrangementId), eq(practicalMilestones.sortOrder, 1)));
  return { success: true };
}

export async function startBusinessArrangement(arrangementId: number, employerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const row = await db.select().from(practicalArrangements).where(and(eq(practicalArrangements.id, arrangementId), eq(practicalArrangements.employerId, employerId))).limit(1);
  if (!row[0] || row[0].status !== "ready_to_commence") return null;
  await db.update(practicalArrangements).set({ status: "active", startedAt: new Date() }).where(eq(practicalArrangements.id, arrangementId));
  await db.update(studentPracticalRequirements).set({ status: "active" }).where(and(eq(studentPracticalRequirements.studentUserId, row[0].studentUserId), eq(studentPracticalRequirements.coursePathwayId, row[0].coursePathwayId)));
  return { success: true };
}

export async function submitMilestone(data: { milestoneId: number; studentUserId: number; studentNote?: string | null; evidenceUrl?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select({ milestone: practicalMilestones, arrangement: practicalArrangements })
    .from(practicalMilestones)
    .innerJoin(practicalArrangements, eq(practicalArrangements.id, practicalMilestones.arrangementId))
    .where(and(eq(practicalMilestones.id, data.milestoneId), eq(practicalArrangements.studentUserId, data.studentUserId)))
    .limit(1);
  if (!rows[0] || rows[0].arrangement.status !== "active") return null;
  await db.update(practicalMilestones).set({
    status: "submitted",
    studentNote: data.studentNote ?? null,
    evidenceUrl: data.evidenceUrl ?? null,
    submittedAt: new Date(),
  }).where(eq(practicalMilestones.id, data.milestoneId));
  return { success: true };
}

export async function confirmMilestone(milestoneId: number, employerId: number, confirmedByUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select({ milestone: practicalMilestones, arrangement: practicalArrangements })
    .from(practicalMilestones)
    .innerJoin(practicalArrangements, eq(practicalArrangements.id, practicalMilestones.arrangementId))
    .where(and(eq(practicalMilestones.id, milestoneId), eq(practicalArrangements.employerId, employerId)))
    .limit(1);
  if (!rows[0] || rows[0].milestone.status !== "submitted") return null;
  await db.update(practicalMilestones).set({ status: "confirmed", confirmedByUserId, confirmedAt: new Date() }).where(eq(practicalMilestones.id, milestoneId));
  return { success: true };
}

export async function submitCompletionReflection(arrangementId: number, studentUserId: number, studentReflection: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const row = await db.select().from(practicalArrangements).where(and(eq(practicalArrangements.id, arrangementId), eq(practicalArrangements.studentUserId, studentUserId))).limit(1);
  if (!row[0] || !["active", "completion_pending"].includes(row[0].status)) return null;
  await db.update(practicalCompletionRecords).set({ studentReflection, status: "pending" }).where(eq(practicalCompletionRecords.arrangementId, arrangementId));
  await db.update(practicalArrangements).set({ status: "completion_pending" }).where(eq(practicalArrangements.id, arrangementId));
  return { success: true };
}

export async function confirmBusinessCompletion(arrangementId: number, employerId: number, supervisorFeedback?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const row = await db.select().from(practicalArrangements).where(and(eq(practicalArrangements.id, arrangementId), eq(practicalArrangements.employerId, employerId))).limit(1);
  if (!row[0] || row[0].status !== "completion_pending") return null;
  await db.update(practicalCompletionRecords).set({
    supervisorFeedback: supervisorFeedback ?? null,
    supervisorConfirmedAt: new Date(),
    status: "supervisor_confirmed",
  }).where(eq(practicalCompletionRecords.arrangementId, arrangementId));
  return { success: true };
}

export async function getInstitutionArrangements(institutionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ arrangement: practicalArrangements, opportunity: practicalOpportunities, pathway: coursePathways, student: users, employer: employers, completion: practicalCompletionRecords })
    .from(practicalArrangements)
    .innerJoin(practicalOpportunities, eq(practicalOpportunities.id, practicalArrangements.opportunityId))
    .innerJoin(coursePathways, eq(coursePathways.id, practicalArrangements.coursePathwayId))
    .innerJoin(users, eq(users.id, practicalArrangements.studentUserId))
    .innerJoin(employers, eq(employers.id, practicalArrangements.employerId))
    .leftJoin(practicalCompletionRecords, eq(practicalCompletionRecords.arrangementId, practicalArrangements.id))
    .where(eq(practicalArrangements.institutionId, institutionId))
    .orderBy(desc(practicalArrangements.updatedAt));
}

/** Institution-owned exception queue for safety, wellbeing, conduct and scope concerns. */
export async function getInstitutionConcerns(institutionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      concern: practicalConcerns,
      arrangement: practicalArrangements,
      student: users,
      opportunity: practicalOpportunities,
      pathway: coursePathways,
    })
    .from(practicalConcerns)
    .innerJoin(practicalArrangements, eq(practicalArrangements.id, practicalConcerns.arrangementId))
    .innerJoin(users, eq(users.id, practicalArrangements.studentUserId))
    .innerJoin(practicalOpportunities, eq(practicalOpportunities.id, practicalArrangements.opportunityId))
    .innerJoin(coursePathways, eq(coursePathways.id, practicalArrangements.coursePathwayId))
    .where(eq(practicalArrangements.institutionId, institutionId))
    .orderBy(desc(practicalConcerns.updatedAt));
}

export async function updateInstitutionConcern(data: {
  concernId: number;
  institutionId: number;
  coordinatorUserId: number;
  status: "under_review" | "resolved";
  resolution?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select({ id: practicalConcerns.id })
    .from(practicalConcerns)
    .innerJoin(practicalArrangements, eq(practicalArrangements.id, practicalConcerns.arrangementId))
    .where(and(eq(practicalConcerns.id, data.concernId), eq(practicalArrangements.institutionId, data.institutionId)))
    .limit(1);
  if (!rows[0]) return null;

  await db.update(practicalConcerns).set({
    status: data.status,
    assignedToUserId: data.coordinatorUserId,
    resolution: data.status === "resolved" ? data.resolution ?? null : null,
    resolvedAt: data.status === "resolved" ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(practicalConcerns.id, data.concernId));
  return { success: true };
}

export async function confirmInstitutionCompletion(data: { arrangementId: number; institutionId: number; coordinatorUserId: number; outcomeSummary: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(practicalArrangements).where(and(eq(practicalArrangements.id, data.arrangementId), eq(practicalArrangements.institutionId, data.institutionId))).limit(1);
  const arrangement = rows[0];
  if (!arrangement || arrangement.status !== "completion_pending") return null;
  const completion = await db.select().from(practicalCompletionRecords).where(eq(practicalCompletionRecords.arrangementId, data.arrangementId)).limit(1);
  if (!completion[0]?.supervisorConfirmedAt) return { error: "SUPERVISOR_CONFIRMATION_REQUIRED" as const };
  await db.update(practicalCompletionRecords).set({
    coordinatorUserId: data.coordinatorUserId,
    coordinatorConfirmedAt: new Date(),
    outcomeSummary: data.outcomeSummary,
    status: "completed",
  }).where(eq(practicalCompletionRecords.arrangementId, data.arrangementId));
  await db.update(practicalArrangements).set({ status: "completed", endedAt: new Date() }).where(eq(practicalArrangements.id, data.arrangementId));
  await db.update(studentPracticalRequirements).set({ status: "completed" }).where(and(eq(studentPracticalRequirements.studentUserId, arrangement.studentUserId), eq(studentPracticalRequirements.coursePathwayId, arrangement.coursePathwayId)));
  return { success: true };
}

export async function createPracticalConcern(data: {
  arrangementId: number;
  raisedByUserId: number;
  category: "safety" | "wellbeing" | "conduct" | "scope_change" | "other";
  description: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(practicalConcerns).values({ ...data, status: "open" });
  return { id: Number((result as unknown as { insertId: number }).insertId) };
}
