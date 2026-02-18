import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import { LuffyBg } from './LuffyBg';

interface AnimationOverlayProps {
    type: 'flex' | 'rating-low' | 'rating-mid' | 'rating-high';
    onComplete?: () => void;
    goal?: string; // For rating-mid
    rating?: number; // For rating
}

export const AnimationOverlay = ({ type, onComplete, goal, rating }: AnimationOverlayProps) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const duration = type === 'flex' ? 3500 : 4500;
        const timer = setTimeout(() => {
            handleClose();
        }, duration);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(() => {
            onComplete?.();
        }, 500); // Wait for exit animation
    };

    if (!visible) return null;

    let content = null;
    let bgStyle = {};

    switch (type) {
        case 'flex':
            // One Piece / Blue Sea Theme
            content = (
                <LuffyBg />
            );
            bgStyle = { zIndex: 9999 };
            break;

        case 'rating-low':
            content = (
                <div className="flex flex-col items-center animate-fade-in-up p-12 text-center max-w-2xl bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
                    <h1 className="text-6xl font-black text-white mb-6 drop-shadow-lg tracking-tight">We go again<br />tomorrow.</h1>
                    <div className="h-1 w-24 bg-blue-400 rounded-full mb-6"></div>
                    <p className="text-2xl text-blue-100 font-light italic">"Growth often comes from the hardest days."</p>
                    <div className="mt-8 px-4 py-1 rounded bg-white/10 text-white/60 text-sm font-mono">Rating: {rating}/10</div>
                </div>
            );
            bgStyle = { background: 'radial-gradient(circle at center, #2C3E50, #000000)', zIndex: 9999 };
            break;

        case 'rating-mid':
            content = (
                <div className="flex flex-col items-center animate-fade-in-up text-center max-w-4xl p-12 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl">
                    <h1 className="text-6xl font-black text-white mb-6 drop-shadow-md leading-tight">You are doing<br />absolutely brilliant!</h1>
                    <p className="text-3xl text-white/90 font-medium leading-relaxed max-w-2xl">
                        With this speed you will reach <br />
                        <span className="text-yellow-300 font-bold bg-black/20 px-4 py-1 rounded-xl inline-block mt-3 transform -rotate-1 shadow-lg">"{goal || 'your goal'}"</span>
                        <br /> real soon.
                    </p>
                    <div className="mt-8 flex gap-2">
                        {[1, 2, 3].map(i => <span key={i} className="text-3xl animate-bounce" style={{ animationDelay: `${i * 150}ms` }}>🔥</span>)}
                    </div>
                </div>
            );
            bgStyle = { background: 'linear-gradient(135deg, #F2994A, #F2C94C)', zIndex: 9999 };
            break;

        case 'rating-high':
            content = (
                <div className="flex flex-col items-center animate-zoom-in p-12 text-center">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-30 animate-pulse"></div>
                        <h1 className="relative text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] tracking-tighter uppercase italic">
                            PEAK<br />PERFORMANCE
                        </h1>
                    </div>

                    <div className="flex items-center gap-4 bg-black/30 backdrop-blur-md px-8 py-4 rounded-2xl border border-yellow-500/30 shadow-xl transform hover:scale-105 transition-transform">
                        <span className="text-yellow-400 text-4xl">★</span>
                        <span className="text-5xl font-bold text-white tracking-widest">{rating}/10</span>
                        <span className="text-yellow-400 text-4xl">★</span>
                    </div>
                </div>
            );
            bgStyle = { background: 'linear-gradient(135deg, #4A00E0, #8E2DE2)', zIndex: 9999 };
            break;
    }

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center transition-opacity duration-500 backdrop-blur-sm ${visible ? 'opacity-100' : 'opacity-0'}`}
            style={bgStyle}
        >
            <div className="absolute inset-0 bg-noise opacity-5 pointer-events-none"></div>
            <button
                onClick={handleClose}
                className="absolute top-8 right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/10 z-50 group"
            >
                <X size={32} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
            {content}
        </div>
    );
};
