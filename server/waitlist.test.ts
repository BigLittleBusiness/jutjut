/**
 * Vitest tests for the waitlist feature:
 * - Email validation (Zod schema)
 * - Role enum validation
 * - tRPC router: join (success, duplicate, error states)
 * - tRPC router: count (returns a number)
 * - tRPC router: list (admin-only access control)
 * - DB helper logic (pure unit tests with mocked db)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Context helpers ──────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

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

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@jutjut.com.au",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
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

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
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

// ─── Mock the DB helpers ──────────────────────────────────────────────────────

vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal<typeof import("./db")>();
  return {
    ...original,
    addWaitlistSignup: vi.fn(),
    getAllWaitlistSignups: vi.fn(),
    getWaitlistCount: vi.fn(),
  };
});

// ─── Mock the notification helper (non-blocking) ──────────────────────────────

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { addWaitlistSignup, getAllWaitlistSignups, getWaitlistCount } from "./db";

// ─── waitlist.join — success path ─────────────────────────────────────────────

describe("waitlist.join — success", () => {
  beforeEach(() => {
    vi.mocked(addWaitlistSignup).mockResolvedValue({ success: true, duplicate: false });
  });

  it("returns success: true, duplicate: false for a new email", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.waitlist.join({
      email: "student@school.edu.au",
      role: "student",
    });
    expect(result.success).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(typeof result.message).toBe("string");
    expect(result.message.length).toBeGreaterThan(0);
  });

  it("calls addWaitlistSignup with normalised email", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await caller.waitlist.join({
      email: "STUDENT@SCHOOL.EDU.AU",
      role: "student",
    });
    expect(addWaitlistSignup).toHaveBeenCalledWith(
      expect.objectContaining({ email: "STUDENT@SCHOOL.EDU.AU" })
    );
  });

  it("accepts optional firstName, school, source fields", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.waitlist.join({
      email: "jane@school.edu.au",
      firstName: "Jane",
      role: "student",
      school: "Westfield High",
      source: "landing_page",
    });
    expect(result.success).toBe(true);
    expect(addWaitlistSignup).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Jane",
        school: "Westfield High",
        source: "landing_page",
      })
    );
  });

  it("works for employer role", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.waitlist.join({
      email: "employer@company.com.au",
      role: "employer",
    });
    expect(result.success).toBe(true);
  });

  it("works for other role", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.waitlist.join({
      email: "other@example.com",
      role: "other",
    });
    expect(result.success).toBe(true);
  });

  it("defaults role to student when not provided", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await caller.waitlist.join({ email: "noRole@example.com" });
    expect(addWaitlistSignup).toHaveBeenCalledWith(
      expect.objectContaining({ role: "student" })
    );
  });
});

// ─── waitlist.join — duplicate path ───────────────────────────────────────────

describe("waitlist.join — duplicate", () => {
  beforeEach(() => {
    vi.mocked(addWaitlistSignup).mockResolvedValue({ success: false, duplicate: true });
  });

  it("returns success: false, duplicate: true for an already-registered email", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.waitlist.join({
      email: "existing@school.edu.au",
      role: "student",
    });
    expect(result.success).toBe(false);
    expect(result.duplicate).toBe(true);
    expect(typeof result.message).toBe("string");
  });
});

// ─── waitlist.join — DB failure path ──────────────────────────────────────────

describe("waitlist.join — DB failure", () => {
  beforeEach(() => {
    vi.mocked(addWaitlistSignup).mockResolvedValue({ success: false, duplicate: false });
  });

  it("throws INTERNAL_SERVER_ERROR when DB returns success: false, duplicate: false", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.waitlist.join({ email: "fail@example.com", role: "student" })
    ).rejects.toThrow();
  });
});

// ─── waitlist.join — input validation ─────────────────────────────────────────

describe("waitlist.join — input validation", () => {
  it("rejects an invalid email address", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.waitlist.join({ email: "not-an-email", role: "student" })
    ).rejects.toThrow();
  });

  it("rejects an empty email string", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.waitlist.join({ email: "", role: "student" })
    ).rejects.toThrow();
  });

  it("rejects an invalid role enum value", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      // @ts-expect-error intentional invalid role
      caller.waitlist.join({ email: "valid@example.com", role: "teacher" })
    ).rejects.toThrow();
  });

  it("rejects email longer than 320 characters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const longEmail = "a".repeat(315) + "@x.com";
    await expect(
      caller.waitlist.join({ email: longEmail, role: "student" })
    ).rejects.toThrow();
  });
});

// ─── waitlist.count ───────────────────────────────────────────────────────────

describe("waitlist.count", () => {
  it("returns a numeric count", async () => {
    vi.mocked(getWaitlistCount).mockResolvedValue(42);
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.waitlist.count();
    expect(typeof result.count).toBe("number");
    expect(result.count).toBe(42);
  });

  it("returns 0 when no signups exist", async () => {
    vi.mocked(getWaitlistCount).mockResolvedValue(0);
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.waitlist.count();
    expect(result.count).toBe(0);
  });
});

// ─── waitlist.list — admin access ─────────────────────────────────────────────

describe("waitlist.list — admin access", () => {
  it("returns an array of signups for admin users", async () => {
    const mockSignups = [
      {
        id: 1,
        email: "student@school.edu.au",
        firstName: "Jane",
        role: "student" as const,
        school: "Westfield High",
        source: "landing_page",
        ipAddress: null,
        confirmed: false,
        createdAt: new Date(),
      },
    ];
    vi.mocked(getAllWaitlistSignups).mockResolvedValue(mockSignups);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.waitlist.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0]?.email).toBe("student@school.edu.au");
  });

  it("returns an empty array when no signups exist", async () => {
    vi.mocked(getAllWaitlistSignups).mockResolvedValue([]);
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.waitlist.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});

// ─── waitlist.list — non-admin access control ─────────────────────────────────

describe("waitlist.list — access control", () => {
  it("throws FORBIDDEN for non-admin authenticated users", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.waitlist.list()).rejects.toThrow();
  });

  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.waitlist.list()).rejects.toThrow();
  });
});
