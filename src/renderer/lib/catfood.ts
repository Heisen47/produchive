/**
 * Catfood — Jogu's food. A small virtual currency earned through solid study
 * sessions and spent on feeding Jogu, the peekaboo cat.
 *
 * Everything in this file is pure and deterministic so it can be unit tested.
 * Awards are keyed (by session id, or by grant name) so recomputing, syncing
 * or re-rendering can never count the same thing twice.
 */
import type { FocusSession } from '../global';

// ─── Tuning ────────────────────────────────────────────────────────────────

/** One catfood per full block of this many uninterrupted study minutes. */
export const SESSION_BLOCK_MINUTES = 30;
/** A single session counts for at most this long, so a timer left running can't farm food. */
export const MAX_SESSION_MINUTES = 120;
/** At most this much catfood per day from study sessions (8h of study). */
export const DAILY_CATFOOD_CAP = 16;
/** Given once per user (not per device) so new users can try feeding Jogu right away. */
export const STARTER_CATFOOD = 3;
export const STARTER_GRANT_ID = 'starter';
export const FEED_COST = 1;
/** How long Jogu stays "full" after a meal. */
export const FULL_FOR_MS = 4 * 60 * 60 * 1000;

/** Unfed this long, Jogu gets hungry (droopy, grumpy when tapped)... */
export const HUNGRY_AFTER_MS = 24 * 60 * 60 * 1000;
/** ...and after this long it looks weak. */
export const WEAK_AFTER_MS = 72 * 60 * 60 * 1000;

// ─── Study sessions ────────────────────────────────────────────────────────

/** Local calendar date (what the user sees as "that day"). */
export const localDateStr = (ts: number | string | Date): string => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Catfood a single study session is worth: one per full 30 minutes, capped.
 * A Focus Room session is one sitting with its own timer, so it is "solid"
 * time; minutes from separate sessions are never added together.
 */
export function catfoodForSession(durationSeconds: number): number {
    const minutes = Math.min(Math.max(0, Number(durationSeconds) || 0) / 60, MAX_SESSION_MINUTES);
    return Math.floor(minutes / SESSION_BLOCK_MINUTES);
}

// ─── Ledger ────────────────────────────────────────────────────────────────

export interface CatfoodSpend {
    id: string;
    at: number;
    amount: number;
    kind: 'feed';
}

export interface SessionAward {
    amount: number;
    /** Local date of the session start, for the daily cap and "today" totals. */
    date: string;
}

export interface CatfoodLedger {
    version: 2;
    /** Focus session id → catfood awarded for it. */
    sessions: Record<string, SessionAward>;
    /** One-time grants by name (e.g. the starter food) → amount. */
    grants: Record<string, number>;
    spends: CatfoodSpend[];
    /** `${deviceId}|${localDate}` → times Jogu was petted (tapped) that day on that device. */
    pets: Record<string, number>;
}

export const emptyLedger = (): CatfoodLedger => ({ version: 2, sessions: {}, grants: {}, spends: [], pets: {} });

const positiveInts = (raw: any, max = Infinity): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw || {})) {
        const n = Math.floor(Number(v));
        if (n > 0) out[k] = Math.min(n, max);
    }
    return out;
};

export function normalizeLedger(raw: any): CatfoodLedger {
    if (!raw || typeof raw !== 'object') return emptyLedger();
    const sessions: Record<string, SessionAward> = {};
    for (const [id, v] of Object.entries<any>(raw.sessions || {})) {
        const amount = Math.floor(Number(v?.amount));
        if (amount > 0 && typeof v?.date === 'string') {
            sessions[id] = { amount: Math.min(amount, catfoodForSession(MAX_SESSION_MINUTES * 60)), date: v.date };
        }
    }
    const spends = Array.isArray(raw.spends)
        ? raw.spends.filter((s: any) => s && typeof s.id === 'string' && Number(s.amount) > 0)
        : [];
    return {
        version: 2,
        sessions,
        grants: positiveInts(raw.grants, STARTER_CATFOOD),
        spends,
        pets: positiveInts(raw.pets),
    };
}

export const totalEarned = (l: CatfoodLedger) =>
    Object.values(l.sessions).reduce((a, s) => a + s.amount, 0) +
    Object.values(l.grants).reduce((a, b) => a + b, 0);
export const totalSpent = (l: CatfoodLedger) => l.spends.reduce((a, s) => a + s.amount, 0);
export const balanceOf = (l: CatfoodLedger) => Math.max(0, totalEarned(l) - totalSpent(l));

export const earnedOn = (l: CatfoodLedger, localDate: string) =>
    Object.values(l.sessions).reduce((sum, s) => (s.date === localDate ? sum + s.amount : sum), 0);

export const sessionsOn = (l: CatfoodLedger, localDate: string) =>
    Object.values(l.sessions).filter((s) => s.date === localDate).length;

export const lastFedAt = (l: CatfoodLedger) => l.spends.reduce((max, s) => Math.max(max, s.at), 0);

/**
 * Awards catfood for study sessions not seen before. Each session id is
 * awarded at most once, and each day stops at DAILY_CATFOOD_CAP.
 */
export function awardSessions(
    ledger: CatfoodLedger,
    focusSessions: FocusSession[],
): { ledger: CatfoodLedger; awarded: number; sessionsAwarded: number } {
    const fresh = (focusSessions || [])
        .filter((s) => s?.id && s.startedAt && !ledger.sessions[s.id] && catfoodForSession(s.durationSeconds) > 0)
        .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
    if (fresh.length === 0) return { ledger, awarded: 0, sessionsAwarded: 0 };

    const sessions = { ...ledger.sessions };
    let awarded = 0;
    let sessionsAwarded = 0;
    for (const s of fresh) {
        const date = localDateStr(s.startedAt);
        const room = DAILY_CATFOOD_CAP - earnedOn({ ...ledger, sessions }, date);
        const amount = Math.min(catfoodForSession(s.durationSeconds), room);
        if (amount <= 0) continue;
        sessions[s.id] = { amount, date };
        awarded += amount;
        sessionsAwarded++;
    }
    return { ledger: { ...ledger, sessions }, awarded, sessionsAwarded };
}

/**
 * Grants the starter catfood once. The grant is keyed in the ledger (which is
 * stored in db.json and synced), so later launches and two devices granting it
 * still add up to a single +3.
 */
export function grantStarter(ledger: CatfoodLedger): { ledger: CatfoodLedger; granted: boolean } {
    if (ledger.grants[STARTER_GRANT_ID]) return { ledger, granted: false };
    return { ledger: { ...ledger, grants: { ...ledger.grants, [STARTER_GRANT_ID]: STARTER_CATFOOD } }, granted: true };
}

/** Spends catfood, or returns null when the balance is too low. */
export function spendCatfood(ledger: CatfoodLedger, amount: number, id: string, at: number): CatfoodLedger | null {
    if (amount <= 0 || balanceOf(ledger) < amount) return null;
    return { ...ledger, spends: [...ledger.spends, { id, at, amount, kind: 'feed' }] };
}

const maxMerge = (a: Record<string, number>, b: Record<string, number>) => {
    const out = { ...a };
    for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
    return out;
};

/** Merges ledgers from two devices; every entry is keyed, so merging is idempotent. */
export function mergeLedgers(a: CatfoodLedger, b: CatfoodLedger): CatfoodLedger {
    const sessions = { ...a.sessions };
    for (const [id, s] of Object.entries(b.sessions)) {
        if (!sessions[id] || s.amount > sessions[id].amount) sessions[id] = s;
    }
    const seen = new Set(a.spends.map((s) => s.id));
    const spends = [...a.spends, ...b.spends.filter((s) => !seen.has(s.id))].sort((x, y) => x.at - y.at);
    return { version: 2, sessions, grants: maxMerge(a.grants, b.grants), spends, pets: maxMerge(a.pets, b.pets) };
}

// ─── Pets ──────────────────────────────────────────────────────────────────

export function recordPet(ledger: CatfoodLedger, deviceId: string, localDate: string): CatfoodLedger {
    const key = `${deviceId}|${localDate}`;
    return { ...ledger, pets: { ...ledger.pets, [key]: (ledger.pets[key] ?? 0) + 1 } };
}

export const totalPets = (l: CatfoodLedger) => Object.values(l.pets).reduce((a, b) => a + b, 0);

/** Pets per local date, summed across devices. */
export function petsByDate(l: CatfoodLedger): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(l.pets)) {
        const date = k.slice(k.lastIndexOf('|') + 1);
        out[date] = (out[date] ?? 0) + v;
    }
    return out;
}

// ─── Hunger ────────────────────────────────────────────────────────────────

export type HungerLevel = 'full' | 'content' | 'hungry' | 'weak';

/**
 * How hungry Jogu is. `since` is when Jogu was first seen, used as the
 * reference until it has been fed for the first time.
 */
export function hungerLevel(lastFed: number, now: number, since = 0): HungerLevel {
    const reference = lastFed || since;
    if (!reference) return 'content';
    const elapsed = now - reference;
    if (lastFed && elapsed < FULL_FOR_MS) return 'full';
    if (elapsed >= WEAK_AFTER_MS) return 'weak';
    if (elapsed >= HUNGRY_AFTER_MS) return 'hungry';
    return 'content';
}
