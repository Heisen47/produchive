import type { Activity } from '../global';

export type ModeBehavior = 'blocklist' | 'unblock_all';

export type ModeIconKey =
    | 'target'
    | 'coffee'
    | 'flame'
    | 'book'
    | 'video'
    | 'palette'
    | 'shield'
    | 'sparkles';

export interface AppMode {
    id: string;
    name: string;
    tagline: string;
    description: string;
    behavior: ModeBehavior;
    blockedApps: string[];
    color: string;
    icon: ModeIconKey;
    isBuiltIn: boolean;
    badge?: 'core' | 'suggested' | 'custom';
    defaultDurationMinutes?: number | null;
}

export interface ModeHistoryEntry {
    id: string;
    modeId: string;
    modeName: string;
    activatedAt: number;
    endedAt?: number;
    blockedCount: number;
}

export interface ModesPersistedState {
    version: number;
    activeModeId: string;
    activeModeSince: number | null;
    autoRelaxAt: number | null;
    modes: AppMode[];
    history: ModeHistoryEntry[];
}

export interface CreateCustomModeInput {
    name: string;
    tagline?: string;
    description?: string;
    blockedApps: string[];
    color?: string;
    icon?: ModeIconKey;
    defaultDurationMinutes?: number | null;
}

export const MODES_STORAGE_KEY = 'produchive_modes_state_v1';
export const MODES_SCHEMA_VERSION = 1;
export const MAX_MODE_HISTORY = 100;

/**
 * Apps that must never be hidden/blocked to prevent self-lockout or OS disruption.
 */
export const PROTECTED_SYSTEM_APPS = [
    'produchive',
    'electron',
    'finder',
    'explorer',
    'system settings',
    'system preferences',
    'windowserver',
    'loginwindow',
    'dock',
    'task manager',
    'taskmgr',
    'activity monitor',
    'spotlight',
    'control center',
];

export const COMMON_DISTRACTING_APPS: string[] = [
    'Discord',
    'Spotify',
    'Steam',
    'Epic Games Launcher',
    'Telegram',
    'WhatsApp',
    'Messages',
    'Slack',
    'Microsoft Teams',
    'Twitch',
    'Music',
    'TV',
    'Podcasts',
    'Mail',
    'Outlook',
    'Games',
    'Battle.net',
    'Riot Client',
];

export const DEFAULT_MODES: AppMode[] = [
    {
        id: 'focus',
        name: 'Focus Mode',
        tagline: 'Block distracting apps & lock in',
        description: 'Hides social, gaming, entertainment, and casual messaging apps so you can stay focused on high-priority work.',
        behavior: 'blocklist',
        blockedApps: [
            'Discord',
            'Spotify',
            'Steam',
            'Epic Games Launcher',
            'Telegram',
            'WhatsApp',
            'Messages',
            'Twitch',
            'Music',
            'TV',
            'Podcasts',
        ],
        color: '#6366f1',
        icon: 'target',
        isBuiltIn: true,
        badge: 'core',
        defaultDurationMinutes: 50,
    },
    {
        id: 'relax',
        name: 'Relax Mode',
        tagline: 'Re-enable all apps & unwind',
        description: 'Immediately unblocks and restores every hidden app. Zero restrictions for breaks, music, chat, and downtime.',
        behavior: 'unblock_all',
        blockedApps: [],
        color: '#10b981',
        icon: 'coffee',
        isBuiltIn: true,
        badge: 'core',
        defaultDurationMinutes: null,
    },
    {
        id: 'deep_work',
        name: 'Deep Work',
        tagline: 'Strict lockdown — zero pings',
        description: 'Blocks entertainment, games, and all team chat & email apps (Slack, Teams, Mail, Discord) for uninterrupted deep focus.',
        behavior: 'blocklist',
        blockedApps: [
            'Discord',
            'Slack',
            'Microsoft Teams',
            'WhatsApp',
            'Telegram',
            'Messages',
            'Mail',
            'Outlook',
            'Spotify',
            'Steam',
            'Epic Games Launcher',
            'Twitch',
            'Music',
            'TV',
        ],
        color: '#8b5cf6',
        icon: 'flame',
        isBuiltIn: true,
        badge: 'suggested',
        defaultDurationMinutes: 90,
    },
    {
        id: 'study',
        name: 'Study Mode',
        tagline: 'Keep PDFs, notes & IDEs; hide distractions',
        description: 'Keeps study tools, browsers, notes, and PDFs accessible while silencing games, streaming, and social chat apps.',
        behavior: 'blocklist',
        blockedApps: [
            'Discord',
            'Steam',
            'Epic Games Launcher',
            'Twitch',
            'WhatsApp',
            'Telegram',
            'Messages',
            'TV',
            'Music',
            'Battle.net',
            'Riot Client',
        ],
        color: '#06b6d4',
        icon: 'book',
        isBuiltIn: true,
        badge: 'suggested',
        defaultDurationMinutes: 45,
    },
    {
        id: 'meeting',
        name: 'Meeting Mode',
        tagline: 'Keep calls & chat open; hide media & games',
        description: 'Leaves Zoom, Teams, Slack, Calendar, and Notes open while blocking games and media apps during calls.',
        behavior: 'blocklist',
        blockedApps: [
            'Steam',
            'Epic Games Launcher',
            'Spotify',
            'Music',
            'TV',
            'Twitch',
            'Discord',
            'Battle.net',
            'Riot Client',
        ],
        color: '#f59e0b',
        icon: 'video',
        isBuiltIn: true,
        badge: 'suggested',
        defaultDurationMinutes: 30,
    },
    {
        id: 'creative',
        name: 'Creative Flow',
        tagline: 'Keep music & design tools; block chat pings',
        description: 'Allows Spotify/Music and creative apps while blocking messaging, email, and gaming distractions.',
        behavior: 'blocklist',
        blockedApps: [
            'Slack',
            'Microsoft Teams',
            'Discord',
            'WhatsApp',
            'Telegram',
            'Messages',
            'Mail',
            'Outlook',
            'Steam',
            'Epic Games Launcher',
            'Twitch',
        ],
        color: '#ec4899',
        icon: 'palette',
        isBuiltIn: true,
        badge: 'suggested',
        defaultDurationMinutes: 60,
    },
];

export function cloneDefaultModes(): AppMode[] {
    return DEFAULT_MODES.map((m) => ({
        ...m,
        blockedApps: [...m.blockedApps],
    }));
}

export function createDefaultModesState(): ModesPersistedState {
    return {
        version: MODES_SCHEMA_VERSION,
        activeModeId: 'relax',
        activeModeSince: null,
        autoRelaxAt: null,
        modes: cloneDefaultModes(),
        history: [],
    };
}

export function isProtectedSystemApp(appName: string): boolean {
    const normalized = (appName || '').trim().toLowerCase();
    if (!normalized) return true;
    return PROTECTED_SYSTEM_APPS.some(
        (protectedName) =>
            normalized === protectedName ||
            normalized === `${protectedName}.exe` ||
            normalized === `${protectedName}.app`
    );
}

/**
 * Deduplicates (case-insensitively), trims, and strips protected system apps.
 */
export function sanitizeBlockedAppsList(apps: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const raw of apps || []) {
        const trimmed = String(raw || '').trim();
        if (!trimmed) continue;
        if (isProtectedSystemApp(trimmed)) continue;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(trimmed);
    }

    return result;
}

/**
 * Merges a persisted state loaded from disk/localStorage with built-in defaults
 * so newly added built-in modes appear while user customizations are preserved.
 */
export function hydrateModesState(raw: Partial<ModesPersistedState> | null | undefined): ModesPersistedState {
    const fallback = createDefaultModesState();
    if (!raw || typeof raw !== 'object') return fallback;

    const savedModes = Array.isArray(raw.modes) ? raw.modes : [];
    const savedById = new Map<string, AppMode>();

    for (const m of savedModes) {
        if (!m || typeof m.id !== 'string' || typeof m.name !== 'string') continue;
        savedById.set(m.id, {
            ...m,
            behavior: m.behavior === 'unblock_all' ? 'unblock_all' : 'blocklist',
            blockedApps: m.behavior === 'unblock_all' ? [] : sanitizeBlockedAppsList(m.blockedApps || []),
        });
    }

    // Preserve built-in order first, applying any user-edited app lists
    const mergedModes: AppMode[] = DEFAULT_MODES.map((def) => {
        const existing = savedById.get(def.id);
        if (!existing) {
            return { ...def, blockedApps: [...def.blockedApps] };
        }
        return {
            ...def,
            ...existing,
            isBuiltIn: true,
            behavior: def.behavior,
            blockedApps: def.behavior === 'unblock_all' ? [] : sanitizeBlockedAppsList(existing.blockedApps),
        };
    });

    // Append user-created custom modes
    const builtInIds = new Set(DEFAULT_MODES.map((m) => m.id));
    for (const m of savedModes) {
        if (!m || typeof m.id !== 'string' || builtInIds.has(m.id)) continue;
        const sanitized = savedById.get(m.id);
        if (sanitized) {
            mergedModes.push({
                ...sanitized,
                isBuiltIn: false,
                badge: 'custom',
            });
        }
    }

    const activeModeExists = typeof raw.activeModeId === 'string' && mergedModes.some((m) => m.id === raw.activeModeId);
    const activeModeId = activeModeExists ? raw.activeModeId! : 'relax';

    const history: ModeHistoryEntry[] = Array.isArray(raw.history)
        ? raw.history
              .filter((h) => h && typeof h.id === 'string' && typeof h.modeId === 'string')
              .slice(-MAX_MODE_HISTORY)
        : [];

    return {
        version: MODES_SCHEMA_VERSION,
        activeModeId,
        activeModeSince: typeof raw.activeModeSince === 'number' ? raw.activeModeSince : null,
        autoRelaxAt: typeof raw.autoRelaxAt === 'number' ? raw.autoRelaxAt : null,
        modes: mergedModes,
        history,
    };
}

/**
 * Resolves the Activity objects to pass to Electron's main-process blocker for a given mode.
 * Enriches app names with known executable paths from tracked activities when available.
 */
export function buildTargetBlockedActivities(mode: AppMode, trackedActivities: Activity[]): Activity[] {
    if (mode.behavior === 'unblock_all') {
        return [];
    }

    const trackedByLower = new Map<string, Activity>();
    for (const act of trackedActivities || []) {
        const name = act?.owner?.name;
        if (!name) continue;
        const key = name.toLowerCase();
        if (!trackedByLower.has(key) || (act.owner.path && !trackedByLower.get(key)?.owner.path)) {
            trackedByLower.set(key, act);
        }
    }

    const now = Date.now();
    return sanitizeBlockedAppsList(mode.blockedApps).map((appName) => {
        const matched = trackedByLower.get(appName.toLowerCase());
        if (matched) {
            return {
                ...matched,
                owner: {
                    name: matched.owner.name,
                    path: matched.owner.path || '',
                },
            };
        }
        return {
            title: `${mode.name} block`,
            owner: {
                name: appName,
                path: '',
            },
            timestamp: now,
        };
    });
}

/**
 * Transitions ModesPersistedState to a new active mode and records local history.
 */
export function applyModeActivationToState(
    state: ModesPersistedState,
    modeId: string,
    options?: { durationMinutes?: number | null; now?: number }
): { nextState: ModesPersistedState; targetMode: AppMode | null } {
    const targetMode = state.modes.find((m) => m.id === modeId) || null;
    if (!targetMode) {
        return { nextState: state, targetMode: null };
    }

    const now = options?.now ?? Date.now();
    const durationMinutes =
        targetMode.behavior === 'unblock_all'
            ? null
            : options?.durationMinutes !== undefined
            ? options.durationMinutes
            : null;

    const autoRelaxAt =
        durationMinutes && durationMinutes > 0
            ? now + Math.round(durationMinutes * 60 * 1000)
            : null;

    // Close previous open history entry if any
    const updatedHistory = state.history.map((entry, idx) => {
        if (idx === state.history.length - 1 && !entry.endedAt) {
            return { ...entry, endedAt: now };
        }
        return entry;
    });

    const newEntry: ModeHistoryEntry = {
        id: `mode-${now}-${Math.random().toString(36).slice(2, 8)}`,
        modeId: targetMode.id,
        modeName: targetMode.name,
        activatedAt: now,
        blockedCount: targetMode.behavior === 'unblock_all' ? 0 : targetMode.blockedApps.length,
    };

    const nextHistory = [...updatedHistory, newEntry].slice(-MAX_MODE_HISTORY);

    return {
        targetMode,
        nextState: {
            ...state,
            activeModeId: targetMode.id,
            activeModeSince: now,
            autoRelaxAt,
            history: nextHistory,
        },
    };
}

export function createCustomModeRecord(input: CreateCustomModeInput): AppMode {
    const cleanName = input.name.trim().slice(0, 32) || 'Custom Mode';
    const slug = cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    const id = `custom_${slug || 'mode'}_${Date.now().toString(36)}`;

    return {
        id,
        name: cleanName,
        tagline: (input.tagline || 'Custom app blocking preset').trim().slice(0, 80),
        description:
            (input.description || 'User-defined mode stored locally on your device.').trim().slice(0, 200),
        behavior: 'blocklist',
        blockedApps: sanitizeBlockedAppsList(input.blockedApps),
        color: input.color || '#3b82f6',
        icon: input.icon || 'shield',
        isBuiltIn: false,
        badge: 'custom',
        defaultDurationMinutes: input.defaultDurationMinutes ?? null,
    };
}

export function getDefaultBlockedAppsForMode(modeId: string): string[] | null {
    const def = DEFAULT_MODES.find((m) => m.id === modeId);
    return def ? [...def.blockedApps] : null;
}

export function readModesStateFromLocalStorage(): ModesPersistedState {
    try {
        if (typeof localStorage === 'undefined') return createDefaultModesState();
        const raw = localStorage.getItem(MODES_STORAGE_KEY);
        if (!raw) return createDefaultModesState();
        return hydrateModesState(JSON.parse(raw));
    } catch {
        return createDefaultModesState();
    }
}

export function writeModesStateToLocalStorage(state: ModesPersistedState): void {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(MODES_STORAGE_KEY, JSON.stringify(state));
        }
    } catch {
        // Ignore storage quota / SSR errors
    }
}
