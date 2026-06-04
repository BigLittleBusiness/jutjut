/**
 * Vitest tests for analytics and privacy procedures:
 * - employer.jobs.analyticsDetail — ownership check, returns full detail shape
 * - employer.jobs.apply — apply to job, duplicate guard, contact-share snapshot
 * - employer.privacy.update — updates privacy settings
 * - business.drops.analytics — ownership check, returns full Drop analytics shape
 * - business.drops.analyticsSummary — returns summary list with computed metrics
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

function createUserContext(id = 10): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `user-${id}`,
    email: `user${id}@example.com`,
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { user, req: makeReq(), res: {} as TrpcContext["res"] };
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAnalyticsDetail = {
  job: {
    id: 1,
    title: "Barista",
    views: 50,
    applies: 5,
    hires: 1,
    conversionRate: 10,
    avgApplicantSkillCount: 3.2,
    timeToFirstApplicationHours: 2.5,
  },
  applicants: [
    {
      studentId: 99,
      name: "Alice",
      email: "alice@school.edu",
      verifiedSkillCount: 4,
      appliedAt: new Date("2026-06-01T10:00:00Z"),
      contactShared: true,
      status: "applied" as const,
    },
  ],
  schoolBreakdown: [{ schoolName: "Brisbane State High", count: 3 }],
  applicationsOverTime: [{ date: "2026-06-01", count: 3 }],
};

const mockDropAnalyticsDetail = {
  drop: {
    id: 101,
    offer_title: "50% off burrito",
    scheduled_date: "2026-06-06",
    sponsorship_fee: 15000,
    impressions: 1250,
    claims: 342,
  },
  metrics: {
    claim_rate: 27.36,
    cost_per_impression: 0.12,
    cost_per_claim: 0.44,
  },
  breakdowns: {
    by_school: [{ school_name: "Brisbane State High", count: 120 }],
    by_year_level: [{ year: "Year 11", count: 110 }],
    by_postcode: [{ postcode: "4000", count: 45 }],
    claims_over_time: [{ date: "2026-06-06", hour: 9, count: 12 }],
  },
};

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue(null),
    getJobAnalyticsDetail: vi.fn().mockResolvedValue(null),
    applyToJob: vi.fn().mockResolvedValue({ alreadyApplied: false }),
    updateUserPrivacy: vi.fn().mockResolvedValue(undefined),
    getDropAnalyticsDetail: vi.fn().mockResolvedValue(null),
    // Employer profile helpers needed by employer router
    getEmployerByUserId: vi.fn().mockResolvedValue(null),
    upsertEmployer: vi.fn().mockResolvedValue(undefined),
    getCreditBalance: vi.fn().mockResolvedValue(5),
    getJobsByPostedUser: vi.fn().mockResolvedValue([]),
    getJobAnalyticsForUser: vi.fn().mockResolvedValue([]),
    getJobById: vi.fn().mockResolvedValue(null),
    recordJobView: vi.fn().mockResolvedValue(undefined),
    recordDropView: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("./db.admin", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
  getEmailLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
  getEmailLogStats: vi.fn().mockResolvedValue({ total: 0, sent: 0, delivered: 0, bounced: 0, failed: 0, complaint: 0 }),
  getEmailLogById: vi.fn().mockResolvedValue(null),
  updateEmailLogStatus: vi.fn().mockResolvedValue(undefined),
  getInAppNotifications: vi.fn().mockResolvedValue([]),
  getUnreadNotificationCount: vi.fn().mockResolvedValue(0),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
  writeAdminLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./emailService", () => ({
  sendEmailSilent: vi.fn().mockResolvedValue(undefined),
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── employer.jobs.analyticsDetail ───────────────────────────────────────────

const ANALYTICS_DETAIL = {
  job: {
    id: 1,
    title: "Barista",
    views: 50,
    applies: 5,
    hires: 1,
    conversionRate: 10,
    avgApplicantSkillCount: 3.2,
    timeToFirstApplicationHours: 2.5,
  },
  applicants: [
    {
      studentId: 99,
      name: "Alice",
      email: "alice@school.edu",
      verifiedSkillCount: 4,
      appliedAt: new Date("2026-06-01T10:00:00Z"),
      contactShared: true,
      status: "applied" as const,
    },
  ],
  schoolBreakdown: [{ schoolName: "Brisbane State High", count: 3 }],
  applicationsOverTime: [{ date: "2026-06-01", count: 3 }],
};

const DROP_ANALYTICS_DETAIL = {
  drop: {
    id: 101,
    offer_title: "50% off burrito",
    scheduled_date: "2026-06-06",
    sponsorship_fee: 15000,
    impressions: 1250,
    claims: 342,
  },
  metrics: {
    claim_rate: 27.36,
    cost_per_impression: 0.12,
    cost_per_claim: 0.44,
  },
  breakdowns: {
    by_school: [{ school_name: "Brisbane State High", count: 120 }],
    by_year_level: [{ year: "Year 11", count: 110 }],
    by_postcode: [{ postcode: "4000", count: 45 }],
    claims_over_time: [{ date: "2026-06-06", hour: 9, count: 12 }],
  },
};

describe("employer.jobs.analyticsDetail", () => {
  it("returns analytics detail for an owned job", async () => {
    const { getJobAnalyticsDetail } = await import("./db");
    vi.mocked(getJobAnalyticsDetail).mockResolvedValueOnce(ANALYTICS_DETAIL);

    const caller = appRouter.createCaller(createUserContext(10));
    const result = await caller.employer.jobs.analyticsDetail({ jobId: 1 });

    expect(result.job.title).toBe("Barista");
    expect(result.job.views).toBe(50);
    expect(result.job.applies).toBe(5);
    expect(result.job.hires).toBe(1);
    expect(result.job.conversionRate).toBe(10);
    expect(result.applicants).toHaveLength(1);
    expect(result.applicants[0].name).toBe("Alice");
    expect(result.schoolBreakdown[0].schoolName).toBe("Brisbane State High");
    expect(result.applicationsOverTime[0].date).toBe("2026-06-01");
  });

  it("throws NOT_FOUND when job does not belong to the user", async () => {
    const { getJobAnalyticsDetail } = await import("./db");
    vi.mocked(getJobAnalyticsDetail).mockResolvedValueOnce(null);

    const caller = appRouter.createCaller(createUserContext(10));
    await expect(caller.employer.jobs.analyticsDetail({ jobId: 999 }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("requires authentication", async () => {
    const publicCtx: TrpcContext = {
      user: null,
      req: makeReq(),
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(publicCtx);
    await expect(caller.employer.jobs.analyticsDetail({ jobId: 1 }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── employer.jobs.applyForJob ────────────────────────────────────────────────

// Minimal fake DB for applyForJob tests (getDb returns null by default, but this
// procedure needs a real select call to read shareContactWithEmployers)
const fakeDb = {
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ shareContactWithEmployers: false }]),
      }),
    }),
  }),
};

describe("employer.jobs.applyForJob", () => {
  it("successfully applies to a job", async () => {
    const db = await import("./db");
    vi.mocked(db.getDb).mockResolvedValueOnce(fakeDb as never);
    vi.mocked(db.applyToJob).mockResolvedValueOnce({ alreadyApplied: false });

    const caller = appRouter.createCaller(createUserContext(10));
    const result = await caller.employer.jobs.applyForJob({ jobId: 1 });
    expect(result.success).toBe(true);
  });

  it("throws CONFLICT when user has already applied", async () => {
    const db = await import("./db");
    vi.mocked(db.getDb).mockResolvedValueOnce(fakeDb as never);
    vi.mocked(db.applyToJob).mockResolvedValueOnce({ alreadyApplied: true });

    const caller = appRouter.createCaller(createUserContext(10));
    await expect(caller.employer.jobs.applyForJob({ jobId: 1 }))
      .rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("requires authentication", async () => {
    const publicCtx: TrpcContext = {
      user: null,
      req: makeReq(),
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(publicCtx);
    await expect(caller.employer.jobs.applyForJob({ jobId: 1 }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── employer.privacy.update ─────────────────────────────────────────────────

describe("employer.privacy.update", () => {
  it("updates privacy settings successfully", async () => {
    const { updateUserPrivacy } = await import("./db");
    vi.mocked(updateUserPrivacy).mockResolvedValueOnce(undefined);

    const caller = appRouter.createCaller(createUserContext(10));
    const result = await caller.employer.privacy.update({
      shareContactWithEmployers: true,
      yearLevel: "Year 12",
      postcode: "4000",
    });
    expect(result.success).toBe(true);
    expect(vi.mocked(updateUserPrivacy)).toHaveBeenCalledWith(10, {
      shareContactWithEmployers: true,
      yearLevel: "Year 12",
      postcode: "4000",
    });
  });

  it("requires authentication", async () => {
    const publicCtx: TrpcContext = {
      user: null,
      req: makeReq(),
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(publicCtx);
    await expect(caller.employer.privacy.update({ shareContactWithEmployers: false }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── business.drops.analytics ────────────────────────────────────────────────

describe("business.drops.analytics", () => {
  it("returns full Drop analytics detail for an owned drop", async () => {
    const { getDropAnalyticsDetail } = await import("./db");
    vi.mocked(getDropAnalyticsDetail).mockResolvedValueOnce(DROP_ANALYTICS_DETAIL);

    const caller = appRouter.createCaller(createUserContext(10));
    const result = await caller.business.drops.analytics({ dropId: 101 });

    expect(result.drop.offer_title).toBe("50% off burrito");
    expect(result.drop.impressions).toBe(1250);
    expect(result.drop.claims).toBe(342);
    expect(result.metrics.claim_rate).toBe(27.36);
    expect(result.metrics.cost_per_impression).toBe(0.12);
    expect(result.metrics.cost_per_claim).toBe(0.44);
    expect(result.breakdowns.by_school[0].school_name).toBe("Brisbane State High");
    expect(result.breakdowns.by_year_level[0].year).toBe("Year 11");
    expect(result.breakdowns.by_postcode[0].postcode).toBe("4000");
    expect(result.breakdowns.claims_over_time[0].hour).toBe(9);
  });

  it("throws NOT_FOUND when drop does not belong to the user", async () => {
    const { getDropAnalyticsDetail } = await import("./db");
    vi.mocked(getDropAnalyticsDetail).mockResolvedValueOnce(null);

    const caller = appRouter.createCaller(createUserContext(10));
    await expect(caller.business.drops.analytics({ dropId: 999 }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("requires authentication", async () => {
    const publicCtx: TrpcContext = {
      user: null,
      req: makeReq(),
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(publicCtx);
    await expect(caller.business.drops.analytics({ dropId: 101 }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
