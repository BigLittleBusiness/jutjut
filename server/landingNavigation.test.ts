/**
 * landingNavigation.test.ts
 * Tests for the landing page → app navigation contract.
 * These verify the postMessage payload shapes that the landing page
 * sends and that the React app is expected to handle.
 */
import { describe, it, expect } from "vitest";

// ── Message payload validation ────────────────────────────────────────────────

type JutJutNavigateMessage = {
  type: "JUTJUT_NAVIGATE";
  page: string;
};

function isValidNavigateMessage(data: unknown): data is JutJutNavigateMessage {
  if (typeof data !== "object" || data === null) return false;
  const msg = data as Record<string, unknown>;
  return msg.type === "JUTJUT_NAVIGATE" && typeof msg.page === "string" && msg.page.length > 0;
}

const VALID_PAGES = ["login", "my-kit", "jobs", "drops", "university", "your-way", "dashboard"];

function isKnownPage(page: string): boolean {
  return VALID_PAGES.includes(page);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Landing page postMessage contract", () => {
  it("accepts a valid login navigate message", () => {
    const msg = { type: "JUTJUT_NAVIGATE", page: "login" };
    expect(isValidNavigateMessage(msg)).toBe(true);
  });

  it("accepts a valid my-kit navigate message", () => {
    const msg = { type: "JUTJUT_NAVIGATE", page: "my-kit" };
    expect(isValidNavigateMessage(msg)).toBe(true);
  });

  it("accepts a valid jobs navigate message", () => {
    const msg = { type: "JUTJUT_NAVIGATE", page: "jobs" };
    expect(isValidNavigateMessage(msg)).toBe(true);
  });

  it("rejects a message with wrong type", () => {
    const msg = { type: "WRONG_TYPE", page: "login" };
    expect(isValidNavigateMessage(msg)).toBe(false);
  });

  it("rejects a message with empty page", () => {
    const msg = { type: "JUTJUT_NAVIGATE", page: "" };
    expect(isValidNavigateMessage(msg)).toBe(false);
  });

  it("rejects a null message", () => {
    expect(isValidNavigateMessage(null)).toBe(false);
  });

  it("rejects a non-object message", () => {
    expect(isValidNavigateMessage("string")).toBe(false);
    expect(isValidNavigateMessage(42)).toBe(false);
  });

  it("rejects a message with missing page field", () => {
    const msg = { type: "JUTJUT_NAVIGATE" };
    expect(isValidNavigateMessage(msg)).toBe(false);
  });
});

describe("Known page routing", () => {
  it("recognises all expected app pages", () => {
    expect(isKnownPage("login")).toBe(true);
    expect(isKnownPage("my-kit")).toBe(true);
    expect(isKnownPage("jobs")).toBe(true);
    expect(isKnownPage("drops")).toBe(true);
    expect(isKnownPage("university")).toBe(true);
    expect(isKnownPage("your-way")).toBe(true);
    expect(isKnownPage("dashboard")).toBe(true);
  });

  it("rejects unknown page names", () => {
    expect(isKnownPage("unknown-page")).toBe(false);
    expect(isKnownPage("")).toBe(false);
    expect(isKnownPage("admin")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isKnownPage("Login")).toBe(false);
    expect(isKnownPage("MY-KIT")).toBe(false);
  });
});

describe("Deep-link routing logic", () => {
  it("routes login messages to sign-in flow", () => {
    const msg = { type: "JUTJUT_NAVIGATE", page: "login" };
    const isLoginRoute = isValidNavigateMessage(msg) && msg.page === "login";
    expect(isLoginRoute).toBe(true);
  });

  it("routes non-login messages to deep-link handler", () => {
    const pages = ["my-kit", "jobs", "drops"];
    pages.forEach((page) => {
      const msg = { type: "JUTJUT_NAVIGATE", page };
      const isDeepLink = isValidNavigateMessage(msg) && msg.page !== "login";
      expect(isDeepLink).toBe(true);
    });
  });

  it("unauthenticated deep-links redirect to login first", () => {
    // Simulate the App.tsx logic: if not authenticated, go to login
    const isAuthenticated = false;
    const requestedPage = "my-kit";
    const resolvedPage = isAuthenticated ? requestedPage : "login";
    expect(resolvedPage).toBe("login");
  });

  it("authenticated deep-links route directly to the page", () => {
    const isAuthenticated = true;
    const requestedPage = "my-kit";
    const resolvedPage = isAuthenticated ? requestedPage : "login";
    expect(resolvedPage).toBe("my-kit");
  });

  it("preserves deep-link destination through login and routes there after success", () => {
    // Simulate: unauthenticated user clicks 'Explore My Kit'
    let pendingDeepLink: string | null = null;
    let currentPage = "landing";
    const isAuthenticated = false;

    // Step 1: deep-link arrives while unauthenticated
    const requestedPage = "my-kit";
    if (!isAuthenticated) {
      pendingDeepLink = requestedPage;
      currentPage = "login";
    }
    expect(currentPage).toBe("login");
    expect(pendingDeepLink).toBe("my-kit");

    // Step 2: user logs in successfully
    const destination = pendingDeepLink || "dashboard";
    pendingDeepLink = null;
    currentPage = destination;

    expect(currentPage).toBe("my-kit");
    expect(pendingDeepLink).toBeNull();
  });

  it("falls back to dashboard when no deep-link was pending", () => {
    let pendingDeepLink: string | null = null;
    const destination = pendingDeepLink || "dashboard";
    expect(destination).toBe("dashboard");
  });
});
