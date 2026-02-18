import React from 'react';

interface SootSpriteBgProps {
    className?: string;
    style?: React.CSSProperties;
    opacity?: number;
}

export const SootSpriteBg: React.FC<SootSpriteBgProps> = ({ className = '', style = {}, opacity = 0.15 }) => {
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
                {/* Sprite 1 - Carrying Star */}
                <g transform="translate(140, 140) rotate(-10)">
                    {/* Spikes */}
                    <circle cx="0" cy="0" r="18" fill="#1e293b" />
                    {/* Eyes */}
                    <circle cx="-6" cy="-4" r="5" fill="white" />
                    <circle cx="-6" cy="-4" r="2" fill="black" />
                    <circle cx="6" cy="-4" r="5" fill="white" />
                    <circle cx="6" cy="-4" r="2" fill="black" />
                    
                    {/* Star (Konpeito) */}
                    <path d="M15 10 L18 2 L22 8 L28 5 L24 12 L30 18 L22 20 L18 28 L14 20 L6 18 L12 12 L8 5 Z" fill="#f472b6" opacity="0.9" transform="rotate(15)" />
                    {/* Arms */}
                    <path d="M10 5 L18 8" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                    <path d="M10 10 L18 15" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                    {/* Legs */}
                    <path d="M-5 15 L-8 22" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                    <path d="M5 15 L8 22" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                </g>

                {/* Sprite 2 - Hanging upside down */}
                <g transform="translate(40, 40) rotate(170)">
                    <circle cx="0" cy="0" r="14" fill="#1e293b" />
                    <circle cx="-5" cy="-2" r="4" fill="white" />
                    <circle cx="-5" cy="-2" r="1.5" fill="black" />
                    <circle cx="5" cy="-2" r="4" fill="white" />
                    <circle cx="5" cy="-2" r="1.5" fill="black" />
                </g>

                {/* Sprite 3 - Running */}
                <g transform="translate(80, 170) rotate(10)">
                     <circle cx="0" cy="0" r="12" fill="#1e293b" />
                     <circle cx="-4" cy="-2" r="3.5" fill="white" />
                     <circle cx="-4" cy="-2" r="1.5" fill="black" />
                     <circle cx="4" cy="-2" r="3.5" fill="white" />
                     <circle cx="4" cy="-2" r="1.5" fill="black" />
                     {/* Legs running */}
                     <path d="M-3 10 L-8 16" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
                     <path d="M3 10 L8 14" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
                </g>
                
                {/* Sprite 4 - Small peeking */}
                <g transform="translate(180, 80)">
                    <circle cx="0" cy="0" r="10" fill="#1e293b" />
                    <circle cx="-3" cy="-1" r="3" fill="white" />
                    <circle cx="-3" cy="-1" r="1" fill="black" />
                    <circle cx="3" cy="-1" r="3" fill="white" />
                    <circle cx="3" cy="-1" r="1" fill="black" />
                </g>
            </svg>
        </div>
    );
};
