import React, { useState } from 'react';
import { Target, Plus, Check, X, ArrowRight } from 'lucide-react';
import { useStore } from '../lib/store';

export const GoalOnboarding = ({ onClose }: { onClose: () => void }) => {
    const { goals, addGoal, removeGoal } = useStore();
    const [input, setInput] = useState('');

    const handleAdd = () => {
        if (input.trim() && goals.length < 5) {
            addGoal(input.trim());
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleAdd();
    };

    const handleStart = () => {
        if (input.trim() && goals.length < 5) {
            addGoal(input.trim());
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <div className="inline-flex p-3 bg-indigo-500/20 rounded-full mb-4">
                        <Target size={32} className="text-indigo-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Set Your Focus Goals</h2>
                    <p className="text-gray-400">
                        What do you want to achieve today? Add up to 5 main goals.
                        We'll analyze your activity against these.
                    </p>
                </div>

                <div className="space-y-3 mb-6">
                    {goals.map((goal, index) => (
                        <div key={index} className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold">
                                {index + 1}
                            </div>
                            <span className="flex-1 text-gray-200">{goal}</span>
                            <button 
                                onClick={() => removeGoal(index)}
                                className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                    
                    {goals.length < 5 && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 placeholder:text-gray-600"
                                placeholder="Add a new goal..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                            />
                            <button
                                onClick={handleAdd}
                                disabled={!input.trim()}
                                className="p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-gray-400 hover:text-white font-medium transition-colors"
                    >
                        Skip for now
                    </button>
                    <button
                        onClick={handleStart}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                        Start Productivity
                        <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
