import { describe, it, expect, beforeEach, vi } from 'vitest';
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
import {
    buildMacBatchBlockScript,
    doesProcessMatchBlockedName,
    escapeAppleScriptString,
    getMacProcessCandidates,
    isProtectedBlockApp,
} from '../lib/blockUtils';
import { useStore } from '../renderer/lib/store';
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
        const focus = hydrated.modes.find((m) => m.id === 'focus')!;
        expect(focus.blockedApps).toEqual(['Twitter', 'Reddit']);
        expect(hydrated.modes.some((m) => m.id === 'relax')).toBe(true);
        expect(hydrated.modes.some((m) => m.id === 'deep_work')).toBe(true);
        expect(hydrated.modes.some((m) => m.id === 'study')).toBe(true);
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

describe('Block Engine (src/lib/blockUtils) — Aliases, Safety & Batch AppleScript', () => {
    it('resolves macOS process aliases for Steam, Teams, Epic Games, Discord, and browsers', () => {
        expect(getMacProcessCandidates('Steam')).toEqual(['Steam', 'steam_osx']);
        expect(getMacProcessCandidates('Microsoft Teams')).toContain('MSTeams');
        expect(getMacProcessCandidates('Epic Games Launcher')).toContain('EpicGamesLauncher');
        expect(getMacProcessCandidates('Chrome')).toContain('Google Chrome');
        expect(getMacProcessCandidates('Discord')).toContain('Discord PTB');
        expect(getMacProcessCandidates('Produchive')).toEqual([]);
        expect(isProtectedBlockApp('Finder')).toBe(true);
    });

    it('matches running macOS process names against blocked mode entries case-insensitively and via aliases', () => {
        expect(doesProcessMatchBlockedName('steam_osx', 'Steam')).toBe(true);
        expect(doesProcessMatchBlockedName('MSTeams', 'Microsoft Teams')).toBe(true);
        expect(doesProcessMatchBlockedName('EpicGamesLauncher', 'Epic Games Launcher')).toBe(true);
        expect(doesProcessMatchBlockedName('Google Chrome', 'chrome')).toBe(true);
        expect(doesProcessMatchBlockedName('Discord PTB', 'Discord')).toBe(true);
        expect(doesProcessMatchBlockedName('Spotify', 'spotify')).toBe(true);
        expect(doesProcessMatchBlockedName('Slack', 'Discord')).toBe(false);
    });

    it('escapes quotes, backslashes, and newlines safely for AppleScript', () => {
        expect(escapeAppleScriptString('My "App" \\ test\nline')).toBe('My \\"App\\" \\\\ testline');
    });

    it('builds a single batched AppleScript with try/end try isolation and strips protected apps', () => {
        const hideScript = buildMacBatchBlockScript(['Discord', 'Steam', 'Produchive', 'Finder'], true);
        expect(hideScript).toBeTruthy();
        expect(hideScript).toContain('"Discord"');
        expect(hideScript).toContain('"steam_osx"');
        expect(hideScript).toContain('set visible of process (targetName as text) to false');
        expect(hideScript).toContain('try');
        expect(hideScript).not.toContain('Produchive');
        expect(hideScript).not.toContain('Finder');

        const showScript = buildMacBatchBlockScript(['Discord'], false);
        expect(showScript).toContain('set visible of process (targetName as text) to true');

        expect(buildMacBatchBlockScript(['Produchive', 'Finder'], true)).toBeNull();
    });
});

describe('Store ↔ Electron IPC End-to-End Integration', () => {
    let diskModesState: any = null;
    let currentOsBlocked: Activity[] = [];
    const saveModesStateMock = vi.fn(async (state: any) => {
        diskModesState = JSON.parse(JSON.stringify(state));
        return diskModesState;
    });
    const getModesStateMock = vi.fn(async () => diskModesState);
    const setBlockedActivitiesMock = vi.fn(async (list: Activity[]) => {
        currentOsBlocked = list;
        return currentOsBlocked;
    });

    beforeEach(() => {
        diskModesState = null;
        currentOsBlocked = [];
        saveModesStateMock.mockClear();
        getModesStateMock.mockClear();
        setBlockedActivitiesMock.mockClear();

        (globalThis as any).window = {
            electronAPI: {
                getModesState: getModesStateMock,
                saveModesState: saveModesStateMock,
                setBlockedActivities: setBlockedActivitiesMock,
                getBlockedActivities: vi.fn(async () => currentOsBlocked),
            },
        };

        useStore.setState({
            activities: [
                makeTrackedActivity('Discord', '/Applications/Discord.app'),
                makeTrackedActivity('Spotify', '/Applications/Spotify.app'),
                makeTrackedActivity('VS Code', '/Applications/Visual Studio Code.app'),
            ],
            blockedActivities: [],
            modesState: createDefaultModesState(),
        });
    });

    it('activates Focus Mode -> persists to disk -> blocks distracting apps -> switches to Relax -> unblocks all', async () => {
        const focus = await useStore.getState().activateMode('focus', 50);
        expect(focus?.id).toBe('focus');
        expect(saveModesStateMock).toHaveBeenCalledTimes(1);
        expect(diskModesState.activeModeId).toBe('focus');
        expect(diskModesState.autoRelaxAt).toBeTypeOf('number');

        expect(setBlockedActivitiesMock).toHaveBeenCalledTimes(1);
        expect(currentOsBlocked.length).toBe(focus!.blockedApps.length);
        const discordEntry = currentOsBlocked.find((a) => a.owner.name === 'Discord');
        expect(discordEntry?.owner.path).toBe('/Applications/Discord.app');
        expect(useStore.getState().blockedActivities.length).toBe(focus!.blockedApps.length);

        // Switch to Relax Mode -> passes [] to unblock all apps
        await useStore.getState().activateMode('relax');
        expect(diskModesState.activeModeId).toBe('relax');
        expect(diskModesState.autoRelaxAt).toBeNull();
        expect(setBlockedActivitiesMock).toHaveBeenLastCalledWith([]);
        expect(useStore.getState().blockedActivities).toEqual([]);
        expect(diskModesState.history).toHaveLength(2);
        expect(diskModesState.history[0].endedAt).toBeTypeOf('number');
    });

    it('updates active mode timer on the fly via setActiveModeDuration and persists it', async () => {
        await useStore.getState().activateMode('focus', null);
        expect(useStore.getState().modesState.autoRelaxAt).toBeNull();

        await useStore.getState().setActiveModeDuration(25);
        expect(useStore.getState().modesState.autoRelaxAt).toBeTypeOf('number');
        expect(diskModesState.autoRelaxAt).toBe(useStore.getState().modesState.autoRelaxAt);

        await useStore.getState().setActiveModeDuration(null);
        expect(useStore.getState().modesState.autoRelaxAt).toBeNull();
        expect(diskModesState.autoRelaxAt).toBeNull();
    });

    it('re-syncs OS blocks immediately when editing apps of the currently active mode and when resetting defaults', async () => {
        await useStore.getState().activateMode('focus');
        setBlockedActivitiesMock.mockClear();

        await useStore.getState().updateModeApps('focus', ['Discord', 'Notion', 'Produchive']);
        expect(setBlockedActivitiesMock).toHaveBeenCalledTimes(1);
        expect(useStore.getState().blockedActivities.map((a) => a.owner.name)).toEqual(['Discord', 'Notion']);

        await useStore.getState().resetModeToDefault('focus');
        expect(useStore.getState().blockedActivities.length).toBe(
            getDefaultBlockedAppsForMode('focus')!.length
        );
    });

    it('creates, activates, and deletes a custom mode cleanly (auto-reverting to Relax Mode on delete)', async () => {
        const created = await useStore.getState().addCustomMode({
            name: 'Exam Lock',
            tagline: 'No games or chat',
            blockedApps: ['Steam', 'Discord'],
            icon: 'flame',
        });
        expect(diskModesState.modes.some((m: any) => m.id === created.id)).toBe(true);

        await useStore.getState().activateMode(created.id);
        expect(useStore.getState().modesState.activeModeId).toBe(created.id);
        expect(useStore.getState().blockedActivities.map((a) => a.owner.name)).toEqual(['Steam', 'Discord']);

        // Deleting active custom mode must switch to Relax & unblock everything
        await useStore.getState().deleteCustomMode(created.id);
        expect(useStore.getState().modesState.activeModeId).toBe('relax');
        expect(useStore.getState().blockedActivities).toEqual([]);
        expect(diskModesState.modes.some((m: any) => m.id === created.id)).toBe(false);
    });

    it('hydrates from local disk on startup and clears stale blocks if an auto-relax timer expired while closed', async () => {
        // Simulate Focus Mode saved on disk with an already-expired timer
        const saved = applyModeActivationToState(createDefaultModesState(), 'focus', {
            durationMinutes: 25,
            now: Date.now() - 60 * 60 * 1000, // 1 hour ago -> expired
        }).nextState;
        diskModesState = saved;

        // Pretend stale blockedActivities existed before loadModesState
        useStore.setState({
            blockedActivities: [makeTrackedActivity('Discord')],
            modesState: createDefaultModesState(),
        });

        await useStore.getState().loadModesState();

        expect(useStore.getState().modesState.activeModeId).toBe('relax');
        expect(setBlockedActivitiesMock).toHaveBeenCalledWith([]);
        expect(useStore.getState().blockedActivities).toEqual([]);
        expect(diskModesState.activeModeId).toBe('relax');
    });

    it('hydrates active Deep Work mode from local disk and re-enforces OS blocking on relaunch', async () => {
        const saved = applyModeActivationToState(createDefaultModesState(), 'deep_work', {
            durationMinutes: null,
            now: Date.now() - 5000,
        }).nextState;
        diskModesState = saved;

        await useStore.getState().loadModesState();

        expect(useStore.getState().modesState.activeModeId).toBe('deep_work');
        expect(setBlockedActivitiesMock).toHaveBeenCalledTimes(1);
        expect(useStore.getState().blockedActivities.length).toBe(
            DEFAULT_MODES.find((m) => m.id === 'deep_work')!.blockedApps.length
        );
    });
});
