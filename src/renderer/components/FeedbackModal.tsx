import React from 'react';
import { MessageSquareHeart, ExternalLink, X, Clock, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from './ThemeProvider';
import { openFeedbackForm } from '../lib/urls';
import { recordFeedbackGiven, snoozeFeedback } from '../lib/feedbackManager';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentVersion: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
    isOpen,
    onClose,
    currentVersion,
}) => {
    const { isDark } = useTheme();

    if (!isOpen) return null;

    const handleGiveFeedback = () => {
        recordFeedbackGiven(currentVersion);
        openFeedbackForm();
        toast.success('Thank you for helping us improve Produchive!');
        onClose();
    };

    const handleContactSupport = () => {
        recordFeedbackGiven(currentVersion);
        openFeedbackForm();
        onClose();
    };

    const handleRemindLater = () => {
        snoozeFeedback(24);
        onClose();
    };

    const handleDismiss = () => {
        snoozeFeedback(2);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none">
            <div
                className="w-full max-w-md rounded-3xl p-6 shadow-2xl relative border space-y-4 text-center animate-scale-in"
                style={{
                    background: 'var(--bg-card-solid)',
                    borderColor: 'var(--border-card)',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
                }}
            >
                {/* Close Button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                    title="Close"
                >
                    <X size={18} />
                </button>

                {/* Hero Icon */}
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center pt-2">
                    <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 animate-ping opacity-30" />
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#5b5fc7] to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white">
                        <MessageSquareHeart size={28} />
                    </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5">
                    <h3 className="text-lg font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                        Enjoying Produchive?
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed px-2">
                        You have been using Produchive for over an hour! Your feedback and feature ideas directly guide what we develop next.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                    <button
                        type="button"
                        onClick={handleGiveFeedback}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#5b5fc7] to-indigo-600 hover:from-[#4f52b2] hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
                    >
                        <ExternalLink size={14} />
                        <span>Give Feedback (Google Form)</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleContactSupport}
                        className="w-full py-2 px-4 rounded-xl border border-slate-700/60 hover:bg-white/5 text-xs text-slate-300 font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <HelpCircle size={13} className="text-slate-400" />
                        <span>Contact Form & Bug Report</span>
                    </button>
                </div>

                {/* Footer / Remind Later */}
                <div className="pt-2 border-t flex items-center justify-center" style={{ borderColor: 'var(--border-secondary)' }}>
                    <button
                        type="button"
                        onClick={handleRemindLater}
                        className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer py-1"
                    >
                        <Clock size={12} />
                        <span>Remind me later</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
