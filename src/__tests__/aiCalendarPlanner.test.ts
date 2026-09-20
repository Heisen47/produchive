import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    extractJSONFromAIResponse,
    sanitizeAndValidateScheduleItems,
    markModelDownloaded,
    unmarkModelDownloaded,
    getPersistedDownloadedModels,
    hasAnyDownloadedModel,
    hasModelInCache,
    CACHED_MODELS_STORAGE_KEY,
    CalendarScheduleRequest,
    parseAIErrorMessage,
    isEngineInstanceError,
    generateAICalendarSchedule,
} from '../renderer/lib/ai';

describe('AI Calendar Schedule Planner', () => {
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

    describe('Model Persistence Across Sessions', () => {
        it('persists model download in localStorage so app remembers across closes', () => {
            markModelDownloaded('Qwen2.5-1.5B-Instruct-q4f32_1-MLC');
            expect(getPersistedDownloadedModels()).toContain('Qwen2.5-1.5B-Instruct-q4f32_1-MLC');

            const stored = JSON.parse(mockStorage[CACHED_MODELS_STORAGE_KEY]);
            expect(stored).toEqual(['Qwen2.5-1.5B-Instruct-q4f32_1-MLC']);
        });

        it('unmarks model when deleted by user', () => {
            markModelDownloaded('Llama-3.2-1B-Instruct-q4f32_1-MLC');
            expect(getPersistedDownloadedModels()).toContain('Llama-3.2-1B-Instruct-q4f32_1-MLC');

            unmarkModelDownloaded('Llama-3.2-1B-Instruct-q4f32_1-MLC');
            expect(getPersistedDownloadedModels()).not.toContain('Llama-3.2-1B-Instruct-q4f32_1-MLC');
        });

        it('hasAnyDownloadedModel returns persisted model immediately without requiring re-download', async () => {
            markModelDownloaded('Llama-3.2-1B-Instruct-q4f32_1-MLC');
            const detected = await hasAnyDownloadedModel();
            expect(detected).toBe('Llama-3.2-1B-Instruct-q4f32_1-MLC');
        });
    });

    describe('JSON Extraction from LLM Output', () => {
        it('extracts raw JSON array cleanly', () => {
            const raw = `[{"title": "Deep Focus", "category": "development", "startHour": 14, "startMinute": 0, "durationMinutes": 60}]`;
            const res = extractJSONFromAIResponse(raw);
            expect(Array.isArray(res)).toBe(true);
            expect(res[0].title).toBe('Deep Focus');
        });

        it('extracts JSON surrounded by markdown code fences and conversational filler', () => {
            const raw = `Here is your productive calendar schedule for today:\n\`\`\`json\n[{"title": "Code Review", "category": "development", "startHour": 15, "startMinute": 30, "durationMinutes": 45}]\n\`\`\`\nHope this helps!`;
            const res = extractJSONFromAIResponse(raw);
            expect(Array.isArray(res)).toBe(true);
            expect(res[0].title).toBe('Code Review');
        });
    });

    describe('Schedule Sanitization and Time Constraints', () => {
        const todayStr = new Date().toISOString().split('T')[0];

        it('ensures items for today do not start before current local time', () => {
            const request: CalendarScheduleRequest = {
                currentHour: 14,
                currentMinute: 30,
                targetDateStr: todayStr,
                timezone: 'Asia/Kolkata',
                allottedHours: 4,
            };

            const rawItems = [
                { title: 'Morning Coffee', category: 'break', startHour: 9, startMinute: 0, durationMinutes: 15 },
                { title: 'Backend Dev', category: 'development', startHour: 15, startMinute: 0, durationMinutes: 90 },
            ];

            const sanitized = sanitizeAndValidateScheduleItems(rawItems, request);
            expect(sanitized.length).toBe(2);

            // Morning task scheduled at 9:00 AM should be bumped forward to current time (14:30)
            const first = sanitized[0];
            const firstMins = first.startHour * 60 + first.startMinute;
            expect(firstMins).toBeGreaterThanOrEqual(14 * 60 + 30);

            // Subsequent task should be sequenced cleanly
            const second = sanitized[1];
            const secondMins = second.startHour * 60 + second.startMinute;
            expect(secondMins).toBeGreaterThanOrEqual(firstMins + first.durationMinutes);
        });

        it('resolves collisions sequentially so events never overlap', () => {
            const request: CalendarScheduleRequest = {
                currentHour: 10,
                currentMinute: 0,
                targetDateStr: todayStr,
            };

            const rawItems = [
                { title: 'Task 1', category: 'development', startHour: 11, startMinute: 0, durationMinutes: 60 },
                { title: 'Task 2', category: 'research', startHour: 11, startMinute: 30, durationMinutes: 60 }, // overlaps Task 1
            ];

            const sanitized = sanitizeAndValidateScheduleItems(rawItems, request);
            expect(sanitized.length).toBe(2);
            expect(sanitized[0].startHour).toBe(11);
            expect(sanitized[0].startMinute).toBe(0);

            // Task 2 must start at or after 12:00 (11:00 + 60m)
            const task2StartMins = sanitized[1].startHour * 60 + sanitized[1].startMinute;
            expect(task2StartMins).toBeGreaterThanOrEqual(12 * 60);
        });

        it('assigns valid categories, IDs, and priorities', () => {
            const request: CalendarScheduleRequest = {
                currentHour: 12,
                currentMinute: 0,
                targetDateStr: todayStr,
            };

            const rawItems = [
                { title: 'Invalid Category Task', category: 'gaming-unknown', startHour: 13, startMinute: 0, durationMinutes: 45 },
            ];

            const sanitized = sanitizeAndValidateScheduleItems(rawItems, request);
            expect(sanitized[0].category).toBe('development'); // default fallback
            expect(sanitized[0].id).toMatch(/^routine-ai-/);
            expect(sanitized[0].completed).toBe(false);
        });
    });

    describe('Error Parsing & Instance Reference Diagnostics', () => {
        it('translates "A valid external Instance reference no longer exists." into actionable user guidance', () => {
            const rawErr = new Error('A valid external Instance reference no longer exists.');
            expect(isEngineInstanceError(rawErr)).toBe(true);

            const parsed = parseAIErrorMessage(rawErr);
            expect(parsed).toContain('AI Engine Disconnected');
            expect(parsed).toContain('The local AI model instance was lost or disconnected from WebGPU memory');
            expect(parsed).not.toContain('external Instance reference');
        });

        it('translates RuntimeError TVM prefix without exposing raw internal Wasm errors', () => {
            const tvmErr = new Error('RuntimeError: A valid external Instance reference no longer exists at tvmjs.wasm');
            expect(isEngineInstanceError(tvmErr)).toBe(true);

            const parsed = parseAIErrorMessage(tvmErr);
            expect(parsed).toContain('AI Engine Disconnected');
            expect(parsed).toContain('Llama 3.2 1B');
        });

        it('recognizes GPU context drop and device lost errors', () => {
            const dropErr = new Error('WebGPU device lost: instance dropped due to system sleep');
            expect(isEngineInstanceError(dropErr)).toBe(true);

            const parsed = parseAIErrorMessage(dropErr);
            expect(parsed).toContain('AI Engine Disconnected');
        });

        it('recognizes VRAM exhaustion and provides clear GPU memory message', () => {
            const oomErr = new Error('WebGPU out of memory: unable to allocate buffer');
            const parsed = parseAIErrorMessage(oomErr);
            expect(parsed).toContain('GPU Memory Exhausted');
            expect(parsed).toContain('VRAM');
        });

        it('recognizes network errors during model fetching', () => {
            const netErr = new Error('Failed to fetch model weights: ERR_CONNECTION_TIMED_OUT');
            const parsed = parseAIErrorMessage(netErr);
            expect(parsed).toContain('Network Connection Error');
        });

        it('recognizes lack of WebGPU support', () => {
            const gpuErr = new Error('WebGPU is not supported on this platform');
            const parsed = parseAIErrorMessage(gpuErr);
            expect(parsed).toContain('WebGPU Not Supported');
        });

        it('recognizes insufficient disk space', () => {
            const diskErr = new Error('QuotaExceededError: storage limit reached');
            const parsed = parseAIErrorMessage(diskErr, 'Qwen 2.5 1.5B');
            expect(parsed).toContain('Insufficient Disk Space');
            expect(parsed).toContain('Qwen 2.5 1.5B');
        });

        it('returns false in isEngineInstanceError for non-instance errors', () => {
            expect(isEngineInstanceError(new Error('Network timeout'))).toBe(false);
            expect(isEngineInstanceError(new Error('Invalid task title'))).toBe(false);
            expect(isEngineInstanceError(null)).toBe(false);
        });
    });

    describe('Resilient JSON Extraction', () => {
        it('tolerates trailing commas in generated JSON arrays', () => {
            const withTrailingComma = `[
                {"title": "Task A", "category": "development", "startHour": 10, "startMinute": 0, "durationMinutes": 60,},
            ]`;
            const parsed = extractJSONFromAIResponse<any[]>(withTrailingComma);
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed.length).toBe(1);
            expect(parsed[0].title).toBe('Task A');
        });

        it('tolerates trailing commas in objects', () => {
            const withTrailingInObject = `[
                {"title": "Deep Work", "category": "development", "durationMinutes": 45, "priority": "high",}
            ]`;
            const parsed = extractJSONFromAIResponse<any[]>(withTrailingInObject);
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed[0].title).toBe('Deep Work');
        });

        it('recovers gracefully from completely unparseable input by returning empty array', () => {
            const garbage = 'Sorry, I cannot help you with that as an AI language model.';
            const parsed = extractJSONFromAIResponse<any[]>(garbage);
            expect(parsed).toEqual([]);
        });
    });

    describe('generateAICalendarSchedule Error Wrapping', () => {
        const testReq: CalendarScheduleRequest = {
            currentHour: 10,
            currentMinute: 0,
            targetDateStr: '2026-09-20',
        };

        it('wraps "A valid external Instance reference no longer exists" into a friendly Error', async () => {
            const deadEngine = {
                chat: {
                    completions: {
                        create: vi.fn().mockRejectedValue(new Error('A valid external Instance reference no longer exists.')),
                    },
                },
            };

            await expect(generateAICalendarSchedule(deadEngine, testReq)).rejects.toThrow(
                /AI Engine Disconnected/
            );
        });

        it('fails with clear error if engine is null', async () => {
            await expect(generateAICalendarSchedule(null, testReq)).rejects.toThrow(
                /AI Engine not initialized/
            );
        });
    });

    describe('Day and Multi-Day Contextual Scheduling', () => {
        it('assigns dateStr correctly across multi-day targetDates in week mode', () => {
            const request: CalendarScheduleRequest = {
                currentHour: 9,
                currentMinute: 0,
                targetDateStr: '2026-09-21',
                targetDates: ['2026-09-21', '2026-09-22', '2026-09-23'],
                planScope: 'week',
                totalWeeklyHours: 15,
            };

            const rawItems = [
                { title: 'Monday Sprint Kickoff', dateStr: '2026-09-21', startHour: 9, startMinute: 0, durationMinutes: 60 },
                { title: 'Tuesday Architecture Review', dateStr: '2026-09-22', startHour: 10, startMinute: 0, durationMinutes: 90 },
                { title: 'Wednesday Deep Focus', dateStr: '2026-09-23', startHour: 14, startMinute: 0, durationMinutes: 60 },
            ];

            const sanitized = sanitizeAndValidateScheduleItems(rawItems, request);
            expect(sanitized.length).toBe(3);
            expect(sanitized[0].dateStr).toBe('2026-09-21');
            expect(sanitized[1].dateStr).toBe('2026-09-22');
            expect(sanitized[2].dateStr).toBe('2026-09-23');

            // Day indices should match respective dates (2026-09-21 is Monday = 1)
            expect(sanitized[0].dayIndex).toBe(1);
            expect(sanitized[1].dayIndex).toBe(2);
            expect(sanitized[2].dayIndex).toBe(3);
        });

        it('distributes items missing dateStr evenly across targetDates', () => {
            const request: CalendarScheduleRequest = {
                currentHour: 9,
                currentMinute: 0,
                targetDateStr: '2026-09-21',
                targetDates: ['2026-09-21', '2026-09-22'],
                planScope: 'week',
            };

            const rawItems = [
                { title: 'Task 1', startHour: 9, startMinute: 0, durationMinutes: 60 },
                { title: 'Task 2', startHour: 10, startMinute: 0, durationMinutes: 60 },
            ];

            const sanitized = sanitizeAndValidateScheduleItems(rawItems, request);
            expect(sanitized.length).toBe(2);
            expect(sanitized[0].dateStr).toBe('2026-09-21');
            expect(sanitized[1].dateStr).toBe('2026-09-22');
        });

        it('resolves sequential collisions independently for each date without shifting other days', () => {
            const request: CalendarScheduleRequest = {
                currentHour: 9,
                currentMinute: 0,
                targetDateStr: '2026-09-21',
                targetDates: ['2026-09-21', '2026-09-22'],
                planScope: 'week',
            };

            const rawItems = [
                // Day 1: two colliding items at 9:00 AM
                { title: 'Mon Task A', dateStr: '2026-09-21', startHour: 9, startMinute: 0, durationMinutes: 60 },
                { title: 'Mon Task B', dateStr: '2026-09-21', startHour: 9, startMinute: 15, durationMinutes: 45 },
                // Day 2: one item at 9:00 AM
                { title: 'Tue Task C', dateStr: '2026-09-22', startHour: 9, startMinute: 0, durationMinutes: 60 },
            ];

            const sanitized = sanitizeAndValidateScheduleItems(rawItems, request);
            expect(sanitized.length).toBe(3);

            const monItems = sanitized.filter(i => i.dateStr === '2026-09-21');
            const tueItems = sanitized.filter(i => i.dateStr === '2026-09-22');

            expect(monItems.length).toBe(2);
            expect(monItems[0].startHour).toBe(9);
            expect(monItems[0].startMinute).toBe(0);
            // Collision on Monday: Mon Task B should be shifted after Mon Task A
            expect(monItems[1].startHour * 60 + monItems[1].startMinute).toBeGreaterThanOrEqual(10 * 60);

            // Tuesday item should NOT be affected by Monday collisions
            expect(tueItems.length).toBe(1);
            expect(tueItems[0].startHour).toBe(9);
            expect(tueItems[0].startMinute).toBe(0);
        });

        it('supports single day weekend schedule with appropriate date and dayIndex', () => {
            // 2026-09-20 is a Sunday (dayIndex = 0)
            const request: CalendarScheduleRequest = {
                currentHour: 9,
                currentMinute: 0,
                targetDateStr: '2026-09-20',
                dayOfWeekName: 'Sunday',
                isWeekend: true,
                planScope: 'day',
                allottedHours: 4,
            };

            const rawItems = [
                { title: 'Creative Writing & Side Project', category: 'writing', startHour: 10, startMinute: 0, durationMinutes: 60 },
                { title: 'Afternoon Nature Walk', category: 'break', startHour: 15, startMinute: 0, durationMinutes: 30 },
            ];

            const sanitized = sanitizeAndValidateScheduleItems(rawItems, request);
            expect(sanitized.length).toBe(2);
            expect(sanitized[0].dateStr).toBe('2026-09-20');
            expect(sanitized[0].dayIndex).toBe(0); // Sunday
            expect(sanitized[1].dateStr).toBe('2026-09-20');
            expect(sanitized[1].dayIndex).toBe(0);
        });
    });
});
