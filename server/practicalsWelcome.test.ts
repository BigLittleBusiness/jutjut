import { describe, expect, it } from "vitest";
import {
  PRACTICALS_WELCOME_STORAGE_PREFIX,
  dismissPracticalsWelcome,
  getPracticalsWelcomeStorageKey,
  hasSeenPracticalsWelcome,
} from "../client/src/lib/practicalsWelcome";

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("JutJut Practicals first-visit welcome", () => {
  it("uses a versioned, per-user dismissal key", () => {
    expect(getPracticalsWelcomeStorageKey(18)).toBe(`${PRACTICALS_WELCOME_STORAGE_PREFIX}:18`);
    expect(getPracticalsWelcomeStorageKey(18)).not.toBe(getPracticalsWelcomeStorageKey(19));
  });

  it("shows the welcome until the signed-in student dismisses it", () => {
    const storage = createMemoryStorage();
    expect(hasSeenPracticalsWelcome(storage, 18)).toBe(false);
    dismissPracticalsWelcome(storage, 18);
    expect(hasSeenPracticalsWelcome(storage, 18)).toBe(true);
  });

  it("does not suppress the welcome for a different signed-in student on the same browser", () => {
    const storage = createMemoryStorage();
    dismissPracticalsWelcome(storage, 18);
    expect(hasSeenPracticalsWelcome(storage, 19)).toBe(false);
  });
});
