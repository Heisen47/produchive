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
    BellRing,
    ExternalLink,
    X,
    Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from './ThemeProvider';
import { PlannedRoutineItem } from '../types/routine';
import { openFeedbackForm } from '../lib/urls';
import { version } from '../../../package.json';

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
    const [activityFeedbacks, setActivityFeedbacks] = useState<any[]>([]);
    const [showFeedbacks, setShowFeedbacks] = useState(false);
    const { isDark } = useTheme();

    const loadSystemInfo = async () => {
        try {
            const info = await window.electronAPI.getSystemInfo();
            setSystemInfo(info);
        } catch {}
    };

    const loadDbContents = async () => {
        try {
            const contents = await (window.electronAPI as any).getDbContents?.();
            setDbContents(contents);
            setShowDbContents(true);
        } catch {}
    };

    const loadActivityFeedbacks = async () => {
        try {
            if (window.electronAPI?.getActivityFeedbacks) {
                const list = await window.electronAPI.getActivityFeedbacks();
                setActivityFeedbacks(list || []);
            }
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
        loadActivityFeedbacks();
    };

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

    const unconfirmedPastRoutines = routines.filter((r) => {
        if (r.dateStr !== todayStr) return false;
        if (r.completed) return false;
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

    const handleClearAll = () => {
        const unconfirmedIds = new Set(unconfirmedPastRoutines.map((r) => r.id));
        const updated = routines.map((r) => (unconfirmedIds.has(r.id) ? { ...r, completed: true } : r));
        setRoutines(updated);
        try {
            localStorage.setItem('produchive_master_routines', JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
            sessionStorage.removeItem('produchive_prompted_routine_ids');
        } catch (e) {
            console.error(e);
        }
        toast.dismiss();
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
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-muted)',
                    boxShadow: 'var(--shadow-card)',
                    backdropFilter: 'blur(20px)',
                }}
                title={unconfirmedPastRoutines.length > 0 ? `${unconfirmedPastRoutines.length} pending notification(s)` : 'Notification Center & Diagnostics'}
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
                    <BellRing size={16} style={{ color: 'var(--accent)' }} />
                    <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Notification Center</h3>
                    {unconfirmedPastRoutines.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5b5fc7]/20 text-[#5b5fc7] dark:text-indigo-300 border border-[#5b5fc7]/30">
                            {unconfirmedPastRoutines.length} pending
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {unconfirmedPastRoutines.length > 0 && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-all flex items-center gap-1 cursor-pointer"
                            title="Clear all pending notifications"
                        >
                            <Trash2 size={10} /> Clear all
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="p-1 rounded-lg transition-colors text-slate-400 hover:text-white"
                        title="Close Notification Center"
                    >
                        <X size={16} />
                    </button>
                </div>
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
                            <span className="font-bold text-xs text-indigo-300">Activity Checks & Alerts</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition-all bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-0.5 rounded-md border border-rose-500/25 cursor-pointer"
                            title="Clear all notifications from the queue"
                        >
                            <Trash2 size={10} /> Clear all
                        </button>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug">
                        Dismissed or finished activity alerts collected here:
                    </p>

                    {unconfirmedPastRoutines.length === 0 ? (
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                                All finished activities are confirmed
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
                                            {task.startHour}:00 ({task.durationMinutes}m) - Not confirmed
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleTriggerPrompt(task)}
                                            className="px-2.5 py-1 rounded-lg bg-[#5b5fc7]/15 dark:bg-indigo-600/30 hover:bg-[#5b5fc7]/25 dark:hover:bg-indigo-600/60 text-[#5b5fc7] dark:text-indigo-200 text-[10px] font-bold border border-[#5b5fc7]/40 dark:border-indigo-500/40 transition-all flex items-center gap-1 shadow-sm hover:scale-105 active:scale-95"
                                            title="Re-show confirmation popup"
                                        >
                                            <BellRing size={11} /> Ask if done
                                        </button>
                                        <button
                                            type="button"
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
                            {Object.entries(systemInfo).map(([key, value]) => {
                                if (key === 'versions' && typeof value === 'object' && value !== null) {
                                    return (
                                        <div key={key} className="space-y-1 pt-1.5 pb-1 border-t border-b border-slate-700/40">
                                            <div className="flex justify-between text-[11px]">
                                                <span className="font-semibold text-slate-300">appVersion:</span>
                                                <span className="text-emerald-400 font-bold">v{version}</span>
                                            </div>
                                            {Object.entries(value as Record<string, any>).map(([vName, vVal]) => (
                                                <div key={vName} className="flex justify-between text-[11px] text-slate-400 pl-2">
                                                    <span>{vName}:</span>
                                                    <span className="text-slate-200">{String(vVal)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }

                                return (
                                    <div key={key} className="flex justify-between gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                                        <span className="font-semibold shrink-0" style={{ color: 'var(--text-primary)' }}>{key}:</span>
                                        <span className="truncate max-w-[210px] text-right" title={String(value)}>{String(value)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 2.5 Activity Detection Ratings (Dev View) */}
                <div className="space-y-2">
                    <button
                        type="button"
                        onClick={() => {
                            loadActivityFeedbacks();
                            setShowFeedbacks((prev) => !prev);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
                        style={{
                            background: 'var(--bg-elevated)',
                            borderColor: 'var(--border-secondary)',
                            color: 'var(--text-primary)',
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles size={13} className="text-emerald-500" />
                            <span>Detection Feedback Ratings ({activityFeedbacks.length})</span>
                        </div>
                        {showFeedbacks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showFeedbacks && (
                        <div
                            className="rounded-xl p-3 text-xs space-y-2 border animate-fade-in"
                            style={{
                                background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.03)',
                                borderColor: 'var(--border-secondary)',
                            }}
                        >
                            <div className="flex items-center justify-between font-bold text-[11px]">
                                <span style={{ color: 'var(--text-primary)' }}>Total Logged: {activityFeedbacks.length}</span>
                                {activityFeedbacks.length > 0 && (
                                    <span className="text-emerald-400">
                                        {Math.round((activityFeedbacks.filter(f => f.userFeedback === 'accurate').length / activityFeedbacks.length) * 100)}% Accurate
                                    </span>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => openFeedbackForm()}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 transition-all"
                            >
                                <ExternalLink size={12} /> Open Feedback Form
                            </button>
                            {activityFeedbacks.length === 0 ? (
                                <p className="text-[11px] text-slate-400">No activity feedback submitted yet.</p>
                            ) : (
                                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                                    {activityFeedbacks.slice().reverse().map((f, i) => (
                                        <div key={i} className="p-2 rounded-lg border text-[11px]" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-slate-200">{f.appName}</span>
                                                <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${f.userFeedback === 'accurate' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                    {f.userFeedback === 'accurate' ? 'Accurate' : 'Inaccurate'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                                Inferred: {f.inferredCategory} {f.correctedCategory ? `-> Corrected: ${f.correctedCategory}` : ''}
                                            </p>
                                            <span className="text-[9px] text-slate-500 font-mono">{f.timestampReadable}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
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
                            type="button"
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
                                type="button"
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
