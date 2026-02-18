import React from 'react';
import { useStore } from '../lib/store';
import { Check, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from './ThemeProvider';

export const TaskList: React.FC = () => {
    const { tasks, toggleTask, deleteTask } = useStore();
    const { isDark } = useTheme();

    if (tasks.length === 0) return null;

    return (
        <div className="space-y-2">
            {tasks.map((task, idx) => (
                <div
                    key={task.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group animate-fade-in-up"
                    style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-secondary)',
                        animationDelay: `${idx * 50}ms`,
                        opacity: task.completed ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-secondary)'; }}
                >
                    {/* Checkbox */}
                    <button
                        onClick={() => toggleTask(task.id)}
                        className="w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 shrink-0"
                        style={{
                            background: task.completed ? 'var(--accent)' : 'transparent',
                            border: task.completed ? '1px solid var(--accent)' : '1px solid var(--border-input)',
                            color: task.completed ? '#fff' : 'transparent',
                        }}
                    >
                        {task.completed && <Check size={12} />}
                    </button>

                    {/* Text */}
                    <span
                        className={clsx(
                            'flex-1 text-sm transition-all duration-200',
                            task.completed && 'line-through'
                        )}
                        style={{ color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}
                    >
                        {task.text}
                    </span>

                    {/* Delete */}
                    <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 rounded-lg opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-200"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
};
