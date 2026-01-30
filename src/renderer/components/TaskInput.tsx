import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { Plus } from 'lucide-react';

export const TaskInput = () => {
    const [text, setText] = useState('');
    const addTask = useStore((state) => state.addTask);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            addTask(text.trim());
            setText('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's a priority today?"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-500"
            />
            <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-colors cursor-pointer"
            >
                <Plus size={24} />
            </button>
        </form>
    );
};
