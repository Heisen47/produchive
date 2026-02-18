import React, { useState } from 'react';
import { AlertTriangle, Copy, RotateCcw, X, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';

export const ErrorModal = () => {
    const { error, setError } = useStore();
    const [showDetails, setShowDetails] = useState(false);
    const [copied, setCopied] = useState(false);
    const { isDark } = useTheme();

    if (!error) return null;

    const copyError = async () => {
        try {
            await navigator.clipboard.writeText(typeof error === 'string' ? error : JSON.stringify(error, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {}
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in" style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(12px)' }}>
            <div
                className="max-w-lg w-full mx-4 rounded-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in glass-card-static"
                style={{
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(239,68,68,0.15)' : '0 25px 60px rgba(0,0,0,0.15)',
                }}
            >
                {/* Header */}
                <div className="p-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                    <div className="p-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)' }}>
                        <AlertTriangle size={20} style={{ color: '#f87171' }} />
                    </div>
                    <h3 className="font-display font-bold text-lg flex-1" style={{ color: 'var(--text-primary)' }}>Something went wrong</h3>
                    <button
                        onClick={() => setError(null)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                        An unexpected error has occurred. You can try reloading the application or copying the error details below to report the issue.
                    </p>

                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="flex items-center gap-2 text-sm transition-colors mb-3"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                    >
                        {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {showDetails ? 'Hide Details' : 'Show Details'}
                    </button>

                    {showDetails && (
                        <pre
                            className="rounded-xl p-4 text-xs overflow-x-auto custom-scrollbar font-mono animate-fade-in"
                            style={{
                                background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.05)',
                                color: '#f87171',
                                border: '1px solid rgba(239,68,68,0.15)',
                            }}
                        >
                            {typeof error === 'string' ? error : JSON.stringify(error, null, 2)}
                        </pre>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 flex gap-3 justify-end" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                    <button
                        onClick={copyError}
                        className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
                        style={{
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-primary)',
                        }}
                    >
                        {copied ? <Check size={16} style={{ color: '#4ade80' }} /> : <Copy size={16} />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
                        style={{
                            background: 'rgba(239,68,68,0.1)',
                            color: '#f87171',
                            border: '1px solid rgba(239,68,68,0.2)',
                        }}
                    >
                        <RotateCcw size={16} />
                        Reload App
                    </button>
                    <button
                        onClick={() => setError(null)}
                        className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                        style={{
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-primary)',
                        }}
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};
