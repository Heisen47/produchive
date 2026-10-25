import { describe, it, expect, vi } from 'vitest';
import {
    addDays,
    datesInRange,
    focusSessionsInRange,
    formatDuration,
    formatGeneratedAt,
    formatRangeTitle,
    latestScoresByDay,
    newActivitySinceReport,
    rangeForPreset,
    recentDays,
    relativeRangeLabel,
    reportRange,
    reportsForRange,
    summarizeActivities,
    toDateStr,
    StoredReport,
    ActivityBreakdown,
} from '../renderer/lib/insightsReport';
import { generateProductivityAnalysis } from '../renderer/lib/productivityAnalysisService';

// Sunday 25 October 2026, 2:31 PM local
const NOW = new Date(2026, 9, 25, 14, 31);
const at = (dateStr: string, hour = 12) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, hour).getTime();
};
const report = (over: Partial<StoredReport>): StoredReport => ({
    rating: 7,
    verdict: 'productive',
    explanation: 'x',
    tips: [],
    categorization: { productive: [], neutral: [], distracting: [] },
    ...over,
});

describe('date ranges', () => {
    it('builds presets from local days', () => {
        expect(rangeForPreset('today', NOW)).toEqual({ start: '2026-10-25', end: '2026-10-25' });
        expect(rangeForPreset('yesterday', NOW)).toEqual({ start: '2026-10-24', end: '2026-10-24' });
        expect(rangeForPreset('last7', NOW)).toEqual({ start: '2026-10-19', end: '2026-10-25' });
    });

    it('crosses month and year boundaries', () => {
        expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
        expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
        expect(datesInRange({ start: '2026-10-30', end: '2026-11-02' })).toEqual([
            '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02',
        ]);
    });

    it('lists recent days oldest first, ending today', () => {
        expect(recentDays(3, NOW)).toEqual(['2026-10-23', '2026-10-24', '2026-10-25']);
    });

    it('names ranges in plain words', () => {
        expect(relativeRangeLabel({ start: '2026-10-25', end: '2026-10-25' }, NOW)).toBe('Today');
        expect(relativeRangeLabel({ start: '2026-10-24', end: '2026-10-24' }, NOW)).toBe('Yesterday');
        expect(relativeRangeLabel({ start: '2026-10-19', end: '2026-10-25' }, NOW)).toBe('Last 7 days');
        expect(relativeRangeLabel({ start: '2026-10-20', end: '2026-10-20' }, NOW)).toBeNull();
        expect(formatRangeTitle({ start: '2026-10-25', end: '2026-10-25' }, NOW)).toBe('Sunday 25 October');
        expect(formatRangeTitle({ start: '2026-10-19', end: '2026-10-25' }, NOW)).toBe('Mon 19 – Sun 25 October');
        expect(formatRangeTitle({ start: '2025-12-31', end: '2025-12-31' }, NOW)).toContain('2025');
    });

    it('shows a time for today and a date for older reports', () => {
        expect(formatGeneratedAt(NOW.getTime(), NOW)).toBe('2:31 PM');
        expect(formatGeneratedAt(at('2026-10-24', 21), NOW)).toBe('Sat 24 Oct, 9:00 PM');
    });

    it('formats durations in hours and minutes', () => {
        expect(formatDuration(0)).toBe('0m');
        expect(formatDuration(20_000)).toBe('<1m');
        expect(formatDuration(45 * 60_000)).toBe('45m');
        expect(formatDuration(120 * 60_000)).toBe('2h');
        expect(formatDuration(372 * 60_000)).toBe('6h 12m');
    });
});

describe('report persistence per range', () => {
    const ratings = [
        report({ id: 'legacy', timestamp: at('2026-10-24', 18), rating: 5 }),
        report({ id: 'old-today', timestamp: at('2026-10-25', 9), rangeStart: '2026-10-25', rangeEnd: '2026-10-25', rating: 6 }),
        report({ id: 'new-today', timestamp: at('2026-10-25', 14), rangeStart: '2026-10-25', rangeEnd: '2026-10-25', rating: 8 }),
        report({ id: 'week', timestamp: at('2026-10-25', 15), rangeStart: '2026-10-19', rangeEnd: '2026-10-25', rating: 7 }),
        { garbage: true },
    ];

    it('dates legacy reports by the day they were generated', () => {
        expect(reportRange(ratings[0] as StoredReport)).toEqual({ start: '2026-10-24', end: '2026-10-24' });
    });

    it('returns only reports for exactly that range, newest first', () => {
        expect(reportsForRange(ratings, { start: '2026-10-25', end: '2026-10-25' }).map((r) => r.id)).toEqual(['new-today', 'old-today']);
        expect(reportsForRange(ratings, { start: '2026-10-19', end: '2026-10-25' }).map((r) => r.id)).toEqual(['week']);
        expect(reportsForRange(ratings, { start: '2026-10-23', end: '2026-10-23' })).toEqual([]);
    });

    it('keeps the latest single-day score per date, ignoring week reports', () => {
        expect(latestScoresByDay(ratings, ['2026-10-23', '2026-10-24', '2026-10-25'])).toEqual({
            '2026-10-24': 5,
            '2026-10-25': 8,
        });
    });
});

describe('activity breakdown', () => {
    const activities = [
        { title: 'store.ts - produchive - Visual Studio Code', owner: { name: 'Code' }, duration: 90 * 60_000 },
        { title: 'insights.ts - produchive - Visual Studio Code', owner: { name: 'Code' }, duration: 30 * 60_000 },
        { title: 'MrBeast - $1,000,000 Challenge - YouTube - Google Chrome', owner: { name: 'Google Chrome' }, duration: 40 * 60_000 },
        { title: 'Finder', owner: { name: 'Finder' }, duration: 0 },
    ];

    it('totals time per activity and category', () => {
        const b = summarizeActivities(activities);
        expect(b.totalMs).toBe(160 * 60_000);
        expect(b.distractingMs).toBe(40 * 60_000);
        expect(b.items[0].ms).toBeGreaterThanOrEqual(b.items[1].ms);
        expect(b.items.some((i) => i.ms === 0)).toBe(false);
    });

    it("follows the report's categorization when it names an activity", () => {
        const heuristic = summarizeActivities(activities);
        const youtube = heuristic.items.find((i) => i.category === 'distracting')!;
        const b = summarizeActivities(activities, { productive: [youtube.name], neutral: [], distracting: [] });
        expect(b.distractingMs).toBe(0);
        expect(b.productiveMs).toBe(heuristic.productiveMs + youtube.ms);
    });
});

describe('staleness', () => {
    const base: ActivityBreakdown = { totalMs: 60 * 60_000, productiveMs: 0, neutralMs: 0, distractingMs: 0, items: [] };

    it('flags reports for ranges including today once 5+ minutes were added', () => {
        const r = report({ rangeStart: '2026-10-25', rangeEnd: '2026-10-25', breakdown: base });
        expect(newActivitySinceReport(r, 63 * 60_000, NOW)).toBe(0);
        expect(newActivitySinceReport(r, 72 * 60_000, NOW)).toBe(12 * 60_000);
    });

    it('never flags closed days or reports without a saved breakdown', () => {
        expect(newActivitySinceReport(report({ rangeStart: '2026-10-24', rangeEnd: '2026-10-24', breakdown: base }), 999 * 60_000, NOW)).toBe(0);
        expect(newActivitySinceReport(report({ timestamp: NOW.getTime() }), 999 * 60_000, NOW)).toBe(0);
    });
});

describe('focus sessions', () => {
    it('keeps only sessions started inside the range', () => {
        const sessions = [
            { startedAt: at('2026-10-24'), scene: 'cafe' },
            { startedAt: new Date(at('2026-10-25')).toISOString(), scene: 'library' },
        ];
        expect(focusSessionsInRange(sessions, { start: '2026-10-25', end: '2026-10-25' }).map((s) => s.scene)).toEqual(['library']);
        expect(toDateStr(new Date(at('2026-10-25')))).toBe('2026-10-25');
    });
});

describe('analysis prompt', () => {
    it('names the period, uses planned tasks from the range and asks for second person', async () => {
        const create = vi.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify({ rating: 8, verdict: 'productive', explanation: 'You coded.', tips: [], categorization: {} }) } }],
        });
        const result = await generateProductivityAnalysis({
            activities: [{ title: 'a.ts - Visual Studio Code', owner: { name: 'Code' }, duration: 60_000 }],
            routines: [
                { dateStr: '2026-10-21', title: 'Write sync tests', category: 'work', durationMinutes: 60 },
                { dateStr: '2026-10-10', title: 'Old task', category: 'work', durationMinutes: 60 },
            ],
            range: { start: '2026-10-19', end: '2026-10-25' },
            periodLabel: 'Mon 19 – Sun 25 October',
            engine: { chat: { completions: { create } } },
        });
        const prompt: string = create.mock.calls[0][0].messages[1].content;
        expect(prompt).toContain('Period analysed: Mon 19 – Sun 25 October');
        expect(prompt).toContain('Write sync tests');
        expect(prompt).not.toContain('Old task');
        expect(prompt).toMatch(/directly as "you"/);
        // Empty tips from the model fall back to concrete heuristic tips, never filler
        expect(result.tips.length).toBeGreaterThan(0);
        expect(result.tips.join(' ')).not.toMatch(/keep up/i);
    });
});
