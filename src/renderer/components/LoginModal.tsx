import React, { useState } from 'react';
import { X, Mail, Lock, LogIn, Loader2, User, Sparkles, LogOut, ShieldCheck, ExternalLink } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useStore } from '../lib/store';
import { apiClient } from '../lib/api';
import { openWebPage } from '../lib/urls';

interface LoginModalProps {
    onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
    const { isDark } = useTheme();
    const { user, setUser } = useStore();
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualToken, setManualToken] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [syncError, setSyncError] = useState('');

    const handleSignOut = () => {
        sessionStorage.removeItem('token');
        setUser(null);
        openWebPage('/?action=logout');
        onClose();
    };

    const handleManualSync = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualToken.trim()) return;
        setSyncing(true);
        setSyncError('');
        try {
            const token = manualToken.trim();
            sessionStorage.setItem('token', token);
            const me = await apiClient.getMe();
            setUser(me);
            onClose();
        } catch (err: any) {
            console.error(err);
            sessionStorage.removeItem('token');
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setSyncError(`Sync failed: ${msg}`);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
            style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(12px)' }}
        >
            <div 
                className="relative w-full max-w-sm rounded-2xl overflow-hidden animate-scale-in"
                style={{ 
                    background: 'var(--bg-card-solid)',
                    border: user?.isPremium 
                        ? '2px solid #f59e0b' 
                        : '1px solid var(--border-card)',
                    boxShadow: user?.isPremium
                        ? (isDark 
                            ? '0 25px 60px rgba(0,0,0,0.6), 0 0 45px rgba(245, 158, 11, 0.25)' 
                            : '0 25px 60px rgba(245, 158, 11, 0.15), 0 0 25px rgba(245, 158, 11, 0.1)')
                        : (isDark 
                            ? '0 25px 60px rgba(0,0,0,0.5), 0 0 40px var(--accent-glow)' 
                            : '0 25px 60px rgba(0,0,0,0.15)')
                }}
            >
                {/* Soft golden inner glow */}
                {user?.isPremium && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-amber-500/10 blur-[50px] -z-10 pointer-events-none" />
                )}

                {/* Header */}
                <div 
                    className="flex items-center justify-between p-6 pb-4 border-b" 
                    style={{ borderColor: user?.isPremium ? 'rgba(245, 158, 11, 0.2)' : 'var(--border-secondary)' }}
                >
                    <h2 className="text-xl font-bold tracking-tight" style={{ color: user?.isPremium ? '#f59e0b' : 'var(--text-primary)' }}>
                        {user ? 'My Profile' : 'Authenticate'}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-lg transition-all hover:bg-black/5 dark:hover:bg-white/10"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {user ? (
                    /* Logged In View */
                    <div className="p-6 space-y-6 text-center">
                        <div className="flex flex-col items-center space-y-3">
                            <div className="w-20 h-20 rounded-full flex items-center justify-center relative group" 
                                 style={{ 
                                     background: user.isPremium 
                                         ? 'linear-gradient(135deg, #f59e0b, #fb923c)'
                                         : 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                                     boxShadow: user.isPremium
                                         ? '0 10px 25px rgba(245, 158, 11, 0.4)'
                                         : '0 10px 25px var(--accent-glow)'
                                  }}>
                                <User size={40} className="text-white" />
                                {user.isPremium && (
                                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 rounded-full p-1 border-2 border-[var(--bg-card-solid)] shadow-md">
                                        <Sparkles size={14} className="fill-slate-900" />
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-bold flex items-center justify-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                    {user.displayName || 'Produchive User'}
                                    {user.isPremium && <Sparkles size={16} className="text-amber-400 fill-amber-400 animate-pulse" />}
                                </h3>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {user.email}
                                </p>
                            </div>
                        </div>

                        {/* Tier Status */}
                        <div 
                            className="p-4 rounded-xl border flex items-center gap-3" 
                            style={{ 
                                borderColor: user.isPremium ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-secondary)',
                                background: user.isPremium ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(251, 146, 60, 0.05))' : 'var(--bg-elevated)'
                            }}
                        >
                            <div className="p-2 rounded-lg" style={{ 
                                background: user.isPremium ? 'rgba(245, 158, 11, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                                color: user.isPremium ? '#f59e0b' : 'var(--text-muted)'
                            }}>
                                <ShieldCheck size={20} />
                            </div>
                            <div className="text-left">
                                <span className="text-xs font-bold block" style={{ color: user.isPremium ? '#f59e0b' : 'var(--text-primary)' }}>
                                    {user.isPremium ? '✦ Premium Member' : 'Free Tier'}
                                </span>
                                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                    {user.isPremium ? 'All collaborative & custom features unlocked' : 'Upgrade to access full study room customisation'}
                                </span>
                            </div>
                        </div>

                        <button 
                            onClick={handleSignOut}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 active:scale-95"
                        >
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </div>
                ) : showManualInput ? (
                    /* Manual Token Input View */
                    <form onSubmit={handleManualSync} className="p-6 space-y-4">
                        <div className="space-y-1 text-center mb-2">
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                Paste the authentication code copied from the website below to sign in.
                            </p>
                        </div>

                        {syncError && (
                            <div className="p-3 rounded-lg text-xs bg-red-500/10 text-red-500 border border-red-500/20">
                                {syncError}
                            </div>
                        )}

                        <div className="relative">
                            <input 
                                type="text"
                                required
                                value={manualToken}
                                onChange={e => setManualToken(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl text-xs transition-all outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                                style={{ 
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-secondary)'
                                }}
                                placeholder="Paste token here..."
                                disabled={syncing}
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={syncing || !manualToken.trim()}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                            style={{ 
                                background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                                color: '#fff',
                                boxShadow: '0 4px 15px var(--accent-glow)'
                            }}
                        >
                            {syncing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                            {syncing ? 'Syncing...' : 'Sync Account'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setShowManualInput(false);
                                setSyncError('');
                            }}
                            className="w-full py-2 text-xs font-semibold hover:underline"
                            style={{ color: 'var(--text-muted)' }}
                            disabled={syncing}
                        >
                            Back to Web Auth
                        </button>
                    </form>
                ) : (
                    /* Browser Auth Helper View */
                    <div className="p-6 space-y-6 text-center">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-md">
                                <ExternalLink size={32} />
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                                    Secure Web Authentication
                                </h3>
                                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                    To sign in or create an account securely, you'll be redirected to our website in your default web browser. Once authenticated, the app will log in automatically.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <button
                                onClick={() => openWebPage('/?from=app&action=login')}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{
                                    background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                                    color: '#fff',
                                    boxShadow: '0 4px 15px var(--accent-glow)'
                                }}
                            >
                                <LogIn size={16} />
                                Sign In via Browser
                            </button>
                            
                            <button
                                onClick={() => openWebPage('/?from=app&action=register')}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all border hover:scale-[1.02] active:scale-[0.98]"
                                style={{
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-secondary)'
                                }}
                            >
                                <Sparkles size={16} className="text-amber-400" />
                                Create Account via Browser
                            </button>
                        </div>

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => setShowManualInput(true)}
                                className="text-xs font-semibold hover:underline transition-all"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                Having trouble? Paste code manually
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
