/**
 * Produchive Feedback Manager
 * Manages in-app user feedback prompt triggers, cumulative usage tracking,
 * and version-based re-prompting rules.
 */

export const FEEDBACK_STORAGE_KEYS = {
    FLAG: 'produchive_feedback_flag',
    VERSION: 'produchive_feedback_version',
    USAGE_SECONDS: 'produchive_app_usage_seconds',
    SNOOZE_UNTIL: 'produchive_feedback_snooze_until',
} as const;

export const USAGE_THRESHOLD_SECONDS = 3600; // 1 hour of cumulative active usage

export function getUsageSeconds(): number {
    try {
        if (typeof localStorage === 'undefined') return 0;
        const val = localStorage.getItem(FEEDBACK_STORAGE_KEYS.USAGE_SECONDS);
        const parsed = val ? parseInt(val, 10) : 0;
        return isNaN(parsed) ? 0 : parsed;
    } catch {
        return 0;
    }
}

export function trackUsageSeconds(deltaSeconds: number): number {
    try {
        if (typeof localStorage === 'undefined') return 0;
        const current = getUsageSeconds();
        const updated = current + Math.max(0, deltaSeconds);
        localStorage.setItem(FEEDBACK_STORAGE_KEYS.USAGE_SECONDS, updated.toString());
        return updated;
    } catch {
        return 0;
    }
}

export function getFeedbackFlag(): 'N' | 'Y' {
    try {
        if (typeof localStorage === 'undefined') return 'N';
        const val = localStorage.getItem(FEEDBACK_STORAGE_KEYS.FLAG);
        return val === 'Y' ? 'Y' : 'N';
    } catch {
        return 'N';
    }
}

export function getLastFeedbackVersion(): string | null {
    try {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem(FEEDBACK_STORAGE_KEYS.VERSION);
    } catch {
        return null;
    }
}

export function recordFeedbackGiven(version: string): void {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(FEEDBACK_STORAGE_KEYS.FLAG, 'Y');
        localStorage.setItem(FEEDBACK_STORAGE_KEYS.VERSION, version || '');
    } catch {}
}

export function snoozeFeedback(hours = 24): void {
    try {
        if (typeof localStorage === 'undefined') return;
        const snoozeUntil = Date.now() + Math.max(0.1, hours) * 60 * 60 * 1000;
        localStorage.setItem(FEEDBACK_STORAGE_KEYS.SNOOZE_UNTIL, snoozeUntil.toString());
    } catch {}
}

export function isSnoozed(): boolean {
    try {
        if (typeof localStorage === 'undefined') return false;
        const val = localStorage.getItem(FEEDBACK_STORAGE_KEYS.SNOOZE_UNTIL);
        if (!val) return false;
        const snoozeTimestamp = parseInt(val, 10);
        return !isNaN(snoozeTimestamp) && Date.now() < snoozeTimestamp;
    } catch {
        return false;
    }
}

/**
 * Checks if current app version is at least 2 versions ahead of the version
 * when the user previously provided feedback.
 * e.g. 3.0.31 -> 3.0.33 (patch >= 2), 3.0.31 -> 3.1.0 (minor), or major increment.
 */
export function isAtLeastTwoVersionsAhead(currentVersion: string, lastFeedbackVersion: string | null): boolean {
    if (!lastFeedbackVersion || !currentVersion) return false;

    const curr = currentVersion.replace(/^v/, '').split('.').map(Number);
    const prev = lastFeedbackVersion.replace(/^v/, '').split('.').map(Number);

    const [cMaj = 0, cMin = 0, cPatch = 0] = curr;
    const [pMaj = 0, pMin = 0, pPatch = 0] = prev;

    if (cMaj > pMaj) return true;
    if (cMaj === pMaj && cMin > pMin) return true;
    if (cMaj === pMaj && cMin === pMin && (cPatch - pPatch) >= 2) return true;

    return false;
}

/**
 * Determines whether to display the feedback modal:
 * 1. User has accumulated >= 1 hour of usage.
 * 2. Not currently snoozed.
 * 3. Either flag is 'N', or flag is 'Y' but 2 new versions have released since last feedback.
 */
export function shouldShowFeedbackPrompt(currentVersion: string): boolean {
    if (isSnoozed()) return false;

    const usage = getUsageSeconds();
    if (usage < USAGE_THRESHOLD_SECONDS) return false;

    const flag = getFeedbackFlag();
    if (flag === 'N') return true;

    const lastVersion = getLastFeedbackVersion();
    return isAtLeastTwoVersionsAhead(currentVersion, lastVersion);
}

export function resetFeedbackStateForTesting(): void {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem(FEEDBACK_STORAGE_KEYS.FLAG);
        localStorage.removeItem(FEEDBACK_STORAGE_KEYS.VERSION);
        localStorage.removeItem(FEEDBACK_STORAGE_KEYS.USAGE_SECONDS);
        localStorage.removeItem(FEEDBACK_STORAGE_KEYS.SNOOZE_UNTIL);
    } catch {}
}
