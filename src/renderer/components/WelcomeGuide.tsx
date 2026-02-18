import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Activity,
    Target,
    Sparkles,
    ArrowRight,
    X,
    GraduationCap,
    Eye,
    Brain,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface Step {
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
    title: string;
    description: string;
    tip: string;
}

const steps: Step[] = [
    {
        icon: GraduationCap,
        iconColor: '#3b82f6',
        iconBg: 'rgba(59, 130, 246, 0.12)',
        title: 'Welcome to Produchive',
        description: 'Your AI-powered productivity companion that tracks your application usage and provides intelligent insights to help you stay focused.',
        tip: 'Use the sidebar on the left to navigate between sections.',
    },
    {
        icon: LayoutDashboard,
        iconColor: '#22c55e',
        iconBg: 'rgba(34, 197, 94, 0.12)',
        title: 'Dashboard',
        description: 'Your command center. See aggregated usage statistics, top applications, and total time tracked — all at a glance.',
        tip: 'Click "Start Monitoring" to begin tracking your activity.',
    },
    {
        icon: Eye,
        iconColor: '#f59e0b',
        iconBg: 'rgba(245, 158, 11, 0.12)',
        title: 'Live Monitor',
        description: 'Watch system events stream in real-time. The terminal shows raw events while the activity feed summarizes app usage.',
        tip: 'Both panels update live as you switch between applications.',
    },
    {
        icon: Brain,
        iconColor: '#a855f7',
        iconBg: 'rgba(168, 85, 247, 0.12)',
        title: 'Goals & AI Analysis',
        description: 'Set daily objectives and let our local AI analyze your patterns. Get a productivity score, verdict, and actionable tips.',
        tip: 'Activate the AI engine from the header button first, then generate a report.',
    },
];

interface WelcomeGuideProps {
    onClose: () => void;
}

export const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ onClose }) => {
    const { isDark } = useTheme();
    const [current, setCurrent] = useState(0);
    const [isExiting, setIsExiting] = useState(false);
    const [slideDir, setSlideDir] = useState<'left' | 'right'>('right');
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const step = steps[current];
    const isLast = current === steps.length - 1;
    const isFirst = current === 0;

    const handleDismiss = () => {
        setIsExiting(true);
        if (dontShowAgain) {
            window.electronAPI.setSetting('welcomeDismissed', true);
        }
        setTimeout(onClose, 300);
    };

    const goNext = () => {
        if (isLast) {
            handleDismiss();
            return;
        }
        setSlideDir('right');
        setCurrent(prev => prev + 1);
    };

    const goPrev = () => {
        if (isFirst) return;
        setSlideDir('left');
        setCurrent(prev => prev - 1);
    };

    const StepIcon = step.icon;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(12px)' }}
        >
            <div
                className="relative w-full max-w-lg rounded-2xl overflow-hidden animate-scale-in"
                style={{
                    background: 'var(--bg-card-solid)',
                    border: '1px solid var(--border-card)',
                    boxShadow: isDark
                        ? '0 25px 60px rgba(0,0,0,0.5), 0 0 40px var(--accent-glow)'
                        : '0 25px 60px rgba(0,0,0,0.15)',
                }}
            >
                {/* Skip button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 z-10 p-2 rounded-lg transition-all duration-200"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                    }}
                >
                    <X size={18} />
                </button>

                {/* Progress bar */}
                <div className="h-1 w-full" style={{ background: 'var(--bg-elevated)' }}>
                    <div
                        className="h-full transition-all duration-500 ease-out"
                        style={{
                            width: `${((current + 1) / steps.length) * 100}%`,
                            background: 'linear-gradient(90deg, var(--accent), var(--accent-light))',
                            boxShadow: '0 0 10px var(--accent-glow)',
                        }}
                    />
                </div>

                {/* Content */}
                <div className="p-8 pt-6">
                    {/* Step Indicator */}
                    <div className="flex items-center gap-2 mb-6">
                        <span
                            className="text-xs font-bold uppercase tracking-widest"
                            style={{ color: 'var(--accent)' }}
                        >
                            Step {current + 1} of {steps.length}
                        </span>
                    </div>

                    {/* Icon */}
                    <div
                        key={current}
                        className="animate-fade-in-up"
                    >
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-500 hover:rotate-6 hover:scale-110"
                            style={{ background: step.iconBg, color: step.iconColor }}
                        >
                            <StepIcon size={28} />
                        </div>

                        {/* Title */}
                        <h2
                            className="text-2xl font-bold mb-3 tracking-tight"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {step.title}
                        </h2>

                        {/* Description */}
                        <p
                            className="text-sm leading-relaxed mb-5"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            {step.description}
                        </p>

                        {/* Tip */}
                        <div
                            className="flex items-start gap-3 p-4 rounded-xl text-sm"
                            style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-secondary)',
                                color: 'var(--text-secondary)',
                            }}
                        >
                            <Sparkles size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                            <span>{step.tip}</span>
                        </div>
                    </div>
                </div>

                {/* Footer: checkbox + navigation */}
                <div className="px-6 pb-6 pt-2 space-y-4">
                    {/* Don't show again checkbox */}
                    <label
                        className="flex items-center gap-2.5 cursor-pointer select-none group"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="w-4 h-4 rounded cursor-pointer accent-blue-500"
                        />
                        <span className="text-xs font-medium transition-colors group-hover:text-[var(--text-secondary)]">
                            Don&apos;t show this again
                        </span>
                    </label>

                    {/* Navigation row */}
                    <div className="flex items-center justify-between">
                    {/* Step Dots */}
                    <div className="flex gap-2">
                        {steps.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setSlideDir(i > current ? 'right' : 'left');
                                    setCurrent(i);
                                }}
                                className="transition-all duration-300"
                                style={{
                                    width: i === current ? 24 : 8,
                                    height: 8,
                                    borderRadius: 4,
                                    background: i === current
                                        ? 'var(--accent)'
                                        : i < current
                                            ? 'var(--accent-glow)'
                                            : 'var(--bg-elevated)',
                                    boxShadow: i === current ? '0 0 8px var(--accent-glow)' : 'none',
                                }}
                            />
                        ))}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        {!isFirst && (
                            <button
                                onClick={goPrev}
                                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
                                style={{
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-secondary)',
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-secondary)';
                                }}
                            >
                                <ChevronLeft size={16} />
                                Back
                            </button>
                        )}
                        <button
                            onClick={goNext}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 hover:scale-105 active:scale-95"
                            style={{
                                background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                                color: '#fff',
                                boxShadow: '0 4px 15px var(--accent-glow)',
                            }}
                        >
                            {isLast ? (
                                <>
                                    Get Started
                                    <GraduationCap size={16} />
                                </>
                            ) : (
                                <>
                                    Next
                                    <ChevronRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
