import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Loader2, Lightbulb, Clock, BookOpen, CalendarCheck, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { useStore } from '../lib/store';
import { ActivityHeatmap } from './ActivityHeatmap';
import { ShareCard } from './ShareCard';
import { useTheme } from './ThemeProvider';
import { generateProductivityAnalysis, formatDomainOnly } from '../lib/productivityAnalysisService';
import {
    DateRange,
    StoredReport,
    compactBreakdown,
    datesInRange,
    focusSessionsInRange,
    formatDuration,
    formatGeneratedAt,
    formatRangeTitle,
    isSingleDay,
    latestScoresByDay,
    newActivitySinceReport,
    rangeForPreset,
    rangeIncludes,
    recentDays,
    relativeRangeLabel,
    reportsForRange,
    summarizeActivities,
    toDateStr,
} from '../lib/insightsReport';
import { InsightsDayPicker } from './InsightsDayPicker';
import { CategoryLists, TimeSplitBar } from './InsightsTimeBreakdown';
import { TrackedActivitiesModal } from './TrackedActivitiesModal';
import confetti from 'canvas-confetti';

interface ProductivityJudgeProps {
    engine: any;
    /** Name of the loaded model as shown in the top bar, e.g. "Gemma 2 2B" */
    modelLabel?: string;
    onNavigate?: (view: string) => void;
}

const VERDICT_LABEL: Record<string, string> = {
    productive: 'Productive',
    neutral: 'Mixed',
    unproductive: 'Off track',
};

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400';
const sceneLabel: Record<string, string> = { classroom: 'Classroom', cafe: 'Café', library: 'Library' };

export const ProductivityJudge = ({ engine, modelLabel, onNavigate }: ProductivityJudgeProps) => {
    const { goals, activities, addRating, selectedRole, customPrompt, routines, loadRoutines, ratings } = useStore();
    const { isDark } = useTheme();

    const [range, setRange] = useState<DateRange>(() => rangeForPreset('today'));
    const [pickedReportTs, setPickedReportTs] = useState<number | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [focusSessions, setFocusSessions] = useState<any[]>([]);
    const [pastActivities, setPastActivities] = useState<Record<string, any[]>>({});
    const [loadingDays, setLoadingDays] = useState(false);
    const [activitiesModalCategory, setActivitiesModalCategory] = useState<'all' | 'productive' | 'neutral' | 'distracting' | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const todayStr = toDateStr(new Date());
    const days = recentDays(7);

    useEffect(() => {
        const handleRoutineUpdate = () => loadRoutines();
        window.addEventListener('produchive_routine_updated', handleRoutineUpdate);
        return () => window.removeEventListener('produchive_routine_updated', handleRoutineUpdate);
    }, [loadRoutines]);

    useEffect(() => {
        const api = (window as any).electronAPI;
        api?.getFocusSessions?.().then((s: any[]) => setFocusSessions(s || [])).catch(() => {});
    }, []);

    // Past days come from their activity log files; today stays live from the store
    useEffect(() => {
        setPickedReportTs(null);
        setError(null);
        const pastDates = datesInRange(range).filter((d) => d !== todayStr);
        if (pastDates.length === 0) return;
        let cancelled = false;
        setLoadingDays(true);
        window.electronAPI
            .getActivityDataRange(pastDates[0], pastDates[pastDates.length - 1])
            .then((byDay: any) => {
                if (cancelled) return;
                const next: Record<string, any[]> = {};
                pastDates.forEach((d) => { next[d] = byDay?.[d]?.activities || []; });
                setPastActivities((prev) => ({ ...prev, ...next }));
            })
            .catch(() => {})
            .finally(() => !cancelled && setLoadingDays(false));
        return () => { cancelled = true; };
    }, [range.start, range.end, todayStr]);

    const rangeActivities = useMemo(
        () => datesInRange(range).flatMap((d) => (d === todayStr ? activities || [] : pastActivities[d] || [])),
        [range, todayStr, activities, pastActivities]
    );

    const plannedItems = (routines || []).filter(
        (r) => rangeIncludes(range, r.dateStr) && !r.isAutoDetected && r.category !== 'meal' && r.category !== 'break' && r.category !== 'sleep'
    );
    const plannedTitles = plannedItems.map((r) => r.title.trim()).filter(Boolean);
    // Legacy goals only ever describe today
    const effectiveGoals = plannedTitles.length > 0 ? plannedTitles : rangeIncludes(range, todayStr) ? goals : [];

    const rangeFocusSessions = focusSessionsInRange(focusSessions, range);
    const rangeFocusSeconds = rangeFocusSessions.reduce((s: number, f: any) => s + (f.durationSeconds || 0), 0);

    const reports = reportsForRange(ratings, range);
    const report: StoredReport | undefined = reports.find((r) => r.timestamp === pickedReportTs) || reports[0];

    const liveBreakdown = useMemo(
        () => summarizeActivities(rangeActivities, report?.categorization, effectiveGoals),
        // effectiveGoals is derived each render; its contents are what matter
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [rangeActivities, report, effectiveGoals.join('|')]
    );
    // The report explains itself with the numbers it was scored on; older reports fall back to the logs
    const breakdown = report?.breakdown?.items?.length ? report.breakdown : liveBreakdown;
    const newSinceMs = report ? newActivitySinceReport(report, liveBreakdown.totalMs) : 0;

    const scores = latestScoresByDay(ratings, days);
    const weekReport = reportsForRange(ratings, rangeForPreset('last7'))[0];
    const weekScore = weekReport ? Number(weekReport.rating) : undefined;

    const relative = relativeRangeLabel(range);
    const title = formatRangeTitle(range);
    const isDay = isSingleDay(range);
    const periodNoun = isDay ? 'day' : 'week';
    const hasData = liveBreakdown.totalMs > 0;
    const includesToday = rangeIncludes(range, todayStr);

    const triggerConfetti = () => {
        if (!canvasRef.current) return;
        confetti.create(canvasRef.current, { resize: true, useWorker: true, disableForReducedMotion: true })({
            particleCount: 80,
            spread: 140,
            origin: { y: 0.3 },
        });
    };

    const generateReport = async () => {
        setError(null);
        if (!hasData) return;
        setAnalyzing(true);
        try {
            const result = await generateProductivityAnalysis({
                activities: rangeActivities,
                routines,
                goals: effectiveGoals,
                selectedRole,
                customPrompt,
                focusSessions: rangeFocusSessions,
                engine,
                modelName: modelLabel,
                range,
                periodLabel: relative ? `${relative.toLowerCase()} (${title})` : title,
            });
            const stored: StoredReport = {
                ...result,
                modelName: result.usedModel ? modelLabel || result.modelName : 'Quick estimate',
                rangeStart: range.start,
                rangeEnd: range.end,
                breakdown: compactBreakdown(summarizeActivities(rangeActivities, result.categorization, effectiveGoals)),
                focusSeconds: rangeFocusSeconds,
                plannedTaskCount: plannedTitles.length,
            };
            addRating(stored);
            setPickedReportTs(null);
            if (result.rating >= 7) setTimeout(triggerConfetti, 300);
        } catch (err: any) {
            setError(err?.message || 'Something went wrong while generating the report.');
        } finally {
            setAnalyzing(false);
        }
    };

    const categorizationFromBreakdown = {
        productive: breakdown.items.filter((i) => i.category === 'productive').map((i) => i.name),
        neutral: breakdown.items.filter((i) => i.category === 'neutral').map((i) => i.name),
        distracting: breakdown.items.filter((i) => i.category === 'distracting').map((i) => i.name),
    };

    const generateLabel = analyzing ? 'Generating report…' : report ? 'Regenerate' : isDay ? 'Generate report' : 'Generate weekly report';

    const renderGenerateButton = (primary: boolean) => (
        <button
            type="button"
            onClick={generateReport}
            disabled={analyzing || !hasData}
            className={`inline-flex items-center gap-2 rounded-xl font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${focusRing} ${
                primary
                    ? 'px-5 py-2.5 text-sm bg-indigo-500 hover:bg-indigo-400 text-white'
                    : 'px-3.5 py-2 text-sm border hover:bg-indigo-500/10'
            }`}
            style={primary ? undefined : { borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
        >
            {analyzing ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : report ? <RefreshCw size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
            {generateLabel}
        </button>
    );

    const scoreNumber = report ? (typeof report.rating === 'number' ? report.rating : parseInt(String(report.rating), 10)) : null;

    return (
        <div
            className="mt-2 space-y-8"
            style={{ '--insights-link': isDark ? '#a5b4fc' : '#4338ca', '--insights-warn': isDark ? '#fde68a' : '#92400e' } as React.CSSProperties}
        >
            <InsightsDayPicker days={days} scores={scores} weekScore={weekScore} range={range} onChange={setRange} />

            {/* Period header: what is being reviewed, how much data, which report */}
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    {relative && <p className="text-sm font-medium text-[color:var(--insights-link)]">{relative}</p>}
                    <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {title}
                    </h2>
                    <p className="mt-2 text-sm flex flex-wrap gap-x-4 gap-y-1" style={{ color: 'var(--text-secondary)' }}>
                        <span className="flex items-center gap-1.5">
                            <Clock size={14} aria-hidden="true" />
                            {loadingDays ? 'Loading activity…' : liveBreakdown.totalMs === 0 ? 'No activity tracked' : `${formatDuration(liveBreakdown.totalMs)} tracked${includesToday && isDay ? ' so far' : ''}`}
                        </span>
                        {report?.timestamp && (
                            <span>
                                Report generated {formatGeneratedAt(report.timestamp)}
                                {report.modelName === 'Quick estimate'
                                    ? ' as a quick estimate (no AI model)'
                                    : report.modelName ? ` with ${report.modelName.replace(/ \(Local WebGPU\)$/, '')}` : ''}
                            </span>
                        )}
                    </p>
                </div>
                {report && (
                    <div className="flex items-center gap-2">
                        {reports.length > 1 && (
                            <label className="text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                                <span className="sr-only">Show an earlier report for this {periodNoun}</span>
                                <select
                                    value={report.timestamp}
                                    onChange={(e) => setPickedReportTs(Number(e.target.value))}
                                    className={`rounded-xl px-3 py-2 text-sm border cursor-pointer ${focusRing}`}
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                                >
                                    {reports.map((r, i) => (
                                        <option key={r.timestamp ?? i} value={r.timestamp}>
                                            {i === 0 ? 'Latest' : formatGeneratedAt(r.timestamp || 0)}: {r.rating}/10
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                        {renderGenerateButton(false)}
                        <ShareCard analysis={report} goals={effectiveGoals} dateLabel={title} modelName={report.modelName} />
                    </div>
                )}
            </header>

            <div aria-live="polite" className="sr-only">{analyzing ? 'Generating report' : ''}</div>

            {error && (
                <div role="alert" className="rounded-xl px-4 py-3 text-sm flex items-start gap-2 border border-rose-500/40 bg-rose-500/10" style={{ color: 'var(--text-primary)' }}>
                    <AlertCircle size={16} className="text-rose-400 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>Couldn't generate the report. {error}</span>
                </div>
            )}

            {newSinceMs > 0 && !analyzing && (
                <div role="status" className="rounded-xl px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3 border border-amber-400/30 bg-amber-400/10" style={{ color: 'var(--text-primary)' }}>
                    <span className="flex items-center gap-2">
                        <Clock size={16} className="text-[color:var(--insights-warn)]" aria-hidden="true" />
                        You've tracked {formatDuration(newSinceMs)} more since this report.
                    </span>
                    <button type="button" onClick={generateReport} className={`font-semibold text-[color:var(--insights-warn)] hover:underline cursor-pointer rounded ${focusRing}`}>
                        Regenerate
                    </button>
                </div>
            )}

            {!hasData && !loadingDays ? (
                /* Nothing tracked for this period */
                <section className="rounded-2xl p-8 border text-center" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-secondary)' }}>
                    <h3 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Nothing tracked {isDay ? (relative === 'Today' ? 'yet today' : 'on this day') : 'in these 7 days'}
                    </h3>
                    <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
                        {includesToday
                            ? 'Produchive records the apps you use while tracking is on. Turn it on from the Dashboard, then come back for a report.'
                            : 'No activity was recorded, so there is nothing to review. Pick another day above.'}
                    </p>
                    {includesToday && onNavigate && (
                        <button type="button" onClick={() => onNavigate('dashboard')} className={`mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-500 hover:bg-indigo-400 text-white cursor-pointer ${focusRing}`}>
                            Go to Dashboard
                        </button>
                    )}
                </section>
            ) : (
                <section
                    aria-label={report ? `Report for ${title}` : `Activity for ${title}`}
                    className="relative rounded-2xl border overflow-hidden"
                    style={{ background: isDark ? 'rgba(15, 22, 41, 0.85)' : 'var(--bg-card-solid)', borderColor: 'var(--border-primary)' }}
                >
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" aria-hidden="true" />

                    {/* Score and summary, or the call to generate one */}
                    <div className="p-6 md:p-8 grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
                        {report && scoreNumber !== null ? (
                            <>
                                <div className="flex md:flex-col items-baseline md:items-start gap-3 md:gap-1 md:pr-8 md:border-r" style={{ borderColor: 'var(--border-secondary)' }}>
                                    <p className="font-display font-bold leading-none tabular-nums" style={{ color: 'var(--text-primary)' }}>
                                        <span className="text-6xl md:text-7xl">{scoreNumber}</span>
                                        <span className="text-2xl" style={{ color: 'var(--text-secondary)' }}>/10</span>
                                    </p>
                                    <p className="text-base font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                        {VERDICT_LABEL[report.verdict] || report.verdict} {periodNoun}
                                    </p>
                                </div>
                                <p className="text-lg leading-relaxed max-w-[68ch]" style={{ color: 'var(--text-primary)' }}>
                                    {formatDomainOnly(report.explanation)}
                                </p>
                            </>
                        ) : (
                            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-4">
                                <div className="max-w-xl">
                                    <h3 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        No report for this {periodNoun} yet
                                    </h3>
                                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        {analyzing
                                            ? engine
                                                ? 'Reading your activity. On-device models can take up to a minute.'
                                                : 'Scoring your activity…'
                                            : `Generate one to get a score and what to try next, based on the ${formatDuration(liveBreakdown.totalMs)} below.`}
                                    </p>
                                    {!engine && !analyzing && (
                                        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            No AI model is loaded, so you'll get a quick estimate. Choose a model in the top bar for a written review.
                                        </p>
                                    )}
                                </div>
                                {renderGenerateButton(true)}
                            </div>
                        )}
                    </div>

                    {/* Evidence: where the time went */}
                    <div className="px-6 md:px-8 pb-6 md:pb-8 space-y-5">
                        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Where your {formatDuration(breakdown.totalMs)} went
                        </h3>
                        {breakdown.totalMs > 0 && <TimeSplitBar breakdown={breakdown} focusSeconds={report ? report.focusSeconds ?? rangeFocusSeconds : rangeFocusSeconds} />}
                        <CategoryLists breakdown={breakdown} onViewAll={(c) => setActivitiesModalCategory(c)} />
                    </div>

                    {report && report.tips?.length > 0 && (
                        <div className="px-6 md:px-8 py-6 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
                            <h3 className="flex items-center gap-2 text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                                <Lightbulb size={16} className="text-[color:var(--insights-link)]" aria-hidden="true" />
                                Try next
                            </h3>
                            <ul className="space-y-2 max-w-[72ch]">
                                {report.tips.map((tip, i) => (
                                    <li key={i} className="text-sm leading-relaxed flex items-start gap-2.5" style={{ color: 'var(--text-primary)' }}>
                                        <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0 bg-indigo-400" aria-hidden="true" />
                                        {formatDomainOnly(tip)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* What the score was measured against */}
                    <div className="px-6 md:px-8 py-4 border-t text-sm flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--border-secondary)', color: 'var(--text-secondary)' }}>
                        <span className="flex items-center gap-2">
                            <CalendarCheck size={15} aria-hidden="true" />
                            {effectiveGoals.length > 0
                                ? `Scored against ${effectiveGoals.length} planned ${effectiveGoals.length === 1 ? 'task' : 'tasks'}: ${effectiveGoals.slice(0, 3).join(', ')}${effectiveGoals.length > 3 ? '…' : ''}`
                                : `No tasks planned for this ${periodNoun}, so it's scored against general habits for a ${selectedRole || 'student'}.`}
                        </span>
                        {onNavigate && (
                            <button type="button" onClick={() => onNavigate('routine')} className={`font-medium text-[color:var(--insights-link)] hover:underline cursor-pointer rounded ${focusRing}`}>
                                {effectiveGoals.length > 0 ? 'Edit plan' : isDay ? 'Plan your day' : 'Plan your week'}
                            </button>
                        )}
                    </div>
                </section>
            )}

            <TrackedActivitiesModal
                isOpen={activitiesModalCategory !== null}
                onClose={() => setActivitiesModalCategory(null)}
                categorization={categorizationFromBreakdown}
                initialCategory={activitiesModalCategory || 'all'}
            />

            {/* Focus Room sessions in the selected period */}
            <section aria-labelledby="focus-sessions-heading" className="rounded-2xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-secondary)' }}>
                <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <BookOpen size={18} className="text-[color:var(--insights-link)]" aria-hidden="true" />
                        <div>
                            <h3 id="focus-sessions-heading" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Focus Room sessions</h3>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {rangeFocusSessions.length > 0
                                    ? `${rangeFocusSessions.length} ${rangeFocusSessions.length === 1 ? 'session' : 'sessions'}, ${formatDuration(rangeFocusSeconds * 1000)} in total`
                                    : `No sessions ${isDay ? 'on this day' : 'in these 7 days'}`}
                            </p>
                        </div>
                    </div>
                    {onNavigate && (
                        <button type="button" onClick={() => onNavigate('focusroom')} className={`text-sm font-medium text-[color:var(--insights-link)] hover:underline cursor-pointer rounded ${focusRing}`}>
                            Open Focus Rooms
                        </button>
                    )}
                </div>
                {rangeFocusSessions.length > 0 && (
                    <ul className="border-t max-h-56 overflow-y-auto custom-scrollbar" style={{ borderColor: 'var(--border-secondary)' }}>
                        {[...rangeFocusSessions]
                            .sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
                            .map((s: any, i: number) => {
                                const started = new Date(s.startedAt);
                                const when = isDay
                                    ? started.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                                    : started.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                                return (
                                    <li key={s.id || i} className="px-5 py-2.5 flex items-center gap-4 text-sm border-b last:border-b-0" style={{ borderColor: 'var(--border-secondary)' }}>
                                        <span className="w-24 shrink-0 tabular-nums" style={{ color: 'var(--text-secondary)' }}>{when}</span>
                                        <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{sceneLabel[s.scene] || s.scene}</span>
                                        <span className="tabular-nums font-medium" style={{ color: 'var(--text-primary)' }}>{formatDuration((s.durationSeconds || 0) * 1000)}</span>
                                    </li>
                                );
                            })}
                    </ul>
                )}
            </section>

            <ActivityHeatmap />
        </div>
    );
};
