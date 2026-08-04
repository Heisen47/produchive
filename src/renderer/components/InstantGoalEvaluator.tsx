import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';
import { Sparkles, Crown, Zap, CheckCircle2, AlertCircle, HelpCircle, Lock } from 'lucide-react';
import { evaluateActivityAgainstGoals } from '../lib/ai-evaluator';

interface InstantGoalEvaluatorProps {
    onOpenPaywall: () => void;
}

export const InstantGoalEvaluator: React.FC<InstantGoalEvaluatorProps> = ({ onOpenPaywall }) => {
    const { isDark } = useTheme();
    const isPremium = useStore(state => state.isPremium);
    const goals = useStore(state => state.goals);
    const activities = useStore(state => state.activities);
    const selectedRole = useStore(state => state.selectedRole) || 'Software Engineer';
    const addRating = useStore(state => state.addRating);

    const [evaluating, setEvaluating] = useState(false);
    const [lastEval, setLastEval] = useState<any>(null);

    const activeActivity = activities.length > 0 ? activities[activities.length - 1] : null;
    const currentGoal = goals.length > 0 ? goals[0] : 'No active goal set';

    const handleEvaluate = () => {
        if (!isPremium) {
            onOpenPaywall();
            return;
        }

        setEvaluating(true);
        setTimeout(() => {
            const evalResult = evaluateActivityAgainstGoals(activeActivity, goals, selectedRole);
            addRating(evalResult);
            setLastEval(evalResult);
            setEvaluating(false);
        }, 400);
    };

    return (
        <div
            className="rounded-2xl p-4 transition-all duration-300 relative overflow-hidden"
            style={{
                background: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.8)',
                border: '1px solid var(--border-secondary)',
                backdropFilter: 'blur(12px)'
            }}
        >
            <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Info block */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                            background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.15), rgba(245, 158, 11, 0.15))',
                            border: '1px solid rgba(167, 139, 250, 0.3)',
                            color: '#a78bfa'
                        }}
                    >
                        <Zap size={20} className="animate-pulse" />
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                Instant AI Goal Evaluator
                            </h4>
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Crown size={10} />
                                <span>PREMIUM</span>
                            </div>
                        </div>
                        <p className="text-xs truncate opacity-75 mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            Active App: <span className="font-semibold text-purple-400">{activeActivity?.owner?.name || 'Monitoring...'}</span> • Goal: <span className="italic">{currentGoal}</span>
                        </p>
                    </div>
                </div>

                {/* Instant Evaluation Action Button */}
                <div className="flex items-center gap-3">
                    {lastEval && (
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl animate-fade-in text-xs font-bold"
                            style={{
                                background: lastEval.rating >= 7 ? 'rgba(52, 211, 153, 0.15)' : lastEval.rating >= 4 ? 'rgba(251, 191, 36, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                                color: lastEval.rating >= 7 ? '#34d399' : lastEval.rating >= 4 ? '#fbbf24' : '#f87171',
                                border: `1px solid ${lastEval.rating >= 7 ? 'rgba(52, 211, 153, 0.3)' : lastEval.rating >= 4 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`
                            }}
                        >
                            <span>{lastEval.rating}/10</span>
                            <span className="capitalize opacity-90">({lastEval.verdict})</span>
                        </div>
                    )}

                    <button
                        onClick={handleEvaluate}
                        disabled={evaluating}
                        className="px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 shadow-md"
                        style={{
                            background: isPremium
                                ? 'linear-gradient(135deg, #a78bfa, #8b5cf6)'
                                : 'var(--bg-elevated)',
                            color: isPremium ? '#fff' : 'var(--text-primary)',
                            border: isPremium ? 'none' : '1px solid var(--border-primary)'
                        }}
                    >
                        {evaluating ? (
                            <Zap size={14} className="animate-spin" />
                        ) : isPremium ? (
                            <Sparkles size={14} />
                        ) : (
                            <Lock size={14} className="text-amber-400" />
                        )}
                        <span>{evaluating ? 'Evaluating...' : 'Instant AI Rating'}</span>
                        {!isPremium && <Crown size={12} className="text-amber-400 ml-0.5" />}
                    </button>
                </div>
            </div>
        </div>
    );
};
