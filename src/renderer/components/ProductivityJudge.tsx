import { useState, useRef, useEffect } from 'react';
import { Brain, Loader2, Minus, Lightbulb, CheckCircle2, XCircle, AlertTriangle, Clock, BookOpen } from 'lucide-react';
import Lottie from 'lottie-react';
import { useStore } from '../lib/store';
import { HistoricalReports } from './HistoricalReports';
import { ActivityHeatmap } from './ActivityHeatmap';
import { ShareCard } from './ShareCard';
import { useTheme } from './ThemeProvider';
import confetti from 'canvas-confetti';
import badCatAnimation from '../assets/bad_cat.json';
import danceAnimation from '../assets/dance.json';

interface ProductivityAnalysis {
    rating: number;
    verdict: 'productive' | 'neutral' | 'unproductive';
    explanation: string;
    tips: string[];
    categorization: {
        productive: string[];
        neutral: string[];
        distracting: string[];
    }
}

export const ProductivityJudge = ({ engine }: { engine: any }) => {
    const { goals, activities, addRating, selectedRole, customPrompt, routines } = useStore();
    const { isDark } = useTheme();
    const goal = goals.length > 0 ? goals[0] : null;
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<ProductivityAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [focusSessions, setFocusSessions] = useState<any[]>([]);

    // Load focus sessions on mount
    useEffect(() => {
        const api = (window as any).electronAPI;
        if (api?.getFocusSessions) {
            api.getFocusSessions().then((s: any[]) => setFocusSessions(s)).catch(() => {});
        }
    }, []);

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

            // Build focus session summary for the AI (aggregated by day)
            let focusSessionText = '';
            if (focusSessions.length > 0) {
                const totalFocusSec = focusSessions.reduce((sum: number, s: any) => sum + (s.durationSeconds || 0), 0);
                const sceneLabel: Record<string, string> = { classroom: 'Classroom', cafe: 'Café', library: 'Library' };
                const byDay: Record<string, { totalSec: number; rooms: Record<string, number> }> = {};
                focusSessions.forEach((s: any) => {
                    const d = new Date(s.startedAt);
                    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (!byDay[key]) byDay[key] = { totalSec: 0, rooms: {} };
                    byDay[key].totalSec += s.durationSeconds || 0;
                    byDay[key].rooms[s.scene] = (byDay[key].rooms[s.scene] || 0) + 1;
                });
                const dayLines = Object.entries(byDay).slice(0, 10).map(([date, day]) => {
                    const dur = formatDuration(day.totalSec * 1000);
                    const rooms = Object.entries(day.rooms).map(([scene, count]) =>
                        `${sceneLabel[scene] || scene}${count > 1 ? ` (×${count})` : ''}`
                    ).join(', ');
                    return `- ${date}: ${rooms} — ${dur}`;
                }).join('\n');
                focusSessionText = `\n\nFocus Room Study Sessions (Total: ${formatDuration(totalFocusSec * 1000)}):\n${dayLines}`;
            }

            // Build Routine Calendar Summary (Planned schedule vs Actual adherence)
            let routineSummaryText = '';
            const todayStr = new Date().toISOString().split('T')[0];
            const todayRoutines = (routines || []).filter((r) => r.dateStr === todayStr);
            if (todayRoutines.length > 0) {
                const scheduled = todayRoutines.filter((r) => !r.isAutoDetected);
                const autoDetected = todayRoutines.filter((r) => r.isAutoDetected);

                const scheduledLines = scheduled
                    .map((r) => `- [${r.completed ? 'COMPLETED' : 'PENDING'}] ${r.title} (${r.durationMinutes}m) [${r.category}]`)
                    .join('\n');

                const autoLines = autoDetected
                    .slice(-5)
                    .map((r) => `- [Auto-Logged] ${r.title} (${r.durationMinutes}m) [App: ${r.detectedApp || 'Screen'}]`)
                    .join('\n');

                routineSummaryText = `Scheduled Routine Calendar (Today):\n${scheduledLines || '- None'}\n\nAuto-Detected Calendar Events:\n${autoLines || '- None'}`;
            }

            console.log('[ProductivityJudge] Sending to LLM:');
            console.log('  Goals:', goalsText);
            console.log('  Activity Summary:', activitySummary);
            if (routineSummaryText) console.log('  Routine Calendar:', routineSummaryText);

            const basePrompt = customPrompt.replace('{role}', selectedRole || 'General Student');
            const prompt = `${basePrompt}

Student input:
Goal: \n${goalsText}\n\n${routineSummaryText ? `Calendar Schedule & Routine Adherence:\n${routineSummaryText}\n\n` : ''}Activity: \n${activitySummary}\n\n${focusSessionText ? `Focus Study Sessions: \n${focusSessionText}\n\n` : ''}`;

            const isTechRole = selectedRole?.toLowerCase().includes('engineer') || selectedRole?.toLowerCase().includes('computer');
            
            const exampleUser = isTechRole 
                ? "Goal: \nGoal 1: \"Study React\"\n\nActivity: \n- VS Code (45m)\n- YouTube (15m)"
                : "Goal: \nGoal 1: \"Review Materials\"\n\nActivity: \n- PDF Reader (45m)\n- YouTube (15m)";
                
            const exampleAssistant = isTechRole
                ? `{\n  "rating": 8,\n  "verdict": "productive",\n  "explanation": "Great job focusing on your React studies! You spent the majority of your time in VS Code, which is excellent active learning. The short YouTube session was likely helpful for tutorials.",\n  "tips": ["Keep up the great active coding!", "Try to ensure YouTube doesn't distract you for too long.", "You are doing great!"],\n  "categorization": {\n    "productive": ["VS Code"],\n    "neutral": ["YouTube"],\n    "distracting": []\n  }\n}`
                : `{\n  "rating": 8,\n  "verdict": "productive",\n  "explanation": "Great job focusing on your materials! You spent the majority of your time reading documents, which is excellent active learning. The short YouTube session was likely helpful for educational videos.",\n  "tips": ["Keep up the great active study focus!", "Try to ensure YouTube doesn't distract you for too long.", "You are doing great!"],\n  "categorization": {\n    "productive": ["PDF Reader"],\n    "neutral": ["YouTube"],\n    "distracting": []\n  }\n}`;

            const completion = await engine.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a kind but helpful productivity coach. You strictly follow JSON format and instructions." },
                    { role: "user", content: "Please read the instructions and evaluate this example student:\n\n" + exampleUser },
                    { role: "assistant", content: exampleAssistant },
                    { role: "user", content: prompt }
                ],
                temperature: 0.3,
            });

            const responseText = completion.choices[0]?.message?.content || "";
            const jsonString = responseText.replace(/```json\n?|\n?```/g, '').trim();

            const result = JSON.parse(jsonString);

            // Sanitize rating: force to a number between 1-10
            let parsedRating = typeof result.rating === 'number'
                ? result.rating
                : parseInt(result.rating, 10);
            if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 10) {
                parsedRating = 5; // Safe fallback
            }

            // Sanitize verdict: only allow valid values
            const validVerdicts = ['productive', 'neutral', 'unproductive'];
            const parsedVerdict = validVerdicts.includes(result.verdict?.toLowerCase())
                ? result.verdict.toLowerCase() as 'productive' | 'neutral' | 'unproductive'
                : parsedRating >= 6 ? 'productive' : parsedRating >= 4 ? 'neutral' : 'unproductive';

            const analysisResult = {
                rating: parsedRating,
                verdict: parsedVerdict,
                explanation: result.explanation || "Analysis complete.",
                tips: result.tips || [],
                categorization: result.categorization || { productive: [], neutral: [], distracting: [] }
            };

            setAnalysis(analysisResult);
            addRating(analysisResult);

            // Check for confetti condition (>= 8)
            if (typeof analysisResult.rating === 'number' && analysisResult.rating >= 6) {
                setTimeout(() => triggerConfetti(), 500);
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
            default: return {
                bg: isDark ? 'linear-gradient(135deg, rgba(234,179,8,0.1), rgba(245,158,11,0.08))' : 'linear-gradient(135deg, rgba(234,179,8,0.08), rgba(245,158,11,0.05))',
                border: 'rgba(234,179,8,0.3)',
            };
        }
    };

    // Check total usage time (3 minutes = 180000ms)
    // We check this on render to disable the button
    const totalDuration = activities.reduce((sum, act) => sum + (act.duration || 0), 0);
    const isEnoughData = totalDuration >= 180000;

    return (
        <div className="mt-6 space-y-6">
            {goals.length > 0 ? (
                <>
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

                            <div className="flex items-center gap-3">
                                {/* Bad Cat for low scores */}
                                {(typeof analysis.rating === 'number' && analysis.rating <= 5) && (
                                    <div className="w-24 h-24">
                                        <Lottie animationData={badCatAnimation} loop={true} />
                                    </div>
                                )}

                                {/* Dance for high scores */}
                                {(typeof analysis.rating === 'number' && analysis.rating >= 6) && (
                                    <div className="w-24 h-24">
                                        <Lottie animationData={danceAnimation} loop={true} />
                                    </div>
                                )}

                                {/* Share Button */}
                                <ShareCard analysis={analysis} goals={goals} />
                            </div>
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
                </>
            ) : (
                <div 
                    className="rounded-2xl p-6 text-center animate-fade-in"
                    style={{
                        background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.5)',
                        border: '1px solid var(--border-card)',
                    }}
                >
                    <Lightbulb size={24} className="mx-auto mb-3" style={{ color: 'var(--accent)' }} />
                    <h3 className="text-lg font-bold flex items-center justify-center gap-2 mb-1" style={{ color: 'var(--text-primary)' }}>
                        No Goals Set for Today
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Add goals in the Planner to unlock today's AI productivity analysis.
                    </p>
                </div>
            )}

            {/* Focus Sessions Summary (grouped by day) */}
            {focusSessions.length > 0 && (() => {
                const sceneLabel: Record<string, string> = { classroom: 'Classroom', cafe: 'Café', library: 'Library' };
                const sceneColors: Record<string, string> = { classroom: '#4ade80', cafe: '#f59e0b', library: '#a78bfa' };
                const byDay: Record<string, { totalSec: number; rooms: Record<string, number>; date: string }> = {};
                focusSessions.forEach((s: any) => {
                    const d = new Date(s.startedAt);
                    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    if (!byDay[key]) byDay[key] = { totalSec: 0, rooms: {}, date: key };
                    byDay[key].totalSec += s.durationSeconds || 0;
                    byDay[key].rooms[s.scene] = (byDay[key].rooms[s.scene] || 0) + 1;
                });
                const days = Object.values(byDay).slice(0, 10);
                const totalSec = focusSessions.reduce((sum: number, s: any) => sum + (s.durationSeconds || 0), 0);

                return (
                    <div className="glass-card rounded-2xl overflow-hidden">
                        <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                            <div className="p-2 rounded-xl" style={{ background: 'rgba(167,139,250,0.12)' }}>
                                <BookOpen size={16} color="#a78bfa" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Focus Room Sessions</h4>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {focusSessions.length} session{focusSessions.length !== 1 ? 's' : ''} · {formatDuration(totalSec * 1000)} total
                                </p>
                            </div>
                        </div>
                        <div style={{ maxHeight: 200, overflowY: 'auto' }} className="custom-scrollbar">
                            {days.map((day, i) => {
                                const roomEntries = Object.entries(day.rooms);
                                return (
                                    <div key={day.date} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/5" style={{ borderBottom: i < days.length - 1 ? '1px solid var(--border-secondary)' : 'none' }}>
                                        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', minWidth: 85, whiteSpace: 'nowrap' }}>{day.date}</span>
                                        <div className="flex-1 flex gap-1.5 flex-wrap">
                                            {roomEntries.map(([scene, count]) => {
                                                const color = sceneColors[scene] || '#a78bfa';
                                                return (
                                                    <span key={scene} className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ color, background: `${color}15` }}>
                                                        {sceneLabel[scene] || scene}{count > 1 ? ` (×${count})` : ''}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.12)' }}>
                                            {formatDuration(day.totalSec * 1000)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* Heatmap Section */}
            <ActivityHeatmap />

            {/* Historical Reports Section */}
            <HistoricalReports engine={engine} />
        </div>
    );
};
