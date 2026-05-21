import React, { useState, useEffect } from 'react';
import { Shield, ExternalLink, RefreshCw, ChevronDown, ChevronUp, X, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface ScreenPermissionBannerProps {
    /** Called when the user manually dismisses the banner */
    onDismiss?: () => void;
}

/**
 * An in-app banner that gently prompts users to grant Screen Recording permission.
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

    const isGranted = status === 'granted';

    return (
        <div
            className={`relative rounded-2xl overflow-hidden animate-fade-in-up transition-all duration-300 ${isExiting ? 'opacity-0 translate-y-2 scale-[0.98]' : ''}`}
            style={{
                background: isDark
                    ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.06) 0%, rgba(251, 146, 60, 0.02) 100%)'
                    : 'linear-gradient(135deg, rgba(251, 146, 60, 0.08) 0%, rgba(251, 146, 60, 0.03) 100%)',
                border: `1px solid ${isDark ? 'rgba(251, 146, 60, 0.15)' : 'rgba(251, 146, 60, 0.2)'}`,
                boxShadow: isDark
                    ? '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(251, 146, 60, 0.08)'
                    : '0 4px 16px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(251, 146, 60, 0.1)',
                backdropFilter: 'blur(20px)',
            }}
        >
            {/* Subtle animated gradient accent line at top */}
            <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                    background: 'linear-gradient(90deg, transparent, #fb923c, #f59e0b, #fb923c, transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'gradientShift 4s ease infinite',
                }}
            />

            {/* Dismiss button */}
            <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 p-1.5 rounded-lg transition-all duration-200 z-10"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                }}
            >
                <X size={14} />
            </button>

            <div className="p-5 pr-10">
                <div className="flex items-start gap-4">
                    {/* Icon with glow */}
                    <div className="relative flex-shrink-0">
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-500 hover:rotate-6 hover:scale-110"
                            style={{
                                background: isDark ? 'rgba(251, 146, 60, 0.12)' : 'rgba(251, 146, 60, 0.1)',
                                color: '#fb923c',
                            }}
                        >
                            <Shield size={22} />
                        </div>
                        {/* Pulsing ring */}
                        <div
                            className="absolute inset-0 rounded-xl"
                            style={{
                                animation: 'pulse-ring 2.5s ease-out infinite',
                                border: '2px solid rgba(251, 146, 60, 0.3)',
                            }}
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h3
                            className="text-sm font-bold tracking-tight mb-1"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Screen Recording Permission Needed
                        </h3>
                        <p
                            className="text-xs leading-relaxed mb-3"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Produchive needs this to see which apps you're using — your screen is{' '}
                            <span className="font-semibold" style={{ color: '#fb923c' }}>never recorded or stored</span>.
                            Only the active window name is read.
                        </p>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={handleOpenSettings}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 hover:scale-105 active:scale-95"
                                style={{
                                    background: 'linear-gradient(135deg, #fb923c, #f59e0b)',
                                    color: '#fff',
                                    boxShadow: '0 4px 12px rgba(251, 146, 60, 0.3)',
                                }}
                            >
                                <ExternalLink size={13} />
                                Open System Settings
                            </button>

                            <button
                                onClick={handleRecheck}
                                disabled={checking}
                                className="px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-1.5 hover:scale-105 active:scale-95 disabled:opacity-50"
                                style={{
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-secondary)',
                                }}
                            >
                                <RefreshCw size={12} className={checking ? 'animate-spin' : ''} />
                                {checking ? 'Checking…' : 'Recheck'}
                            </button>

                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-1 hover:scale-105"
                                style={{
                                    color: 'var(--text-muted)',
                                }}
                            >
                                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                {expanded ? 'Less' : 'How?'}
                            </button>
                        </div>

                        {/* Expandable Steps */}
                        {expanded && (
                            <div
                                className="mt-4 p-4 rounded-xl animate-fade-in-up space-y-3"
                                style={{
                                    background: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.03)',
                                    border: '1px solid var(--border-secondary)',
                                }}
                            >
                                {[
                                    {
                                        num: '1',
                                        text: 'Open',
                                        highlight: 'System Settings → Privacy & Security → Screen Recording',
                                    },
                                    {
                                        num: '2',
                                        text: 'Toggle the switch',
                                        highlight: 'ON',
                                        suffix: 'for Produchive',
                                    },
                                    {
                                        num: '3',
                                        text: 'Quit & reopen the app',
                                        highlight: '⌘Q',
                                        suffix: 'then relaunch',
                                    },
                                ].map((step, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div
                                            className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                                            style={{
                                                background: 'rgba(251, 146, 60, 0.15)',
                                                color: '#fb923c',
                                            }}
                                        >
                                            {step.num}
                                        </div>
                                        <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                            {step.text}{' '}
                                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                {step.highlight}
                                            </span>
                                            {step.suffix && ` ${step.suffix}`}
                                        </span>
                                    </div>
                                ))}

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
