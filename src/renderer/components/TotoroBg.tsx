import React from 'react';

interface TotoroBgProps {
    className?: string;
    style?: React.CSSProperties;
    opacity?: number;
}

export const TotoroBg: React.FC<TotoroBgProps> = ({ className = '', style = {}, opacity = 0.15 }) => {
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
                viewBox="0 0 200 200" 
                preserveAspectRatio="xMidYMid slice"
                className="w-full h-full opacity-60"
                style={{ transform: 'translate(20px, 20px)' }}
            >
                <defs>
                    <linearGradient id="totoroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#64748b" />
                    </linearGradient>
                </defs>

                {/* Big Totoro (Grey) positioned at bottom right */}
                <g transform="translate(100, 50) scale(1.4)">
                    {/* Ears */}
                    <path d="M35 15 L30 -20 L50 5 Z" fill="url(#totoroGrad)" />
                    <path d="M85 15 L90 -20 L70 5 Z" fill="url(#totoroGrad)" />
                    
                    {/* Body base */}
                    <ellipse cx="60" cy="80" rx="50" ry="60" fill="url(#totoroGrad)" />
                    
                    {/* Belly (Eggshell) */}
                    <ellipse cx="60" cy="95" rx="38" ry="32" fill="#f8fafc" opacity="0.95" />
                    
                    {/* Belly Marks (^) */}
                    <g stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round">
                        <path d="M50 82 L55 78 L60 82" />
                        <path d="M60 82 L65 78 L70 82" />
                        <path d="M55 92 L60 88 L65 92" />
                    </g>
                    
                    {/* Face Features */}
                    <g transform="translate(0, 0)">
                        {/* Eyes */}
                        <circle cx="45" cy="40" r="4.5" fill="white" />
                        <circle cx="45" cy="40" r="1.5" fill="#1e293b" />
                        
                        <circle cx="75" cy="40" r="4.5" fill="white" />
                        <circle cx="75" cy="40" r="1.5" fill="#1e293b" />
                        
                        {/* Nose */}
                        <ellipse cx="60" cy="44" rx="4" ry="2.5" fill="#1e293b" />
                        
                        {/* Whiskers */}
                        <path d="M30 46 L10 44" stroke="#1e293b" strokeWidth="1" opacity="0.4" />
                        <path d="M30 50 L10 52" stroke="#1e293b" strokeWidth="1" opacity="0.4" />
                        <path d="M90 46 L110 44" stroke="#1e293b" strokeWidth="1" opacity="0.4" />
                        <path d="M90 50 L110 52" stroke="#1e293b" strokeWidth="1" opacity="0.4" />
                    </g>
                                    
                    {/* Leaf on head */}
                    <path d="M60 10 Q60 -5 70 -2 C65 -5 60 -2 60 10" fill="#4ade80" />
                </g>

                {/* Soot Sprites (Susuwatari) - Floating Elements */}
                <g transform="translate(30, 40) rotate(-15)">
                    {/* Spikes by using star polygon approximation or simplified circle with stroke dashes? Just fuzzy circle */}
                     <circle cx="0" cy="0" r="8" fill="#1e293b" />
                     {/* Eyes */}
                     <circle cx="-3" cy="-1" r="2.5" fill="white" />
                     <circle cx="-3" cy="-1" r="1" fill="black" />
                     <circle cx="3" cy="-1" r="2.5" fill="white" />
                     <circle cx="3" cy="-1" r="1" fill="black" />
                </g>
                
                <g transform="translate(50, 160) scale(0.7) rotate(20)">
                    <circle cx="0" cy="0" r="8" fill="#1e293b" />
                    <circle cx="-3" cy="-1" r="2.5" fill="white" />
                    <circle cx="-3" cy="-1" r="1" fill="black" />
                    <circle cx="3" cy="-1" r="2.5" fill="white" />
                    <circle cx="3" cy="-1" r="1" fill="black" />
                </g>
                
                {/* Small White Totoro (Chibi) Peeking */}
                <g transform="translate(160, 130) scale(0.5) rotate(-10)">
                     <path d="M20 70 C20 40 60 40 60 70 C60 90 20 90 20 70 Z" fill="white" opacity="0.9" />
                     <path d="M25 45 L22 30 L35 42 Z" fill="white" opacity="0.9" />
                     <path d="M55 45 L58 30 L45 42 Z" fill="white" opacity="0.9" />
                     <circle cx="32" cy="55" r="3" fill="#1e293b" opacity="0.6" />
                     <circle cx="48" cy="55" r="3" fill="#1e293b" opacity="0.6" />
                </g>
            </svg>
        </div>
    );
};
