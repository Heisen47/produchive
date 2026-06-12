import React, { useState } from 'react';
import { X, Mail, Lock, LogIn, Loader2, User, Sparkles, LogOut, ShieldCheck, ExternalLink, Settings, Crown, Calendar, Fingerprint, ChevronRight } from 'lucide-react';
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
    const hasToken = !!sessionStorage.getItem('token');

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

    // Shared style tokens
    const cardBg = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)';
    const fieldBg = isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(0, 0, 0, 0.03)';
    const fieldBorder = isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textPrimary = isDark ? '#f1f5f9' : '#1a1612';
    const textSecondary = isDark ? '#94a3b8' : '#57534e';
    const textMuted = isDark ? '#64748b' : '#a8a29e';
    const premiumGold = '#f59e0b';

    const InfoField = ({ icon: Icon, label, value, mono = false }: { icon: any; label: string; value: string; mono?: boolean }) => (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 12,
            background: fieldBg,
            border: `1px solid ${fieldBorder}`,
        }}>
            <div style={{
                width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.06)',
                color: textMuted, flexShrink: 0,
            }}>
                <Icon size={15} />
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: textMuted, letterSpacing: '0.02em', textTransform: 'uppercase' as const }}>{label}</div>
                <div style={{
                    fontSize: 12.5, fontWeight: 500, color: textSecondary,
                    fontFamily: mono ? 'monospace' : 'inherit',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                }}>{value}</div>
            </div>
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
            style={{ background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)', backdropFilter: 'blur(16px)' }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-sm rounded-2xl overflow-hidden animate-scale-in"
                style={{
                    background: cardBg,
                    border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(0,0,0,0.08)'}`,
                    boxShadow: isDark
                        ? '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.05)'
                        : '0 25px 60px rgba(0,0,0,0.12)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Subtle top glow */}
                <div style={{
                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                    width: '80%', height: '40%',
                    background: user?.isPremium
                        ? 'radial-gradient(ellipse at center, rgba(245,158,11,0.06) 0%, transparent 70%)'
                        : 'radial-gradient(ellipse at center, rgba(59,130,246,0.06) 0%, transparent 70%)',
                    pointerEvents: 'none' as const,
                }} />

                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 24px 16px',
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                }}>
                    <h2 style={{
                        fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em',
                        color: textPrimary, margin: 0,
                    }}>
                        {user ? 'Profile' : 'Authenticate'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            padding: 6, borderRadius: 8, border: 'none',
                            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                            color: textMuted, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}
                    >
                        <X size={16} />
                    </button>
                </div>

                {user ? (
                    /* ═══════════════════════════════════════
                       LOGGED IN — Profile View
                       ═══════════════════════════════════════ */
                    <div style={{ padding: '24px 24px 20px' }}>
                        {/* Avatar + Name */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                            <div style={{
                                position: 'relative', width: 72, height: 72, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: user.isPremium
                                    ? `linear-gradient(135deg, ${premiumGold}, #fb923c)`
                                    : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                boxShadow: user.isPremium
                                    ? `0 8px 24px rgba(245, 158, 11, 0.25)`
                                    : '0 8px 24px rgba(59, 130, 246, 0.2)',
                                marginBottom: 14,
                            }}>
                                <User size={32} color="#fff" />
                                {user.isPremium && (
                                    <div style={{
                                        position: 'absolute', bottom: -2, right: -2,
                                        width: 24, height: 24, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: `2.5px solid ${cardBg}`,
                                        boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
                                    }}>
                                        <Crown size={12} color="#fff" />
                                    </div>
                                )}
                            </div>

                            <div style={{ fontSize: 17, fontWeight: 700, color: textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                                {user.displayName || 'Produchive User'}
                                {user.isPremium && <Sparkles size={14} color={premiumGold} style={{ filter: 'drop-shadow(0 0 3px rgba(245,158,11,0.4))' }} />}
                            </div>
                            <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{user.email}</div>
                        </div>

                        {/* Tier badge */}
                        <div style={{
                            padding: '12px 14px', borderRadius: 12, marginBottom: 16,
                            display: 'flex', alignItems: 'center', gap: 12,
                            background: user.isPremium
                                ? (isDark ? 'rgba(245, 158, 11, 0.06)' : 'rgba(245, 158, 11, 0.05)')
                                : fieldBg,
                            border: `1px solid ${user.isPremium ? 'rgba(245, 158, 11, 0.15)' : fieldBorder}`,
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: user.isPremium ? 'rgba(245, 158, 11, 0.12)' : (isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)'),
                                color: user.isPremium ? premiumGold : (isDark ? '#60a5fa' : '#3b82f6'),
                                flexShrink: 0,
                            }}>
                                {user.isPremium ? <Crown size={18} /> : <ShieldCheck size={18} />}
                            </div>
                            <div>
                                <div style={{
                                    fontSize: 12, fontWeight: 700,
                                    color: user.isPremium ? premiumGold : textPrimary,
                                }}>
                                    {user.isPremium ? 'Premium Member' : 'Free Plan'}
                                </div>
                                <div style={{ fontSize: 10.5, color: textMuted, lineHeight: 1.4 }}>
                                    {user.isPremium
                                        ? 'Collaborative rooms, AI analytics & custom themes'
                                        : 'Upgrade to unlock multiplayer rooms & more'}
                                </div>
                            </div>
                        </div>

                        {/* Info fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                            <InfoField icon={Mail} label="Email" value={user.email} />
                            <InfoField icon={Fingerprint} label="Account ID" value={user.id} mono />
                            {user.createdAt && (
                                <InfoField
                                    icon={Calendar}
                                    label="Member Since"
                                    value={new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                />
                            )}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button
                                onClick={() => { openWebPage('/settings'); onClose(); }}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
                                    background: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.06)',
                                    border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.12)'}`,
                                    color: isDark ? '#60a5fa' : '#3b82f6',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.1)';
                                    e.currentTarget.style.transform = 'scale(1.01)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.06)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                <Settings size={15} />
                                Account Settings
                                <ChevronRight size={14} style={{ opacity: 0.5 }} />
                            </button>

                            {!user.isPremium && (
                                <button
                                    onClick={() => { openWebPage('/premium'); onClose(); }}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                                        background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                                        border: 'none',
                                        color: '#fff',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        boxShadow: '0 4px 14px rgba(245, 158, 11, 0.2)',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <Crown size={15} />
                                    Upgrade to Premium
                                </button>
                            )}

                            <button
                                onClick={handleSignOut}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
                                    background: 'transparent',
                                    border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.12)'}`,
                                    color: '#ef4444',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <LogOut size={15} />
                                Sign Out
                            </button>
                        </div>
                    </div>
                ) : hasToken ? (
                    /* ═══════════════════════════════════════
                       RESTORING SESSION
                       ═══════════════════════════════════════ */
                    <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 14,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.06)',
                            border: `1px solid ${isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)'}`,
                        }}>
                            <Loader2 size={22} className="animate-spin" style={{ color: '#3b82f6' }} />
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: textMuted, margin: 0 }}>
                            Restoring your session…
                        </p>
                    </div>
                ) : showManualInput ? (
                    /* ═══════════════════════════════════════
                       MANUAL TOKEN INPUT
                       ═══════════════════════════════════════ */
                    <form onSubmit={handleManualSync} style={{ padding: '24px' }}>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <p style={{ fontSize: 12, lineHeight: 1.6, color: textMuted, margin: 0 }}>
                                Paste the authentication code copied from the website below to sign in.
                            </p>
                        </div>

                        {syncError && (
                            <div style={{
                                padding: '10px 14px', borderRadius: 10, marginBottom: 14,
                                fontSize: 12, fontWeight: 500,
                                background: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)',
                                color: '#ef4444',
                                border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)'}`,
                            }}>
                                {syncError}
                            </div>
                        )}

                        <input
                            type="text"
                            required
                            value={manualToken}
                            onChange={e => setManualToken(e.target.value)}
                            disabled={syncing}
                            placeholder="Paste token here…"
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 10,
                                fontSize: 12, fontFamily: 'monospace',
                                background: fieldBg, color: textPrimary,
                                border: `1px solid ${fieldBorder}`,
                                outline: 'none', boxSizing: 'border-box' as const,
                                marginBottom: 14, transition: 'border-color 0.2s',
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.25)'}
                            onBlur={e => e.currentTarget.style.borderColor = fieldBorder}
                        />

                        <button
                            type="submit"
                            disabled={syncing || !manualToken.trim()}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                color: '#fff', border: 'none', cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.2)',
                                transition: 'all 0.2s',
                                opacity: syncing || !manualToken.trim() ? 0.5 : 1,
                            }}
                        >
                            {syncing ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                            {syncing ? 'Syncing…' : 'Sync Account'}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setShowManualInput(false); setSyncError(''); }}
                            disabled={syncing}
                            style={{
                                width: '100%', padding: '10px 0', marginTop: 8,
                                fontSize: 12, fontWeight: 600, color: textMuted,
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                textDecoration: 'none', transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = textPrimary}
                            onMouseLeave={e => e.currentTarget.style.color = textMuted}
                        >
                            ← Back to Web Auth
                        </button>
                    </form>
                ) : (
                    /* ═══════════════════════════════════════
                       UNAUTHENTICATED — Browser Auth
                       ═══════════════════════════════════════ */
                    <div style={{ padding: '28px 24px 24px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: 16,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.06)',
                                border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)'}`,
                                color: '#3b82f6',
                            }}>
                                <ExternalLink size={26} />
                            </div>

                            <div>
                                <h3 style={{ fontSize: 15, fontWeight: 700, color: textPrimary, margin: '0 0 6px' }}>
                                    Secure Web Authentication
                                </h3>
                                <p style={{ fontSize: 12, lineHeight: 1.6, color: textMuted, margin: 0, maxWidth: 260 }}>
                                    Sign in or create an account via your browser. The app syncs automatically once you authenticate.
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <button
                                onClick={() => openWebPage('/?from=app&action=login')}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                    color: '#fff', border: 'none', cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.2)',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <LogIn size={16} />
                                Sign In via Browser
                            </button>

                            <button
                                onClick={() => openWebPage('/?from=app&action=register')}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
                                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                    color: textPrimary,
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                <Sparkles size={15} style={{ color: premiumGold }} />
                                Create Account via Browser
                            </button>
                        </div>

                        {/* <div style={{ marginTop: 12 }}>
                            <button
                                type="button"
                                onClick={() => setShowManualInput(true)}
                                style={{
                                    fontSize: 11, fontWeight: 600, color: textMuted,
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    transition: 'color 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = textPrimary}
                                onMouseLeave={e => e.currentTarget.style.color = textMuted}
                            >
                                Having trouble? Paste code manually
                            </button>
                        </div> */}
                    </div>
                )}
            </div>
        </div>
    );
};
