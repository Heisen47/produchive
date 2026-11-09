import React, { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { Crown, Lock, X, RotateCcw, Loader2, Shuffle, User, Shirt, Sparkles, PawPrint, Plus, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from './ThemeProvider';
import { useStore } from '../lib/store';
import { openServerPage } from '../lib/urls';
import { Character, Occupant } from './focus-room/Shared3D';
import {
    CharacterLook, useCharacterLook, lockedChanges, withoutLockedChanges, isFreeChoice,
    GENDERS, SKIN_TONES, HAIR_STYLES, HAIR_PALETTE, OUTFITS, PATTERNS, HEADWEAR, STYLE_PALETTE, ACCESSORIES, PETS, PET_PALETTE,
} from '../lib/characterLook';

/**
 * Wardrobe: customize your character for focus rooms.
 * The basics are free (see isFreeChoice); premium items and custom colours
 * carry a lock for free members, who can try them on but need premium to save them.
 */

const VIOLET = '#a78bfa';
const VIOLET_DEEP = '#8b5cf6';
const GOLD = 'var(--premium-gold, #F5C451)';

/** A glyph for each item, so the grids read at a glance. */
const GLYPH: Record<string, string> = {
    classic: '👕', hoodie: '🧥', dress: '👗', kimono: '👘', overalls: '👖', cardigan: '🍂',
    sailor: '⚓', pinafore: '🎀', tutu: '🩰', puffer: '❄️', sweater: '🧶',
    beanie: '🧶', cap: '🧢', 'flower-crown': '🌸', 'cat-ears': '🐱', headphones: '🎧', 'witch-hat': '🔮', glasses: '👓',
    bow: '🎀', 'bunny-ears': '🐰', 'bear-ears': '🐻', beret: '🎨', crown: '👑', halo: '😇',
    'party-hat': '🥳', 'frog-hat': '🐸', 'star-clips': '⭐',
    scarf: '🧣', 'bow-tie': '👔', necklace: '💎', backpack: '🎒', wings: '🧚', balloon: '🎈', cape: '🦸',
    cat: '🐱', bunny: '🐰', chick: '🐥', frog: '🐸', puppy: '🐶', panda: '🐼',
};

type TabId = 'body' | 'outfit' | 'extras' | 'companion';
const TABS: { id: TabId; label: string; icon: React.ReactNode; fields: (keyof CharacterLook)[] }[] = [
    { id: 'body', label: 'Body', icon: <User size={15} />, fields: ['gender', 'skin', 'hair', 'hairColor'] },
    { id: 'outfit', label: 'Outfit', icon: <Shirt size={15} />, fields: ['outfit', 'outfitColor', 'pattern', 'patternColor'] },
    { id: 'extras', label: 'Hats & extras', icon: <Sparkles size={15} />, fields: ['headwear', 'headwearColor', 'accessory', 'accessoryColor'] },
    { id: 'companion', label: 'Companion', icon: <PawPrint size={15} />, fields: ['pet', 'petColor'] },
];

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

/** Scoped styles: hover, focus rings and the narrow layout. */
const STYLES = `
.wd { --wd-violet: ${VIOLET}; }
.wd button { font-family: inherit; }
.wd button:focus-visible, .wd input:focus-visible + .wd-custom { outline: 2px solid var(--wd-violet); outline-offset: 2px; }
.wd-tile { transition: transform .15s ease, border-color .15s ease, background .15s ease; }
.wd-tile:hover { transform: translateY(-2px); border-color: var(--wd-hover); }
.wd-tile[aria-pressed="true"]:hover { border-color: var(--wd-violet); }
.wd-pill:hover { border-color: var(--wd-hover); }
.wd-swatch { transition: transform .12s ease; }
.wd-swatch:hover { transform: scale(1.1); }
.wd-tab:hover { color: var(--wd-text); }
.wd-body { display: grid; grid-template-columns: minmax(280px, 40%) 1fr; min-height: 0; flex: 1; }
.wd-stage { position: relative; min-height: 0; }
@media (max-width: 760px) {
  .wd-body { grid-template-columns: 1fr; grid-template-rows: 300px 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .wd-tile, .wd-swatch { transition: none; }
  .wd-tile:hover, .wd-swatch:hover { transform: none; }
}
`;

type Ui = { panel: string; border: string; hover: string; text: string; sub: string; tile: string; tileOn: string; isDark: boolean };

const Section = ({ ui, title, premium, children }: { ui: Ui; title: string; premium?: boolean; children: React.ReactNode }) => (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: ui.text, display: 'flex', alignItems: 'center', gap: 8 }}>
            {title}
            {premium && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, color: '#1c1404', background: GOLD }}>
                    <Crown size={10} aria-hidden="true" /> Premium
                </span>
            )}
        </h3>
        {children}
    </section>
);

/** Text options in a row (gender, hairstyle). */
const Pills = <T extends string>({ ui, items, value, onPick }: { ui: Ui; items: { id: T; label: string }[]; value: T; onPick: (v: T) => void }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.map(it => {
            const on = it.id === value;
            return (
                <button key={it.id} className="wd-pill" aria-pressed={on} onClick={() => onPick(it.id)} style={{
                    minHeight: 36, padding: '0 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    color: on ? ui.text : ui.sub, background: on ? ui.tileOn : ui.tile,
                    border: `1px solid ${on ? VIOLET : ui.border}`,
                }}>
                    {it.label}
                </button>
            );
        })}
    </div>
);

/** Picture options in a grid (outfits, hats, extras, companions, patterns). */
const Tiles = <T extends string>({ ui, items, value, onPick, locked, art }: {
    ui: Ui; items: { id: T; label: string }[]; value: T; onPick: (v: T) => void;
    locked: (id: T) => boolean; art: (id: T) => React.ReactNode;
}) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 10 }}>
        {items.map(it => {
            const on = it.id === value;
            return (
                <button key={it.id} className="wd-tile" aria-pressed={on} onClick={() => onPick(it.id)} style={{
                    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                    minHeight: 86, padding: '12px 6px 10px', borderRadius: 16, cursor: 'pointer',
                    background: on ? ui.tileOn : ui.tile, border: `${on ? 2 : 1}px solid ${on ? VIOLET : ui.border}`,
                    boxShadow: on ? '0 6px 18px rgba(139,92,246,0.25)' : 'none',
                }}>
                    <span aria-hidden style={{ height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, lineHeight: 1 }}>{art(it.id)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: on ? ui.text : ui.sub, textAlign: 'center', lineHeight: 1.2 }}>{it.label}</span>
                    {locked(it.id) && (
                        <span title="Premium" style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: GOLD, color: '#1c1404' }}>
                            <Lock size={10} aria-label="Premium" />
                        </span>
                    )}
                </button>
            );
        })}
    </div>
);

const Swatches = ({ ui, value, colors, onPick, label, customLocked }: { ui: Ui; value: string; colors: string[]; onPick: (c: string) => void; label: string; customLocked: boolean }) => {
    const custom = !colors.includes(value);
    const ring = (on: boolean) => on ? `0 0 0 2px ${ui.panel}, 0 0 0 4px ${VIOLET}` : `inset 0 0 0 1px ${ui.border}`;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }} role="group" aria-label={label}>
            {colors.map(c => (
                <button key={c} className="wd-swatch" onClick={() => onPick(c)} aria-label={`${label} ${c}`} aria-pressed={value === c}
                    style={{ width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', background: c, padding: 0, border: 'none', boxShadow: ring(value === c) }} />
            ))}
            <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: ui.sub }}>
                <input type="color" value={value} onChange={e => onPick(e.target.value)} aria-label={`Custom ${label.toLowerCase()}`}
                    style={{ position: 'absolute', opacity: 0, width: 28, height: 28, left: 0, top: 0, cursor: 'pointer' }} />
                <span className="wd-custom wd-swatch" style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: custom ? value : 'conic-gradient(#f87171, #fbbf24, #a3e635, #34d399, #60a5fa, #a78bfa, #f472b6, #f87171)',
                    boxShadow: ring(custom),
                }}>
                    {!custom && <Plus size={14} color="#fff" strokeWidth={3} style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }} />}
                </span>
                Custom
                {customLocked && <Lock size={11} aria-label="Premium" />}
            </label>
        </div>
    );
};

/** A small fabric swatch showing the pattern in the current colours. */
const PatternChip = ({ pattern, base, ink }: { pattern: CharacterLook['pattern']; base: string; ink: string }) => {
    const bg: Record<CharacterLook['pattern'], string> = {
        none: base,
        stripes: `repeating-linear-gradient(0deg, ${ink} 0 4px, ${base} 4px 10px)`,
        dots: `radial-gradient(circle, ${ink} 2.6px, transparent 3.2px) 0 0 / 11px 11px, ${base}`,
        checks: `linear-gradient(90deg, ${ink}88 50%, transparent 50%) 0 0 / 12px 12px, linear-gradient(${ink}88 50%, transparent 50%) 0 0 / 12px 12px, ${base}`,
        stars: base,
        hearts: base,
        flowers: base,
    };
    return (
        <span style={{ width: 36, height: 30, borderRadius: 8, background: bg[pattern], boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ink, fontSize: 10, letterSpacing: 1, overflow: 'hidden' }}>
            {pattern === 'stars' ? '★ ★' : pattern === 'hearts' ? '♥ ♥' : pattern === 'flowers' ? '✿ ✿' : null}
        </span>
    );
};

/** For free members: what's free and what the lock means. */
const FreeNote = ({ ui }: { ui: Ui }) => (
    <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, lineHeight: 1.45, color: ui.sub, padding: '10px 12px', borderRadius: 12, background: ui.tile, border: `1px solid ${ui.border}` }}>
        <span style={{ width: 18, height: 18, flexShrink: 0, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: GOLD, color: '#1c1404' }}>
            <Lock size={10} aria-hidden="true" />
        </span>
        Items without a lock and the colour swatches are free. Locked items need Premium, but you can try them on.
    </p>
);

const None = ({ ui }: { ui: Ui }) => <Ban size={24} color={ui.sub} strokeWidth={1.75} />;

export const Wardrobe = ({ onClose }: { onClose: () => void }) => {
    const { isDark } = useTheme();
    const isPremium = useStore(s => s.isPremium);
    const saved = useCharacterLook(s => s.saved);
    const save = useCharacterLook(s => s.save);
    const [draft, setDraft] = useState<CharacterLook>(saved);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<TabId>('body');

    useEffect(() => setDraft(saved), [saved]);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const locked = useMemo(() => (isPremium ? [] : lockedChanges(draft, saved)), [isPremium, draft, saved]);
    const changed = JSON.stringify(draft) !== JSON.stringify(saved);
    const set = <K extends keyof CharacterLook>(key: K, value: CharacterLook[K]) => setDraft(d => ({ ...d, [key]: value }));
    /** Show a lock on items a free member can't keep. */
    const lockFor = (field: keyof CharacterLook) => <T extends string>(id: T) => !isPremium && !isFreeChoice(field, id);

    const ui: Ui = isDark
        ? { panel: '#0f1629', border: 'rgba(255,255,255,0.08)', hover: 'rgba(167,139,250,0.45)', text: '#f1f5f9', sub: '#94a3b8', tile: 'rgba(30,41,59,0.55)', tileOn: 'rgba(139,92,246,0.16)', isDark }
        : { panel: '#ffffff', border: 'rgba(0,0,0,0.09)', hover: 'rgba(139,92,246,0.45)', text: '#0f172a', sub: '#64748b', tile: '#f7f3ec', tileOn: 'rgba(167,139,250,0.16)', isDark };

    const surprise = () => setDraft(d => ({
        ...d,
        hair: pick(HAIR_STYLES).id, hairColor: pick(HAIR_PALETTE),
        outfit: pick(OUTFITS).id, outfitColor: pick(STYLE_PALETTE),
        pattern: pick(PATTERNS).id, patternColor: pick(STYLE_PALETTE),
        headwear: pick(HEADWEAR).id, headwearColor: pick(STYLE_PALETTE),
        accessory: pick(ACCESSORIES).id, accessoryColor: pick(STYLE_PALETTE),
        pet: pick(PETS).id, petColor: pick(PET_PALETTE),
    }));

    const handleSave = async () => {
        setSaving(true);
        try {
            await save(draft);
            toast.success('Look saved. Others see it in shared rooms.');
        } catch (err: any) {
            const code = err?.code || err?.response?.data?.code;
            toast.error(code === 'premium_required'
                ? 'Outfits, patterns, headwear, accessories, companions and custom colours are part of Premium.'
                : `Could not save: ${err?.response?.data?.error || err?.message || 'unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    const preview: Occupant = { id: 'preview', name: 'You', isUser: true, elapsedSeconds: 0, seatIdx: 0, look: draft };

    return (
        <div
            role="dialog" aria-modal="true" aria-label="Wardrobe" onClick={onClose} className="wd"
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, ['--wd-hover' as any]: ui.hover, ['--wd-text' as any]: ui.text }}
        >
            <style>{STYLES}</style>
            <div
                onClick={e => e.stopPropagation()}
                style={{ width: 'min(1040px, 100%)', height: 'min(720px, 94vh)', display: 'flex', flexDirection: 'column', background: ui.panel, color: ui.text, borderRadius: 24, border: `1px solid ${ui.border}`, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.45)' }}
            >
                <div className="wd-body">
                    {/* Stage */}
                    <div className="wd-stage" style={{
                        background: isDark
                            ? 'radial-gradient(80% 60% at 50% 38%, rgba(139,92,246,0.32), transparent 70%), linear-gradient(180deg, #141d38 0%, #0a0e1a 100%)'
                            : 'radial-gradient(80% 60% at 50% 38%, rgba(167,139,250,0.32), transparent 70%), linear-gradient(180deg, #f5f0e8 0%, #e5dfd5 100%)',
                    }}>
                        <div style={{ position: 'absolute', top: 20, left: 22, right: 22, zIndex: 1, pointerEvents: 'none' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(109,40,217,0.14)', border: '1px solid rgba(167,139,250,0.3)', fontSize: 11, fontWeight: 800, color: VIOLET }}>
                                <Shirt size={11} aria-hidden="true" /> Wardrobe
                            </span>
                            <h2 style={{ margin: '10px 0 2px', fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>Dress up your character</h2>
                            <p style={{ margin: 0, fontSize: 12.5, color: ui.sub, lineHeight: 1.5, maxWidth: 300 }}>Everyone in your room sees this look.</p>
                        </div>

                        <Canvas camera={{ position: [0.3, 1.2, 6.2], fov: 30 }} dpr={[1, 2]} style={{ position: 'absolute', inset: 0 }}>
                            <ambientLight intensity={1.1} />
                            <directionalLight position={[3, 5, 4]} intensity={1.2} />
                            <group position={[0, -0.15, 0]}>
                                <Character occ={preview} position={[0, 0, 0]} rotation={0} accent={VIOLET} preview />
                                <mesh position={[0.15, -0.03, 0.05]}>
                                    <cylinderGeometry args={[0.95, 1.0, 0.06, 48]} />
                                    <meshToonMaterial color={isDark ? '#2e2a5e' : '#ddd3f3'} />
                                </mesh>
                            </group>
                            <ContactShadows position={[0, -0.17, 0]} opacity={0.4} scale={4} blur={2.5} far={2} />
                            <OrbitControls target={[0.1, 0.7, 0]} enablePan={false} minDistance={3} maxDistance={8} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.9} />
                        </Canvas>

                        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: ui.sub, flex: 1 }}>Drag to turn</span>
                            <button onClick={surprise} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36, padding: '0 14px', borderRadius: 999, cursor: 'pointer',
                                fontSize: 12, fontWeight: 700, color: ui.text, background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)',
                                border: `1px solid ${ui.border}`, backdropFilter: 'blur(8px)',
                            }}>
                                <Shuffle size={13} aria-hidden="true" /> Surprise me
                            </button>
                        </div>
                    </div>

                    {/* Options */}
                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 14px 0 20px' }}>
                            <div role="tablist" aria-label="Wardrobe sections" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 14, background: ui.tile, border: `1px solid ${ui.border}`, flex: 1, overflowX: 'auto' }}>
                                {TABS.map(t => {
                                    const on = tab === t.id;
                                    const tryingOn = locked.some(f => t.fields.includes(f as keyof CharacterLook));
                                    return (
                                        <button key={t.id} role="tab" aria-selected={on} className="wd-tab" onClick={() => setTab(t.id)} style={{
                                            position: 'relative', flex: '1 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            minHeight: 36, padding: '0 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                                            color: on ? '#160b2e' : ui.sub,
                                            background: on ? `linear-gradient(135deg, ${VIOLET}, ${VIOLET_DEEP})` : 'transparent',
                                        }}>
                                            {t.icon} {t.label}
                                            {tryingOn && <span title="Trying on Premium items" style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD }} />}
                                        </button>
                                    );
                                })}
                            </div>
                            <button onClick={onClose} aria-label="Close wardrobe" style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 12, border: `1px solid ${ui.border}`, background: 'transparent', color: ui.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={18} />
                            </button>
                        </div>

                        <div role="tabpanel" className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 26 }}>
                            {tab === 'body' && (<>
                                <Section ui={ui} title="Gender">
                                    <Pills ui={ui} items={GENDERS} value={draft.gender} onPick={v => set('gender', v)} />
                                </Section>
                                <Section ui={ui} title="Skin tone">
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        {SKIN_TONES.map(t => (
                                            <button key={t.id} className="wd-swatch" onClick={() => set('skin', t.id)} aria-label={t.label} aria-pressed={draft.skin === t.id}
                                                style={{ width: 36, height: 36, borderRadius: '50%', background: t.color, cursor: 'pointer', padding: 0, border: 'none', boxShadow: draft.skin === t.id ? `0 0 0 2px ${ui.panel}, 0 0 0 4px ${VIOLET}` : `inset 0 0 0 1px ${ui.border}` }} />
                                        ))}
                                    </div>
                                </Section>
                                <Section ui={ui} title="Hair">
                                    <Pills ui={ui} items={HAIR_STYLES} value={draft.hair} onPick={v => set('hair', v)} />
                                    <Swatches ui={ui} value={draft.hairColor} colors={HAIR_PALETTE} onPick={c => set('hairColor', c)} label="Hair colour" customLocked={!isPremium} />
                                </Section>
                            </>)}

                            {tab === 'outfit' && (<>
                                {!isPremium && <FreeNote ui={ui} />}
                                <Section ui={ui} title="Outfit">
                                    <Tiles ui={ui} items={OUTFITS} value={draft.outfit} onPick={v => set('outfit', v)}
                                        locked={lockFor('outfit')} art={id => GLYPH[id]} />
                                    <Swatches ui={ui} value={draft.outfitColor} colors={STYLE_PALETTE} onPick={c => set('outfitColor', c)} label="Outfit colour" customLocked={!isPremium} />
                                </Section>
                                <Section ui={ui} title="Pattern" premium>
                                    <Tiles ui={ui} items={PATTERNS} value={draft.pattern} onPick={v => set('pattern', v)} locked={lockFor('pattern')}
                                        art={id => <PatternChip pattern={id} base={draft.outfitColor} ink={draft.patternColor} />} />
                                    {draft.pattern !== 'none' && (
                                        <Swatches ui={ui} value={draft.patternColor} colors={STYLE_PALETTE} onPick={c => set('patternColor', c)} label="Pattern colour" customLocked={!isPremium} />
                                    )}
                                </Section>
                            </>)}

                            {tab === 'extras' && (<>
                                {!isPremium && <FreeNote ui={ui} />}
                                <Section ui={ui} title="Headwear">
                                    <Tiles ui={ui} items={HEADWEAR} value={draft.headwear} onPick={v => set('headwear', v)} locked={lockFor('headwear')}
                                        art={id => id === 'none' ? <None ui={ui} /> : GLYPH[id]} />
                                    {draft.headwear !== 'none' && (
                                        <Swatches ui={ui} value={draft.headwearColor} colors={STYLE_PALETTE} onPick={c => set('headwearColor', c)} label="Headwear colour" customLocked={!isPremium} />
                                    )}
                                </Section>
                                <Section ui={ui} title="Accessory">
                                    <Tiles ui={ui} items={ACCESSORIES} value={draft.accessory} onPick={v => set('accessory', v)} locked={lockFor('accessory')}
                                        art={id => id === 'none' ? <None ui={ui} /> : GLYPH[id]} />
                                    {draft.accessory !== 'none' && (
                                        <Swatches ui={ui} value={draft.accessoryColor} colors={STYLE_PALETTE} onPick={c => set('accessoryColor', c)} label="Accessory colour" customLocked={!isPremium} />
                                    )}
                                </Section>
                            </>)}

                            {tab === 'companion' && (
                                <Section ui={ui} title="Companion" premium>
                                    <p style={{ margin: '-4px 0 0', fontSize: 12.5, color: ui.sub, lineHeight: 1.5 }}>A little friend who sits beside you while you study.</p>
                                    <Tiles ui={ui} items={PETS} value={draft.pet} onPick={v => set('pet', v)} locked={lockFor('pet')}
                                        art={id => id === 'none' ? <None ui={ui} /> : GLYPH[id]} />
                                    {draft.pet !== 'none' && (
                                        <Swatches ui={ui} value={draft.petColor} colors={PET_PALETTE} onPick={c => set('petColor', c)} label="Companion colour" customLocked={!isPremium} />
                                    )}
                                </Section>
                            )}
                        </div>

                        <footer style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '14px 20px', borderTop: `1px solid ${ui.border}` }}>
                            {locked.length > 0 ? (
                                <>
                                    <span style={{ flex: '1 1 220px', fontSize: 12.5, color: ui.text, display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.45 }}>
                                        <Crown size={16} style={{ color: GOLD, flexShrink: 0 }} aria-hidden="true" />
                                        You're trying on Premium items. Get Premium to keep them, or remove them to save the rest.
                                    </span>
                                    <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                                    <button onClick={() => setDraft(d => withoutLockedChanges(d, saved))}
                                        style={{ minHeight: 42, padding: '0 16px', borderRadius: 12, border: `1px solid ${ui.border}`, background: 'transparent', color: ui.text, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                                        Remove them
                                    </button>
                                    <button onClick={() => openServerPage('/premium')}
                                        style={{ minHeight: 42, padding: '0 18px', borderRadius: 12, border: 'none', background: GOLD, color: '#1c1404', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Crown size={15} aria-hidden="true" /> Get Premium
                                    </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <span style={{ flex: 1 }} />
                                    <button onClick={() => setDraft(saved)} disabled={!changed}
                                        style={{ minHeight: 42, padding: '0 16px', borderRadius: 12, border: `1px solid ${ui.border}`, background: 'transparent', color: changed ? ui.text : ui.sub, fontWeight: 700, fontSize: 13, cursor: changed ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, opacity: changed ? 1 : 0.6 }}>
                                        <RotateCcw size={14} aria-hidden="true" /> Undo changes
                                    </button>
                                    <button onClick={handleSave} disabled={!changed || saving}
                                        style={{
                                            minHeight: 42, padding: '0 22px', borderRadius: 12, border: 'none', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                                            cursor: changed && !saving ? 'pointer' : 'not-allowed',
                                            background: changed ? `linear-gradient(135deg, ${VIOLET}, ${VIOLET_DEEP})` : ui.tile,
                                            color: changed ? '#160b2e' : ui.sub,
                                            boxShadow: changed ? '0 4px 15px rgba(167,139,250,0.3)' : 'none',
                                        }}>
                                        {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                                        Save look
                                    </button>
                                </>
                            )}
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
};
