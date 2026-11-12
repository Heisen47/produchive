// "Rate Produchive on the Microsoft Store" prompt.
// Only Store installs see it. It appears after a good moment (a few real focus
// sessions, or after using the app for a few days), can be snoozed once, and is
// never shown again once the user rates or declines.

export const STORE_PRODUCT_ID = "9N6PS6DFQKH2";
export const STORE_REVIEW_URI = `ms-windows-store://review/?ProductId=${STORE_PRODUCT_ID}`;
export const STORE_PAGE_URL = `https://apps.microsoft.com/detail/${STORE_PRODUCT_ID}`;

const DAY_MS = 24 * 60 * 60 * 1000;
export const MIN_DAYS_OF_USE = 5;
export const MIN_FOCUS_SESSIONS = 2;
export const MIN_FOCUS_SESSION_SECONDS = 10 * 60;
export const SNOOZE_DAYS = 7;

export type StoreReviewStatus = "pending" | "snoozed" | "done";
export type StoreReviewAction = "rate" | "later" | "never";

export interface StoreReviewState {
  firstSeenAt?: string;
  status?: StoreReviewStatus;
  snoozedUntil?: string;
}

export function countQualifyingFocusSessions(
  sessions: { durationSeconds?: number }[] | undefined,
): number {
  return (sessions || []).filter(
    (s) => typeof s?.durationSeconds === "number" && s.durationSeconds >= MIN_FOCUS_SESSION_SECONDS,
  ).length;
}

export function shouldShowStoreReviewPrompt(opts: {
  state: StoreReviewState;
  qualifyingFocusSessions: number;
  isStoreInstall: boolean;
  now?: Date;
}): boolean {
  const { state, qualifyingFocusSessions, isStoreInstall } = opts;
  const now = opts.now ?? new Date();
  if (!isStoreInstall) return false;
  if (state.status === "done") return false;
  if (state.status === "snoozed") {
    const until = state.snoozedUntil ? Date.parse(state.snoozedUntil) : NaN;
    // A snooze with a broken date stays snoozed rather than nagging.
    if (Number.isNaN(until) || now.getTime() < until) return false;
  }
  if (qualifyingFocusSessions >= MIN_FOCUS_SESSIONS) return true;
  const firstSeen = state.firstSeenAt ? Date.parse(state.firstSeenAt) : NaN;
  if (Number.isNaN(firstSeen)) return false;
  return now.getTime() - firstSeen >= MIN_DAYS_OF_USE * DAY_MS;
}

/** Returns the new state after the user answers the prompt. "Later" works once. */
export function applyStoreReviewAction(
  state: StoreReviewState,
  action: StoreReviewAction,
  now: Date = new Date(),
): StoreReviewState {
  if (action === "later" && state.status !== "snoozed") {
    return {
      ...state,
      status: "snoozed",
      snoozedUntil: new Date(now.getTime() + SNOOZE_DAYS * DAY_MS).toISOString(),
    };
  }
  return { ...state, status: "done", snoozedUntil: undefined };
}
