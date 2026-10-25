import { describe, it, expect } from 'vitest';
import {
    STREAK_TIERS,
    RANK_STEPS,
    getStreakRank,
    progressCopy,
    tierRangeCopy,
    shouldCelebrate,
} from '../renderer/lib/streakRank';

describe('streak rank ladder', () => {
    it('has ascending, non-overlapping thresholds', () => {
        const mins = RANK_STEPS.map((s) => s.minDays);
        expect(mins[0]).toBe(1);
        for (let i = 1; i < mins.length; i++) expect(mins[i]).toBeGreaterThan(mins[i - 1]);
        expect(RANK_STEPS.map((s) => s.ordinal)).toEqual(mins.map((_, i) => i));
    });

    it('labels divisions I to III and leaves the top tier undivided', () => {
        expect(RANK_STEPS[0].label).toBe('Ember I');
        expect(RANK_STEPS[2].label).toBe('Ember III');
        expect(RANK_STEPS[RANK_STEPS.length - 1].label).toBe('Luminary');
        expect(RANK_STEPS[RANK_STEPS.length - 1].division).toBeNull();
        expect(STREAK_TIERS).toHaveLength(8);
    });
});

describe('getStreakRank', () => {
    it.each([
        [1, 'Ember I'],
        [2, 'Ember I'],
        [3, 'Ember II'],
        [6, 'Ember III'],
        [7, 'Quill I'],
        [13, 'Quill III'],
        [14, 'Lantern I'],
        [29, 'Lantern III'],
        [30, 'Scholar I'],
        [60, 'Prism I'],
        [100, 'Sage I'],
        [180, 'Oracle I'],
        [364, 'Oracle III'],
        [365, 'Luminary'],
        [2000, 'Luminary'],
    ])('%i days → %s', (days, label) => {
        expect(getStreakRank(days).label).toBe(label);
    });

    it('treats zero, negative and invalid values as the starting rank', () => {
        for (const v of [0, -4, NaN, Infinity]) {
            const r = getStreakRank(v);
            expect(r.label).toBe('Ember I');
            expect(r.days).toBe(0);
        }
        expect(getStreakRank(0).daysToNext).toBe(3);
    });

    it('reports distance and progress to the next rank', () => {
        const r = getStreakRank(21);
        expect(r.label).toBe('Lantern II');
        expect(r.next?.label).toBe('Lantern III');
        expect(r.daysToNext).toBe(3);
        expect(r.progress).toBeCloseTo(2 / 5);
        expect(progressCopy(r)).toBe('3 days to Lantern III');
        expect(progressCopy(getStreakRank(13))).toBe('1 day to Lantern I');
    });

    it('is complete at the top rank', () => {
        const r = getStreakRank(400);
        expect(r.next).toBeNull();
        expect(r.progress).toBe(1);
        expect(progressCopy(r)).toBe('Top rank reached');
    });
});

describe('tierRangeCopy', () => {
    it('describes each tier span', () => {
        expect(tierRangeCopy(0)).toBe('1–6 days');
        expect(tierRangeCopy(2)).toBe('14–29 days');
        expect(tierRangeCopy(STREAK_TIERS.length - 1)).toBe('365+ days');
    });
});

describe('shouldCelebrate', () => {
    it('only fires on a climb past a previously seen rank', () => {
        expect(shouldCelebrate(null, 5)).toBe(false);
        expect(shouldCelebrate(3, 3)).toBe(false);
        expect(shouldCelebrate(4, 2)).toBe(false);
        expect(shouldCelebrate(2, 3)).toBe(true);
    });
});
