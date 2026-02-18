import React from 'react';

interface TotoroBusStopBgProps {
    className?: string;
    style?: React.CSSProperties;
    opacity?: number;
}

export const TotoroBusStopBg: React.FC<TotoroBusStopBgProps> = ({ className = '', style = {}, opacity = 0.2 }) => {
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
                viewBox="0 0 800 450" 
                preserveAspectRatio="xMidYMax slice"
                className="w-full h-full opacity-60"
            >
                <defs>
                    <linearGradient id="rainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#1e293b" stopOpacity="0" />
                        <stop offset="100%" stopColor="#334155" stopOpacity="0.3" />
                    </linearGradient>
                    <linearGradient id="totoroGrey" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#64748b" />
                    </linearGradient>
                </defs>

                {/* Rain Animation Style */}
                <style>
                    {`
                        @keyframes rain {
                            0% { transform: translateY(-400px); }
                            100% { transform: translateY(400px); }
                        }
                        .rain-drop {
                            animation: rain 1.5s linear infinite;
                        }
                    `}
                </style>

                {/* Bus Stop Sign (Left) - Positioned at bottom left */}
                <g transform="translate(80, 200) scale(1.2)">
                    <rect x="-2" y="0" width="4" height="160" fill="#475569" />
                    <circle cx="0" cy="0" r="15" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
                    <text x="0" y="4" textAnchor="middle" fontSize="10" fill="#475569" fontWeight="bold">BUS</text>
                    <rect x="-10" y="20" width="20" height="30" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
                    <line x1="-6" y1="28" x2="6" y2="28" stroke="#475569" strokeWidth="1" />
                    <line x1="-6" y1="36" x2="6" y2="36" stroke="#475569" strokeWidth="1" />
                </g>

                {/* Totoro with Umbrella (Right) - Positioned at bottom right */}
                <g transform="translate(600, 250) scale(1.4)">
                    {/* Umbrella Stick */}
                    <line x1="60" y1="20" x2="60" y2="100" stroke="#7a4521ff" strokeWidth="3" />
                    
                    {/* Umbrella Top */}
                    <path d="M10 20 Q60 -20 110 20 Z" fill="#8c400dff" />
                    <path d="M10 20 Q60 -10 110 20" fill="none" stroke="#333" strokeWidth="1" opacity="0.3" />

                    {/* Totoro Body */}
                    <g transform="translate(20, 30)">
                        {/* Ears */}
                        <path d="M35 15 L30 -10 L50 5 Z" fill="url(#totoroGrey)" />
                        <path d="M85 15 L90 -10 L70 5 Z" fill="url(#totoroGrey)" />
                        
                        {/* Body base */}
                        <ellipse cx="60" cy="80" rx="55" ry="65" fill="url(#totoroGrey)" />
                        
                        {/* Belly */}
                        <ellipse cx="60" cy="95" rx="40" ry="35" fill="#f8fafc" opacity="0.9" />
                        
                        {/* Belly Marks */}
                        <g stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round">
                            <path d="M50 82 L55 78 L60 82" />
                            <path d="M60 82 L65 78 L70 82" />
                            <path d="M55 92 L60 88 L65 92" />
                        </g>
                        
                        {/* Arm holding umbrella */}
                        <path d="M90 60 Q100 50 110 40" stroke="url(#totoroGrey)" strokeWidth="10" strokeLinecap="round" />
                        <circle cx="110" cy="40" r="6" fill="#1c1917" /> {/* Hand holding handle */}

                        {/* Face */}
                        <g transform="translate(0, 5)">
                             <circle cx="45" cy="40" r="4" fill="white" />
                             <circle cx="45" cy="40" r="1.5" fill="#1e293b" />
                             <circle cx="75" cy="40" r="4" fill="white" />
                             <circle cx="75" cy="40" r="1.5" fill="#1e293b" />
                             <ellipse cx="60" cy="44" rx="4" ry="2.5" fill="#1e293b" />
                             <path d="M30 46 L10 44" stroke="#1e293b" strokeWidth="1" opacity="0.4" />
                             <path d="M30 50 L10 52" stroke="#1e293b" strokeWidth="1" opacity="0.4" />
                             <path d="M90 46 L110 44" stroke="#1e293b" strokeWidth="1" opacity="0.4" />
                             <path d="M90 50 L110 52" stroke="#1e293b" strokeWidth="1" opacity="0.4" />
                        </g>

                         {/* Leaf on head */}
                        <path d="M60 10 Q60 -5 70 -2 C65 -5 60 -2 60 10" fill="#4ade80" />
                    </g>
                </g>

                {/* Rain Drops - Distributed across wider viewbox */}
                <g opacity="0.8" stroke="#3684e4ff" strokeWidth="2" strokeLinecap="round">
                    <line x1="100" y1="-50" x2="100" y2="0" className="rain-drop" style={{ animationDelay: '0s', animationDuration: '1.2s' }} />
                    <line x1="300" y1="-50" x2="300" y2="0" className="rain-drop" style={{ animationDelay: '0.2s', animationDuration: '1.5s' }} />
                    <line x1="500" y1="-50" x2="500" y2="0" className="rain-drop" style={{ animationDelay: '0.5s', animationDuration: '1.3s' }} />
                    <line x1="700" y1="-50" x2="700" y2="0" className="rain-drop" style={{ animationDelay: '0.1s', animationDuration: '1.4s' }} />
                    <line x1="200" y1="-50" x2="200" y2="0" className="rain-drop" style={{ animationDelay: '0.6s', animationDuration: '1.1s' }} />
                    <line x1="400" y1="-50" x2="400" y2="0" className="rain-drop" style={{ animationDelay: '0.3s', animationDuration: '1.2s' }} />
                    <line x1="600" y1="-50" x2="600" y2="0" className="rain-drop" style={{ animationDelay: '0.7s', animationDuration: '1.4s' }} />
                    <line x1="50" y1="-50" x2="50" y2="0" className="rain-drop" style={{ animationDelay: '0.9s', animationDuration: '1.3s' }} />
                    <line x1="750" y1="-50" x2="750" y2="0" className="rain-drop" style={{ animationDelay: '0.4s', animationDuration: '1.5s' }} />
                </g>
            </svg>
        </div>
    );
};
