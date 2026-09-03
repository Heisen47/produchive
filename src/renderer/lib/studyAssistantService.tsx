import React from 'react';
import { toast } from 'sonner';
import { useStore } from './store';
import { syncTaskToRoutineCalendar } from './routineSync';

export interface StudiedTopic {
    id: string;
    topic: string;
    lastStudiedAt: number;
    studyCount: number;
    muted: boolean;
    snoozedUntil?: number;
}

export type RevisionAction = 'yes' | 'no' | 'never';

const TOPICS_STORAGE_KEY = 'produchive_studied_topics';
const LAST_REVISION_CHECK_KEY = 'produchive_last_revision_check_day';
const NOTIFIED_ROUTINES_KEY = 'produchive_notified_routines_cache';

const DAYS_BEFORE_REVISION = 4; // 4 days threshold
const MS_PER_DAY = 24 * 60 * 60 * 1000;

class StudyAssistantService {
    // Pomodoro State
    private isStudying = false;
    private currentTopic = '';
    private pomodoroPhase: 'focus' | 'break' | 'idle' = 'idle';
    private phaseSeconds = 0;
    private timerInterval: any = null;
    private isInitialized = false;

    // Routine alerts cache for today: { [routineId]: dateStr }
    private notifiedRoutines: Record<string, string> = {};
    private lastRoutineAlertTime = 0;

    public init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.loadNotifiedRoutines();

        // Check for periodic 5-minute ahead routine warnings & gentle revision checks
        setInterval(() => {
            this.checkUpcomingRoutineActivities();
            this.checkDailyRevisionNudge();
        }, 30000); // every 30s

        // Run immediate initial check 3 seconds after startup
        setTimeout(() => {
            this.checkUpcomingRoutineActivities();
            this.checkDailyRevisionNudge();
        }, 3000);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 1. TOPIC TRACKING & GENTLE SPACED REPETITION REVISION NUDGE
    // ══════════════════════════════════════════════════════════════════════════

    public getStudiedTopics(): StudiedTopic[] {
        try {
            if (typeof localStorage !== 'undefined') {
                const saved = localStorage.getItem(TOPICS_STORAGE_KEY);
                return saved ? JSON.parse(saved) : [];
            }
        } catch (e) {
            console.error('Failed to parse studied topics:', e);
        }
        return [];
    }

    private saveStudiedTopics(topics: StudiedTopic[]) {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(topics));
            }
        } catch (e) {
            console.error('Failed to save studied topics:', e);
        }
    }

    /**
     * Records or updates a studied topic timestamp
     */
    public recordTopicStudied(topicName: string) {
        if (!topicName || !topicName.trim()) return;
        const normalized = topicName.trim();
        const lower = normalized.toLowerCase();

        const topics = this.getStudiedTopics();
        const existingIdx = topics.findIndex((t) => t.topic.toLowerCase() === lower);

        if (existingIdx >= 0) {
            topics[existingIdx].lastStudiedAt = Date.now();
            topics[existingIdx].studyCount = (topics[existingIdx].studyCount || 1) + 1;
            // Clear any temporary snooze if user studied again
            topics[existingIdx].snoozedUntil = undefined;
        } else {
            topics.push({
                id: `topic-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                topic: normalized,
                lastStudiedAt: Date.now(),
                studyCount: 1,
                muted: false,
            });
        }

        this.saveStudiedTopics(topics);
    }

    /**
     * Handles user's response to revision nudge:
     * - 'yes': Schedules revision, updates lastStudiedAt
     * - 'no': Snoozes reminder for 24h
     * - 'never': Permanently mutes reminders for this topic
     */
    public handleRevisionAction(topicId: string, action: RevisionAction) {
        const topics = this.getStudiedTopics();
        const target = topics.find((t) => t.id === topicId);
        if (!target) return;

        if (action === 'yes') {
            target.lastStudiedAt = Date.now();
            target.snoozedUntil = undefined;
            // Add a 25-minute smart revision slot into master calendar
            syncTaskToRoutineCalendar(`Revise ${target.topic}`, 'research');
            toast.success(`Scheduled revision for "${target.topic}" in your Calendar!`, {
                description: 'A 25-minute circadian study block has been reserved.',
            });
        } else if (action === 'no') {
            target.snoozedUntil = Date.now() + MS_PER_DAY;
            toast.info(`Postponed revision for "${target.topic}" for 1 day.`);
        } else if (action === 'never') {
            target.muted = true;
            target.snoozedUntil = undefined;
            toast.info(`Reminders disabled for "${target.topic}".`, {
                description: 'You will no longer receive revision nudges for this topic.',
            });
        }

        this.saveStudiedTopics(topics);
    }

    /**
     * Identifies topics that haven't been reviewed in >= 4 days and aren't snoozed/muted
     */
    public getTopicsNeedingRevision(): StudiedTopic[] {
        const now = Date.now();
        const topics = this.getStudiedTopics();

        return topics.filter((t) => {
            if (t.muted) return false;
            if (t.snoozedUntil && t.snoozedUntil > now) return false;
            const daysElapsed = Math.floor((now - t.lastStudiedAt) / MS_PER_DAY);
            return daysElapsed >= DAYS_BEFORE_REVISION;
        });
    }

    /**
     * Checks once a day if any studied topic needs revision
     */
    public checkDailyRevisionNudge() {
        if (typeof localStorage === 'undefined') return;

        const todayStr = new Date().toISOString().split('T')[0];
        const lastCheckedDay = localStorage.getItem(LAST_REVISION_CHECK_KEY);

        // Run at most once per calendar day
        if (lastCheckedDay === todayStr) return;

        const candidates = this.getTopicsNeedingRevision();
        if (candidates.length === 0) return;

        const topic = candidates[0];
        const daysElapsed = Math.floor((Date.now() - topic.lastStudiedAt) / MS_PER_DAY);

        localStorage.setItem(LAST_REVISION_CHECK_KEY, todayStr);
        this.showRevisionNudge(topic, daysElapsed);
    }

    /**
     * Displays a polite, non-annoying interactive notification & toast with 3 clear choices
     */
    public showRevisionNudge(topic: StudiedTopic, daysElapsed: number) {
        const title = 'Revision Check-in';
        const body = `It's been ${daysElapsed} days since you studied "${topic.topic}". Ready for a quick refresh?`;

        // 1. Native desktop notification
        try {
            if (window.electronAPI?.showNotification) {
                window.electronAPI.showNotification({ title, body });
            }
        } catch (_) {}

        // 2. Ultra-compact in-app toast with 3 clear options
        toast.custom(
            (toastId) => (
                <div className="w-[280px] p-2.5 rounded-xl bg-[var(--bg-card-solid)] border border-[var(--border-card)] shadow-lg text-[var(--text-primary)] space-y-2 text-xs">
                    <div className="min-w-0">
                        <h4 className="text-[11px] font-bold text-[var(--text-primary)]">
                            Revision Check-in ({daysElapsed}d ago)
                        </h4>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                            Refresh <strong className="text-[var(--text-primary)]">"{topic.topic}"</strong>?
                        </p>
                    </div>

                    <div className="flex flex-col gap-1 pt-1 border-t border-[var(--border-secondary)]">
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => {
                                    toast.dismiss(toastId);
                                    this.handleRevisionAction(topic.id, 'yes');
                                }}
                                className="flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold bg-[#5b5fc7] text-white hover:opacity-90 transition-all text-center cursor-pointer"
                            >
                                Revise
                            </button>
                            <button
                                onClick={() => {
                                    toast.dismiss(toastId);
                                    this.handleRevisionAction(topic.id, 'no');
                                }}
                                className="py-1 px-2 rounded-lg text-[11px] font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-primary)] transition-all cursor-pointer"
                            >
                                Later
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                toast.dismiss(toastId);
                                this.handleRevisionAction(topic.id, 'never');
                            }}
                            className="w-full py-0.5 text-[9px] text-[var(--text-muted)] hover:text-rose-400 text-center transition-colors cursor-pointer"
                        >
                            Never remind for this topic
                        </button>
                    </div>
                </div>
            ),
            { id: 'revision-nudge', duration: 8000 }
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. DYNAMIC POMODORO TECHNIQUE (ONLY WHEN STUDYING)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Activates when the system sees the user studying
     */
    public startStudy(topicName?: string) {
        if (topicName && topicName.trim()) {
            this.currentTopic = topicName.trim();
            this.recordTopicStudied(this.currentTopic);
        }

        if (this.isStudying) return; // already active

        this.isStudying = true;
        this.pomodoroPhase = 'focus';
        this.phaseSeconds = 0;

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => this.tickPomodoro(), 1000);
    }

    /**
     * Pauses or stops the Pomodoro technique when user stops studying
     */
    public stopStudy() {
        this.isStudying = false;
        this.pomodoroPhase = 'idle';
        this.phaseSeconds = 0;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    public getPomodoroStatus() {
        return {
            isStudying: this.isStudying,
            topic: this.currentTopic,
            phase: this.pomodoroPhase,
            phaseSeconds: this.phaseSeconds,
        };
    }

    private tickPomodoro() {
        if (!this.isStudying) return;
        this.phaseSeconds++;

        // 25 minutes = 1500 seconds (Focus block completed)
        if (this.pomodoroPhase === 'focus' && this.phaseSeconds >= 1500) {
            this.pomodoroPhase = 'break';
            this.phaseSeconds = 0;
            this.notifyPomodoroBreak();
        }
        // 5 minutes = 300 seconds (Break block completed)
        else if (this.pomodoroPhase === 'break' && this.phaseSeconds >= 300) {
            this.pomodoroPhase = 'focus';
            this.phaseSeconds = 0;
            this.notifyPomodoroResume();
        }
    }

    private notifyPomodoroBreak() {
        const topicLabel = this.currentTopic ? ` on "${this.currentTopic}"` : '';
        const title = '🍅 Pomodoro Break Time';
        const body = `Great 25-minute study focus${topicLabel}! Take a gentle 5-minute break to rest your eyes.`;

        try {
            if (window.electronAPI?.showNotification) {
                window.electronAPI.showNotification({ title, body });
            }
        } catch (_) {}

        toast.success(`25-minute focus block complete!`, {
            description: `Take a 5-minute breather to recharge. ☕`,
            duration: 8000,
        });
    }

    private notifyPomodoroResume() {
        const topicLabel = this.currentTopic ? ` for "${this.currentTopic}"` : '';
        const title = '🍅 Break Finished';
        const body = `Your 5-minute break is complete. Whenever you are ready, resume your next focus block${topicLabel}!`;

        try {
            if (window.electronAPI?.showNotification) {
                window.electronAPI.showNotification({ title, body });
            }
        } catch (_) {}

        toast.info('Break time complete', {
            description: `Ready for your next 25-minute focus block? 📚`,
            duration: 8000,
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. UPCOMING PLANNED ACTIVITY ALERT (5 MINUTES BEFORE START)
    // ══════════════════════════════════════════════════════════════════════════

    private loadNotifiedRoutines() {
        try {
            if (typeof localStorage !== 'undefined') {
                const saved = localStorage.getItem(NOTIFIED_ROUTINES_KEY);
                this.notifiedRoutines = saved ? JSON.parse(saved) : {};
            }
        } catch {
            this.notifiedRoutines = {};
        }
    }

    private saveNotifiedRoutines() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(NOTIFIED_ROUTINES_KEY, JSON.stringify(this.notifiedRoutines));
            }
        } catch (_) {}
    }

    /**
     * Checks if any planned routine starts in exactly 5 minutes
     */
    public checkUpcomingRoutineActivities() {
        const store = useStore.getState();
        const routines = store.routines || [];
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        for (const routine of routines) {
            // Only check scheduled, uncompleted items for today
            if (routine.dateStr !== todayStr || routine.isAutoDetected || routine.completed) {
                continue;
            }

            const startMins = routine.startHour * 60 + routine.startMinute;
            const diffMinutes = startMins - nowMinutes;

            // 5 minutes ahead alert window (4 to 5 minutes)
            if (diffMinutes >= 4 && diffMinutes <= 5) {
                const cacheKey = `${routine.id}-${todayStr}`;
                const semanticKey = `${routine.title.toLowerCase().trim()}-${todayStr}-${routine.startHour}:${routine.startMinute}`;
                const titleKey = `${routine.title.toLowerCase().trim()}-${todayStr}`;

                if (this.notifiedRoutines[cacheKey] || this.notifiedRoutines[semanticKey] || this.notifiedRoutines[titleKey]) {
                    continue; // Already notified today
                }

                // Anti-spam cooldown: don't fire multiple reminder notifications within 3 minutes
                if (this.lastRoutineAlertTime && Date.now() - this.lastRoutineAlertTime < 3 * 60 * 1000) {
                    continue;
                }
                this.lastRoutineAlertTime = Date.now();

                this.notifiedRoutines[cacheKey] = todayStr;
                this.notifiedRoutines[semanticKey] = todayStr;
                this.notifiedRoutines[titleKey] = todayStr;
                this.saveNotifiedRoutines();

                const timeFormatted = `${String(routine.startHour).padStart(2, '0')}:${String(routine.startMinute).padStart(2, '0')}`;
                const title = 'Starting in 5 Minutes';
                const body = `"${routine.title}" starts at ${timeFormatted}. Time to wrap up and get ready.`;

                try {
                    if (window.electronAPI?.showNotification) {
                        window.electronAPI.showNotification({ title, body });
                    }
                } catch (_) {}

                toast.info(`Upcoming in 5m: ${routine.title}`, {
                    id: 'routine-5min-alert',
                    description: `Starts at ${timeFormatted} (${routine.durationMinutes}m block)`,
                    duration: 4000,
                });
            }
        }
    }
}

export const studyAssistantService = new StudyAssistantService();
