import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { studyAssistantService, StudiedTopic } from '../renderer/lib/studyAssistantService';
import { useStore } from '../renderer/lib/store';
import { PlannedRoutineItem } from '../renderer/types/routine';
import * as webllm from '@mlc-ai/web-llm';
import {
    hasModelInCache,
    hasAnyDownloadedModel,
    deleteModelFromCache,
    getModelCacheUsageMB,
    initEngine,
    markModelDownloaded,
    getPersistedDownloadedModels,
    MODELS_CHANGED_EVENT,
} from '../renderer/lib/ai';

vi.mock('@mlc-ai/web-llm', () => ({
    CreateMLCEngine: vi.fn(),
    hasModelInCache: vi.fn(),
    deleteModelAllInfoInCache: vi.fn(),
    prebuiltAppConfig: { model_list: [] },
}));

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

describe('Study Assistant AI model persistence', () => {
    const MODEL_ID = 'Llama-3.2-1B-Instruct-q4f32_1-MLC';
    let mockStorage: Record<string, string> = {};
    const dispatchEvent = vi.fn();
    const estimate = vi.fn();
    let cacheStore: Record<string, string[]> = {};

    beforeEach(() => {
        mockStorage = {};
        vi.mocked(webllm.hasModelInCache).mockReset();
        vi.mocked(webllm.deleteModelAllInfoInCache).mockReset().mockResolvedValue(undefined);
        vi.mocked(webllm.CreateMLCEngine).mockReset().mockResolvedValue({ id: 'engine' } as any);
        dispatchEvent.mockReset();
        estimate.mockReset().mockResolvedValue({ quota: 100 * 1024 ** 3, usage: 0 });

        vi.stubGlobal('localStorage', {
            getItem: (key: string) => mockStorage[key] || null,
            setItem: (key: string, value: string) => { mockStorage[key] = value; },
            removeItem: (key: string) => { delete mockStorage[key]; },
            clear: () => { mockStorage = {}; },
        });
        vi.stubGlobal('window', { dispatchEvent });
        cacheStore = {
            'webllm/model': [
                `https://huggingface.co/mlc-ai/${MODEL_ID}/resolve/main/params_shard_0.bin`,
                `https://huggingface.co/mlc-ai/${MODEL_ID}/resolve/main/params_shard_1.bin`,
                'https://huggingface.co/mlc-ai/gemma-2-2b-it-q4f32_1-MLC/resolve/main/params_shard_0.bin',
            ],
            other: [`https://example.com/${MODEL_ID}/unrelated`],
        };
        vi.stubGlobal('caches', {
            keys: async () => Object.keys(cacheStore),
            open: async (name: string) => ({
                keys: async () => cacheStore[name].map((url) => ({ url })),
                match: async () => new Response('', { headers: { 'content-length': String(32 * 1024 * 1024) } }),
                delete: async (req: { url: string }) => {
                    cacheStore[name] = cacheStore[name].filter((u) => u !== req.url);
                    return true;
                },
            }),
        });
        vi.stubGlobal('navigator', { gpu: {}, storage: { estimate } });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('reports a fully cached model as installed and remembers it', async () => {
        vi.mocked(webllm.hasModelInCache).mockResolvedValue(true);

        expect(await hasModelInCache(MODEL_ID)).toBe(true);
        expect(webllm.hasModelInCache).toHaveBeenCalledWith(MODEL_ID, webllm.prebuiltAppConfig);
        expect(getPersistedDownloadedModels()).toContain(MODEL_ID);
    });

    it('treats a partially downloaded model as not installed and clears the stale marker', async () => {
        markModelDownloaded(MODEL_ID);
        vi.mocked(webllm.hasModelInCache).mockResolvedValue(false);

        expect(await hasModelInCache(MODEL_ID)).toBe(false);
        expect(getPersistedDownloadedModels()).not.toContain(MODEL_ID);
        expect(await hasAnyDownloadedModel()).toBeNull();
    });

    it('finds the installed model on relaunch', async () => {
        vi.mocked(webllm.hasModelInCache).mockImplementation(async (id: string) => id === MODEL_ID);

        expect(await hasAnyDownloadedModel()).toBe(MODEL_ID);
    });

    it('loads a cached model from disk without the download pre-flight', async () => {
        vi.mocked(webllm.hasModelInCache).mockResolvedValue(true);
        const progress = vi.fn();

        const result = await initEngine(progress, MODEL_ID);

        expect(result.modelName).toBe(MODEL_ID);
        expect(estimate).not.toHaveBeenCalled();
        expect(progress.mock.calls[0][0].text).toBe('Llama 3.2 1B is installed. Loading from disk...');
        expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: MODELS_CHANGED_EVENT }));
    });

    it('runs the download pre-flight when the model is not cached', async () => {
        vi.mocked(webllm.hasModelInCache).mockResolvedValue(false);
        const progress = vi.fn();

        await initEngine(progress, MODEL_ID);

        expect(estimate).toHaveBeenCalled();
        expect(progress.mock.calls[0][0].text).toBe(`Initializing ${MODEL_ID}...`);
        expect(getPersistedDownloadedModels()).toContain(MODEL_ID);
    });

    it('deletes all model files and notifies the UI', async () => {
        markModelDownloaded(MODEL_ID);
        vi.mocked(webllm.hasModelInCache).mockResolvedValue(true);

        await deleteModelFromCache(MODEL_ID);

        expect(webllm.deleteModelAllInfoInCache).toHaveBeenCalledWith(MODEL_ID, webllm.prebuiltAppConfig);
        expect(getPersistedDownloadedModels()).not.toContain(MODEL_ID);
        expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: MODELS_CHANGED_EVENT }));
    });

    it('measures and clears an unfinished download without touching other models', async () => {
        vi.mocked(webllm.hasModelInCache).mockResolvedValue(false);

        expect(await getModelCacheUsageMB(MODEL_ID)).toBe(64);

        await deleteModelFromCache(MODEL_ID);

        // web-llm's cleanup would re-fetch the missing tensor-cache.json, so it is skipped
        expect(webllm.deleteModelAllInfoInCache).not.toHaveBeenCalled();
        expect(cacheStore['webllm/model']).toEqual([
            'https://huggingface.co/mlc-ai/gemma-2-2b-it-q4f32_1-MLC/resolve/main/params_shard_0.bin',
        ]);
        expect(cacheStore.other).toHaveLength(1);
        expect(await getModelCacheUsageMB(MODEL_ID)).toBe(0);
    });
});
