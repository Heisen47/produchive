import React, { useState } from 'react';
import { Target, Check, Plus, X, Edit2, AlertCircle } from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';
import { LuffyBg } from './LuffyBg';

import { GOAL_SUGGESTIONS_BY_ROLE, GoalRole } from '../lib/GoalSuggestions';

const DEFAULT_SUGGESTIONS = GOAL_SUGGESTIONS_BY_ROLE['Software Engineer'];

export const GoalSetter = () => {
    const [inputGoal, setInputGoal] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const { isDark } = useTheme();

    const { goals, addGoal, removeGoal, editGoal, selectedRole } = useStore();
    
    const suggestions = GOAL_SUGGESTIONS_BY_ROLE[(selectedRole as GoalRole) || 'Software Engineer'] || DEFAULT_SUGGESTIONS;

    const handleAddGoal = () => {
        if (inputGoal.trim().length > 2 && goals.length < 5) {
            addGoal(inputGoal.trim());
            setInputGoal('');
        }
    };

    const startEditing = (index: number, currentGoal: string) => {
        setEditingIndex(index);
        setEditValue(currentGoal);
    };

    const saveEdit = (index: number) => {
        if (editValue.trim()) {
            editGoal(index, editValue.trim());
        }
        setEditingIndex(null);
    };

    return (
        <div
            className="glass-card-static rounded-2xl p-6 mb-6 animate-fade-in-up relative overflow-hidden"
            style={{
                borderImage: isDark ? 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(147,51,234,0.2), transparent) 1' : undefined,
            }}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className="p-2 rounded-xl"
                        style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                        }}
                    >
                        <Target size={20} style={{ color: '#818cf8' }} />
                    </div>
                    <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>Your Targets ({goals.length}/5)</h3>
                </div>
            </div>

            <div className="space-y-3 mb-4">
                {goals.map((goal, index) => (
                    <div
                        key={index}
                        className="group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 animate-fade-in-up"
                        style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-secondary)',
                            animationDelay: `${index * 50}ms`,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-secondary)'; }}
                    >
                        <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#818cf8',
                            }}
                        >
                            {index + 1}
                        </div>

                        {editingIndex === index ? (
                            <div className="flex-1 flex gap-2">
                                <input
                                    className="flex-1 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    style={{
                                        background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-input)',
                                    }}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(index)}
                                />
                                <button onClick={() => saveEdit(index)} className="p-1 rounded" style={{ color: '#4ade80' }}>
                                    <Check size={16} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <span className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{goal}</span>
                                <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEditing(index, goal)}
                                        className="p-1.5 rounded-lg transition-colors"
                                        style={{ color: 'var(--text-muted)' }}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLElement).style.background = 'var(--accent-glow)'; }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => removeGoal(index)}
                                        className="p-1.5 rounded-lg transition-colors"
                                        style={{ color: 'var(--text-muted)' }}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {goals.length === 0 && (
                    <div className="space-y-4 mb-2">
                        {/* Suggestion bubbles */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                                ✨ Quick suggestions
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {suggestions.slice(0, 8).map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => { if (goals.length < 5) addGoal(suggestion); }}
                                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                                        style={{
                                            background: 'var(--bg-elevated)',
                                            border: '1px solid var(--border-secondary)',
                                            color: 'var(--text-secondary)',
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)';
                                            (e.currentTarget as HTMLElement).style.color = '#818cf8';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-secondary)';
                                            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                                        }}
                                    >
                                        + {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {goals.length < 5 && (
                <div className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all duration-200"
                        placeholder="Add a goal..."
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
                        disabled={!inputGoal.trim()}
                        className="px-4 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#fff',
                            boxShadow: inputGoal.trim() ? '0 4px 15px rgba(99,102,241,0.3)' : 'none',
                        }}
                    >
                        <Plus size={20} />
                    </button>
                </div>
            )}

            {/* Specificity tip */}
            <div className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    <span className="font-semibold" style={{ color: '#fbbf24' }}>Be specific.</span>{' '}
                    Vague goals like "be productive" lead to weaker AI evaluations. Try "Complete 3 coding tasks" or "Study React for 2 hours" instead.
                </p>
            </div>

            {/* Luffy — subtle background character like Totoro */}
            <LuffyBg mood={goals.length > 0 ? 'happy' : 'sad'} />
        </div>
    );
};
