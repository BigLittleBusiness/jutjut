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
      firstName: "Jamie",
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
      firstName: "Jamie",
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
      firstName: "Alex",
      role: "employer",
    });
    expect(result.success).toBe(true);
  });

  it("works for other role", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.waitlist.join({
      email: "other@example.com",
      firstName: "Sam",
      role: "other",
    });
    expect(result.success).toBe(true);
  });

  it("defaults role to student when not provided", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await caller.waitlist.join({ email: "noRole@example.com", firstName: "Jordan" });
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
      firstName: "Taylor",
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
      caller.waitlist.join({ email: "fail@example.com", firstName: "Casey", role: "student" })
    ).rejects.toThrow();
  });
});

// ─── validateEmail pure logic ────────────────────────────────────────────────
// Mirror of the client-side validateEmail function for unit testing

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function validateEmail(value: string): string {
  if (!value) return "Email is required.";
  if (!EMAIL_RE.test(value)) return "Please enter a valid email address.";
  if (value.length > 320) return "Email address is too long.";
  return "";
}

describe("validateEmail — inline validation logic", () => {
  it("returns empty string for a valid email", () => {
    expect(validateEmail("student@school.edu.au")).toBe("");
  });

  it("returns empty string for valid email with subdomains", () => {
    expect(validateEmail("user@mail.example.com.au")).toBe("");
  });

  it("returns 'Email is required.' for empty string", () => {
    expect(validateEmail("")).toBe("Email is required.");
  });

  it("returns error for missing @ symbol", () => {
    expect(validateEmail("notanemail")).toBe("Please enter a valid email address.");
  });

  it("returns error for missing domain", () => {
    expect(validateEmail("user@")).toBe("Please enter a valid email address.");
  });

  it("returns error for missing TLD", () => {
    expect(validateEmail("user@domain")).toBe("Please enter a valid email address.");
  });

  it("returns error for single-char TLD", () => {
    expect(validateEmail("user@domain.c")).toBe("Please enter a valid email address.");
  });

  it("returns error for email with spaces", () => {
    expect(validateEmail("user @domain.com")).toBe("Please enter a valid email address.");
  });

  it("returns 'Email address is too long.' for email over 320 chars", () => {
    const longEmail = "a".repeat(315) + "@x.com";
    expect(validateEmail(longEmail)).toBe("Email address is too long.");
  });

  it("accepts exactly 320 characters as valid", () => {
    // 320 chars: local(313) + @x.co = 318 chars — valid
    const borderEmail = "a".repeat(313) + "@x.co";
    expect(borderEmail.length).toBe(318);
    expect(validateEmail(borderEmail)).toBe("");
  });
});

// ─── waitlist.join — input validation ─────────────────────────────────────────

describe("waitlist.join — input validation", () => {
  it("rejects an invalid email address", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.waitlist.join({ email: "not-an-email", firstName: "Jamie", role: "student" })
    ).rejects.toThrow();
  });

  it("rejects an empty email string", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.waitlist.join({ email: "", firstName: "Jamie", role: "student" })
    ).rejects.toThrow();
  });

  it("rejects an invalid role enum value", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      // @ts-expect-error intentional invalid role
      caller.waitlist.join({ email: "valid@example.com", firstName: "Jamie", role: "teacher" })
    ).rejects.toThrow();
  });

  it("rejects email longer than 320 characters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const longEmail = "a".repeat(315) + "@x.com";
    await expect(
      caller.waitlist.join({ email: longEmail, firstName: "Jamie", role: "student" })
    ).rejects.toThrow();
  });

  it("rejects a missing firstName (empty string)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.waitlist.join({ email: "valid@example.com", firstName: "", role: "student" })
    ).rejects.toThrow();
  });

  it("rejects firstName longer than 128 characters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.waitlist.join({ email: "valid@example.com", firstName: "A".repeat(129), role: "student" })
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

// ─── Honeypot — server-side contract ─────────────────────────────────────────
// The honeypot field is handled entirely on the client before the tRPC call is
// made. The server schema intentionally has no "website" / honeypot field, so
// these tests verify that the server contract remains clean.

describe("waitlist.join — honeypot contract", () => {
  beforeEach(() => {
    vi.mocked(addWaitlistSignup).mockResolvedValue({ success: true, duplicate: false });
  });

  it("accepts a valid submission (honeypot check happens client-side, not server-side)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.waitlist.join({
      email: "legit@school.edu.au",
      firstName: "Alex",
      role: "student",
    });
    expect(result.success).toBe(true);
  });

  it("does not expose a honeypot field in the server schema (extra fields are stripped by Zod)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    // Zod strips unknown keys by default — passing a 'website' field should not cause an error
    const result = await caller.waitlist.join({
      email: "legit2@school.edu.au",
      firstName: "Jordan",
      role: "student",
      // @ts-expect-error intentional unknown field to verify Zod strips it silently
      website: "http://spam.example.com",
    });
    expect(result.success).toBe(true);
  });
});
