import { useState, useRef } from 'react';
import { Brain, Loader2, Minus, Lightbulb, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import Lottie from 'lottie-react';
import { useStore } from '../lib/store';
import { HistoricalReports } from './HistoricalReports';
import { useTheme } from './ThemeProvider';
import confetti from 'canvas-confetti';
import badCatAnimation from '../assets/bad_cat.json';

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
    const { isDark } = useTheme();
    const goal = goals.length > 0 ? goals[0] : null;
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<ProductivityAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    };

    const triggerConfetti = () => {
        if (canvasRef.current) {
            const myConfetti = confetti.create(canvasRef.current, {
                resize: true,
                useWorker: true
            });
            myConfetti({
                particleCount: 100,
                spread: 160,
                origin: { y: 0.6 }
            });
        }
    };

    const analyzeProductivity = async () => {
        setError(null);
        
        if (!engine || goals.length === 0 || activities.length === 0) {
            console.log('[ProductivityJudge] Cannot generate report:', {
                hasEngine: !!engine,
                goalsCount: goals.length,
                activitiesCount: activities.length
            });
            return;
        }

        console.log('========================================');
        console.log('[ProductivityJudge] GENERATING AI REPORT');
        console.log('========================================');
        console.log('[ProductivityJudge] Data source: In-memory store (Zustand)');
        console.log('[ProductivityJudge] Goals:', goals);
        console.log('[ProductivityJudge] Activities count:', activities.length);
        console.log('[ProductivityJudge] Activities:', activities.map(a => ({
            app: a.owner.name,
            title: a.title,
            duration: a.duration
        })));

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

            console.log('[ProductivityJudge] Sending to LLM:');
            console.log('  Goals:', goalsText);
            console.log('  Activity Summary:', activitySummary);

            const prompt = `User Goals:\n${goalsText}\n\nActivities Log (App - Title (Duration)):\n${activitySummary}\n\nAnalyze the user's productivity for the day based on their stated goals.\n\nIMPORTANT: Goals like "Coding", "Study", "Work", "Exercise", "Reading", "Learning" are VALID goals - they are common productivity objectives. Only reject goals if they are literal gibberish like "asdfgh", "aaaaa", or random keyboard mashes.\n\nDISTINCTION GUIDANCE:\n- Prioritize ACTIVE work (e.g. IDEs like VS Code, LeetCode, writing documents ,) over PASSIVE consumption (e.g. YouTube tutorials, social media).\n- Watching coding tutorials on YouTube is OKAY but should be scored lower than actual coding practice. Entertainment YouTube is DISTRACTING unless "Relax" is a goal.\n- Be specific in your verdict justification.\n\nProvide the output in STRICT JSON format:\n{\n  "rating": <number 1-10> (use string "NA" if invalid),\n  "verdict": "<productive|neutral|unproductive|NA>",\n  "explanation": "<2-3 sentence summary>",\n  "tips": ["<actionable advice 1>", "<actionable advice 2>", "<actionable advice 3>"],\n  "categorization": {\n    "productive": ["<app name 1>", ...],\n    "neutral": ["<app name 1>", ...],\n    "distracting": ["<app name 1>", ...]\n  }\n}\nDo not include any markdown formatting or text outside the JSON.`;

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
            addRating(analysisResult);
            
            // Check for confetti condition (>= 8)
            if (typeof analysisResult.rating === 'number' && analysisResult.rating >= 8) {
                setTimeout(() => triggerConfetti(), 500); // Small delay to ensure render
            }
            
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

    const getVerdictStyle = (verdict: string) => {
        switch (verdict) {
            case 'productive': return {
                bg: isDark ? 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.08))' : 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.05))',
                border: 'rgba(34,197,94,0.3)',
            };
            case 'unproductive': return {
                bg: isDark ? 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(249,115,22,0.08))' : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(249,115,22,0.05))',
                border: 'rgba(239,68,68,0.3)',
            };
            case 'NA': return {
                bg: isDark ? 'linear-gradient(135deg, rgba(100,116,139,0.1), rgba(71,85,105,0.08))' : 'linear-gradient(135deg, rgba(100,116,139,0.08), rgba(71,85,105,0.05))',
                border: 'rgba(100,116,139,0.3)',
            };
            default: return {
                bg: isDark ? 'linear-gradient(135deg, rgba(234,179,8,0.1), rgba(245,158,11,0.08))' : 'linear-gradient(135deg, rgba(234,179,8,0.08), rgba(245,158,11,0.05))',
                border: 'rgba(234,179,8,0.3)',
            };
        }
    };

    if (goals.length === 0) return null;

    // Check total usage time (3 minutes = 180000ms)
    // We check this on render to disable the button
    const totalDuration = activities.reduce((sum, act) => sum + (act.duration || 0), 0);
    const isEnoughData = totalDuration >= 180000;

    return (
        <div className="mt-6 space-y-6">
            <div className="relative">
                <button
                    onClick={analyzeProductivity}
                    disabled={analyzing || !engine || activities.length === 0 || !isEnoughData}
                    className="w-full px-6 py-4 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #6366f1)',
                        backgroundSize: '200% 200%',
                        color: '#fff',
                        boxShadow: analyzing || !isEnoughData ? 'none' : '0 8px 30px rgba(99,102,241,0.4)',
                        animation: !analyzing && isEnoughData ? 'gradientShift 3s ease infinite' : undefined,
                        filter: !isEnoughData ? 'grayscale(1)' : 'none',
                    }}
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
                
                {!isEnoughData && (
                    <div className="absolute top-full left-0 right-0 mt-2 text-center animate-fade-in">
                        <span className="text-xs font-medium px-3 py-1.5 rounded-full inline-block" 
                              style={{ 
                                  background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                  color: 'var(--text-secondary)'
                              }}>
                            Please use the app for at least 3 minutes to unlock analysis
                        </span>
                    </div>
                )}
            </div>
            


            {analysis && (() => {
                const style = getVerdictStyle(analysis.verdict);
                return (
                    <div
                        className="rounded-2xl p-6 animate-fade-in-up relative overflow-hidden"
                        style={{
                            background: style.bg,
                            border: `1px solid ${style.border}`,
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        <canvas 
                            ref={canvasRef} 
                            style={{ 
                                position: 'absolute', 
                                top: 0, 
                                left: 0, 
                                width: '100%', 
                                height: '100%', 
                                pointerEvents: 'none', 
                                zIndex: 10 
                            }} 
                        />
                        
                        {/* Header: Score & Verdict */}
                        <div className="flex items-center justify-between mb-6 pb-6" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold"
                                    style={{
                                        background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-primary)',
                                    }}
                                >
                                    {typeof analysis.rating === 'number' ? `${analysis.rating}/10` : analysis.rating}
                                </div>
                                <div>
                                    <h3 className="text-xl font-display font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{analysis.verdict} Day</h3>
                                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Based on your activity history</p>
                                </div>
                            </div>
                            
                            {/* Bad Cat for low scores */}
                            {(typeof analysis.rating === 'number' && analysis.rating <= 5) && (
                                <div className="w-24 h-24">
                                    <Lottie animationData={badCatAnimation} loop={true} />
                                </div>
                            )}
                        </div>

                        {/* Explanation */}
                        <div className="mb-8">
                            <p className="text-lg leading-relaxed font-medium" style={{ color: 'var(--text-primary)' }}>
                                "{analysis.explanation}"
                            </p>
                        </div>

                        {/* Categorization Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            {[
                                { title: 'Productive', items: analysis.categorization.productive, icon: CheckCircle2, color: '#4ade80', borderColor: 'rgba(34,197,94,0.2)' },
                                { title: 'Distracting', items: analysis.categorization.distracting, icon: XCircle, color: '#f87171', borderColor: 'rgba(239,68,68,0.2)' },
                                { title: 'Neutral', items: analysis.categorization.neutral, icon: Minus, color: '#fbbf24', borderColor: 'rgba(234,179,8,0.2)' },
                            ].map((cat, i) => (
                                <div
                                    key={i}
                                    className="rounded-xl p-4"
                                    style={{
                                        background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)',
                                        border: `1px solid ${cat.borderColor}`,
                                    }}
                                >
                                    <h5 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: cat.color }}>
                                        <cat.icon size={14} /> {cat.title}
                                    </h5>
                                    <ul className="space-y-1">
                                        {cat.items.length > 0 ? (
                                            cat.items.map((app: string, j: number) => (
                                                <li key={j} className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>• {app}</li>
                                            ))
                                        ) : <li className="text-sm italic" style={{ color: 'var(--text-muted)' }}>None detected</li>}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        {/* Tips */}
                        <div
                            className="rounded-xl p-5"
                            style={{
                                background: isDark ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.06)',
                                border: '1px solid rgba(37, 99, 235, 0.2)',
                            }}
                        >
                            <h4 className="flex items-center gap-2 font-bold mb-3" style={{ color: '#93c5fd' }}>
                                <Lightbulb size={18} />
                                Productivity Tips
                            </h4>
                            <ul className="space-y-2">
                                {analysis.tips.map((tip, i) => (
                                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: isDark ? '#dbeafe' : '#1e40af' }}>
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                );
            })()}

            {/* Historical Reports Section */}
            <HistoricalReports engine={engine} />
        </div>
    );
};
