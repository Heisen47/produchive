import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';
import { Brain, Calendar, CheckCircle2, Clock, Plus, Sparkles, Lightbulb, BookOpen } from 'lucide-react';

export const SpacedRepetitionWidget: React.FC = () => {
    const { isDark } = useTheme();
    const goals = useStore(state => state.goals);
    const [reminders, setReminders] = useState<any[]>([]);
    const [customTopic, setCustomTopic] = useState('');
    const [loading, setLoading] = useState(false);

    const loadReminders = async () => {
        if (window.electronAPI?.getSpacedRepetitions) {
            try {
                const list = await window.electronAPI.getSpacedRepetitions();
                setReminders(list || []);
            } catch (err) {
                console.error('Failed to load spaced repetition reminders:', err);
            }
        }
    };

    useEffect(() => {
        loadReminders();
    }, []);

    const handleCreateReminder = async (topicName?: string) => {
        const topic = topicName || customTopic || (goals.length > 0 ? goals[0] : 'LeetCode & Problem Solving');
        if (!topic.trim()) return;

        setLoading(true);
        try {
            if (window.electronAPI?.saveSpacedRepetition) {
                await window.electronAPI.saveSpacedRepetition({
                    topic: topic.trim(),
                    title: `3-Day Practice Review: ${topic.trim()}`,
                    daysDelay: 3.5
                });
                setCustomTopic('');
                await loadReminders();
            }
        } catch (err) {
            console.error('Failed to save spaced repetition reminder:', err);
        }
        setLoading(false);
    };

    const handleToggle = async (id: string) => {
        try {
            if (window.electronAPI?.toggleSpacedRepetition) {
                const updated = await window.electronAPI.toggleSpacedRepetition(id);
                setReminders(updated || []);
            }
        } catch (err) {
            console.error('Failed to toggle reminder:', err);
        }
    };

    return (
        <div
            className="rounded-2xl p-5 transition-all duration-300 relative overflow-hidden mb-6"
            style={{
                background: isDark ? 'var(--bg-card)' : 'rgba(255, 255, 255, 0.9)',
                border: '1px solid var(--border-secondary)',
            }}
        >
            {/* Scientific Tip Header Banner */}
            <div className="p-4 rounded-xl mb-4 relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.12))',
                    border: '1px solid rgba(168, 85, 247, 0.25)'
                }}
            >
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
                        <Brain size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                                🧠 Scientific Learning Insight (Spaced Repetition)
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Ebbinghaus Curve
                            </span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            <strong className="text-purple-300">Why review after 3–4 days?</strong> Scientific cognitive research proves that revisiting study topics (such as LeetCode problems or core concepts) <strong>3 to 4 days</strong> after initial practice strengthens neural pathways, converting short-term learning into permanent long-term memory.
                        </p>
                    </div>
                </div>
            </div>

            {/* Header & Auto Scheduler */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-indigo-400" />
                    <h3 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                        3-Day Practice Review Schedule
                    </h3>
                </div>

                {goals.length > 0 && (
                    <button
                        onClick={() => handleCreateReminder(goals[0])}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#fff'
                        }}
                    >
                        <Sparkles size={12} />
                        <span>Schedule 3-Day Review for "{goals[0].slice(0, 20)}..."</span>
                    </button>
                )}
            </div>

            {/* Custom Input */}
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    placeholder="Enter study topic (e.g., LeetCode 2-Hour Study)..."
                    value={customTopic}
                    onChange={e => setCustomTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateReminder()}
                    className="flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none"
                    style={{
                        background: isDark ? 'rgba(0,0,0,0.3)' : '#fff',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-input)'
                    }}
                />
                <button
                    onClick={() => handleCreateReminder()}
                    disabled={!customTopic.trim() || loading}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 cursor-pointer flex items-center gap-1"
                >
                    <Plus size={14} />
                    <span>Add Review</span>
                </button>
            </div>

            {/* List of Scheduled Spaced Repetitions */}
            {reminders.length === 0 ? (
                <div className="text-center py-4 text-xs opacity-60 italic" style={{ color: 'var(--text-secondary)' }}>
                    No active 3-day practice reviews scheduled yet. Complete a study session or add a goal above to trigger scientific spaced repetition reminders!
                </div>
            ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {reminders.map(item => (
                        <div
                            key={item.id}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                                item.completed ? 'opacity-50' : ''
                            }`}
                            style={{
                                background: isDark ? 'rgba(15, 23, 42, 0.5)' : 'var(--bg-elevated)',
                                borderColor: item.completed ? 'var(--border-secondary)' : 'rgba(99, 102, 241, 0.3)'
                            }}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <button
                                    onClick={() => handleToggle(item.id)}
                                    className="cursor-pointer text-indigo-400 hover:text-indigo-300"
                                >
                                    <CheckCircle2 size={18} className={item.completed ? 'fill-emerald-400 text-emerald-400' : ''} />
                                </button>
                                <div className="min-w-0">
                                    <div className={`text-xs font-bold truncate ${item.completed ? 'line-through' : ''}`} style={{ color: 'var(--text-primary)' }}>
                                        {item.title}
                                    </div>
                                    <div className="text-[10px] opacity-75 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                                        <Clock size={10} />
                                        <span>Due for review: <strong>{item.dueDate}</strong></span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 shrink-0">
                                Spaced 3-Day
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
