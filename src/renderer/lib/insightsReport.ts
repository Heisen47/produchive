import { extractActivityIdentity, formatDomainOnly, ProductivityAnalysis } from './productivityAnalysisService';

/** Inclusive range of local calendar days, as YYYY-MM-DD strings */
export interface DateRange {
    start: string;
    end: string;
}

export type RangePreset = 'today' | 'yesterday' | 'last7';

export type InsightCategory = 'productive' | 'neutral' | 'distracting';

export interface BreakdownItem {
    name: string;
    ms: number;
    category: InsightCategory;
}

export interface ActivityBreakdown {
    totalMs: number;
    productiveMs: number;
    neutralMs: number;
    distractingMs: number;
    items: BreakdownItem[];
}

/** A report as persisted in db.json ratings. Older reports only carry a timestamp. */
export interface StoredReport extends ProductivityAnalysis {
    id?: string;
    rangeStart?: string;
    rangeEnd?: string;
    breakdown?: ActivityBreakdown;
    focusSeconds?: number;
    plannedTaskCount?: number;
}

/** New tracked time needed before a report for an open range counts as out of date */
export const STALE_AFTER_MS = 5 * 60 * 1000;
/** Breakdown rows kept on a saved report, so it still explains itself once the logs are gone */
const MAX_STORED_ITEMS = 40;

export const toDateStr = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export const parseDateStr = (s: string): Date => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
};

export const addDays = (dateStr: string, n: number): string => {
    const d = parseDateStr(dateStr);
    d.setDate(d.getDate() + n);
    return toDateStr(d);
};

export const rangeForPreset = (preset: RangePreset, now: Date = new Date()): DateRange => {
    const today = toDateStr(now);
    if (preset === 'yesterday') {
        const y = addDays(today, -1);
        return { start: y, end: y };
    }
    if (preset === 'last7') return { start: addDays(today, -6), end: today };
    return { start: today, end: today };
};

export const singleDay = (dateStr: string): DateRange => ({ start: dateStr, end: dateStr });

export const isSingleDay = (range: DateRange): boolean => range.start === range.end;

export const sameRange = (a: DateRange, b: DateRange): boolean => a.start === b.start && a.end === b.end;

export const datesInRange = (range: DateRange): string[] => {
    const dates: string[] = [];
    for (let d = range.start; d <= range.end; d = addDays(d, 1)) dates.push(d);
    return dates;
};

export const rangeIncludes = (range: DateRange, dateStr: string): boolean =>
    dateStr >= range.start && dateStr <= range.end;

/** "Today", "Yesterday", "Last 7 days" or null when the range has no everyday name */
export const relativeRangeLabel = (range: DateRange, now: Date = new Date()): string | null => {
    if (sameRange(range, rangeForPreset('today', now))) return 'Today';
    if (sameRange(range, rangeForPreset('yesterday', now))) return 'Yesterday';
    if (sameRange(range, rangeForPreset('last7', now))) return 'Last 7 days';
    return null;
};

/** "Sunday, 25 October" for a day, "Mon 19 – Sun 25 October" for a range */
export const formatRangeTitle = (range: DateRange, now: Date = new Date()): string => {
    const start = parseDateStr(range.start);
    const sameYear = start.getFullYear() === now.getFullYear();
    if (isSingleDay(range)) {
        return start.toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }),
        });
    }
    const end = parseDateStr(range.end);
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    const startLabel = start.toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', ...(sameMonth ? {} : { month: 'short' }),
    });
    const endLabel = end.toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }),
    });
    return `${startLabel} – ${endLabel}`;
};

/** "2:31 PM" for today, "Sat 24 Oct, 9:12 PM" for any other day */
export const formatGeneratedAt = (timestamp: number, now: Date = new Date()): string => {
    const d = new Date(timestamp);
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (toDateStr(d) === toDateStr(now)) return time;
    const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    return `${day}, ${time}`;
};

export const formatDuration = (ms: number): string => {
    const totalMinutes = Math.round(ms / 60000);
    if (totalMinutes < 1) return ms > 0 ? '<1m' : '0m';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
};

/** The days a report covers. Reports saved before ranges existed cover the day they were made. */
export const reportRange = (report: StoredReport): DateRange | null => {
    if (report.rangeStart && report.rangeEnd) return { start: report.rangeStart, end: report.rangeEnd };
    if (typeof report.timestamp === 'number') return singleDay(toDateStr(new Date(report.timestamp)));
    return null;
};

const isUsableReport = (r: any): r is StoredReport =>
    !!r && typeof r === 'object' && !!r.verdict && r.rating !== undefined && !!r.categorization;

/** Reports for exactly this range, newest first */
export const reportsForRange = (ratings: unknown[], range: DateRange): StoredReport[] =>
    (ratings || [])
        .filter(isUsableReport)
        .filter((r) => {
            const rr = reportRange(r);
            return !!rr && sameRange(rr, range);
        })
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

/** Latest single-day score per date, for the day strip */
export const latestScoresByDay = (ratings: unknown[], dates: string[]): Record<string, number> => {
    const wanted = new Set(dates);
    const latest: Record<string, { score: number; ts: number }> = {};
    (ratings || []).filter(isUsableReport).forEach((r) => {
        const rr = reportRange(r);
        if (!rr || !isSingleDay(rr) || !wanted.has(rr.start)) return;
        const score = typeof r.rating === 'number' ? r.rating : parseInt(String(r.rating), 10);
        if (isNaN(score)) return;
        const ts = r.timestamp || 0;
        if (!latest[rr.start] || ts >= latest[rr.start].ts) latest[rr.start] = { score, ts };
    });
    return Object.fromEntries(Object.entries(latest).map(([d, v]) => [d, v.score]));
};

const normalizeName = (s: string): string => formatDomainOnly(s).trim().toLowerCase();

/**
 * Totals tracked time per activity and per category. When a report is given, its categorization
 * decides each activity's category; anything it didn't list falls back to the built-in heuristic.
 */
export const summarizeActivities = (
    activities: Array<{ title: string; owner?: { name: string }; duration?: number }>,
    categorization?: ProductivityAnalysis['categorization'],
    goals: string[] = []
): ActivityBreakdown => {
    const reportCategory = new Map<string, InsightCategory>();
    if (categorization) {
        (['productive', 'neutral', 'distracting'] as const).forEach((cat) => {
            (categorization[cat] || []).forEach((name) => reportCategory.set(normalizeName(name), cat));
        });
    }

    const byName = new Map<string, BreakdownItem>();
    (activities || []).forEach((a) => {
        const ms = a.duration || 0;
        if (ms <= 0) return;
        const identity = extractActivityIdentity(a.owner?.name || 'Unknown', a.title || '', goals);
        const name = formatDomainOnly(identity.displayName) || identity.displayName;
        const heuristic: InsightCategory = identity.isDistracting ? 'distracting' : identity.isProductive ? 'productive' : 'neutral';
        const category = reportCategory.get(normalizeName(name)) || heuristic;
        const prev = byName.get(name);
        if (prev) prev.ms += ms;
        else byName.set(name, { name, ms, category });
    });

    const items = Array.from(byName.values()).sort((a, b) => b.ms - a.ms);
    const sum = (cat: InsightCategory) => items.filter((i) => i.category === cat).reduce((s, i) => s + i.ms, 0);
    const productiveMs = sum('productive');
    const neutralMs = sum('neutral');
    const distractingMs = sum('distracting');
    return { totalMs: productiveMs + neutralMs + distractingMs, productiveMs, neutralMs, distractingMs, items };
};

/** Trims a breakdown to what is worth saving alongside a report */
export const compactBreakdown = (b: ActivityBreakdown): ActivityBreakdown => ({
    ...b,
    items: b.items.slice(0, MAX_STORED_ITEMS),
});

/**
 * Tracked time added since the report was made, or 0 when the report is current.
 * Only ranges that include today can still gain activity.
 */
export const newActivitySinceReport = (
    report: StoredReport,
    currentTotalMs: number,
    now: Date = new Date()
): number => {
    const range = reportRange(report);
    if (!range || !rangeIncludes(range, toDateStr(now)) || !report.breakdown) return 0;
    const added = currentTotalMs - report.breakdown.totalMs;
    return added >= STALE_AFTER_MS ? added : 0;
};

export const focusSessionsInRange = <T extends { startedAt: number | string }>(sessions: T[], range: DateRange): T[] =>
    (sessions || []).filter((s) => rangeIncludes(range, toDateStr(new Date(s.startedAt))));

/** The last `count` days ending today, oldest first */
export const recentDays = (count: number, now: Date = new Date()): string[] => {
    const today = toDateStr(now);
    return Array.from({ length: count }, (_, i) => addDays(today, -(count - 1 - i)));
};
