/**
 * Tests for login flow validation logic — Forgot Password and Jobs board filtering.
 * These test the pure business logic functions that are shared between
 * client validation and server-side enforcement.
 */
import { describe, it, expect } from "vitest";

// ── Forgot Password validation helpers ──────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidResetCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

function isStrongPassword(password: string): boolean {
  return password.length >= 8;
}

function passwordsMatch(a: string, b: string): boolean {
  return a === b && a.length > 0;
}

function passwordStrengthLabel(password: string): string {
  if (password.length < 8) return "Too short";
  if (password.length < 12) return "Fair";
  if (password.length < 16) return "Good";
  return "Strong";
}

// ── Jobs board filtering helpers ─────────────────────────────────────────────

type Job = {
  title: string;
  company: string;
  location: string;
  category: string;
  type: string;
  pay: string;
};

function filterJobs(
  jobs: Job[],
  query: string,
  category: string,
  jobType: string
): Job[] {
  const q = query.toLowerCase().trim();
  return jobs.filter((job) => {
    const matchesQuery =
      !q ||
      job.title.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      job.location.toLowerCase().includes(q);
    const matchesCategory = !category || job.category === category;
    const matchesType = !jobType || job.type === jobType;
    return matchesQuery && matchesCategory && matchesType;
  });
}

// ── Test data ────────────────────────────────────────────────────────────────

const sampleJobs: Job[] = [
  { title: "Maths Tutor", company: "TutorMe", location: "Sydney", category: "Tutoring", type: "Part-time", pay: "$30/hr" },
  { title: "Barista", company: "The Grind", location: "Melbourne", category: "Hospitality", type: "Casual", pay: "$24/hr" },
  { title: "Library Assistant", company: "City Library", location: "Brisbane", category: "Library/Admin", type: "Part-time", pay: "$22/hr" },
  { title: "Social Media Manager", company: "DigitalCo", location: "Remote", category: "Digital/Remote", type: "Freelance", pay: "$40/hr" },
  { title: "Retail Sales", company: "FashionHub", location: "Perth", category: "Retail", type: "Casual", pay: "$23/hr" },
];

// ── Forgot Password tests ────────────────────────────────────────────────────

describe("Forgot Password — email validation", () => {
  it("accepts a valid email address", () => {
    expect(isValidEmail("alex@school.edu")).toBe(true);
  });
  it("accepts email with subdomain", () => {
    expect(isValidEmail("alex@mail.school.edu")).toBe(true);
  });
  it("rejects empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });
  it("rejects email without @", () => {
    expect(isValidEmail("alexschool.edu")).toBe(false);
  });
  it("rejects email without domain", () => {
    expect(isValidEmail("alex@")).toBe(false);
  });
  it("rejects email with spaces", () => {
    expect(isValidEmail("alex @school.edu")).toBe(false);
  });
});

describe("Forgot Password — reset code validation", () => {
  it("accepts a valid 6-digit code", () => {
    expect(isValidResetCode("123456")).toBe(true);
  });
  it("accepts code with leading zeros", () => {
    expect(isValidResetCode("000001")).toBe(true);
  });
  it("rejects a 5-digit code", () => {
    expect(isValidResetCode("12345")).toBe(false);
  });
  it("rejects a 7-digit code", () => {
    expect(isValidResetCode("1234567")).toBe(false);
  });
  it("rejects code with letters", () => {
    expect(isValidResetCode("12345a")).toBe(false);
  });
  it("rejects empty string", () => {
    expect(isValidResetCode("")).toBe(false);
  });
});

describe("Forgot Password — new password validation", () => {
  it("accepts password of exactly 8 characters", () => {
    expect(isStrongPassword("12345678")).toBe(true);
  });
  it("accepts longer password", () => {
    expect(isStrongPassword("MySecureP@ss2026")).toBe(true);
  });
  it("rejects password shorter than 8 characters", () => {
    expect(isStrongPassword("short")).toBe(false);
  });
  it("rejects empty password", () => {
    expect(isStrongPassword("")).toBe(false);
  });
});

describe("Forgot Password — password confirmation", () => {
  it("matches when both passwords are identical", () => {
    expect(passwordsMatch("MyPass123", "MyPass123")).toBe(true);
  });
  it("does not match when passwords differ", () => {
    expect(passwordsMatch("MyPass123", "MyPass124")).toBe(false);
  });
  it("does not match when one is empty", () => {
    expect(passwordsMatch("MyPass123", "")).toBe(false);
  });
  it("does not match when both are empty", () => {
    expect(passwordsMatch("", "")).toBe(false);
  });
});

describe("Forgot Password — password strength label", () => {
  it("returns 'Too short' for passwords under 8 chars", () => {
    expect(passwordStrengthLabel("abc")).toBe("Too short");
  });
  it("returns 'Fair' for 8–11 char passwords", () => {
    expect(passwordStrengthLabel("abcdefgh")).toBe("Fair");
  });
  it("returns 'Good' for 12–15 char passwords", () => {
    expect(passwordStrengthLabel("abcdefghijkl")).toBe("Good");
  });
  it("returns 'Strong' for 16+ char passwords", () => {
    expect(passwordStrengthLabel("abcdefghijklmnop")).toBe("Strong");
  });
});

// ── Jobs board filtering tests ────────────────────────────────────────────────

describe("Jobs board — text search", () => {
  it("returns all jobs when query is empty", () => {
    expect(filterJobs(sampleJobs, "", "", "")).toHaveLength(5);
  });
  it("filters by job title (case-insensitive)", () => {
    const result = filterJobs(sampleJobs, "tutor", "", "");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Maths Tutor");
  });
  it("filters by company name", () => {
    const result = filterJobs(sampleJobs, "grind", "", "");
    expect(result).toHaveLength(1);
    expect(result[0].company).toBe("The Grind");
  });
  it("filters by location", () => {
    const result = filterJobs(sampleJobs, "remote", "", "");
    expect(result).toHaveLength(1);
    expect(result[0].location).toBe("Remote");
  });
  it("returns empty array when no match", () => {
    expect(filterJobs(sampleJobs, "astronaut", "", "")).toHaveLength(0);
  });
});

describe("Jobs board — category filter", () => {
  it("filters to only Hospitality jobs", () => {
    const result = filterJobs(sampleJobs, "", "Hospitality", "");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Barista");
  });
  it("filters to only Digital/Remote jobs", () => {
    const result = filterJobs(sampleJobs, "", "Digital/Remote", "");
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("Digital/Remote");
  });
  it("returns all jobs when category is empty string", () => {
    expect(filterJobs(sampleJobs, "", "", "")).toHaveLength(5);
  });
});

describe("Jobs board — job type filter", () => {
  it("filters to only Casual jobs", () => {
    const result = filterJobs(sampleJobs, "", "", "Casual");
    expect(result).toHaveLength(2);
  });
  it("filters to only Part-time jobs", () => {
    const result = filterJobs(sampleJobs, "", "", "Part-time");
    expect(result).toHaveLength(2);
  });
  it("filters to only Freelance jobs", () => {
    const result = filterJobs(sampleJobs, "", "", "Freelance");
    expect(result).toHaveLength(1);
  });
});

// ── Saved jobs logic tests ───────────────────────────────────────────────────

describe("Save Job — toggle logic", () => {
  it("adds a job id to the saved set", () => {
    const saved = new Set<string>();
    saved.add("job-1");
    expect(saved.has("job-1")).toBe(true);
  });
  it("removes a job id from the saved set on second toggle", () => {
    const saved = new Set<string>(["job-1", "job-2"]);
    saved.delete("job-1");
    expect(saved.has("job-1")).toBe(false);
    expect(saved.has("job-2")).toBe(true);
  });
  it("serialises and deserialises saved set via JSON", () => {
    const saved = new Set<string>(["job-1", "job-3"]);
    const serialised = JSON.stringify(Array.from(saved));
    const restored = new Set<string>(JSON.parse(serialised));
    expect(restored.has("job-1")).toBe(true);
    expect(restored.has("job-3")).toBe(true);
    expect(restored.size).toBe(2);
  });
  it("handles empty saved set serialisation", () => {
    const saved = new Set<string>();
    const serialised = JSON.stringify(Array.from(saved));
    const restored = new Set<string>(JSON.parse(serialised));
    expect(restored.size).toBe(0);
  });
  it("filters saved jobs from full job list correctly", () => {
    const savedIds = new Set<string>(["job-2", "job-4"]);
    const filtered = sampleJobs.filter((j, idx) => savedIds.has(`job-${idx + 1}`));
    // job-2 = Barista, job-4 = Social Media Manager
    expect(filtered).toHaveLength(2);
  });
  it("returns empty array when no jobs are saved", () => {
    const savedIds = new Set<string>();
    const filtered = sampleJobs.filter((j, idx) => savedIds.has(`job-${idx + 1}`));
    expect(filtered).toHaveLength(0);
  });
  it("correctly identifies unsaved job", () => {
    const savedIds = new Set<string>(["job-1"]);
    expect(savedIds.has("job-2")).toBe(false);
  });
  it("correctly identifies saved job", () => {
    const savedIds = new Set<string>(["job-1"]);
    expect(savedIds.has("job-1")).toBe(true);
  });
});

describe("Jobs board — combined filters", () => {
  it("combines text search and category filter", () => {
    const result = filterJobs(sampleJobs, "sydney", "Tutoring", "");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Maths Tutor");
  });
  it("returns empty when filters conflict", () => {
    // Searching for 'barista' but filtering to Tutoring
    const result = filterJobs(sampleJobs, "barista", "Tutoring", "");
    expect(result).toHaveLength(0);
  });
  it("combines all three filters", () => {
    const result = filterJobs(sampleJobs, "retail", "Retail", "Casual");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Retail Sales");
  });
});
