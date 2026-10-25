import { create } from 'zustand';
import { toast } from 'sonner';
import type { Activity } from '../global';
import { useStore } from './store';
import { getDeviceId } from './syncDataEngine';
import {
    applyDayTotal,
    balanceOf,
    CatfoodLedger,
    computeDayQuality,
    DayScore,
    emptyLedger,
    FEED_COST,
    HungerLevel,
    hungerLevel,
    lastFedAt,
    localDateStr,
    mergeLedgers,
    normalizeLedger,
    recordPet,
    scoreDay,
    shiftDate,
    spendCatfood,
    utcDateStr,
} from './catfood';

/** Key in db.json `settings`, which is already part of the encrypted sync payload. */
export const CATFOOD_SETTING_KEY = 'catfood';

/** Days recomputed on startup (in case the app was closed before a day was scored). */
const BACKFILL_DAYS = 7;
/** Extra history read only to compute the study streak. */
const STREAK_LOOKBACK_DAYS = 14;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

interface CatfoodState {
    ledger: CatfoodLedger;
    loaded: boolean;
    balance: number;
    today: DayScore | null;
    lastFedAt: number;
    /** Increments on every successful feeding; the cat watches it to play the eating animation. */
    feedCount: number;
    load: () => Promise<void>;
    refresh: (opts?: { backfill?: boolean }) => Promise<void>;
    feed: () => boolean;
    /** Counts a tap on the cat. */
    pet: () => void;
    replaceLedger: (ledger: CatfoodLedger) => void;
}

const CAT_SINCE_KEY = 'produchive_cat_since';

/** When this device first met the cat; the hunger clock starts here until the first meal. */
const catSince = (() => {
    try {
        const saved = Number(localStorage.getItem(CAT_SINCE_KEY));
        if (saved > 0) return saved;
        const now = Date.now();
        localStorage.setItem(CAT_SINCE_KEY, String(now));
        return now;
    } catch {
        return 0;
    }
})();

export const getCatHunger = (now = Date.now()): HungerLevel =>
    hungerLevel(useCatfoodStore.getState().lastFedAt, now, catSince);

// Quality minutes of finished days never change, so they are cached for the streak.
const pastQuality: Record<string, number> = {};

const persist = (ledger: CatfoodLedger) => {
    window.electronAPI?.setSetting?.(CATFOOD_SETTING_KEY, ledger)?.catch?.((e: unknown) =>
        console.error('[catfood] Failed to persist ledger:', e),
    );
};

// Taps can come in quick bursts; write them to db.json once things settle.
let pendingPersist: ReturnType<typeof setTimeout> | null = null;
const persistSoon = () => {
    if (pendingPersist) clearTimeout(pendingPersist);
    pendingPersist = setTimeout(() => {
        pendingPersist = null;
        persist(useCatfoodStore.getState().ledger);
    }, 1500);
};

export const useCatfoodStore = create<CatfoodState>((set, get) => {
    const commit = (ledger: CatfoodLedger) =>
        set({ ledger, balance: balanceOf(ledger), lastFedAt: lastFedAt(ledger) });

    return {
        ledger: emptyLedger(),
        loaded: false,
        balance: 0,
        today: null,
        lastFedAt: 0,
        feedCount: 0,

        load: async () => {
            try {
                const settings = await window.electronAPI?.getSettings?.();
                commit(normalizeLedger(settings?.[CATFOOD_SETTING_KEY]));
            } catch (e) {
                console.error('[catfood] Failed to load ledger:', e);
            }
            set({ loaded: true });
        },

        refresh: async ({ backfill = false } = {}) => {
            const api = window.electronAPI;
            if (!api?.getActivityDataRange || !get().loaded) return;

            const today = utcDateStr(Date.now());
            const scoreFrom = shiftDate(today, backfill ? -(BACKFILL_DAYS - 1) : -1);
            const readFrom = backfill ? shiftDate(scoreFrom, -STREAK_LOOKBACK_DAYS) : scoreFrom;

            let range: Record<string, { activities: Activity[] }> = {};
            let focusSessions: any[] = [];
            try {
                [range, focusSessions] = await Promise.all([
                    api.getActivityDataRange(readFrom, today),
                    api.getFocusSessions?.() ?? Promise.resolve([]),
                ]);
            } catch (e) {
                console.error('[catfood] Failed to read activity data:', e);
                return;
            }
            const tasks = useStore.getState().tasks || [];

            for (const [date, day] of Object.entries(range)) {
                if (date < scoreFrom && date !== today) {
                    pastQuality[date] = computeDayQuality(date, day.activities, focusSessions).qualityMinutes;
                }
            }

            const deviceId = getDeviceId();
            let ledger = get().ledger;
            let awarded = 0;
            let todayScore: DayScore | null = null;
            for (let date = scoreFrom; date <= today; date = shiftDate(date, 1)) {
                const score = scoreDay(
                    { date, activities: range[date]?.activities || [], focusSessions, tasks },
                    pastQuality,
                );
                if (date !== today) pastQuality[date] = score.qualityMinutes;
                else todayScore = score;
                const r = applyDayTotal(ledger, deviceId, date, score.total);
                ledger = r.ledger;
                awarded += r.awarded;
            }

            set({ today: todayScore });
            if (awarded > 0) {
                commit(ledger);
                persist(ledger);
                toast.success(`+${awarded} catfood`, {
                    description: 'Earned from your focused time. The cat is watching hopefully.',
                    duration: 4000,
                });
            }
        },

        feed: () => {
            const next = spendCatfood(get().ledger, FEED_COST, `feed_${getDeviceId()}_${Date.now()}`, Date.now());
            if (!next) return false;
            commit(next);
            persist(next);
            set((s) => ({ feedCount: s.feedCount + 1 }));
            return true;
        },

        pet: () => {
            const next = recordPet(get().ledger, getDeviceId(), localDateStr(Date.now()));
            commit(next);
            persistSoon();
        },

        replaceLedger: (ledger) => commit(normalizeLedger(ledger)),
    };
});

/** Merges an incoming (synced) ledger with the local one. */
export const mergeIncomingCatfood = (remote: unknown): CatfoodLedger =>
    mergeLedgers(useCatfoodStore.getState().ledger, normalizeLedger(remote));

/**
 * Loads the ledger and awards catfood while the window is visible: once on
 * start (with backfill), on becoming visible, and every few minutes. No timers
 * run while the window is hidden. Returns a cleanup function.
 */
export function startCatfoodEngine(): () => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    const { load, refresh } = useCatfoodStore.getState();

    const schedule = () => {
        if (timer) clearTimeout(timer);
        timer = null;
        if (stopped || document.visibilityState !== 'visible') return;
        timer = setTimeout(() => {
            refresh().finally(schedule);
        }, REFRESH_INTERVAL_MS);
    };

    const onVisibility = () => {
        if (document.visibilityState === 'visible') refresh().finally(schedule);
        else schedule(); // clears the timer
    };

    load()
        .then(() => refresh({ backfill: true }))
        .finally(schedule);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
        stopped = true;
        if (timer) clearTimeout(timer);
        document.removeEventListener('visibilitychange', onVisibility);
    };
}
