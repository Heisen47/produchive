import React, { useState } from 'react';
import { Brain, Loader2, Minus, Lightbulb, CheckCircle2, XCircle } from 'lucide-react';
import { useStore } from '../lib/store';
import { HistoricalReports } from './HistoricalReports';

interface ProductivityAnalysis {
    rating: number | string; // 1-10 or "NA"
    verdict: 'productive' | 'neutral' | 'unproductive' | 'NA';
    explanation: string;
    tips: string[];
    categorization: {
        productive: string[];
        neutral: string[];
        distracting: string[];
    }
}

export const ProductivityJudge = ({ engine }: { engine: any }) => {
    const { goals, activities, addRating } = useStore();
    const goal = goals.length > 0 ? goals[0] : null;
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<ProductivityAnalysis | null>(null);


    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    };

    const analyzeProductivity = async () => {
        if (!engine || goals.length === 0 || activities.length === 0) return;

        setAnalyzing(true);
        try {
            // Group activities by title to sum duration
            const activityMap = new Map<string, number>();
            activities.forEach(a => {
                const key = `${a.owner.name} - ${a.title}`;
                const currentDuration = activityMap.get(key) || 0;
                activityMap.set(key, currentDuration + (a.duration || 0));
            });

            const activitySummary = Array.from(activityMap.entries())
                .map(([name, duration]) => `- ${name} (${formatDuration(duration)})`)
                .join('\n');

            const goalsText = goals.map((g, i) => `Goal ${i + 1}: "${g}"`).join('\n');
            const prompt = `User Goals:
${goalsText}

Activities Log (App - Title (Duration)):
${activitySummary}

Analyze harshly the user's productivity for the day based on their goal.

CRITICAL INSTRUCTION:
First, evaluate the "User Goals". If the goals are gibberish, random characters, or clearly just testing inputs (e.g. "asdf", "hello", "123", "blah"), you MUST:
1. Set "rating" to "NA".
2. Set "verdict" to "NA".
3. Set "explanation" to "The provided goals appear to be invalid or nonsense. Please set clear, actionable goals for a proper analysis."
4. Ignore the activity log.

Otherwise, proceed with the analysis of the activity log against the goals.

Provide the output in STRICT JSON format with the following structure:
{
  "rating": <number 1-10> (use string "NA" if invalid),
  "verdict": "<productive|neutral|unproductive|NA>",
  "explanation": "<2-3 sentence summary>",
  "tips": ["<actionable advice 1>", "<actionable advice 2>", "<actionable advice 3>"],
  "categorization": {
    "productive": ["<app name 1>", ...],
    "neutral": ["<app name 1>", ...],
    "distracting": ["<app name 1>", ...]
  }
}
Do not include any markdown formatting or text outside the JSON.`;

            const completion = await engine.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a strict but helpful productivity coach. Analyze the provided activity log against the user's goals." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.5,
            });

            const responseText = completion.choices[0]?.message?.content || "";
             const jsonString = responseText.replace(/```json\n?|\n?```/g, '').trim();

            const result = JSON.parse(jsonString);

            const analysisResult = {
                rating: result.rating || 5,
                verdict: (result.verdict as any) || 'neutral',
                explanation: result.explanation || "Analysis complete.",
                tips: result.tips || [],
                categorization: result.categorization || { productive: [], neutral: [], distracting: [] }
            };

            setAnalysis(analysisResult);
            setAnalysis(analysisResult);
            addRating(analysisResult);
        } catch (error) {
            setAnalysis({
                rating: 5,
                verdict: 'neutral',
                explanation: "Error analyzing productivity. Please ensure the AI model is loaded and try again.",
                tips: ["Try again later."],
                categorization: { productive: [], neutral: [], distracting: [] }
            });
        } finally {
            setAnalyzing(false);
        }
    };

    const getVerdictColor = (verdict: string) => {
        switch (verdict) {
            case 'productive': return 'from-green-900/40 to-emerald-900/40 border-green-700/50';
            case 'unproductive': return 'from-red-900/40 to-orange-900/40 border-red-700/50';
            case 'NA': return 'from-gray-900/40 to-slate-900/40 border-gray-700/50';
            default: return 'from-yellow-900/40 to-amber-900/40 border-yellow-700/50';
        }
    };

    if (goals.length === 0) return null;

    return (
        <div className="mt-6 space-y-6">
            <button
                onClick={analyzeProductivity}
                disabled={analyzing || !engine || activities.length === 0}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg hover:shadow-xl"
            >
                {analyzing ? (
                    <>
                        <Loader2 size={24} className="animate-spin" />
                        Analyzing Your Day...
                    </>
                ) : (
                    <>
                        <Brain size={24} />
                        Generate AI Report
                    </>
                )}
            </button>

            {analysis && (
                <div className={`bg-gradient-to-b ${getVerdictColor(analysis.verdict)} border rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                    {/* Header: Score & Verdict */}
                    <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-6">
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold bg-black/40 text-white border border-white/10`}>
                                {typeof analysis.rating === 'number' ? `${analysis.rating}/10` : analysis.rating}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white capitalize">{analysis.verdict} Day</h3>
                                <p className="text-gray-300 text-sm mt-1">Based on your activity history</p>
                            </div>
                        </div>
                    </div>

                    {/* Explanation */}
                    <div className="mb-8">
                        <p className="text-lg text-gray-100 leading-relaxed font-medium">
                            "{analysis.explanation}"
                        </p>
                    </div>

                    {/* Categorization Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-black/20 rounded-xl p-4 border border-green-500/20">
                            <h5 className="text-green-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                <CheckCircle2 size={14} /> Productive
                            </h5>
                            <ul className="space-y-1">
                                {analysis.categorization.productive.length > 0 ? (
                                    analysis.categorization.productive.map((app, i) => (
                                        <li key={i} className="text-sm text-gray-300 truncate">• {app}</li>
                                    ))
                                ) : <li className="text-sm text-gray-500 italic">None detected</li>}
                            </ul>
                        </div>
                        <div className="bg-black/20 rounded-xl p-4 border border-red-500/20">
                            <h5 className="text-red-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                <XCircle size={14} /> Distracting
                            </h5>
                            <ul className="space-y-1">
                                {analysis.categorization.distracting.length > 0 ? (
                                    analysis.categorization.distracting.map((app, i) => (
                                        <li key={i} className="text-sm text-gray-300 truncate">• {app}</li>
                                    ))
                                ) : <li className="text-sm text-gray-500 italic">None detected</li>}
                            </ul>
                        </div>
                        <div className="bg-black/20 rounded-xl p-4 border border-yellow-500/20">
                            <h5 className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Minus size={14} /> Neutral
                            </h5>
                            <ul className="space-y-1">
                                {analysis.categorization.neutral.length > 0 ? (
                                    analysis.categorization.neutral.map((app, i) => (
                                        <li key={i} className="text-sm text-gray-300 truncate">• {app}</li>
                                    ))
                                ) : <li className="text-sm text-gray-500 italic">None detected</li>}
                            </ul>
                        </div>
                    </div>

                    {/* Tips */}
                    <div className="bg-blue-900/20 rounded-xl p-5 border border-blue-500/20">
                        <h4 className="flex items-center gap-2 text-blue-300 font-bold mb-3">
                            <Lightbulb size={18} />
                            Productivity Tips
                        </h4>
                        <ul className="space-y-2">
                            {analysis.tips.map((tip, i) => (
                                <li key={i} className="text-sm text-blue-100 flex items-start gap-2">
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Historical Reports Section */}
            <HistoricalReports engine={engine} />
        </div>
    );
};
