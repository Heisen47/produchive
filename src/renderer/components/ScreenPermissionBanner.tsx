import React, { useState, useEffect } from 'react';
import { Shield, ExternalLink, RefreshCw, ChevronDown, ChevronUp, X, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { activityAutoTracker } from '../lib/activityAutoTracker';

interface ScreenPermissionBannerProps {
    /** Called when the user manually dismisses the banner */
    onDismiss?: () => void;
}

/**
 * An in-app modal that gently prompts users to grant Screen Recording permission.
 * Only renders on macOS when the permission is missing.
 * Styled to match the Produchive glassmorphism aesthetic.
 */
export const ScreenPermissionBanner: React.FC<ScreenPermissionBannerProps> = ({ onDismiss }) => {
    const { isDark } = useTheme();
    const [status, setStatus] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [checking, setChecking] = useState(false);

    // Check permission on mount
    useEffect(() => {
        (async () => {
            try {
                const perm = await window.electronAPI.getScreenPermission();
                setStatus(perm);
            } catch {
                // Not macOS or API unavailable
                setStatus('granted');
            }
        })();
    }, []);

    const handleRecheck = async () => {
        setChecking(true);
        try {
            const perm = await window.electronAPI.getScreenPermission();
            setStatus(perm);
            if (perm === 'granted') {
                // Auto-dismiss after a brief celebration
                setTimeout(() => handleDismiss(), 1500);
            }
        } catch {
            setStatus('granted');
        } finally {
            setChecking(false);
        }
    };

    const handleOpenSettings = async () => {
        try {
            await window.electronAPI.openScreenPermissionSettings();
        } catch {
            // Fallback: nothing
        }
    };

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => {
            setDismissed(true);
            onDismiss?.();
        }, 300);
    };

    // Don't render if granted, loading, or dismissed
    if (status === null || status === 'granted' || dismissed) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
            <div
                className={`relative w-full max-w-lg rounded-2xl overflow-hidden transition-all duration-300 ${isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                style={{
                    background: isDark
                        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 100%)',
                    border: `1px solid ${isDark ? 'rgba(251, 146, 60, 0.2)' : 'rgba(251, 146, 60, 0.3)'}`,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                }}
            >
                {/* Glowing orb background effect */}
                <div 
                    className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
                    style={{ background: '#fb923c' }}
                />
                
                {/* Subtle animated gradient accent line at top */}
                <div
                    className="absolute top-0 left-0 right-0 h-[3px]"
                    style={{
                        background: 'linear-gradient(90deg, transparent, #fb923c, #f59e0b, #fb923c, transparent)',
                        backgroundSize: '200% 100%',
                        animation: 'gradientShift 4s ease infinite',
                    }}
                />

                {/* Dismiss button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 p-2 rounded-xl transition-all duration-200 z-10"
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

                <div className="p-8">
                    <div className="flex flex-col items-center text-center">
                        {/* Icon with glow */}
                        <div className="relative mb-6">
                            <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-500 hover:rotate-6 hover:scale-110"
                                style={{
                                    background: isDark ? 'rgba(251, 146, 60, 0.15)' : 'rgba(251, 146, 60, 0.1)',
                                    color: '#fb923c',
                                    boxShadow: '0 0 30px rgba(251, 146, 60, 0.2)'
                                }}
                            >
                                <Monitor size={32} />
                            </div>
                            {/* Pulsing ring */}
                            <div
                                className="absolute inset-0 rounded-2xl"
                                style={{
                                    animation: 'pulse-ring 2.5s ease-out infinite',
                                    border: '2px solid rgba(251, 146, 60, 0.4)',
                                }}
                            />
                        </div>

                        {/* Content */}
                        <h3
                            className="text-xl font-bold tracking-tight mb-2"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Screen Recording Permission
                        </h3>
                        <p
                            className="text-sm leading-relaxed mb-8 max-w-sm"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Produchive needs this to track which apps you're using. Your screen is{' '}
                            <span className="font-semibold" style={{ color: '#fb923c' }}>never recorded or saved</span>.
                            We only read the active window name to calculate your productivity score.
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-col w-full gap-3">
                            <button
                                onClick={handleOpenSettings}
                                className="w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                                style={{
                                    background: 'linear-gradient(135deg, #fb923c, #f59e0b)',
                                    color: '#fff',
                                    boxShadow: '0 8px 20px -6px rgba(251, 146, 60, 0.5)',
                                }}
                            >
                                <ExternalLink size={16} />
                                Open System Settings
                            </button>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleRecheck}
                                    disabled={checking}
                                    className="flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                                    style={{
                                        background: 'var(--bg-elevated)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-secondary)',
                                    }}
                                >
                                    <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
                                    {checking ? 'Checking…' : 'I granted access'}
                                </button>

                                <button
                                    onClick={() => setExpanded(!expanded)}
                                    className="py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1 hover:bg-black/5 dark:hover:bg-white/5"
                                    style={{
                                        color: 'var(--text-muted)',
                                        border: '1px solid transparent',
                                    }}
                                    title="How to enable"
                                >
                                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Expandable Steps */}
                        {expanded && (
                            <div
                                className="mt-6 p-5 rounded-xl animate-fade-in-up space-y-4 text-left w-full"
                                style={{
                                    background: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.03)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                            >
                                <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>How to enable</h4>
                                <ol className="space-y-3">
                                    <li className="flex gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>1</div>
                                        <span>Click <strong>Open System Settings</strong> above.</span>
                                    </li>
                                    <li className="flex gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>2</div>
                                        <span>Find <strong>Produchive</strong> in the list and toggle the switch to ON.</span>
                                    </li>
                                    <li className="flex gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>3</div>
                                        <span>Click <strong>I granted access</strong> here to refresh.</span>
                                    </li>
                                </ol>

                                {/* Privacy assurance */}
                                <div
                                    className="flex items-center gap-2 mt-2 pt-3 text-[11px]"
                                    style={{
                                        borderTop: '1px solid var(--border-secondary)',
                                        color: 'var(--text-muted)',
                                    }}
                                >
                                    <Monitor size={11} />
                                    <span>
                                        100% local · No data leaves your machine · Only window titles are read
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
