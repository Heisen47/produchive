import React from 'react';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { PlannedRoutineItem } from '../components/Routine';
import { openFeedbackForm } from './urls';
import { useStore } from './store';

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
 * Deduplicates and consolidates auto-detected events for the same app in the same hour slot.
 * Ensures that toggling back and forth between apps groups time into a single event instead of creating duplicates.
 */
export const consolidateDuplicateAutoEvents = (items: PlannedRoutineItem[]): PlannedRoutineItem[] => {
    if (!Array.isArray(items)) return [];
    const result: PlannedRoutineItem[] = [];
    const autoEventMap = new Map<string, PlannedRoutineItem>();

    for (const item of items) {
        if (!item.isAutoDetected || !item.detectedApp) {
            result.push(item);
            continue;
        }

        const appKey = `${item.dateStr}_${item.startHour}_${item.detectedApp.toLowerCase()}`;
        const existing = autoEventMap.get(appKey);

        if (!existing) {
            const rawSec = item.actualDurationSeconds || (item.durationMinutes ? item.durationMinutes * 60 : 300);
            const cappedSec = Math.min(3600, Math.max(30, rawSec));
            const cappedMins = Math.min(60, Math.max(15, Math.ceil(cappedSec / 60 / 5) * 5));

            const sanitizedItem: PlannedRoutineItem = {
                ...item,
                actualDurationSeconds: cappedSec,
                durationMinutes: cappedMins,
            };
            autoEventMap.set(appKey, sanitizedItem);
            result.push(sanitizedItem);
        } else {
            const rawSec = item.actualDurationSeconds || (item.durationMinutes ? item.durationMinutes * 60 : 300);
            const combinedSec = Math.min(3600, (existing.actualDurationSeconds || 0) + rawSec);
            existing.actualDurationSeconds = combinedSec;
            existing.durationMinutes = Math.min(60, Math.max(15, Math.ceil(combinedSec / 60 / 5) * 5));

            if (item.detectionFeedback && !existing.detectionFeedback) {
                existing.detectionFeedback = item.detectionFeedback;
                existing.feedbackAt = item.feedbackAt;
            }
            if (item.detectedTitle && !existing.detectedTitle) {
                existing.detectedTitle = item.detectedTitle;
            }
        }
    }

    return result;
};

/**
 * Helper to get current routines from localStorage
 */
export const getStoredMasterRoutines = (): PlannedRoutineItem[] => {
    try {
        const saved = localStorage.getItem('produchive_master_routines');
        if (saved) {
            const parsed = JSON.parse(saved);
            return consolidateDuplicateAutoEvents(parsed);
        }
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
        const consolidated = consolidateDuplicateAutoEvents(items);
        localStorage.setItem('produchive_master_routines', JSON.stringify(consolidated));
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

    let routines = getStoredMasterRoutines();

    const startDate = new Date(session.startTime);
    const startHour = startDate.getHours();
    const rawMinutes = startDate.getMinutes();
    // Snap startMinute to nearest 15-minute mark (0, 15, 30, 45)
    const startMinute = (Math.floor(rawMinutes / 15) * 15) as 0 | 15 | 30 | 45;

    // Look for existing routine by routineId OR by matching app in same hour slot (groups toggled activity)
    let existingIndex = routines.findIndex((r) => r.id === session.routineId);
    if (existingIndex < 0) {
        existingIndex = routines.findIndex((r) =>
            r.isAutoDetected &&
            r.dateStr === session.dateStr &&
            r.startHour === startHour &&
            r.detectedApp &&
            r.detectedApp.toLowerCase() === session.appName.toLowerCase()
        );
        if (existingIndex >= 0) {
            session.routineId = routines[existingIndex].id;
        }
    }

    // Realistic duration: clamp to max 60m for single hour slot
    const cappedSeconds = Math.min(3600, Math.round(session.totalSeconds));
    const calculatedDuration = Math.min(60, Math.max(15, Math.ceil(cappedSeconds / 60 / 5) * 5));

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
        actualDurationSeconds: cappedSeconds,
        detectionFeedback: existingIndex >= 0 ? routines[existingIndex].detectionFeedback : null,
        detectionFeedbackComment: existingIndex >= 0 ? routines[existingIndex].detectionFeedbackComment : undefined,
        feedbackAt: existingIndex >= 0 ? routines[existingIndex].feedbackAt : undefined,
    };

    let newRoutines: PlannedRoutineItem[];
    if (existingIndex >= 0) {
        // Update in-place
        newRoutines = routines.map((r, idx) => (idx === existingIndex ? { ...r, ...updatedEvent } : r));
    } else {
        // Add new (quietly logged without intrusive toasts; accessible via Debug Center / Dashboard)
        newRoutines = [...routines, updatedEvent];
        // Dispatch event for any other listeners
        window.dispatchEvent(
            new CustomEvent('produchive_auto_event_created', {
                detail: { routine: updatedEvent },
            })
        );
    }

    newRoutines = consolidateDuplicateAutoEvents(newRoutines);
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
 * Keeps background activity tracking completely quiet (only important notifications shown to the user).
 * Auto-detected items are cleanly accessible in the Dashboard tray without annoying toast popups.
 */
export const showAutoActivityToast = (_routine?: PlannedRoutineItem) => {
    try {
        toast.dismiss('auto-activity-logged');
    } catch (_) {}
};

/**
 * State and tracker engine singleton
 */
class ActivityAutoTrackerEngine {
    private currentSession: ActiveSession | null = null;
    private lastTickTime: number = Date.now();
    private initialized = false;
    private isPermissionGranted = false;

    public async init() {
        if (this.initialized) return;
        this.initialized = true;

        try {
            toast.dismiss('auto-activity-logged');
        } catch (_) {}

        await this.checkPermission();

        // Listen for live activity updates from Electron main process
        if (window.electronAPI?.onActivityUpdate) {
            window.electronAPI.onActivityUpdate((activity) => {
                this.handleIncomingActivity(activity);
            });
        }

        // Periodic flush of current active session (e.g. every 30 seconds) ONLY if actively monitoring
        setInterval(() => {
            if (this.currentSession && useStore.getState().isMonitoring) {
                upsertAutoDetectedCalendarEvent(this.currentSession);
            }
        }, 30000);
    }

    public async checkPermission(): Promise<boolean> {
        try {
            const perm = await window.electronAPI?.getScreenPermission();
            this.isPermissionGranted = perm === 'granted';
            return this.isPermissionGranted;
        } catch {
            this.isPermissionGranted = true; // Non-macOS
            return true;
        }
    }

    public async checkPermissionAndStart(): Promise<boolean> {
        return this.checkPermission();
    }

    public handleIncomingActivity(act: any) {
        // App MUST NOT track or log activities without the user explicitly clicking 'Start Monitoring'
        if (!useStore.getState().isMonitoring) {
            return;
        }

        if (!act || !act.owner?.name) return;

        const appName = act.owner.name;
        const lowerApp = appName.toLowerCase();
        const lowerTitle = (act.title || '').toLowerCase();

        // Ignore Produchive's own window, system overlays, screenshot utilities, and Windows shells
        const IGNORED_SYSTEM_APPS = [
            'produchive', 'electron',
            'snippingtool', 'screenclippinghost', 'snip & sketch', 'screenshot',
            'explorer', 'taskmgr', 'task manager',
            'searchapp', 'searchhost', 'startmenuexperiencehost',
            'shellexperiencehost', 'systemsettings', 'applicationframehost',
            'textinputhost', 'lockapp', 'securityhealthsystray', 'ctfmon',
            'idle', 'unknown', 'system', 'dwm',
        ];

        if (IGNORED_SYSTEM_APPS.some((ignored) => lowerApp.includes(ignored) || lowerTitle.includes(ignored))) {
            return;
        }

        const rawTitle = act.title || '';
        const now = Date.now();
        // Measure real elapsed seconds between ticks (clamped 1-5s) instead of database cumulative duration
        const deltaSec = this.lastTickTime ? Math.min(5, Math.max(1, (now - this.lastTickTime) / 1000)) : 1;
        this.lastTickTime = now;
        const todayStr = formatDateStr(new Date());
        const currentHour = new Date().getHours();

        // Check if continuing same app or switching
        if (this.currentSession && this.currentSession.appName.toLowerCase() === appName.toLowerCase()) {
            // Continuation of same app
            this.currentSession.totalSeconds += deltaSec;
            this.currentSession.lastActiveTime = now;
            if (rawTitle && rawTitle !== this.currentSession.windowTitle) {
                this.currentSession.windowTitle = rawTitle;
            }

            // Sync to calendar once we hit milestones (e.g., 30s, 60s, then every 30s)
            if (this.currentSession.totalSeconds >= 30 && Math.floor(this.currentSession.totalSeconds) % 30 === 0) {
                upsertAutoDetectedCalendarEvent(this.currentSession);
            }
        } else {
            // Switching app: finalize previous session if valid
            if (this.currentSession && this.currentSession.totalSeconds >= 30) {
                upsertAutoDetectedCalendarEvent(this.currentSession);
            }

            // Toggling back to the same app within the current hour slot?
            // Group them together rather than creating a separate new event!
            const routines = getStoredMasterRoutines();
            const existingMatch = routines.find((r) =>
                r.isAutoDetected &&
                r.dateStr === todayStr &&
                r.startHour === currentHour &&
                r.detectedApp &&
                r.detectedApp.toLowerCase() === appName.toLowerCase()
            );

            if (existingMatch) {
                // Resume existing routine and accumulate time into it
                const details = inferActivityDetails(appName, rawTitle);
                const prevSeconds = existingMatch.actualDurationSeconds || existingMatch.durationMinutes * 60;
                this.currentSession = {
                    id: existingMatch.id,
                    appName,
                    windowTitle: rawTitle || existingMatch.detectedTitle || '',
                    category: existingMatch.category || details.category,
                    title: existingMatch.title || details.title,
                    subtitle: existingMatch.subtitle || details.subtitle,
                    confidence: existingMatch.detectionConfidence || details.confidence,
                    startTime: new Date(`${existingMatch.dateStr}T${String(existingMatch.startHour).padStart(2, '0')}:${String(existingMatch.startMinute).padStart(2, '0')}:00`).getTime() || now,
                    lastActiveTime: now,
                    totalSeconds: prevSeconds + deltaSec,
                    routineId: existingMatch.id,
                    dateStr: todayStr,
                };
            } else {
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
                    totalSeconds: deltaSec,
                    routineId: sessionId,
                    dateStr: todayStr,
                };
            }
        }
    }

    public getCurrentSession(): ActiveSession | null {
        return this.currentSession;
    }
}

export const activityAutoTracker = new ActivityAutoTrackerEngine();
