import { describe, it, expect, beforeEach } from 'vitest';
import {
    getFeedbackFlag,
    recordFeedbackGiven,
    trackUsageSeconds,
    getUsageSeconds,
    snoozeFeedback,
    isSnoozed,
    isAtLeastTwoVersionsAhead,
    shouldShowFeedbackPrompt,
    FEEDBACK_STORAGE_KEYS,
    USAGE_THRESHOLD_SECONDS,
} from '../renderer/lib/feedbackManager';

describe('Feedback Manager', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        mockStorage = {};
        (globalThis as any).localStorage = {
            getItem: (key: string) => mockStorage[key] || null,
            setItem: (key: string, val: string) => { mockStorage[key] = val; },
            removeItem: (key: string) => { delete mockStorage[key]; },
            clear: () => { mockStorage = {}; },
        };
    });

    describe('Feedback Flag Management', () => {
        it('defaults to flag N when user has not given feedback', () => {
            expect(getFeedbackFlag()).toBe('N');
        });

        it('switches flag to Y and records version when feedback is given', () => {
            recordFeedbackGiven('3.0.31');
            expect(getFeedbackFlag()).toBe('Y');
            expect(mockStorage[FEEDBACK_STORAGE_KEYS.VERSION]).toBe('3.0.31');
            expect(mockStorage[FEEDBACK_STORAGE_KEYS.FLAG]).toBe('Y');
        });
    });

    describe('Usage Time Tracking', () => {
        it('tracks and increments usage seconds cumulatively', () => {
            expect(getUsageSeconds()).toBe(0);
            trackUsageSeconds(10);
            expect(getUsageSeconds()).toBe(10);
            trackUsageSeconds(30);
            expect(getUsageSeconds()).toBe(40);
        });

        it('handles non-numeric or missing storage values gracefully', () => {
            mockStorage[FEEDBACK_STORAGE_KEYS.USAGE_SECONDS] = 'invalid';
            expect(getUsageSeconds()).toBe(0);
        });
    });

    describe('Version Difference Calculation (isAtLeastTwoVersionsAhead)', () => {
        it('returns false for equal versions', () => {
            expect(isAtLeastTwoVersionsAhead('3.0.31', '3.0.31')).toBe(false);
        });

        it('returns false when current version is only 1 patch release ahead', () => {
            expect(isAtLeastTwoVersionsAhead('3.0.32', '3.0.31')).toBe(false);
        });

        it('returns true when current version is 2 or more patch releases ahead', () => {
            expect(isAtLeastTwoVersionsAhead('3.0.33', '3.0.31')).toBe(true);
            expect(isAtLeastTwoVersionsAhead('3.0.35', '3.0.31')).toBe(true);
        });

        it('returns true when current version is a minor release ahead', () => {
            expect(isAtLeastTwoVersionsAhead('3.1.0', '3.0.31')).toBe(true);
        });

        it('returns true when current version is a major release ahead', () => {
            expect(isAtLeastTwoVersionsAhead('4.0.0', '3.0.31')).toBe(true);
        });

        it('returns false if previous version is null or missing', () => {
            expect(isAtLeastTwoVersionsAhead('3.0.31', null)).toBe(false);
        });
    });

    describe('Prompt Trigger Conditions (shouldShowFeedbackPrompt)', () => {
        it('does not show prompt if usage is under 1 hour (< 3600s)', () => {
            trackUsageSeconds(3500);
            expect(shouldShowFeedbackPrompt('3.0.31')).toBe(false);
        });

        it('shows prompt if usage is >= 1 hour and flag is N', () => {
            trackUsageSeconds(USAGE_THRESHOLD_SECONDS);
            expect(getFeedbackFlag()).toBe('N');
            expect(shouldShowFeedbackPrompt('3.0.31')).toBe(true);
        });

        it('does not show prompt if flag is Y on the same version', () => {
            trackUsageSeconds(USAGE_THRESHOLD_SECONDS);
            recordFeedbackGiven('3.0.31');
            expect(shouldShowFeedbackPrompt('3.0.31')).toBe(false);
        });

        it('does not show prompt if flag is Y on 1 version ahead', () => {
            trackUsageSeconds(USAGE_THRESHOLD_SECONDS);
            recordFeedbackGiven('3.0.31');
            expect(shouldShowFeedbackPrompt('3.0.32')).toBe(false);
        });

        it('re-prompts if flag is Y and 2 new versions have released', () => {
            trackUsageSeconds(USAGE_THRESHOLD_SECONDS);
            recordFeedbackGiven('3.0.31');
            expect(shouldShowFeedbackPrompt('3.0.33')).toBe(true);
        });

        it('does not show prompt if user snoozed', () => {
            trackUsageSeconds(USAGE_THRESHOLD_SECONDS);
            snoozeFeedback(24);
            expect(isSnoozed()).toBe(true);
            expect(shouldShowFeedbackPrompt('3.0.31')).toBe(false);
        });
    });
});
