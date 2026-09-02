export const PRACTICALS_WELCOME_STORAGE_PREFIX = "jutjut.practicals.student-welcome.v1";

type WelcomeStorage = Pick<Storage, "getItem" | "setItem">;

export function getPracticalsWelcomeStorageKey(userId: number): string {
  return `${PRACTICALS_WELCOME_STORAGE_PREFIX}:${userId}`;
}

export function hasSeenPracticalsWelcome(storage: Pick<WelcomeStorage, "getItem">, userId: number): boolean {
  return storage.getItem(getPracticalsWelcomeStorageKey(userId)) === "dismissed";
}

export function dismissPracticalsWelcome(storage: Pick<WelcomeStorage, "setItem">, userId: number): void {
  storage.setItem(getPracticalsWelcomeStorageKey(userId), "dismissed");
}
