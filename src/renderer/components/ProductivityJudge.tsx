import React, { useState } from 'react';
import { Brain, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useStore } from '../lib/store';

interface ProductivityAnalysis {
    rating: number; // 1-10
    verdict: 'productive' | 'neutral' | 'unproductive';
    explanation: string;
}

export const ProductivityJudge = ({ engine }: { engine: any }) => {
    const { goal, activities } = useStore();
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<ProductivityAnalysis | null>(null);

    const analyzeProductivity = async () => {
        if (!engine || !goal || activities.length === 0) return;

        setAnalyzing(true);
        try {
            const recentActivities = activities.slice(-20);
            const activitySummary = recentActivities.map(a =>
                `${a.owner.name}: ${a.title}`
            ).join('\n');

            const prompt = `Goal: "${goal}"

Recent activities:
${activitySummary}

Analyze how productive these activities are relative to the goal. Rate productivity from 1-10 and provide a brief explanation (2-3 sentences max). Format your response EXACTLY as:
RATING: [number]
VERDICT: [productive/neutral/unproductive]
EXPLANATION: [your explanation]`;

            const completion = await engine.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a productivity analyst. Be honest but constructive." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
            });

            const response = completion.choices[0]?.message?.content || "";

            // Parse response
            const ratingMatch = response.match(/RATING:\s*(\d+)/i);
            const verdictMatch = response.match(/VERDICT:\s*(productive|neutral|unproductive)/i);
            const explanationMatch = response.match(/EXPLANATION:\s*(.+)/is);

            const rating = ratingMatch ? parseInt(ratingMatch[1]) : 5;
            const verdict = (verdictMatch?.[1] || 'neutral') as ProductivityAnalysis['verdict'];
            const explanation = explanationMatch?.[1]?.trim() || "Unable to analyze at this time.";

            setAnalysis({ rating, verdict, explanation });
        } catch (error) {
            console.error("Analysis error:", error);
            setAnalysis({
                rating: 5,
                verdict: 'neutral',
                explanation: "Error analyzing productivity. Please try again."
            });
        } finally {
            setAnalyzing(false);
        }
    };

    const getVerdictIcon = (verdict: string) => {
        switch (verdict) {
            case 'productive':
                return <TrendingUp size={24} className="text-green-400" />;
            case 'unproductive':
                return <TrendingDown size={24} className="text-red-400" />;
            default:
                return <Minus size={24} className="text-yellow-400" />;
        }
    };

    const getVerdictColor = (verdict: string) => {
        switch (verdict) {
            case 'productive':
                return 'from-green-900/40 to-emerald-900/40 border-green-700/50';
            case 'unproductive':
                return 'from-red-900/40 to-orange-900/40 border-red-700/50';
            default:
                return 'from-yellow-900/40 to-amber-900/40 border-yellow-700/50';
        }
    };

    if (!goal) {
        return null;
    }

    return (
        <div className="mt-6">
            <button
                onClick={analyzeProductivity}
                disabled={analyzing || !engine || activities.length === 0}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg hover:shadow-xl"
            >
                {analyzing ? (
                    <>
                        <Loader2 size={24} className="animate-spin" />
                        Analyzing...
                    </>
                ) : (
                    <>
                        <Brain size={24} />
                        Judge My Productivity
                    </>
                )}
            </button>

            {analysis && (
                <div className={`mt-4 bg-gradient-to-r ${getVerdictColor(analysis.verdict)} border rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-black/20 rounded-full">
                            {getVerdictIcon(analysis.verdict)}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-bold text-white capitalize">
                                    {analysis.verdict}
                                </h4>
                                <div className="px-3 py-1 bg-black/30 rounded-full">
                                    <span className="text-sm font-bold text-white">
                                        {analysis.rating}/10
                                    </span>
                                </div>
                            </div>
                            <p className="text-gray-200 text-sm leading-relaxed">
                                {analysis.explanation}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
