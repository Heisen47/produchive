import React, { useState, useEffect, useMemo } from 'react';
import {
    Target,
    Coffee,
    Flame,
    BookOpen,
    Video,
    Palette,
    Shield,
    Sparkles,
    Plus,
    X,
    Check,
    RotateCcw,
    Trash2,
    HardDrive,
    Clock,
    Lock,
    Unlock,
    History,
    Timer,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';
import { inferActivityDetails } from '../lib/activityAutoTracker';
import {
    AppMode,
    COMMON_DISTRACTING_APPS,
    ModeIconKey,
    isProtectedSystemApp,
} from '../lib/modes';

const MODE_ICON_MAP: Record<ModeIconKey, React.ComponentType<{ size?: number; className?: string }>> = {
    target: Target,
    coffee: Coffee,
    flame: Flame,
    book: BookOpen,
    video: Video,
    palette: Palette,
    shield: Shield,
    sparkles: Sparkles,
};

const CUSTOM_ICON_OPTIONS: { key: ModeIconKey; label: string }[] = [
    { key: 'shield', label: 'Shield' },
    { key: 'target', label: 'Focus' },
    { key: 'flame', label: 'Deep' },
    { key: 'book', label: 'Study' },
    { key: 'video', label: 'Call' },
    { key: 'palette', label: 'Flow' },
    { key: 'sparkles', label: 'Custom' },
];

const DURATION_PRESETS: { label: string; minutes: number | null }[] = [
    { label: 'Manual', minutes: null },
    { label: '25m', minutes: 25 },
    { label: '50m', minutes: 50 },
    { label: '90m', minutes: 90 },
];

const formatElapsed = (ms: number): string => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
};

const formatCountdown = (ms: number): string => {
    const totalSecs = Math.max(0, Math.ceil(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const ModesPanel = () => {
    const {
        activities,
        blockedActivities,
        modesState,
        activateMode,
        setActiveModeDuration,
        updateModeApps,
        addCustomMode,
        deleteCustomMode,
        resetModeToDefault,
        clearModeHistory,
    } = useStore();
    const { isDark } = useTheme();

    const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
    const [selectedModeId, setSelectedModeId] = useState<string>(() => modesState.activeModeId || 'focus');
    const [newAppInput, setNewAppInput] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customTagline, setCustomTagline] = useState('');
    const [customIcon, setCustomIcon] = useState<ModeIconKey>('shield');
    const [customApps, setCustomApps] = useState<string[]>(['Discord', 'Steam', 'Spotify']);
    const [customAppDraft, setCustomAppDraft] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [nowTick, setNowTick] = useState(() => Date.now());
    const [switchingId, setSwitchingId] = useState<string | null>(null);

    useEffect(() => {
        const interval = setInterval(() => setNowTick(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const activeMode: AppMode = useMemo(() => {
        return (
            modesState.modes.find((m) => m.id === modesState.activeModeId) ||
            modesState.modes[0]
        );
    }, [modesState.modes, modesState.activeModeId]);

    const inspectedMode: AppMode = useMemo(() => {
        return (
            modesState.modes.find((m) => m.id === selectedModeId) ||
            activeMode
        );
    }, [modesState.modes, selectedModeId, activeMode]);

    // Extract unique tracked apps from user's system, tagging distracting ones first
    const detectedSystemApps = useMemo(() => {
        const map = new Map<string, { name: string; isDistracting: boolean; duration: number }>();
        for (const act of activities) {
            const name = act?.owner?.name;
            if (!name || isProtectedSystemApp(name)) continue;
            const inferred = inferActivityDetails(name, act.title || '');
            const isDistracting =
                inferred.category === 'break' ||
                COMMON_DISTRACTING_APPS.some((c) => c.toLowerCase() === name.toLowerCase());
            const existing = map.get(name.toLowerCase());
            const dur = act.duration ? act.duration / 1000 : 1;
            if (!existing) {
                map.set(name.toLowerCase(), { name, isDistracting, duration: dur });
            } else {
                existing.duration += dur;
                if (isDistracting) existing.isDistracting = true;
            }
        }
        return Array.from(map.values()).sort((a, b) => {
            if (a.isDistracting !== b.isDistracting) return a.isDistracting ? -1 : 1;
            return b.duration - a.duration;
        });
    }, [activities]);

    const handleActivateMode = async (mode: AppMode) => {
        setSwitchingId(mode.id);
        try {
            const durationToUse = mode.behavior === 'unblock_all' ? null : selectedDuration;
            await activateMode(mode.id, durationToUse);
            setSelectedModeId(mode.id);
            setIsCreating(false);
            if (mode.behavior !== 'unblock_all') {
                const timerSuffix = durationToUse ? ` · ${durationToUse}m` : '';
                toast.success(
                    `${mode.name} enabled${timerSuffix} — ${mode.blockedApps.length} app${mode.blockedApps.length !== 1 ? 's' : ''} hidden`
                );
            } else {
                toast.success('Relax Mode enabled — all distracting apps restored');
            }
        } catch (err) {
            console.error('[ModesPanel] Failed to activate mode:', err);
            toast.error('Could not switch mode. Please try again.');
        } finally {
            setSwitchingId(null);
        }
    };

    const handleAddApp = async (appNameRaw: string) => {
        if (inspectedMode.behavior === 'unblock_all') return;
        const appName = appNameRaw.trim();
        if (!appName) return;
        if (isProtectedSystemApp(appName)) {
            toast.error(`"${appName}" is a protected system app and cannot be blocked.`);
            return;
        }
        if (inspectedMode.blockedApps.some((a) => a.toLowerCase() === appName.toLowerCase())) {
            toast.info(`"${appName}" is already in ${inspectedMode.name}.`);
            return;
        }
        await updateModeApps(inspectedMode.id, [...inspectedMode.blockedApps, appName]);
        setNewAppInput('');
    };

    const handleRemoveApp = async (appName: string) => {
        if (inspectedMode.behavior === 'unblock_all') return;
        const next = inspectedMode.blockedApps.filter(
            (a) => a.toLowerCase() !== appName.toLowerCase()
        );
        await updateModeApps(inspectedMode.id, next);
    };

    const handleCreateCustomMode = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = customName.trim();
        if (!name) {
            toast.error('Enter a name for your custom mode.');
            return;
        }
        const created = await addCustomMode({
            name,
            tagline: customTagline.trim() || 'Custom distraction preset',
            blockedApps: customApps,
            color: '#3b82f6',
            icon: customIcon,
        });
        setSelectedModeId(created.id);
        setIsCreating(false);
        setCustomName('');
        setCustomTagline('');
        setCustomApps(['Discord', 'Steam', 'Spotify']);
        toast.success(`Saved "${created.name}" locally`);
    };

    const handleOpenLocalFolder = async () => {
        try {
            await window.electronAPI?.openUserDataFolder?.();
        } catch {
            toast.info('Modes data is saved locally in your Produchive user data folder.');
        }
    };

    const isBlockingActive = activeMode.behavior !== 'unblock_all';
    const ActiveIcon = MODE_ICON_MAP[activeMode.icon] || Shield;
    const InspectedIcon = MODE_ICON_MAP[inspectedMode.icon] || Shield;
    const isInspectedActive = inspectedMode.id === activeMode.id;
    const remainingMs =
        modesState.autoRelaxAt && isBlockingActive
            ? Math.max(0, modesState.autoRelaxAt - nowTick)
            : null;
    const elapsedMs = modesState.activeModeSince
        ? Math.max(0, nowTick - modesState.activeModeSince)
        : null;

    const availableCommonSuggestions = useMemo(() => {
        if (inspectedMode.behavior === 'unblock_all') return [];
        const existing = new Set(inspectedMode.blockedApps.map((a) => a.toLowerCase()));
        return COMMON_DISTRACTING_APPS.filter((app) => !existing.has(app.toLowerCase()));
    }, [inspectedMode]);

    return (
        <div className="space-y-5 animate-fade-in-up" data-tour="modes-panel">
            {/* ─── Compact Active Mode Status Bar ─── */}
            <div className="glass-card-static rounded-2xl px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                            background: isBlockingActive
                                ? 'var(--accent-glow)'
                                : 'rgba(34, 197, 94, 0.12)',
                            color: isBlockingActive ? 'var(--accent-light)' : '#4ade80',
                            border: isBlockingActive
                                ? '1px solid rgba(59, 130, 246, 0.25)'
                                : '1px solid rgba(34, 197, 94, 0.22)',
                        }}
                    >
                        <ActiveIcon size={18} />
                    </div>

                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className="font-display font-semibold text-base"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                {activeMode.name}
                            </span>
                            <span
                                className="text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1.5"
                                style={{
                                    background: isBlockingActive
                                        ? 'rgba(59, 130, 246, 0.12)'
                                        : 'rgba(34, 197, 94, 0.1)',
                                    color: isBlockingActive ? '#60a5fa' : '#4ade80',
                                    border: isBlockingActive
                                        ? '1px solid rgba(59, 130, 246, 0.22)'
                                        : '1px solid rgba(34, 197, 94, 0.2)',
                                }}
                            >
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${isBlockingActive ? 'animate-pulse' : ''}`}
                                    style={{ background: isBlockingActive ? '#60a5fa' : '#4ade80' }}
                                />
                                {isBlockingActive
                                    ? `${Math.max(blockedActivities.length, activeMode.blockedApps.length)} blocked`
                                    : 'All apps open'}
                            </span>
                            {remainingMs !== null ? (
                                <span
                                    className="text-xs font-mono flex items-center gap-1"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    <Timer size={12} style={{ color: 'var(--accent-light)' }} />
                                    {formatCountdown(remainingMs)}
                                </span>
                            ) : elapsedMs !== null ? (
                                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                    {formatElapsed(elapsedMs)}
                                </span>
                            ) : null}
                        </div>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {activeMode.tagline}
                        </p>
                    </div>
                </div>

                {/* Right controls: segmented timer + local folder + quick switch */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {/* Segmented auto-relax timer */}
                    <div
                        className="flex items-center p-1 rounded-xl gap-0.5"
                        style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-secondary)',
                        }}
                        title="Optional timer — auto-switches back to Relax Mode when finished"
                    >
                        <Clock size={12} className="mx-1.5" style={{ color: 'var(--text-muted)' }} />
                        {DURATION_PRESETS.map((preset) => {
                            const selected = selectedDuration === preset.minutes;
                            return (
                                <button
                                    key={preset.label}
                                    type="button"
                                    onClick={async () => {
                                        setSelectedDuration(preset.minutes);
                                        if (isBlockingActive) {
                                            await setActiveModeDuration(preset.minutes);
                                            toast.success(
                                                preset.minutes
                                                    ? `Auto-Relax timer set to ${preset.minutes}m`
                                                    : 'Session timer set to manual'
                                            );
                                        }
                                    }}
                                    aria-pressed={selected}
                                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer"
                                    style={{
                                        background: selected ? 'rgba(59, 130, 246, 0.16)' : 'transparent',
                                        color: selected ? 'var(--accent-light)' : 'var(--text-muted)',
                                    }}
                                >
                                    {preset.label}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={handleOpenLocalFolder}
                        className="p-2 rounded-xl transition-colors cursor-pointer"
                        style={{
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-secondary)',
                        }}
                        title="Stored locally on this device — click to open data folder"
                        aria-label="Open local modes storage folder"
                    >
                        <HardDrive size={15} />
                    </button>

                    {isBlockingActive ? (
                        <button
                            type="button"
                            onClick={() => {
                                const relax = modesState.modes.find((m) => m.id === 'relax');
                                if (relax) handleActivateMode(relax);
                            }}
                            disabled={switchingId !== null}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                            style={{
                                background: 'rgba(34, 197, 94, 0.12)',
                                color: '#4ade80',
                                border: '1px solid rgba(34, 197, 94, 0.28)',
                            }}
                        >
                            <Unlock size={13} />
                            <span>Relax Mode</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                const focus = modesState.modes.find((m) => m.id === 'focus');
                                if (focus) handleActivateMode(focus);
                            }}
                            disabled={switchingId !== null}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                            style={{
                                background: 'rgba(59, 130, 246, 0.15)',
                                color: '#60a5fa',
                                border: '1px solid rgba(59, 130, 246, 0.32)',
                            }}
                        >
                            <Lock size={13} />
                            <span>Focus Mode</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ─── Master–Detail Split Workspace ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column: Clean Mode List */}
                <div className="lg:col-span-5 glass-card-static rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between px-1.5 pb-2" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                        <div>
                            <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                Modes
                            </h3>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                Select a preset or switch instantly
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsCreating((prev) => !prev)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                            style={{
                                background: isCreating ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-elevated)',
                                color: isCreating ? 'var(--accent-light)' : 'var(--text-secondary)',
                                border: `1px solid ${isCreating ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-secondary)'}`,
                            }}
                        >
                            {isCreating ? <X size={12} /> : <Plus size={12} />}
                            <span>{isCreating ? 'Cancel' : 'Custom'}</span>
                        </button>
                    </div>

                    <div className="space-y-1.5">
                        {modesState.modes.map((mode) => {
                            const Icon = MODE_ICON_MAP[mode.icon] || Shield;
                            const isActive = mode.id === activeMode.id;
                            const isSelected = !isCreating && mode.id === inspectedMode.id;
                            const isRelax = mode.behavior === 'unblock_all';

                            return (
                                <div
                                    key={mode.id}
                                    onClick={() => {
                                        setIsCreating(false);
                                        setSelectedModeId(mode.id);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setIsCreating(false);
                                            setSelectedModeId(mode.id);
                                        }
                                    }}
                                    className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer"
                                    style={{
                                        background: isSelected
                                            ? isDark
                                                ? 'rgba(59, 130, 246, 0.10)'
                                                : 'rgba(59, 130, 246, 0.08)'
                                            : 'transparent',
                                        border: isSelected
                                            ? '1px solid rgba(59, 130, 246, 0.26)'
                                            : '1px solid transparent',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                                        }
                                    }}
                                >
                                    {/* Subtle left accent bar when selected */}
                                    {isSelected && (
                                        <span
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full"
                                            style={{ background: isActive && isRelax ? '#4ade80' : 'var(--accent)' }}
                                        />
                                    )}

                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                                        style={{
                                            background: isActive
                                                ? isRelax
                                                    ? 'rgba(34, 197, 94, 0.14)'
                                                    : 'rgba(59, 130, 246, 0.16)'
                                                : 'var(--bg-elevated)',
                                            color: isActive
                                                ? isRelax
                                                    ? '#4ade80'
                                                    : '#60a5fa'
                                                : 'var(--text-secondary)',
                                        }}
                                    >
                                        <Icon size={15} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className="text-sm font-medium truncate"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                {mode.name}
                                            </span>
                                            {mode.badge === 'custom' && (
                                                <span
                                                    className="text-[10px] px-1.5 py-0.2 rounded-md font-medium"
                                                    style={{
                                                        background: 'var(--bg-elevated)',
                                                        color: 'var(--text-muted)',
                                                    }}
                                                >
                                                    Custom
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                                            {isRelax
                                                ? 'All distracting apps enabled'
                                                : `${mode.blockedApps.length} app${mode.blockedApps.length !== 1 ? 's' : ''} blocked`}
                                        </p>
                                    </div>

                                    {/* Inline 1-click activate / active pill */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!isActive) handleActivateMode(mode);
                                        }}
                                        disabled={isActive || switchingId !== null}
                                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-all cursor-pointer disabled:cursor-default flex items-center gap-1"
                                        style={
                                            isActive
                                                ? {
                                                      background: isRelax
                                                          ? 'rgba(34, 197, 94, 0.12)'
                                                          : 'rgba(59, 130, 246, 0.15)',
                                                      color: isRelax ? '#4ade80' : '#60a5fa',
                                                      border: isRelax
                                                          ? '1px solid rgba(34, 197, 94, 0.25)'
                                                          : '1px solid rgba(59, 130, 246, 0.28)',
                                                  }
                                                : {
                                                      background: 'var(--bg-elevated)',
                                                      color: 'var(--text-secondary)',
                                                      border: '1px solid var(--border-secondary)',
                                                  }
                                        }
                                    >
                                        {isActive ? (
                                            <>
                                                <Check size={11} />
                                                <span>On</span>
                                            </>
                                        ) : switchingId === mode.id ? (
                                            <span>...</span>
                                        ) : (
                                            <span>Use</span>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Subtle history toggle footer */}
                    {modesState.history.length > 0 && (
                        <div className="pt-2 mt-1 flex items-center justify-between px-1.5" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                            <button
                                type="button"
                                onClick={() => setShowHistory((prev) => !prev)}
                                className="text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                <History size={12} />
                                <span>{showHistory ? 'Hide recent switches' : `Recent switches (${modesState.history.length})`}</span>
                            </button>
                            {showHistory && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await clearModeHistory();
                                        setShowHistory(false);
                                        toast.success('Cleared mode history');
                                    }}
                                    className="text-[11px] cursor-pointer hover:text-red-400 transition-colors"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    )}

                    {showHistory && modesState.history.length > 0 && (
                        <div className="space-y-1 pt-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                            {[...modesState.history].reverse().slice(0, 8).map((entry) => (
                                <div
                                    key={entry.id}
                                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px]"
                                    style={{ background: 'var(--bg-elevated)' }}
                                >
                                    <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                        {entry.modeName}
                                    </span>
                                    <span className="font-mono shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>
                                        {new Date(entry.activatedAt).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Inspector / App List OR Custom Mode Creator */}
                <div className="lg:col-span-7 glass-card-static rounded-2xl p-6 space-y-5">
                    {isCreating ? (
                        <form onSubmit={handleCreateCustomMode} className="space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                                <div>
                                    <h3 className="font-display font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                                        New Custom Mode
                                    </h3>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                        Saved locally on this computer
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="p-1.5 rounded-lg cursor-pointer"
                                    style={{ color: 'var(--text-muted)' }}
                                    aria-label="Close custom mode form"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        value={customName}
                                        onChange={(e) => setCustomName(e.target.value)}
                                        placeholder="e.g. Exam Prep, Late Sprint"
                                        maxLength={32}
                                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                                        style={{
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-input)',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                        Short Note
                                    </label>
                                    <input
                                        type="text"
                                        value={customTagline}
                                        onChange={(e) => setCustomTagline(e.target.value)}
                                        placeholder="e.g. Block games & chat while coding"
                                        maxLength={80}
                                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                                        style={{
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-input)',
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                    Icon
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {CUSTOM_ICON_OPTIONS.map((opt) => {
                                        const IconComp = MODE_ICON_MAP[opt.key];
                                        const picked = customIcon === opt.key;
                                        return (
                                            <button
                                                key={opt.key}
                                                type="button"
                                                onClick={() => setCustomIcon(opt.key)}
                                                className="px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all"
                                                style={{
                                                    background: picked ? 'rgba(59, 130, 246, 0.14)' : 'var(--bg-elevated)',
                                                    color: picked ? '#60a5fa' : 'var(--text-secondary)',
                                                    border: `1px solid ${picked ? 'rgba(59, 130, 246, 0.35)' : 'var(--border-secondary)'}`,
                                                }}
                                            >
                                                <IconComp size={13} />
                                                <span>{opt.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                    Apps to Block ({customApps.length})
                                </label>
                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                    {customApps.map((app) => (
                                        <span
                                            key={app}
                                            className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                                            style={{
                                                background: 'var(--bg-elevated)',
                                                color: 'var(--text-primary)',
                                                border: '1px solid var(--border-secondary)',
                                            }}
                                        >
                                            {app}
                                            <button
                                                type="button"
                                                onClick={() => setCustomApps((prev) => prev.filter((a) => a !== app))}
                                                className="opacity-60 hover:opacity-100 cursor-pointer"
                                                aria-label={`Remove ${app}`}
                                            >
                                                <X size={11} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={customAppDraft}
                                        onChange={(e) => setCustomAppDraft(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = customAppDraft.trim();
                                                if (val && !isProtectedSystemApp(val) && !customApps.some((a) => a.toLowerCase() === val.toLowerCase())) {
                                                    setCustomApps((prev) => [...prev, val]);
                                                    setCustomAppDraft('');
                                                }
                                            }
                                        }}
                                        placeholder="Add app name (e.g. Discord, Spotify, Slack)"
                                        className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                                        style={{
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-input)',
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const val = customAppDraft.trim();
                                            if (!val) return;
                                            if (isProtectedSystemApp(val)) {
                                                toast.error(`"${val}" is a protected system app.`);
                                                return;
                                            }
                                            if (!customApps.some((a) => a.toLowerCase() === val.toLowerCase())) {
                                                setCustomApps((prev) => [...prev, val]);
                                                setCustomAppDraft('');
                                            }
                                        }}
                                        className="px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer"
                                        style={{
                                            background: 'var(--bg-elevated)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-primary)',
                                        }}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer"
                                    style={{
                                        background: 'var(--bg-elevated)',
                                        color: 'var(--text-secondary)',
                                        border: '1px solid var(--border-secondary)',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                                    style={{
                                        background: 'rgba(59, 130, 246, 0.18)',
                                        color: '#60a5fa',
                                        border: '1px solid rgba(59, 130, 246, 0.35)',
                                    }}
                                >
                                    Save Mode
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            {/* Inspected Mode Header */}
                            <div
                                className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4"
                                style={{ borderBottom: '1px solid var(--border-secondary)' }}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                                        style={{
                                            background:
                                                inspectedMode.behavior === 'unblock_all'
                                                    ? 'rgba(34, 197, 94, 0.12)'
                                                    : 'var(--accent-glow)',
                                            color:
                                                inspectedMode.behavior === 'unblock_all'
                                                    ? '#4ade80'
                                                    : 'var(--accent-light)',
                                        }}
                                    >
                                        <InspectedIcon size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-display font-bold text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>
                                            {inspectedMode.name}
                                        </h3>
                                        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                            {inspectedMode.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {inspectedMode.behavior !== 'unblock_all' && (
                                        inspectedMode.isBuiltIn ? (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    await resetModeToDefault(inspectedMode.id);
                                                    toast.success(`Reset ${inspectedMode.name} to defaults`);
                                                }}
                                                className="p-2 rounded-xl transition-colors cursor-pointer"
                                                style={{
                                                    background: 'var(--bg-elevated)',
                                                    color: 'var(--text-muted)',
                                                    border: '1px solid var(--border-secondary)',
                                                }}
                                                title="Reset app list to defaults"
                                                aria-label="Reset app list to defaults"
                                            >
                                                <RotateCcw size={14} />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const name = inspectedMode.name;
                                                    await deleteCustomMode(inspectedMode.id);
                                                    setSelectedModeId('focus');
                                                    toast.success(`Deleted "${name}"`);
                                                }}
                                                className="p-2 rounded-xl transition-colors cursor-pointer"
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    color: '#f87171',
                                                    border: '1px solid rgba(239, 68, 68, 0.22)',
                                                }}
                                                title="Delete custom mode"
                                                aria-label="Delete custom mode"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => handleActivateMode(inspectedMode)}
                                        disabled={isInspectedActive || switchingId !== null}
                                        className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-default"
                                        style={
                                            isInspectedActive
                                                ? {
                                                      background:
                                                          inspectedMode.behavior === 'unblock_all'
                                                              ? 'rgba(34, 197, 94, 0.12)'
                                                              : 'rgba(59, 130, 246, 0.14)',
                                                      color:
                                                          inspectedMode.behavior === 'unblock_all'
                                                              ? '#4ade80'
                                                              : '#60a5fa',
                                                      border:
                                                          inspectedMode.behavior === 'unblock_all'
                                                              ? '1px solid rgba(34, 197, 94, 0.25)'
                                                              : '1px solid rgba(59, 130, 246, 0.28)',
                                                  }
                                                : {
                                                      background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                                                      color: '#fff',
                                                      boxShadow: '0 4px 14px var(--accent-glow)',
                                                  }
                                        }
                                    >
                                        {isInspectedActive ? (
                                            <>
                                                <Check size={13} />
                                                <span>Active</span>
                                            </>
                                        ) : (
                                            <span>Activate</span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {inspectedMode.behavior === 'unblock_all' ? (
                                /* Relax Mode calm detail view */
                                <div className="py-6 text-center space-y-3">
                                    <div
                                        className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
                                        style={{
                                            background: 'rgba(34, 197, 94, 0.1)',
                                            color: '#4ade80',
                                            border: '1px solid rgba(34, 197, 94, 0.2)',
                                        }}
                                    >
                                        <Coffee size={22} />
                                    </div>
                                    <div className="max-w-sm mx-auto space-y-1">
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                            Zero app restrictions
                                        </p>
                                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                            Switching to Relax Mode immediately restores every app hidden by Focus, Deep Work, Study, or custom modes.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                /* Blocking Mode app manager */
                                <div className="space-y-5">
                                    {/* Add app input */}
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleAddApp(newAppInput);
                                        }}
                                        className="flex gap-2"
                                    >
                                        <input
                                            type="text"
                                            value={newAppInput}
                                            onChange={(e) => setNewAppInput(e.target.value)}
                                            placeholder={`Add app to block in ${inspectedMode.name}...`}
                                            className="flex-1 px-3.5 py-2 rounded-xl text-sm outline-none transition-colors"
                                            style={{
                                                background: 'var(--bg-input)',
                                                color: 'var(--text-primary)',
                                                border: '1px solid var(--border-input)',
                                            }}
                                        />
                                        <button
                                            type="submit"
                                            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                                            style={{
                                                background: 'rgba(59, 130, 246, 0.14)',
                                                color: '#60a5fa',
                                                border: '1px solid rgba(59, 130, 246, 0.28)',
                                            }}
                                        >
                                            <Plus size={14} />
                                            <span>Add</span>
                                        </button>
                                    </form>

                                    {/* Current blocked apps */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2.5">
                                            <span
                                                className="text-[11px] font-semibold uppercase tracking-wider"
                                                style={{ color: 'var(--text-muted)' }}
                                            >
                                                Blocked Apps ({inspectedMode.blockedApps.length})
                                            </span>
                                            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                                Click × to allow
                                            </span>
                                        </div>

                                        {inspectedMode.blockedApps.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {inspectedMode.blockedApps.map((app) => (
                                                    <span
                                                        key={app}
                                                        className="px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                                                        style={{
                                                            background: 'var(--bg-elevated)',
                                                            color: 'var(--text-primary)',
                                                            border: '1px solid var(--border-primary)',
                                                        }}
                                                    >
                                                        <Lock size={11} style={{ color: '#f87171', opacity: 0.85 }} />
                                                        <span>{app}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveApp(app)}
                                                            className="ml-0.5 opacity-50 hover:opacity-100 hover:text-red-400 transition-opacity cursor-pointer"
                                                            aria-label={`Remove ${app} from ${inspectedMode.name}`}
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                                                No apps added yet. Pick from detected or common apps below.
                                            </p>
                                        )}
                                    </div>

                                    {/* Detected on your system */}
                                    {detectedSystemApps.length > 0 && (
                                        <div className="pt-3" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                                            <span
                                                className="block text-[11px] font-semibold uppercase tracking-wider mb-2"
                                                style={{ color: 'var(--text-muted)' }}
                                            >
                                                Detected on Your System
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {detectedSystemApps.slice(0, 12).map((app) => {
                                                    const added = inspectedMode.blockedApps.some(
                                                        (b) => b.toLowerCase() === app.name.toLowerCase()
                                                    );
                                                    return (
                                                        <button
                                                            key={app.name}
                                                            type="button"
                                                            onClick={() =>
                                                                added ? handleRemoveApp(app.name) : handleAddApp(app.name)
                                                            }
                                                            className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                                                            style={{
                                                                background: added
                                                                    ? 'rgba(239, 68, 68, 0.10)'
                                                                    : 'transparent',
                                                                color: added ? '#f87171' : 'var(--text-secondary)',
                                                                border: `1px solid ${
                                                                    added
                                                                        ? 'rgba(239, 68, 68, 0.25)'
                                                                        : 'var(--border-secondary)'
                                                                }`,
                                                            }}
                                                        >
                                                            {added ? <Check size={11} /> : <Plus size={11} />}
                                                            <span>{app.name}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Quick-add common distractions */}
                                    {availableCommonSuggestions.length > 0 && (
                                        <div className="pt-3" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                                            <span
                                                className="block text-[11px] font-semibold uppercase tracking-wider mb-2"
                                                style={{ color: 'var(--text-muted)' }}
                                            >
                                                Quick Add
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {availableCommonSuggestions.map((app) => (
                                                    <button
                                                        key={app}
                                                        type="button"
                                                        onClick={() => handleAddApp(app)}
                                                        className="px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer hover:text-blue-400"
                                                        style={{
                                                            background: 'transparent',
                                                            color: 'var(--text-muted)',
                                                            border: '1px solid var(--border-secondary)',
                                                        }}
                                                    >
                                                        <Plus size={11} />
                                                        <span>{app}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
