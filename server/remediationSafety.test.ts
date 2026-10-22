import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function context(status: "active" | "suspended"): TrpcContext {
  const user = {
    id: 808,
    openId: "safety-user",
    email: "safety@example.com",
    name: "Safety Test",
    loginMethod: "manus",
    role: "user",
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as AuthenticatedUser;

  return {
    user,
    req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("remediation safety gates", () => {
  it("does not charge a card or grant credits through the disabled purchase endpoint", async () => {
    const caller = appRouter.createCaller(context("active"));
    await expect(caller.employer.credits.purchase({
      packId: "pack_1",
      cardToken: "untrusted-browser-token",
      includeGst: true,
    })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("rejects a suspended account before any protected mutation runs", async () => {
    const caller = appRouter.createCaller(context("suspended"));
    await expect(caller.employer.credits.purchase({ packId: "pack_1" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
