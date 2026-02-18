import React, { useState } from 'react';
import { Target, Plus, X, ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';

interface GoalOnboardingProps {
    onClose: () => void;
}

export const GoalOnboarding: React.FC<GoalOnboardingProps> = ({ onClose }) => {
    const { goals, addGoal, removeGoal } = useStore();
    const [inputGoal, setInputGoal] = useState('');
    const { isDark } = useTheme();

    const handleAddGoal = () => {
        if (inputGoal.trim().length > 2 && goals.length < 5) {
            addGoal(inputGoal.trim());
            setInputGoal('');
        }
    };

    if (goals.length > 0) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in" style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(12px)' }}>
            <div
                className="w-full max-w-md mx-4 rounded-2xl p-8 animate-scale-in glass-card-static"
                style={{
                    boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.5), 0 0 40px var(--accent-glow)' : '0 25px 60px rgba(0,0,0,0.15)',
                }}
            >
                {/* Header */}
                <div className="text-center mb-8">
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
                <div className="space-y-2 mb-6">
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

                {/* Goal Input */}
                {goals.length < 5 && (
                    <div className="flex gap-2 mb-6">
                        <input
                            type="text"
                            className="flex-1 rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-200"
                            placeholder="e.g., Finish coding assignment..."
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
