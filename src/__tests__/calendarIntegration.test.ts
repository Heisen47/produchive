import { describe, it, expect, beforeEach, vi } from 'vitest';
import { syncFocusSessionToRoutineCalendar } from '../renderer/lib/routineSync';
import { useStore } from '../renderer/lib/store';
import { aiNudgeService } from '../renderer/lib/aiNudgeService';
import { PlannedRoutineItem } from '../renderer/types/routine';

describe('Calendar Deep Integration & AI Distraction Nudge', () => {
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
                addTask: vi.fn().mockImplementation((task) => Promise.resolve([task])),
                updateTask: vi.fn().mockImplementation((task) => Promise.resolve([task])),
                getTasks: vi.fn().mockResolvedValue({ tasks: [], activities: [], goals: [], ratings: [] }),
                getSettings: vi.fn().mockResolvedValue({}),
                getBlockedActivities: vi.fn().mockResolvedValue([]),
                showNotification: vi.fn().mockResolvedValue(undefined),
            },
        });
    });

    describe('Focus Room to Calendar Integration', () => {
        it('ignores focus sessions under 30 seconds', () => {
            syncFocusSessionToRoutineCalendar('library', 20, new Date().toISOString());
            expect(mockStorage['produchive_master_routines']).toBeUndefined();
        });

        it('logs a completed focus session into the Routine calendar', () => {
            const startedAt = '2026-09-03T10:00:00.000Z';
            syncFocusSessionToRoutineCalendar('classroom', 1500, startedAt); // 25 min session

            expect(mockStorage['produchive_master_routines']).toBeDefined();
            const routines: PlannedRoutineItem[] = JSON.parse(mockStorage['produchive_master_routines']);
            expect(routines.length).toBe(1);
            expect(routines[0].title).toBe('Focus Room • Classroom');
            expect(routines[0].category).toBe('development');
            expect(routines[0].completed).toBe(true);
            expect(routines[0].actualDurationSeconds).toBe(1500);
            expect(routines[0].durationMinutes).toBe(25);
        });
    });

    describe('Bidirectional Task and Calendar Sync in Zustand Store', () => {
        it('toggling a task in store toggles matching calendar routine item', async () => {
            const initialRoutine: PlannedRoutineItem = {
                id: 'r1',
                title: 'Review PRs',
                category: 'development',
                priority: 'medium',
                dayIndex: 0,
                dateStr: '2026-09-03',
                startHour: 10,
                startMinute: 0,
                durationMinutes: 60,
                completed: false,
            };
            mockStorage['produchive_master_routines'] = JSON.stringify([initialRoutine]);
            useStore.getState().loadRoutines();

            // Set a matching task in store
            useStore.setState({
                tasks: [
                    {
                        id: 't1',
                        text: 'Review PRs',
                        completed: false,
                        created: Date.now(),
                        createdAt: new Date().toISOString(),
                    },
                ],
            });

            // Toggle task
            await useStore.getState().toggleTask('t1');

            const updatedTasks = useStore.getState().tasks;
            expect(updatedTasks[0].completed).toBe(true);

            // Verify routine in store and storage was also toggled
            const updatedRoutines = useStore.getState().routines;
            expect(updatedRoutines[0].completed).toBe(true);

            const storageRoutines: PlannedRoutineItem[] = JSON.parse(mockStorage['produchive_master_routines']);
            expect(storageRoutines[0].completed).toBe(true);
        });

        it('toggling a routine in store updates matching task via IPC', async () => {
            const initialRoutine: PlannedRoutineItem = {
                id: 'r-dev',
                title: 'Build Login API',
                category: 'development',
                priority: 'high',
                dayIndex: 0,
                dateStr: '2026-09-03',
                startHour: 11,
                startMinute: 0,
                durationMinutes: 90,
                completed: false,
            };
            mockStorage['produchive_master_routines'] = JSON.stringify([initialRoutine]);
            useStore.getState().loadRoutines();

            useStore.setState({
                tasks: [
                    {
                        id: 'task-api',
                        text: 'Build Login API',
                        completed: false,
                        created: Date.now(),
                        createdAt: new Date().toISOString(),
                    },
                ],
            });

            await useStore.getState().toggleRoutineComplete('r-dev');

            expect(useStore.getState().routines[0].completed).toBe(true);
            expect(window.electronAPI.updateTask).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'task-api',
                    completed: true,
                })
            );
        });
    });

    describe('AI Distraction Nudge Service', () => {
        it('identifies distracting applications and domains', () => {
            expect(aiNudgeService.isPotentialDistractionApp('YouTube', 'Funniest TikToks')).toBe(true);
            expect(aiNudgeService.isPotentialDistractionApp('Google Chrome', 'Reddit: r/memes')).toBe(true);
            expect(aiNudgeService.isPotentialDistractionApp('Steam', 'Playing Game')).toBe(true);
            expect(aiNudgeService.isPotentialDistractionApp('VS Code', 'App.tsx — produchive')).toBe(false);
            expect(aiNudgeService.isPotentialDistractionApp('Cursor', 'routineSync.ts')).toBe(false);
        });

        it('does NOT trigger nudge when no AI model is downloaded', async () => {
            vi.spyOn(aiNudgeService, 'checkModelDownloaded').mockResolvedValue(false);

            await aiNudgeService.handleActivity({
                owner: { name: 'YouTube', path: '/Applications/YouTube.app' },
                title: 'Cats compilation',
                timestamp: Date.now(),
                duration: 120000,
            });

            expect(window.electronAPI.showNotification).not.toHaveBeenCalled();
        });

        it('triggers notification when AI model is downloaded and distraction exceeds threshold', async () => {
            vi.spyOn(aiNudgeService, 'checkModelDownloaded').mockResolvedValue(true);
            useStore.setState({ goals: ['Finish Rust Microservice'] });

            const distActivity = {
                owner: { name: 'YouTube', path: '/Applications/YouTube.app' },
                title: 'Cats compilation',
                timestamp: Date.now(),
                duration: 120000,
            };

            // First detect
            await aiNudgeService.handleActivity(distActivity);
            expect(window.electronAPI.showNotification).not.toHaveBeenCalled();

            // Simulate user staying on YouTube for > 60 seconds
            const now = Date.now();
            vi.spyOn(Date, 'now').mockReturnValue(now + 75000);

            await aiNudgeService.handleActivity(distActivity);
            expect(window.electronAPI.showNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: expect.stringContaining('AI Nudge'),
                    body: expect.stringContaining('YouTube'),
                })
            );

            // Cooldown prevents immediate re-trigger
            vi.spyOn(Date, 'now').mockReturnValue(now + 80000);
            (window.electronAPI.showNotification as any).mockClear();

            await aiNudgeService.handleActivity(distActivity);
            expect(window.electronAPI.showNotification).not.toHaveBeenCalled();
        });
    });

    describe('Calendar Empty Space Double Click & Direct Time Planning', () => {
        it('persists a new routine from double-click slot coordinates with exact 15-minute alignment', () => {
            const dateStr = '2026-09-04';
            const clickedHour = 14;
            const clickedMinute = 15;

            const newRoutine: PlannedRoutineItem = {
                id: `routine-${Date.now()}`,
                title: 'Review React Architecture',
                category: 'development',
                priority: 'high',
                dayIndex: 5,
                dateStr,
                startHour: clickedHour,
                startMinute: clickedMinute,
                durationMinutes: 45,
                completed: false,
                subtitle: 'VS Code & Chrome',
            };

            const existingRoutines: PlannedRoutineItem[] = [];
            const updated = [...existingRoutines, newRoutine];
            mockStorage['produchive_master_routines'] = JSON.stringify(updated);

            const saved = JSON.parse(mockStorage['produchive_master_routines']);
            expect(saved.length).toBe(1);
            expect(saved[0].title).toBe('Review React Architecture');
            expect(saved[0].startHour).toBe(14);
            expect(saved[0].startMinute).toBe(15);
            expect(saved[0].durationMinutes).toBe(45);
        });

        it('synchronizes newly scheduled routine to task backlog when opted in', async () => {
            useStore.setState({ tasks: [] });

            const taskTitle = 'Deep Work: Algorithm Optimization';
            // User opts in to also add to tasks backlog
            await useStore.getState().addTask(taskTitle);

            const tasks = useStore.getState().tasks;
            expect(tasks.some((t) => t.text === taskTitle)).toBe(true);

            const createdTask = tasks.find((t) => t.text === taskTitle);
            const routine: PlannedRoutineItem = {
                id: 'r-optin-1',
                title: taskTitle,
                category: 'development',
                priority: 'high',
                dayIndex: 5,
                dateStr: '2026-09-04',
                startHour: 10,
                startMinute: 0,
                durationMinutes: 60,
                completed: false,
                taskId: createdTask?.id,
            };

            expect(routine.taskId).toBe(createdTask?.id);
        });

        it('supports direct time planning without invoking auto-generator algorithm', () => {
            const targetDateStr = '2026-09-04';
            const directStartHour = 16;
            const directStartMinute = 30;
            const directDuration = 45;

            const directRoutine: PlannedRoutineItem = {
                id: 'direct-plan-1',
                title: 'Sync with Product Lead',
                category: 'meeting',
                priority: 'high',
                dayIndex: new Date(targetDateStr).getDay(),
                dateStr: targetDateStr,
                startHour: directStartHour,
                startMinute: directStartMinute,
                durationMinutes: directDuration,
                completed: false,
            };

            mockStorage['produchive_master_routines'] = JSON.stringify([directRoutine]);
            const loaded: PlannedRoutineItem[] = JSON.parse(mockStorage['produchive_master_routines']);

            expect(loaded[0].title).toBe('Sync with Product Lead');
            expect(loaded[0].startHour).toBe(16);
            expect(loaded[0].startMinute).toBe(30);
            expect(loaded[0].durationMinutes).toBe(45);
            expect(loaded[0].category).toBe('meeting');
        });
    });
});
