import React from 'react';
import { Crown, Lock, ArrowRight, Check } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useStore } from '../lib/store';

export const PremiumPaywall = () => {
    const { isDark } = useTheme();
    const setPremium = useStore(state => state.setPremium);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-fade-in relative overflow-hidden"
            style={{
                background: isDark ? 'var(--bg-base)' : 'var(--bg-base)',
            }}
        >
            {/* Decorative background glow */}
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
                style={{ background: 'var(--accent)' }}
            />

            <div className="max-w-md w-full relative z-10 flex flex-col items-center text-center">
                <div 
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-2xl"
                    style={{
                        background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                        color: '#fff',
                        boxShadow: '0 10px 30px var(--accent-glow)'
                    }}
                >
                    <Crown size={40} className="drop-shadow-md" />
                </div>

                <h1 className="text-3xl font-display font-bold tracking-tight mb-3 gradient-text">
                    Multiplayer Study Rooms
                </h1>
                
                <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
                    Upgrade to Produchive Premium to study with friends in real-time, sync your productivity scores, and climb the leaderboard together.
                </p>

                <div 
                    className="w-full p-6 rounded-2xl mb-8 text-left space-y-4"
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-card)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                            <Check size={14} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sync real-time study duration</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                            <Check size={14} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>See your friends in the 3D room</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                            <Check size={14} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Create private encrypted rooms</span>
                    </div>
                </div>

                <button
                    onClick={() => setPremium(true)}
                    className="w-full py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] group"
                    style={{
                        background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                        color: '#fff',
                        boxShadow: '0 8px 25px var(--accent-glow)',
                    }}
                >
                    <Lock size={18} className="group-hover:hidden" />
                    <Crown size={18} className="hidden group-hover:block" />
                    Unlock Premium Now
                </button>
                
                <button className="mt-4 text-xs font-medium opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
                    Restore Purchases
                </button>
            </div>
        </div>
    );
};
