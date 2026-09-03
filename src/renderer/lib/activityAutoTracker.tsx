import React from 'react';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { PlannedRoutineItem } from '../components/Routine';
import { openFeedbackForm } from './urls';

export interface InferredActivity {
    category: PlannedRoutineItem['category'];
    title: string;
    subtitle: string;
    confidence: number;
}

export interface ActiveSession {
    id: string;
    appName: string;
    windowTitle: string;
    category: PlannedRoutineItem['category'];
    title: string;
    subtitle: string;
    confidence: number;
    startTime: number;
    lastActiveTime: number;
    totalSeconds: number;
    routineId: string;
    dateStr: string;
}

export const formatDateStr = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Strips noisy app prefixes or suffixes from window titles
 */
export const cleanWindowTitle = (title: string, appName: string): string => {
    if (!title) return appName;
    let clean = title.trim();

    // Remove trailing "- AppName" or "— AppName"
    const regex = new RegExp(`\\s*[-—|]\\s*${appName}.*$`, 'i');
    clean = clean.replace(regex, '').trim();

    // Limit length
    if (clean.length > 45) {
        clean = clean.substring(0, 42) + '...';
    }
    return clean || appName;
};

/**
 * Intelligent categorization and title inference from active app & window title
 */
export const inferActivityDetails = (appName: string, rawTitle: string): InferredActivity => {
    const name = (appName || '').toLowerCase();
    const title = (rawTitle || '').toLowerCase();
    const cleaned = cleanWindowTitle(rawTitle, appName);

    // 1. Development & Engineering
    if (
        name.includes('code') ||
        name.includes('cursor') ||
        name.includes('xcode') ||
        name.includes('intellij') ||
        name.includes('webstorm') ||
        name.includes('pycharm') ||
        name.includes('studio') ||
        name.includes('terminal') ||
        name.includes('iterm') ||
        name.includes('warp') ||
        name.includes('docker') ||
        name.includes('postman') ||
        title.includes('.ts') ||
        title.includes('.tsx') ||
        title.includes('.js') ||
        title.includes('.py') ||
        title.includes('.go') ||
        title.includes('.rs') ||
        title.includes('.cpp') ||
        title.includes('.java') ||
        title.includes('github') ||
        title.includes('localhost')
    ) {
        return {
            category: 'development',
            title: cleaned && cleaned !== appName ? `Dev • ${cleaned}` : `Software Engineering (${appName})`,
            subtitle: `Active window in ${appName}`,
            confidence: 94,
        };
    }

    // 2. UI / UX Design & Creative
    if (
        name.includes('figma') ||
        name.includes('photoshop') ||
        name.includes('illustrator') ||
        name.includes('canva') ||
        name.includes('sketch') ||
        name.includes('blender') ||
        name.includes('after effects') ||
        name.includes('premiere')
    ) {
        return {
            category: 'design',
            title: cleaned && cleaned !== appName ? `Design • ${cleaned}` : `UI / UX Design (${appName})`,
            subtitle: `Creative design work in ${appName}`,
            confidence: 92,
        };
    }

    // 3. Team Communication & Meetings
    if (
        name.includes('slack') ||
        name.includes('teams') ||
        name.includes('discord') ||
        name.includes('zoom') ||
        name.includes('meet') ||
        name.includes('webex') ||
        name.includes('telegram') ||
        name.includes('whatsapp') ||
        name.includes('outlook') ||
        name.includes('mail')
    ) {
        return {
            category: 'meeting',
            title: name.includes('zoom') || name.includes('meet') || name.includes('webex')
                ? `Meeting • ${appName}`
                : `Team Collaboration • ${appName}`,
            subtitle: cleaned ? `${appName}: ${cleaned}` : `Communication in ${appName}`,
            confidence: 88,
        };
    }

    // 4. Documentation & Writing
    if (
        name.includes('notion') ||
        name.includes('obsidian') ||
        name.includes('word') ||
        name.includes('notes') ||
        name.includes('typora') ||
        title.includes('docs.google') ||
        title.includes('notion.so')
    ) {
        return {
            category: 'writing',
            title: cleaned && cleaned !== appName ? `Doc • ${cleaned}` : `Documentation (${appName})`,
            subtitle: `Writing notes & documentation in ${appName}`,
            confidence: 90,
        };
    }

    // 5. Web Browsers (Research vs Break)
    if (
        name.includes('chrome') ||
        name.includes('safari') ||
        name.includes('brave') ||
        name.includes('firefox') ||
        name.includes('edge') ||
        name.includes('arc')
    ) {
        if (
            title.includes('youtube') ||
            title.includes('netflix') ||
            title.includes('reddit') ||
            title.includes('twitter') ||
            title.includes('x.com') ||
            title.includes('twitch') ||
            title.includes('tiktok') ||
            title.includes('instagram')
        ) {
            return {
                category: 'break',
                title: `Media Break • ${cleaned}`,
                subtitle: `Entertainment / browsing in ${appName}`,
                confidence: 86,
            };
        } else if (title.includes('leetcode')) {
            return {
                category: 'development',
                title: 'Algorithm Practice • LeetCode',
                subtitle: `Coding challenges in ${appName}`,
                confidence: 95,
            };
        } else {
            return {
                category: 'research',
                title: cleaned && cleaned !== appName ? `Research • ${cleaned}` : `Technical Research (${appName})`,
                subtitle: `Web research in ${appName}`,
                confidence: 85,
            };
        }
    }

    // Fallback
    return {
        category: 'other',
        title: cleaned ? `${appName} • ${cleaned}` : `${appName} Usage`,
        subtitle: `Tracked usage of ${appName}`,
        confidence: 75,
    };
};

/**
 * Helper to get current routines from localStorage
 */
export const getStoredMasterRoutines = (): PlannedRoutineItem[] => {
    try {
        const saved = localStorage.getItem('produchive_master_routines');
        if (saved) return JSON.parse(saved);
    } catch (e) {
        console.error('Failed to read produchive_master_routines:', e);
    }
    return [];
};

/**
 * Helper to save master routines and dispatch change event
 */
export const saveStoredMasterRoutines = (items: PlannedRoutineItem[]) => {
    try {
        localStorage.setItem('produchive_master_routines', JSON.stringify(items));
        window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
    } catch (e) {
        console.error('Failed to save produchive_master_routines:', e);
    }
};

/**
 * Creates or updates an automatic calendar event from an active session
 */
export const upsertAutoDetectedCalendarEvent = (session: ActiveSession): PlannedRoutineItem | null => {
    if (!session || session.totalSeconds < 30) {
        // Less than 30 seconds -> do not clutter calendar yet
        return null;
    }

    const routines = getStoredMasterRoutines();
    const existingIndex = routines.findIndex((r) => r.id === session.routineId);

    const startDate = new Date(session.startTime);
    const startHour = startDate.getHours();
    const rawMinutes = startDate.getMinutes();
    // Snap startMinute to nearest 15-minute mark (0, 15, 30, 45)
    const startMinute = (Math.floor(rawMinutes / 15) * 15) as 0 | 15 | 30 | 45;

    // Minimum display duration is 15 minutes for calendar visual block,
    // otherwise round up to nearest 5 minutes
    const calculatedDuration = Math.max(15, Math.ceil(session.totalSeconds / 60 / 5) * 5);

    const updatedEvent: PlannedRoutineItem = {
        id: session.routineId,
        title: session.title,
        category: session.category,
        priority: 'medium',
        dayIndex: startDate.getDay(),
        dateStr: session.dateStr,
        startHour,
        startMinute,
        durationMinutes: calculatedDuration,
        completed: true,
        subtitle: session.subtitle,
        isAutoDetected: true,
        detectedApp: session.appName,
        detectedTitle: session.windowTitle,
        detectionConfidence: session.confidence,
        actualDurationSeconds: Math.round(session.totalSeconds),
        detectionFeedback: existingIndex >= 0 ? routines[existingIndex].detectionFeedback : null,
        detectionFeedbackComment: existingIndex >= 0 ? routines[existingIndex].detectionFeedbackComment : undefined,
        feedbackAt: existingIndex >= 0 ? routines[existingIndex].feedbackAt : undefined,
    };

    let newRoutines: PlannedRoutineItem[];
    if (existingIndex >= 0) {
        // Update in-place
        newRoutines = routines.map((r, idx) => (idx === existingIndex ? { ...r, ...updatedEvent } : r));
    } else {
        // Add new
        newRoutines = [...routines, updatedEvent];
        // Show sonner toast styled for Produchive
        showAutoActivityToast(updatedEvent);
        // Dispatch event for any other listeners
        window.dispatchEvent(
            new CustomEvent('produchive_auto_event_created', {
                detail: { routine: updatedEvent },
            })
        );
    }

    saveStoredMasterRoutines(newRoutines);
    return updatedEvent;
};

/**
 * Submits user accuracy feedback for an auto-detected calendar event.
 * Saves locally in routine item and pushes to LowDB via IPC so developer can inspect all ratings!
 */
export const submitActivityFeedback = async (
    routineId: string,
    rating: 'accurate' | 'inaccurate',
    corrections?: { category?: PlannedRoutineItem['category']; title?: string; comment?: string }
): Promise<boolean> => {
    try {
        const routines = getStoredMasterRoutines();
        const target = routines.find((r) => r.id === routineId);
        if (!target) return false;

        const updatedTarget: PlannedRoutineItem = {
            ...target,
            detectionFeedback: rating,
            feedbackAt: Date.now(),
            ...(corrections?.category ? { category: corrections.category } : {}),
            ...(corrections?.title ? { title: corrections.title } : {}),
            ...(corrections?.comment ? { detectionFeedbackComment: corrections.comment } : {}),
        };

        const updatedRoutines = routines.map((r) => (r.id === routineId ? updatedTarget : r));
        saveStoredMasterRoutines(updatedRoutines);

        // Notify developer database via Electron IPC
        if (window.electronAPI?.saveActivityFeedback) {
            await window.electronAPI.saveActivityFeedback({
                eventId: target.id,
                appName: target.detectedApp || 'Unknown',
                windowTitle: target.detectedTitle || '',
                inferredCategory: target.category,
                userFeedback: rating,
                correctedCategory: corrections?.category || null,
                correctedTitle: corrections?.title || null,
                durationMinutes: target.durationMinutes,
                confidence: target.detectionConfidence || 0,
            });
        }

        // Open Google feedback form in browser on feedback
        try {
            openFeedbackForm();
        } catch (_) {}

        return true;
    } catch (e) {
        console.error('Failed to submit activity feedback:', e);
        return false;
    }
};

/**
 * Displays an interactive Sonner toast asking user if detection was accurate,
 * styled to match Produchive aesthetics.
 */
export const showAutoActivityToast = (routine: PlannedRoutineItem) => {
    try {
        toast.custom(
            (t) => (
                <div
                    className="w-80 max-w-[calc(100vw-32px)] rounded-2xl p-4 shadow-2xl border backdrop-blur-xl animate-fade-in"
                    style={{
                        background: 'var(--bg-card-solid)',
                        borderColor: 'var(--border-card)',
                        boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
                        color: 'var(--text-primary)',
                    }}
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                                <Sparkles size={14} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                                    Logged to Calendar
                                </h4>
                                <p className="text-[10px] text-slate-400">
                                    {routine.detectedApp} • {routine.durationMinutes}m
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => toast.dismiss(t)}
                            className="text-slate-400 hover:text-white p-1 rounded-lg text-xs"
                            title="Dismiss"
                        >
                            ✕
                        </button>
                    </div>

                    <p className="text-xs font-semibold mt-2.5 mb-1 truncate" style={{ color: 'var(--text-primary)' }}>
                        {routine.title}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Accurate detection?</span>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={async () => {
                                    toast.dismiss(t);
                                    await submitActivityFeedback(routine.id, 'accurate');
                                }}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-1"
                            >
                                👍 Yes
                            </button>
                            <button
                                onClick={async () => {
                                    toast.dismiss(t);
                                    await submitActivityFeedback(routine.id, 'inaccurate');
                                }}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 transition-all flex items-center gap-1"
                            >
                                👎 No
                            </button>
                        </div>
                    </div>
                </div>
            ),
            { duration: 8000 }
        );
    } catch (e) {
        console.warn('Could not display activity toast:', e);
    }
};

/**
 * State and tracker engine singleton
 */
class ActivityAutoTrackerEngine {
    private currentSession: ActiveSession | null = null;
    private initialized = false;
    private isPermissionGranted = false;

    public async init() {
        if (this.initialized) return;
        this.initialized = true;

        await this.checkPermissionAndStart();

        // Listen for live activity updates from Electron main process
        if (window.electronAPI?.onActivityUpdate) {
            window.electronAPI.onActivityUpdate((activity) => {
                this.handleIncomingActivity(activity);
            });
        }

        // Periodic flush of current active session (e.g. every 30 seconds)
        setInterval(() => {
            if (this.currentSession && this.isPermissionGranted) {
                upsertAutoDetectedCalendarEvent(this.currentSession);
            }
        }, 30000);
    }

    public async checkPermissionAndStart(): Promise<boolean> {
        try {
            const perm = await window.electronAPI?.getScreenPermission();
            this.isPermissionGranted = perm === 'granted';
            if (this.isPermissionGranted) {
                // Ensure monitoring is started
                await window.electronAPI?.startMonitoring();
            }
            return this.isPermissionGranted;
        } catch {
            this.isPermissionGranted = true; // Non-macOS
            return true;
        }
    }

    public handleIncomingActivity(act: any) {
        if (!act || !act.owner?.name) return;

        const appName = act.owner.name;
        // Ignore Produchive's own window
        if (appName.toLowerCase().includes('produchive') || appName.toLowerCase().includes('electron')) {
            return;
        }

        const rawTitle = act.title || '';
        const now = Date.now();
        const durationSec = act.duration ? act.duration / 1000 : 1;
        const todayStr = formatDateStr(new Date());

        // Check if continuing same app or switching
        if (this.currentSession && this.currentSession.appName.toLowerCase() === appName.toLowerCase()) {
            // Continuation of same app
            this.currentSession.totalSeconds += durationSec;
            this.currentSession.lastActiveTime = now;
            if (rawTitle && rawTitle !== this.currentSession.windowTitle) {
                this.currentSession.windowTitle = rawTitle;
            }

            // Sync to calendar once we hit milestones (e.g., 30s, 60s, then every 60s)
            if (this.currentSession.totalSeconds >= 30 && Math.floor(this.currentSession.totalSeconds) % 30 === 0) {
                upsertAutoDetectedCalendarEvent(this.currentSession);
            }
        } else {
            // Switching app: finalize previous session if valid
            if (this.currentSession && this.currentSession.totalSeconds >= 30) {
                upsertAutoDetectedCalendarEvent(this.currentSession);
            }

            // Start new session
            const details = inferActivityDetails(appName, rawTitle);
            const sessionId = `auto-${now}-${Math.random().toString(36).substr(2, 6)}`;

            this.currentSession = {
                id: sessionId,
                appName,
                windowTitle: rawTitle,
                category: details.category,
                title: details.title,
                subtitle: details.subtitle,
                confidence: details.confidence,
                startTime: now,
                lastActiveTime: now,
                totalSeconds: durationSec,
                routineId: sessionId,
                dateStr: todayStr,
            };
        }
    }

    public getCurrentSession(): ActiveSession | null {
        return this.currentSession;
    }
}

export const activityAutoTracker = new ActivityAutoTrackerEngine();
