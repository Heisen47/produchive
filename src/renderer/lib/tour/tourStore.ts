import { create } from 'zustand';
import type { TourDefinition, TourView } from './tourManifest';
import { markTourSeen, type TourState } from './tourLogic';

/**
 * Tour state is per device (localStorage, like the pinned sidebar), so a tour you finished
 * on one computer still shows on a new one. It's deliberately left out of sync.
 */
export const TOUR_STORAGE_KEY = 'produchive_tour_state';

export function loadTourState(): TourState | null {
    try {
        const raw = localStorage.getItem(TOUR_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? (parsed as TourState) : null;
    } catch {
        return null;
    }
}

export function saveTourState(state: TourState): void {
    try {
        localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Storage can be full or blocked; the tour may show again next launch, which is harmless.
    }
}

/** 'launch' tours (first install, What's new) update lastSeenTourVersion when they end; replays don't. */
export type TourKind = 'launch' | 'replay';

/** What the overlay needs from the app shell to move between pages. */
export interface TourHost {
    navigate: (view: TourView) => void;
    setSidebarOpen: (open: boolean) => void;
}

interface ActiveTour {
    tour: TourDefinition;
    kind: TourKind;
    /** Shown above the step title, e.g. "What's new in v3.3". */
    eyebrow?: string;
    index: number;
}

interface TourStore {
    active: ActiveTour | null;
    host: TourHost | null;
    appVersion: string;
    setHost: (host: TourHost | null) => void;
    setAppVersion: (v: string) => void;
    start: (tour: TourDefinition, kind?: TourKind, eyebrow?: string) => void;
    goTo: (index: number) => void;
    end: (outcome: 'finished' | 'skipped') => void;
}

export const useTour = create<TourStore>((set, get) => ({
    active: null,
    host: null,
    appVersion: '0.0.0',
    setHost: (host) => set({ host }),
    setAppVersion: (appVersion) => set({ appVersion }),
    start: (tour, kind = 'replay', eyebrow) => {
        if (tour.steps.length === 0) return;
        set({ active: { tour, kind, eyebrow, index: 0 } });
    },
    goTo: (index) => {
        const active = get().active;
        if (!active) return;
        set({ active: { ...active, index } });
    },
    end: (outcome) => {
        const active = get().active;
        if (active?.kind === 'launch') saveTourState(markTourSeen(get().appVersion, outcome));
        set({ active: null });
    },
}));
