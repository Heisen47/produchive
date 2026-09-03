import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    cleanWindowTitle,
    inferActivityDetails,
    upsertAutoDetectedCalendarEvent,
    submitActivityFeedback,
    ActiveSession,
} from '../renderer/lib/activityAutoTracker';

describe('activityAutoTracker', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        mockStorage = {};
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => mockStorage[key] || null,
            setItem: (key: string, value: string) => {
                mockStorage[key] = value;
            },
            removeItem: (key: string) => {
                delete mockStorage[key];
            },
            clear: () => {
                mockStorage = {};
            },
        });

        vi.stubGlobal('window', {
            dispatchEvent: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            electronAPI: {
                saveActivityFeedback: vi.fn().mockResolvedValue({ success: true }),
                getActivityFeedbacks: vi.fn().mockResolvedValue([]),
                getScreenPermission: vi.fn().mockResolvedValue('granted'),
                startMonitoring: vi.fn().mockResolvedValue(true),
                openExternalUrl: vi.fn(),
            },
        });
    });

    describe('cleanWindowTitle', () => {
        it('removes trailing app suffixes', () => {
            expect(cleanWindowTitle('App.tsx — produchive - Code', 'Code')).toBe('App.tsx — produchive');
            expect(cleanWindowTitle('Antigravity Docs - Google Chrome', 'Google Chrome')).toBe('Antigravity Docs');
        });

        it('returns appName when title is empty', () => {
            expect(cleanWindowTitle('', 'Figma')).toBe('Figma');
        });
    });

    describe('inferActivityDetails', () => {
        it('categorizes software engineering apps as development', () => {
            const vsCode = inferActivityDetails('Code', 'Routine.tsx — produchive');
            expect(vsCode.category).toBe('development');
            expect(vsCode.confidence).toBeGreaterThanOrEqual(90);

            const cursor = inferActivityDetails('Cursor', 'main.py');
            expect(cursor.category).toBe('development');

            const term = inferActivityDetails('iTerm2', 'zsh - npm test');
            expect(term.category).toBe('development');
        });

        it('categorizes design apps as design', () => {
            const figma = inferActivityDetails('Figma', 'Produchive Design System');
            expect(figma.category).toBe('design');
            expect(figma.title).toContain('Design');
        });

        it('categorizes communication apps as meeting', () => {
            const zoom = inferActivityDetails('zoom.us', 'Team Daily Standup');
            expect(zoom.category).toBe('meeting');

            const slack = inferActivityDetails('Slack', '#engineering-chat');
            expect(slack.category).toBe('meeting');
        });

        it('categorizes notes and docs as writing', () => {
            const notion = inferActivityDetails('Notion', 'Sprint Planning Roadmap');
            expect(notion.category).toBe('writing');
        });

        it('distinguishes media breaks from research in browsers', () => {
            const youtube = inferActivityDetails('Google Chrome', 'Lo-Fi Chill Beats - YouTube');
            expect(youtube.category).toBe('break');

            const research = inferActivityDetails('Google Chrome', 'React 19 Hooks Documentation');
            expect(research.category).toBe('research');

            const leetcode = inferActivityDetails('Google Chrome', 'Two Sum - LeetCode');
            expect(leetcode.category).toBe('development');
        });
    });

    describe('upsertAutoDetectedCalendarEvent', () => {
        it('skips sessions under 30 seconds to prevent clutter', () => {
            const shortSession: ActiveSession = {
                id: 'sess-1',
                appName: 'Code',
                windowTitle: 'test.ts',
                category: 'development',
                title: 'Dev • test.ts',
                subtitle: 'Active in Code',
                confidence: 94,
                startTime: new Date('2026-09-03T10:10:00').getTime(),
                lastActiveTime: new Date('2026-09-03T10:10:20').getTime(),
                totalSeconds: 20,
                routineId: 'auto-test-1',
                dateStr: '2026-09-03',
            };

            const result = upsertAutoDetectedCalendarEvent(shortSession);
            expect(result).toBeNull();
        });

        it('creates an auto-detected calendar event with correct time duration', () => {
            const session: ActiveSession = {
                id: 'sess-2',
                appName: 'Figma',
                windowTitle: 'App Design Mockup',
                category: 'design',
                title: 'Design • App Design Mockup',
                subtitle: 'Active in Figma',
                confidence: 92,
                startTime: new Date('2026-09-03T14:15:00').getTime(),
                lastActiveTime: new Date('2026-09-03T14:45:00').getTime(),
                totalSeconds: 1800, // 30 mins
                routineId: 'auto-figma-1',
                dateStr: '2026-09-03',
            };

            const event = upsertAutoDetectedCalendarEvent(session);
            expect(event).not.toBeNull();
            expect(event?.isAutoDetected).toBe(true);
            expect(event?.detectedApp).toBe('Figma');
            expect(event?.category).toBe('design');
            expect(event?.startHour).toBe(14);
            expect(event?.durationMinutes).toBe(30);
            expect(event?.detectionFeedback).toBeNull();

            // Verify stored in localStorage
            const stored = JSON.parse(mockStorage['produchive_master_routines']);
            expect(stored.length).toBe(1);
            expect(stored[0].id).toBe('auto-figma-1');
        });
    });

    describe('submitActivityFeedback', () => {
        it('records accurate feedback and informs developer database via IPC', async () => {
            const session: ActiveSession = {
                id: 'sess-3',
                appName: 'Code',
                windowTitle: 'App.tsx',
                category: 'development',
                title: 'Dev • App.tsx',
                subtitle: 'Active in Code',
                confidence: 95,
                startTime: new Date('2026-09-03T11:00:00').getTime(),
                lastActiveTime: new Date('2026-09-03T11:25:00').getTime(),
                totalSeconds: 1500,
                routineId: 'auto-code-1',
                dateStr: '2026-09-03',
            };
            upsertAutoDetectedCalendarEvent(session);

            const success = await submitActivityFeedback('auto-code-1', 'accurate');
            expect(success).toBe(true);

            // Verify local storage update
            const stored = JSON.parse(mockStorage['produchive_master_routines']);
            expect(stored[0].detectionFeedback).toBe('accurate');
            expect(stored[0].feedbackAt).toBeDefined();

            // Verify IPC call to developer database
            expect(window.electronAPI.saveActivityFeedback).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventId: 'auto-code-1',
                    appName: 'Code',
                    userFeedback: 'accurate',
                })
            );

            // Verify Google feedback form opened
            expect(window.electronAPI.openExternalUrl).toHaveBeenCalledWith(
                expect.stringContaining('forms.gle')
            );
        });

        it('records inaccurate feedback with category correction', async () => {
            const session: ActiveSession = {
                id: 'sess-4',
                appName: 'Chrome',
                windowTitle: 'YouTube',
                category: 'break',
                title: 'Media Break • YouTube',
                subtitle: 'Active in Chrome',
                confidence: 86,
                startTime: new Date('2026-09-03T15:00:00').getTime(),
                lastActiveTime: new Date('2026-09-03T15:30:00').getTime(),
                totalSeconds: 1800,
                routineId: 'auto-chrome-1',
                dateStr: '2026-09-03',
            };
            upsertAutoDetectedCalendarEvent(session);

            const success = await submitActivityFeedback('auto-chrome-1', 'inaccurate', {
                category: 'research',
                comment: 'Watched educational tutorial',
            });
            expect(success).toBe(true);

            const stored = JSON.parse(mockStorage['produchive_master_routines']);
            expect(stored[0].detectionFeedback).toBe('inaccurate');
            expect(stored[0].category).toBe('research');
            expect(stored[0].detectionFeedbackComment).toBe('Watched educational tutorial');

            expect(window.electronAPI.saveActivityFeedback).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventId: 'auto-chrome-1',
                    userFeedback: 'inaccurate',
                    correctedCategory: 'research',
                })
            );
        });
    });
});
