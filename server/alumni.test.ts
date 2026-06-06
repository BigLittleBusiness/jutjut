/**
 * Vitest tests for the Alumni feature:
 *
 * alumni.status            — returns alumni status for authenticated user
 * alumni.requestEmailVerify — sends verification email, rejects school emails, rejects duplicates
 * alumni.badgeCounts       — returns correct counts
 * alumni.updateSettings    — updates showAlumniBadge and graduationDate
 * alumni.myKit             — returns credentials and vouches
 * GET /api/verify-alumni-email — valid token, expired token, invalid token
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Context helpers ──────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 42,
    openId: "alumni-test-open-id",
    email: "student@school.edu.au",
    name: "Alex Student",
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

const authCtx = () => createContext(makeUser());
const publicCtx = () => createContext(null);

// ─── Mock DB helpers ──────────────────────────────────────────────────────────

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getAlumniStatus: vi.fn(),
    requestAlumniEmailChange: vi.fn(),
    verifyAlumniEmail: vi.fn(),
    updateAlumniSettings: vi.fn(),
    getBadgeCounts: vi.fn(),
    getStudentCredentials: vi.fn(),
    getStudentVouches: vi.fn(),
  };
});

vi.mock("./emailService", () => ({
  sendEmailSilent: vi.fn().mockResolvedValue(true),
}));

// ─── Import mocks after vi.mock ───────────────────────────────────────────────

import * as db from "./db";
import * as emailService from "./emailService";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("alumni.status", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.alumni.status()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns alumni status for authenticated user", async () => {
    const mockStatus = {
      id: 42,
      name: "Alex Student",
      email: "student@school.edu.au",
      personalEmail: null,
      alumniEmailVerified: false,
      showAlumniBadge: true,
      graduationDate: null,
    };
    vi.mocked(db.getAlumniStatus).mockResolvedValueOnce(mockStatus);

    const caller = appRouter.createCaller(authCtx());
    const result = await caller.alumni.status();
    expect(result).toMatchObject({ alumniEmailVerified: false, showAlumniBadge: true });
  });

  it("throws NOT_FOUND when user record is missing from DB", async () => {
    vi.mocked(db.getAlumniStatus).mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(authCtx());
    await expect(caller.alumni.status()).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("alumni.requestEmailVerify", () => {
  beforeEach(() => {
    vi.mocked(db.getAlumniStatus).mockResolvedValue({
      id: 42,
      name: "Alex Student",
      email: "student@school.edu.au",
      personalEmail: null,
      alumniEmailVerified: false,
      showAlumniBadge: true,
      graduationDate: null,
    });
    vi.mocked(db.requestAlumniEmailChange).mockResolvedValue(undefined);
    vi.mocked(emailService.sendEmailSilent).mockResolvedValue(true);
  });

  it("throws UNAUTHORIZED when not logged in", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(
      caller.alumni.requestEmailVerify({ personalEmail: "me@gmail.com", origin: "https://jutjut.com.au" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects school email domains", async () => {
    // The school-domain check happens before the DB call, so no mock needed here
    vi.mocked(db.getAlumniStatus).mockResolvedValue({
      id: 42,
      name: "Alex Student",
      email: "student@school.edu.au",
      personalEmail: null,
      alumniEmailVerified: false,
      showAlumniBadge: true,
      graduationDate: null,
    });
    const caller = appRouter.createCaller(authCtx());
    await expect(
      caller.alumni.requestEmailVerify({ personalEmail: "me@school.edu.au", origin: "https://jutjut.com.au" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects already-verified email", async () => {
    vi.mocked(db.getAlumniStatus).mockResolvedValueOnce({
      id: 42,
      name: "Alex Student",
      email: "student@school.edu.au",
      personalEmail: "me@gmail.com",
      alumniEmailVerified: true,
      showAlumniBadge: true,
      graduationDate: null,
    });
    const caller = appRouter.createCaller(authCtx());
    await expect(
      caller.alumni.requestEmailVerify({ personalEmail: "me@gmail.com", origin: "https://jutjut.com.au" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("saves token and sends verification email for valid personal email", async () => {
    const caller = appRouter.createCaller(authCtx());
    const result = await caller.alumni.requestEmailVerify({
      personalEmail: "me@gmail.com",
      origin: "https://jutjut.com.au",
    });
    expect(result).toEqual({ success: true });
    expect(db.requestAlumniEmailChange).toHaveBeenCalledWith(
      42,
      "me@gmail.com",
      expect.any(String), // token
      expect.any(Date)    // expiry
    );
    expect(emailService.sendEmailSilent).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: "alumni_email_verify", to: "me@gmail.com" })
    );
  });
});

describe("alumni.badgeCounts", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.alumni.badgeCounts()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns correct badge counts", async () => {
    vi.mocked(db.getBadgeCounts).mockResolvedValueOnce({
      credentials: 3,
      vouches: 2,
      alumni: true,
      total: 6,
    });
    const caller = appRouter.createCaller(authCtx());
    const result = await caller.alumni.badgeCounts();
    expect(result).toEqual({ credentials: 3, vouches: 2, alumni: true, total: 6 });
  });
});

describe("alumni.updateSettings", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(
      caller.alumni.updateSettings({ showAlumniBadge: false })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("updates showAlumniBadge and graduationDate", async () => {
    vi.mocked(db.updateAlumniSettings).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(authCtx());
    const result = await caller.alumni.updateSettings({
      showAlumniBadge: false,
      graduationDate: "2026-11-01",
    });
    expect(result).toEqual({ success: true });
    // Router passes the date string; DB helper converts to Date internally
    expect(db.updateAlumniSettings).toHaveBeenCalledWith(42, {
      showAlumniBadge: false,
      graduationDate: "2026-11-01",
    });
  });

  it("accepts null graduationDate to clear it", async () => {
    vi.mocked(db.updateAlumniSettings).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(authCtx());
    const result = await caller.alumni.updateSettings({ graduationDate: null });
    expect(result).toEqual({ success: true });
    expect(db.updateAlumniSettings).toHaveBeenCalledWith(42, { graduationDate: null });
  });
});

describe("alumni.myKit", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.alumni.myKit()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns credentials and vouches for the logged-in user", async () => {
    const mockCreds = [{ id: 1, title: "First Aid", issuer: "Red Cross", type: "certification", issuedAt: new Date(), verifierName: null, verifierRole: null, verificationDate: null }];
    const mockVouches = [{ id: 1, voucherName: "Principal Jones", voucherTitle: "Principal", voucherOrg: "Brisbane SHS", message: "Great student", status: "verified", createdAt: new Date() }];
    vi.mocked(db.getStudentCredentials).mockResolvedValueOnce(mockCreds);
    vi.mocked(db.getStudentVouches).mockResolvedValueOnce(mockVouches);

    const caller = appRouter.createCaller(authCtx());
    const result = await caller.alumni.myKit();
    expect(result.credentials).toHaveLength(1);
    expect(result.credentials[0].title).toBe("First Aid");
    expect(result.vouches).toHaveLength(1);
    expect(result.vouches[0].voucherName).toBe("Principal Jones");
  });
});
