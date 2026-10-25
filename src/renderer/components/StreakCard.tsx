import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { StreakEmblem, TIER_MATERIALS } from './StreakEmblem';
import {
    STREAK_TIERS,
    getStreakRank,
    progressCopy,
    tierRangeCopy,
    shouldCelebrate,
} from '../lib/streakRank';
import './StreakCard.css';

interface StreakCardProps {
    streak: number;
}

const SEEN_KEY = 'produchive_streak_rank_seen';
const REVEAL_MS = 4200;
/** A lower rank is only remembered once it holds this long, so the brief default
 *  value before stats load doesn't make the real rank look like a fresh climb. */
const DOWNGRADE_SETTLE_MS = 3000;

const readSeen = (): number | null => {
    try {
        const raw = localStorage.getItem(SEEN_KEY);
        const n = raw === null ? NaN : Number(raw);
        return Number.isFinite(n) ? n : null;
    } catch {
        return null;
    }
};
const writeSeen = (ordinal: number) => {
    try {
        localStorage.setItem(SEEN_KEY, String(ordinal));
    } catch {
        /* storage unavailable: the reveal just won't play */
    }
};

export const StreakCard = ({ streak }: StreakCardProps) => {
    const rank = getStreakRank(streak);
    const { tier, tierIndex, ordinal } = rank;
    const m = TIER_MATERIALS[tier.id];

    const [open, setOpen] = useState(false);
    const [peek, setPeek] = useState(false);
    const peekTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const [celebrating, setCelebrating] = useState(false);
    const celebrateFor = useRef<number | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popRef = useRef<HTMLDivElement>(null);
    const popId = useId();

    // Rank-up detection, remembered per device.
    useEffect(() => {
        const seen = readSeen();
        if (seen !== null && ordinal < seen) {
            const t = setTimeout(() => writeSeen(ordinal), DOWNGRADE_SETTLE_MS);
            return () => clearTimeout(t);
        }
        if (shouldCelebrate(seen, ordinal)) celebrateFor.current = ordinal;
        writeSeen(ordinal);
        if (celebrateFor.current !== ordinal) return;

        let timer: ReturnType<typeof setTimeout> | undefined;
        const play = () => {
            if (document.hidden) return;
            document.removeEventListener('visibilitychange', play);
            setCelebrating(true);
            timer = setTimeout(() => {
                celebrateFor.current = null;
                setCelebrating(false);
            }, REVEAL_MS);
        };
        // Wait until the window is visible so the moment isn't spent off-screen.
        if (document.hidden) document.addEventListener('visibilitychange', play);
        else play();
        return () => {
            document.removeEventListener('visibilitychange', play);
            if (timer) clearTimeout(timer);
        };
    }, [ordinal]);

    // Small delays so passing the pointer over the badge doesn't flash the details.
    const setPeekSoon = useCallback((on: boolean) => {
        clearTimeout(peekTimer.current);
        peekTimer.current = setTimeout(() => setPeek(on), on ? 120 : 180);
    }, []);
    useEffect(() => () => clearTimeout(peekTimer.current), []);

    const close = useCallback((refocus: boolean) => {
        setOpen(false);
        if (refocus) buttonRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!open) return;
        popRef.current?.focus();
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) close(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close(true);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, close]);

    // Fill for each division segment of the current tier.
    const segments = tier.divisions.length > 1 ? tier.divisions.length : 1;
    const segFill = (i: number) => {
        if (!rank.next) return 1;
        const current = (rank.division ?? 1) - 1;
        return i < current ? 1 : i === current ? rank.progress : 0;
    };

    const nextLine = progressCopy(rank);
    const label = `Study rank ${rank.label}, ${rank.days}-day streak. ${nextLine}. Show all ranks.`;

    const vars = {
        '--sr-light': m.light,
        '--sr-mid': m.mid,
        '--sr-dark': m.dark,
        '--sr-glow': m.glow,
        '--sr-accent': m.accent ?? m.mid,
        '--sr-glow-strength': String(0.45 + tierIndex * 0.07),
        '--sr-sheen': m.accent ? `${m.accent}55` : 'rgba(255, 255, 255, 0.22)',
    } as React.CSSProperties;

    // Details show while hovered or keyboard-focused, while a rank-up plays, or when pinned by a click.
    const showDetails = peek || open || celebrating;

    const details = (
        <div className="sr-details" aria-hidden={open ? undefined : true}>
            <span className="sr-plate">
                <span className="sr-face">
                    <span className="sr-sheen" />
                    <span className="sr-body">
                        <span className="sr-row">
                            <span className="sr-name">{rank.label}</span>
                            <span className="sr-days">
                                {rank.days}
                                <small>{rank.days === 1 ? 'day' : 'days'}</small>
                            </span>
                        </span>
                        <span className="sr-bar">
                            {Array.from({ length: segments }, (_, i) => (
                                <span key={i} className="sr-seg">
                                    <span style={{ transform: `scaleX(${segFill(i)})` }} />
                                </span>
                            ))}
                        </span>
                        <span className="sr-next" key={celebrating ? 'new' : 'next'}>
                            {celebrating ? (
                                <>New rank: <strong>{rank.label}</strong></>
                            ) : (
                                nextLine
                            )}
                        </span>
                    </span>
                </span>
            </span>
        </div>
    );

    return (
        <div
            ref={rootRef}
            className={`sr-root${celebrating ? ' sr-rankup' : ''}`}
            style={vars}
            onMouseEnter={() => setPeekSoon(true)}
            onMouseLeave={() => setPeekSoon(false)}
            onBlur={(e) => {
                // Focus leaving the badge and its flyout hides the details and closes the ladder.
                if (rootRef.current?.contains(e.relatedTarget as Node | null)) return;
                setPeek(false);
                if (open) close(false);
            }}
        >
            <button
                ref={buttonRef}
                type="button"
                className="sr-badge"
                aria-label={label}
                aria-expanded={open}
                aria-controls={open ? popId : undefined}
                aria-haspopup="dialog"
                onFocus={(e) => e.currentTarget.matches(':focus-visible') && setPeek(true)}
                onClick={() => (open ? close(false) : setOpen(true))}
            >
                <span className="sr-glow" aria-hidden="true" />
                <span className="sr-emblem" aria-hidden="true">
                    <StreakEmblem tier={tier.id} level={tierIndex} size={84} />
                </span>
                <span className="sr-burst" aria-hidden="true" />
                <span className="sr-burst" aria-hidden="true" />
            </button>

            <span className="sr-visually-hidden" aria-live="polite">
                {celebrating ? `Ranked up to ${rank.label}` : ''}
            </span>

            {showDetails && !open && <div className="sr-flyout">{details}</div>}

            {open && (
                <div ref={popRef} id={popId} role="dialog" aria-label="Study ranks" tabIndex={-1} className="sr-flyout sr-flyout-pinned">
                    {details}
                    <div className="sr-pop">
                        <h2>Study ranks</h2>
                        <p className="sr-pop-intro">
                            Study every day to climb. Miss a day and your streak starts over at Ember I.
                        </p>
                        <ol className="sr-ladder">
                            {STREAK_TIERS.map((t, i) => ({ t, i })).reverse().map(({ t, i }) => {
                                const tm = TIER_MATERIALS[t.id];
                                const state = i === tierIndex ? 'current' : i > tierIndex ? 'locked' : 'reached';
                                return (
                                    <li
                                        key={t.id}
                                        className={`sr-rung sr-rung-${state}`}
                                        style={{ '--rung-mid': tm.mid } as React.CSSProperties}
                                        aria-current={state === 'current' ? 'step' : undefined}
                                    >
                                        <StreakEmblem tier={t.id} level={i} size={26} className="sr-rung-icon" />
                                        <span className="sr-rung-name">{state === 'current' ? rank.label : t.name}</span>
                                        {state === 'current' ? (
                                            <span className="sr-rung-you">You</span>
                                        ) : (
                                            <span className="sr-rung-range">{tierRangeCopy(i)}</span>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                        <p className="sr-pop-foot">
                            Each tier has three divisions, I to III. Luminary is the top rank.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
