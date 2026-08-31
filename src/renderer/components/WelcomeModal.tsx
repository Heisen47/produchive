import React, { useState, useMemo } from 'react';
import {
    Sparkles,
    LayoutDashboard,
    Calendar,
    Brain,
    Target,
    ArrowRight,
    ArrowLeft,
    Check,
    Plus,
    X,
    ShieldCheck,
    Laptop,
    CheckCircle2
} from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';
import { GOAL_ROLES, GOAL_SUGGESTIONS_BY_ROLE, GoalRole } from '../lib/GoalSuggestions';

interface WelcomeModalProps {
    onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
    const { isDark } = useTheme();
    const { goals, addGoal, removeGoal, selectedRole, setSelectedRole, ratings } = useStore();

    const [currentStep, setCurrentStep] = useState<1 | 2>(1);
    const [dontShowAgain, setDontShowAgain] = useState(true);
    const [inputGoal, setInputGoal] = useState('');
    const [isExiting, setIsExiting] = useState(false);

    // Dynamic suggestions based on selected role
    const suggestions = useMemo(() => {
        const currentSet = new Set(goals);
        const roleSuggestions = GOAL_SUGGESTIONS_BY_ROLE[(selectedRole as GoalRole) || 'Software Engineer'] || [];
        return roleSuggestions.filter((g) => !currentSet.has(g)).slice(0, 8);
    }, [goals, selectedRole]);

    const handleAddGoal = (text?: string) => {
        const goalToAdd = (text || inputGoal).trim();
        if (goalToAdd.length > 1 && goals.length < 5 && !goals.includes(goalToAdd)) {
            addGoal(goalToAdd);
            if (!text) setInputGoal('');
        }
    };

    const handleFinish = async () => {
        setIsExiting(true);
        if (dontShowAgain) {
            try {
                await window.electronAPI.setSetting('welcomeDismissed', true);
            } catch (e) {
                console.error('Failed to save welcome setting:', e);
            }
        }
        setTimeout(onClose, 250);
    };

    const features = [
        {
            icon: LayoutDashboard,
            title: 'Real-Time Activity Tracker',
            color: '#3b82f6',
            bg: 'rgba(59, 130, 246, 0.12)',
            description: 'Automatically records active windows, apps, and time distribution offline on your device.',
        },
        {
            icon: Calendar,
            title: 'Teams-Style Routine Planner',
            color: '#8b5cf6',
            bg: 'rgba(139, 92, 246, 0.12)',
            description: 'Draggable time slots with intelligent schedule generation for deep work, meals, and rest.',
        },
        {
            icon: Brain,
            title: 'Local AI Insights & Scoring',
            color: '#10b981',
            bg: 'rgba(16, 185, 129, 0.12)',
            description: 'Privacy-first offline analysis evaluating your focus and alignment with your daily goals.',
        },
    ];

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
                isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
            style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(16px)' }}
        >
            <div
                className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border flex flex-col max-h-[90vh] animate-scale-in"
                style={{
                    background: isDark ? '#16171d' : '#ffffff',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    boxShadow: isDark
                        ? '0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(99,102,241,0.15)'
                        : '0 25px 60px rgba(0,0,0,0.15)',
                }}
            >
                {/* Top Close / Skip Button */}
                <button
                    onClick={handleFinish}
                    className="absolute top-5 right-5 z-20 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Close"
                >
                    <X size={18} />
                </button>

                {/* Header Section */}
                <div className="p-6 md:p-8 pb-4 border-b border-slate-800/60 bg-gradient-to-b from-indigo-500/10 to-transparent">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-100">
                                Welcome to Produchive
                            </h2>
                            <p className="text-xs text-slate-400">
                                Intelligent privacy-first productivity assistant & routine engine
                            </p>
                        </div>
                    </div>

                    {/* Stepper Indicator */}
                    <div className="flex items-center gap-2 mt-4">
                        <button
                            onClick={() => setCurrentStep(1)}
                            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                                currentStep === 1
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-white/5 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <span>1. Overview & Capabilities</span>
                        </button>
                        <button
                            onClick={() => setCurrentStep(2)}
                            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                                currentStep === 2
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-white/5 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <span>2. Personalize & Daily Goals</span>
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    {currentStep === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-center gap-3">
                                <ShieldCheck size={20} className="text-indigo-400 shrink-0" />
                                <span>
                                    <strong>100% Local & Private:</strong> All your application logs, tasks, and routine data stay securely stored on your own device.
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-3.5">
                                {features.map((f, i) => {
                                    const Icon = f.icon;
                                    return (
                                        <div
                                            key={i}
                                            className="p-4 rounded-2xl border transition-all hover:translate-y-[-2px] flex items-start gap-4"
                                            style={{
                                                background: isDark ? 'rgba(255,255,255,0.03)' : '#f8f9fa',
                                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                                            }}
                                        >
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ background: f.bg, color: f.color }}
                                            >
                                                <Icon size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-100">{f.title}</h3>
                                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                    {f.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Role Selector */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 block flex items-center gap-1.5">
                                    <Laptop size={14} className="text-indigo-400" /> Select Your Primary Role
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {GOAL_ROLES.map((role) => {
                                        const isSelected = (selectedRole || 'Software Engineer') === role;
                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setSelectedRole(role)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                                                    isSelected
                                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                                        : 'bg-white/5 border border-slate-700 text-slate-300 hover:bg-white/10'
                                                }`}
                                            >
                                                {role}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Today's Goals */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <Target size={14} className="text-indigo-400" /> Set Today's Objectives (Max 5)
                                    </label>
                                    <span className="text-xs text-slate-500 font-mono">{goals.length}/5</span>
                                </div>

                                {/* Custom Goal Input */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="e.g. Build core routine calendar & review PRs"
                                        value={inputGoal}
                                        onChange={(e) => setInputGoal(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddGoal();
                                        }}
                                        disabled={goals.length >= 5}
                                        className="flex-1 px-3.5 py-2.5 rounded-xl text-xs bg-slate-800/80 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleAddGoal()}
                                        disabled={goals.length >= 5 || !inputGoal.trim()}
                                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold transition-all flex items-center gap-1"
                                    >
                                        <Plus size={14} /> Add
                                    </button>
                                </div>

                                {/* Selected Goals List */}
                                {goals.length > 0 && (
                                    <div className="space-y-2 pt-1">
                                        {goals.map((g, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <CheckCircle2 size={14} className="text-indigo-400 shrink-0" />
                                                    <span className="text-xs font-semibold text-slate-200 truncate">
                                                        {g}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => removeGoal(idx)}
                                                    className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Suggested Goals */}
                                {suggestions.length > 0 && goals.length < 5 && (
                                    <div className="pt-2">
                                        <span className="text-[11px] text-slate-500 font-medium block mb-2">
                                            Quick Suggestions:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {suggestions.map((sug, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => handleAddGoal(sug)}
                                                    className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-300 border border-slate-800 text-slate-400 transition-all flex items-center gap-1"
                                                >
                                                    <Plus size={11} /> {sug}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-5 md:p-6 border-t border-slate-800/80 flex items-center justify-between bg-slate-900/40">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="rounded bg-slate-800 border-slate-600 text-indigo-600 focus:ring-0"
                        />
                        <span>Don't show on launch</span>
                    </label>

                    <div className="flex items-center gap-3">
                        {currentStep === 2 ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(1)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all flex items-center gap-1.5"
                                >
                                    <ArrowLeft size={14} /> Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleFinish}
                                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
                                    style={{
                                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                                    }}
                                >
                                    <Check size={14} /> Get Started
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setCurrentStep(2)}
                                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                                }}
                            >
                                Next <ArrowRight size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
