import { useState } from 'react';
import { CheckCircle2, Minus, XCircle } from 'lucide-react';
import { ActivityBreakdown, InsightCategory, formatDuration } from '../lib/insightsReport';
import { useTheme } from './ThemeProvider';

// Validated with the dataviz palette checker against the dark and light card surfaces.
// Neutral is the gray midpoint, so productive and distracting are never adjacent.
const PALETTE = {
    dark: { productive: '#14a374', neutral: '#6b7a99', distracting: '#e04a6e' },
    light: { productive: '#0f8a61', neutral: '#949eb3', distracting: '#d03a60' },
};

export const CATEGORY_META: Record<InsightCategory, { label: string; empty: string; icon: typeof CheckCircle2 }> = {
    productive: { label: 'Productive', empty: 'Nothing productive tracked', icon: CheckCircle2 },
    neutral: { label: 'Neutral', empty: 'Nothing neutral tracked', icon: Minus },
    distracting: { label: 'Distracting', empty: 'Nothing distracting', icon: XCircle },
};

const ORDER: InsightCategory[] = ['productive', 'neutral', 'distracting'];
const msFor = (b: ActivityBreakdown, c: InsightCategory) =>
    c === 'productive' ? b.productiveMs : c === 'neutral' ? b.neutralMs : b.distractingMs;
const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

export const useCategoryColors = () => {
    const { isDark } = useTheme();
    return isDark ? PALETTE.dark : PALETTE.light;
};

/** One stacked bar of where tracked time went, with a labelled legend so color is never the only cue */
export const TimeSplitBar = ({ breakdown, focusSeconds }: { breakdown: ActivityBreakdown; focusSeconds?: number }) => {
    const colors = useCategoryColors();
    const [hovered, setHovered] = useState<InsightCategory | null>(null);
    const total = breakdown.totalMs;
    const visible = ORDER.filter((c) => msFor(breakdown, c) > 0);

    return (
        <figure className="space-y-3">
            <figcaption className="sr-only">
                {`${formatDuration(total)} tracked: ` +
                    ORDER.map((c) => `${CATEGORY_META[c].label} ${formatDuration(msFor(breakdown, c))} (${pct(msFor(breakdown, c), total)}%)`).join(', ')}
            </figcaption>
            <div className="flex h-3 w-full gap-[2px]" aria-hidden="true">
                {visible.map((c) => (
                    <div
                        key={c}
                        className="h-full first:rounded-l last:rounded-r transition-opacity"
                        style={{
                            width: `${(msFor(breakdown, c) / total) * 100}%`,
                            minWidth: 4,
                            background: colors[c],
                            opacity: hovered && hovered !== c ? 0.35 : 1,
                        }}
                        title={`${CATEGORY_META[c].label}: ${formatDuration(msFor(breakdown, c))} (${pct(msFor(breakdown, c), total)}%)`}
                        onMouseEnter={() => setHovered(c)}
                        onMouseLeave={() => setHovered(null)}
                    />
                ))}
            </div>
            <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-hidden="true">
                {ORDER.map((c) => (
                    <div
                        key={c}
                        className="flex items-center gap-2"
                        onMouseEnter={() => setHovered(c)}
                        onMouseLeave={() => setHovered(null)}
                    >
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: colors[c] }} />
                        <dt style={{ color: 'var(--text-secondary)' }}>{CATEGORY_META[c].label}</dt>
                        <dd className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                            {formatDuration(msFor(breakdown, c))}
                            <span className="font-normal ml-1" style={{ color: 'var(--text-secondary)' }}>{pct(msFor(breakdown, c), total)}%</span>
                        </dd>
                    </div>
                ))}
                {!!focusSeconds && (
                    <div className="flex items-center gap-2">
                        <dt style={{ color: 'var(--text-secondary)' }}>Focus Room</dt>
                        <dd className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatDuration(focusSeconds * 1000)}</dd>
                    </div>
                )}
            </dl>
        </figure>
    );
};

const ROWS_SHOWN = 5;

/** Per-category app lists with their time; empty categories shrink to a single line */
export const CategoryLists = ({ breakdown, onViewAll }: { breakdown: ActivityBreakdown; onViewAll: (c: InsightCategory) => void }) => {
    const colors = useCategoryColors();
    const filled = ORDER.filter((c) => breakdown.items.some((i) => i.category === c));
    const empty = ORDER.filter((c) => !filled.includes(c));

    return (
        <div className="space-y-3">
            <div className={`grid gap-3 grid-cols-1 ${filled.length > 1 ? 'md:grid-cols-2' : ''} ${filled.length > 2 ? 'xl:grid-cols-3' : ''}`}>
                {filled.map((c) => {
                    const Icon = CATEGORY_META[c].icon;
                    const items = breakdown.items.filter((i) => i.category === c);
                    const catMs = msFor(breakdown, c);
                    return (
                        <section key={c} aria-labelledby={`cat-${c}`} className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-secondary)' }}>
                            <h4 id={`cat-${c}`} className="flex items-center justify-between gap-2 text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                                <span className="flex items-center gap-2">
                                    <Icon size={15} style={{ color: colors[c] }} aria-hidden="true" />
                                    {CATEGORY_META[c].label}
                                </span>
                                <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{formatDuration(catMs)}</span>
                            </h4>
                            <ul className="space-y-2">
                                {items.slice(0, ROWS_SHOWN).map((item) => (
                                    <li key={item.name} className="text-sm">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <span className="truncate" title={item.name} style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                                            <span className="tabular-nums shrink-0" style={{ color: 'var(--text-secondary)' }}>{formatDuration(item.ms)}</span>
                                        </div>
                                        <div className="mt-1 h-1 rounded-full" style={{ background: 'var(--border-secondary)' }} aria-hidden="true">
                                            <div className="h-full rounded-full" style={{ width: `${catMs > 0 ? Math.max(2, (item.ms / catMs) * 100) : 0}%`, background: colors[c] }} />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            {items.length > ROWS_SHOWN && (
                                <button
                                    type="button"
                                    onClick={() => onViewAll(c)}
                                    className="mt-3 text-sm font-medium text-[color:var(--insights-link)] hover:underline cursor-pointer rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
                                >
                                    Show all {items.length}
                                </button>
                            )}
                        </section>
                    );
                })}
            </div>
            {empty.length > 0 && (
                <p className="text-sm flex flex-wrap gap-x-4 gap-y-1" style={{ color: 'var(--text-secondary)' }}>
                    {empty.map((c) => {
                        const Icon = CATEGORY_META[c].icon;
                        return (
                            <span key={c} className="flex items-center gap-1.5">
                                <Icon size={14} aria-hidden="true" /> {CATEGORY_META[c].empty}
                            </span>
                        );
                    })}
                </p>
            )}
        </div>
    );
};
