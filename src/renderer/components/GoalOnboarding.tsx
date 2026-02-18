import React, { useState, useEffect } from 'react';
import { Target, Plus, X, ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';

interface GoalOnboardingProps {
    onClose: () => void;
}

const DEFAULT_SUGGESTIONS = [
    'Complete coding project',
    'Study for 2 hours',
    'Write documentation',
    'Review pull requests',
    'Read technical articles',
    'Practice DSA problems',
    'Work on side project',
    'Clear email inbox',
    'Design new feature',
    'Fix outstanding bugs',
];

export const GoalOnboarding: React.FC<GoalOnboardingProps> = ({ onClose }) => {
    const { goals, addGoal, removeGoal, ratings } = useStore();
    const [inputGoal, setInputGoal] = useState('');
    const { isDark } = useTheme();

    // Extract past goals from ratings history (ratings may contain goals array)
    const pastGoals: string[] = React.useMemo(() => {
        const seen = new Set<string>();
        const result: string[] = [];
        // Collect from ratings (each rating may have a goals field)
        ratings.forEach((r: any) => {
            if (Array.isArray(r.goals)) {
                r.goals.forEach((g: string) => {
                    if (g && !seen.has(g)) {
                        seen.add(g);
                        result.push(g);
                    }
                });
            }
        });
        return result;
    }, [ratings]);

    // Suggestions: past goals first, then defaults to fill up
    const suggestions = React.useMemo(() => {
        const currentSet = new Set(goals);
        const pastFiltered = pastGoals.filter(g => !currentSet.has(g));
        if (pastFiltered.length >= 6) return pastFiltered.slice(0, 8);
        const defaultFiltered = DEFAULT_SUGGESTIONS.filter(
            g => !currentSet.has(g) && !pastFiltered.includes(g)
        );
        return [...pastFiltered, ...defaultFiltered].slice(0, 8);
    }, [pastGoals, goals]);

    const hasPastGoals = pastGoals.length > 0;

    const handleAddGoal = () => {
        if (inputGoal.trim().length > 2 && goals.length < 5) {
            addGoal(inputGoal.trim());
            setInputGoal('');
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        if (goals.length < 5 && !goals.includes(suggestion)) {
            addGoal(suggestion);
        }
    };

    if (goals.length > 0 && goals.length >= 5) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in" style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(12px)' }}>
            <div
                className="w-full max-w-lg mx-4 rounded-2xl p-8 animate-scale-in glass-card-static"
                style={{
                    boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.5), 0 0 40px var(--accent-glow)' : '0 25px 60px rgba(0,0,0,0.15)',
                }}
            >
                {/* Header */}
                <div className="text-center mb-6">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(147,51,234,0.2))',
                            border: '1px solid rgba(99,102,241,0.3)',
                        }}
                    >
                        <Sparkles size={28} style={{ color: '#818cf8' }} />
                    </div>
                    <h2 className="text-2xl font-display font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Welcome to Produchive</h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Set your goals to get personalized productivity insights.</p>
                </div>

                {/* Goals List */}
                {goals.length > 0 && (
                    <div className="space-y-2 mb-5">
                        {goals.map((goal, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 px-3 py-2 rounded-xl animate-fade-in-up"
                                style={{
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-secondary)',
                                }}
                            >
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                                >
                                    {index + 1}
                                </div>
                                <span className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{goal}</span>
                                <button onClick={() => removeGoal(index)} className="p-1 rounded transition-colors"
                                    style={{ color: 'var(--text-muted)' }}
                                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Suggestion Bubbles */}
                {goals.length < 5 && suggestions.length > 0 && (
                    <div className="mb-5">
                        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                            {hasPastGoals ? '⏱ Your past goals' : '✨ Quick suggestions'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((suggestion) => {
                                const isSelected = goals.includes(suggestion);
                                const isFull = goals.length >= 5;
                                return (
                                    <button
                                        key={suggestion}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        disabled={isSelected || isFull}
                                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{
                                            background: isSelected
                                                ? 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(147,51,234,0.3))'
                                                : 'var(--bg-elevated)',
                                            border: isSelected
                                                ? '1px solid rgba(99,102,241,0.5)'
                                                : '1px solid var(--border-secondary)',
                                            color: isSelected ? '#818cf8' : 'var(--text-secondary)',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected && !isFull) {
                                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)';
                                                (e.currentTarget as HTMLElement).style.color = '#818cf8';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) {
                                                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-secondary)';
                                                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                                            }
                                        }}
                                    >
                                        {isSelected ? '✓ ' : '+ '}{suggestion}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Goal Input */}
                {goals.length < 5 && (
                    <div className="flex gap-2 mb-6">
                        <input
                            type="text"
                            className="flex-1 rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-200"
                            placeholder="Or type a custom goal..."
                            value={inputGoal}
                            onChange={(e) => setInputGoal(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                            style={{
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-input)',
                                color: 'var(--text-primary)',
                            }}
                            onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
                            onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-input)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                        />
                        <button
                            onClick={handleAddGoal}
                            disabled={!inputGoal.trim() || inputGoal.trim().length <= 2}
                            className="px-4 py-2 rounded-xl disabled:opacity-40 transition-all duration-200 hover:scale-105"
                            style={{
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: '#fff',
                            }}
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    {goals.length > 0 && (
                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02]"
                            style={{
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: '#fff',
                                boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                            }}
                        >
                            Get Started <ArrowRight size={18} />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="w-full py-2 text-sm transition-colors duration-200"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        </div>
    );
};
