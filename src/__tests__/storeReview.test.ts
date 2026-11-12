import { describe, it, expect } from "vitest";
import {
  STORE_REVIEW_URI,
  applyStoreReviewAction,
  countQualifyingFocusSessions,
  shouldShowStoreReviewPrompt,
} from "../lib/storeReview";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-11T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY).toISOString();

describe("store review prompt", () => {
  it("uses the Store review deep link for Produchive", () => {
    expect(STORE_REVIEW_URI).toBe("ms-windows-store://review/?ProductId=9N6PS6DFQKH2");
  });

  it("only counts focus sessions of 10 minutes or more", () => {
    expect(
      countQualifyingFocusSessions([{ durationSeconds: 599 }, { durationSeconds: 600 }, { durationSeconds: 3000 }, {}]),
    ).toBe(2);
    expect(countQualifyingFocusSessions(undefined)).toBe(0);
  });

  it("never shows outside the Microsoft Store", () => {
    expect(
      shouldShowStoreReviewPrompt({
        state: { firstSeenAt: daysAgo(30) },
        qualifyingFocusSessions: 10,
        isStoreInstall: false,
        now,
      }),
    ).toBe(false);
  });

  it("waits for real use before showing", () => {
    const base = { isStoreInstall: true, now };
    expect(shouldShowStoreReviewPrompt({ ...base, state: { firstSeenAt: daysAgo(1) }, qualifyingFocusSessions: 1 })).toBe(false);
    expect(shouldShowStoreReviewPrompt({ ...base, state: { firstSeenAt: daysAgo(1) }, qualifyingFocusSessions: 2 })).toBe(true);
    expect(shouldShowStoreReviewPrompt({ ...base, state: { firstSeenAt: daysAgo(5) }, qualifyingFocusSessions: 0 })).toBe(true);
    expect(shouldShowStoreReviewPrompt({ ...base, state: {}, qualifyingFocusSessions: 0 })).toBe(false);
  });

  it("allows one snooze of 7 days, then stops for good", () => {
    const eligible = { isStoreInstall: true, qualifyingFocusSessions: 5 };
    const snoozed = applyStoreReviewAction({ firstSeenAt: daysAgo(10) }, "later", now);
    expect(snoozed.status).toBe("snoozed");
    expect(shouldShowStoreReviewPrompt({ ...eligible, state: snoozed, now: new Date(now.getTime() + 6 * DAY) })).toBe(false);
    expect(shouldShowStoreReviewPrompt({ ...eligible, state: snoozed, now: new Date(now.getTime() + 8 * DAY) })).toBe(true);

    const second = applyStoreReviewAction(snoozed, "later", now);
    expect(second.status).toBe("done");
    expect(shouldShowStoreReviewPrompt({ ...eligible, state: second, now })).toBe(false);
  });

  it("stops after rating or declining", () => {
    for (const action of ["rate", "never"] as const) {
      const state = applyStoreReviewAction({ firstSeenAt: daysAgo(10) }, action, now);
      expect(state.status).toBe("done");
      expect(shouldShowStoreReviewPrompt({ state, qualifyingFocusSessions: 9, isStoreInstall: true, now })).toBe(false);
    }
  });
});
