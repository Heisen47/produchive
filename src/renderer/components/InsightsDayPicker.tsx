import { CalendarDays } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import {
    DateRange,
    isSingleDay,
    parseDateStr,
    rangeForPreset,
    sameRange,
    singleDay,
    toDateStr,
} from '../lib/insightsReport';

interface InsightsDayPickerProps {
    days: string[];
    scores: Record<string, number>;
    weekScore?: number;
    range: DateRange;
    onChange: (range: DateRange) => void;
}

const chipBase =
    'relative flex flex-col items-center justify-between rounded-xl border transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400';

/** Score as a short vertical fill, so the strip doubles as a week-at-a-glance chart */
const ScoreMeter = ({ score, selected, selectedInk }: { score?: number; selected: boolean; selectedInk: string }) => (
    <span className="flex items-end gap-1 h-6" aria-hidden="true">
        <span className="w-1.5 h-6 rounded-full overflow-hidden flex items-end" style={{ background: 'var(--border-primary)' }}>
            {score !== undefined && (
                <span
                    className="w-full rounded-full"
                    style={{ height: `${Math.max(10, score * 10)}%`, background: '#818cf8' }}
                />
            )}
        </span>
        <span className="text-xs font-semibold tabular-nums w-4 text-left" style={{ color: selected ? selectedInk : 'var(--text-secondary)' }}>
            {score ?? '–'}
        </span>
    </span>
);

export const InsightsDayPicker = ({ days, scores, weekScore, range, onChange }: InsightsDayPickerProps) => {
    const { isDark } = useTheme();
    const selectedInk = isDark ? '#e0e7ff' : '#3730a3';
    const today = days[days.length - 1];
    const last7 = rangeForPreset('last7', parseDateStr(today));
    const isLast7 = sameRange(range, last7);
    const customDay = isSingleDay(range) && !days.includes(range.start) ? range.start : '';

    const chipStyle = (selected: boolean) => ({
        background: selected ? 'rgba(99, 102, 241, 0.28)' : 'var(--bg-elevated)',
        borderColor: selected ? 'rgba(129, 140, 248, 0.8)' : 'var(--border-secondary)',
    });

    return (
        <div role="group" aria-label="Choose what to review" className="flex flex-wrap items-stretch gap-2">
            {days.map((d) => {
                const date = parseDateStr(d);
                const selected = sameRange(range, singleDay(d));
                const weekday = d === today ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'short' });
                const longLabel = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
                return (
                    <button
                        key={d}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${longLabel}${scores[d] !== undefined ? `, scored ${scores[d]} out of 10` : ', no report'}`}
                        onClick={() => onChange(singleDay(d))}
                        className={`${chipBase} w-[68px] px-2 py-2 hover:border-indigo-400/50`}
                        style={chipStyle(selected)}
                    >
                        <span className="text-xs font-medium" style={{ color: selected ? selectedInk : 'var(--text-secondary)' }}>{weekday}</span>
                        <span className="font-display text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{date.getDate()}</span>
                        <ScoreMeter score={scores[d]} selected={selected} selectedInk={selectedInk} />
                    </button>
                );
            })}

            <span className="w-px self-stretch mx-1" style={{ background: 'var(--border-primary)' }} aria-hidden="true" />

            <button
                type="button"
                aria-pressed={isLast7}
                aria-label={`Last 7 days${weekScore !== undefined ? `, scored ${weekScore} out of 10` : ', no report'}`}
                onClick={() => onChange(last7)}
                className={`${chipBase} px-3 py-2 hover:border-indigo-400/50`}
                style={chipStyle(isLast7)}
            >
                <span className="text-xs font-medium" style={{ color: isLast7 ? selectedInk : 'var(--text-secondary)' }}>Last</span>
                <span className="font-display text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>7 days</span>
                <ScoreMeter score={weekScore} selected={isLast7} selectedInk={selectedInk} />
            </button>

            <label
                className={`${chipBase} px-3 py-2 hover:border-indigo-400/50 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-400`}
                style={chipStyle(!!customDay)}
            >
                <span className="text-xs font-medium flex items-center gap-1" style={{ color: customDay ? selectedInk : 'var(--text-secondary)' }}>
                    <CalendarDays size={12} aria-hidden="true" /> Earlier
                </span>
                <input
                    type="date"
                    aria-label="Pick an earlier day"
                    max={toDateStr(new Date())}
                    value={customDay}
                    onChange={(e) => e.target.value && onChange(singleDay(e.target.value))}
                    className="bg-transparent text-sm font-semibold outline-none cursor-pointer w-[118px]"
                    style={{ color: 'var(--text-primary)' }}
                />
            </label>
        </div>
    );
};
