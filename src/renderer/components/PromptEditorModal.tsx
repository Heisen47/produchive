import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';
import { DEFAULT_PROMPT } from '../lib/ai';
import { X, RotateCcw, Check, AlertCircle } from 'lucide-react';

interface PromptEditorModalProps {
    onClose: () => void;
}

export const PromptEditorModal: React.FC<PromptEditorModalProps> = ({ onClose }) => {
    const { isDark } = useTheme();
    const { customPrompt, setCustomPrompt } = useStore();
    const [editedPrompt, setEditedPrompt] = useState(customPrompt);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setCustomPrompt(editedPrompt);
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
            onClose();
        }, 1000);
    };

    const handleReset = () => {
        if (confirm('Are you sure you want to reset the prompt to default? All your custom instructions will be lost.')) {
            setEditedPrompt(DEFAULT_PROMPT);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300"
            style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(12px)' }}
        >
            <div
                className="relative w-full max-w-2xl rounded-2xl overflow-hidden animate-scale-in flex flex-col"
                style={{
                    background: 'var(--bg-card-solid)',
                    border: '1px solid var(--border-card)',
                    maxHeight: '85vh',
                    boxShadow: isDark
                        ? '0 25px 60px rgba(0,0,0,0.5), 0 0 40px var(--accent-glow)'
                        : '0 25px 60px rgba(0,0,0,0.15)',
                }}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b" style={{ borderColor: 'var(--border-secondary)' }}>
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(14, 165, 233, 0.1)' }}>
                            <AlertCircle size={16} className="text-sky-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                                Customize AI System Prompt
                            </h3>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                Adjust how the model evaluates your productivity & rules to follow.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 flex-1 overflow-y-auto space-y-4">
                    <div className="p-3 rounded-lg text-xs flex gap-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-secondary)' }}>
                        <AlertCircle size={14} className="text-sky-500 shrink-0 mt-0.5" />
                        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            <strong>Tip:</strong> Use the placeholder <code>{'{role}'}</code> to dynamically insert your current selected role (e.g. Software Engineer). The AI output <strong>must</strong> be in valid JSON conforming to the output schema.
                        </p>
                    </div>

                    <div className="flex flex-col flex-1 h-[45vh]">
                        <textarea
                            value={editedPrompt}
                            onChange={(e) => setEditedPrompt(e.target.value)}
                            className="w-full h-full p-4 rounded-xl border font-mono text-xs resize-none focus:outline-none transition-colors"
                            style={{
                                background: 'var(--bg-input, rgba(0,0,0,0.15))',
                                borderColor: 'var(--border-primary)',
                                color: 'var(--text-primary)',
                            }}
                            placeholder="Enter system prompt here..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center p-5 border-t" style={{ borderColor: 'var(--border-secondary)', background: 'var(--bg-elevated)' }}>
                    <button
                        onClick={handleReset}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 hover:bg-white/10"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <RotateCcw size={14} />
                        Reset to Default
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:bg-white/10"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saved}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                                background: saved ? '#22c55e' : 'var(--accent)',
                                color: '#ffffff',
                                border: 'none',
                                cursor: saved ? 'default' : 'pointer'
                            }}
                        >
                            {saved ? (
                                <>
                                    <Check size={14} />
                                    Saved!
                                </>
                            ) : (
                                'Save Prompt'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
