import React from 'react';

interface LuffyBgProps {
    className?: string;
    style?: React.CSSProperties;
    mood?: 'happy' | 'sad';
    opacity?: number;
}

export const LuffyBg: React.FC<LuffyBgProps> = ({ className = '', style = {}, mood = 'happy', opacity = 0.12 }) => {
    const isHappy = mood === 'happy';

    return (
        <div
            className={`pointer-events-none absolute bottom-0 right-0 overflow-hidden rounded-2xl ${className}`}
            style={{
                width: '100%',
                height: '100%',
                zIndex: 0,
                ...style
            }}
        >
            <svg
                viewBox="0 10 200 220"
                preserveAspectRatio="xMaxYMax meet"
                className="absolute bottom-0 right-0"
                style={{
                    width: '160px',
                    height: '180px',
                    opacity,
                    transform: 'translate(10px, 10px)'
                }}
            >
                <defs>
                    <radialGradient id="luffySkin2" cx="50%" cy="40%" r="50%">
                        <stop offset="0%" stopColor="#FDEBD0" />
                        <stop offset="100%" stopColor="#E8B87A" />
                    </radialGradient>
                    <linearGradient id="strawHat2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#F9E547" />
                        <stop offset="100%" stopColor="#D4A017" />
                    </linearGradient>
                    <linearGradient id="redVest2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#E74C3C" />
                        <stop offset="100%" stopColor="#922B21" />
                    </linearGradient>
                    <linearGradient id="blueShorts2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#5DADE2" />
                        <stop offset="100%" stopColor="#2E86C1" />
                    </linearGradient>
                </defs>

                {/* === BODY === */}
                {/* Torso (skin) */}
                <path d="M82,105 Q80,120 80,135 Q100,142 120,135 Q120,120 118,105 Z"
                    fill="url(#luffySkin2)" stroke="#C19A6B" strokeWidth="0.8" />

                {/* Red vest - left flap */}
                <path d="M82,100 Q75,100 72,105 L68,135 Q66,142 72,142 L80,138 Q80,120 82,102 Z"
                    fill="url(#redVest2)" stroke="#7B241C" strokeWidth="0.8" />
                {/* Red vest - right flap */}
                <path d="M118,100 Q125,100 128,105 L132,135 Q134,142 128,142 L120,138 Q120,120 118,102 Z"
                    fill="url(#redVest2)" stroke="#7B241C" strokeWidth="0.8" />

                {/* Yellow sash */}
                <path d="M72,128 Q100,138 128,128" fill="none" stroke="#F4D03F" strokeWidth="6" strokeLinecap="round" />

                {/* Shorts */}
                <path d="M75,135 L72,165 Q70,172 80,172 L90,172 L95,145 Z" fill="url(#blueShorts2)" stroke="#1A5276" strokeWidth="0.8" />
                <path d="M125,135 L128,165 Q130,172 120,172 L110,172 L105,145 Z" fill="url(#blueShorts2)" stroke="#1A5276" strokeWidth="0.8" />
                <path d="M75,135 Q100,148 125,135 L120,145 Q100,155 80,145 Z" fill="url(#blueShorts2)" stroke="#1A5276" strokeWidth="0.8" />

                {/* Legs */}
                <path d="M80,170 L78,195" stroke="url(#luffySkin2)" strokeWidth="7" strokeLinecap="round" />
                <path d="M120,170 L122,195" stroke="url(#luffySkin2)" strokeWidth="7" strokeLinecap="round" />

                {/* === ARMS === */}
                {isHappy ? (
                    <>
                        {/* HAPPY: Arms raised high */}
                        <path d="M80,105 Q68,88 58,68 Q53,55 50,45"
                            fill="none" stroke="#E8B87A" strokeWidth="8" strokeLinecap="round" />
                        <path d="M78,103 Q68,88 60,72" fill="none" stroke="#922B21" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="48" cy="42" r="7" fill="url(#luffySkin2)" stroke="#C19A6B" strokeWidth="0.8" />

                        <path d="M120,105 Q132,88 142,68 Q147,55 150,45"
                            fill="none" stroke="#E8B87A" strokeWidth="8" strokeLinecap="round" />
                        <path d="M122,103 Q132,88 140,72" fill="none" stroke="#922B21" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="152" cy="42" r="7" fill="url(#luffySkin2)" stroke="#C19A6B" strokeWidth="0.8" />
                    </>
                ) : (
                    <>
                        {/* SAD: Arms hanging down */}
                        <path d="M78,108 Q68,120 62,140 Q58,150 56,158"
                            fill="none" stroke="#E8B87A" strokeWidth="8" strokeLinecap="round" />
                        <path d="M76,108 Q68,118 64,132" fill="none" stroke="#922B21" strokeWidth="4" strokeLinecap="round" />

                        <path d="M122,108 Q132,120 138,140 Q142,150 144,158"
                            fill="none" stroke="#E8B87A" strokeWidth="8" strokeLinecap="round" />
                        <path d="M124,108 Q132,118 136,132" fill="none" stroke="#922B21" strokeWidth="4" strokeLinecap="round" />
                    </>
                )}

                {/* === HEAD === */}
                <rect x="95" y="88" width="10" height="15" rx="3" fill="url(#luffySkin2)" />
                <ellipse cx="100" cy="72" rx="22" ry="24" fill="url(#luffySkin2)" stroke="#C19A6B" strokeWidth="0.8" />

                {/* === HAIR === */}
                <path d="M78,70 Q76,58 80,48 Q86,40 92,44 Q90,36 100,32 Q108,28 115,35 Q120,30 126,42 Q130,50 128,62 Q130,68 128,72"
                    fill="#1C1C1C" />
                <path d="M88,44 Q86,34 90,28" fill="none" stroke="#1C1C1C" strokeWidth="3" strokeLinecap="round" />
                <path d="M102,34 Q104,24 108,22" fill="none" stroke="#1C1C1C" strokeWidth="3" strokeLinecap="round" />
                <path d="M118,38 Q122,30 120,24" fill="none" stroke="#1C1C1C" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M78,70 Q72,64 74,55 Q75,48 80,44" fill="#1C1C1C" />
                <path d="M128,72 Q134,65 132,55 Q131,48 126,42" fill="#1C1C1C" />

                {/* === STRAW HAT === */}
                <path d="M80,55 Q88,28 100,25 Q112,28 120,55 Z"
                    fill="url(#strawHat2)" stroke="#B7950B" strokeWidth="1" />
                <ellipse cx="100" cy="55" rx="30" ry="7" fill="url(#strawHat2)" stroke="#B7950B" strokeWidth="1" />
                <path d="M80,53 Q100,48 120,53" fill="none" stroke="#C0392B" strokeWidth="3" />

                {/* === FACE === */}
                {isHappy ? (
                    <>
                        <ellipse cx="92" cy="70" rx="4" ry="5" fill="white" stroke="#333" strokeWidth="0.8" />
                        <circle cx="93" cy="69" r="2.5" fill="#1C1C1C" />
                        <ellipse cx="108" cy="70" rx="4" ry="5" fill="white" stroke="#333" strokeWidth="0.8" />
                        <circle cx="109" cy="69" r="2.5" fill="#1C1C1C" />
                        <path d="M87,63 Q91,60 96,62" fill="none" stroke="#1C1C1C" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M104,62 Q109,60 113,63" fill="none" stroke="#1C1C1C" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M88,74 Q89,76 88,78" fill="none" stroke="#333" strokeWidth="1" strokeLinecap="round" />
                        {/* Big open grin */}
                        <path d="M89,80 Q100,92 111,80 Z" fill="#1C1C1C" stroke="#333" strokeWidth="0.8" />
                        <path d="M90,80.5 Q100,83 110,80.5" fill="white" />
                        <path d="M92,89 Q100,91 108,89" fill="white" />
                    </>
                ) : (
                    <>
                        <ellipse cx="92" cy="70" rx="4" ry="4" fill="white" stroke="#333" strokeWidth="0.8" />
                        <circle cx="92" cy="71" r="2" fill="#1C1C1C" />
                        <ellipse cx="108" cy="70" rx="4" ry="4" fill="white" stroke="#333" strokeWidth="0.8" />
                        <circle cx="108" cy="71" r="2" fill="#1C1C1C" />
                        {/* Sad eyebrows */}
                        <path d="M87,63 Q91,62 96,65" fill="none" stroke="#1C1C1C" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M104,65 Q109,62 113,63" fill="none" stroke="#1C1C1C" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M88,74 Q89,76 88,78" fill="none" stroke="#333" strokeWidth="1" strokeLinecap="round" />
                        {/* Frown */}
                        <path d="M92,84 Q100,78 108,84" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
                        {/* Sweat drop */}
                        <path d="M120,62 Q122,56 120,52 Q118,56 120,62 Z" fill="#87CEEB" opacity="0.7" />
                    </>
                )}
            </svg>
        </div>
    );
};
