import React, { useState } from 'react';
import { Target, Check, Plus, X, Edit2, Save } from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';

export const GoalSetter = () => {
    const [inputGoal, setInputGoal] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const { isDark } = useTheme();

    const { goals, addGoal, removeGoal, editGoal } = useStore();

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
            className="glass-card-static rounded-2xl p-6 mb-6 animate-fade-in-up"
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
                    <div className="text-center py-6 rounded-xl" style={{ border: '2px dashed var(--border-primary)' }}>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No goals set yet</p>
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
        </div>
    );
};
