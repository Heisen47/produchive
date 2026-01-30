import React, { useState } from 'react';
import { Target, Check } from 'lucide-react';
import { useStore } from '../lib/store';

export const GoalSetter = () => {
    const [inputGoal, setInputGoal] = useState('');
    const { goal, setGoal } = useStore();

    const handleSetGoal = () => {
        if (inputGoal.trim()) {
            setGoal(inputGoal.trim());
            setInputGoal('');
        }
    };

    if (goal) {
        return (
            <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-700/50 rounded-2xl p-6 mb-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-600/30 rounded-full">
                        <Target size={24} className="text-purple-300" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-purple-200 mb-1">Your Goal</h3>
                        <p className="text-white text-base">{goal}</p>
                        <button
                            onClick={() => setGoal(null)}
                            className="mt-3 text-sm text-purple-300 hover:text-purple-100 underline cursor-pointer"
                        >
                            Change goal
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-2 border-dashed border-purple-700/50 rounded-2xl p-8 mb-6 text-center">
            <div className="inline-flex p-4 bg-purple-600/20 rounded-full mb-4">
                <Target size={32} className="text-purple-300" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Set Your Goal</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
                What do you want to achieve today? I'll monitor your activities and help you stay on track.
            </p>
            <div className="flex gap-2 max-w-lg mx-auto">
                <input
                    type="text"
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 placeholder:text-gray-500"
                    placeholder="e.g., Complete my project proposal"
                    value={inputGoal}
                    onChange={(e) => setInputGoal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSetGoal()}
                />
                <button
                    onClick={handleSetGoal}
                    disabled={!inputGoal.trim()}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-semibold flex items-center gap-2 transition-all"
                >
                    <Check size={20} />
                    Set Goal
                </button>
            </div>
        </div>
    );
};
