import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, Loader2, AlertCircle, FileText } from 'lucide-react';
import { generateCompletion } from '../lib/ai';
import { useTheme } from './ThemeProvider';

interface ProductivityAnalysis {
    rating: number | string;
    verdict: 'productive' | 'neutral' | 'unproductive' | 'NA';
    explanation: string;
    tips: string[];
    categorization: {
        productive: string[];
        neutral: string[];
        distracting: string[];
    };
    timestamp?: number;
    id?: string;
}

interface HistoricalReportsProps {
    engine: any;
}

export const HistoricalReports: React.FC<HistoricalReportsProps> = ({ engine }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [isAggregating, setIsAggregating] = useState(false);
    const [reports, setReports] = useState<ProductivityAnalysis[]>([]);
    const [aggregatedReport, setAggregatedReport] = useState<ProductivityAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dateGoals, setDateGoals] = useState<string[]>([]);
    const [dateActivities, setDateActivities] = useState<any[]>([]);
    const { isDark } = useTheme();

    // Get today's date in YYYY-MM-DD format for max date
    const today = new Date().toISOString().split('T')[0];

    const fetchReportsForDate = async (dateStr: string) => {
        if (!dateStr) return;

        setLoading(true);
        setError(null);
        setAggregatedReport(null);
        setReports([]);
        setIsAggregating(false);
        setDateGoals([]);
        setDateActivities([]);

        try {
            // Fetch both ratings and activity data for the selected date
            const [dayReports, activityData] = await Promise.all([
                window.electronAPI.getRatingsByDate(dateStr),
                (window.electronAPI as any).getActivityDataByDate(dateStr)
            ]);

            // Store the date-specific goals and activities
            setDateGoals(activityData.goals || []);
            setDateActivities(activityData.activities || []);

            console.log(`[HistoricalReports] Date: ${dateStr}`);
            console.log(`[HistoricalReports] Goals for that day:`, activityData.goals);
            console.log(`[HistoricalReports] Activities for that day:`, activityData.activities?.length || 0);
            console.log(`[HistoricalReports] Reports for that day:`, dayReports.length);

            if (dayReports.length === 0) {
                setError('No reports found for this date.');
                setLoading(false);
                return;
            }

            setReports(dayReports);
            setLoading(false);

            // If multiple reports, aggregate them with LLM
            if (dayReports.length > 1 && engine) {
                setIsAggregating(true);
                await aggregateReports(dayReports, activityData.goals || [], activityData.activities || []);
                setIsAggregating(false);
            } else if (dayReports.length === 1) {
                setAggregatedReport(dayReports[0]);
            }
        } catch (err) {
            setError('Failed to load reports for this date.');
            console.error(err);
            setLoading(false);
            setIsAggregating(false);
        }
    };

    const aggregateReports = async (reports: ProductivityAnalysis[], goals: string[] = [], activities: any[] = []) => {
        if (!engine) {
            const avgRating = Math.round(
                reports.reduce((sum, r) => sum + (typeof r.rating === 'number' ? r.rating : 5), 0) / reports.length
            );
            setAggregatedReport({
                ...reports[reports.length - 1],
                rating: avgRating,
                explanation: `Aggregated from ${reports.length} reports. ${reports[reports.length - 1].explanation}`
            });
            return;
        }

        try {
            const activitySummary = activities.length > 0
                ? activities.map(a => `- ${a.owner?.name || 'Unknown'}: ${a.title} (${Math.round((a.duration || 0) / 60000)}m)`).join('\n')
                : 'No activity data available';

            const goalsText = goals.length > 0
                ? goals.map((g, i) => `${i + 1}. ${g}`).join('\n')
                : 'No goals set for this day';

            const aggregationPrompt = `Analyze this day's productivity based on the goals that were SET ON THAT DAY and the activities tracked.\n\nGOALS FOR THIS DAY:\n${goalsText}\n\nACTIVITIES TRACKED:\n${activitySummary}\n\nPREVIOUS REPORTS FROM THIS DAY:\n${reports.map((r, i) => `\nReport ${i + 1}:\n- Rating: ${r.rating}/10\n- Verdict: ${r.verdict}\n- Explanation: ${r.explanation}\n`).join('\n')}\n\nCreate a comprehensive daily summary. Rate the productivity based on how well the activities align with THE GOALS THAT WERE SET ON THIS SPECIFIC DAY.\n\nProvide JSON output:\n{\n  "rating": <number 1-10 based on goal achievement>,\n  "verdict": "<productive|neutral|unproductive>",\n  "explanation": "<2-3 sentence summary focusing on goal achievement and main accomplishments>",\n  "weaknesses": ["<weakness 1 that can be improved>", "<weakness 2>"],\n  "tips": ["<actionable tip 1>", "<actionable tip 2>", "<actionable tip 3>"],\n  "categorization": {\n    "productive": [<apps that helped with goals>],\n    "neutral": [<apps that were neither helpful nor distracting>],\n    "distracting": [<apps that took away from goal focus>]\n  }\n}\nDo not include any markdown formatting or text outside the JSON.`;

            const response = await generateCompletion(engine, [
                { role: 'system', content: 'You are a productivity analyst. Analyze activities against the goals that were set on that specific day.' },
                { role: 'user', content: aggregationPrompt }
            ], 0.3);

            const jsonString = response.replace(/```json\n?|\n?```/g, '').trim();
            const result = JSON.parse(jsonString);

            setAggregatedReport({
                rating: result.rating || 5,
                verdict: result.verdict || 'neutral',
                explanation: result.explanation || 'Aggregated report.',
                tips: [...(result.weaknesses || []), ...(result.tips || [])],
                categorization: result.categorization || { productive: [], neutral: [], distracting: [] }
            });
        } catch (err) {
            console.error('Aggregation failed:', err);
            const avgRating = Math.round(
                reports.reduce((sum, r) => sum + (typeof r.rating === 'number' ? r.rating : 5), 0) / reports.length
            );
            setAggregatedReport({
                ...reports[reports.length - 1],
                rating: avgRating,
                explanation: `Aggregated from ${reports.length} reports (AI unavailable). ${reports[reports.length - 1].explanation}`
            });
        }
    };

    useEffect(() => {
        if (selectedDate) {
            fetchReportsForDate(selectedDate);
        }
    }, [selectedDate]);

    const getVerdictStyle = (verdict: string) => {
        switch (verdict) {
            case 'productive': return {
                bg: isDark ? 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.08))' : 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(16,185,129,0.04))',
                border: 'rgba(34,197,94,0.3)',
            };
            case 'unproductive': return {
                bg: isDark ? 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(249,115,22,0.08))' : 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(249,115,22,0.04))',
                border: 'rgba(239,68,68,0.3)',
            };
            default: return {
                bg: isDark ? 'linear-gradient(135deg, rgba(234,179,8,0.1), rgba(245,158,11,0.08))' : 'linear-gradient(135deg, rgba(234,179,8,0.06), rgba(245,158,11,0.04))',
                border: 'rgba(234,179,8,0.3)',
            };
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <div className="mt-6">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group"
                style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-card)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-card)'; }}
            >
                <div className="flex items-center gap-3">
                    <Calendar size={20} style={{ color: 'var(--text-muted)' }} className="group-hover:text-purple-400 transition-colors" />
                    <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>View Past Reports</span>
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </button>

            {/* Expandable Content */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[800px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                {/* Date Picker */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Select Date</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={today}
                        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all duration-200 [color-scheme:dark]"
                        style={{
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-input)',
                            color: 'var(--text-primary)',
                        }}
                        onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
                        onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-input)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                    />
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-muted)' }}>
                        <Loader2 size={24} className="animate-spin mr-3" />
                        <span>Loading reports...</span>
                    </div>
                )}

                {/* Aggregating State */}
                {isAggregating && !loading && (
                    <div
                        className="flex flex-col items-center justify-center py-12 rounded-xl"
                        style={{
                            background: isDark ? 'linear-gradient(135deg, rgba(147,51,234,0.1), rgba(99,102,241,0.08))' : 'linear-gradient(135deg, rgba(147,51,234,0.06), rgba(99,102,241,0.04))',
                            border: '1px solid rgba(147,51,234,0.2)',
                        }}
                    >
                        <Loader2 size={32} className="animate-spin mb-4" style={{ color: '#c084fc' }} />
                        <p className="text-lg font-display font-medium" style={{ color: 'var(--text-primary)' }}>Generating Daily Summary...</p>
                        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Aggregating {reports.length} reports with AI</p>
                    </div>
                )}

                {/* Error / No Data State */}
                {error && !loading && !isAggregating && (
                    <div
                        className="flex flex-col items-center justify-center py-12 rounded-xl"
                        style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-card)',
                        }}
                    >
                        <AlertCircle size={48} className="mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                        <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Try selecting a different date.</p>
                    </div>
                )}

                {/* Report Display */}
                {aggregatedReport && !loading && !error && (() => {
                    const style = getVerdictStyle(aggregatedReport.verdict);
                    return (
                        <div
                            className="rounded-2xl p-6 animate-fade-in-up"
                            style={{
                                background: style.bg,
                                border: `1px solid ${style.border}`,
                                backdropFilter: 'blur(20px)',
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                                <div className="flex items-center gap-3">
                                    <FileText size={20} style={{ color: '#c084fc' }} />
                                    <div>
                                        <h4 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>{formatDate(selectedDate)}</h4>
                                        {reports.length > 1 && (
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aggregated from {reports.length} reports</p>
                                        )}
                                    </div>
                                </div>
                                <div
                                    className="px-4 py-2 rounded-xl flex items-center justify-center text-lg font-bold"
                                    style={{
                                        background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-primary)',
                                    }}
                                >
                                    {typeof aggregatedReport.rating === 'number' ? `${aggregatedReport.rating}/10` : aggregatedReport.rating}
                                </div>
                            </div>

                            {/* Verdict */}
                            <div className="mb-4">
                                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Verdict: </span>
                                <span className="font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{aggregatedReport.verdict}</span>
                            </div>

                            {/* Explanation */}
                            <p className="leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                                "{aggregatedReport.explanation}"
                            </p>

                            {/* Tips */}
                            {aggregatedReport.tips && aggregatedReport.tips.length > 0 && (
                                <div
                                    className="rounded-xl p-4"
                                    style={{
                                        background: isDark ? 'rgba(37,99,235,0.1)' : 'rgba(37,99,235,0.06)',
                                        border: '1px solid rgba(37,99,235,0.2)',
                                    }}
                                >
                                    <h5 className="font-bold mb-2" style={{ color: '#93c5fd' }}>Tips from that day:</h5>
                                    <ul className="space-y-1">
                                        {aggregatedReport.tips.map((tip, i) => (
                                            <li key={i} className="text-sm flex items-start gap-2" style={{ color: isDark ? '#dbeafe' : '#1e40af' }}>
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                                                {tip}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Prompt to select date */}
                {!selectedDate && !loading && !error && (
                    <div
                        className="flex flex-col items-center justify-center py-12 rounded-xl animate-fade-in-up"
                        style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-card)',
                        }}
                    >
                        <Calendar size={48} className="mb-4 animate-float" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                        <p className="text-lg font-display font-medium" style={{ color: 'var(--text-secondary)' }}>Select a date to view reports</p>
                        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Use the date picker above to browse your history.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
