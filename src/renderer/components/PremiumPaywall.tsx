import React from 'react';
import { Crown, Check, X, Sparkles, PictureInPicture, TrendingUp, Zap, Users, Coffee } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { openWebPage } from '../lib/urls';

interface PremiumPaywallProps {
    onClose?: () => void;
    title?: string;
    description?: string;
}

export const PremiumPaywall: React.FC<PremiumPaywallProps> = ({ onClose, title, description }) => {
    const { isDark } = useTheme();

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 animate-fade-in relative overflow-hidden"
            style={{
                background: isDark ? 'var(--bg-base)' : 'var(--bg-base)',
            }}
        >
            {/* Background ambient glow */}
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
                style={{ background: 'var(--accent)' }}
            />

            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer z-20"
                >
                    <X size={20} />
                </button>
            )}

            <div className="max-w-md w-full relative z-10 flex flex-col items-center text-center">
                <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-2xl relative"
                    style={{
                        background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
                        color: '#fff',
                        boxShadow: '0 10px 30px var(--accent-glow)'
                    }}
                >
                    <Crown size={32} className="drop-shadow-md text-amber-300" />
                </div>

                <h1 className="text-2xl font-display font-bold tracking-tight mb-2 text-transparent bg-clip-text"
                    style={{
                        backgroundImage: 'linear-gradient(135deg, #a78bfa, #c084fc, #818cf8)',
                    }}
                >
                    {title || "Unlock Produchive Premium"}
                </h1>
                
                <p className="text-xs leading-relaxed mb-6 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
                    {description || "Supercharge your study sessions with multiplayer P2P virtual rooms with friends, floating picture-in-picture miniplayer, instant AI goal scoring, and real-time Recharts analytics."}
                </p>

                {/* Feature list */}
                <div 
                    className="w-full p-5 rounded-2xl mb-6 text-left space-y-3.5"
                    style={{
                        background: isDark ? 'var(--bg-elevated)' : 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid var(--border-secondary)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}
                >
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>
                            <Users size={13} />
                        </div>
                        <div>
                            <span className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>Multiplayer 3D Study Rooms with Friends</span>
                            <span className="text-[11px] opacity-80 block" style={{ color: 'var(--text-secondary)' }}>Host & join virtual Classroom, Cafe, or Library rooms with friends, live avatars, and ambient soundscapes.</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
                            <PictureInPicture size={13} />
                        </div>
                        <div>
                            <span className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>P2P Picture-in-Picture Miniplayer</span>
                            <span className="text-[11px] opacity-80 block" style={{ color: 'var(--text-secondary)' }}>YouTube-style floating miniplayer & native OS PiP pop-out to stay connected while coding.</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                            <Zap size={13} />
                        </div>
                        <div>
                            <span className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>Instant AI Goal Evaluation</span>
                            <span className="text-[11px] opacity-80 block" style={{ color: 'var(--text-secondary)' }}>App automatically evaluates active window titles against your targets in real time.</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(52, 211, 153, 0.2)', color: '#34d399' }}>
                            <TrendingUp size={13} />
                        </div>
                        <div>
                            <span className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>Live Recharts Score Analytics</span>
                            <span className="text-[11px] opacity-80 block" style={{ color: 'var(--text-secondary)' }}>Interactive real-time productivity score trends & performance history.</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => openWebPage('/premium')}
                    className="w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg"
                    style={{
                        background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
                        color: '#fff',
                        boxShadow: '0 8px 25px var(--accent-glow)',
                    }}
                >
                    <Crown size={16} />
                    <span>Get Produchive Premium</span>
                </button>
            </div>
        </div>
    );
};
