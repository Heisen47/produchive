/**
 * Catfood — a small virtual currency earned through genuine productivity and
 * spent on feeding the peekaboo cat.
 *
 * Everything in this file is pure and deterministic so it can be unit tested
 * and recomputed at any time from the same inputs (activity logs, Focus Room
 * sessions, tasks). Earnings are stored per device per day and only ever go up,
 * so recomputing never double-awards and syncing two devices is a simple max.
 *
 * Dates are 'YYYY-MM-DD' UTC strings, matching the activity_logs file names
 * written by the main process.
 */
import type { Activity, FocusSession, Task } from '../global';
import { inferActivityDetails, IGNORED_SYSTEM_APPS } from './activityAutoTracker';

// ─── Tuning ────────────────────────────────────────────────────────────────

/** Per-window activity must total at least this long to count (mirrors MIN_AUTO_LOG_SECONDS). */
export const MIN_ACTIVITY_MINUTES = 5;
/** A single window left open all day can't count for more than this. */
export const MAX_MINUTES_PER_ACTIVITY = 120;
export const MIN_FOCUS_SESSION_MINUTES = 10;
export const MAX_FOCUS_SESSION_MINUTES = 120;
/** Deliberate Focus Room time is worth a little more than passive tracking. */
export const FOCUS_ROOM_WEIGHT = 1.2;
/** Quality minutes beyond this per day earn nothing more. */
export const DAILY_QUALITY_CAP_MINUTES = 480;
/** A day with at least this many quality minutes counts toward the study streak. */
export const STUDY_DAY_MIN_MINUTES = 30;
export const STREAK_BONUS_PER_DAY = 0.05;
export const MAX_STREAK_BONUS_DAYS = 10;
export const TASK_BONUS = 2;
export const MAX_TASK_BONUS_TASKS = 3;
export const DAILY_CATFOOD_CAP = 100;
export const FEED_COST = 10;
/** How long the cat stays "full" after a meal. */
export const FULL_FOR_MS = 4 * 60 * 60 * 1000;

/** Unfed this long, the cat gets hungry (droopy, grumpy when tapped)... */
export const HUNGRY_AFTER_MS = 24 * 60 * 60 * 1000;
/** ...and after this long it looks weak. */
export const WEAK_AFTER_MS = 72 * 60 * 60 * 1000;

/** How much one minute in each category counts as quality time. */
export const CATEGORY_WEIGHTS: Record<string, number> = {
    development: 1,
    writing: 1,
    design: 0.9,
    research: 0.7,
    meeting: 0.4,
    break: 0,
    meal: 0,
    sleep: 0,
    other: 0,
};

/** Categories that count against focus purity. */
const DISTRACTION_CATEGORIES = new Set(['break']);

// ─── Daily scoring ─────────────────────────────────────────────────────────

export interface DayInputs {
    date: string;
    activities: Activity[];
    focusSessions: FocusSession[];
    tasks: Task[];
}

export interface DayQuality {
    /** Weighted, capped quality minutes. */
    qualityMinutes: number;
    /** Unweighted minutes in productive categories (for purity). */
    productiveMinutes: number;
    distractionMinutes: number;
    focusRoomMinutes: number;
}

export interface DayScore extends DayQuality {
    date: string;
    /** productive / (productive + distraction); 1 when nothing was tracked. */
    focusPurity: number;
    streakDays: number;
    streakMultiplier: number;
    tasksCompleted: number;
    base: number;
    taskBonus: number;
    total: number;
}

export const utcDateStr = (ts: number | string | Date): string => new Date(ts).toISOString().slice(0, 10);

export const shiftDate = (date: string, days: number): string => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};

// App name only: matching titles too would ignore e.g. editing a repo called "produchive".
const isIgnoredApp = (appName: string) => {
    const app = (appName || '').toLowerCase();
    return IGNORED_SYSTEM_APPS.some((ignored) => app.includes(ignored));
};

/** Scores the quality time of one day from its tracked activities and Focus Room sessions. */
export function computeDayQuality(date: string, activities: Activity[], focusSessions: FocusSession[]): DayQuality {
    let weighted = 0;
    let productiveMinutes = 0;
    let distractionMinutes = 0;

    for (const a of activities || []) {
        const minutes = (Number(a?.duration) || 0) / 60000;
        if (minutes < MIN_ACTIVITY_MINUTES) continue;
        const appName = a.owner?.name || '';
        if (isIgnoredApp(appName)) continue;
        const capped = Math.min(minutes, MAX_MINUTES_PER_ACTIVITY);
        const { category } = inferActivityDetails(appName, a.title || '');
        if (DISTRACTION_CATEGORIES.has(category)) {
            distractionMinutes += capped;
            continue;
        }
        const weight = CATEGORY_WEIGHTS[category] ?? 0;
        if (weight > 0) {
            weighted += capped * weight;
            productiveMinutes += capped;
        }
    }

    let focusRoomMinutes = 0;
    for (const s of focusSessions || []) {
        if (!s?.startedAt || utcDateStr(s.startedAt) !== date) continue;
        const minutes = (Number(s.durationSeconds) || 0) / 60;
        if (minutes < MIN_FOCUS_SESSION_MINUTES) continue;
        focusRoomMinutes += Math.min(minutes, MAX_FOCUS_SESSION_MINUTES);
    }
    weighted += focusRoomMinutes * FOCUS_ROOM_WEIGHT;
    productiveMinutes += focusRoomMinutes;

    return {
        qualityMinutes: Math.min(weighted, DAILY_QUALITY_CAP_MINUTES),
        productiveMinutes,
        distractionMinutes,
        focusRoomMinutes,
    };
}

/**
 * Consecutive study days ending at `date`. If `date` itself hasn't reached the
 * threshold yet, the streak is counted up to the day before so it isn't
 * "broken" in the morning.
 */
export function computeStudyStreak(qualityByDate: Record<string, number>, date: string): number {
    const qualifies = (d: string) => (qualityByDate[d] ?? 0) >= STUDY_DAY_MIN_MINUTES;
    let cursor = qualifies(date) ? date : shiftDate(date, -1);
    let streak = 0;
    while (qualifies(cursor) && streak < 365) {
        streak++;
        cursor = shiftDate(cursor, -1);
    }
    return streak;
}

/** Diminishing returns: 1h ≈ 20, 2h ≈ 28, 4h = 40, 8h ≈ 56. */
export const catfoodForMinutes = (qualityMinutes: number): number =>
    qualityMinutes <= 0 ? 0 : 20 * Math.sqrt(qualityMinutes / 60);

export function scoreDay(inputs: DayInputs, qualityByDate: Record<string, number> = {}): DayScore {
    const { date } = inputs;
    const quality = computeDayQuality(date, inputs.activities, inputs.focusSessions);
    const tracked = quality.productiveMinutes + quality.distractionMinutes;
    const focusPurity = tracked > 0 ? quality.productiveMinutes / tracked : 1;

    const streakDays = computeStudyStreak({ ...qualityByDate, [date]: quality.qualityMinutes }, date);
    const streakMultiplier = 1 + STREAK_BONUS_PER_DAY * Math.min(streakDays, MAX_STREAK_BONUS_DAYS);

    // Only tasks created and completed on this day, so old backlogs can't be cashed in at once.
    const tasksCompleted = (inputs.tasks || []).filter(
        (t) => t?.completed && Number(t.created) > 0 && utcDateStr(Number(t.created)) === date,
    ).length;
    // Task bonus needs some real work behind it, otherwise ticking boxes would be free food.
    const taskBonus = quality.qualityMinutes >= MIN_ACTIVITY_MINUTES
        ? TASK_BONUS * Math.min(tasksCompleted, MAX_TASK_BONUS_TASKS)
        : 0;

    const base = catfoodForMinutes(quality.qualityMinutes) * (0.6 + 0.4 * focusPurity);
    const total = Math.min(DAILY_CATFOOD_CAP, Math.floor((base + taskBonus) * streakMultiplier));

    return {
        date,
        ...quality,
        focusPurity,
        streakDays,
        streakMultiplier,
        tasksCompleted,
        base,
        taskBonus,
        total,
    };
}

// ─── Ledger ────────────────────────────────────────────────────────────────

export interface CatfoodSpend {
    id: string;
    at: number;
    amount: number;
    kind: 'feed';
}

export interface CatfoodLedger {
    version: 1;
    /** `${deviceId}|${date}` → catfood earned that day on that device (monotonic). */
    earned: Record<string, number>;
    spends: CatfoodSpend[];
    /** `${deviceId}|${localDate}` → times the cat was petted (tapped) that day on that device. */
    pets: Record<string, number>;
}

export const emptyLedger = (): CatfoodLedger => ({ version: 1, earned: {}, spends: [], pets: {} });

export function normalizeLedger(raw: any): CatfoodLedger {
    if (!raw || typeof raw !== 'object') return emptyLedger();
    const earned: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw.earned || {})) {
        const n = Math.floor(Number(v));
        if (n > 0) earned[k] = Math.min(n, DAILY_CATFOOD_CAP);
    }
    const spends = Array.isArray(raw.spends)
        ? raw.spends.filter((s: any) => s && typeof s.id === 'string' && Number(s.amount) > 0)
        : [];
    const pets: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw.pets || {})) {
        const n = Math.floor(Number(v));
        if (n > 0) pets[k] = n;
    }
    return { version: 1, earned, spends, pets };
}

export const totalEarned = (l: CatfoodLedger) => Object.values(l.earned).reduce((a, b) => a + b, 0);
export const totalSpent = (l: CatfoodLedger) => l.spends.reduce((a, s) => a + s.amount, 0);
export const balanceOf = (l: CatfoodLedger) => Math.max(0, totalEarned(l) - totalSpent(l));

export const earnedOn = (l: CatfoodLedger, date: string) =>
    Object.entries(l.earned).reduce((sum, [k, v]) => (k.endsWith(`|${date}`) ? sum + v : sum), 0);

export const lastFedAt = (l: CatfoodLedger) => l.spends.reduce((max, s) => Math.max(max, s.at), 0);

/**
 * Records a day's (re)computed total. Returns how much is newly awarded —
 * never negative, so recomputing a day can't take catfood away or award twice.
 */
export function applyDayTotal(
    ledger: CatfoodLedger,
    deviceId: string,
    date: string,
    dayTotal: number,
): { ledger: CatfoodLedger; awarded: number } {
    const key = `${deviceId}|${date}`;
    const prev = ledger.earned[key] ?? 0;
    const next = Math.min(DAILY_CATFOOD_CAP, Math.floor(dayTotal));
    if (next <= prev) return { ledger, awarded: 0 };
    return { ledger: { ...ledger, earned: { ...ledger.earned, [key]: next } }, awarded: next - prev };
}

/** Spends catfood, or returns null when the balance is too low. */
export function spendCatfood(ledger: CatfoodLedger, amount: number, id: string, at: number): CatfoodLedger | null {
    if (amount <= 0 || balanceOf(ledger) < amount) return null;
    return { ...ledger, spends: [...ledger.spends, { id, at, amount, kind: 'feed' }] };
}

/** Merges ledgers from two devices: per-day max of earnings, union of spends by id. */
export function mergeLedgers(a: CatfoodLedger, b: CatfoodLedger): CatfoodLedger {
    const earned = { ...a.earned };
    for (const [k, v] of Object.entries(b.earned)) earned[k] = Math.max(earned[k] ?? 0, v);
    const pets = { ...a.pets };
    for (const [k, v] of Object.entries(b.pets)) pets[k] = Math.max(pets[k] ?? 0, v);
    const seen = new Set(a.spends.map((s) => s.id));
    const spends = [...a.spends, ...b.spends.filter((s) => !seen.has(s.id))].sort((x, y) => x.at - y.at);
    return { version: 1, earned, spends, pets };
}

// ─── Pets ──────────────────────────────────────────────────────────────────

/** Local calendar date (what the user sees as "that day"), e.g. for heatmap tooltips. */
export const localDateStr = (ts: number | Date): string => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
 * How hungry the cat is. `since` is when the cat was first seen, used as the
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
