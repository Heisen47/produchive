import { toast } from 'sonner';
import { Activity } from '../global';
import { useStore } from './store';
import { hasAnyDownloadedModel } from './ai';
import { judgeActivityProductivityWithLLM } from './productivityAnalysisService';

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes between nudges
const MIN_DISTRACTION_SECONDS = 60; // Must be on distracting app for >= 60 seconds

interface DistractionState {
    appName: string;
    windowTitle: string;
    firstDetectedAt: number;
    lastNudgedAt: number;
}

class AINudgeService {
    private engine: any = null;
    private lastNudgeTime = 0;
    private currentDistraction: DistractionState | null = null;
    private isModelDownloaded: boolean | null = null;
    private checkModelPromise: Promise<boolean> | null = null;

    public setEngine(engine: any) {
        this.engine = engine;
        this.isModelDownloaded = true;
    }

    /**
     * Checks whether an AI model is cached locally on this machine
     */
    public async checkModelDownloaded(): Promise<boolean> {
        if (this.engine) return true;
        if (this.isModelDownloaded !== null) return this.isModelDownloaded;

        if (!this.checkModelPromise) {
            this.checkModelPromise = hasAnyDownloadedModel().then((modelId) => {
                this.isModelDownloaded = !!modelId;
                this.checkModelPromise = null;
                return !!modelId;
            });
        }
        return this.checkModelPromise;
    }

    /**
     * Reset cached model check (e.g. after model downloaded/deleted)
     */
    public refreshModelCacheStatus() {
        this.isModelDownloaded = null;
    }

    /**
     * Detects if app/window title matches common distraction categories
     */
    public isPotentialDistractionApp(appName: string, title: string): boolean {
        const name = (appName || '').toLowerCase();
        const rawTitle = (title || '').toLowerCase();

        const distractionKeywords = [
            'youtube',
            'netflix',
            'tiktok',
            'twitter',
            'x.com',
            'instagram',
            'reddit',
            'twitch',
            'facebook',
            'steam',
            'roblox',
            'minecraft',
            'disney',
            'hulu',
            'prime video',
            '9gag',
            'buzzfeed',
        ];

        return distractionKeywords.some(
            (kw) => name.includes(kw) || rawTitle.includes(kw)
        );
    }

    /**
     * Obtains the user's current scheduled routine block or primary goal
     */
    private getActiveTarget(): string | null {
        const store = useStore.getState();
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        // Check if there is an active routine block right now
        const activeRoutine = (store.routines || []).find((r) => {
            if (r.dateStr !== todayStr || r.isAutoDetected) return false;
            const start = r.startHour * 60 + r.startMinute;
            const end = start + r.durationMinutes;
            return nowMinutes >= start && nowMinutes < end;
        });

        if (activeRoutine) {
            return `Scheduled routine: "${activeRoutine.title}"`;
        }

        // Fallback to primary goal
        if (store.goals && store.goals.length > 0) {
            return `Goal: "${store.goals[0]}"`;
        }

        // Fallback to uncompleted task
        const pendingTask = (store.tasks || []).find((t) => !t.completed);
        if (pendingTask) {
            return `Task: "${pendingTask.text}"`;
        }

        return null;
    }

    /**
     * Main hook called whenever an active application update is received
     */
    public async handleActivity(activity: Activity) {
        if (!activity || !activity.owner?.name) return;

        // Requirement: "if AI model is downloaded , use that model as a judge to nudge the user"
        const hasModel = await this.checkModelDownloaded();
        if (!hasModel) return;

        const appName = activity.owner.name;
        const windowTitle = activity.title || '';
        const now = Date.now();

        // Check cooldown
        if (now - this.lastNudgeTime < COOLDOWN_MS) {
            return;
        }

        const isPotentiallyDistracting = this.isPotentialDistractionApp(appName, windowTitle);

        if (!isPotentiallyDistracting) {
            // User is on a productive or neutral app -> reset distraction counter
            this.currentDistraction = null;
            return;
        }

        // Track duration on this distracting app
        if (
            !this.currentDistraction ||
            this.currentDistraction.appName !== appName
        ) {
            this.currentDistraction = {
                appName,
                windowTitle,
                firstDetectedAt: now,
                lastNudgedAt: 0,
            };
            return;
        }

        const elapsedSeconds = (now - this.currentDistraction.firstDetectedAt) / 1000;
        if (elapsedSeconds < MIN_DISTRACTION_SECONDS) {
            // Not distracted long enough to warrant interruption
            return;
        }

        const activeTarget = this.getActiveTarget();
        if (!activeTarget) return;

        // Perform AI evaluation (using active LLM engine if ready, or smart AI heuristic)
        const isDistracted = await this.evaluateDistractionWithAI(
            appName,
            windowTitle,
            activeTarget
        );

        if (isDistracted) {
            await this.sendDistractionNudge(appName, activeTarget);
            this.lastNudgeTime = now;
            this.currentDistraction.lastNudgedAt = now;
            // Reset timer so we don't immediately re-trigger after cooldown unless continued
            this.currentDistraction.firstDetectedAt = now;
        }
    }

    /**
     * Uses the local AI engine (if active) or smart role-aware heuristic to judge distraction
     */
    private async evaluateDistractionWithAI(
        appName: string,
        windowTitle: string,
        activeTarget: string
    ): Promise<boolean> {
        // If the active goal explicitly mentions relaxing or entertainment, it's not a distraction
        const targetLower = activeTarget.toLowerCase();
        if (
            targetLower.includes('relax') ||
            targetLower.includes('break') ||
            targetLower.includes('entertainment')
        ) {
            return false;
        }

        // If WebLLM engine is active in memory, query it for a high-accuracy judgment
        if (this.engine) {
            try {
                const judgment = await judgeActivityProductivityWithLLM(
                    { appName, title: windowTitle },
                    activeTarget ? [activeTarget] : [],
                    this.engine
                );
                return judgment.isDistracting;
            } catch (err) {
                console.warn('AI engine quick distraction evaluation failed, using heuristic:', err);
            }
        }

        // Standard smart heuristic:
        return this.isPotentialDistractionApp(appName, windowTitle);
    }

    /**
     * Dispatches desktop and in-app notifications
     */
    private async sendDistractionNudge(appName: string, activeTarget: string) {
        const title = 'Produchive AI Nudge 🎯';
        const body = `Hey! Noticed you're on ${appName}. Let's get back to ${activeTarget}!`;

        // 1. Native Desktop Notification (works even if Produchive is behind other windows)
        try {
            if (window.electronAPI?.showNotification) {
                await window.electronAPI.showNotification({ title, body });
            } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification(title, { body });
            }
        } catch (e) {
            console.error('Failed to trigger native notification:', e);
        }

        // 2. In-App Sonner Toast
        toast.warning(`Sidetracked on ${appName}?`, {
            description: `Scheduled focus: ${activeTarget}. You've got this!`,
            duration: 8000,
        });

        // 3. Dispatch global event for debug panel & audio cues if needed
        window.dispatchEvent(
            new CustomEvent('produchive_ai_nudge_triggered', {
                detail: { appName, activeTarget, timestamp: Date.now() },
            })
        );
    }
}

export const aiNudgeService = new AINudgeService();
