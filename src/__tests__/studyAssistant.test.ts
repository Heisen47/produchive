import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { studyAssistantService, StudiedTopic } from '../renderer/lib/studyAssistantService';
import { useStore } from '../renderer/lib/store';
import { PlannedRoutineItem } from '../renderer/types/routine';

describe('Study Assistant Service', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        vi.useFakeTimers();
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
                showNotification: vi.fn().mockResolvedValue(undefined),
                updateTask: vi.fn().mockResolvedValue([]),
            },
        });
    });

    afterEach(() => {
        studyAssistantService.stopStudy();
        vi.useRealTimers();
    });

    describe('Topic Revision Nudges (Spaced Repetition)', () => {
        it('records and updates studied topics', () => {
            studyAssistantService.recordTopicStudied('Photosynthesis');

            const topics = studyAssistantService.getStudiedTopics();
            expect(topics.length).toBe(1);
            expect(topics[0].topic).toBe('Photosynthesis');
            expect(topics[0].studyCount).toBe(1);
            expect(topics[0].muted).toBe(false);

            // Studying again increments studyCount and refreshes timestamp
            studyAssistantService.recordTopicStudied('photosynthesis');
            const updated = studyAssistantService.getStudiedTopics();
            expect(updated.length).toBe(1);
            expect(updated[0].studyCount).toBe(2);
        });

        it('does NOT flag topics studied less than 4 days ago', () => {
            const now = Date.now();
            const topics: StudiedTopic[] = [
                {
                    id: 't-recent',
                    topic: 'Photosynthesis',
                    lastStudiedAt: now - 2 * 24 * 60 * 60 * 1000, // 2 days ago
                    studyCount: 1,
                    muted: false,
                },
            ];
            mockStorage['produchive_studied_topics'] = JSON.stringify(topics);

            const needingRevision = studyAssistantService.getTopicsNeedingRevision();
            expect(needingRevision.length).toBe(0);
        });

        it('flags topics studied 4 or more days ago', () => {
            const now = Date.now();
            const topics: StudiedTopic[] = [
                {
                    id: 't-old',
                    topic: 'Photosynthesis',
                    lastStudiedAt: now - 5 * 24 * 60 * 60 * 1000, // 5 days ago
                    studyCount: 1,
                    muted: false,
                },
            ];
            mockStorage['produchive_studied_topics'] = JSON.stringify(topics);

            const needingRevision = studyAssistantService.getTopicsNeedingRevision();
            expect(needingRevision.length).toBe(1);
            expect(needingRevision[0].topic).toBe('Photosynthesis');
        });

        it('handles "yes" action by refreshing study time and scheduling revision block', () => {
            const now = Date.now();
            const topics: StudiedTopic[] = [
                {
                    id: 't-photo',
                    topic: 'Photosynthesis',
                    lastStudiedAt: now - 5 * 24 * 60 * 60 * 1000,
                    studyCount: 1,
                    muted: false,
                },
            ];
            mockStorage['produchive_studied_topics'] = JSON.stringify(topics);

            studyAssistantService.handleRevisionAction('t-photo', 'yes');

            const savedTopics = studyAssistantService.getStudiedTopics();
            expect(savedTopics[0].lastStudiedAt).toBeGreaterThanOrEqual(now);
            expect(savedTopics[0].snoozedUntil).toBeUndefined();

            // Check that a revision slot was scheduled into calendar storage
            const calendarRoutines = JSON.parse(mockStorage['produchive_master_routines'] || '[]');
            expect(calendarRoutines.some((r: any) => r.title.includes('Photosynthesis'))).toBe(true);
        });

        it('handles "no" action by snoozing for 24 hours', () => {
            const now = Date.now();
            const topics: StudiedTopic[] = [
                {
                    id: 't-snooze',
                    topic: 'Photosynthesis',
                    lastStudiedAt: now - 5 * 24 * 60 * 60 * 1000,
                    studyCount: 1,
                    muted: false,
                },
            ];
            mockStorage['produchive_studied_topics'] = JSON.stringify(topics);

            studyAssistantService.handleRevisionAction('t-snooze', 'no');

            const savedTopics = studyAssistantService.getStudiedTopics();
            expect(savedTopics[0].snoozedUntil).toBeGreaterThan(now);
            expect(savedTopics[0].muted).toBe(false);

            // While snoozed, it is excluded from revision candidates
            const needingRevision = studyAssistantService.getTopicsNeedingRevision();
            expect(needingRevision.length).toBe(0);
        });

        it('handles "never" action by permanently muting reminders for that topic', () => {
            const now = Date.now();
            const topics: StudiedTopic[] = [
                {
                    id: 't-mute',
                    topic: 'Photosynthesis',
                    lastStudiedAt: now - 5 * 24 * 60 * 60 * 1000,
                    studyCount: 1,
                    muted: false,
                },
            ];
            mockStorage['produchive_studied_topics'] = JSON.stringify(topics);

            studyAssistantService.handleRevisionAction('t-mute', 'never');

            const savedTopics = studyAssistantService.getStudiedTopics();
            expect(savedTopics[0].muted).toBe(true);

            // Permanently excluded from revision candidates
            const needingRevision = studyAssistantService.getTopicsNeedingRevision();
            expect(needingRevision.length).toBe(0);
        });
    });

    describe('Study-Only Pomodoro Technique', () => {
        it('starts in focus phase when studying begins and stops on stopStudy', () => {
            studyAssistantService.startStudy('Photosynthesis');

            let status = studyAssistantService.getPomodoroStatus();
            expect(status.isStudying).toBe(true);
            expect(status.topic).toBe('Photosynthesis');
            expect(status.phase).toBe('focus');
            expect(status.phaseSeconds).toBe(0);

            // Advance 10 seconds
            vi.advanceTimersByTime(10000);
            status = studyAssistantService.getPomodoroStatus();
            expect(status.phaseSeconds).toBe(10);

            // Stop studying
            studyAssistantService.stopStudy();
            status = studyAssistantService.getPomodoroStatus();
            expect(status.isStudying).toBe(false);
            expect(status.phase).toBe('idle');
        });

        it('notifies and transitions to break after 25 minutes of studying', () => {
            studyAssistantService.startStudy('Photosynthesis');

            // Advance 25 minutes (1500 seconds)
            vi.advanceTimersByTime(1500 * 1000);

            const status = studyAssistantService.getPomodoroStatus();
            expect(status.phase).toBe('break');
            expect(window.electronAPI.showNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: expect.stringContaining('Pomodoro Break'),
                })
            );
        });
    });

    describe('5-Minute Upcoming Planned Activity Alert', () => {
        it('sends notification exactly 5 minutes before scheduled routine start', () => {
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const currentTotalMins = now.getHours() * 60 + now.getMinutes();

            // Schedule a routine exactly 5 minutes from now
            const targetMins = currentTotalMins + 5;
            const targetHour = Math.floor(targetMins / 60) % 24;
            const targetMinute = targetMins % 60;

            const upcomingRoutine: PlannedRoutineItem = {
                id: 'routine-5m-ahead',
                title: 'Review Physics Chapter',
                category: 'research',
                priority: 'medium',
                dayIndex: now.getDay(),
                dateStr: todayStr,
                startHour: targetHour,
                startMinute: targetMinute as any,
                durationMinutes: 45,
                completed: false,
            };

            useStore.setState({ routines: [upcomingRoutine] });

            studyAssistantService.checkUpcomingRoutineActivities();

            expect(window.electronAPI.showNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: expect.stringContaining('Starting in 5 Minutes'),
                    body: expect.stringContaining('Review Physics Chapter'),
                })
            );

            // Ensure notification is not sent repeatedly
            (window.electronAPI.showNotification as any).mockClear();
            studyAssistantService.checkUpcomingRoutineActivities();
            expect(window.electronAPI.showNotification).not.toHaveBeenCalled();
        });

        it('does NOT notify if routine starts in 20 minutes', () => {
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const currentTotalMins = now.getHours() * 60 + now.getMinutes();

            const targetMins = currentTotalMins + 20;
            const targetHour = Math.floor(targetMins / 60) % 24;
            const targetMinute = targetMins % 60;

            const upcomingRoutine: PlannedRoutineItem = {
                id: 'routine-far',
                title: 'Math Revision',
                category: 'development',
                priority: 'medium',
                dayIndex: now.getDay(),
                dateStr: todayStr,
                startHour: targetHour,
                startMinute: targetMinute as any,
                durationMinutes: 45,
                completed: false,
            };

            useStore.setState({ routines: [upcomingRoutine] });

            studyAssistantService.checkUpcomingRoutineActivities();
            expect(window.electronAPI.showNotification).not.toHaveBeenCalled();
        });
    });
});
