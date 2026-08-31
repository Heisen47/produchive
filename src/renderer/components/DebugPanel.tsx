import React, { useState, useEffect } from 'react';
import {
    Bug,
    ChevronDown,
    ChevronUp,
    HardDrive,
    FolderOpen,
    FileText,
    Database,
    Settings,
    Clock,
    CheckCircle2,
    RotateCcw,
    Sparkles,
    BellRing
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useStore } from '../lib/store';
import { PlannedRoutineItem } from './Routine';

const formatDateStr = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const DebugPanel: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [systemInfo, setSystemInfo] = useState<any>(null);
    const [showSystemInfo, setShowSystemInfo] = useState(false);
    const [dbContents, setDbContents] = useState<any>(null);
    const [showDbContents, setShowDbContents] = useState(false);
    const [routines, setRoutines] = useState<PlannedRoutineItem[]>([]);
    const { isDark } = useTheme();

    const loadSystemInfo = async () => {
        try {
            const info = await window.electronAPI.getSystemInfo();
            setSystemInfo(info);
        } catch {}
    };

    const loadDbContents = async () => {
        try {
            const contents = await (window.electronAPI as any).getDbContents();
            setDbContents(contents);
            setShowDbContents(true);
        } catch {}
    };

    const loadRoutines = () => {
        try {
            const saved = localStorage.getItem('produchive_master_routines');
            if (saved) {
                setRoutines(JSON.parse(saved));
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Real-time synchronization when routines change or debug toggle is triggered
    useEffect(() => {
        const handleSync = () => loadRoutines();
        const handleToggleEvent = () => {
            setIsOpen((prev) => {
                const next = !prev;
                if (next) loadRoutines();
                return next;
            });
        };

        window.addEventListener('produchive_routine_updated', handleSync);
        window.addEventListener('storage', handleSync);
        window.addEventListener('produchive_toggle_debug', handleToggleEvent);
        return () => {
            window.removeEventListener('produchive_routine_updated', handleSync);
            window.removeEventListener('storage', handleSync);
            window.removeEventListener('produchive_toggle_debug', handleToggleEvent);
        };
    }, []);

    const now = new Date();
    const todayStr = formatDateStr(now);
    const currentTotalMins = now.getHours() * 60 + now.getMinutes();

    // Show only uncompleted past routine tasks for today
    const unconfirmedPastRoutines = routines.filter((r) => {
        if (r.dateStr !== todayStr) return false;
        if (r.completed) return false; // Hide if already completed/done
        const endMins = r.startHour * 60 + r.startMinute + r.durationMinutes;
        return currentTotalMins >= endMins;
    });

    const handleTriggerPrompt = (task: PlannedRoutineItem) => {
        window.dispatchEvent(new CustomEvent('produchive_trigger_prompt', { detail: { task } }));
    };

    const handleMarkDone = (taskId: string) => {
        const updated = routines.map((r) => (r.id === taskId ? { ...r, completed: true } : r));
        setRoutines(updated);
        try {
            localStorage.setItem('produchive_master_routines', JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
        } catch (e) {
            console.error(e);
        }
    };

    const handleClearDismissedCache = () => {
        sessionStorage.removeItem('produchive_prompted_routine_ids');
        loadRoutines();
    };

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={() => {
                    setIsOpen(true);
                    loadRoutines();
                }}
                className="fixed bottom-16 right-6 z-50 w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] p-0 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg cursor-pointer"
                style={{
                    width: '40px',
                    height: '40px',
                    minWidth: '40px',
                    minHeight: '40px',
                    maxWidth: '40px',
                    maxHeight: '40px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-muted)',
                    boxShadow: 'var(--shadow-card)',
                    backdropFilter: 'blur(20px)',
                }}
                title={unconfirmedPastRoutines.length > 0 ? `${unconfirmedPastRoutines.length} pending activity check(s)` : 'Debug Panel & Activity Checks'}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)';
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-card)';
                }}
            >
                <Bug size={18} />
                {unconfirmedPastRoutines.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5b5fc7] text-[9px] font-bold text-white px-1 shadow-md border-2 border-[var(--bg-card)]">
                        {unconfirmedPastRoutines.length}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div
            className="fixed bottom-16 right-6 w-96 max-h-[75vh] rounded-2xl overflow-hidden flex flex-col z-50 animate-scale-in glass-card-static"
            style={{
                boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.5)' : '0 15px 40px rgba(0,0,0,0.1)',
            }}
        >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                <div className="flex items-center gap-2">
                    <Settings size={16} style={{ color: 'var(--accent)' }} className="animate-spin" />
                    <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Debug & Activity Checks</h3>
                    {unconfirmedPastRoutines.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5b5fc7]/20 text-[#5b5fc7] dark:text-indigo-300 border border-[#5b5fc7]/30">
                            {unconfirmedPastRoutines.length} pending
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <ChevronDown size={16} />
                </button>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar space-y-3">
                {/* 1. Unconfirmed Routine Tasks Section */}
                <div
                    className="rounded-xl p-3 space-y-2.5 border"
                    style={{
                        background: isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.05)',
                        borderColor: 'rgba(99, 102, 241, 0.25)',
                    }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-indigo-400" />
                            <span className="font-bold text-xs text-indigo-300">Unconfirmed Activity Checks</span>
                        </div>
                        <button
                            onClick={handleClearDismissedCache}
                            className="text-[10px] text-indigo-400 hover:text-indigo-200 flex items-center gap-1 transition-colors"
                            title="Reset dismissed prompts in session"
                        >
                            <RotateCcw size={10} /> Reset dismissed
                        </button>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug">
                        Scheduled tasks that finished without automatic machine confirmation:
                    </p>

                    {unconfirmedPastRoutines.length === 0 ? (
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                                ✨ All finished activities are confirmed!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pt-0.5">
                            {unconfirmedPastRoutines.map((task) => (
                                <div
                                    key={task.id}
                                    className="p-2 rounded-lg border flex items-center justify-between gap-2 text-xs"
                                    style={{
                                        background: 'var(--bg-elevated)',
                                        borderColor: 'var(--border-card)',
                                    }}
                                >
                                    <div className="min-w-0 flex-1">
                                        <h5 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                            {task.title}
                                        </h5>
                                        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                                            {task.startHour}:00 ({task.durationMinutes}m) • Not confirmed
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={() => handleTriggerPrompt(task)}
                                            className="px-2.5 py-1 rounded-lg bg-[#5b5fc7]/15 dark:bg-indigo-600/30 hover:bg-[#5b5fc7]/25 dark:hover:bg-indigo-600/60 text-[#5b5fc7] dark:text-indigo-200 text-[10px] font-bold border border-[#5b5fc7]/40 dark:border-indigo-500/40 transition-all flex items-center gap-1 shadow-sm hover:scale-105 active:scale-95"
                                            title="Re-show confirmation popup at bottom-right"
                                        >
                                            <BellRing size={11} /> Ask if done
                                        </button>
                                        <button
                                            onClick={() => handleMarkDone(task.id)}
                                            className="px-2 py-1 rounded-lg bg-emerald-500/15 dark:bg-emerald-500/20 hover:bg-emerald-500/30 dark:hover:bg-emerald-500/40 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold border border-emerald-500/40 transition-all flex items-center gap-1 shadow-sm hover:scale-105 active:scale-95"
                                            title="Mark activity completed"
                                        >
                                            <CheckCircle2 size={11} /> Done
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. System Details Collapsible Toggle */}
                <div className="space-y-2">
                    <button
                        type="button"
                        onClick={() => {
                            if (!systemInfo) loadSystemInfo();
                            setShowSystemInfo((prev) => !prev);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
                        style={{
                            background: 'var(--bg-elevated)',
                            borderColor: 'var(--border-secondary)',
                            color: 'var(--text-primary)',
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <HardDrive size={13} className="text-[#5b5fc7] dark:text-indigo-400" />
                            <span>System Details & Paths</span>
                        </div>
                        {showSystemInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showSystemInfo && systemInfo && (
                        <div
                            className="rounded-xl p-3 text-xs font-mono space-y-1.5 border animate-fade-in"
                            style={{
                                background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.04)',
                                borderColor: 'var(--border-secondary)',
                            }}
                        >
                            {Object.entries(systemInfo).map(([key, value]) => (
                                <div key={key} className="flex justify-between gap-2" style={{ color: 'var(--text-secondary)' }}>
                                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{key}:</span>
                                    <span className="truncate max-w-[200px]">{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'User Data', icon: FolderOpen, onClick: () => (window.electronAPI as any).openUserDataFolder?.() },
                        { label: 'Log File', icon: FileText, onClick: () => (window.electronAPI as any).openLogFile?.() },
                        { label: 'View DB JSON', icon: Database, onClick: loadDbContents },
                        {
                            label: 'Reload Info',
                            icon: HardDrive,
                            onClick: () => {
                                loadSystemInfo();
                                loadRoutines();
                            },
                        },
                    ].map((btn, i) => (
                        <button
                            key={i}
                            onClick={btn.onClick}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 border"
                            style={{
                                background: 'var(--bg-elevated)',
                                borderColor: 'var(--border-secondary)',
                                color: 'var(--text-primary)',
                            }}
                        >
                            <btn.icon size={13} />
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* DB Contents JSON */}
                {showDbContents && dbContents && (
                    <div className="rounded-xl p-3 text-xs font-mono overflow-x-auto custom-scrollbar bg-black/50 border border-slate-700 space-y-2">
                        <div className="flex items-center justify-between text-slate-400">
                            <span>Database Contents</span>
                            <button
                                onClick={() => setShowDbContents(false)}
                                className="text-[10px] text-slate-400 hover:text-white"
                            >
                                Hide
                            </button>
                        </div>
                        <pre className="text-slate-300 text-[11px]">{JSON.stringify(dbContents, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};
