import React, { useRef, useCallback } from 'react';
import { Sparkles, Trophy, Flame, Shield, Sword, Crown, Gem, Info } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface StreakCardProps {
    streak: number;
}

type RankTier = 'Bronze' | 'Silver' | 'Iron' | 'Gold' | 'Diamond' | 'Platinum' | 'Emerald';

interface RankInfo {
    tier: RankTier;
    rank: 1 | 2 | 3;
    nextThreshold: number;
}

const getRankInfo = (streak: number): RankInfo => {
    // Bronze: 0-9
    if (streak < 10) {
        if (streak < 3) return { tier: 'Bronze', rank: 3, nextThreshold: 3 };
        if (streak < 6) return { tier: 'Bronze', rank: 2, nextThreshold: 6 };
        return { tier: 'Bronze', rank: 1, nextThreshold: 10 };
    }
    // Silver: 10-24
    if (streak < 25) {
        if (streak < 15) return { tier: 'Silver', rank: 3, nextThreshold: 15 };
        if (streak < 20) return { tier: 'Silver', rank: 2, nextThreshold: 20 };
        return { tier: 'Silver', rank: 1, nextThreshold: 25 };
    }
    // Iron: 25-44
    if (streak < 45) {
        if (streak < 30) return { tier: 'Iron', rank: 3, nextThreshold: 30 };
        if (streak < 37) return { tier: 'Iron', rank: 2, nextThreshold: 37 };
        return { tier: 'Iron', rank: 1, nextThreshold: 45 };
    }
    // Gold: 45-69
    if (streak < 70) {
        if (streak < 53) return { tier: 'Gold', rank: 3, nextThreshold: 53 };
        if (streak < 61) return { tier: 'Gold', rank: 2, nextThreshold: 61 };
        return { tier: 'Gold', rank: 1, nextThreshold: 70 };
    }
    // Diamond: 70-99
    if (streak < 100) {
        if (streak < 80) return { tier: 'Diamond', rank: 3, nextThreshold: 80 };
        if (streak < 90) return { tier: 'Diamond', rank: 2, nextThreshold: 90 };
        return { tier: 'Diamond', rank: 1, nextThreshold: 100 };
    }
    // Platinum: 100-149
    if (streak < 150) {
        if (streak < 115) return { tier: 'Platinum', rank: 3, nextThreshold: 115 };
        if (streak < 130) return { tier: 'Platinum', rank: 2, nextThreshold: 130 };
        return { tier: 'Platinum', rank: 1, nextThreshold: 150 };
    }
    // Emerald: 150+
    if (streak < 175) return { tier: 'Emerald', rank: 3, nextThreshold: 175 };
    if (streak < 200) return { tier: 'Emerald', rank: 2, nextThreshold: 200 };
    return { tier: 'Emerald', rank: 1, nextThreshold: 99999 };
};

const getTierStyles = (tier: RankTier) => {
    switch (tier) {
        case 'Bronze':
            return {
                bg: 'linear-gradient(135deg, #A0522D, #CD7F32, #8B4513)', 
                border: '#676866',
                text: '#FFE4B5',
                shadow: '0 4px 15px rgba(139, 69, 19, 0.4)',
                accent: '#D2691E',
                texture: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 3px)', // Finer brush
            };
        case 'Silver':
            return {
                bg: 'linear-gradient(135deg, #71717a, #a1a1aa, #d4d4d8)', 
                border: '#676866',
                text: '#ffffff',
                shadow: '0 4px 15px rgba(113, 113, 122, 0.4)',
                accent: '#e4e4e7',
                texture: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 3px)',
            };
        case 'Iron':
            return {
                bg: 'linear-gradient(135deg, #334155, #475569, #64748b)', 
                border: '#875c01',
                text: '#e2e8f0',
                shadow: '0 4px 15px rgba(30, 41, 59, 0.5)',
                accent: '#94a3b8',
                texture: 'repeating-radial-gradient(circle at 1px 1px, rgba(0,0,0,0.2) 1px, transparent 2px)', 
            };
        case 'Gold':
            return {
                bg: 'linear-gradient(135deg, #b45309, #fbbf24, #f59e0b)',
                border: '#676866',
                text: '#fef3c7',
                shadow: '0 4px 20px rgba(180, 83, 9, 0.5)',
                accent: '#fde68a',
                shimmer: true,
            };
        case 'Diamond':
            return {
                bg: 'linear-gradient(135deg, #0284c7, #38bdf8, #bae6fd)',
                border: '#676866',
                text: '#f0f9ff',
                shadow: '0 4px 20px rgba(2, 132, 199, 0.5)',
                accent: '#e0f2fe',
                shimmer: true,
            };
        case 'Platinum':
            return {
                bg: 'linear-gradient(135deg, #7e22ce, #a855f7, #d8b4fe)',
                border: '#676866',
                text: '#faf5ff',
                shadow: '0 4px 20px rgba(126, 34, 206, 0.5)',
                accent: '#f3e8ff',
                shimmer: true,
            };
        case 'Emerald':
            return {
                bg: 'linear-gradient(135deg, #065f46, #32AE88)',
                border: '#666967',
                text: '#ecfdf5',
                shadow: '0 4px 25px rgba(6, 95, 70, 0.6)',
                accent: '#a7f3d0',
                shimmer: true,
                glow: true,
            };
    }
};

export const StreakCard = ({ streak }: StreakCardProps) => {
    const { isDark } = useTheme();
    const { tier, rank } = getRankInfo(streak);
    const styles = getTierStyles(tier);
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const card = cardRef.current;
        if (!card) return;
        
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Tilt effect
        const rotateX = ((y - centerY) / centerY) * -12;
        const rotateY = ((x - centerX) / centerX) * 12;
        
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
        
        // Shine effect
        const glare = card.querySelector('.card-glare') as HTMLElement;
        if (glare) {
            glare.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.4) 0%, transparent 70%)`;
            glare.style.opacity = '1';
        }
    }, []);

    const handleMouseLeave = useCallback(() => {
        const card = cardRef.current;
        if (!card) return;
        
        card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
        
        const glare = card.querySelector('.card-glare') as HTMLElement;
        if (glare) {
            glare.style.opacity = '0';
        }
    }, []);

    return (
        // Outer Container
        <div 
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative cursor-pointer group select-none transition-all duration-300 ease-out"
            style={{
                width: '70px',
                height: '90px',
                zIndex: 10
            }}
        >
            {/* ══════════════════════════════════════════
               CARD FACE (Clipped Content)
               ══════════════════════════════════════════ */}
            <div 
                className="absolute inset-0 rounded-lg overflow-hidden shadow-lg border-4"
                style={{
                    background: styles.bg,
                    boxShadow: styles.shadow,
                    borderColor: styles.border,
                }}
            >
                {/* Glare/Shine active on hover */}
                <div 
                    className="card-glare absolute inset-0 pointer-events-none transition-opacity duration-300"
                    style={{ opacity: 0, zIndex: 20 }}
                />

                {/* Texture/Pattern Overlay */}
                {styles.texture && (
                    <div 
                        className="absolute inset-0 pointer-events-none opacity-30"
                        style={{ backgroundImage: styles.texture }}
                    />
                )}
                
                {/* Generic noise texture */}
                <div 
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.5\'/%3E%3C/svg%3E")',
                        mixBlendMode: 'overlay'
                    }}
                />

                {/* Inner Content */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center p-1">
                    <span className="text-xs text-center tracking-wider opacity-90 mb-0.5" style={{ color: styles.text }}>
                        STREAK
                    </span>
                    <span 
                        className="text-xl font-black tracking-tighter" 
                        style={{ 
                            color: styles.text, 
                            textShadow: `0 2px 8px ${styles.accent}66`,
                            filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))'
                        }}
                    >
                        {streak}
                    </span>
                    
                    {/* Rank Dots */}
                    <div className="flex justify-center gap-1 mt-1 opacity-60 absolute bottom-2">
                        {[1, 2, 3].map((r) => (
                            <div 
                                key={r} 
                                className={`w-1 h-1 rounded-full ${r >= rank ? 'bg-current' : 'bg-black/20'}`}
                                style={{ color: styles.text }}
                            />
                        ))}
                    </div>
                </div>

                {/* Shimmer Animation for high tiers */}
                {(styles.shimmer) && (
                     <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)',
                            backgroundSize: '200% 200%',
                            animation: 'shimmer 2.5s infinite linear',
                            mixBlendMode: 'overlay'
                        }}
                     />
                )}
            </div>

            {/* ══════════════════════════════════════════
               TOOLTIP & INFO ICON (Outside Clipped Face)
               ══════════════════════════════════════════ */}
            <div className="absolute -top-1.5 -right-1.5 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="relative group/info">
                    {/* Icon Base */}
                    <div 
                        className="p-1 rounded-full shadow-lg backdrop-blur-md cursor-help hover:scale-110 transition-transform"
                        style={{ 
                            background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)',
                            border: `1px solid ${styles.border}`
                        }}
                    >
                        <Info size={10} color={styles.accent} />
                    </div>
                    
                    {/* Tooltip Popup - Moved to LEFT side */}
                    <div 
                        className="absolute right-full top-0 mr-2 w-48 p-3 rounded-xl glass-card text-[10px] leading-relaxed shadow-xl pointer-events-none opacity-0 group-hover/info:opacity-100 transition-opacity duration-200"
                        style={{ 
                            background: isDark ? 'rgba(10, 14, 26, 0.95)' : 'rgba(255,255,255,0.95)',
                            border: `1px solid ${styles.border}`,
                            color: isDark ? '#e2e8f0' : '#1e293b',
                            zIndex: 100
                        }}
                    >
                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-white/10">
                            <span className="font-bold text-xs" style={{ color: styles.accent }}>{tier} Tier</span>
                            <span className="opacity-50">•</span>
                            <span className="opacity-70">Rank {1 + (3-rank)}</span>
                        </div>
                        <p>Consistency is key! Keep your streak alive to upgrade your card from <span className="text-amber-600 font-bold">Bronze</span> to <span className="text-emerald-400 font-bold">Emerald</span>.Each tier has 3 levels </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
