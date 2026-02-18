import React from 'react';

interface NoFaceBgProps {
    className?: string;
    style?: React.CSSProperties;
    opacity?: number;
}

export const NoFaceBg: React.FC<NoFaceBgProps> = ({ className = '', style = {}, opacity = 0.15 }) => {
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
                    <linearGradient id="noFaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#334155" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
                    </linearGradient>
                </defs>

                {/* Body - Ghostly shape */}
                <path 
                    d="M60 180 C60 100 80 40 100 40 C120 40 140 100 140 180 L140 220 L60 220 Z" 
                    fill="url(#noFaceGrad)" 
                    opacity="0.8"
                />

                {/* Mask - White oval */}
                <g transform="translate(100, 75) scale(0.9)">
                    <ellipse cx="0" cy="0" rx="22" ry="32" fill="#f8fafc" />
                    
                    {/* Eyes - Black ovals */}
                    <ellipse cx="-10" cy="-5" rx="4" ry="2" fill="#1e293b" opacity="0.8" />
                    <ellipse cx="10" cy="-5" rx="4" ry="2" fill="#1e293b" opacity="0.8" />
                    
                    {/* Mouth - Small line */}
                    <path d="M-5 15 Q0 18 5 15" stroke="#1e293b" strokeWidth="1.5" fill="none" opacity="0.5" />
                    
                    {/* Purple Marks */}
                    {/* Under eyes */}
                    <path d="M-10 0 L-10 12" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                    <path d="M10 0 L10 12" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                    
                    {/* Forehead triangles */}
                    <path d="M-8 -20 L-2 -28 L4 -20" fill="#a855f7" opacity="0.6" />
                </g>
                
                {/* Floating Gold pieces (offerings) */}
                <g transform="translate(40, 140) rotate(10)">
                    <circle cx="0" cy="0" r="5" fill="#facc15" opacity="0.6" />
                    <path d="M-2 -2 L2 2 M2 -2 L-2 2" stroke="#ca8a04" strokeWidth="0.5" />
                </g>
                <g transform="translate(160, 150) rotate(-20)">
                    <circle cx="0" cy="0" r="4" fill="#facc15" opacity="0.5" />
                </g>
                <g transform="translate(140, 100) rotate(45)">
                     <circle cx="0" cy="0" r="3" fill="#facc15" opacity="0.4" />
                </g>

            </svg>
        </div>
    );
};
