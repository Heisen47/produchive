import { create } from 'zustand';
import type { CharacterLook } from './api-contract';
import { apiClient } from './api';

export type { CharacterLook };

/**
 * Character looks (mirrors the backend's lib/character.ts).
 * Skin tone, hairstyle and palette hair colours are free; outfits, patterns,
 * headwear and custom colours are premium.
 */

export const SKIN_TONES: { id: CharacterLook['skin']; color: string; label: string }[] = [
    { id: 's1', color: '#fde3cf', label: 'Very light' },
    { id: 's2', color: '#f3c9a3', label: 'Light' },
    { id: 's3', color: '#d9a273', label: 'Medium light' },
    { id: 's4', color: '#b67a4b', label: 'Medium' },
    { id: 's5', color: '#8a5634', label: 'Medium dark' },
    { id: 's6', color: '#5c3a24', label: 'Dark' },
];

export const HAIR_STYLES: { id: CharacterLook['hair']; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'short', label: 'Short' },
    { id: 'bob', label: 'Bob' },
    { id: 'long', label: 'Long' },
    { id: 'bun', label: 'Bun' },
    { id: 'curly', label: 'Curly' },
];

export const HAIR_PALETTE = ['#2b1d14', '#5a3825', '#8b5a2b', '#c68b59', '#e6c27a', '#d9d9d9', '#1f2937', '#a0522d'];

export const OUTFITS: { id: CharacterLook['outfit']; label: string; premium: boolean }[] = [
    { id: 'classic', label: 'Classic', premium: false },
    { id: 'hoodie', label: 'Hoodie', premium: true },
    { id: 'dress', label: 'Dress', premium: true },
    { id: 'kimono', label: 'Kimono', premium: true },
    { id: 'overalls', label: 'Overalls', premium: true },
    { id: 'cardigan', label: 'Cardigan', premium: true },
];

export const PATTERNS: { id: CharacterLook['pattern']; label: string }[] = [
    { id: 'none', label: 'Plain' },
    { id: 'stripes', label: 'Stripes' },
    { id: 'dots', label: 'Dots' },
    { id: 'stars', label: 'Stars' },
    { id: 'checks', label: 'Checks' },
];

export const HEADWEAR: { id: CharacterLook['headwear']; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'beanie', label: 'Beanie' },
    { id: 'cap', label: 'Cap' },
    { id: 'flower-crown', label: 'Flower crown' },
    { id: 'cat-ears', label: 'Cat ears' },
    { id: 'headphones', label: 'Headphones' },
    { id: 'witch-hat', label: 'Witch hat' },
    { id: 'glasses', label: 'Glasses' },
];

/** Suggested colours for outfits, patterns and headwear (premium members can also pick any colour). */
export const STYLE_PALETTE = ['#7c9cbf', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f5f5f4', '#1f2937', '#a3e635'];

export const DEFAULT_LOOK: CharacterLook = {
    skin: 's2',
    hair: 'short',
    hairColor: '#5a3825',
    outfit: 'classic',
    outfitColor: '#7c9cbf',
    pattern: 'none',
    patternColor: '#ffffff',
    headwear: 'none',
    headwearColor: '#ef4444',
};

export const PREMIUM_FIELDS = ['outfit', 'outfitColor', 'pattern', 'patternColor', 'headwear', 'headwearColor'] as const;

const HEX = /^#[0-9a-f]{6}$/i;
const ids = <T extends { id: string }>(xs: T[]) => xs.map(x => x.id) as string[];

export function skinColor(skin: CharacterLook['skin']): string {
    return SKIN_TONES.find(s => s.id === skin)?.color ?? SKIN_TONES[1].color;
}

/** Fill missing or unknown fields with defaults. */
export function normalizeLook(input: unknown): CharacterLook {
    const v = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const pick = <K extends keyof CharacterLook>(key: K, allowed: string[]): CharacterLook[K] =>
        (typeof v[key] === 'string' && allowed.includes(v[key] as string) ? v[key] : DEFAULT_LOOK[key]) as CharacterLook[K];
    const hex = (key: keyof CharacterLook) =>
        typeof v[key] === 'string' && HEX.test(v[key] as string) ? (v[key] as string).toLowerCase() : DEFAULT_LOOK[key] as string;
    return {
        skin: pick('skin', ids(SKIN_TONES)),
        hair: pick('hair', ids(HAIR_STYLES)),
        hairColor: hex('hairColor'),
        outfit: pick('outfit', ids(OUTFITS)),
        outfitColor: hex('outfitColor'),
        pattern: pick('pattern', ids(PATTERNS)),
        patternColor: hex('patternColor'),
        headwear: pick('headwear', ids(HEADWEAR)),
        headwearColor: hex('headwearColor'),
    };
}

/** What others see: premium parts only while the membership is active. */
export function effectiveLook(look: CharacterLook, isPremium: boolean): CharacterLook {
    if (isPremium) return look;
    return {
        ...DEFAULT_LOOK,
        skin: look.skin,
        hair: look.hair,
        hairColor: HAIR_PALETTE.includes(look.hairColor) ? look.hairColor : DEFAULT_LOOK.hairColor,
    };
}

/** Fields in `draft` a free user may not save (premium parts changed from `saved`, or a custom hair colour). */
export function lockedChanges(draft: CharacterLook, saved: CharacterLook): string[] {
    const locked: string[] = PREMIUM_FIELDS.filter(f => draft[f] !== saved[f]);
    if (!HAIR_PALETTE.includes(draft.hairColor) && draft.hairColor !== saved.hairColor) locked.push('hairColor');
    return locked;
}

/** Reset the premium parts of `draft` back to what is saved (keeps free changes). */
export function withoutLockedChanges(draft: CharacterLook, saved: CharacterLook): CharacterLook {
    const out = { ...draft };
    for (const f of PREMIUM_FIELDS) (out as any)[f] = saved[f];
    if (!HAIR_PALETTE.includes(out.hairColor)) out.hairColor = saved.hairColor;
    return out;
}

/* ------------------------------------------------------------------------- *
 * Store: your saved look. Cached on this device so solo rooms work offline;
 * synced with your account when signed in.
 * ------------------------------------------------------------------------- */

const CACHE_KEY = 'produchive_character_look';

function readCache(): CharacterLook | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? normalizeLook(JSON.parse(raw)) : null;
    } catch {
        return null;
    }
}

function writeCache(look: CharacterLook): void {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(look)); } catch { /* storage unavailable */ }
}

interface CharacterLookState {
    /** What is saved (may include premium parts from an earlier membership). */
    saved: CharacterLook;
    /** What is shown in rooms right now. */
    effective: CharacterLook;
    isPremium: boolean;
    /** Load from the account (if signed in), else from this device. */
    load: (isPremium: boolean) => Promise<void>;
    /** Save a look. Throws with `code: 'premium_required'` when it needs premium. */
    save: (look: CharacterLook) => Promise<void>;
}

export const useCharacterLook = create<CharacterLookState>((set, get) => {
    const cached = readCache() ?? DEFAULT_LOOK;
    return {
        saved: cached,
        effective: effectiveLook(cached, false),
        isPremium: false,
        load: async (isPremium) => {
            const local = readCache() ?? DEFAULT_LOOK;
            set({ saved: local, effective: effectiveLook(local, isPremium), isPremium });
            if (!sessionStorage.getItem('token')) return;
            try {
                const res = await apiClient.getCharacterLook();
                const saved = normalizeLook(res.look);
                writeCache(saved);
                set({ saved, effective: normalizeLook(res.effective), isPremium: res.isPremium });
            } catch {
                // Offline or server down: keep the cached look.
            }
        },
        save: async (look) => {
            const { isPremium, saved } = get();
            if (!isPremium && lockedChanges(look, saved).length > 0) {
                throw Object.assign(new Error('Outfits, patterns, headwear and custom colours are part of Premium.'), { code: 'premium_required' });
            }
            if (sessionStorage.getItem('token')) {
                const res = await apiClient.saveCharacterLook(look);
                const next = normalizeLook(res.look);
                writeCache(next);
                set({ saved: next, effective: normalizeLook(res.effective), isPremium: res.isPremium });
            } else {
                writeCache(look);
                set({ saved: look, effective: effectiveLook(look, isPremium) });
            }
        },
    };
});
