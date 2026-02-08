import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, Loader2, AlertCircle, FileText } from 'lucide-react';
import { generateCompletion } from '../lib/ai';

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
            // Fallback: just average the ratings and use the last report's data
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
            // Format activity summary
            const activitySummary = activities.length > 0
                ? activities.map(a => `- ${a.owner?.name || 'Unknown'}: ${a.title} (${Math.round((a.duration || 0) / 60000)}m)`).join('\n')
                : 'No activity data available';

            const goalsText = goals.length > 0
                ? goals.map((g, i) => `${i + 1}. ${g}`).join('\n')
                : 'No goals set for this day';

            const aggregationPrompt = `Analyze this day's productivity based on the goals that were SET ON THAT DAY and the activities tracked.

GOALS FOR THIS DAY:
${goalsText}

ACTIVITIES TRACKED:
${activitySummary}

PREVIOUS REPORTS FROM THIS DAY:
${reports.map((r, i) => `
Report ${i + 1}:
- Rating: ${r.rating}/10
- Verdict: ${r.verdict}
- Explanation: ${r.explanation}
`).join('\n')}

Create a comprehensive daily summary. Rate the productivity based on how well the activities align with THE GOALS THAT WERE SET ON THIS SPECIFIC DAY.

Provide JSON output:
{
  "rating": <number 1-10 based on goal achievement>,
  "verdict": "<productive|neutral|unproductive>",
  "explanation": "<2-3 sentence summary focusing on goal achievement and main accomplishments>",
  "weaknesses": ["<weakness 1 that can be improved>", "<weakness 2>"],
  "tips": ["<actionable tip 1>", "<actionable tip 2>", "<actionable tip 3>"],
  "categorization": {
    "productive": [<apps that helped with goals>],
    "neutral": [<apps that were neither helpful nor distracting>],
    "distracting": [<apps that took away from goal focus>]
  }
}
Do not include any markdown formatting or text outside the JSON.`;

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
            // Fallback to simple average
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

    const getVerdictColor = (verdict: string) => {
        switch (verdict) {
            case 'productive': return 'from-green-900/40 to-emerald-900/40 border-green-700/50';
            case 'unproductive': return 'from-red-900/40 to-orange-900/40 border-red-700/50';
            case 'NA': return 'from-gray-900/40 to-slate-900/40 border-gray-700/50';
            default: return 'from-yellow-900/40 to-amber-900/40 border-yellow-700/50';
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
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl hover:bg-gray-800 transition-all group"
            >
                <div className="flex items-center gap-3">
                    <Calendar size={20} className="text-gray-400 group-hover:text-purple-400 transition-colors" />
                    <span className="font-medium text-gray-200">View Past Reports</span>
                </div>
                {isOpen ? (
                    <ChevronUp size={20} className="text-gray-400" />
                ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                )}
            </button>

            {/* Expandable Content */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[800px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                {/* Date Picker */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Select Date</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={today}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-gray-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all [color-scheme:dark]"
                    />
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-12 text-gray-400">
                        <Loader2 size={24} className="animate-spin mr-3" />
                        <span>Loading reports...</span>
                    </div>
                )}

                {/* Aggregating State - LLM processing multiple reports */}
                {isAggregating && !loading && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-gradient-to-b from-purple-900/20 to-indigo-900/20 rounded-xl border border-purple-700/30">
                        <Loader2 size={32} className="animate-spin mb-4 text-purple-400" />
                        <p className="text-lg font-medium text-gray-200">Generating Daily Summary...</p>
                        <p className="text-sm text-gray-400 mt-2">Aggregating {reports.length} reports with AI</p>
                    </div>
                )}

                {/* Error / No Data State */}
                {error && !loading && !isAggregating && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-900/50 rounded-xl border border-gray-800">
                        <AlertCircle size={48} className="mb-4 text-gray-600" />
                        <p className="text-lg font-medium text-gray-300">{error}</p>
                        <p className="text-sm text-gray-500 mt-2">Try selecting a different date.</p>
                    </div>
                )}

                {/* Report Display */}
                {aggregatedReport && !loading && !error && (
                    <div className={`bg-gradient-to-b ${getVerdictColor(aggregatedReport.verdict)} border rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <FileText size={20} className="text-purple-400" />
                                <div>
                                    <h4 className="font-bold text-white">{formatDate(selectedDate)}</h4>
                                    {reports.length > 1 && (
                                        <p className="text-xs text-gray-400">Aggregated from {reports.length} reports</p>
                                    )}
                                </div>
                            </div>
                            <div className={`px-4 py-2 rounded-xl flex items-center justify-center text-lg font-bold bg-black/40 text-white border border-white/10`}>
                                {typeof aggregatedReport.rating === 'number' ? `${aggregatedReport.rating}/10` : aggregatedReport.rating}
                            </div>
                        </div>

                        {/* Verdict */}
                        <div className="mb-4">
                            <span className="text-sm text-gray-400">Verdict: </span>
                            <span className="font-bold text-white capitalize">{aggregatedReport.verdict}</span>
                        </div>

                        {/* Explanation */}
                        <p className="text-gray-200 leading-relaxed mb-6">
                            "{aggregatedReport.explanation}"
                        </p>

                        {/* Tips */}
                        {aggregatedReport.tips && aggregatedReport.tips.length > 0 && (
                            <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-500/20">
                                <h5 className="text-blue-300 font-bold mb-2">Tips from that day:</h5>
                                <ul className="space-y-1">
                                    {aggregatedReport.tips.map((tip, i) => (
                                        <li key={i} className="text-sm text-blue-100 flex items-start gap-2">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Prompt to select date */}
                {!selectedDate && !loading && !error && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-900/50 rounded-xl border border-gray-800">
                        <Calendar size={48} className="mb-4 text-gray-600" />
                        <p className="text-lg font-medium text-gray-300">Select a date to view reports</p>
                        <p className="text-sm text-gray-500 mt-2">Use the date picker above to browse your history.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
