import React, { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { Crown, Lock, X, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from './ThemeProvider';
import { useStore } from '../lib/store';
import { openServerPage } from '../lib/urls';
import { Character, Occupant } from './focus-room/Shared3D';
import {
    CharacterLook, useCharacterLook, lockedChanges, withoutLockedChanges,
    SKIN_TONES, HAIR_STYLES, HAIR_PALETTE, OUTFITS, PATTERNS, HEADWEAR, STYLE_PALETTE,
} from '../lib/characterLook';

const GOLD = 'var(--premium-gold, #F5C451)';

type Ui = { bg: string; panel: string; border: string; text: string; sub: string; chip: string; isDark: boolean };

const Section = ({ ui, title, premium, children }: { ui: Ui; title: string; premium?: boolean; children: React.ReactNode }) => (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: ui.sub, display: 'flex', alignItems: 'center', gap: 6 }}>
            {title}
            {premium && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 999, color: '#1c1404', background: GOLD }}>
                    <Crown size={10} aria-hidden="true" /> Premium
                </span>
            )}
        </h3>
        {children}
    </section>
);

const Chip = ({ ui, label, active, onClick, lockedItem }: { ui: Ui; label: string; active: boolean; onClick: () => void; lockedItem?: boolean }) => (
    <button
        onClick={onClick}
        aria-pressed={active}
        style={{
            minHeight: 36, padding: '6px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: active ? (ui.isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.12)') : ui.chip,
            color: ui.text,
            border: `1px solid ${active ? '#3b82f6' : ui.border}`,
        }}
    >
        {lockedItem && <Lock size={12} aria-label="Premium" style={{ color: ui.sub }} />}
        {label}
    </button>
);

const Swatches = ({ ui, value, colors, onPick, label, customLocked }: { ui: Ui; value: string; colors: string[]; onPick: (c: string) => void; label: string; customLocked: boolean }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {colors.map(c => (
            <button
                key={c}
                onClick={() => onPick(c)}
                aria-label={`${label} ${c}`}
                aria-pressed={value === c}
                style={{
                    width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', background: c, padding: 0,
                    border: value === c ? '3px solid #3b82f6' : `2px solid ${ui.border}`,
                    boxShadow: value === c ? `0 0 0 2px ${ui.panel} inset` : 'none',
                }}
            />
        ))}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: ui.sub, cursor: 'pointer' }}>
            <input
                type="color"
                value={value}
                onChange={e => onPick(e.target.value)}
                aria-label={`Custom ${label.toLowerCase()}`}
                style={{ width: 34, height: 30, padding: 0, border: `1px solid ${ui.border}`, borderRadius: 8, background: 'transparent', cursor: 'pointer' }}
            />
            Custom
            {customLocked && <Lock size={12} aria-label="Premium" />}
        </label>
    </div>
);

/**
 * Wardrobe: customize your character for focus rooms.
 * Skin tone, hairstyle and palette hair colours are free. Outfits, patterns,
 * headwear and custom colours are premium; free members can try them on in
 * the preview but need premium to save them.
 */
export const Wardrobe = ({ onClose }: { onClose: () => void }) => {
    const { isDark } = useTheme();
    const isPremium = useStore(s => s.isPremium);
    const saved = useCharacterLook(s => s.saved);
    const save = useCharacterLook(s => s.save);
    const [draft, setDraft] = useState<CharacterLook>(saved);
    const [saving, setSaving] = useState(false);

    useEffect(() => setDraft(saved), [saved]);

    const locked = useMemo(() => (isPremium ? [] : lockedChanges(draft, saved)), [isPremium, draft, saved]);
    const changed = JSON.stringify(draft) !== JSON.stringify(saved);

    const set = <K extends keyof CharacterLook>(key: K, value: CharacterLook[K]) => setDraft(d => ({ ...d, [key]: value }));

    const base: Ui = isDark
        ? { bg: '#0b1020', panel: '#0f1629', border: 'rgba(148,163,184,0.16)', text: '#f1f5f9', sub: '#94a3b8', chip: 'rgba(30,41,59,0.6)', isDark }
        : { bg: '#f5f0e8', panel: '#ffffff', border: 'rgba(120,113,108,0.25)', text: '#1c1917', sub: '#57534e', chip: '#f5f5f4', isDark };

    const handleSave = async () => {
        setSaving(true);
        try {
            await save(draft);
            toast.success('Your character is saved. Others see it in shared rooms.');
        } catch (err: any) {
            const code = err?.code || err?.response?.data?.code;
            toast.error(code === 'premium_required'
                ? 'Outfits, patterns, headwear and custom colours are part of Premium.'
                : `Could not save: ${err?.response?.data?.error || err?.message || 'unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    const preview: Occupant = { id: 'preview', name: 'You', isUser: true, elapsedSeconds: 0, seatIdx: 0, look: draft };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Wardrobe"
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{ width: 'min(980px, 100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: base.panel, color: base.text, borderRadius: 20, border: `1px solid ${base.border}`, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.45)' }}
            >
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${base.border}` }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Wardrobe</h2>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: base.sub }}>How you look in focus rooms. Friends and strangers see it in shared rooms.</p>
                    </div>
                    <button onClick={onClose} aria-label="Close wardrobe" style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${base.border}`, background: 'transparent', color: base.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={18} />
                    </button>
                </header>

                <div style={{ display: 'flex', flexWrap: 'wrap', minHeight: 0, flex: 1, overflow: 'auto' }}>
                    <div style={{ flex: '1 1 300px', minHeight: 360, background: base.bg, position: 'relative' }}>
                        <Canvas camera={{ position: [0, 1.5, 3.4], fov: 35 }} style={{ position: 'absolute', inset: 0 }}>
                            <ambientLight intensity={1.1} />
                            <directionalLight position={[3, 5, 4]} intensity={1.2} />
                            <group position={[0, -0.05, 0]}>
                                <Character occ={preview} position={[0, 0, 0]} rotation={0} accent="#3b82f6" />
                                <mesh position={[0, -0.03, 0]}>
                                    <cylinderGeometry args={[0.7, 0.75, 0.06, 40]} />
                                    <meshToonMaterial color={isDark ? '#1e293b' : '#e7e0d5'} />
                                </mesh>
                            </group>
                            <ContactShadows position={[0, -0.07, 0]} opacity={0.4} scale={4} blur={2.5} far={2} />
                            <OrbitControls target={[0, 1.05, 0]} enablePan={false} minDistance={2.2} maxDistance={5} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.9} />
                        </Canvas>
                        <span style={{ position: 'absolute', left: 12, bottom: 10, fontSize: 11, color: base.sub }}>Drag to turn</span>
                    </div>

                    <div style={{ flex: '999 1 420px', minWidth: 0, padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <Section ui={base} title="Skin tone">
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {SKIN_TONES.map(t => (
                                    <button key={t.id} onClick={() => set('skin', t.id)} aria-label={t.label} aria-pressed={draft.skin === t.id}
                                        style={{ width: 34, height: 34, borderRadius: '50%', background: t.color, cursor: 'pointer', padding: 0, border: draft.skin === t.id ? '3px solid #3b82f6' : `2px solid ${base.border}` }} />
                                ))}
                            </div>
                        </Section>

                        <Section ui={base} title="Hair">
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {HAIR_STYLES.map(h => <Chip ui={base} key={h.id} label={h.label} active={draft.hair === h.id} onClick={() => set('hair', h.id)} />)}
                            </div>
                            <Swatches ui={base} value={draft.hairColor} colors={HAIR_PALETTE} onPick={c => set('hairColor', c)} label="Hair colour" customLocked={!isPremium} />
                        </Section>

                        <Section ui={base} title="Outfit" premium>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {OUTFITS.map(o => <Chip ui={base} key={o.id} label={o.label} active={draft.outfit === o.id} lockedItem={!isPremium && o.premium} onClick={() => set('outfit', o.id)} />)}
                            </div>
                            <Swatches ui={base} value={draft.outfitColor} colors={STYLE_PALETTE} onPick={c => set('outfitColor', c)} label="Outfit colour" customLocked={!isPremium} />
                        </Section>

                        <Section ui={base} title="Pattern" premium>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {PATTERNS.map(p => <Chip ui={base} key={p.id} label={p.label} active={draft.pattern === p.id} lockedItem={!isPremium && p.id !== 'none'} onClick={() => set('pattern', p.id)} />)}
                            </div>
                            {draft.pattern !== 'none' && (
                                <Swatches ui={base} value={draft.patternColor} colors={STYLE_PALETTE} onPick={c => set('patternColor', c)} label="Pattern colour" customLocked={!isPremium} />
                            )}
                        </Section>

                        <Section ui={base} title="Headwear" premium>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {HEADWEAR.map(h => <Chip ui={base} key={h.id} label={h.label} active={draft.headwear === h.id} lockedItem={!isPremium && h.id !== 'none'} onClick={() => set('headwear', h.id)} />)}
                            </div>
                            {draft.headwear !== 'none' && (
                                <Swatches ui={base} value={draft.headwearColor} colors={STYLE_PALETTE} onPick={c => set('headwearColor', c)} label="Headwear colour" customLocked={!isPremium} />
                            )}
                        </Section>
                    </div>
                </div>

                <footer style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '14px 20px', borderTop: `1px solid ${base.border}` }}>
                    {locked.length > 0 ? (
                        <>
                            <span style={{ flex: '1 1 260px', fontSize: 13, color: base.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Crown size={16} style={{ color: GOLD, flexShrink: 0 }} aria-hidden="true" />
                                You're trying on Premium items. Get Premium to keep them, or remove them to save the rest.
                            </span>
                            <button onClick={() => setDraft(d => withoutLockedChanges(d, saved))}
                                style={{ height: 44, padding: '0 16px', borderRadius: 10, border: `1px solid ${base.border}`, background: 'transparent', color: base.text, fontWeight: 700, cursor: 'pointer' }}>
                                Remove Premium items
                            </button>
                            <button onClick={() => openServerPage('/premium')}
                                style={{ height: 44, padding: '0 18px', borderRadius: 10, border: 'none', background: GOLD, color: '#1c1404', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Crown size={15} aria-hidden="true" /> Get Premium
                            </button>
                        </>
                    ) : (
                        <>
                            <span style={{ flex: 1 }} />
                            <button onClick={() => setDraft(saved)} disabled={!changed}
                                style={{ height: 44, padding: '0 16px', borderRadius: 10, border: `1px solid ${base.border}`, background: 'transparent', color: changed ? base.text : base.sub, fontWeight: 700, cursor: changed ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <RotateCcw size={14} aria-hidden="true" /> Undo changes
                            </button>
                            <button onClick={handleSave} disabled={!changed || saving}
                                style={{ height: 44, padding: '0 22px', borderRadius: 10, border: 'none', background: changed ? '#3b82f6' : base.chip, color: changed ? '#fff' : base.sub, fontWeight: 800, cursor: changed && !saving ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8 }}>
                                {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                                Save look
                            </button>
                        </>
                    )}
                </footer>
            </div>
        </div>
    );
};
