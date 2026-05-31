/**
 * Vitest tests for the Schools feature:
 *
 * school.auth.register    — success, duplicate domain, invalid input
 * school.auth.me          — approved access, pending rejection, unregistered rejection
 * school.manage.list      — admin only
 * school.manage.approve   — admin only, not-found guard
 * school.students.list    — requires approved school access
 * school.students.kit     — returns kit, not-found guard
 * school.students.enrol   — requires approved school access
 * school.employers.list   — requires approved school access
 * school.placements.create — generates token, requires school access
 * school.placements.list  — scoped to school
 * school.placements.signAsSchool — status guard (must be approved_by_employer)
 * school.placements.employerRespond — approve / reject via token
 * school.placements.signAsStudent — status guard (must be approved_by_school)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Context helpers ──────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 10,
    openId: "school-staff-open-id",
    email: "careers@brisbaneshs.eq.edu.au",
    name: "Jane Smith",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function createContext(user: AuthenticatedUser | null = null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const schoolStaffCtx = () => createContext(makeUser());
const adminCtx = () => createContext(makeUser({ id: 1, email: "admin@jutjut.com.au", role: "admin" }));
const publicCtx = () => createContext(null);

// ─── Mock DB helpers ──────────────────────────────────────────────────────────

vi.mock("./db.school", () => ({
  getSchoolByDomain: vi.fn(),
  getSchoolById: vi.fn(),
  getAllSchools: vi.fn(),
  createSchool: vi.fn(),
  approveSchool: vi.fn(),
  getStudentsForSchool: vi.fn(),
  getStudentKitForSchool: vi.fn(),
  enrolStudentInSchool: vi.fn(),
  getEmployersForSchools: vi.fn(),
  createPlacement: vi.fn(),
  getPlacementsBySchool: vi.fn(),
  getPlacementById: vi.fn(),
  getPlacementByToken: vi.fn(),
  updatePlacementStatus: vi.fn(),
  signPlacementAsStudent: vi.fn(),
  getPlacementsForEmployer: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import * as dbSchool from "./db.school";

const APPROVED_SCHOOL = {
  id: 5,
  name: "Brisbane State High School",
  domain: "brisbaneshs.eq.edu.au",
  approved: true,
  state: "QLD",
  careersContactName: "Jane Smith",
  careersContactEmail: "careers@brisbaneshs.eq.edu.au",
  phone: "07 3000 0000",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const PENDING_SCHOOL = { ...APPROVED_SCHOOL, id: 6, approved: false };

// ─── school.auth.register ─────────────────────────────────────────────────────

describe("school.auth.register", () => {
  beforeEach(() => {
    vi.mocked(dbSchool.getSchoolByDomain).mockResolvedValue(null);
    vi.mocked(dbSchool.createSchool).mockResolvedValue(undefined as any);
  });

  it("creates a school and returns success: true", async () => {
    const caller = appRouter.createCaller(schoolStaffCtx());
    const result = await caller.school.auth.register({
      name: "Brisbane State High School",
      domain: "brisbaneshs.eq.edu.au",
    });
    expect(result.success).toBe(true);
    expect(dbSchool.createSchool).toHaveBeenCalledOnce();
  });

  it("normalises domain to lowercase", async () => {
    const caller = appRouter.createCaller(schoolStaffCtx());
    await caller.school.auth.register({
      name: "Test School",
      domain: "TESTSCHOOL.EDU.AU",
    });
    expect(dbSchool.createSchool).toHaveBeenCalledWith(
      expect.objectContaining({ domain: "testschool.edu.au" })
    );
  });

  it("throws CONFLICT if domain already registered", async () => {
    vi.mocked(dbSchool.getSchoolByDomain).mockResolvedValue(APPROVED_SCHOOL as any);
    const caller = appRouter.createCaller(schoolStaffCtx());
    await expect(
      caller.school.auth.register({ name: "Duplicate", domain: "brisbaneshs.eq.edu.au" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects name shorter than 2 characters", async () => {
    const caller = appRouter.createCaller(schoolStaffCtx());
    await expect(
      caller.school.auth.register({ name: "X", domain: "valid.edu.au" })
    ).rejects.toThrow();
  });

  it("rejects domain shorter than 4 characters", async () => {
    const caller = appRouter.createCaller(schoolStaffCtx());
    await expect(
      caller.school.auth.register({ name: "Valid School", domain: "ab" })
    ).rejects.toThrow();
  });

  it("requires authentication — unauthenticated throws UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(
      caller.school.auth.register({ name: "Test", domain: "test.edu.au" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── school.auth.me ───────────────────────────────────────────────────────────

describe("school.auth.me", () => {
  it("returns school record for approved school staff", async () => {
    vi.mocked(dbSchool.getSchoolByDomain).mockResolvedValue(APPROVED_SCHOOL as any);
    const caller = appRouter.createCaller(schoolStaffCtx());
    const result = await caller.school.auth.me();
    expect(result.id).toBe(5);
    expect(result.name).toBe("Brisbane State High School");
  });

  it("throws FORBIDDEN with pending message when school not yet approved", async () => {
    vi.mocked(dbSchool.getSchoolByDomain).mockResolvedValue(PENDING_SCHOOL as any);
    const caller = appRouter.createCaller(schoolStaffCtx());
    await expect(caller.school.auth.me()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("pending admin approval"),
    });
  });

  it("throws FORBIDDEN when email domain not registered", async () => {
    vi.mocked(dbSchool.getSchoolByDomain).mockResolvedValue(null);
    const caller = appRouter.createCaller(schoolStaffCtx());
    await expect(caller.school.auth.me()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.school.auth.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── school.manage (admin) ────────────────────────────────────────────────────

describe("school.manage.list", () => {
  it("returns all schools for admin", async () => {
    vi.mocked(dbSchool.getAllSchools).mockResolvedValue([APPROVED_SCHOOL, PENDING_SCHOOL] as any);
    const caller = appRouter.createCaller(adminCtx());
    const result = await caller.school.manage.list();
    expect(result).toHaveLength(2);
  });

  it("throws FORBIDDEN for non-admin user", async () => {
    vi.mocked(dbSchool.getSchoolByDomain).mockResolvedValue(APPROVED_SCHOOL as any);
    const caller = appRouter.createCaller(schoolStaffCtx());
    await expect(caller.school.manage.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("school.manage.approve", () => {
  it("approves a pending school", async () => {
    vi.mocked(dbSchool.getSchoolById).mockResolvedValue(PENDING_SCHOOL as any);
    vi.mocked(dbSchool.approveSchool).mockResolvedValue(undefined as any);
    const caller = appRouter.createCaller(adminCtx());
    const result = await caller.school.manage.approve({ schoolId: 6 });
    expect(result.success).toBe(true);
    expect(dbSchool.approveSchool).toHaveBeenCalledWith(6);
  });

  it("throws NOT_FOUND for unknown school ID", async () => {
    vi.mocked(dbSchool.getSchoolById).mockResolvedValue(null);
    const caller = appRouter.createCaller(adminCtx());
    await expect(caller.school.manage.approve({ schoolId: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ─── school.students ─────────────────────────────────────────────────────────

describe("school.students.list", () => {
  beforeEach(() => {
    vi.mocked(dbSchool.getSchoolByDomain).mockResolvedValue(APPROVED_SCHOOL as any);
    vi.mocked(dbSchool.getStudentsForSchool).mockResolvedValue([] as any);
  });

  it("returns student list for approved school staff", async () => {
    const caller = appRouter.createCaller(schoolStaffCtx());
    const result = await caller.school.students.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(dbSchool.getStudentsForSchool).toHaveBeenCalledWith(5, expect.any(Object));
  });

  it("passes search and incompleteOnly filters to DB helper", async () => {
    const caller = appRouter.createCaller(schoolStaffCtx());
    await caller.school.students.list({ search: "Jamie", incompleteOnly: true });
    expect(dbSchool.getStudentsForSchool).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ search: "Jamie", incompleteOnly: true })
    );
  });

  it("throws FORBIDDEN for unapproved school", async () => {
    vi.mocked(dbSchool.getSchoolByDomain).mockResolvedValue(PENDING_SCHOOL as any);
    const caller = appRouter.createCaller(schoolStaffCtx());
    await expect(caller.school.students.list({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("school.students.kit", () => {
  beforeEach(() => {
    vi.mocked(dbSchool.getSchoolByDomain).mockResolvedValue(APPROVED_SCHOOL as any);
  });

  it("returns kit for a valid student ID", async () => {
    const mockKit = { user: { id: 42, name: "Jamie", email: "jamie@brisbaneshs.eq.edu.au", createdAt: new Date() }, profile: null, credentials: [], vouches: [], reportCards: [], applications: [] };
    vi.mocked(dbSchool.getStudentKitForSchool).mockResolvedValue(mockKit as any);
    const caller = appRouter.createCaller(schoolStaffCtx());
    const result = await caller.school.students.kit({ studentId: 42 });
    expect(result.user.id).toBe(42);
  });

  it("throws NOT_FOUND for unknown student", async () => {
    vi.mocked(dbSchool.getStudentKitForSchool).mockResolvedValue(null);
    const caller = appRouter.createCaller(schoolStaffCtx());
    await expect(caller.school.students.kit({ studentId: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ─── school.employers ────────────────────────────────────────────────────────

describe("school.employers.list", () => {
  beforeEach(() => {
    vi.mocked(dbSchool.getSchoolByDomain).mockResolvedValue(APPROVED_SCHOOL as any);
    vi.mocked(dbSchool.getEmployersForSchools).mockResolvedValue([] as any);
  });

  it("returns employer list for approved school staff", async () => {
    const caller = appRouter.createCaller(schoolStaffCtx());
    const result = await caller.school.employers.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("passes filters to DB helper", async () => {
    const caller = appRouter.createCaller(schoolStaffCtx());
    await caller.school.employers.list({ industry: "Hospitality", acceptsWorkExperienceOnly: true });
    expect(dbSchool.getEmployersForSchools).toHaveBeenCalledWith(
      expect.objectContaining({ industry: "Hospitality", acceptsWorkExperienceOnly: true })
    );
  });
});

// ─── school.placements ───────────────────────────────────────────────────────

describe("school.placements.create", () => {
  beforeEach(() => {
    vi.mocked(dbSchool.getSchoolByDomain).mockResolvedValue(APPROVED_SCHOOL as any);
    vi.mocked(dbSchool.createPlacement).mockResolvedValue(undefined as any);
  });

  it("creates a placement and returns a UUID employer token", async () => {
    const caller = appRouter.createCaller(schoolStaffCtx());
    const result = await caller.school.placements.create({
      studentId: 42,
      employerId: 7,
      startDate: "2026-07-01",
      endDate: "2026-07-05",
      hoursPerWeek: 8,
    });
    expect(result.success).toBe(true);
    expect(result.employerToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("rejects invalid date format", async () => {
    const caller = appRouter.createCaller(schoolStaffCtx());
    await expect(
      caller.school.placements.create({
        studentId: 42,
        employerId: 7,
        startDate: "01/07/2026",
        endDate: "2026-07-05",
        hoursPerWeek: 8,
      })
    ).rejects.toThrow();
  });

  it("rejects hoursPerWeek > 40", async () => {
    const caller = appRouter.createCaller(schoolStaffCtx());
    await expect(
      caller.school.placements.create({
        studentId: 42,
        employerId: 7,
        startDate: "2026-07-01",
        endDate: "2026-07-05",
        hoursPerWeek: 41,
      })
    ).rejects.toThrow();
  });
});

describe("school.placements.signAsSchool", () => {
  beforeEach(() => {
    vi.mocked(dbSchool.getSchoolByDomain).mockResolvedValue(APPROVED_SCHOOL as any);
    vi.mocked(dbSchool.updatePlacementStatus).mockResolvedValue(undefined as any);
  });

  it("signs placement when status is approved_by_employer", async () => {
    vi.mocked(dbSchool.getPlacementById).mockResolvedValue({
      id: 1,
      schoolId: 5,
      status: "approved_by_employer",
    } as any);
    const caller = appRouter.createCaller(schoolStaffCtx());
    const result = await caller.school.placements.signAsSchool({
      placementId: 1,
      signerName: "Jane Smith",
    });
    expect(result.success).toBe(true);
    expect(dbSchool.updatePlacementStatus).toHaveBeenCalledWith(
      1,
      "approved_by_school",
      expect.objectContaining({ field: "schoolSignature" }),
    );
  });

  it("throws BAD_REQUEST when placement is not yet approved by employer", async () => {
    vi.mocked(dbSchool.getPlacementById).mockResolvedValue({
      id: 1,
      schoolId: 5,
      status: "pending_employer",
    } as any);
    const caller = appRouter.createCaller(schoolStaffCtx());
    await expect(
      caller.school.placements.signAsSchool({ placementId: 1, signerName: "Jane Smith" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws NOT_FOUND for placement belonging to a different school", async () => {
    vi.mocked(dbSchool.getPlacementById).mockResolvedValue({
      id: 1,
      schoolId: 99, // different school
      status: "approved_by_employer",
    } as any);
    const caller = appRouter.createCaller(schoolStaffCtx());
    await expect(
      caller.school.placements.signAsSchool({ placementId: 1, signerName: "Jane Smith" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("school.placements.employerRespond", () => {
  const TOKEN = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.mocked(dbSchool.updatePlacementStatus).mockResolvedValue(undefined as any);
  });

  it("approves placement and records employer signature", async () => {
    vi.mocked(dbSchool.getPlacementByToken).mockResolvedValue({
      id: 2,
      status: "pending_employer",
      employerToken: TOKEN,
    } as any);
    const caller = appRouter.createCaller(schoolStaffCtx());
    const result = await caller.school.placements.employerRespond({
      token: TOKEN,
      decision: "approve",
      signerName: "Bob Employer",
    });
    expect(result.success).toBe(true);
    expect(dbSchool.updatePlacementStatus).toHaveBeenCalledWith(
      2,
      "approved_by_employer",
      expect.objectContaining({ field: "employerSignature" }),
      undefined,
    );
  });

  it("rejects placement when decision is reject", async () => {
    vi.mocked(dbSchool.getPlacementByToken).mockResolvedValue({
      id: 2,
      status: "pending_employer",
      employerToken: TOKEN,
    } as any);
    const caller = appRouter.createCaller(schoolStaffCtx());
    const result = await caller.school.placements.employerRespond({
      token: TOKEN,
      decision: "reject",
      signerName: "Bob Employer",
    });
    expect(result.success).toBe(true);
    expect(dbSchool.updatePlacementStatus).toHaveBeenCalledWith(2, "rejected", undefined, undefined);
  });

  it("throws BAD_REQUEST if placement already responded to", async () => {
    vi.mocked(dbSchool.getPlacementByToken).mockResolvedValue({
      id: 2,
      status: "approved_by_employer",
      employerToken: TOKEN,
    } as any);
    const caller = appRouter.createCaller(schoolStaffCtx());
    await expect(
      caller.school.placements.employerRespond({
        token: TOKEN,
        decision: "approve",
        signerName: "Bob",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws NOT_FOUND for unknown token", async () => {
    vi.mocked(dbSchool.getPlacementByToken).mockResolvedValue(null);
    const caller = appRouter.createCaller(schoolStaffCtx());
    await expect(
      caller.school.placements.employerRespond({
        token: TOKEN,
        decision: "approve",
        signerName: "Bob",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("school.placements.signAsStudent", () => {
  beforeEach(() => {
    vi.mocked(dbSchool.signPlacementAsStudent).mockResolvedValue(undefined as any);
  });

  it("signs placement when status is approved_by_school and student matches", async () => {
    vi.mocked(dbSchool.getPlacementById).mockResolvedValue({
      id: 3,
      studentId: 10, // matches makeUser default id
      status: "approved_by_school",
    } as any);
    const caller = appRouter.createCaller(schoolStaffCtx());
    const result = await caller.school.placements.signAsStudent({ placementId: 3 });
    expect(result.success).toBe(true);
    expect(dbSchool.signPlacementAsStudent).toHaveBeenCalledWith(3, expect.any(String));
  });

  it("throws BAD_REQUEST when placement not yet approved by school", async () => {
    vi.mocked(dbSchool.getPlacementById).mockResolvedValue({
      id: 3,
      studentId: 10,
      status: "approved_by_employer",
    } as any);
    const caller = appRouter.createCaller(schoolStaffCtx());
    await expect(
      caller.school.placements.signAsStudent({ placementId: 3 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws NOT_FOUND when placement belongs to a different student", async () => {
    vi.mocked(dbSchool.getPlacementById).mockResolvedValue({
      id: 3,
      studentId: 999, // different student
      status: "approved_by_school",
    } as any);
    const caller = appRouter.createCaller(schoolStaffCtx());
    await expect(
      caller.school.placements.signAsStudent({ placementId: 3 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
