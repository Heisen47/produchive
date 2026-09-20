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
    CalendarScheduleRequest
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
});
