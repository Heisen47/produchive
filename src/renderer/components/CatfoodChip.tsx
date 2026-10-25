import React, { useEffect, useRef, useState } from 'react';
import { Fish, PawPrint, X } from 'lucide-react';
import { getCatHunger, startCatfoodEngine, useCatfoodStore } from '../lib/catfoodStore';
import { DAILY_CATFOOD_CAP, FEED_COST, localDateStr, petsByDate, STUDY_DAY_MIN_MINUTES, totalPets } from '../lib/catfood';

interface CatfoodChipProps {
    isCatEnabled: boolean;
}

const formatMinutes = (m: number) => {
    const mins = Math.round(m);
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
};

/** Footer chip showing the catfood balance, with a popover to feed the cat. */
export const CatfoodChip: React.FC<CatfoodChipProps> = ({ isCatEnabled }) => {
    const balance = useCatfoodStore((s) => s.balance);
    const today = useCatfoodStore((s) => s.today);
    const feed = useCatfoodStore((s) => s.feed);
    const ledger = useCatfoodStore((s) => s.ledger);
    const petsToday = petsByDate(ledger)[localDateStr(Date.now())] ?? 0;
    const petsAllTime = totalPets(ledger);
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => startCatfoodEngine(), []);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    // Feeding changes the balance, which re-renders this with the new hunger.
    const hunger = getCatHunger();
    const canFeed = isCatEnabled && balance >= FEED_COST;
    const earnedToday = today?.total ?? 0;

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-haspopup="dialog"
                title="Catfood: earned by focused work"
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-semibold transition-colors"
                style={{
                    color: '#fb923c',
                    background: 'rgba(251, 146, 60, 0.1)',
                    border: '1px solid rgba(251, 146, 60, 0.25)',
                }}
            >
                <Fish size={13} />
                <span className="tabular-nums">{balance}</span>
                <span className="sr-only">catfood</span>
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="Catfood"
                    className="absolute bottom-full right-0 mb-2 w-72 rounded-xl p-4 text-left z-50"
                    style={{
                        background: 'var(--bg-card-solid)',
                        border: '1px solid var(--border-card)',
                        boxShadow: 'var(--shadow-card, 0 12px 32px rgba(0,0,0,0.35))',
                        color: 'var(--text-secondary)',
                    }}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Catfood</div>
                            <div className="flex items-center gap-1.5 text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                                <Fish size={18} color="#fb923c" /> {balance}
                            </div>
                        </div>
                        <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-1 rounded-md opacity-60 hover:opacity-100">
                            <X size={14} />
                        </button>
                    </div>

                    <div className="mt-3 text-xs space-y-1.5">
                        <div className="flex justify-between">
                            <span>Earned today</span>
                            <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{earnedToday} / {DAILY_CATFOOD_CAP}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (earnedToday / DAILY_CATFOOD_CAP) * 100)}%`, background: '#fb923c' }} />
                        </div>
                        {today && (
                            <>
                                <div className="flex justify-between">
                                    <span>Quality focus time</span>
                                    <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatMinutes(today.qualityMinutes)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Study streak</span>
                                    <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>
                                        {today.streakDays} day{today.streakDays === 1 ? '' : 's'} · ×{today.streakMultiplier.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Focus purity</span>
                                    <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{Math.round(today.focusPurity * 100)}%</span>
                                </div>
                            </>
                        )}
                    </div>

                    <div
                        className="mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                        style={{ background: 'var(--bg-elevated)' }}
                        title="Times you tapped the cat"
                    >
                        <span className="flex items-center gap-1.5">
                            <PawPrint size={13} color="#f472b6" /> Times petted
                        </span>
                        <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>
                            <span className="font-semibold">{petsToday}</span> today · {petsAllTime} all-time
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (feed()) setOpen(false);
                        }}
                        disabled={!canFeed}
                        className="mt-4 w-full flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: '#ea580c' }}
                    >
                        <Fish size={15} /> Feed the cat · {FEED_COST}
                    </button>
                    <p className="mt-1.5 text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
                        {!isCatEnabled
                            ? 'Bring back the cat to feed it.'
                            : balance < FEED_COST
                                ? `${FEED_COST - balance} more to go${hunger === 'weak' || hunger === 'hungry' ? ', the cat is hungry' : ''}. Keep focusing!`
                                : hunger === 'full'
                                    ? 'Still full and happy, but always up for a snack.'
                                    : hunger === 'weak'
                                        ? 'The cat is weak from hunger. Please feed it!'
                                        : hunger === 'hungry'
                                            ? 'The cat is hungry and grumpy.'
                                            : 'The cat would love a snack.'}
                    </p>

                    <details className="mt-3 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        <summary className="cursor-pointer select-none" style={{ color: 'var(--text-secondary)' }}>How is catfood earned?</summary>
                        <ul className="mt-1.5 space-y-1 list-disc pl-4">
                            <li>Focused work counts: coding, writing, design, research and Focus Room sessions. Entertainment and idle time earn nothing.</li>
                            <li>Only windows used 5+ minutes and Focus Room sessions of 10+ minutes count; each window counts for at most 2h.</li>
                            <li>Returns diminish: the first hour is worth the most. Up to {DAILY_CATFOOD_CAP} a day.</li>
                            <li>Study {STUDY_DAY_MIN_MINUTES}+ min a day to build a streak: +5% per day, up to +50%.</li>
                            <li>Mixing in distractions lowers the reward. Finishing today's tasks adds a small bonus.</li>
                        </ul>
                    </details>
                </div>
            )}
        </div>
    );
};
