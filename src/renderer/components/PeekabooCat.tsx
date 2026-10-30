import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getCatHunger, useCatfoodStore } from '../lib/catfoodStore';
import type { HungerLevel } from '../lib/catfood';
import './PeekabooCat.css';

type Side = 'top' | 'bottom' | 'left' | 'right';
type Mood = 'peek' | 'happy' | 'eating' | 'angry';

interface CatPosition {
    side: Side;
    offset: number; // Percentage 0-100 along the edge
}

interface PeekabooCatProps {
    isSidebarOpen: boolean;
}

const ROTATION: Record<Side, number> = { bottom: 0, top: 180, left: 90, right: -90 };
// Top is the cat's home (it peeks out of the header), so it shows up there most often.
const SIDE_WEIGHTS: Array<[Side, number]> = [['top', 5], ['bottom', 2], ['left', 1], ['right', 2]];

const PEEK_MS = 3400;
const HAPPY_MS = 2600;
const EATING_MS = 2400;
const ANGRY_MS = 2400;
const SLIDE_MS = 550;

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Random wait before the next peek; rarer when motion is reduced. */
const nextPeekDelay = () => (reducedMotion() ? 60000 + Math.random() * 60000 : 20000 + Math.random() * 30000);

const pickSide = (): Side => {
    const total = SIDE_WEIGHTS.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * total;
    for (const [side, w] of SIDE_WEIGHTS) {
        if ((r -= w) < 0) return side;
    }
    return 'top';
};

const CatSvg: React.FC<{ mood: Mood; hunger: HungerLevel }> = ({ mood, hunger }) => {
    const happy = mood === 'happy' || mood === 'eating';
    const angry = mood === 'angry';
    const weak = !happy && hunger === 'weak';
    const sad = !happy && !angry && (hunger === 'hungry' || hunger === 'weak');
    const fur = weak ? '#1b1e26' : '#111318';
    const eyeColor = weak ? '#a16207' : '#facc15';
    // Ears droop when weak and flatten back when angry.
    const earTilt = angry ? 26 : weak ? 16 : 0;
    return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
            {/* Ears */}
            <g transform={`rotate(${-earTilt} 30 40)`}>
                <path d="M16 46 L22 6 L46 30 Z" fill={fur} stroke="#2b3040" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M23 36 L25 16 L37 29 Z" fill="#3a2a35" />
            </g>
            <g transform={`rotate(${earTilt} 70 40)`}>
                <path d="M84 46 L78 6 L54 30 Z" fill={fur} stroke="#2b3040" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M77 36 L75 16 L63 29 Z" fill="#3a2a35" />
            </g>
            {/* Head + body continuing past the edge */}
            <path
                d="M14 58 C14 36 30 26 50 26 C70 26 86 36 86 58 C86 66 83 72 80 76 L80 110 L20 110 L20 76 C17 72 14 66 14 58 Z"
                fill={fur}
                stroke="#2b3040"
                strokeWidth="1.5"
            />
            {/* Eyes */}
            {happy ? (
                <g stroke="#facc15" strokeWidth="3.5" strokeLinecap="round" fill="none">
                    <path d="M29 54 Q36 45 43 54" />
                    <path d="M57 54 Q64 45 71 54" />
                </g>
            ) : angry ? (
                <g>
                    <circle cx="36" cy="53" r="7.5" fill="#facc15" />
                    <circle cx="64" cy="53" r="7.5" fill="#facc15" />
                    <ellipse cx="36" cy="53" rx="1.6" ry="6" fill="#07080b" />
                    <ellipse cx="64" cy="53" rx="1.6" ry="6" fill="#07080b" />
                    {/* Angry brows */}
                    <path d="M26 41 L45 48" stroke="#f87171" strokeWidth="3.5" strokeLinecap="round" />
                    <path d="M74 41 L55 48" stroke="#f87171" strokeWidth="3.5" strokeLinecap="round" />
                </g>
            ) : (
                <g className={sad ? undefined : 'pc-eyes-open'}>
                    <circle cx="36" cy="52" r="8" fill="#07080b" stroke={eyeColor} strokeWidth="3" />
                    <circle cx="64" cy="52" r="8" fill="#07080b" stroke={eyeColor} strokeWidth="3" />
                    {!weak && <circle cx="38.5" cy="49.5" r="1.8" fill="#fff" />}
                    {!weak && <circle cx="66.5" cy="49.5" r="1.8" fill="#fff" />}
                    {/* Heavy, sad eyelids: lower when weak */}
                    {sad && (
                        <g fill={fur}>
                            <path d={weak ? 'M25 41 L47 41 L47 54 Q36 50 25 56 Z' : 'M25 41 L47 41 L47 49 Q36 46 25 52 Z'} />
                            <path d={weak ? 'M75 41 L53 41 L53 54 Q64 50 75 56 Z' : 'M75 41 L53 41 L53 49 Q64 46 75 52 Z'} />
                        </g>
                    )}
                </g>
            )}
            {happy && (
                <g fill="#f472b6" opacity="0.55">
                    <ellipse cx="26" cy="63" rx="6" ry="3.5" />
                    <ellipse cx="74" cy="63" rx="6" ry="3.5" />
                </g>
            )}
            {/* Nose + mouth */}
            <path d="M47 60 L53 60 L50 63.5 Z" fill={weak ? '#d6a3bd' : '#f9a8d4'} />
            {mood === 'eating' ? (
                <ellipse className="pc-mouth-chomp" cx="50" cy="66.5" rx="4.5" ry="3.5" fill="#3b0d1c" />
            ) : angry ? (
                <g>
                    <path d="M43 65 Q50 63 57 65 Q55 72 50 72 Q45 72 43 65 Z" fill="#3b0d1c" />
                    <path d="M45 65 L46.5 68.5 L48 65 Z M52 65 L53.5 68.5 L55 65 Z" fill="#fff" />
                </g>
            ) : (
                <path
                    d={happy ? 'M43 65 Q46.5 71 50 65 Q53.5 71 57 65' : sad ? 'M45 68 Q50 64 55 68' : 'M45 66 Q47.5 68.5 50 66 Q52.5 68.5 55 66'}
                    stroke="#9ca3af"
                    strokeWidth="1.6"
                    fill="none"
                    strokeLinecap="round"
                />
            )}
            {/* Whiskers (droop when weak) */}
            <g stroke="#6b7280" strokeWidth="1" strokeLinecap="round">
                <path d={weak ? 'M30 63 L13 66' : 'M30 63 L12 60'} />
                <path d={weak ? 'M30 66 L15 72' : 'M30 66 L13 68'} />
                <path d={weak ? 'M70 63 L87 66' : 'M70 63 L88 60'} />
                <path d={weak ? 'M70 66 L85 72' : 'M70 66 L87 68'} />
            </g>
            {/* Paws gripping the edge */}
            <g fill={fur} stroke="#2b3040" strokeWidth="1.5">
                <ellipse cx="25" cy="72" rx="8" ry="5.5" />
                <ellipse cx="75" cy="72" rx="8" ry="5.5" />
            </g>
            {/* Sweat drop when weak */}
            {weak && <path className="pc-sweat" d="M82 30 Q86 37 82 40 Q78 37 82 30 Z" fill="#7dd3fc" opacity="0.85" />}
            {/* Anger mark */}
            {angry && (
                <g stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" className="pc-anger">
                    <path d="M80 18 Q84 22 88 18" />
                    <path d="M80 26 Q84 22 88 26" />
                    <path d="M80 18 Q76 22 80 26" />
                    <path d="M88 18 Q92 22 88 26" />
                </g>
            )}
            {mood === 'eating' && (
                <g className="pc-fish-drop">
                    <g className="pc-fish">
                        <ellipse cx="47" cy="71" rx="9" ry="4.5" fill="#fb923c" />
                        <path d="M55 71 L63 66.5 L63 75.5 Z" fill="#f97316" />
                        <circle cx="42" cy="70" r="1.2" fill="#1f2937" />
                    </g>
                </g>
            )}
        </svg>
    );
};

const Hearts: React.FC<{ burst: number }> = ({ burst }) => (
    <>
        {[
            { left: '18%', delay: 0 },
            { left: '46%', delay: 180 },
            { left: '72%', delay: 360 },
        ].map((h, i) => (
            <span key={`${burst}-${i}`} className="pc-heart" style={{ left: h.left, animationDelay: `${h.delay}ms` }}>
                ♥
            </span>
        ))}
    </>
);

const labelStyle = (side: Side): React.CSSProperties => {
    switch (side) {
        case 'top': return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 4 };
        case 'bottom': return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 4 };
        case 'left': return { left: '100%', top: '10%', marginLeft: 4 };
        case 'right': return { right: '100%', top: '10%', marginRight: 4 };
    }
};

export const PeekabooCat: React.FC<PeekabooCatProps> = ({ isSidebarOpen }) => {
    const [mounted, setMounted] = useState(false);
    const [isUp, setIsUp] = useState(false);
    const [mood, setMood] = useState<Mood>('peek');
    const [hunger, setHunger] = useState<HungerLevel>('content');
    const [angryBurst, setAngryBurst] = useState(0);
    const [rolling, setRolling] = useState(false);
    const [hearts, setHearts] = useState(0);
    const [label, setLabel] = useState<string | null>(null);
    const [position, setPosition] = useState<CatPosition>({ side: 'top', offset: 50 });

    const feedCount = useCatfoodStore((s) => s.feedCount);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const busy = useRef(false); // happy/eating: don't let a scheduled peek interrupt
    const feedSeen = useRef(feedCount);

    const clearTimers = () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    };
    const later = (fn: () => void, ms: number) => {
        timers.current.push(setTimeout(fn, ms));
    };

    const scheduleNext = useCallback(() => {
        if (document.visibilityState !== 'visible') return;
        later(() => peek(), nextPeekDelay());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const hide = useCallback(() => {
        clearTimers();
        setIsUp(false);
        setLabel(null);
        later(() => {
            setMounted(false);
            setRolling(false);
            busy.current = false;
            scheduleNext();
        }, SLIDE_MS);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scheduleNext]);

    const popUp = (pos: CatPosition, nextMood: Mood) => {
        clearTimers();
        setPosition(pos);
        setMood(nextMood);
        setMounted(true);
        // Let the hidden position paint once before sliding in.
        later(() => setIsUp(true), 30);
    };

    const peek = () => {
        if (busy.current || document.visibilityState !== 'visible') return;
        const level = getCatHunger();
        setHunger(level);
        popUp({ side: pickSide(), offset: 20 + Math.random() * 60 }, 'peek');
        setLabel(level === 'weak' ? 'Jogu feels weak… 🥺' : level === 'hungry' ? 'Jogu is hungry 🐟' : null);
        later(hide, PEEK_MS);
    };

    const handleClick = () => {
        if (!isUp || mood === 'eating') return;
        useCatfoodStore.getState().pet();
        clearTimers();
        busy.current = true;
        // A hungry cat doesn't want pets, it wants food.
        if (hunger === 'hungry' || hunger === 'weak') {
            setMood('angry');
            setRolling(false);
            setAngryBurst((n) => n + 1);
            setLabel(hunger === 'weak' ? 'too weak… FEED ME 💢' : 'hiss! feed me 💢');
            later(hide, ANGRY_MS);
            return;
        }
        setMood('happy');
        setRolling(false);
        // Restart the roll animation even on repeated clicks.
        requestAnimationFrame(() => setRolling(true));
        setHearts((h) => h + 1);
        setLabel('purr~');
        later(hide, HAPPY_MS);
    };

    // Feeding: pop up (or stay up) and eat, then be happy.
    useEffect(() => {
        if (feedCount === feedSeen.current) return;
        feedSeen.current = feedCount;
        busy.current = true;
        const startEating = () => {
            setHunger('full');
            setMood('eating');
            setRolling(false);
            setLabel('nom nom');
            later(() => {
                setMood('happy');
                setHearts((h) => h + 1);
                setLabel('purrrr ♥');
                later(hide, HAPPY_MS);
            }, EATING_MS);
        };
        if (isUp) {
            clearTimers();
            startEating();
        } else {
            popUp({ side: 'top', offset: 50 }, 'eating');
            startEating();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [feedCount]);

    // Peek only while the window is visible; stop everything when hidden.
    useEffect(() => {
        const onVisibility = () => {
            clearTimers();
            if (document.visibilityState === 'visible') {
                later(() => peek(), 4000);
            } else {
                busy.current = false;
                setIsUp(false);
                setMounted(false);
            }
        };
        onVisibility();
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            clearTimers();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!mounted) return null;

    const sidebarWidth = isSidebarOpen ? 100 : 0;
    const { side, offset } = position;
    const anchor: React.CSSProperties =
        side === 'top' ? { top: 0, left: `${offset}%`, transform: 'translateX(-50%)' }
        : side === 'bottom' ? { bottom: 0, left: `${offset}%`, transform: 'translateX(-50%)' }
        : side === 'left' ? { left: sidebarWidth, top: `${offset}%`, transform: 'translateY(-50%)' }
        : { right: 0, top: `${offset}%`, transform: 'translateY(-50%)' };

    return createPortal(
        <div className="pc-anchor" style={anchor}>
            <div className="pc-frame" style={{ transform: `rotate(${ROTATION[side]}deg)` }}>
                <div className={`pc-hole ${isUp ? 'is-open' : ''}`} />
                <div className="pc-mask">
                    <div className={`pc-cat ${isUp ? 'is-up' : ''} ${mood !== 'peek' ? 'is-out' : ''} ${mood === 'peek' && hunger === 'weak' ? 'is-weak' : ''}`}>
                        <div
                            key={mood === 'angry' ? `angry-${angryBurst}` : 'calm'}
                            className={`pc-body ${rolling ? 'is-rolling' : ''} ${mood === 'angry' ? 'is-angry' : ''}`}
                            role="button"
                            tabIndex={-1}
                            aria-label="Pet Jogu"
                            title="Pet Jogu"
                            onClick={handleClick}
                            onAnimationEnd={(e) => {
                                if (e.target === e.currentTarget) setRolling(false);
                            }}
                        >
                            <CatSvg mood={mood} hunger={hunger} />
                        </div>
                    </div>
                </div>
                {hearts > 0 && (mood === 'happy' || mood === 'eating') && <Hearts burst={hearts} />}
            </div>
            {label && isUp && (
                <div className="pc-label-pos" style={labelStyle(side)}>
                    <span className="pc-label">
                        {/* Name tag whenever Jogu reacts (tapped, eating), so people learn its name */}
                        {mood !== 'peek' && <span className="pc-name">Jogu</span>}
                        {label}
                    </span>
                </div>
            )}
        </div>,
        document.body,
    );
};
