/**
 * Study streak ranks: an ordered ladder of tiers, each split into divisions
 * (I → III, lowest to highest). The top tier has a single division.
 * Pure data + functions so the thresholds can be unit tested.
 */

export type TierId = 'ember' | 'quill' | 'lantern' | 'scholar' | 'prism' | 'sage' | 'oracle' | 'luminary';

export interface StreakTier {
    id: TierId;
    name: string;
    /** First streak day of each division, ascending. divisions[0] is the tier's entry point. */
    divisions: number[];
}

export const STREAK_TIERS: readonly StreakTier[] = [
    { id: 'ember', name: 'Ember', divisions: [1, 3, 5] },
    { id: 'quill', name: 'Quill', divisions: [7, 9, 11] },
    { id: 'lantern', name: 'Lantern', divisions: [14, 19, 24] },
    { id: 'scholar', name: 'Scholar', divisions: [30, 40, 50] },
    { id: 'prism', name: 'Prism', divisions: [60, 73, 86] },
    { id: 'sage', name: 'Sage', divisions: [100, 127, 153] },
    { id: 'oracle', name: 'Oracle', divisions: [180, 242, 303] },
    { id: 'luminary', name: 'Luminary', divisions: [365] },
];

const NUMERALS = ['I', 'II', 'III'];

export interface RankStep {
    /** Position on the whole ladder, 0 = Ember I. Higher is better. */
    ordinal: number;
    tierIndex: number;
    tier: StreakTier;
    /** 1-based division, or null for single-division tiers. */
    division: number | null;
    /** e.g. "Lantern II" or "Luminary". */
    label: string;
    minDays: number;
}

/** Every rank on the ladder, lowest first. */
export const RANK_STEPS: readonly RankStep[] = STREAK_TIERS.flatMap((tier, tierIndex) =>
    tier.divisions.map((minDays, i) => ({ tier, tierIndex, minDays, division: tier.divisions.length > 1 ? i + 1 : null })),
).map((s, ordinal) => ({
    ...s,
    ordinal,
    label: s.division ? `${s.tier.name} ${NUMERALS[s.division - 1]}` : s.tier.name,
}));

export interface StreakRank extends RankStep {
    days: number;
    next: RankStep | null;
    daysToNext: number;
    /** 0..1 progress from this rank's threshold to the next one (1 at the top rank). */
    progress: number;
}

const sanitize = (days: number) => (Number.isFinite(days) && days > 0 ? Math.floor(days) : 0);

export function getStreakRank(rawDays: number): StreakRank {
    const days = sanitize(rawDays);
    let idx = 0;
    for (let i = 0; i < RANK_STEPS.length; i++) {
        if (days >= RANK_STEPS[i].minDays) idx = i;
        else break;
    }
    const step = RANK_STEPS[idx];
    const next = RANK_STEPS[idx + 1] ?? null;
    if (!next) return { ...step, days, next: null, daysToNext: 0, progress: 1 };
    // Before the first threshold (0 days) progress counts from 0.
    const from = Math.min(step.minDays, days);
    const progress = Math.min(1, Math.max(0, (days - from) / (next.minDays - from)));
    return { ...step, days, next, daysToNext: next.minDays - days, progress };
}

/** "3 days to Lantern III" / "Top rank reached". */
export function progressCopy(rank: StreakRank): string {
    if (!rank.next) return 'Top rank reached';
    return `${rank.daysToNext} day${rank.daysToNext === 1 ? '' : 's'} to ${rank.next.label}`;
}

/** Day range shown on the ladder, e.g. "14–29 days" or "365+ days". */
export function tierRangeCopy(tierIndex: number): string {
    const start = STREAK_TIERS[tierIndex].divisions[0];
    const nextTier = STREAK_TIERS[tierIndex + 1];
    return nextTier ? `${start}–${nextTier.divisions[0] - 1} days` : `${start}+ days`;
}

/**
 * Celebrate only a climb past the last rank this device has already shown.
 * First run (nothing stored) never celebrates, so existing streaks don't fire on update.
 */
export function shouldCelebrate(lastSeenOrdinal: number | null, currentOrdinal: number): boolean {
    return lastSeenOrdinal !== null && currentOrdinal > lastSeenOrdinal;
}
