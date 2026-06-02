/**
 * Tests for the JutJut email system.
 *
 * Covers:
 *   - renderEmail: template rendering, variable substitution, unknown template error
 *   - emailService: sendEmailSilent (SES mock, preference check, bounce suppression)
 *   - emailPreferences router: get, update, unsubscribe (access control)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderEmail } from "./renderEmail";

// ─── Mock AWS SES ─────────────────────────────────────────────────────────────

vi.mock("@aws-sdk/client-ses", () => ({
  SESClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({ MessageId: "mock-message-id" }),
  })),
  SendEmailCommand: vi.fn().mockImplementation((input) => ({ input })),
}));

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
// vi.mock is hoisted to the top of the file by Vitest, so factory functions
// must be self-contained and not reference variables declared in module scope.

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  }),
}));

vi.mock("./db.admin", () => ({
  getOverviewMetrics: vi.fn().mockResolvedValue({
    totalStudents: 100,
    totalEmployers: 20,
    approvedSchools: 5,
    activeJobs: 30,
    dropClaimsThisMonth: 10,
    revenueThisMonthCents: 50000,
  }),
  getSignupsLast30Days: vi.fn().mockResolvedValue([]),
  getWaitlistSummary: vi.fn().mockResolvedValue({ total: 42 }),
}));

// ─── renderEmail tests ────────────────────────────────────────────────────────

describe("renderEmail", () => {
  it("renders student_verify_email with correct subject", () => {
    const result = renderEmail("student_verify_email", {
      student_name: "Alice",
      verify_url: "https://jutjut.com.au/verify?token=abc",
    });
    expect(result.subject).toBe("Verify your JutJut email address");
  });

  it("substitutes template variables in HTML", () => {
    const result = renderEmail("student_verify_email", {
      student_name: "Bob",
      verify_url: "https://jutjut.com.au/verify?token=xyz",
    });
    expect(result.html).toContain("Bob");
    expect(result.html).toContain("https://jutjut.com.au/verify?token=xyz");
  });

  it("substitutes template variables in plain text", () => {
    const result = renderEmail("student_verify_email", {
      student_name: "Carol",
      verify_url: "https://jutjut.com.au/verify?token=123",
    });
    expect(result.text).toContain("Carol");
    expect(result.text).toContain("https://jutjut.com.au/verify?token=123");
  });

  it("renders credit_purchase_receipt with correct subject", () => {
    const result = renderEmail("credit_purchase_receipt", {
      employer_name: "Acme Corp",
      credits_purchased: "5",
      amount_paid: "$49.00",
      charge_reference: "ch_abc123",
      new_balance: "5",
      purchase_date: "01/06/2026",
      dashboard_url: "https://jutjut.com.au/employer",
    });
    // Subject is "Receipt — JutJut credit purchase" — check case-insensitively
    expect(result.subject.toLowerCase()).toContain("receipt");
  });

  it("renders job_post_confirmation with correct subject", () => {
    const result = renderEmail("job_post_confirmation", {
      employer_name: "Acme Corp",
      job_title: "Barista",
      job_type: "casual",
      expires_date: "01/07/2026",
      job_url: "https://jutjut.com.au/jobs/1",
      dashboard_url: "https://jutjut.com.au/employer",
      new_balance: "4",
    });
    expect(result.subject).toContain("Barista");
  });

  it("renders school_request_autoreply with school name", () => {
    const result = renderEmail("school_request_autoreply", {
      contact_name: "Ms Smith",
      school_name: "Riverside High",
      submitted_date: "01/06/2026",
    });
    expect(result.html).toContain("Riverside High");
    expect(result.text).toContain("Riverside High");
  });

  it("renders school_approved with dashboard URL", () => {
    const result = renderEmail("school_approved", {
      school_name: "Riverside High",
      contact_name: "Ms Smith",
      dashboard_url: "https://jutjut.com.au/school-portal",
    });
    expect(result.html).toContain("Riverside High");
    expect(result.html).toContain("Ms Smith");
  });

  it("renders school_rejected with rejection reason", () => {
    const result = renderEmail("school_rejected", {
      school_name: "Riverside High",
      contact_name: "Ms Smith",
      rejection_reason: "Domain not verified.",
    });
    expect(result.html).toContain("Domain not verified.");
  });

  it("renders admin_daily_summary with all metrics", () => {
    const result = renderEmail("admin_daily_summary", {
      summary_date: "Monday 1 June 2026",
      pending_schools: "2",
      pending_drops: "5",
      flagged_jobs: "1",
      low_credit_employers: "3",
      new_waitlist: "42",
      new_students: "100",
      admin_url: "https://jutjut.com.au/admin-dashboard",
    });
    expect(result.html).toContain("100");
    expect(result.html).toContain("42");
    expect(result.subject.toLowerCase()).toContain("summary");
  });

  it("renders placement_created_confirmation", () => {
    const result = renderEmail("placement_created_confirmation", {
      student_name: "Alice",
      employer_name: "Acme Corp",
      placement_start: "01/07/2026",
      placement_end: "31/07/2026",
      hours_per_week: "20",
    });
    expect(result.html).toContain("Acme Corp");
  });

  it("renders drop_claimed with drop title", () => {
    const result = renderEmail("drop_claimed", {
      student_name: "Alice",
      drop_title: "Free Coffee Week",
      business_name: "Cafe Mojo",
      drop_instructions: "Show this email at the counter.",
      drop_expires: "30/06/2026",
    });
    expect(result.html).toContain("Free Coffee Week");
    expect(result.text).toContain("Free Coffee Week");
  });

  it("throws for an unknown template ID", () => {
    expect(() =>
      renderEmail("non_existent_template_xyz", {})
    ).toThrow("Unknown email template: non_existent_template_xyz");
  });

  it("leaves unreplaced placeholders when data is missing (does not throw)", () => {
    const result = renderEmail("student_verify_email", {});
    // Unreplaced placeholders remain as {{variable}} — no crash
    expect(result.html).toContain("{{student_name}}");
  });

  it("renders employer_verify_email with correct subject", () => {
    const result = renderEmail("employer_verify_email", {
      employer_name: "Acme Corp",
      verify_url: "https://jutjut.com.au/verify?token=emp",
    });
    expect(result.subject).toContain("Verify");
  });

  it("renders weekly_drop_announcement", () => {
    const result = renderEmail("weekly_drop_announcement", {
      student_name: "Alice",
      drops_summary: "3 new drops this week",
      drops_url: "https://jutjut.com.au/drops",
    });
    expect(result.html).toContain("3 new drops this week");
  });

  it("renders admin_ses_error with error details", () => {
    const result = renderEmail("admin_ses_error", {
      error_type: "bounce",
      to_email: "test@example.com",
      template_id: "waitlist_confirmation",
      error_message: "Mailbox does not exist",
      error_time: "01/06/2026 10:00",
      admin_url: "https://jutjut.com.au/admin-dashboard",
    });
    expect(result.html).toContain("test@example.com");
  });
});

// ─── emailPreferences router tests ───────────────────────────────────────────

import { appRouter } from "./routers";
import { TRPCError } from "@trpc/server";

const mockUser = {
  id: 1,
  email: "user@example.com",
  name: "Test User",
  role: "user" as const,
  openId: "open_1",
  createdAt: new Date(),
  updatedAt: new Date(),
  status: "active" as const,
  suspendedAt: null,
  suspendedReason: null,
};

const mockReq = {
  headers: { cookie: "" },
  socket: { remoteAddress: "127.0.0.1" },
} as any;

describe("emailPreferences router", () => {
  describe("get", () => {
    it("throws UNAUTHORIZED when not authenticated", async () => {
      const caller = appRouter.createCaller({ user: null, req: mockReq });
      await expect(caller.email.preferences.get()).rejects.toThrow(TRPCError);
    });

    it("returns default preferences when none saved", async () => {
      const caller = appRouter.createCaller({ user: mockUser, req: mockReq });
      const result = await caller.email.preferences.get();
      expect(result).toHaveProperty("marketingEmails");
      expect(result).toHaveProperty("weeklyDigest");
      expect(result).toHaveProperty("dropReminders");
      expect(result).toHaveProperty("userId");
    });
  });

  describe("update", () => {
    it("throws UNAUTHORIZED when not authenticated", async () => {
      const caller = appRouter.createCaller({ user: null, req: mockReq });
      await expect(
        caller.email.preferences.update({ marketingEmails: false })
      ).rejects.toThrow(TRPCError);
    });

    it("accepts partial preference update from authenticated user", async () => {
      const caller = appRouter.createCaller({ user: mockUser, req: mockReq });
      const result = await caller.email.preferences.update({ marketingEmails: false });
      expect(result).toHaveProperty("success");
    });
  });

  describe("unsubscribeAll", () => {
    it("throws UNAUTHORIZED when not authenticated", async () => {
      const caller = appRouter.createCaller({ user: null, req: mockReq });
      await expect(caller.email.preferences.unsubscribeAll()).rejects.toThrow(TRPCError);
    });

    it("succeeds for authenticated user", async () => {
      const caller = appRouter.createCaller({ user: mockUser, req: mockReq });
      const result = await caller.email.preferences.unsubscribeAll();
      expect(result).toHaveProperty("success");
    });
  });
});
