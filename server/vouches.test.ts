/**
 * Vitest tests for the Vouches feature:
 *
 * vouches.list    — returns vouches for authenticated user
 * vouches.request — creates a vouch request and sends email
 * vouches.delete  — cancels a pending vouch; rejects non-owner and non-pending
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Context helpers ──────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 99,
    openId: "vouches-test-open-id",
    email: "student@school.edu.au",
    name: "Jordan Student",
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
    getStudentVouches: vi.fn(),
    addVouch: vi.fn(),
    deleteVouch: vi.fn(),
  };
});

vi.mock("./emailService", () => ({
  sendEmailSilent: vi.fn().mockResolvedValue(true),
}));

import * as db from "./db";
import * as emailService from "./emailService";

// ─── Shared mock vouch rows ───────────────────────────────────────────────────

const pendingVouch = {
  id: 10,
  studentUserId: 99,
  voucherName: "Ms. Jane Doe",
  voucherTitle: "Science Teacher",
  voucherOrg: "Springfield High",
  voucherEmail: "jane.doe@school.edu.au",
  skillName: "Chemistry",
  status: "pending",
  message: null,
  createdAt: new Date(),
};

const verifiedVouch = {
  id: 11,
  studentUserId: 99,
  voucherName: "Mr. Bob Coach",
  voucherTitle: "Sports Coach",
  voucherOrg: "Springfield High",
  voucherEmail: "bob.coach@school.edu.au",
  skillName: "Leadership",
  status: "verified",
  message: "Excellent team player.",
  createdAt: new Date(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("vouches.list", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.vouches.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns all vouches for the authenticated user", async () => {
    vi.mocked(db.getStudentVouches).mockResolvedValueOnce([pendingVouch, verifiedVouch]);
    const caller = appRouter.createCaller(authCtx());
    const result = await caller.vouches.list();
    expect(result).toHaveLength(2);
    expect(result[0].voucherName).toBe("Ms. Jane Doe");
    expect(result[1].status).toBe("verified");
  });

  it("returns empty array when user has no vouches", async () => {
    vi.mocked(db.getStudentVouches).mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(authCtx());
    const result = await caller.vouches.list();
    expect(result).toEqual([]);
  });
});

describe("vouches.request", () => {
  beforeEach(() => {
    vi.mocked(db.addVouch).mockResolvedValue(55);
    vi.mocked(emailService.sendEmailSilent).mockResolvedValue(true);
  });

  it("throws UNAUTHORIZED when not logged in", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(
      caller.vouches.request({
        voucherName: "Ms. Doe",
        voucherEmail: "doe@school.edu.au",
        origin: "https://jutjut.com.au",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("creates a vouch row and sends verification_request email", async () => {
    const caller = appRouter.createCaller(authCtx());
    const result = await caller.vouches.request({
      voucherName: "Ms. Jane Doe",
      voucherTitle: "Science Teacher",
      voucherOrg: "Springfield High",
      voucherEmail: "jane.doe@school.edu.au",
      skillName: "Chemistry",
      origin: "https://jutjut.com.au",
    });

    expect(result).toEqual({ success: true, vouchId: 55 });

    expect(db.addVouch).toHaveBeenCalledWith(
      expect.objectContaining({
        studentUserId: 99,
        voucherName: "Ms. Jane Doe",
        voucherEmail: "jane.doe@school.edu.au",
        skillName: "Chemistry",
        token: expect.any(String),
      })
    );

    expect(emailService.sendEmailSilent).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jane.doe@school.edu.au",
        templateId: "verification_request",
        data: expect.objectContaining({
          voucher_name: "Ms. Jane Doe",
          student_name: "Jordan Student",
          skill_name: "Chemistry",
          verify_url: expect.stringContaining("/api/verify-vouch?token="),
          decline_url: expect.stringContaining("/api/decline-vouch?token="),
        }),
      })
    );
  });

  it("uses default skill description when skillName is omitted", async () => {
    const caller = appRouter.createCaller(authCtx());
    await caller.vouches.request({
      voucherName: "Mr. Coach",
      voucherEmail: "coach@sport.org",
      origin: "https://jutjut.com.au",
    });

    expect(emailService.sendEmailSilent).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          skill_name: "their skills and character",
        }),
      })
    );
  });
});

describe("vouches.delete", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.vouches.delete({ vouchId: 10 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws NOT_FOUND when vouch does not belong to the user", async () => {
    vi.mocked(db.getStudentVouches).mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(authCtx());
    await expect(caller.vouches.delete({ vouchId: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws BAD_REQUEST when trying to delete a verified vouch", async () => {
    vi.mocked(db.getStudentVouches).mockResolvedValueOnce([verifiedVouch]);
    const caller = appRouter.createCaller(authCtx());
    await expect(caller.vouches.delete({ vouchId: 11 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("deletes a pending vouch successfully", async () => {
    vi.mocked(db.getStudentVouches).mockResolvedValueOnce([pendingVouch]);
    vi.mocked(db.deleteVouch).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(authCtx());
    const result = await caller.vouches.delete({ vouchId: 10 });
    expect(result).toEqual({ success: true });
    expect(db.deleteVouch).toHaveBeenCalledWith(10, 99);
  });
});
