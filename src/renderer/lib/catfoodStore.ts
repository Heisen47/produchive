import { create } from 'zustand';
import { toast } from 'sonner';
import type { FocusSession } from '../global';
import { getDeviceId } from './syncDataEngine';
import {
    awardSessions,
    balanceOf,
    CatfoodLedger,
    earnedOn,
    emptyLedger,
    FEED_COST,
    grantStarter,
    HungerLevel,
    hungerLevel,
    lastFedAt,
    localDateStr,
    mergeLedgers,
    normalizeLedger,
    recordPet,
    sessionsOn,
    spendCatfood,
    STARTER_CATFOOD,
} from './catfood';

/** Key in db.json `settings`, which is already part of the encrypted sync payload. */
export const CATFOOD_SETTING_KEY = 'catfood';

/** Cheap (one IPC read of saved focus sessions), and only runs while the window is visible. */
const REFRESH_INTERVAL_MS = 2 * 60 * 1000;

interface CatfoodState {
    ledger: CatfoodLedger;
    loaded: boolean;
    balance: number;
    /** Catfood earned and sessions rewarded today (local date). */
    today: { earned: number; sessions: number };
    lastFedAt: number;
    /** Increments on every successful feeding; Jogu watches it to play the eating animation. */
    feedCount: number;
    load: () => Promise<void>;
    refresh: () => Promise<void>;
    feed: () => boolean;
    /** Counts a tap on Jogu. */
    pet: () => void;
    replaceLedger: (ledger: CatfoodLedger) => void;
}

const CAT_SINCE_KEY = 'produchive_cat_since';

/** When this device first met Jogu; the hunger clock starts here until the first meal. */
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
        // Never write before db.json was read: a half-empty in-memory ledger would overwrite saved data.
        const { loaded, load } = useCatfoodStore.getState();
        (loaded ? Promise.resolve() : load()).then(() => persist(useCatfoodStore.getState().ledger));
    }, 1500);
};

let loadPromise: Promise<void> | null = null;

export const useCatfoodStore = create<CatfoodState>((set, get) => {
    const commit = (ledger: CatfoodLedger) => {
        const today = localDateStr(Date.now());
        set({
            ledger,
            balance: balanceOf(ledger),
            lastFedAt: lastFedAt(ledger),
            today: { earned: earnedOn(ledger, today), sessions: sessionsOn(ledger, today) },
        });
    };

    return {
        ledger: emptyLedger(),
        loaded: false,
        balance: 0,
        today: { earned: 0, sessions: 0 },
        lastFedAt: 0,
        feedCount: 0,

        // Single-flight: React StrictMode (dev) and remounts start the engine more than once, and two
        // overlapping loads used to let a stale read overwrite the starter grant made by the first one.
        load: () => (loadPromise ??= (async () => {
            let fromDisk = emptyLedger();
            try {
                const settings = await window.electronAPI?.getSettings?.();
                fromDisk = normalizeLedger(settings?.[CATFOOD_SETTING_KEY]);
            } catch (e) {
                console.error('[catfood] Failed to load ledger:', e);
                set({ loaded: true });
                return;
            }
            // Merge rather than replace, so nothing already in memory (a grant, a pet) can be lost.
            let ledger = mergeLedgers(get().ledger, fromDisk);
            // First launch after installing or upgrading: a few catfood to meet Jogu with.
            const starter = grantStarter(ledger);
            ledger = starter.ledger;
            commit(ledger);
            set({ loaded: true });
            if (starter.granted) {
                persist(ledger);
                toast.success(`Meet Jogu! Here's ${STARTER_CATFOOD} catfood`, {
                    description: 'Feed Jogu from the 🐟 button in the footer. Earn more with 30-minute study sessions.',
                    duration: 7000,
                });
            }
        })()),

        refresh: async () => {
            const api = window.electronAPI;
            if (!api?.getFocusSessions || !get().loaded) return;
            let focusSessions: FocusSession[] = [];
            try {
                focusSessions = (await api.getFocusSessions()) || [];
            } catch (e) {
                console.error('[catfood] Failed to read focus sessions:', e);
                return;
            }
            const { ledger, awarded, sessionsAwarded } = awardSessions(get().ledger, focusSessions);
            if (awarded > 0) {
                commit(ledger);
                persist(ledger);
                toast.success(`+${awarded} catfood for Jogu`, {
                    description: sessionsAwarded === 1
                        ? 'Earned from your study session. Jogu is watching hopefully.'
                        : `Earned from ${sessionsAwarded} study sessions. Jogu is watching hopefully.`,
                    duration: 4000,
                });
            } else {
                commit(ledger); // refresh "today" after midnight
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
 * Loads the ledger (granting the starter food once) and awards catfood for new
 * study sessions while the window is visible: on start, on becoming visible,
 * and every few minutes. No timers
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
        .then(() => refresh())
        .finally(schedule);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
        stopped = true;
        if (timer) clearTimeout(timer);
        document.removeEventListener('visibilitychange', onVisibility);
    };
}
