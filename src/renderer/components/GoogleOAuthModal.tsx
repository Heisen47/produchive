import React, { useState, useEffect } from 'react';
import {
    X,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    ExternalLink,
    LogOut,
    Calendar as CalendarIcon
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { PlannedRoutineItem } from './Routine';
import {
    getGoogleAuthToken,
    getGoogleUserEmail,
    setGoogleAuthToken,
    clearGoogleAuth,
    getGoogleCalendarConfig,
    saveGoogleCalendarConfig,
    performGoogleCalendarSync,
    isCalendarSyncUpToDate,
    isGoogleCalendarConnected
} from '../lib/googleCalendar';
import { API_BASE_URL } from '../lib/config';
import { openUrl } from '../lib/urls';

interface GoogleOAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentRoutines: PlannedRoutineItem[];
    onRoutinesUpdated: (routines: PlannedRoutineItem[]) => void;
    onAuthChanged: () => void;
}

export const GoogleOAuthModal: React.FC<GoogleOAuthModalProps> = ({
    isOpen,
    onClose,
    currentRoutines,
    onRoutinesUpdated,
    onAuthChanged,
}) => {
    const { isDark } = useTheme();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const isSynced = isCalendarSyncUpToDate(currentRoutines);
    const [syncMessage, setSyncMessage] = useState<{
        success: boolean;
        text: string;
    } | null>(null);

    const authToken = getGoogleAuthToken();
    const userEmail = getGoogleUserEmail();
    const config = getGoogleCalendarConfig();
    const isLoggedIn = isGoogleCalendarConnected();

    useEffect(() => {
        if (isOpen) {
            setSyncMessage(null);
        }

        const handleAuthDone = () => {
            handleQuickSync();
        };

        window.addEventListener('produchive_gcal_authenticated', handleAuthDone);
        return () => {
            window.removeEventListener('produchive_gcal_authenticated', handleAuthDone);
        };
    }, [isOpen, currentRoutines]);

    if (!isOpen) return null;

    // ─── 1. One-Click Google Sign-In ───
    const handleGoogleSignIn = async () => {
        setIsLoggingIn(true);
        setSyncMessage({
            success: true,
            text: 'Opening Google Sign-In in your browser... Authorize to connect your calendar.',
        });

        try {
            const userEmail = getGoogleUserEmail();
            const hint = userEmail ? `&login_hint=${encodeURIComponent(userEmail)}` : '';
            openUrl(`${API_BASE_URL}/auth/google?from=app${hint}`);
        } catch (err: any) {
            setSyncMessage({
                success: false,
                text: err.message || 'Failed to open Google Sign-In.',
            });
        } finally {
            setIsLoggingIn(false);
        }
    };

    // ─── 2. Quick Sync ───
    const handleQuickSync = async () => {
        setIsSyncing(true);
        setSyncMessage(null);
        try {
            const res = await performGoogleCalendarSync(currentRoutines);
            onRoutinesUpdated(res.updatedRoutines);
            setSyncMessage({
                success: true,
                text: `Synced successfully! Pulled ${res.pulledCount} events${
                    res.pushedCount > 0 ? `, uploaded ${res.pushedCount} routines` : ''
                }.`,
            });
        } catch (err: any) {
            setSyncMessage({ success: false, text: err.message || 'Sync failed.' });
        } finally {
            setIsSyncing(false);
        }
    };

    // ─── 3. Disconnect / Sign Out ───
    const handleSignOut = () => {
        clearGoogleAuth();
        saveGoogleCalendarConfig({
            ...config,
            icalUrl: '',
        });
        onAuthChanged();
        setSyncMessage({ success: true, text: 'Signed out from Google Calendar.' });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
            <div
                className="w-full max-w-md rounded-3xl p-6 shadow-2xl relative border overflow-hidden flex flex-col"
                style={{
                    background: 'var(--bg-card-solid)',
                    borderColor: 'var(--border-card)',
                    boxShadow: 'var(--shadow-card)',
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between pb-4 border-b mb-5 shrink-0"
                    style={{ borderColor: 'var(--border-secondary)' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-sm">
                            <CalendarIcon size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                                Google Calendar Sync
                            </h3>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {isLoggedIn ? 'Account Connected • Ready to Sync' : 'Sign in to sync your routines across devices'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Logged-In State */}
                    {isLoggedIn ? (
                        <div className="space-y-4">
                            <div
                                className="p-4 rounded-2xl border flex items-center justify-between gap-3"
                                style={{
                                    background: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4',
                                    borderColor: 'rgba(16, 185, 129, 0.3)',
                                }}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-xs text-emerald-600 dark:text-emerald-300">
                                                Connected to Google
                                            </span>
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        </div>
                                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                            {userEmail || 'Google Calendar Account'}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSignOut}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-red-500/30 transition-all flex items-center gap-1 shrink-0"
                                >
                                    <LogOut size={12} /> Disconnect
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    disabled={isSyncing || isSynced}
                                    onClick={handleQuickSync}
                                    className={`py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                                        isSynced
                                            ? 'opacity-70 cursor-default shadow-none'
                                            : 'hover:scale-105 active:scale-95 cursor-pointer'
                                    }`}
                                    style={{
                                        background: isSynced
                                            ? 'rgba(16, 185, 129, 0.4)'
                                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        boxShadow: isSynced ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.35)',
                                    }}
                                >
                                    {isSynced ? (
                                        <>
                                            <CheckCircle2 size={13} />
                                            <span>Synced</span>
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                                            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.electronAPI?.openExternalUrl) {
                                            window.electronAPI.openExternalUrl('https://calendar.google.com');
                                        } else {
                                            window.open('https://calendar.google.com', '_blank');
                                        }
                                    }}
                                    className="py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5"
                                    style={{
                                        background: 'var(--bg-elevated)',
                                        borderColor: 'var(--border-card)',
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    <ExternalLink size={13} /> Open Calendar
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Not Logged In - Clean One-Click Sign In */
                        <div className="space-y-4">
                            <div
                                className="p-5 rounded-2xl border text-center space-y-3"
                                style={{
                                    background: 'var(--bg-elevated)',
                                    borderColor: 'var(--border-secondary)',
                                }}
                            >
                                <div className="w-12 h-12 mx-auto rounded-2xl bg-white dark:bg-white/10 shadow-md flex items-center justify-center border border-black/5 dark:border-white/10">
                                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                                        <path
                                            fill="#4285F4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                        />
                                    </svg>
                                </div>

                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                                        Sign In with Google
                                    </h4>
                                    <p className="text-xs max-w-xs mx-auto" style={{ color: 'var(--text-secondary)' }}>
                                        Sync your routine plans, scheduled tasks, and calendar events seamlessly between your devices.
                                    </p>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="button"
                                        disabled={isLoggingIn}
                                        onClick={handleGoogleSignIn}
                                        className="w-full py-3 px-5 rounded-2xl text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 active:scale-95 border border-slate-300 shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                                    >
                                        {isLoggingIn ? (
                                            <RefreshCw size={16} className="animate-spin text-slate-700" />
                                        ) : (
                                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                <path
                                                    fill="#4285F4"
                                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                />
                                                <path
                                                    fill="#34A853"
                                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                />
                                                <path
                                                    fill="#FBBC05"
                                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                                />
                                                <path
                                                    fill="#EA4335"
                                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                                />
                                            </svg>
                                        )}
                                        <span className="font-bold">
                                            {isLoggingIn ? 'Opening Google Sign-In...' : 'Sign in with Google'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sync Message Alert */}
                    {syncMessage && (
                        <div
                            className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
                                syncMessage.success
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                                    : 'bg-red-500/15 border-red-500/30 text-red-500 dark:text-red-300'
                            }`}
                        >
                            {syncMessage.success ? (
                                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                            ) : (
                                <AlertCircle size={15} className="text-red-500 shrink-0" />
                            )}
                            <span>{syncMessage.text}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
