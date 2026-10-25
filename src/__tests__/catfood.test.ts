import { describe, it, expect } from 'vitest';
import type { Activity, FocusSession, Task } from '../renderer/global';
import {
    applyDayTotal,
    balanceOf,
    catfoodForMinutes,
    computeDayQuality,
    computeStudyStreak,
    DAILY_CATFOOD_CAP,
    DAILY_QUALITY_CAP_MINUTES,
    earnedOn,
    emptyLedger,
    FEED_COST,
    FULL_FOR_MS,
    HUNGRY_AFTER_MS,
    hungerLevel,
    WEAK_AFTER_MS,
    mergeLedgers,
    normalizeLedger,
    petsByDate,
    recordPet,
    totalPets,
    scoreDay,
    shiftDate,
    spendCatfood,
    STUDY_DAY_MIN_MINUTES,
} from '../renderer/lib/catfood';

const DAY = '2026-10-20';
const MIN = 60_000;

const act = (app: string, title: string, minutes: number): Activity => ({
    title,
    owner: { name: app, path: `/Applications/${app}.app` },
    timestamp: Date.parse(`${DAY}T10:00:00Z`),
    duration: minutes * MIN,
});

const session = (minutes: number, startedAt = `${DAY}T09:00:00Z`): FocusSession => ({
    id: `s-${minutes}-${startedAt}`,
    scene: 'library',
    durationSeconds: minutes * 60,
    startedAt,
    endedAt: startedAt,
    startedAtReadable: '',
    endedAtReadable: '',
});

const task = (id: string, completed: boolean, created = Date.parse(`${DAY}T08:00:00Z`)): Task => ({
    id,
    text: id,
    completed,
    created,
});

describe('catfood: day quality', () => {
    it('weights categories and ignores activities shorter than the minimum', () => {
        const q = computeDayQuality(DAY, [
            act('Code', 'store.ts - produchive - Visual Studio Code', 60), // development ×1
            act('Google Chrome', 'MDN Web Docs - Google Chrome', 30), // research ×0.7
            act('Code', 'tiny.ts - Visual Studio Code', 4), // too short
        ], []);
        expect(q.qualityMinutes).toBeCloseTo(60 + 21);
        expect(q.productiveMinutes).toBeCloseTo(90);
    });

    it('counts entertainment as distraction, not quality time', () => {
        const q = computeDayQuality(DAY, [act('Google Chrome', 'YouTube - Google Chrome', 90)], []);
        expect(q.qualityMinutes).toBe(0);
        expect(q.distractionMinutes).toBe(90);
    });

    it('ignores Produchive itself and system apps', () => {
        const q = computeDayQuality(DAY, [act('Produchive', 'Produchive', 120), act('Finder', 'idle', 60)], []);
        expect(q.qualityMinutes).toBe(0);
    });

    it('caps a single window left open all day', () => {
        const q = computeDayQuality(DAY, [act('Code', 'main.ts - Visual Studio Code', 600)], []);
        expect(q.qualityMinutes).toBe(120);
    });

    it('caps total quality minutes per day', () => {
        const acts = Array.from({ length: 8 }, (_, i) => act('Code', `file${i}.ts - Visual Studio Code`, 120));
        expect(computeDayQuality(DAY, acts, []).qualityMinutes).toBe(DAILY_QUALITY_CAP_MINUTES);
    });

    it('rewards Focus Room sessions of real length on that day only', () => {
        const q = computeDayQuality(DAY, [], [
            session(50),
            session(5), // too short
            session(60, '2026-10-19T09:00:00Z'), // other day
        ]);
        expect(q.focusRoomMinutes).toBe(50);
        expect(q.qualityMinutes).toBeCloseTo(60); // 50 × 1.2
    });
});

describe('catfood: streak', () => {
    const q = (days: Record<string, number>) => days;

    it('counts consecutive qualifying days', () => {
        const byDate = q({
            [DAY]: 45,
            [shiftDate(DAY, -1)]: 60,
            [shiftDate(DAY, -2)]: STUDY_DAY_MIN_MINUTES,
            [shiftDate(DAY, -3)]: 10, // breaks the streak
            [shiftDate(DAY, -4)]: 90,
        });
        expect(computeStudyStreak(byDate, DAY)).toBe(3);
    });

    it('does not break the streak before today qualifies', () => {
        const byDate = q({ [DAY]: 5, [shiftDate(DAY, -1)]: 60, [shiftDate(DAY, -2)]: 60 });
        expect(computeStudyStreak(byDate, DAY)).toBe(2);
    });

    it('shiftDate crosses month boundaries in UTC', () => {
        expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28');
        expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01');
    });
});

describe('catfood: scoring', () => {
    it('has diminishing returns', () => {
        expect(catfoodForMinutes(0)).toBe(0);
        expect(catfoodForMinutes(60)).toBeCloseTo(20);
        expect(catfoodForMinutes(240)).toBeCloseTo(40);
        expect(catfoodForMinutes(240)).toBeLessThan(catfoodForMinutes(60) * 4);
    });

    it('is deterministic', () => {
        const inputs = { date: DAY, activities: [act('Code', 'a.ts - Visual Studio Code', 90)], focusSessions: [session(30)], tasks: [] as Task[] };
        expect(scoreDay(inputs)).toEqual(scoreDay(inputs));
    });

    it('gives nothing for raw screen time spent on entertainment', () => {
        const s = scoreDay({ date: DAY, activities: [act('Google Chrome', 'Netflix - Google Chrome', 300)], focusSessions: [] as FocusSession[], tasks: [] as Task[] });
        expect(s.total).toBe(0);
    });

    it('lowers the reward when focus is mixed with distraction', () => {
        const work = act('Code', 'a.ts - Visual Studio Code', 120);
        const pure = scoreDay({ date: DAY, activities: [work], focusSessions: [] as FocusSession[], tasks: [] as Task[] });
        const mixed = scoreDay({ date: DAY, activities: [work, act('Google Chrome', 'Reddit - Google Chrome', 120)], focusSessions: [] as FocusSession[], tasks: [] as Task[] });
        expect(mixed.focusPurity).toBeCloseTo(0.5);
        expect(mixed.total).toBeLessThan(pure.total);
        expect(mixed.total).toBeGreaterThan(0);
    });

    it('applies a capped streak multiplier', () => {
        const inputs = { date: DAY, activities: [act('Code', 'a.ts - Visual Studio Code', 120)], focusSessions: [] as FocusSession[], tasks: [] as Task[] };
        const history: Record<string, number> = {};
        for (let i = 1; i <= 30; i++) history[shiftDate(DAY, -i)] = 60;
        const noStreak = scoreDay(inputs);
        const longStreak = scoreDay(inputs, history);
        expect(noStreak.streakDays).toBe(1);
        expect(longStreak.streakDays).toBe(31);
        expect(longStreak.streakMultiplier).toBeCloseTo(1.5);
        expect(longStreak.total).toBeGreaterThan(noStreak.total);
    });

    it('gives a small capped task bonus only with real work and only for that day', () => {
        const tasks = [
            task('a', true), task('b', true), task('c', true), task('d', true), task('e', true),
            task('f', false),
            task('old', true, Date.parse('2026-10-01T08:00:00Z')),
        ];
        const idle = scoreDay({ date: DAY, activities: [], focusSessions: [] as FocusSession[], tasks });
        expect(idle.tasksCompleted).toBe(5);
        expect(idle.total).toBe(0);

        const worked = scoreDay({ date: DAY, activities: [act('Code', 'a.ts - Visual Studio Code', 60)], focusSessions: [] as FocusSession[], tasks });
        expect(worked.taskBonus).toBe(6);
    });

    it('never exceeds the daily cap', () => {
        const acts = Array.from({ length: 10 }, (_, i) => act('Code', `f${i}.ts - Visual Studio Code`, 120));
        const history: Record<string, number> = {};
        for (let i = 1; i <= 30; i++) history[shiftDate(DAY, -i)] = 480;
        const s = scoreDay({ date: DAY, activities: acts, focusSessions: [session(120)], tasks: [task('a', true), task('b', true), task('c', true)] }, history);
        expect(s.total).toBeLessThanOrEqual(DAILY_CATFOOD_CAP);
        expect(s.total).toBeGreaterThan(50);
    });
});

describe('catfood: ledger', () => {
    it('awards incrementally and never twice', () => {
        let l = emptyLedger();
        let r = applyDayTotal(l, 'dev1', DAY, 12);
        expect(r.awarded).toBe(12);
        l = r.ledger;
        r = applyDayTotal(l, 'dev1', DAY, 20);
        expect(r.awarded).toBe(8);
        l = r.ledger;
        r = applyDayTotal(l, 'dev1', DAY, 20);
        expect(r.awarded).toBe(0);
        r = applyDayTotal(l, 'dev1', DAY, 5); // recompute lower: keeps what was earned
        expect(r.awarded).toBe(0);
        expect(balanceOf(r.ledger)).toBe(20);
        expect(earnedOn(r.ledger, DAY)).toBe(20);
    });

    it('spends only what is available', () => {
        let l = applyDayTotal(emptyLedger(), 'dev1', DAY, FEED_COST + 3).ledger;
        const fed = spendCatfood(l, FEED_COST, 'feed-1', 1000);
        expect(fed).not.toBeNull();
        l = fed!;
        expect(balanceOf(l)).toBe(3);
        expect(spendCatfood(l, FEED_COST, 'feed-2', 2000)).toBeNull();
    });

    it('merges devices without double counting', () => {
        const a = { ...applyDayTotal(emptyLedger(), 'mac', DAY, 30).ledger };
        const aSpent = spendCatfood(a, 10, 'feed-a', 1)!;
        const b = applyDayTotal(applyDayTotal(emptyLedger(), 'mac', DAY, 25).ledger, 'pc', DAY, 15).ledger;
        const bSpent = spendCatfood(b, 10, 'feed-b', 2)!;

        const merged = mergeLedgers(aSpent, bSpent);
        expect(merged.earned).toEqual({ [`mac|${DAY}`]: 30, [`pc|${DAY}`]: 15 });
        expect(merged.pets).toEqual({});
        expect(merged.spends.map((s) => s.id)).toEqual(['feed-a', 'feed-b']);
        expect(balanceOf(merged)).toBe(25);
        // Merging is idempotent
        expect(mergeLedgers(merged, bSpent)).toEqual(merged);
    });

    it('normalizes junk from storage', () => {
        expect(normalizeLedger(undefined)).toEqual(emptyLedger());
        const l = normalizeLedger({ earned: { 'x|2026-01-01': 5000, 'y|2026-01-01': -3 }, spends: [{ id: 1 }, { id: 'ok', amount: 2, at: 1 }] });
        expect(l.earned).toEqual({ 'x|2026-01-01': DAILY_CATFOOD_CAP });
        expect(l.spends).toHaveLength(1);
    });
});

describe('catfood: hunger', () => {
    const now = 1_000_000_000_000;
    it('is full right after a meal, then content, hungry and weak', () => {
        expect(hungerLevel(now - 1000, now)).toBe('full');
        expect(hungerLevel(now - FULL_FOR_MS - 1, now)).toBe('content');
        expect(hungerLevel(now - HUNGRY_AFTER_MS, now)).toBe('hungry');
        expect(hungerLevel(now - WEAK_AFTER_MS, now)).toBe('weak');
    });

    it('uses first-seen time until the first meal', () => {
        expect(hungerLevel(0, now)).toBe('content');
        expect(hungerLevel(0, now, now - 1000)).toBe('content');
        expect(hungerLevel(0, now, now - HUNGRY_AFTER_MS - 1)).toBe('hungry');
        expect(hungerLevel(0, now, now - WEAK_AFTER_MS - 1)).toBe('weak');
    });

    it('a recent meal wins over an old first-seen time', () => {
        expect(hungerLevel(now - 1000, now, now - WEAK_AFTER_MS * 2)).toBe('full');
    });
});

describe('catfood: pets', () => {
    it('counts pets per device and day, and sums them per day', () => {
        let l = emptyLedger();
        l = recordPet(l, 'mac', DAY);
        l = recordPet(l, 'mac', DAY);
        l = recordPet(l, 'pc', DAY);
        l = recordPet(l, 'mac', '2026-10-21');
        expect(totalPets(l)).toBe(4);
        expect(petsByDate(l)).toEqual({ [DAY]: 3, '2026-10-21': 1 });
    });

    it('merges pet counts across devices without double counting', () => {
        const mac = recordPet(recordPet(emptyLedger(), 'mac', DAY), 'mac', DAY);
        const macOld = recordPet(emptyLedger(), 'mac', DAY);
        const pc = recordPet(macOld, 'pc', DAY);
        const merged = mergeLedgers(mac, pc);
        expect(merged.pets).toEqual({ [`mac|${DAY}`]: 2, [`pc|${DAY}`]: 1 });
        expect(mergeLedgers(merged, merged)).toEqual(merged);
    });

    it('keeps pets through normalization and drops junk', () => {
        const l = normalizeLedger({ pets: { [`mac|${DAY}`]: 5, bad: 'x' } });
        expect(l.pets).toEqual({ [`mac|${DAY}`]: 5 });
        expect(normalizeLedger({}).pets).toEqual({});
    });
});
