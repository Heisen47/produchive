import React, { useState } from 'react';
import {
    Sparkles,
    LayoutDashboard,
    Calendar,
    Brain,
    Check,
    X,
    ShieldCheck,
    Laptop,
    HelpCircle,
    ExternalLink,
    MessageSquare,
    BookOpen
} from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';
import { GOAL_ROLES } from '../lib/GoalSuggestions';
import { openWebPage } from '../lib/urls';

interface WelcomeModalProps {
    onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
    const { isDark } = useTheme();
    const { selectedRole, setSelectedRole } = useStore();

    const [dontShowAgain, setDontShowAgain] = useState(true);
    const [isExiting, setIsExiting] = useState(false);
    const [showHelpDropdown, setShowHelpDropdown] = useState(false);

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
            title: 'Circadian Routine Planner',
            color: '#8b5cf6',
            bg: 'rgba(139, 92, 246, 0.12)',
            description: 'Draggable time slots with intelligent schedule generation for deep work, meals, and rest.',
        },
        {
            icon: Brain,
            title: 'Local AI Insights & Scoring',
            color: '#10b981',
            bg: 'rgba(16, 185, 129, 0.12)',
            description: 'Privacy-first offline analysis evaluating your focus and alignment with your calendar routine.',
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
                {/* Top Action Buttons (Help & Close) */}
                <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
                    {/* Help Menu Button */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowHelpDropdown(!showHelpDropdown)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-slate-700/60 transition-all cursor-pointer shadow-sm"
                            title="Help & Support"
                        >
                            <HelpCircle size={14} className="text-indigo-400" />
                            <span>Help</span>
                        </button>

                        {showHelpDropdown && (
                            <div
                                className="absolute right-0 mt-2 w-48 rounded-2xl shadow-xl border overflow-hidden p-1.5 z-30 animate-fade-in"
                                style={{
                                    background: isDark ? '#1f212a' : '#ffffff',
                                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        openWebPage('/faq');
                                        setShowHelpDropdown(false);
                                    }}
                                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium hover:bg-indigo-600/15 hover:text-indigo-300 text-slate-200 transition-colors flex items-center justify-between cursor-pointer"
                                >
                                    <span className="flex items-center gap-2">
                                        <BookOpen size={13} className="text-indigo-400" /> FAQ & Docs
                                    </span>
                                    <ExternalLink size={11} className="text-slate-400" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        openWebPage('/contact');
                                        setShowHelpDropdown(false);
                                    }}
                                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium hover:bg-indigo-600/15 hover:text-indigo-300 text-slate-200 transition-colors flex items-center justify-between cursor-pointer"
                                >
                                    <span className="flex items-center gap-2">
                                        <MessageSquare size={13} className="text-indigo-400" /> Contact Us
                                    </span>
                                    <ExternalLink size={11} className="text-slate-400" />
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleFinish}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Header Section */}
                <div className="p-6 md:p-8 pb-5 border-b border-slate-800/60 bg-gradient-to-b from-indigo-500/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-100">
                                Welcome to Produchive
                            </h2>
                            <p className="text-xs text-slate-400">
                                Intelligent privacy-first productivity tracker & circadian routine engine
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    {/* Privacy highlight */}
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-center gap-3">
                        <ShieldCheck size={20} className="text-indigo-400 shrink-0" />
                        <span>
                            <strong>100% Local & Private:</strong> All your application logs, activity timelines, and routine plans stay securely on your own device.
                        </span>
                    </div>

                    {/* Features Grid */}
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

                    {/* Role Selector */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 block flex items-center gap-1.5">
                            <Laptop size={14} className="text-indigo-400" /> Select Your Primary Focus / Role
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {GOAL_ROLES.map((role) => {
                                const isSelected = (selectedRole || 'Software Engineer') === role;
                                return (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => setSelectedRole(role)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
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
                </div>

                {/* Modal Footer */}
                <div className="p-5 md:p-6 border-t border-slate-800/80 flex items-center justify-between bg-slate-900/40">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                                className="rounded bg-slate-800 border-slate-600 text-indigo-600 focus:ring-0"
                            />
                            <span>Don't show on launch</span>
                        </label>

                        {/* Quick web links */}
                        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                            <span>·</span>
                            <button
                                type="button"
                                onClick={() => openWebPage('/faq')}
                                className="hover:text-indigo-400 underline underline-offset-2 transition-colors cursor-pointer"
                            >
                                FAQ
                            </button>
                            <span>·</span>
                            <button
                                type="button"
                                onClick={() => openWebPage('/contact')}
                                className="hover:text-indigo-400 underline underline-offset-2 transition-colors cursor-pointer"
                            >
                                Contact Us
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleFinish}
                            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
                            style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                            }}
                        >
                            <Check size={14} /> Get Started
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
