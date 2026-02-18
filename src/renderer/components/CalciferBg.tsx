import React from 'react';

interface CalciferBgProps {
    className?: string;
    style?: React.CSSProperties;
    opacity?: number;
}

export const CalciferBg: React.FC<CalciferBgProps> = ({ className = '', style = {}, opacity = 0.15 }) => {
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
                style={{ transform: 'translate(10px, 10px)' }}
            >
                <defs>
                    <radialGradient id="calciferGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" stopColor="#fca5a5" /> {/* Light Red/Orange */}
                        <stop offset="60%" stopColor="#ef4444" /> {/* Red */}
                        <stop offset="100%" stopColor="#b91c1c" /> {/* Dark Red */}
                    </radialGradient>
                    <linearGradient id="logGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                         <stop offset="0%" stopColor="#78350f" />
                         <stop offset="100%" stopColor="#451a03" />
                    </linearGradient>
                </defs>

                {/* Main Flame Body */}
                <path 
                    d="M100 180 
                       C60 180 40 140 40 100 
                       C40 60 70 80 80 40 
                       C90 10 110 10 120 40 
                       C130 80 160 60 160 100 
                       C160 140 140 180 100 180 Z" 
                    fill="url(#calciferGrad)" 
                    className="animate-pulse" // Subtle pulse animation
                    style={{ animationDuration: '3s' }}
                />

                {/* Inner Flame Details (Highlights) */}
                <path d="M100 160 C80 160 70 140 70 120 Q80 100 100 120 Q120 100 130 120 C130 140 120 160 100 160" fill="#fbbf24" opacity="0.4" />

                {/* Eyes */}
                <g transform="translate(80, 80)">
                    <circle cx="0" cy="0" r="12" fill="white" />
                    <circle cx="2" cy="0" r="4" fill="black" />
                </g>
                <g transform="translate(120, 80)">
                    <circle cx="0" cy="0" r="12" fill="white" />
                    <circle cx="2" cy="0" r="4" fill="black" />
                </g>

                {/* Mouth */}
                <path d="M90 110 Q100 115 110 110" stroke="#7f1d1d" strokeWidth="2" fill="none" strokeLinecap="round" />

                {/* Spark / Embers */}
                <circle cx="60" cy="60" r="3" fill="#fbbf24" opacity="0.6" />
                <circle cx="140" cy="50" r="4" fill="#fbbf24" opacity="0.6" />
                <path d="M100 30 L102 35 L98 35 Z" fill="#fbbf24" opacity="0.5" />

                {/* Logs under (Optional, keeps it simple without) */}
                {/* <rect x="60" y="170" width="80" height="20" rx="5" fill="url(#logGrad)" /> */}
            </svg>
        </div>
    );
};
