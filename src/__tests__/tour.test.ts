import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    compareVersions,
    shortVersion,
    resolveLaunchTour,
    stepsAddedSince,
    markTourSeen,
    nextAvailableIndex,
    placeCard,
} from '../renderer/lib/tour/tourLogic';
import { MAIN_TOUR, PAGE_TOURS, ALL_TOURS, type TourDefinition, type TourStep } from '../renderer/lib/tour/tourManifest';

const step = (id: string, since: string, target: string | null = id): TourStep => ({ id, since, target: target ?? undefined, title: id, body: id });

const main: TourDefinition = {
    id: 'main',
    title: 'Main',
    steps: [
        step('intro', '3.0.0', null),
        step('monitor', '3.0.0'),
        step('sync', '3.1.0'),
        step('insights', '3.2.0'),
        step('rooms', '3.3.0'),
        step('future', '3.9.0'),
    ],
};
const page: TourDefinition = {
    id: 'page',
    title: 'Page',
    steps: [
        step('page.rooms-again', '3.3.0', 'rooms'), // same element as main's 'rooms'
        step('page.wardrobe', '3.3.0'),
        step('page.old', '3.0.0'),
    ],
};
const tours = [main, page];

describe('compareVersions', () => {
    it.each([
        ['3.3.0', '3.1.0', 1],
        ['3.1.0', '3.3.0', -1],
        ['3.2', '3.2.0', 0],
        ['v3.0.35', '3.0.4', 1], // numeric, not string, comparison
        ['3.3.0-beta.1', '3.3.0', 0],
    ])('%s vs %s', (a, b, sign) => {
        expect(Math.sign(compareVersions(a, b))).toBe(sign);
    });

    it('shortens to major.minor for the header', () => {
        expect(shortVersion('3.3.2')).toBe('3.3');
    });
});

describe('resolveLaunchTour', () => {
    it('gives a fresh install the full tour, not What\'s new', () => {
        const res = resolveLaunchTour(null, '3.3.0', main, tours);
        expect(res.kind).toBe('full');
        if (res.kind === 'full') expect(res.tour).toBe(main);
    });

    it('treats an empty saved state like a fresh install', () => {
        expect(resolveLaunchTour({}, '3.3.0', main, tours).kind).toBe('full');
    });

    it('shows only steps added after 3.1.0 when upgrading from 3.1.0 to 3.3.0', () => {
        const res = resolveLaunchTour(markTourSeen('3.1.0', 'finished'), '3.3.0', main, tours);
        expect(res.kind).toBe('whatsNew');
        if (res.kind !== 'whatsNew') return;
        expect(res.tour.steps.map((s) => s.id)).toEqual(['insights', 'rooms', 'page.wardrobe']);
        expect(res.tour.title).toBe("What's new in v3.3");
        expect(res.fromVersion).toBe('3.1.0');
    });

    it('shows nothing on the same version', () => {
        expect(resolveLaunchTour(markTourSeen('3.3.0', 'finished'), '3.3.0', main, tours).kind).toBe('none');
    });

    it('shows nothing after the tour was skipped on this version', () => {
        expect(resolveLaunchTour(markTourSeen('3.3.0', 'skipped'), '3.3.0', main, tours).kind).toBe('none');
    });

    it('shows nothing after a downgrade', () => {
        expect(resolveLaunchTour(markTourSeen('3.3.0', 'finished'), '3.2.0', main, tours).kind).toBe('none');
    });

    it('shows nothing when an update added no tour steps', () => {
        expect(resolveLaunchTour(markTourSeen('3.3.0', 'finished'), '3.3.1', main, tours).kind).toBe('none');
    });
});

describe('stepsAddedSince', () => {
    it('leaves out steps tagged for an unreleased version', () => {
        expect(stepsAddedSince(tours, '3.3.0', '3.4.0').map((s) => s.id)).toEqual([]);
        expect(stepsAddedSince(tours, '3.3.0', '3.9.0').map((s) => s.id)).toEqual(['future']);
    });

    it('leaves out centred intro cards', () => {
        expect(stepsAddedSince(tours, '2.0.0', '3.0.0').map((s) => s.id)).toEqual(['monitor', 'page.old']);
    });
});

describe('nextAvailableIndex', () => {
    const steps = main.steps;
    const missing = new Set(['sync', 'insights']);
    const available = (s: TourStep) => !missing.has(s.id);

    it('skips unavailable steps going forward and back', () => {
        expect(nextAvailableIndex(steps, 1, 1, available)).toBe(4);
        expect(nextAvailableIndex(steps, 4, -1, available)).toBe(1);
    });

    it('returns -1 at either end', () => {
        expect(nextAvailableIndex(steps, steps.length - 1, 1, available)).toBe(-1);
        expect(nextAvailableIndex(steps, 0, -1, available)).toBe(-1);
    });
});

describe('placeCard', () => {
    const viewport = { width: 1200, height: 800 };
    const card = { width: 340, height: 200 };

    it('uses the preferred side when it fits', () => {
        const res = placeCard({ top: 100, left: 400, width: 200, height: 40 }, card, viewport, 'bottom');
        expect(res.placement).toBe('bottom');
        expect(res.top).toBe(156);
        expect(res.left).toBe(330);
    });

    it('flips to the other side near the edge', () => {
        const res = placeCard({ top: 740, left: 400, width: 200, height: 40 }, card, viewport, 'bottom');
        expect(res.placement).toBe('top');
    });

    it('keeps the card on screen', () => {
        const res = placeCard({ top: 100, left: 1150, width: 40, height: 40 }, card, viewport, 'bottom');
        expect(res.left + card.width).toBeLessThanOrEqual(viewport.width - 12);
    });
});

describe('tour manifest', () => {
    const all = ALL_TOURS.flatMap((t) => t.steps);

    it('has unique step ids', () => {
        const ids = all.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('tags every step with a valid version', () => {
        for (const s of all) expect(s.since).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('keeps the first-install tour focused', () => {
        expect(MAIN_TOUR.steps.length).toBeGreaterThanOrEqual(8);
        expect(MAIN_TOUR.steps.length).toBeLessThanOrEqual(13);
    });

    it('has a tour for every page', () => {
        for (const t of Object.values(PAGE_TOURS)) expect(t.steps.length).toBeGreaterThan(0);
    });

    it('keeps card copy short', () => {
        for (const s of all) {
            expect(s.title.length).toBeLessThanOrEqual(40);
            expect(s.body.length).toBeLessThanOrEqual(140);
        }
    });
});

describe('tour persistence', () => {
    beforeEach(() => {
        const store = new Map<string, string>();
        vi.stubGlobal('localStorage', {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => { store.set(k, v); },
            removeItem: (k: string) => { store.delete(k); },
        });
    });

    it('saves the version when a launch tour ends, and not for replays', async () => {
        const { useTour, loadTourState } = await import('../renderer/lib/tour/tourStore');
        useTour.getState().setAppVersion('3.3.0');

        useTour.getState().start(MAIN_TOUR, 'replay');
        useTour.getState().end('finished');
        expect(loadTourState()).toBeNull();

        useTour.getState().start(MAIN_TOUR, 'launch');
        useTour.getState().end('skipped');
        expect(loadTourState()).toEqual({ lastSeenTourVersion: '3.3.0', lastOutcome: 'skipped' });
        expect(resolveLaunchTour(loadTourState(), '3.3.0', MAIN_TOUR, ALL_TOURS).kind).toBe('none');
    });

    it('survives corrupt storage', async () => {
        const { loadTourState, TOUR_STORAGE_KEY } = await import('../renderer/lib/tour/tourStore');
        localStorage.setItem(TOUR_STORAGE_KEY, '{nope');
        expect(loadTourState()).toBeNull();
    });
});
