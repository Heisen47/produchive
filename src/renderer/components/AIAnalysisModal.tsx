import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Brain, X, Lightbulb, CheckCircle2, ArrowRight, ShieldAlert, Minus, Loader2, Cpu, Check } from 'lucide-react';
import { ProductivityAnalysis, formatDomainOnly, sanitizeCategoryList } from '../lib/productivityAnalysisService';
import { TrackedActivitiesModal } from './TrackedActivitiesModal';
import { ShareCard } from './ShareCard';
import { useTheme } from './ThemeProvider';
import confetti from 'canvas-confetti';

interface AIAnalysisModalProps {
    analysis: ProductivityAnalysis | null;
    isOpen: boolean;
    onClose: () => void;
    onNavigate?: (view: string) => void;
    goals?: string[];
    isLoading?: boolean;
    loadingStep?: number;
    loadingStageText?: string;
    engineProgressText?: string;
}

const ANALYSIS_STAGES = [
    'Scanning active desktop windows & browser tabs',
    'Analyzing tab content (educational vs distracting)',
    'Connecting to On-Device AI Neural Engine',
    'AI judging productivity alignment vs goals',
    'Finalizing score, category breakdown & coaching tips'
];

export const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({
    analysis,
    isOpen,
    onClose,
    onNavigate,
    goals = [],
    isLoading = false,
    loadingStep = 1,
    loadingStageText = '',
    engineProgressText = '',
}) => {
    const { isDark } = useTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [activitiesModalCategory, setActivitiesModalCategory] = useState<'all' | 'productive' | 'neutral' | 'distracting' | null>(null);

    useEffect(() => {
        if (isOpen && !isLoading && analysis && typeof analysis.rating === 'number' && analysis.rating >= 7) {
            try {
                if (canvasRef.current) {
                    const myConfetti = confetti.create(canvasRef.current, { resize: true, useWorker: true });
                    myConfetti({ particleCount: 70, spread: 100, origin: { y: 0.5 } });
                }
            } catch {
                // Ignore confetti canvas errors
            }
        }
    }, [isOpen, isLoading, analysis]);

    if (!isOpen) return null;

    const getVerdictTheme = (verdict?: string) => {
        switch (verdict) {
            case 'productive':
                return {
                    badgeBg: 'rgba(34, 197, 94, 0.15)',
                    badgeBorder: 'rgba(34, 197, 94, 0.3)',
                    badgeColor: '#4ade80',
                    scoreBg: isDark ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.1)',
                    glow: '0 0 30px rgba(34, 197, 94, 0.25)',
                    title: 'Productive Day',
                };
            case 'unproductive':
                return {
                    badgeBg: 'rgba(239, 68, 68, 0.15)',
                    badgeBorder: 'rgba(239, 68, 68, 0.3)',
                    badgeColor: '#f87171',
                    scoreBg: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.1)',
                    glow: '0 0 30px rgba(239, 68, 68, 0.25)',
                    title: 'Needs Focus Day',
                };
            default:
                return {
                    badgeBg: 'rgba(245, 158, 11, 0.15)',
                    badgeBorder: 'rgba(245, 158, 11, 0.3)',
                    badgeColor: '#fbbf24',
                    scoreBg: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.1)',
                    glow: '0 0 30px rgba(245, 158, 11, 0.25)',
                    title: 'Balanced Day',
                };
        }
    };

    const theme = getVerdictTheme(analysis?.verdict);

    const handleViewFull = () => {
        onClose();
        if (onNavigate) {
            onNavigate('ai');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none w-full h-full z-10"
            />
            <div
                className="relative w-full max-w-xl rounded-2xl p-6 shadow-2xl border transition-all animate-scale-up z-20 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar"
                style={{
                    background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
                    boxShadow: isLoading ? '0 0 40px rgba(99, 102, 241, 0.25)' : `${theme.glow}, 0 25px 50px -12px rgba(0, 0, 0, 0.5)`,
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                            <Brain size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                                AI Productivity Analysis
                            </h3>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                Evaluated from your active windows, browser tabs & routine
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Loading State View */}
                {isLoading ? (
                    <div className="py-6 px-2 flex flex-col items-center animate-fade-in text-center">
                        <div className="relative mb-6">
                            <div className="w-20 h-20 rounded-full flex items-center justify-center bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 animate-pulse">
                                <Cpu size={36} className="animate-spin-slow" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center">
                                <Loader2 size={16} className="animate-spin" />
                            </div>
                        </div>

                        <h4 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                            AI Deliberating on Your Activity
                        </h4>
                        <p className="text-xs mb-6 max-w-md" style={{ color: 'var(--text-muted)' }}>
                            {loadingStageText || 'Analyzing window titles, browser tabs, and schedule alignment...'}
                        </p>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-700/30 rounded-full h-2 mb-6 overflow-hidden border border-white/5">
                            <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(15, (loadingStep / ANALYSIS_STAGES.length) * 100))}%` }}
                            />
                        </div>

                        {/* Step Checkpoints */}
                        <div className="w-full space-y-2.5 text-left mb-4">
                            {ANALYSIS_STAGES.map((stage, idx) => {
                                const stepNum = idx + 1;
                                const isDone = loadingStep > stepNum;
                                const isCurrent = loadingStep === stepNum;

                                return (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-3 p-2.5 rounded-xl border text-xs transition-all"
                                        style={{
                                            background: isCurrent
                                                ? 'rgba(99, 102, 241, 0.12)'
                                                : isDone
                                                ? 'rgba(34, 197, 94, 0.08)'
                                                : 'rgba(255, 255, 255, 0.03)',
                                            borderColor: isCurrent
                                                ? 'rgba(99, 102, 241, 0.3)'
                                                : isDone
                                                ? 'rgba(34, 197, 94, 0.2)'
                                                : 'rgba(255, 255, 255, 0.05)',
                                        }}
                                    >
                                        <div
                                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                                            style={{
                                                background: isDone
                                                    ? 'rgba(34, 197, 94, 0.2)'
                                                    : isCurrent
                                                    ? 'rgba(99, 102, 241, 0.25)'
                                                    : 'rgba(255, 255, 255, 0.1)',
                                                color: isDone ? '#4ade80' : isCurrent ? '#818cf8' : '#94a3b8',
                                            }}
                                        >
                                            {isDone ? <Check size={11} /> : isCurrent ? <Loader2 size={11} className="animate-spin" /> : stepNum}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span
                                                className={`font-medium ${
                                                    isCurrent ? 'text-indigo-300' : isDone ? 'text-slate-200' : 'text-slate-500'
                                                }`}
                                            >
                                                {stage}
                                            </span>
                                            {isCurrent && engineProgressText && (
                                                <p className="text-[10px] text-indigo-400 font-mono mt-0.5 truncate">
                                                    {engineProgressText}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : analysis ? (
                    <>
                        {/* Score & Verdict Banner */}
                        <div
                            className="rounded-2xl p-5 mb-5 flex items-center gap-5 border"
                            style={{
                                background: theme.scoreBg,
                                borderColor: theme.badgeBorder,
                            }}
                        >
                            <div
                                className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold text-2xl shrink-0 shadow-lg border"
                                style={{
                                    background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)',
                                    color: theme.badgeColor,
                                    borderColor: theme.badgeBorder,
                                }}
                            >
                                <span>{analysis.rating}</span>
                                <span className="text-[10px] uppercase font-semibold opacity-70 tracking-widest -mt-1">/10</span>
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
                                        style={{
                                            background: theme.badgeBg,
                                            color: theme.badgeColor,
                                            border: `1px solid ${theme.badgeBorder}`,
                                        }}
                                    >
                                        {theme.title}
                                    </span>
                                    <span className="text-[11px] font-mono opacity-60" style={{ color: 'var(--text-muted)' }}>
                                        {new Date(analysis.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                    {formatDomainOnly(analysis.explanation)}
                                </p>
                            </div>
                        </div>

                        {/* Categorization Overview */}
                        {(() => {
                            const prodItems = sanitizeCategoryList(analysis.categorization.productive);
                            const neutItems = sanitizeCategoryList(analysis.categorization.neutral);
                            const distItems = sanitizeCategoryList(analysis.categorization.distracting);

                            return (
                                <div className="space-y-3 mb-5">
                                    <h4 className="text-xs font-bold uppercase tracking-wider opacity-70" style={{ color: 'var(--text-primary)' }}>
                                        Activity & Tab Breakdown
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                        {/* Productive */}
                                        <div className="p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center justify-between text-emerald-400 font-semibold mb-2 text-[11px]">
                                                    <div className="flex items-center gap-1.5">
                                                        <CheckCircle2 size={12} />
                                                        <span>Productive ({prodItems.length})</span>
                                                    </div>
                                                    {prodItems.length > 5 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setActivitiesModalCategory('productive')}
                                                            className="text-[10px] hover:underline cursor-pointer opacity-80 hover:opacity-100"
                                                        >
                                                            View all
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    {prodItems.length > 0 ? (
                                                        prodItems.slice(0, 5).map((app, i) => (
                                                            <span
                                                                key={i}
                                                                title={app}
                                                                className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 text-[11px] font-medium truncate"
                                                            >
                                                                {app}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">None detected</span>
                                                    )}
                                                </div>
                                            </div>

                                            {prodItems.length > 5 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActivitiesModalCategory('productive')}
                                                    className="mt-2.5 pt-1.5 text-[11px] font-semibold text-emerald-400 hover:underline flex items-center justify-between cursor-pointer border-t border-emerald-500/15 transition-opacity opacity-85 hover:opacity-100 w-full"
                                                >
                                                    <span>+{prodItems.length - 5} more</span>
                                                    <ArrowRight size={11} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Neutral */}
                                        <div className="p-3 rounded-xl border bg-amber-500/5 border-amber-500/20 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center justify-between text-amber-400 font-semibold mb-2 text-[11px]">
                                                    <div className="flex items-center gap-1.5">
                                                        <Minus size={12} />
                                                        <span>Neutral ({neutItems.length})</span>
                                                    </div>
                                                    {neutItems.length > 5 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setActivitiesModalCategory('neutral')}
                                                            className="text-[10px] hover:underline cursor-pointer opacity-80 hover:opacity-100"
                                                        >
                                                            View all
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    {neutItems.length > 0 ? (
                                                        neutItems.slice(0, 5).map((app, i) => (
                                                            <span
                                                                key={i}
                                                                title={app}
                                                                className="px-2 py-1 rounded bg-amber-500/15 text-amber-300 text-[11px] font-medium truncate"
                                                            >
                                                                {app}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">None detected</span>
                                                    )}
                                                </div>
                                            </div>

                                            {neutItems.length > 5 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActivitiesModalCategory('neutral')}
                                                    className="mt-2.5 pt-1.5 text-[11px] font-semibold text-amber-400 hover:underline flex items-center justify-between cursor-pointer border-t border-amber-500/15 transition-opacity opacity-85 hover:opacity-100 w-full"
                                                >
                                                    <span>+{neutItems.length - 5} more</span>
                                                    <ArrowRight size={11} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Distracting */}
                                        <div className="p-3 rounded-xl border bg-rose-500/5 border-rose-500/20 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center justify-between text-rose-400 font-semibold mb-2 text-[11px]">
                                                    <div className="flex items-center gap-1.5">
                                                        <ShieldAlert size={12} />
                                                        <span>Distracting ({distItems.length})</span>
                                                    </div>
                                                    {distItems.length > 5 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setActivitiesModalCategory('distracting')}
                                                            className="text-[10px] hover:underline cursor-pointer opacity-80 hover:opacity-100"
                                                        >
                                                            View all
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    {distItems.length > 0 ? (
                                                        distItems.slice(0, 5).map((app, i) => (
                                                            <span
                                                                key={i}
                                                                title={app}
                                                                className="px-2 py-1 rounded bg-rose-500/15 text-rose-300 text-[11px] font-medium truncate"
                                                            >
                                                                {app}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">None detected</span>
                                                    )}
                                                </div>
                                            </div>

                                            {distItems.length > 5 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActivitiesModalCategory('distracting')}
                                                    className="mt-2.5 pt-1.5 text-[11px] font-semibold text-rose-400 hover:underline flex items-center justify-between cursor-pointer border-t border-rose-500/15 transition-opacity opacity-85 hover:opacity-100 w-full"
                                                >
                                                    <span>+{distItems.length - 5} more</span>
                                                    <ArrowRight size={11} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        <TrackedActivitiesModal
                            isOpen={activitiesModalCategory !== null}
                            onClose={() => setActivitiesModalCategory(null)}
                            categorization={analysis.categorization}
                            initialCategory={activitiesModalCategory || 'all'}
                        />

                        {/* Actionable Tips */}
                        {analysis.tips && analysis.tips.length > 0 && (
                            <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 mb-5">
                                <div className="flex items-center gap-2 mb-2 text-indigo-400 font-semibold text-xs">
                                    <Lightbulb size={14} />
                                    <span>Actionable Coaching Tips</span>
                                </div>
                                <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {analysis.tips.map((tip, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-indigo-400 font-bold shrink-0">•</span>
                                            <span>{formatDomainOnly(tip)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Footer Buttons */}
                        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 mt-auto">
                            <ShareCard
                                analysis={analysis}
                                goals={goals}
                                dateLabel={new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                modelName={analysis.modelName}
                            />

                            <div className="flex items-center gap-2">
                                {onNavigate && (
                                    <button
                                        type="button"
                                        onClick={handleViewFull}
                                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <span>AI Insights</span>
                                        <ArrowRight size={13} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </div>,
        document.body
    );
};
