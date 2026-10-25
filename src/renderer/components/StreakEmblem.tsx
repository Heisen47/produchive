import React, { useId } from 'react';
import type { TierId } from '../lib/streakRank';

export interface TierMaterial {
    light: string;
    mid: string;
    dark: string;
    glow: string;
    /** Second hue used by the top tiers for an iridescent sheen. */
    accent?: string;
}

export const TIER_MATERIALS: Record<TierId, TierMaterial> = {
    ember: { light: '#ffb27a', mid: '#c9733e', dark: '#5b2a12', glow: 'rgba(232, 121, 58, 0.30)' },
    quill: { light: '#f1f4f8', mid: '#a9b3c1', dark: '#3f4756', glow: 'rgba(190, 205, 225, 0.26)' },
    lantern: { light: '#ffe39a', mid: '#e0a93a', dark: '#6e4708', glow: 'rgba(245, 190, 70, 0.36)' },
    scholar: { light: '#c8fbf3', mid: '#5cc4b8', dark: '#164b47', glow: 'rgba(92, 196, 184, 0.38)' },
    prism: { light: '#e4f0ff', mid: '#7aa8ff', dark: '#22357a', glow: 'rgba(122, 168, 255, 0.44)', accent: '#c59bff' },
    sage: { light: '#c2ffe0', mid: '#35c98c', dark: '#0b4d33', glow: 'rgba(53, 201, 140, 0.44)', accent: '#9be8ff' },
    oracle: { light: '#f2d9ff', mid: '#b06cff', dark: '#3d1470', glow: 'rgba(176, 108, 255, 0.50)', accent: '#ff6fb5' },
    luminary: { light: '#fff7d6', mid: '#ffc94d', dark: '#8a4b00', glow: 'rgba(255, 201, 77, 0.58)', accent: '#ff8a5c' },
};

/** Outer silhouette grows from a plain rhombus to a crowned shield as tiers rise. */
const FRAMES = {
    rhombus: '32,8 52,32 32,56 12,32',
    hexTall: '32,6 49,17 49,45 32,58 15,45 15,17',
    hex: '32,7 50,18 50,44 32,57 14,44 14,18',
    shield: '32,5 50,11 49,36 32,58 15,36 14,11',
};
const frameFor = (level: number) =>
    level === 0 ? FRAMES.rhombus : level === 1 ? FRAMES.hexTall : level === 2 ? FRAMES.hex : FRAMES.shield;

/** One original glyph per tier, drawn inside the frame (roughly 18–46 on both axes). */
function Glyph({ tier, fill, ink }: { tier: TierId; fill: string; ink: string }) {
    const p = { fill, stroke: ink, strokeWidth: 0.8, strokeLinejoin: 'round' as const };
    switch (tier) {
        case 'ember':
            return <path {...p} d="M32 19c3 5 8 8 8 15a8 8 0 0 1-16 0c0-4 2-6 4-8 0 3 1 4 3 5 1-4-1-8 1-12z" />;
        case 'quill':
            return (
                <g>
                    <polygon {...p} points="32,18 40,31 36,45 28,45 24,31" />
                    <line x1="32" y1="33" x2="32" y2="44" stroke={ink} strokeWidth="1.2" />
                    <circle cx="32" cy="31" r="2" fill={ink} />
                </g>
            );
        case 'lantern':
            return (
                <g>
                    <rect {...p} x="28" y="18" width="8" height="3" />
                    <polygon {...p} points="27,22 37,22 40,31 37,44 27,44 24,31" />
                    <polygon points="32,27 35,33 32,39 29,33" fill={ink} opacity="0.55" />
                </g>
            );
        case 'scholar':
            return (
                <g>
                    <polygon {...p} points="31,25 19,21 19,40 31,44" />
                    <polygon {...p} points="33,25 45,21 45,40 33,44" />
                </g>
            );
        case 'prism':
            return (
                <g>
                    <polygon {...p} points="32,18 44,42 20,42" />
                    <polygon points="32,28 38,39 26,39" fill="none" stroke={ink} strokeWidth="0.9" opacity="0.7" />
                </g>
            );
        case 'sage':
            return (
                <g>
                    <polygon {...p} points="24,31 17,25 20,35" />
                    <polygon {...p} points="40,31 47,25 44,35" />
                    <polygon {...p} points="32,17 40,31 32,46 24,31" />
                    <line x1="32" y1="21" x2="32" y2="42" stroke={ink} strokeWidth="0.9" opacity="0.7" />
                </g>
            );
        case 'oracle':
            return (
                <g>
                    <path {...p} d="M18 32 Q32 17 46 32 Q32 47 18 32Z" />
                    <polygon points="32,25 37,32 32,39 27,32" fill={ink} />
                    <circle cx="32" cy="32" r="1.8" fill={fill} />
                </g>
            );
        case 'luminary':
            return (
                <g>
                    <polygon {...p} points="32,15 35,28 48,32 35,36 32,49 29,36 16,32 29,28" />
                    <polygon points="32,24 34,30 40,32 34,34 32,40 30,34 24,32 30,30" fill={ink} opacity="0.35" />
                </g>
            );
    }
}

interface StreakEmblemProps {
    tier: TierId;
    level: number;
    size: number;
    className?: string;
}

/** Faceted rank insignia. Purely decorative: the card carries the accessible text. */
export const StreakEmblem = ({ tier, level, size, className }: StreakEmblemProps) => {
    const m = TIER_MATERIALS[tier];
    const uid = useId().replace(/:/g, '');
    const metal = `sem-metal-${uid}`;
    const shine = `sem-shine-${uid}`;
    const clip = `sem-clip-${uid}`;
    const frame = frameFor(level);

    return (
        <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true" focusable="false" overflow="visible">
            <defs>
                <linearGradient id={metal} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={m.light} />
                    <stop offset="0.45" stopColor={m.mid} />
                    <stop offset="1" stopColor={m.dark} />
                </linearGradient>
                <linearGradient id={shine} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="1" stopColor={m.light} />
                </linearGradient>
                <clipPath id={clip}>
                    <polygon points={frame} />
                </clipPath>
            </defs>

            {/* Top tier: radiant rays behind everything */}
            {level >= 7 && (
                <g fill={m.light} opacity="0.55">
                    {Array.from({ length: 12 }, (_, i) => (
                        <polygon key={i} points="31,-1 33,-1 32,14" transform={`rotate(${i * 30} 32 32)`} />
                    ))}
                </g>
            )}
            {level >= 6 && (
                <circle cx="32" cy="32" r="29" fill="none" stroke={m.accent ?? m.light} strokeWidth="1" opacity="0.5" />
            )}

            {/* Wings: one pair from Lantern, a second pair from Sage */}
            {level >= 5 && (
                <g fill={`url(#${metal})`} opacity="0.85">
                    <polygon points="12,12 1,8 5,28 12,32" />
                    <polygon points="52,12 63,8 59,28 52,32" />
                </g>
            )}
            {level >= 2 && (
                <g fill={`url(#${metal})`} stroke={m.dark} strokeWidth="0.6">
                    <polygon points="15,20 5,17 10,35 16,41" />
                    <polygon points="49,20 59,17 54,35 48,41" />
                </g>
            )}

            {/* Crown from Prism */}
            {level >= 4 && (
                <polygon points="25,9 28,0 32,6 36,0 39,9" fill={`url(#${metal})`} stroke={m.dark} strokeWidth="0.6" />
            )}

            {/* Faceted frame: light left face, shaded right face, inset bevel */}
            <polygon points={frame} fill={`url(#${metal})`} />
            <g clipPath={`url(#${clip})`}>
                <rect x="32" y="0" width="32" height="64" fill="#000" opacity="0.22" />
                <polygon points="32,0 32,32 0,32" fill="#fff" opacity="0.14" />
            </g>
            <polygon points={frame} fill="none" stroke={m.light} strokeOpacity="0.7" strokeWidth="1" />
            <polygon
                points={frame}
                fill={m.dark}
                fillOpacity="0.55"
                stroke={m.dark}
                strokeWidth="1.2"
                transform="translate(32 32) scale(0.74) translate(-32 -32)"
            />

            <Glyph tier={tier} fill={`url(#${shine})`} ink={m.dark} />
        </svg>
    );
};
