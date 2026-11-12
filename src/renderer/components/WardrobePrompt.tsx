import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Shirt, X } from 'lucide-react';
import { Wardrobe } from './Wardrobe';
import { Character } from './focus-room/Shared3D';
import { useCharacterLook, DEFAULT_LOOK, OUTFITS, HEADWEAR, ACCESSORIES, PETS, PATTERNS } from '../lib/characterLook';

/**
 * Ways into the wardrobe from the room flow, so people find out they can
 * dress up their character: a card with a live preview on the pickers, and a
 * button (with a one-time hint) in a room's top bar.
 */

const VIOLET = '#a78bfa';
const VIOLET_DEEP = '#8b5cf6';
const HINT_KEY = 'produchive_wardrobe_hint_seen';

type Base = { card: string; cardBorder: string; text: string; sub: string };

const isDefaultLook = (look: object) => JSON.stringify(look) === JSON.stringify(DEFAULT_LOOK);

/** How many things there are to try (everything except the "none" choices). */
const ITEM_COUNT: number = ([OUTFITS, HEADWEAR, ACCESSORIES, PETS, PATTERNS] as { id: string }[][])
    .reduce((n: number, xs: { id: string }[]) => n + xs.filter(x => x.id !== 'none').length, 0);
const TEASERS = ['🧢', '🎀', '👑', '🧣', '🐱'];

/** Aim the camera after mount (camera props alone are only read when the canvas is first created). */
const Aim = ({ position, target }: { position: [number, number, number]; target: [number, number, number] }): null => {
    const camera = useThree(s => s.camera);
    useLayoutEffect(() => {
        camera.position.set(...position);
        camera.lookAt(...target);
        camera.updateProjectionMatrix();
    }, [camera, position, target]);
    return null;
};

// The body sits from y 0.3 (the seat) to about 1.75 (top of the head).
const CAM_POS: [number, number, number] = [0.2, 1.25, 3.3];
const CAM_TARGET: [number, number, number] = [0.05, 1.18, 0];

/** Gentle sway so the character feels alive. */
const Sway = ({ children }: { children: React.ReactNode }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame(({ clock }) => {
        if (ref.current) ref.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.6) * 0.35;
    });
    return <group ref={ref}>{children}</group>;
};

/** Your character, drawn on a transparent canvas so it can stand on (and pop out of) the card. */
export const CharacterFigure = ({ style }: { style?: React.CSSProperties }) => {
    const look = useCharacterLook(s => s.saved);
    return (
        <div aria-hidden style={{ pointerEvents: 'none', ...style }}>
            <Canvas camera={{ position: CAM_POS, fov: 30 }} dpr={[1, 2]} gl={{ alpha: true }} style={{ width: '100%', height: '100%' }}>
                <Aim position={CAM_POS} target={CAM_TARGET} />
                <ambientLight intensity={1.15} />
                <directionalLight position={[3, 5, 4]} intensity={1.2} />
                <Sway>
                    <group position={[look.pet !== 'none' ? -0.2 : 0, 0, 0]}>
                        <Character occ={{ id: 'figure', name: 'You', isUser: true, elapsedSeconds: 0, seatIdx: 0, look }} position={[0, 0, 0]} accent={VIOLET} preview />
                    </group>
                </Sway>
            </Canvas>
        </div>
    );
};

const CARD_STYLES = `
.wc { display: grid; grid-template-columns: 128px minmax(0, 1fr) auto; align-items: center; column-gap: 20px; row-gap: 12px; }
.wc-cta { transition: transform .15s ease, box-shadow .15s ease; }
.wc-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(139,92,246,0.45) !important; }
.wc-cta:focus-visible { outline: 2px solid ${VIOLET}; outline-offset: 3px; }
@media (max-width: 600px) {
  .wc { grid-template-columns: 104px minmax(0, 1fr); }
  .wc-cta { grid-column: 1 / -1; justify-content: center; }
}
@media (prefers-reduced-motion: reduce) { .wc-cta, .wc-cta:hover { transition: none; transform: none; } }
`;

/** A card for room pickers: your character standing on it, a line about the wardrobe, and a button in. */
export const WardrobeCard = ({ base, isDark, style }: { base: Base; isDark: boolean; style?: React.CSSProperties }) => {
    const [open, setOpen] = useState(false);
    const look = useCharacterLook(s => s.saved);
    const fresh = isDefaultLook(look);
    const glow = isDark ? 'rgba(139,92,246,0.38)' : 'rgba(167,139,250,0.35)';
    return (
        <>
            <style>{CARD_STYLES}</style>
            <div className="wc" data-tour="wardrobe" style={{
                position: 'relative', padding: '16px 22px 16px 8px', minHeight: 112, borderRadius: 22, textAlign: 'left',
                background: `radial-gradient(240px 160px at 72px 100%, ${glow}, transparent 70%), ${base.card}`,
                border: `1px solid ${base.cardBorder}`, backdropFilter: 'blur(14px)',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
                boxSizing: 'border-box', ...style,
            }}>
                {/* The character stands on the card and pops out over its top edge */}
                <div style={{ position: 'relative', alignSelf: 'stretch', minHeight: 96 }}>
                    <span aria-hidden style={{
                        position: 'absolute', left: 18, right: 10, bottom: -6, height: 16, borderRadius: '50%',
                        background: `radial-gradient(closest-side, ${isDark ? 'rgba(167,139,250,0.55)' : 'rgba(139,92,246,0.35)'}, transparent)`,
                    }} />
                    <CharacterFigure style={{ position: 'absolute', left: 0, bottom: -3, width: 128, height: 168 }} />
                </div>

                <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: base.text, lineHeight: 1.25 }}>
                        {fresh ? 'Make it yours' : 'Looking good'}
                    </h3>
                    <p style={{ margin: '0 0 10px', fontSize: 12.5, lineHeight: 1.55, color: base.sub, maxWidth: 400 }}>
                        {fresh
                            ? 'Pick an outfit, a hat or a little companion before you sit down. Everyone in your room sees your look.'
                            : 'This is how others see you in rooms. Swap your outfit, hat or companion any time.'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }} aria-hidden>
                        {TEASERS.map(t => (
                            <span key={t} style={{
                                width: 28, height: 28, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                                background: isDark ? 'rgba(30,41,59,0.8)' : '#f7f3ec', border: `1px solid ${base.cardBorder}`,
                            }}>{t}</span>
                        ))}
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: VIOLET, marginLeft: 4 }}>{ITEM_COUNT}+ items, basics free</span>
                    </div>
                </div>

                <button
                    onClick={() => setOpen(true)}
                    className="wc-cta"
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 20px', borderRadius: 14,
                        border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, color: '#160b2e', whiteSpace: 'nowrap',
                        background: `linear-gradient(135deg, ${VIOLET}, ${VIOLET_DEEP})`, boxShadow: '0 4px 15px rgba(167,139,250,0.3)',
                    }}
                >
                    <Shirt size={16} aria-hidden="true" /> {fresh ? 'Dress up' : 'Change look'}
                </button>
            </div>
            {open && <Wardrobe onClose={() => setOpen(false)} />}
        </>
    );
};

/**
 * A wardrobe button for a room's top bar. The first time someone is in a
 * room it shows a small hint pointing at it.
 */
export const WardrobeButton = ({ base, isDark }: { base: Base; isDark: boolean }) => {
    const [open, setOpen] = useState(false);
    const [hint, setHint] = useState(false);

    useEffect(() => {
        let seen = true;
        try { seen = localStorage.getItem(HINT_KEY) === '1'; } catch { /* storage unavailable */ }
        if (seen) return;
        const t = setTimeout(() => setHint(true), 900);
        return () => clearTimeout(t);
    }, []);

    const dismiss = () => {
        setHint(false);
        try { localStorage.setItem(HINT_KEY, '1'); } catch { /* storage unavailable */ }
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => { dismiss(); setOpen(true); }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', background: 'rgba(167,139,250,0.15)', color: VIOLET, border: '1px solid rgba(167,139,250,0.3)',
                    boxShadow: hint ? '0 0 0 4px rgba(167,139,250,0.18)' : 'none', transition: 'box-shadow 0.3s',
                }}
            >
                <Shirt size={14} aria-hidden="true" /> Wardrobe
            </button>

            {hint && (
                <div role="status" className="wd-hint" style={{
                    position: 'absolute', top: 'calc(100% + 12px)', right: 0, zIndex: 60, width: 260, padding: 14, borderRadius: 14,
                    background: isDark ? '#141d38' : '#ffffff', border: '1px solid rgba(167,139,250,0.35)', color: base.text,
                    boxShadow: '0 16px 40px rgba(0,0,0,0.35)', textAlign: 'left',
                }}>
                    <span aria-hidden style={{
                        position: 'absolute', top: -6, right: 34, width: 10, height: 10, transform: 'rotate(45deg)',
                        background: isDark ? '#141d38' : '#ffffff', borderLeft: '1px solid rgba(167,139,250,0.35)', borderTop: '1px solid rgba(167,139,250,0.35)',
                    }} />
                    <button onClick={dismiss} aria-label="Dismiss tip" style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: base.sub, cursor: 'pointer', display: 'flex', padding: 4 }}>
                        <X size={14} />
                    </button>
                    <p style={{ margin: '0 18px 4px 0', fontSize: 13, fontWeight: 800 }}>You can dress up your character</p>
                    <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5, color: base.sub }}>
                        Outfits, hats and a little companion. Everyone here sees your look.
                    </p>
                    <button
                        onClick={() => { dismiss(); setOpen(true); }}
                        style={{
                            width: '100%', minHeight: 36, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800,
                            color: '#160b2e', background: `linear-gradient(135deg, ${VIOLET}, ${VIOLET_DEEP})`,
                        }}
                    >
                        Open wardrobe
                    </button>
                </div>
            )}

            {open && <Wardrobe onClose={() => setOpen(false)} />}
        </div>
    );
};
