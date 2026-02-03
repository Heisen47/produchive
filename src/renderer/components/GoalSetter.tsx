import React, { useState } from 'react';
import { Target, Check, Plus, X, Edit2, Save } from 'lucide-react';
import { useStore } from '../lib/store';

export const GoalSetter = () => {
    const [inputGoal, setInputGoal] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    
    const { goals, addGoal, removeGoal, editGoal } = useStore();

    const handleAddGoal = () => {
        if (inputGoal.trim() && goals.length < 5) {
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
        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                        <Target size={20} className="text-indigo-400" />
                    </div>
                    <h3 className="font-bold text-white">Your Targets ({goals.length}/5)</h3>
                </div>
            </div>

            <div className="space-y-3 mb-4">
                {goals.map((goal, index) => (
                    <div key={index} className="group flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-xs font-bold shrink-0">
                            {index + 1}
                        </div>
                        
                        {editingIndex === index ? (
                            <div className="flex-1 flex gap-2">
                                <input
                                    className="flex-1 bg-black/40 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(index)}
                                />
                                <button onClick={() => saveEdit(index)} className="text-green-400 hover:bg-green-400/10 p-1 rounded">
                                    <Check size={16} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <span className="flex-1 text-gray-200 text-sm">{goal}</span>
                                <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => startEditing(index, goal)}
                                        className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => removeGoal(index)}
                                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {goals.length === 0 && (
                     <div className="text-center py-6 border-2 border-dashed border-gray-800 rounded-xl">
                        <p className="text-gray-500 text-sm">No goals set yet</p>
                    </div>
                )}
            </div>

            {goals.length < 5 && (
                <div className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder:text-gray-600"
                        placeholder="Add a goal..."
                        value={inputGoal}
                        onChange={(e) => setInputGoal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                    />
                    <button
                        onClick={handleAddGoal}
                        disabled={!inputGoal.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};
