import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db.practicals", () => ({
  confirmArrangementCommencement: vi.fn(),
  confirmBusinessCompletion: vi.fn(),
  confirmInstitutionCompletion: vi.fn(),
  confirmMilestone: vi.fn(),
  createCoursePathway: vi.fn(),
  createPracticalApplication: vi.fn(),
  createPracticalConcern: vi.fn(),
  createPracticalOpportunity: vi.fn(),
  createStudentRequirement: vi.fn(),
  createStudentSourcedPractical: vi.fn(),
  getBusinessArrangements: vi.fn(),
  getEmployerForPracticalUser: vi.fn(),
  getInstitutionApplications: vi.fn(),
  getInstitutionArrangements: vi.fn(),
  getInstitutionByDomain: vi.fn(),
  getInstitutionMemberForUser: vi.fn(),
  getInstitutionOpportunityReviews: vi.fn(),
  getInstitutionStudentSourcedPracticals: vi.fn(),
  getMatchedOpportunities: vi.fn(),
  getStudentApplications: vi.fn(),
  getStudentArrangements: vi.fn(),
  getStudentRequirements: vi.fn(),
  getStudentSourcedPracticals: vi.fn(),
  listActiveCoursePathways: vi.fn(),
  listBusinessPracticalOpportunities: vi.fn(),
  listCoursePathways: vi.fn(),
  registerInstitution: vi.fn(),
  reviewPracticalOpportunity: vi.fn(),
  reviewStudentApplication: vi.fn(),
  reviewStudentSourcedPractical: vi.fn(),
  startBusinessArrangement: vi.fn(),
  submitCompletionReflection: vi.fn(),
  submitMilestone: vi.fn(),
  updateCoursePathwayStatus: vi.fn(),
}));

import { appRouter } from "./routers";
import * as db from "./db.practicals";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 42,
    openId: "practicals-test-user",
    email: "coordinator@coastal.edu.au",
    name: "Taylor Morgan",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeContext(user: AuthenticatedUser | null = makeUser()): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const APPROVED_INSTITUTION = { id: 7, name: "Coastal Institute", domain: "coastal.edu.au", approved: true };
const INSTITUTION_MEMBER = { id: 11, institutionId: 7, userId: 42, role: "coordinator", active: true };
const ACTIVE_PATHWAY = { pathway: { id: 21, status: "active", title: "Marketing Industry Project" }, institution: APPROVED_INSTITUTION };

describe("JutJut Practicals — permissions and approval gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getInstitutionMemberForUser).mockResolvedValue(null as any);
    vi.mocked(db.getEmployerForPracticalUser).mockResolvedValue(null as any);
    vi.mocked(db.listActiveCoursePathways).mockResolvedValue([] as any);
  });

  it("requires an authenticated user for student practical data", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.practicals.student.requirements()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("prevents a user without a business profile from hosting a practical", async () => {
    const caller = appRouter.createCaller(makeContext());
    await expect(caller.practicals.host.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("prevents unapproved institutions from publishing pathways", async () => {
    vi.mocked(db.getInstitutionMemberForUser).mockResolvedValue({
      member: INSTITUTION_MEMBER,
      institution: { ...APPROVED_INSTITUTION, approved: false },
    } as any);
    const caller = appRouter.createCaller(makeContext());
    await expect(caller.practicals.institution.pathways.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns institution pathways for an approved coordinator", async () => {
    vi.mocked(db.getInstitutionMemberForUser).mockResolvedValue({ member: INSTITUTION_MEMBER, institution: APPROVED_INSTITUTION } as any);
    vi.mocked(db.listCoursePathways).mockResolvedValue([{ id: 21, title: "Marketing Industry Project", status: "active" }] as any);
    const caller = appRouter.createCaller(makeContext());
    await expect(caller.practicals.institution.pathways.list()).resolves.toEqual([{ id: 21, title: "Marketing Industry Project", status: "active" }]);
    expect(db.listCoursePathways).toHaveBeenCalledWith(7);
  });

  it("only links a student requirement to an active course pathway", async () => {
    vi.mocked(db.listActiveCoursePathways).mockResolvedValue([ACTIVE_PATHWAY] as any);
    vi.mocked(db.createStudentRequirement).mockResolvedValue({ id: 81, existing: false });
    const caller = appRouter.createCaller(makeContext(makeUser({ email: "student@example.com" })));
    await expect(caller.practicals.student.linkRequirement({ coursePathwayId: 21 })).resolves.toEqual({ id: 81, existing: false });
    expect(db.createStudentRequirement).toHaveBeenCalledWith(42, 21, undefined);
  });

  it("blocks a student from linking an inactive or unavailable pathway", async () => {
    vi.mocked(db.listActiveCoursePathways).mockResolvedValue([] as any);
    const caller = appRouter.createCaller(makeContext(makeUser({ email: "student@example.com" })));
    await expect(caller.practicals.student.linkRequirement({ coursePathwayId: 21 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("does not allow an application when the opportunity lacks institutional approval", async () => {
    vi.mocked(db.createPracticalApplication).mockResolvedValue({ error: "OPPORTUNITY_NOT_APPROVED" } as any);
    const caller = appRouter.createCaller(makeContext(makeUser({ email: "student@example.com" })));
    await expect(caller.practicals.student.submitApplication({
      opportunityId: 31,
      coursePathwayId: 21,
      statement: "I can apply the learning from my marketing course to the stated project brief.",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("allows an active business to submit a fully scoped opportunity to an active pathway", async () => {
    vi.mocked(db.getEmployerForPracticalUser).mockResolvedValue({ id: 9, userId: 42, businessName: "Local Co", status: "active" } as any);
    vi.mocked(db.listActiveCoursePathways).mockResolvedValue([ACTIVE_PATHWAY] as any);
    vi.mocked(db.createPracticalOpportunity).mockResolvedValue({ id: 31 });
    const caller = appRouter.createCaller(makeContext());
    await expect(caller.practicals.host.submitOpportunity({
      coursePathwayId: 21,
      type: "project",
      title: "Local marketing research project",
      businessNeed: "We need to understand which local audience segments engage with our services before we plan the next campaign.",
      description: "The student will research available customer information, identify practical audience themes and prepare a clear campaign recommendation for the business.",
      deliveryMode: "hybrid",
      maxParticipants: 1,
      suggestedCourseAreas: ["Marketing"],
      deliverables: "A short audience insight report and proposed campaign outline.",
      supervisorName: "Alex Green",
      supervisorEmail: "alex@localco.com.au",
      supervisionCadence: "Weekly check-in",
      safetyAcknowledged: true,
    })).resolves.toEqual({ id: 31 });
    expect(db.createPracticalOpportunity).toHaveBeenCalledWith(expect.objectContaining({ employerId: 9, createdByUserId: 42, type: "project" }), 21);
  });

  it("creates an arrangement only when the institution approves the named student", async () => {
    vi.mocked(db.getInstitutionMemberForUser).mockResolvedValue({ member: INSTITUTION_MEMBER, institution: APPROVED_INSTITUTION } as any);
    vi.mocked(db.reviewStudentApplication).mockResolvedValue({ arrangementId: 55 } as any);
    const caller = appRouter.createCaller(makeContext());
    await expect(caller.practicals.institution.review.decideApplication({ applicationId: 66, status: "approved" })).resolves.toEqual({ success: true, arrangementId: 55 });
    expect(db.reviewStudentApplication).toHaveBeenCalledWith(expect.objectContaining({ applicationId: 66, institutionId: 7, reviewerUserId: 42, status: "approved" }));
  });

  it("requires supervisor confirmation before an institution can complete a practical", async () => {
    vi.mocked(db.getInstitutionMemberForUser).mockResolvedValue({ member: INSTITUTION_MEMBER, institution: APPROVED_INSTITUTION } as any);
    vi.mocked(db.confirmInstitutionCompletion).mockResolvedValue({ error: "SUPERVISOR_CONFIRMATION_REQUIRED" } as any);
    const caller = appRouter.createCaller(makeContext());
    await expect(caller.practicals.institution.review.confirmCompletion({ arrangementId: 55, outcomeSummary: "The student completed the approved project and supplied the required evidence." })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
