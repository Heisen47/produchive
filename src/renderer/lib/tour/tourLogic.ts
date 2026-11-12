/**
 * Pure tour logic: which tour to show on launch, and how to move between steps.
 * No DOM or storage access here, so it can be unit-tested directly.
 */
import type { TourDefinition, TourStep } from './tourManifest';

/** What we remember on this device. Stored in localStorage, never synced. */
export interface TourState {
    /** App version the user last finished or skipped a launch tour on. Missing = never toured. */
    lastSeenTourVersion?: string;
    /** How the last launch tour ended. */
    lastOutcome?: 'finished' | 'skipped';
}

export type LaunchTour =
    | { kind: 'none' }
    | { kind: 'full'; tour: TourDefinition }
    | { kind: 'whatsNew'; tour: TourDefinition; fromVersion: string };

/** Parses "3.2.1", "v3.2", "3.3.0-beta.1" into numeric parts. Non-numeric parts count as 0. */
function parseVersion(v: string): number[] {
    return v
        .trim()
        .replace(/^v/i, '')
        .split(/[-+]/)[0]
        .split('.')
        .map((p) => {
            const n = parseInt(p, 10);
            return Number.isFinite(n) ? n : 0;
        });
}

/** Negative if a < b, 0 if equal, positive if a > b. Missing parts count as 0 ("3.2" == "3.2.0"). */
export function compareVersions(a: string, b: string): number {
    const pa = parseVersion(a);
    const pb = parseVersion(b);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

/** "3.3.2" -> "3.3" for the What's new header. */
export function shortVersion(v: string): string {
    const [major = 0, minor = 0] = parseVersion(v);
    return `${major}.${minor}`;
}

/**
 * Steps introduced after `fromVersion`, up to and including `currentVersion`.
 * Steps tagged for a future version (not released yet) are left out.
 * Order follows the manifest; a step that appears in several tours is listed once.
 */
export function stepsAddedSince(tours: TourDefinition[], fromVersion: string, currentVersion: string): TourStep[] {
    const seen = new Set<string>();
    const seenTargets = new Set<string>();
    const out: TourStep[] = [];
    for (const tour of tours) {
        for (const step of tour.steps) {
            if (seen.has(step.id)) continue;
            if (compareVersions(step.since, fromVersion) <= 0) continue;
            if (compareVersions(step.since, currentVersion) > 0) continue;
            // Centred intro cards only make sense in the full tour.
            if (!step.target) continue;
            // The same element can be explained by the main tour and a page tour: show it once.
            if (seenTargets.has(step.target)) continue;
            seen.add(step.id);
            seenTargets.add(step.target);
            out.push(step);
        }
    }
    return out;
}

/**
 * Decides what to show on launch.
 * - Never toured (fresh install, or first launch of a tour-enabled build): the full tour.
 * - Same version, or a downgrade: nothing.
 * - Upgrade: only the steps added since the last version they saw, as "What's new".
 *   If nothing new was added, nothing is shown.
 */
export function resolveLaunchTour(
    state: TourState | null | undefined,
    currentVersion: string,
    mainTour: TourDefinition,
    allTours: TourDefinition[],
): LaunchTour {
    const last = state?.lastSeenTourVersion;
    if (!last) return { kind: 'full', tour: mainTour };
    if (compareVersions(currentVersion, last) <= 0) return { kind: 'none' };

    const steps = stepsAddedSince(allTours, last, currentVersion);
    if (steps.length === 0) return { kind: 'none' };
    return {
        kind: 'whatsNew',
        fromVersion: last,
        tour: {
            id: `whats-new-${currentVersion}`,
            title: `What's new in v${shortVersion(currentVersion)}`,
            steps,
        },
    };
}

/** State to save once a launch tour is finished or skipped. */
export function markTourSeen(currentVersion: string, outcome: 'finished' | 'skipped'): TourState {
    return { lastSeenTourVersion: currentVersion, lastOutcome: outcome };
}

/**
 * Index of the next step to show when moving `direction` from `from`, skipping steps
 * the caller reports as unavailable. Returns -1 when there is none in that direction.
 */
export function nextAvailableIndex(
    steps: TourStep[],
    from: number,
    direction: 1 | -1,
    isAvailable: (step: TourStep) => boolean,
): number {
    for (let i = from + direction; i >= 0 && i < steps.length; i += direction) {
        if (isAvailable(steps[i])) return i;
    }
    return -1;
}

/** Card position relative to the spotlight, flipping to the opposite side when it doesn't fit. */
export interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export type Placement = 'top' | 'bottom' | 'left' | 'right';

export function placeCard(
    target: Rect,
    card: { width: number; height: number },
    viewport: { width: number; height: number },
    preferred: Placement = 'bottom',
    gap = 16,
    margin = 12,
): { top: number; left: number; placement: Placement } {
    const opposite: Record<Placement, Placement> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
    const fits = (p: Placement) => {
        switch (p) {
            case 'top': return target.top - gap - card.height >= margin;
            case 'bottom': return target.top + target.height + gap + card.height <= viewport.height - margin;
            case 'left': return target.left - gap - card.width >= margin;
            case 'right': return target.left + target.width + gap + card.width <= viewport.width - margin;
        }
    };
    const order: Placement[] = [preferred, opposite[preferred], 'bottom', 'top', 'right', 'left'];
    const placement = order.find(fits) ?? preferred;

    let top: number;
    let left: number;
    if (placement === 'top' || placement === 'bottom') {
        top = placement === 'top' ? target.top - gap - card.height : target.top + target.height + gap;
        left = target.left + target.width / 2 - card.width / 2;
    } else {
        left = placement === 'left' ? target.left - gap - card.width : target.left + target.width + gap;
        top = target.top + target.height / 2 - card.height / 2;
    }
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, Math.max(min, max)));
    return {
        top: clamp(top, margin, viewport.height - card.height - margin),
        left: clamp(left, margin, viewport.width - card.width - margin),
        placement,
    };
}
