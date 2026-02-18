import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { Plus } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export const TaskInput: React.FC = () => {
    const [text, setText] = useState('');
    const addTask = useStore(s => s.addTask);
    const { isDark } = useTheme();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            addTask(text.trim());
            setText('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
            <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Add a task..."
                className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all duration-200"
                style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-input)',
                    color: 'var(--text-primary)',
                }}
                onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
                onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-input)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            />
            <button
                type="submit"
                disabled={!text.trim()}
                className="p-2.5 rounded-xl disabled:opacity-40 transition-all duration-200 hover:scale-105"
                style={{
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                    color: '#fff',
                    boxShadow: text.trim() ? '0 4px 12px var(--accent-glow)' : 'none',
                }}
            >
                <Plus size={18} />
            </button>
        </form>
    );
};
