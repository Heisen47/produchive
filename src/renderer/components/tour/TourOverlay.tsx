import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import catAnimation from '../../assets/cat.json';
import { useTour } from '../../lib/tour/tourStore';
import { nextAvailableIndex, placeCard, type Placement, type Rect } from '../../lib/tour/tourLogic';
import type { TourStep, TourView } from '../../lib/tour/tourManifest';
import './Tour.css';

/** How long to wait for a step's element to mount (page switch, lazy data) before giving up. */
const TARGET_TIMEOUT_MS = 2500;
const PAD = 8;
const CARD_WIDTH = 340;
const HERO_WIDTH = 400;
/** cat.json: Jogu pops up over frames 0-15 and ducks again near 62. We stop while he's up. */
const JOGU_UP_FRAME = 40;

/**
 * requestAnimationFrame stops while the window is hidden or minimised, which would leave a
 * step stuck "searching". Fall back to a timer there so the tour is ready when they return.
 */
const schedule = (cb: () => void): (() => void) => {
    if (document.hidden) {
        const t = window.setTimeout(cb, 120);
        return () => window.clearTimeout(t);
    }
    const f = requestAnimationFrame(cb);
    return () => cancelAnimationFrame(f);
};

const findTarget = (name: string): HTMLElement | null => {
    const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${CSS.escape(name)}"]`);
    for (const el of Array.from(nodes)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return el;
    }
    return null;
};

const sameRect = (a: Rect | null, b: Rect | null) =>
    !!a && !!b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
    && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;

const usePrefersReducedMotion = () => {
    const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        if (!mq) return;
        const onChange = () => setReduced(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return reduced;
};

interface TourOverlayProps {
    currentView: string;
}

/**
 * Spotlight tour. Dims the app, cuts a hole around one `data-tour` element at a time and
 * shows Jogu's card next to it. Mounted once in App; it renders nothing while no tour runs.
 */
export const TourOverlay: React.FC<TourOverlayProps> = ({ currentView }) => {
    const active = useTour((s) => s.active);
    const host = useTour((s) => s.host);
    const goTo = useTour((s) => s.goTo);
    const end = useTour((s) => s.end);
    const reducedMotion = usePrefersReducedMotion();

    // 'searching' while we wait for the element, then 'found' or 'missing' (centred card).
    const [status, setStatus] = useState<'searching' | 'found' | 'missing'>('searching');
    const [rect, setRect] = useState<Rect | null>(null);
    const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [cardSize, setCardSize] = useState({ width: CARD_WIDTH, height: 200 });
    const targetRef = useRef<HTMLElement | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const primaryRef = useRef<HTMLButtonElement>(null);
    const joguRef = useRef<LottieRefCurrentProps>(null);
    const directionRef = useRef<1 | -1>(1);
    const restoreFocusRef = useRef<HTMLElement | null>(null);
    const viewRef = useRef(currentView);
    viewRef.current = currentView;

    const steps = active?.tour.steps ?? [];
    const index = active?.index ?? 0;
    const step: TourStep | undefined = steps[index];
    const isLast = index >= steps.length - 1;

    // Remember what had focus before the tour, and give it back afterwards.
    useEffect(() => {
        if (!active) return;
        restoreFocusRef.current = document.activeElement as HTMLElement | null;
        return () => {
            restoreFocusRef.current?.focus?.();
            host?.setSidebarOpen(false);
        };
        // Only when a tour starts or ends.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!active]);

    const finish = useCallback(() => end('finished'), [end]);
    const skip = useCallback(() => {
        end('skipped');
        // Leaving early is fine; just say where to find it again.
        toast('Tour closed', { description: 'Replay it anytime from Help in the bottom bar.', duration: 5000 });
    }, [end]);

    const go = useCallback((direction: 1 | -1) => {
        if (!active) return;
        const next = nextAvailableIndex(steps, index, direction, () => true);
        if (next === -1) {
            if (direction === 1) finish();
            return;
        }
        directionRef.current = direction;
        goTo(next);
    }, [active, steps, index, goTo, finish]);

    // Resolve the current step: prepare the page, switch views, wait for the target.
    useEffect(() => {
        if (!active || !step) return;
        let cancelled = false;
        setStatus('searching');
        setRect(null);
        targetRef.current = null;
        // Toasts sit in the corners the tour points at; clear them so they don't cover a step.
        toast.dismiss();

        host?.setSidebarOpen(step.prep === 'openSidebar');
        if (step.prep === 'liveMonitor') {
            // Same handshake the Dashboard's "Live Monitor" links use.
            sessionStorage.setItem('analytics_initial_period', 'live');
        }
        if (step.view && step.view !== viewRef.current && !(step.view === 'routine' && viewRef.current === 'monitor')) {
            host?.navigate(step.view as TourView);
        }

        if (step.prep === 'liveMonitor') {
            // If Analytics was already open, tell it to switch tabs; a fresh mount reads the flag above.
            window.dispatchEvent(new CustomEvent('produchive_open_live_monitor'));
        }

        if (!step.target) {
            setStatus('missing');
            return;
        }

        const started = performance.now();
        let cancel = () => {};
        const poll = () => {
            if (cancelled) return;
            const el = findTarget(step.target!);
            if (el) {
                targetRef.current = el;
                el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
                setStatus('found');
                return;
            }
            if (performance.now() - started > TARGET_TIMEOUT_MS) {
                if (step.ifMissing === 'skip') {
                    const next = nextAvailableIndex(steps, index, directionRef.current, () => true);
                    if (next !== -1) goTo(next);
                    else if (directionRef.current === 1) finish();
                    else setStatus('missing');
                } else {
                    setStatus('missing');
                }
                return;
            }
            cancel = schedule(poll);
        };
        poll();
        return () => {
            cancelled = true;
            cancel();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active?.tour.id, index]);

    // Follow the target while it moves: page animations, sidebar slide, scroll, resize.
    useEffect(() => {
        if (status !== 'found') return;
        let cancel = () => {};
        let last: Rect | null = null;
        const track = () => {
            const el = targetRef.current;
            if (!el || !el.isConnected) {
                // The element was re-rendered away (e.g. view remount); find its replacement.
                const again = step?.target ? findTarget(step.target) : null;
                if (again) targetRef.current = again;
                else {
                    setStatus('missing');
                    return;
                }
            }
            const r = targetRef.current!.getBoundingClientRect();
            const next: Rect = { top: r.top, left: r.left, width: r.width, height: r.height };
            if (!sameRect(last, next)) {
                last = next;
                setRect(next);
            }
            cancel = schedule(track);
        };
        track();
        return () => cancel();
    }, [status, step?.target]);

    // Re-read the window size when a tour starts too: the window may have been resized
    // (or restored to its saved size) between mount and the first step.
    const tourOpen = !!active;
    useEffect(() => {
        if (!tourOpen) return;
        const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [tourOpen]);

    // Measure the card so placement can flip it when it doesn't fit.
    useLayoutEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const measure = () => {
            const r = el.getBoundingClientRect();
            setCardSize((prev) => (Math.abs(prev.height - r.height) > 0.5 || Math.abs(prev.width - r.width) > 0.5
                ? { width: r.width, height: r.height } : prev));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [active, index, status]);

    // Move focus into the card on each step so screen readers announce it and keys work.
    useEffect(() => {
        if (!active || status === 'searching') return;
        primaryRef.current?.focus({ preventScroll: true });
    }, [active, index, status]);

    // Keyboard: ←/→ move, Esc skips, Tab stays inside the card.
    useEffect(() => {
        if (!active) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                skip();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                go(1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                go(-1);
            } else if (e.key === 'Tab' && cardRef.current) {
                const focusables = Array.from(cardRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
                if (focusables.length === 0) return;
                const first = focusables[0];
                const lastEl = focusables[focusables.length - 1];
                if (!cardRef.current.contains(document.activeElement)) {
                    e.preventDefault();
                    first.focus();
                } else if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    lastEl.focus();
                } else if (!e.shiftKey && document.activeElement === lastEl) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [active, go, skip]);

    if (!active || !step) return null;

    const spotlight: Rect | null = status === 'found' && rect
        ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
        : null;

    let cardPos: { top: number; left: number; placement: Placement | 'center' };
    if (spotlight) {
        cardPos = placeCard(spotlight, cardSize, viewport, step.placement ?? 'bottom');
    } else {
        cardPos = {
            top: Math.max(12, viewport.height / 2 - cardSize.height / 2),
            left: Math.max(12, viewport.width / 2 - cardSize.width / 2),
            placement: 'center',
        };
    }

    // The opening card is an invitation, not a step: bigger, warmer, with a clear way out.
    const isHero = index === 0 && !step.target;
    const cardWidth = isHero ? HERO_WIDTH : CARD_WIDTH;
    const titleId = `tour-title-${step.id}`;
    const bodyId = `tour-body-${step.id}`;
    const total = steps.length;
    const hasBack = index > 0;

    return createPortal(
        <div
            className={`tour-root${reducedMotion ? ' tour-reduced' : ''}`}
            // Clicks on the dimmed page are swallowed so the tour can't be broken mid-step.
            onMouseDown={(e) => { if (!cardRef.current?.contains(e.target as Node)) e.preventDefault(); }}
        >
            <svg className="tour-scrim" width="100%" height="100%" aria-hidden="true">
                <defs>
                    <mask id="tour-cutout">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {spotlight && (
                            <rect
                                className="tour-hole"
                                x={spotlight.left}
                                y={spotlight.top}
                                width={spotlight.width}
                                height={spotlight.height}
                                rx="14"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect x="0" y="0" width="100%" height="100%" mask="url(#tour-cutout)" className={`tour-dim${spotlight ? '' : ' is-solo'}`} />
            </svg>

            {spotlight && (
                <div
                    className="tour-ring"
                    aria-hidden="true"
                    style={{ top: spotlight.top, left: spotlight.left, width: spotlight.width, height: spotlight.height }}
                />
            )}

            <div
                ref={cardRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={bodyId}
                className={`tour-card is-${cardPos.placement}${isHero ? ' is-hero' : ''}${status === 'searching' ? ' is-waiting' : ''}`}
                style={{ top: cardPos.top, left: cardPos.left, width: cardWidth }}
            >
                <button type="button" className="tour-close" onClick={isLast ? finish : skip} aria-label="Close tour" title="Close tour (Esc)">
                    <X size={15} aria-hidden="true" />
                </button>
                <div className="tour-jogu" aria-hidden="true">
                    {/* Keyed by step so Jogu pops up once per card, then stays put. */}
                    <Lottie
                        key={step.id}
                        lottieRef={joguRef}
                        animationData={catAnimation}
                        loop={false}
                        autoplay={!reducedMotion}
                        initialSegment={[0, JOGU_UP_FRAME]}
                        onDOMLoaded={() => { if (reducedMotion) joguRef.current?.goToAndStop(JOGU_UP_FRAME, true); }}
                    />
                </div>

                {!isHero && (
                    <>
                        <div className="tour-meta">
                            <span className="tour-eyebrow">{active.eyebrow ?? active.tour.title}</span>
                            <span className="tour-count" aria-label={`Step ${index + 1} of ${total}`}>
                                {index + 1} of {total}
                            </span>
                        </div>
                        <div className="tour-progress" aria-hidden="true">
                            {steps.map((s, i) => (
                                <span key={s.id} className={i < index ? 'is-done' : i === index ? 'is-current' : ''} />
                            ))}
                        </div>
                    </>
                )}

                <div aria-live="polite">
                    <h2 id={titleId} className="tour-title">{step.title}</h2>
                    <p id={bodyId} className="tour-body">{step.body}</p>
                </div>

                <div className="tour-actions">
                    {isHero || isLast ? <span /> : (
                        <button type="button" className="tour-skip" onClick={skip}>Skip tour</button>
                    )}
                    <div className="tour-nav">
                        {isHero && !isLast && (
                            <button type="button" className="tour-btn tour-btn-ghost" onClick={skip}>Not now</button>
                        )}
                        {hasBack && (
                            <button type="button" className="tour-btn tour-btn-ghost" onClick={() => go(-1)}>Back</button>
                        )}
                        <button
                            ref={primaryRef}
                            type="button"
                            className="tour-btn tour-btn-primary"
                            onClick={() => (isLast ? finish() : go(1))}
                        >
                            {isLast ? 'Done' : isHero ? 'Show me around' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
};
