import { describe, it, expect } from 'vitest';
import type { FocusSession } from '../renderer/global';
import {
    awardSessions,
    balanceOf,
    catfoodForSession,
    DAILY_CATFOOD_CAP,
    earnedOn,
    emptyLedger,
    FEED_COST,
    FULL_FOR_MS,
    grantStarter,
    HUNGRY_AFTER_MS,
    hungerLevel,
    localDateStr,
    mergeLedgers,
    normalizeLedger,
    petsByDate,
    recordPet,
    sessionsOn,
    spendCatfood,
    STARTER_CATFOOD,
    totalPets,
    WEAK_AFTER_MS,
} from '../renderer/lib/catfood';

const DAY = '2026-10-20';

const session = (id: string, minutes: number, startedAt = `${DAY}T09:00:00`): FocusSession => ({
    id,
    scene: 'library',
    durationSeconds: minutes * 60,
    startedAt,
    endedAt: startedAt,
    startedAtReadable: '',
    endedAtReadable: '',
});

describe('catfood: 30-minute study sessions', () => {
    it('gives one catfood per full 30 minutes of a single session', () => {
        expect(catfoodForSession(29 * 60)).toBe(0);
        expect(catfoodForSession(30 * 60)).toBe(1);
        expect(catfoodForSession(59 * 60)).toBe(1);
        expect(catfoodForSession(60 * 60)).toBe(2);
        expect(catfoodForSession(65 * 60)).toBe(2);
        expect(catfoodForSession(0)).toBe(0);
        expect(catfoodForSession(NaN)).toBe(0);
    });

    it('caps one session, so a timer left running cannot farm food', () => {
        expect(catfoodForSession(10 * 60 * 60)).toBe(4);
    });

    it('awards each session once, keyed by id', () => {
        const sessions = [session('a', 29), session('b', 30), session('c', 65)];
        const first = awardSessions(emptyLedger(), sessions);
        expect(first.awarded).toBe(3);
        expect(first.sessionsAwarded).toBe(2);
        expect(Object.keys(first.ledger.sessions).sort()).toEqual(['b', 'c']);

        // Same sessions again (re-render, re-sync, duplicated list): nothing new
        const again = awardSessions(first.ledger, [...sessions, session('b', 30)]);
        expect(again.awarded).toBe(0);
        expect(again.ledger).toBe(first.ledger);
        expect(balanceOf(again.ledger)).toBe(3);
    });

    it('does not add up separate short sessions', () => {
        const r = awardSessions(emptyLedger(), [session('a', 20), session('b', 20), session('c', 20)]);
        expect(r.awarded).toBe(0);
    });

    it('stops at the daily cap and keeps awarding on later days', () => {
        const many = Array.from({ length: 6 }, (_, i) => session(`s${i}`, 120, `${DAY}T0${i + 1}:00:00`));
        const r = awardSessions(emptyLedger(), [...many, session('next-day', 60, '2026-10-21T09:00:00')]);
        expect(earnedOn(r.ledger, DAY)).toBe(DAILY_CATFOOD_CAP);
        expect(earnedOn(r.ledger, '2026-10-21')).toBe(2);
        expect(sessionsOn(r.ledger, DAY)).toBe(4);
    });

    it('buckets sessions by local date', () => {
        const r = awardSessions(emptyLedger(), [session('a', 30, `${DAY}T23:30:00`)]);
        expect(r.ledger.sessions.a.date).toBe(localDateStr(`${DAY}T23:30:00`));
    });
});

describe('catfood: starter grant', () => {
    it('grants the starter catfood once', () => {
        const first = grantStarter(emptyLedger());
        expect(first.granted).toBe(true);
        expect(balanceOf(first.ledger)).toBe(STARTER_CATFOOD);

        // Second launch: already in the ledger
        const second = grantStarter(first.ledger);
        expect(second.granted).toBe(false);
        expect(balanceOf(second.ledger)).toBe(STARTER_CATFOOD);
    });

    it('also goes to existing users who already have catfood', () => {
        const earned = awardSessions(emptyLedger(), [session('a', 60)]).ledger;
        expect(balanceOf(grantStarter(earned).ledger)).toBe(2 + STARTER_CATFOOD);
    });

    it('is not doubled when two devices each grant it and then sync', () => {
        const mac = grantStarter(emptyLedger()).ledger;
        const pc = grantStarter(awardSessions(emptyLedger(), [session('pc-1', 30)]).ledger).ledger;
        const merged = mergeLedgers(mac, pc);
        expect(balanceOf(merged)).toBe(STARTER_CATFOOD + 1);
        // A synced ledger that already has it doesn't get it again
        expect(grantStarter(merged).granted).toBe(false);
    });
});

describe('catfood: ledger', () => {
    it('spends only what is available', () => {
        let l = grantStarter(emptyLedger()).ledger;
        for (let i = 0; i < STARTER_CATFOOD; i++) {
            const next = spendCatfood(l, FEED_COST, `feed-${i}`, i);
            expect(next).not.toBeNull();
            l = next!;
        }
        expect(balanceOf(l)).toBe(0);
        expect(spendCatfood(l, FEED_COST, 'feed-x', 99)).toBeNull();
    });

    it('merges devices without double counting, idempotently', () => {
        const a = spendCatfood(awardSessions(emptyLedger(), [session('s1', 60)]).ledger, 1, 'feed-a', 1)!;
        const b = spendCatfood(awardSessions(emptyLedger(), [session('s1', 60), session('s2', 30)]).ledger, 1, 'feed-b', 2)!;
        const merged = mergeLedgers(a, b);
        expect(Object.keys(merged.sessions).sort()).toEqual(['s1', 's2']);
        expect(merged.spends.map((s) => s.id)).toEqual(['feed-a', 'feed-b']);
        expect(balanceOf(merged)).toBe(1);
        expect(mergeLedgers(merged, b)).toEqual(merged);
    });

    it('normalizes junk and old-format data from storage', () => {
        expect(normalizeLedger(undefined)).toEqual(emptyLedger());
        const l = normalizeLedger({
            earned: { 'x|2026-01-01': 50 }, // old format, ignored
            sessions: { ok: { amount: 2, date: DAY }, huge: { amount: 999, date: DAY }, bad: { amount: 1 } },
            grants: { starter: 50 },
            spends: [{ id: 1 }, { id: 'ok', amount: 1, at: 1 }],
        });
        expect(l.sessions).toEqual({ ok: { amount: 2, date: DAY }, huge: { amount: 4, date: DAY } });
        expect(l.grants).toEqual({ starter: STARTER_CATFOOD });
        expect(l.spends).toHaveLength(1);
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
        const pc = recordPet(recordPet(emptyLedger(), 'mac', DAY), 'pc', DAY);
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
