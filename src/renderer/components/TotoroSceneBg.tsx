import React from 'react';

interface TotoroSceneBgProps {
    className?: string;
    opacity?: number;
}

/**
 * Pure-SVG Totoro scene background.
 * Three Totoros (big grey, medium blue, small white) at a bus stop with clouds.
 * Designed to sit behind the Usage Breakdown pie chart at low opacity.
 */
export const TotoroSceneBg: React.FC<TotoroSceneBgProps> = ({ className = '', opacity = 0.13 }) => {
    return (
        <div
            className={`pointer-events-none absolute inset-0 overflow-hidden rounded-2xl ${className}`}
            style={{ zIndex: 0 }}
        >
            <svg
                viewBox="0 0 520 300"
                preserveAspectRatio="xMidYMax meet"
                style={{ width: '100%', height: '100%', opacity }}
            >
                {/* ── Ground ── */}
                <rect x="0" y="260" width="520" height="40" fill="#4ade80" opacity="0.3" rx="4" />

                {/* ── Clouds ── */}
                {/* Cloud 1 */}
                <g opacity="0.9">
                    <ellipse cx="80" cy="38" rx="28" ry="18" fill="white" />
                    <ellipse cx="108" cy="32" rx="22" ry="15" fill="white" />
                    <ellipse cx="55" cy="42" rx="20" ry="13" fill="white" />
                </g>
                {/* Cloud 2 */}
                <g opacity="0.9">
                    <ellipse cx="390" cy="28" rx="32" ry="20" fill="white" />
                    <ellipse cx="420" cy="22" rx="24" ry="16" fill="white" />
                    <ellipse cx="362" cy="34" rx="22" ry="14" fill="white" />
                </g>
                {/* Cloud 3 — small */}
                <g opacity="0.7">
                    <ellipse cx="240" cy="18" rx="20" ry="12" fill="white" />
                    <ellipse cx="258" cy="14" rx="16" ry="10" fill="white" />
                </g>

                {/* ── Bus Stop Sign ── */}
                <g transform="translate(60, 100)">
                    {/* Pole */}
                    <rect x="-2" y="0" width="4" height="160" fill="#64748b" rx="2" />
                    {/* Sign circle */}
                    <circle cx="0" cy="0" r="18" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
                    <text x="0" y="4" textAnchor="middle" fontSize="9" fill="#475569" fontWeight="bold" fontFamily="sans-serif">BUS</text>
                    {/* Timetable board */}
                    <rect x="-12" y="22" width="24" height="32" fill="#f1f5f9" stroke="#64748b" strokeWidth="1" rx="2" />
                    <line x1="-8" y1="30" x2="8" y2="30" stroke="#94a3b8" strokeWidth="1" />
                    <line x1="-8" y1="38" x2="8" y2="38" stroke="#94a3b8" strokeWidth="1" />
                    <line x1="-8" y1="46" x2="8" y2="46" stroke="#94a3b8" strokeWidth="1" />
                </g>

                {/* ── Small white Totoro (Chibi) ── */}
                <g transform="translate(110, 210)">
                    {/* Ears */}
                    <path d="M18 12 L14 -4 L26 8 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5" />
                    <path d="M38 12 L42 -4 L30 8 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5" />
                    {/* Body */}
                    <ellipse cx="28" cy="36" rx="22" ry="28" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                    {/* Belly */}
                    <ellipse cx="28" cy="44" rx="14" ry="16" fill="white" />
                    {/* Eyes */}
                    <circle cx="20" cy="24" r="4" fill="white" />
                    <circle cx="20" cy="24" r="2" fill="#1e293b" />
                    <circle cx="36" cy="24" r="4" fill="white" />
                    <circle cx="36" cy="24" r="2" fill="#1e293b" />
                    {/* Nose */}
                    <ellipse cx="28" cy="30" rx="2.5" ry="1.5" fill="#94a3b8" />
                    {/* Smile */}
                    <path d="M22 34 Q28 38 34 34" fill="none" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
                    {/* Whiskers */}
                    <line x1="6" y1="28" x2="18" y2="30" stroke="#94a3b8" strokeWidth="0.8" />
                    <line x1="6" y1="32" x2="18" y2="32" stroke="#94a3b8" strokeWidth="0.8" />
                    <line x1="38" y1="30" x2="50" y2="28" stroke="#94a3b8" strokeWidth="0.8" />
                    <line x1="38" y1="32" x2="50" y2="32" stroke="#94a3b8" strokeWidth="0.8" />
                </g>

                {/* ── Medium blue Totoro ── */}
                <g transform="translate(168, 170)">
                    {/* Ears */}
                    <path d="M24 16 L18 -8 L34 10 Z" fill="#60a5fa" stroke="#3b82f6" strokeWidth="0.5" />
                    <path d="M52 16 L58 -8 L42 10 Z" fill="#60a5fa" stroke="#3b82f6" strokeWidth="0.5" />
                    {/* Body */}
                    <ellipse cx="38" cy="52" rx="32" ry="42" fill="#60a5fa" stroke="#3b82f6" strokeWidth="1" />
                    {/* Belly */}
                    <ellipse cx="38" cy="62" rx="20" ry="24" fill="#bfdbfe" />
                    {/* Belly marks */}
                    <g stroke="#93c5fd" strokeWidth="1.2" fill="none" strokeLinecap="round">
                        <path d="M28 52 L33 48 L38 52" />
                        <path d="M38 52 L43 48 L48 52" />
                        <path d="M32 62 L38 58 L44 62" />
                    </g>
                    {/* Eyes */}
                    <circle cx="26" cy="34" r="6" fill="white" />
                    <circle cx="26" cy="34" r="3" fill="#1e293b" />
                    <circle cx="27.2" cy="32.8" r="1.2" fill="white" />
                    <circle cx="50" cy="34" r="6" fill="white" />
                    <circle cx="50" cy="34" r="3" fill="#1e293b" />
                    <circle cx="51.2" cy="32.8" r="1.2" fill="white" />
                    {/* Nose */}
                    <ellipse cx="38" cy="42" rx="3.5" ry="2" fill="#2563eb" />
                    {/* Whiskers */}
                    <line x1="4" y1="38" x2="22" y2="42" stroke="#93c5fd" strokeWidth="1" />
                    <line x1="4" y1="44" x2="22" y2="44" stroke="#93c5fd" strokeWidth="1" />
                    <line x1="54" y1="42" x2="72" y2="38" stroke="#93c5fd" strokeWidth="1" />
                    <line x1="54" y1="44" x2="72" y2="44" stroke="#93c5fd" strokeWidth="1" />
                </g>

                {/* ── Big grey Totoro ── */}
                <g transform="translate(290, 110)">
                    {/* Ears */}
                    <path d="M36 22 L26 -14 L52 14 Z" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" />
                    <path d="M80 22 L90 -14 L64 14 Z" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" />
                    {/* Body */}
                    <ellipse cx="58" cy="90" rx="52" ry="70" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
                    {/* Belly */}
                    <ellipse cx="58" cy="108" rx="34" ry="42" fill="#f1f5f9" />
                    {/* Belly marks */}
                    <g stroke="#cbd5e1" strokeWidth="1.5" fill="none" strokeLinecap="round">
                        <path d="M42 88 L50 82 L58 88" />
                        <path d="M58 88 L66 82 L74 88" />
                        <path d="M48 106 L58 100 L68 106" />
                    </g>
                    {/* Eyes */}
                    <circle cx="40" cy="56" r="10" fill="white" />
                    <circle cx="40" cy="56" r="5" fill="#1e293b" />
                    <circle cx="42" cy="54" r="2" fill="white" />
                    <circle cx="76" cy="56" r="10" fill="white" />
                    <circle cx="76" cy="56" r="5" fill="#1e293b" />
                    <circle cx="78" cy="54" r="2" fill="white" />
                    {/* Nose */}
                    <ellipse cx="58" cy="70" rx="5" ry="3" fill="#475569" />
                    {/* Smile */}
                    <path d="M44 80 Q58 90 72 80" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                    {/* Whiskers */}
                    <line x1="4" y1="62" x2="32" y2="68" stroke="#64748b" strokeWidth="1.2" />
                    <line x1="4" y1="72" x2="32" y2="72" stroke="#64748b" strokeWidth="1.2" />
                    <line x1="84" y1="68" x2="112" y2="62" stroke="#64748b" strokeWidth="1.2" />
                    <line x1="84" y1="72" x2="112" y2="72" stroke="#64748b" strokeWidth="1.2" />
                    {/* Leaf on head */}
                    <path d="M58 18 Q58 2 70 6 C64 2 58 6 58 18" fill="#4ade80" opacity="0.8" />
                </g>

                {/* ── Grass tufts ── */}
                <g fill="#4ade80" opacity="0.5">
                    <path d="M100 262 Q104 248 108 262" />
                    <path d="M106 262 Q110 250 114 262" />
                    <path d="M200 262 Q204 252 208 262" />
                    <path d="M420 262 Q424 250 428 262" />
                    <path d="M450 262 Q454 252 458 262" />
                </g>
            </svg>
        </div>
    );
};
