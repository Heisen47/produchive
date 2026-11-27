import { describe, it, expect } from 'vitest';
import {
    DEFAULT_MODES,
    MAX_MODE_HISTORY,
    applyModeActivationToState,
    buildTargetBlockedActivities,
    createCustomModeRecord,
    createDefaultModesState,
    getDefaultBlockedAppsForMode,
    hydrateModesState,
    isProtectedSystemApp,
    sanitizeBlockedAppsList,
} from '../renderer/lib/modes';
import type { Activity } from '../renderer/global';

const makeTrackedActivity = (name: string, path = `/Applications/${name}.app`): Activity => ({
    title: `${name} Window`,
    owner: { name, path },
    timestamp: Date.now(),
    duration: 5000,
});

describe('Modes — Defaults & Safety Guards', () => {
    it('includes Focus, Relax, and suggested productivity modes by default', () => {
        const ids = DEFAULT_MODES.map((m) => m.id);
        expect(ids).toContain('focus');
        expect(ids).toContain('relax');
        expect(ids).toContain('deep_work');
        expect(ids).toContain('study');
        expect(ids).toContain('meeting');
        expect(ids).toContain('creative');

        const relax = DEFAULT_MODES.find((m) => m.id === 'relax')!;
        expect(relax.behavior).toBe('unblock_all');
        expect(relax.blockedApps).toEqual([]);

        const focus = DEFAULT_MODES.find((m) => m.id === 'focus')!;
        expect(focus.behavior).toBe('blocklist');
        expect(focus.blockedApps.length).toBeGreaterThan(0);
    });

    it('protects critical system apps and Produchive itself from being blocked', () => {
        expect(isProtectedSystemApp('Produchive')).toBe(true);
        expect(isProtectedSystemApp('electron')).toBe(true);
        expect(isProtectedSystemApp('Finder')).toBe(true);
        expect(isProtectedSystemApp('explorer.exe')).toBe(true);
        expect(isProtectedSystemApp('System Settings')).toBe(true);
        expect(isProtectedSystemApp('   ')).toBe(true);

        expect(isProtectedSystemApp('Discord')).toBe(false);
        expect(isProtectedSystemApp('Spotify')).toBe(false);
        expect(isProtectedSystemApp('Steam')).toBe(false);
    });

    it('sanitizes blocked app lists by trimming, deduplicating case-insensitively, and stripping protected apps', () => {
        const result = sanitizeBlockedAppsList([
            ' Discord ',
            'discord',
            'Produchive',
            'Finder',
            'Steam',
            '',
            '  ',
            'STEAM',
            'Spotify',
        ]);
        expect(result).toEqual(['Discord', 'Steam', 'Spotify']);
    });
});

describe('Modes — Target Activity Resolution (Focus vs Relax)', () => {
    it('returns an empty list for Relax Mode so all blocked apps are re-enabled', () => {
        const state = createDefaultModesState();
        const relax = state.modes.find((m) => m.id === 'relax')!;
        const tracked = [makeTrackedActivity('Discord'), makeTrackedActivity('Spotify')];

        const targets = buildTargetBlockedActivities(relax, tracked);
        expect(targets).toEqual([]);
    });

    it('builds target activities for Focus Mode and enriches paths from tracked activities', () => {
        const state = createDefaultModesState();
        const focus = state.modes.find((m) => m.id === 'focus')!;
        const tracked = [
            makeTrackedActivity('Discord', 'C:\\Users\\dev\\Discord.exe'),
            makeTrackedActivity('VS Code', '/Applications/Visual Studio Code.app'),
        ];

        const targets = buildTargetBlockedActivities(focus, tracked);
        expect(targets.length).toBe(focus.blockedApps.length);

        const discordTarget = targets.find((t) => t.owner.name.toLowerCase() === 'discord');
        expect(discordTarget).toBeDefined();
        expect(discordTarget?.owner.path).toBe('C:\\Users\\dev\\Discord.exe');

        const steamTarget = targets.find((t) => t.owner.name.toLowerCase() === 'steam');
        expect(steamTarget).toBeDefined();
        expect(steamTarget?.owner.path).toBe('');
    });
});

describe('Modes — Activation, Auto-Relax Timer & Local History', () => {
    it('activates Focus Mode with optional duration timer and records history', () => {
        const initial = createDefaultModesState();
        const t0 = 1_700_000_000_000;

        const { nextState, targetMode } = applyModeActivationToState(initial, 'focus', {
            durationMinutes: 25,
            now: t0,
        });

        expect(targetMode?.id).toBe('focus');
        expect(nextState.activeModeId).toBe('focus');
        expect(nextState.activeModeSince).toBe(t0);
        expect(nextState.autoRelaxAt).toBe(t0 + 25 * 60 * 1000);
        expect(nextState.history).toHaveLength(1);
        expect(nextState.history[0].modeId).toBe('focus');
        expect(nextState.history[0].blockedCount).toBe(targetMode!.blockedApps.length);
        expect(nextState.history[0].endedAt).toBeUndefined();
    });

    it('switches from Focus Mode to Relax Mode, closing previous history entry and clearing timer', () => {
        const initial = createDefaultModesState();
        const t0 = 1_700_000_000_000;
        const t1 = t0 + 15 * 60 * 1000;

        const step1 = applyModeActivationToState(initial, 'focus', { durationMinutes: 50, now: t0 });
        const step2 = applyModeActivationToState(step1.nextState, 'relax', { durationMinutes: 50, now: t1 });

        expect(step2.nextState.activeModeId).toBe('relax');
        expect(step2.nextState.autoRelaxAt).toBeNull();
        expect(step2.nextState.history).toHaveLength(2);
        expect(step2.nextState.history[0].endedAt).toBe(t1);
        expect(step2.nextState.history[1].modeId).toBe('relax');
        expect(step2.nextState.history[1].blockedCount).toBe(0);
    });

    it('caps persisted history at MAX_MODE_HISTORY entries', () => {
        let state = createDefaultModesState();
        for (let i = 0; i < MAX_MODE_HISTORY + 15; i++) {
            const id = i % 2 === 0 ? 'focus' : 'relax';
            state = applyModeActivationToState(state, id, { now: 1_700_000_000_000 + i * 1000 }).nextState;
        }
        expect(state.history).toHaveLength(MAX_MODE_HISTORY);
    });

    it('returns unchanged state for unknown mode id', () => {
        const initial = createDefaultModesState();
        const { nextState, targetMode } = applyModeActivationToState(initial, 'does_not_exist');
        expect(targetMode).toBeNull();
        expect(nextState).toBe(initial);
    });
});

describe('Modes — Local Disk Hydration & Custom Modes', () => {
    it('hydrates saved state while preserving custom edits, custom modes, and newly added built-ins', () => {
        const customMode = createCustomModeRecord({
            name: 'Exam Sprint',
            tagline: 'No distractions before finals',
            blockedApps: ['Discord', 'Finder', 'Steam', 'discord'],
            color: '#ef4444',
            icon: 'flame',
        });

        expect(customMode.isBuiltIn).toBe(false);
        expect(customMode.badge).toBe('custom');
        expect(customMode.blockedApps).toEqual(['Discord', 'Steam']);

        // Simulate older persisted JSON that only had focus (edited) + custom mode
        const persisted = {
            version: 1,
            activeModeId: customMode.id,
            activeModeSince: 1_700_000_000_000,
            autoRelaxAt: null as number | null,
            modes: [
                {
                    ...DEFAULT_MODES[0],
                    blockedApps: ['Twitter', 'Reddit', 'Produchive'],
                },
                customMode,
            ],
            history: [
                {
                    id: 'h1',
                    modeId: customMode.id,
                    modeName: 'Exam Sprint',
                    activatedAt: 1_700_000_000_000,
                    blockedCount: 2,
                },
            ],
        };

        const hydrated = hydrateModesState(persisted);
        expect(hydrated.activeModeId).toBe(customMode.id);
        // Focus kept user edits (minus protected Produchive)
        const focus = hydrated.modes.find((m) => m.id === 'focus')!;
        expect(focus.blockedApps).toEqual(['Twitter', 'Reddit']);
        // Missing built-ins were restored automatically
        expect(hydrated.modes.some((m) => m.id === 'relax')).toBe(true);
        expect(hydrated.modes.some((m) => m.id === 'deep_work')).toBe(true);
        expect(hydrated.modes.some((m) => m.id === 'study')).toBe(true);
        // Custom mode preserved
        expect(hydrated.modes.some((m) => m.id === customMode.id)).toBe(true);
    });

    it('falls back safely to default state when persisted data is null or invalid', () => {
        const hydrated = hydrateModesState(null);
        expect(hydrated.activeModeId).toBe('relax');
        expect(hydrated.modes.length).toBe(DEFAULT_MODES.length);
    });

    it('returns default blocked apps for built-in modes and null for custom modes', () => {
        const focusDefaults = getDefaultBlockedAppsForMode('focus');
        expect(focusDefaults).toBeTruthy();
        expect(focusDefaults).toContain('Discord');
        expect(getDefaultBlockedAppsForMode('custom_xyz')).toBeNull();
    });
});
