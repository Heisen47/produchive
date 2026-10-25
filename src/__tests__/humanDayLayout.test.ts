import { describe, it, expect } from 'vitest';
import { layoutHumanDay } from '../renderer/lib/smartScheduler';
import type { PlannedRoutineItem } from '../renderer/types/routine';

const DATE = '2026-10-26'; // a Monday

const item = (title: string, category: PlannedRoutineItem['category'], start: number, duration: number): PlannedRoutineItem => ({
    id: title,
    title,
    category,
    priority: 'high',
    dayIndex: 1,
    dateStr: DATE,
    startHour: Math.floor(start / 60),
    startMinute: start % 60,
    durationMinutes: duration,
    completed: false,
});

const startOf = (i: PlannedRoutineItem) => i.startHour * 60 + i.startMinute;
const endOf = (i: PlannedRoutineItem) => startOf(i) + i.durationMinutes;
const isFocus = (i: PlannedRoutineItem) => !['meal', 'break', 'sleep'].includes(i.category) && !/office/i.test(i.title);

const expectNoOverlaps = (items: PlannedRoutineItem[]) => {
    for (let i = 1; i < items.length; i++) {
        expect(startOf(items[i])).toBeGreaterThanOrEqual(endOf(items[i - 1]));
    }
};

describe('layoutHumanDay', () => {
    it('spreads a crammed late-afternoon plan with buffers, a fixed office end and dinner', () => {
        // What a small model returned: everything in the past, so it all collapsed onto "now"
        const raw = [
            item('Office', 'development', 9 * 60, 60),
            item('Leetcode & DSA', 'development', 10 * 60, 60),
            item('Video Editing', 'writing', 11 * 60, 60),
            item('System Design Study', 'research', 12 * 60, 60),
        ];

        const out = layoutHumanDay(raw, {
            dateStr: DATE,
            dayStartMins: 16 * 60 + 28,
            workBudgetMins: 360,
            includeLunch: true,
            includeDinner: true,
            includeRestBlocks: true,
        });

        expectNoOverlaps(out);
        out.forEach((i) => expect(startOf(i) % 5).toBe(0));
        expect(startOf(out[0])).toBe(16 * 60 + 30);

        // Office only covers what is left of office hours
        const office = out.find((i) => i.title === 'Office')!;
        expect(endOf(office)).toBe(17 * 60);

        // Dinner is added in its normal window; lunch has passed so it is not
        const dinner = out.find((i) => i.category === 'meal')!;
        expect(dinner.title).toBe('Dinner');
        expect(startOf(dinner)).toBeGreaterThanOrEqual(18 * 60 + 30);
        expect(startOf(dinner)).toBeLessThanOrEqual(21 * 60 + 30);
        expect(out.filter((i) => i.category === 'meal')).toHaveLength(1);

        // Back-to-back focus blocks get at least a 10 minute buffer
        for (let i = 1; i < out.length; i++) {
            if (isFocus(out[i]) && isFocus(out[i - 1])) {
                expect(startOf(out[i]) - endOf(out[i - 1])).toBeGreaterThanOrEqual(10);
            }
        }
    });

    it('adds a short break after about two hours of continuous focus', () => {
        const raw = [
            item('Deep work A', 'development', 9 * 60, 60),
            item('Deep work B', 'development', 10 * 60, 60),
            item('Deep work C', 'development', 11 * 60, 60),
        ];
        const out = layoutHumanDay(raw, { dateStr: DATE, dayStartMins: 14 * 60, includeRestBlocks: true });
        expect(out.some((i) => i.category === 'break')).toBe(true);
        expectNoOverlaps(out);
    });

    it('splits blocks longer than two hours into sessions', () => {
        const out = layoutHumanDay([item('Build feature', 'development', 14 * 60, 180)], { dateStr: DATE, dayStartMins: 14 * 60 });
        const parts = out.filter((i) => i.title.startsWith('Build feature'));
        expect(parts.length).toBeGreaterThan(1);
        parts.forEach((p) => expect(p.durationMinutes).toBeLessThanOrEqual(90));
        expect(parts.reduce((sum, p) => sum + p.durationMinutes, 0)).toBe(180);
    });

    it('shrinks focus work that overshoots the day budget', () => {
        const raw = [
            item('A', 'development', 14 * 60, 120),
            item('B', 'development', 16 * 60, 120),
            item('C', 'development', 18 * 60, 120),
        ];
        const out = layoutHumanDay(raw, { dateStr: DATE, dayStartMins: 14 * 60, workBudgetMins: 240 });
        const focus = out.filter(isFocus).reduce((sum, i) => sum + i.durationMinutes, 0);
        expect(focus).toBeLessThanOrEqual(250);
    });

    it('drops meals the user turned off and keeps lunch inside its window', () => {
        const raw = [
            item('Breakfast', 'meal', 8 * 60, 30),
            item('Lunch', 'meal', 16 * 60, 60), // model put lunch far too late
            item('Write docs', 'writing', 10 * 60, 60),
        ];
        const out = layoutHumanDay(raw, { dateStr: DATE, dayStartMins: 9 * 60, includeBreakfast: false, includeLunch: true });
        expect(out.some((i) => i.title === 'Breakfast')).toBe(false);
        const lunch = out.find((i) => i.title === 'Lunch')!;
        expect(startOf(lunch)).toBeLessThanOrEqual(14 * 60 + 30);
    });

    it('wraps office hours around lunch', () => {
        const out = layoutHumanDay([item('Office', 'other', 9 * 60, 60)], {
            dateStr: DATE,
            dayStartMins: 8 * 60,
            includeLunch: true,
        });
        const office = out.filter((i) => i.title.startsWith('Office'));
        expect(office).toHaveLength(2);
        expect(startOf(office[0])).toBe(9 * 60);
        expect(endOf(office[1])).toBe(17 * 60);
        expectNoOverlaps(out);
    });

    it('pulls blocks up after an item is removed when compacting', () => {
        const kept = [item('First', 'development', 15 * 60, 60), item('Third', 'development', 18 * 60, 60)];
        const out = layoutHumanDay(kept, { dateStr: DATE, dayStartMins: 15 * 60, compact: true });
        expect(startOf(out[1])).toBe(16 * 60 + 15); // 60m block + 15m buffer
    });
});
