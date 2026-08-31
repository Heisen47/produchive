import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, Clock, Sparkles, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';
import { PlannedRoutineItem } from './Routine';

const formatDateStr = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const CATEGORY_APP_KEYWORDS: Record<string, string[]> = {
    development: ['code', 'cursor', 'studio', 'xcode', 'intellij', 'terminal', 'iterm', 'warp', 'git', 'github', 'localhost', 'docker', 'postman'],
    meeting: ['slack', 'teams', 'discord', 'zoom', 'meet', 'telegram', 'whatsapp', 'outlook', 'mail'],
    design: ['figma', 'photoshop', 'illustrator', 'canva', 'sketch', 'blender'],
    writing: ['notion', 'obsidian', 'word', 'notes', 'docs.google', 'typora'],
    research: ['chrome', 'safari', 'brave', 'firefox', 'edge', 'arc', 'arxiv', 'stackoverflow', 'wikipedia'],
};

export const ActivityConfirmationPopup: React.FC = () => {
    const { activities, isMonitoring } = useStore();
    const { isDark } = useTheme();

    const [activePrompt, setActivePrompt] = useState<PlannedRoutineItem | null>(null);
    const [promptedIds, setPromptedIds] = useState<Set<string>>(() => {
        try {
            const saved = sessionStorage.getItem('produchive_prompted_routine_ids');
            if (saved) return new Set(JSON.parse(saved));
        } catch (e) {
            console.error(e);
        }
        return new Set();
    });

    const [autoConfirmedNotification, setAutoConfirmedNotification] = useState<string | null>(null);

    const markPrompted = useCallback((id: string) => {
        setPromptedIds((prev) => {
            const next = new Set(prev).add(id);
            try {
                sessionStorage.setItem('produchive_prompted_routine_ids', JSON.stringify(Array.from(next)));
            } catch (e) {
                console.error(e);
            }
            return next;
        });
    }, []);

    // Helper to get routines from localStorage
    const getStoredRoutines = (): PlannedRoutineItem[] => {
        try {
            const saved = localStorage.getItem('produchive_master_routines');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error(e);
        }
        return [];
    };

    const saveStoredRoutines = (items: PlannedRoutineItem[]) => {
        try {
            localStorage.setItem('produchive_master_routines', JSON.stringify(items));
            window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
        } catch (e) {
            console.error(e);
        }
    };

    // Listen for manual trigger from Debug Panel
    useEffect(() => {
        const handleManualTrigger = (e: any) => {
            const task = e.detail?.task;
            if (task) {
                setActivePrompt(task);
            }
        };
        window.addEventListener('produchive_trigger_prompt', handleManualTrigger);
        return () => window.removeEventListener('produchive_trigger_prompt', handleManualTrigger);
    }, []);

    // ─── Periodic Checker for Due Tasks & Smart Auto-Confirmation ───
    useEffect(() => {
        const checkRoutines = () => {
            const now = new Date();
            const todayStr = formatDateStr(now);
            const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

            const routines = getStoredRoutines();
            if (!routines || routines.length === 0) return;

            let routinesModified = false;
            let nextPromptCandidate: PlannedRoutineItem | null = null;

            const updatedRoutines = routines.map((item) => {
                if (item.dateStr !== todayStr) return item;

                const startMinutes = item.startHour * 60 + item.startMinute;
                const endMinutes = startMinutes + item.durationMinutes;

                // Has the scheduled time passed?
                if (currentTotalMinutes >= endMinutes) {
                    if (item.completed || promptedIds.has(item.id)) {
                        return item;
                    }

                    // 1. If activity monitoring is ON, verify machine activity during scheduled slot
                    if (isMonitoring && activities && activities.length > 0) {
                        let matchedSeconds = 0;
                        const taskKeywords = [
                            ...(CATEGORY_APP_KEYWORDS[item.category] || []),
                            ...item.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
                        ];

                        activities.forEach((act) => {
                            if (!act.timestamp) return;
                            const actTime = new Date(act.timestamp);
                            if (formatDateStr(actTime) !== todayStr) return;

                            const actMinutes = actTime.getHours() * 60 + actTime.getMinutes();
                            if (actMinutes >= startMinutes && actMinutes <= endMinutes + 10) {
                                const appName = (act.owner?.name || '').toLowerCase();
                                const title = (act.title || '').toLowerCase();
                                const dur = act.duration ? act.duration / 1000 : 1;

                                const isMatch = taskKeywords.some(
                                    (kw) => appName.includes(kw) || title.includes(kw)
                                );
                                if (isMatch) {
                                    matchedSeconds += dur;
                                }
                            }
                        });

                        const minRequiredSeconds = Math.min(300, (item.durationMinutes * 60) * 0.15);
                        if (matchedSeconds >= minRequiredSeconds) {
                            routinesModified = true;
                            markPrompted(item.id);
                            setAutoConfirmedNotification(`Auto-confirmed "${item.title}" via activity tracking! 🎯`);
                            setTimeout(() => setAutoConfirmedNotification(null), 5000);
                            return { ...item, completed: true };
                        }
                    }

                    // 2. If app cannot confirm, queue for bottom-right prompt
                    if (!nextPromptCandidate && !activePrompt) {
                        nextPromptCandidate = item;
                    }
                }

                return item;
            });

            if (routinesModified) {
                saveStoredRoutines(updatedRoutines);
            }

            if (nextPromptCandidate && !activePrompt) {
                setActivePrompt(nextPromptCandidate);
                markPrompted(nextPromptCandidate.id);
            }
        };

        checkRoutines();
        const timer = setInterval(checkRoutines, 30000);
        return () => clearInterval(timer);
    }, [isMonitoring, activities, promptedIds, activePrompt, markPrompted]);

    // Auto-dismiss popup after 10 seconds and keep in Debug Panel notifications
    useEffect(() => {
        if (!activePrompt) return;
        const timer = setTimeout(() => {
            markPrompted(activePrompt.id);
            setActivePrompt(null);
        }, 10000);
        return () => clearTimeout(timer);
    }, [activePrompt, markPrompted]);

    const handleUserResponse = (completed: boolean) => {
        if (!activePrompt) return;

        if (completed) {
            const routines = getStoredRoutines();
            const updated = routines.map((r) => (r.id === activePrompt.id ? { ...r, completed: true } : r));
            saveStoredRoutines(updated);
        }

        markPrompted(activePrompt.id);
        setActivePrompt(null);
    };

    return (
        <>
            {/* Auto-Confirmed Toast (Bottom-Right) */}
            {autoConfirmedNotification && (
                <div
                    className="fixed bottom-6 right-6 z-50 p-3 px-4 rounded-2xl border shadow-xl flex items-center gap-2.5 animate-fade-in-up opacity-90 hover:opacity-100 transition-opacity"
                    style={{
                        background: isDark ? 'rgba(16, 24, 39, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                        borderColor: '#10b981',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)',
                    }}
                >
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Sparkles size={14} />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-100">{autoConfirmedNotification}</span>
                </div>
            )}

            {/* Bottom-Right Confirmation Popup - Compact & Translucent */}
            {activePrompt && (
                <div
                    className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl p-3.5 shadow-xl border flex flex-col gap-2.5 animate-fade-in-up opacity-90 hover:opacity-100 transition-opacity duration-200"
                    style={{
                        background: isDark ? 'rgba(22, 23, 31, 0.82)' : 'rgba(255, 255, 255, 0.88)',
                        borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.3)',
                        backdropFilter: 'blur(14px)',
                        boxShadow: '0 15px 35px rgba(0,0,0,0.35), 0 0 20px rgba(99, 102, 241, 0.15)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                <Clock size={12} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 truncate">
                                Activity Check
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                markPrompted(activePrompt.id);
                                setActivePrompt(null);
                            }}
                            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                            title="Dismiss (re-open via Debug button)"
                        >
                            <X size={13} />
                        </button>
                    </div>

                    {/* Message */}
                    <div className="space-y-0.5">
                        <p className="text-[11px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                            Did you do <span className="text-[#5b5fc7] dark:text-[#818cf8]">"{activePrompt.title}"</span>?
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                            Scheduled time has passed.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <button
                            onClick={() => handleUserResponse(false)}
                            className="py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all flex items-center justify-center gap-1"
                            style={{
                                background: 'var(--bg-elevated)',
                                borderColor: 'var(--border-card)',
                                color: 'var(--text-secondary)',
                            }}
                        >
                            <XCircle size={11} style={{ color: 'var(--text-muted)' }} /> Not yet
                        </button>

                        <button
                            onClick={() => handleUserResponse(true)}
                            className="py-1.5 px-2 rounded-xl bg-[#5b5fc7] hover:bg-[#4f52b2] text-white text-[11px] font-bold shadow-sm transition-all flex items-center justify-center gap-1 hover:scale-105 active:scale-95"
                        >
                            <CheckCircle2 size={11} /> Yes, I did
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
