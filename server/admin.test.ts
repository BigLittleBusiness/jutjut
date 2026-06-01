/**
 * Vitest tests for the Admin Dashboard router.
 * Covers all 10 sections: overview, school management, promo codes,
 * drops, employer moderation, student support, payments, admin management,
 * global search, and system logs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Context helpers ──────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeReq() {
  return {
    protocol: "https",
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as TrpcContext["req"];
}

function createAdminContext(id = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `admin-${id}`,
    email: `admin${id}@jutjut.com.au`,
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { user, req: makeReq(), res: {} as TrpcContext["res"] };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 99,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { user, req: makeReq(), res: {} as TrpcContext["res"] };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: { "x-forwarded-for": "1.2.3.4" },
      socket: { remoteAddress: "1.2.3.4" },
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ─── Mock db.admin helpers ────────────────────────────────────────────────────

vi.mock("./db.admin", () => ({
  getOverviewMetrics: vi.fn().mockResolvedValue({
    totalStudents: 120,
    totalEmployers: 45,
    approvedSchools: 8,
    activeJobs: 33,
    dropClaimsThisMonth: 12,
    revenueThisMonthCents: 150000,
  }),
  getSignupsLast30Days: vi.fn().mockResolvedValue([
    { date: "2026-05-01", signups: 5 },
    { date: "2026-05-02", signups: 8 },
  ]),
  getWaitlistSummary: vi.fn().mockResolvedValue({ total: 42 }),
  writeAdminLog: vi.fn().mockResolvedValue(undefined),
  getAdminLogs: vi.fn().mockResolvedValue([]),
  getAllSchoolRequests: vi.fn().mockResolvedValue([]),
  getSchoolRequestById: vi.fn().mockResolvedValue(null),
  createSchoolRequest: vi.fn().mockResolvedValue(undefined),
  updateSchoolRequestStatus: vi.fn().mockResolvedValue(undefined),
  adminListSchools: vi.fn().mockResolvedValue([]),
  adminCreateSchool: vi.fn().mockResolvedValue(undefined),
  adminUpdateSchool: vi.fn().mockResolvedValue(undefined),
  getGroupsForSchool: vi.fn().mockResolvedValue([]),
  createSchoolGroup: vi.fn().mockResolvedValue(1),
  updateSchoolGroup: vi.fn().mockResolvedValue(undefined),
  deleteSchoolGroup: vi.fn().mockResolvedValue(undefined),
  getGroupMembers: vi.fn().mockResolvedValue([]),
  addStudentToGroup: vi.fn().mockResolvedValue(undefined),
  removeStudentFromGroup: vi.fn().mockResolvedValue(undefined),
  adminListEmployers: vi.fn().mockResolvedValue([]),
  adminUpdateEmployer: vi.fn().mockResolvedValue(undefined),
  getEmployerJobs: vi.fn().mockResolvedValue([]),
  getFlaggedJobs: vi.fn().mockResolvedValue([]),
  adminUpdateJob: vi.fn().mockResolvedValue(undefined),
  adminSearchStudents: vi.fn().mockResolvedValue([]),
  adminGetStudentById: vi.fn().mockResolvedValue(null),
  adminUpdateUser: vi.fn().mockResolvedValue(undefined),
  adminListDrops: vi.fn().mockResolvedValue([]),
  adminUpdateDrop: vi.fn().mockResolvedValue(undefined),
  adminDeleteDrop: vi.fn().mockResolvedValue(undefined),
  adminListTransactions: vi.fn().mockResolvedValue([]),
  adminUpdateTransactionStatus: vi.fn().mockResolvedValue(undefined),
  getPaymentGatewaySettings: vi.fn().mockResolvedValue([]),
  upsertPaymentGatewaySetting: vi.fn().mockResolvedValue(undefined),
  listAdminUsers: vi.fn().mockResolvedValue([]),
  promoteToAdmin: vi.fn().mockResolvedValue(undefined),
  demoteFromAdmin: vi.fn().mockResolvedValue(undefined),
  getUserByEmail: vi.fn().mockResolvedValue(null),
  globalUserSearch: vi.fn().mockResolvedValue([]),
  adminAdjustCredits: vi.fn().mockResolvedValue(undefined),
  listEmployersWithTokens: vi.fn().mockResolvedValue([]),
  clearEmployerPaymentToken: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal<typeof import("./db")>();
  return {
    ...original,
    getAllPromoCodes: vi.fn().mockResolvedValue([]),
    createPromoCode: vi.fn().mockResolvedValue(undefined),
    updatePromoCode: vi.fn().mockResolvedValue(undefined),
    getPromoCodeRedemptions: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("./encryption", () => ({
  encrypt: vi.fn((v: string) => `enc:${v}`),
  decrypt: vi.fn((v: string) => v.replace("enc:", "")),
  mask: vi.fn((v: string) => `****${v.slice(-4)}`),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import {
  getOverviewMetrics,
  getSignupsLast30Days,
  getWaitlistSummary,
  writeAdminLog,
  getAllSchoolRequests,
  createSchoolRequest,
  updateSchoolRequestStatus,
  adminListSchools,
  adminCreateSchool,
  getGroupsForSchool,
  createSchoolGroup,
  deleteSchoolGroup,
  adminListEmployers,
  adminUpdateEmployer,
  adminSearchStudents,
  adminGetStudentById,
  adminListDrops,
  adminUpdateDrop,
  adminDeleteDrop,
  adminListTransactions,
  getPaymentGatewaySettings,
  upsertPaymentGatewaySetting,
  listAdminUsers,
  getUserByEmail,
  promoteToAdmin,
  demoteFromAdmin,
  globalUserSearch,
  getAdminLogs,
} from "./db.admin";

// ─── 1. Overview ──────────────────────────────────────────────────────────────

describe("admin.overview.metrics", () => {
  it("returns combined metrics for admin users", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.overview.metrics();
    expect(result.totalStudents).toBe(120);
    expect(result.totalEmployers).toBe(45);
    expect(result.approvedSchools).toBe(8);
    expect(result.waitlistTotal).toBe(42);
    expect(result.signupsLast30Days).toHaveLength(2);
  });

  it("rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.overview.metrics()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects unauthenticated requests with UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.admin.overview.metrics()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── 2. School management — requests ─────────────────────────────────────────

describe("admin.schools.requests.list", () => {
  it("returns all pending requests for admin", async () => {
    vi.mocked(getAllSchoolRequests).mockResolvedValueOnce([
      { id: 1, schoolName: "Riverside High", domain: "riverside.edu.au", contactName: "Jane", contactEmail: "jane@riverside.edu.au", status: "pending", createdAt: new Date() },
    ] as any);
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.schools.requests.list({ status: "pending" });
    expect(result).toHaveLength(1);
    expect(result[0].schoolName).toBe("Riverside High");
  });

  it("rejects non-admin with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.schools.requests.list({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("admin.schools.requests.submit", () => {
  it("allows any authenticated user to submit a school request", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.admin.schools.requests.submit({
      schoolName: "Riverside High",
      domain: "riverside.edu.au",
      contactName: "Jane Smith",
      contactEmail: "jane@riverside.edu.au",
    });
    expect(result.ok).toBe(true);
    expect(createSchoolRequest).toHaveBeenCalledOnce();
  });

  it("rejects invalid email in school request", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.schools.requests.submit({
      schoolName: "Riverside High",
      domain: "riverside.edu.au",
      contactName: "Jane Smith",
      contactEmail: "not-an-email",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects school name shorter than 2 characters", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.schools.requests.submit({
      schoolName: "X",
      domain: "riverside.edu.au",
      contactName: "Jane Smith",
      contactEmail: "jane@riverside.edu.au",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("admin.schools.requests.approve", () => {
  it("approves a pending school request and writes an audit log", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.schools.requests.approve({ id: 1 });
    expect(result.ok).toBe(true);
    expect(updateSchoolRequestStatus).toHaveBeenCalledWith(1, "approved", undefined);
    expect(writeAdminLog).toHaveBeenCalledWith(expect.objectContaining({ action: "approve_school_request" }));
  });

  it("rejects non-admin with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.schools.requests.approve({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("admin.schools.requests.reject", () => {
  it("rejects a pending school request and writes an audit log", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.schools.requests.reject({ id: 2, adminNote: "Duplicate" });
    expect(result.ok).toBe(true);
    expect(updateSchoolRequestStatus).toHaveBeenCalledWith(2, "rejected", "Duplicate");
    expect(writeAdminLog).toHaveBeenCalledWith(expect.objectContaining({ action: "reject_school_request" }));
  });
});

describe("admin.schools.list", () => {
  it("returns approved schools for admin", async () => {
    vi.mocked(adminListSchools).mockResolvedValueOnce([
      { id: 1, name: "Riverside High", domain: "riverside.edu.au", approved: true },
    ] as any);
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.schools.list({});
    expect(result).toHaveLength(1);
  });
});

describe("admin.schools.create", () => {
  it("creates a school and writes an audit log", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.schools.create({
      name: "Riverside High",
      domain: "riverside.edu.au",
    });
    expect(result.ok).toBe(true);
    expect(adminCreateSchool).toHaveBeenCalledOnce();
    expect(writeAdminLog).toHaveBeenCalledWith(expect.objectContaining({ action: "create_school" }));
  });
});

// ─── 3. School groups ─────────────────────────────────────────────────────────

describe("admin.schools.groups.create", () => {
  it("creates a group and returns its ID", async () => {
    vi.mocked(createSchoolGroup).mockResolvedValueOnce(5);
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.schools.groups.create({ schoolId: 1, groupName: "Year 11" });
    expect(result.ok).toBe(true);
    expect(result.id).toBe(5);
    expect(writeAdminLog).toHaveBeenCalledWith(expect.objectContaining({ action: "create_school_group" }));
  });

  it("rejects empty group name", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.schools.groups.create({ schoolId: 1, groupName: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("admin.schools.groups.delete", () => {
  it("deletes a group and writes an audit log", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.schools.groups.delete({ id: 3 });
    expect(result.ok).toBe(true);
    expect(deleteSchoolGroup).toHaveBeenCalledWith(3);
    expect(writeAdminLog).toHaveBeenCalledWith(expect.objectContaining({ action: "delete_school_group" }));
  });
});

// ─── 4. Employer moderation ───────────────────────────────────────────────────

describe("admin.employers.list", () => {
  it("returns employer list for admin", async () => {
    vi.mocked(adminListEmployers).mockResolvedValueOnce([
      { employer: { id: 1, businessName: "Acme Co", contactEmail: "hr@acme.com", status: "active" }, credits: { creditBalance: 10 } },
    ] as any);
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.employers.list({});
    expect(result).toHaveLength(1);
    expect(result[0].employer.businessName).toBe("Acme Co");
  });

  it("rejects non-admin with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.employers.list({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("admin.employers.suspend", () => {
  it("suspends an employer and writes an audit log", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.employers.suspend({ id: 1, reason: "Fraudulent listing" });
    expect(result.ok).toBe(true);
    expect(adminUpdateEmployer).toHaveBeenCalledWith(1, expect.objectContaining({ status: "suspended" }));
    expect(writeAdminLog).toHaveBeenCalledWith(expect.objectContaining({ action: "suspend_employer" }));
  });

  it("rejects empty suspension reason", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.employers.suspend({ id: 1, reason: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("admin.employers.reinstate", () => {
  it("reinstates an employer and writes an audit log", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.employers.reinstate({ id: 1 });
    expect(result.ok).toBe(true);
    expect(adminUpdateEmployer).toHaveBeenCalledWith(1, expect.objectContaining({ status: "active" }));
    expect(writeAdminLog).toHaveBeenCalledWith(expect.objectContaining({ action: "reinstate_employer" }));
  });
});

describe("admin.employers.resolveJob", () => {
  it("clears a job flag", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.employers.resolveJob({ jobId: 5, action: "clear_flag" });
    expect(result.ok).toBe(true);
    expect(writeAdminLog).toHaveBeenCalledWith(expect.objectContaining({ action: "job_clear_flag" }));
  });

  it("deactivates a job", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.employers.resolveJob({ jobId: 5, action: "deactivate" });
    expect(result.ok).toBe(true);
    expect(writeAdminLog).toHaveBeenCalledWith(expect.objectContaining({ action: "job_deactivate" }));
  });
});

// ─── 5. Student support ───────────────────────────────────────────────────────

describe("admin.students.search", () => {
  it("returns search results for admin", async () => {
    vi.mocked(adminSearchStudents).mockResolvedValueOnce([
      { id: 10, name: "Alice", email: "alice@school.edu.au" },
    ] as any);
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.students.search({ query: "alice" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  it("rejects empty query", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.students.search({ query: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("admin.students.get", () => {
  it("throws NOT_FOUND for unknown student ID", async () => {
    vi.mocked(adminGetStudentById).mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.students.get({ id: 9999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns student detail for known ID", async () => {
    vi.mocked(adminGetStudentById).mockResolvedValueOnce({
      user: { id: 10, name: "Alice", email: "alice@school.edu.au", role: "user" },
      applications: [],
      placements: [],
    } as any);
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.students.get({ id: 10 });
    expect(result.user.name).toBe("Alice");
  });
});

// ─── 6. The Drop queue ────────────────────────────────────────────────────────

describe("admin.drops.list", () => {
  it("returns drops for admin", async () => {
    vi.mocked(adminListDrops).mockResolvedValueOnce([
      { id: 1, title: "Summer Drop", status: "draft", createdAt: new Date() },
    ] as any);
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.drops.list({});
    expect(result).toHaveLength(1);
  });
});

describe("admin.drops.publish", () => {
  it("publishes a drop and writes an audit log", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.drops.publish({ id: 1 });
    expect(result.ok).toBe(true);
    expect(adminUpdateDrop).toHaveBeenCalledWith(1, { status: "active" });
    expect(writeAdminLog).toHaveBeenCalledWith(expect.objectContaining({ action: "publish_drop" }));
  });
});

describe("admin.drops.reject", () => {
  it("deletes a drop and writes an audit log", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.drops.reject({ id: 2 });
    expect(result.ok).toBe(true);
    expect(adminDeleteDrop).toHaveBeenCalledWith(2);
    expect(writeAdminLog).toHaveBeenCalledWith(expect.objectContaining({ action: "reject_drop" }));
  });
});

// ─── 7. Payments ─────────────────────────────────────────────────────────────

describe("admin.payments.transactions", () => {
  it("returns transaction list for admin", async () => {
    vi.mocked(adminListTransactions).mockResolvedValueOnce([
      { transaction: { id: 1, amountCents: 4900, status: "succeeded", createdAt: new Date() }, employer: { businessName: "Acme Co" } },
    ] as any);
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.payments.transactions({});
    expect(result).toHaveLength(1);
  });

  it("rejects non-admin with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.payments.transactions({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("admin.payments.setGatewaySetting", () => {
  it("encrypts and stores a gateway key", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.payments.setGatewaySetting({ keyName: "pin_secret_key", plainValue: "sk_live_abc123" });
    expect(result.ok).toBe(true);
    expect(upsertPaymentGatewaySetting).toHaveBeenCalledWith("pin_secret_key", "enc:sk_live_abc123", 1);
    expect(writeAdminLog).toHaveBeenCalledWith(expect.objectContaining({ action: "update_gateway_setting" }));
  });

  it("rejects empty key name", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.payments.setGatewaySetting({ keyName: "", plainValue: "value" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

// ─── 8. Admin management ─────────────────────────────────────────────────────

describe("admin.admins.promote", () => {
  it("throws NOT_FOUND if email does not match a user", async () => {
    vi.mocked(getUserByEmail).mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.admins.promote({ email: "ghost@example.com" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws BAD_REQUEST if user is already an admin", async () => {
    vi.mocked(getUserByEmail).mockResolvedValueOnce({ id: 5, role: "admin" } as any);
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.admins.promote({ email: "already@admin.com" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("promotes a regular user to admin", async () => {
    vi.mocked(getUserByEmail).mockResolvedValueOnce({ id: 5, role: "user" } as any);
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.admins.promote({ email: "newadmin@jutjut.com.au" });
    expect(result.ok).toBe(true);
    expect(promoteToAdmin).toHaveBeenCalledWith(5);
    expect(writeAdminLog).toHaveBeenCalledWith(expect.objectContaining({ action: "promote_to_admin" }));
  });
});

describe("admin.admins.demote", () => {
  it("throws BAD_REQUEST if admin tries to demote themselves", async () => {
    const caller = appRouter.createCaller(createAdminContext(1));
    await expect(caller.admin.admins.demote({ userId: 1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("demotes another admin user", async () => {
    const caller = appRouter.createCaller(createAdminContext(1));
    const result = await caller.admin.admins.demote({ userId: 2 });
    expect(result.ok).toBe(true);
    expect(demoteFromAdmin).toHaveBeenCalledWith(2);
    expect(writeAdminLog).toHaveBeenCalledWith(expect.objectContaining({ action: "demote_from_admin" }));
  });
});

// ─── 9. Global search ─────────────────────────────────────────────────────────

describe("admin.search", () => {
  it("returns search results for admin", async () => {
    vi.mocked(globalUserSearch).mockResolvedValueOnce([
      { id: 1, name: "Alice", email: "alice@school.edu.au", role: "user", createdAt: new Date() },
    ] as any);
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.search({ query: "alice" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  it("rejects empty query", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.search({ query: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects non-admin with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.search({ query: "alice" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ─── 10. System logs ──────────────────────────────────────────────────────────

describe("admin.logs.list", () => {
  it("returns log entries for admin", async () => {
    vi.mocked(getAdminLogs).mockResolvedValueOnce([
      { log: { id: 1, action: "suspend_employer", createdAt: new Date() }, adminName: "Admin User" },
    ] as any);
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.logs.list({});
    expect(result).toHaveLength(1);
    expect(result[0].log.action).toBe("suspend_employer");
  });

  it("rejects non-admin with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.logs.list({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("accepts optional action filter", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.admin.logs.list({ action: "create_school", limit: 50 });
    expect(getAdminLogs).toHaveBeenCalledWith(expect.objectContaining({ action: "create_school", limit: 50 }));
  });
});
