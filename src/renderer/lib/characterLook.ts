import { create } from 'zustand';
import type { CharacterLook } from './api-contract';
import { apiClient } from './api';

export type { CharacterLook };

/**
 * Character looks (mirrors the backend's lib/character.ts).
 * Free for everyone: gender, skin tone, hairstyle, palette hair colours, a few
 * basic items (FREE_*) and palette colours for outfits, hats and accessories.
 * Everything else (more outfits, patterns, hats, accessories, companions and
 * custom colours) is premium. Mirrors the backend's isFreeChoice.
 */

export const GENDERS: { id: CharacterLook['gender']; label: string }[] = [
    { id: 'feminine', label: 'Feminine' },
    { id: 'masculine', label: 'Masculine' },
    { id: 'neutral', label: 'Neutral' },
];

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
    { id: 'pigtails', label: 'Pigtails' },
    { id: 'ponytail', label: 'Ponytail' },
];

export const HAIR_PALETTE = ['#2b1d14', '#5a3825', '#8b5a2b', '#c68b59', '#e6c27a', '#d9d9d9', '#1f2937', '#a0522d'];

export const OUTFITS: { id: CharacterLook['outfit']; label: string; premium: boolean }[] = [
    { id: 'classic', label: 'Classic', premium: false },
    { id: 'hoodie', label: 'Hoodie', premium: false },
    { id: 'dress', label: 'Dress', premium: true },
    { id: 'kimono', label: 'Kimono', premium: true },
    { id: 'overalls', label: 'Overalls', premium: true },
    { id: 'cardigan', label: 'Cardigan', premium: true },
    { id: 'sailor', label: 'Sailor', premium: true },
    { id: 'pinafore', label: 'Pinafore', premium: true },
    { id: 'tutu', label: 'Tutu', premium: true },
    { id: 'puffer', label: 'Puffer', premium: true },
    { id: 'sweater', label: 'Sweater', premium: true },
];

export const PATTERNS: { id: CharacterLook['pattern']; label: string }[] = [
    { id: 'none', label: 'Plain' },
    { id: 'stripes', label: 'Stripes' },
    { id: 'dots', label: 'Dots' },
    { id: 'stars', label: 'Stars' },
    { id: 'checks', label: 'Checks' },
    { id: 'hearts', label: 'Hearts' },
    { id: 'flowers', label: 'Flowers' },
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
    { id: 'bow', label: 'Bow' },
    { id: 'bunny-ears', label: 'Bunny ears' },
    { id: 'bear-ears', label: 'Bear ears' },
    { id: 'beret', label: 'Beret' },
    { id: 'crown', label: 'Crown' },
    { id: 'halo', label: 'Halo' },
    { id: 'party-hat', label: 'Party hat' },
    { id: 'frog-hat', label: 'Frog hat' },
    { id: 'star-clips', label: 'Star clips' },
];

export const ACCESSORIES: { id: CharacterLook['accessory']; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'scarf', label: 'Scarf' },
    { id: 'bow-tie', label: 'Bow tie' },
    { id: 'necklace', label: 'Necklace' },
    { id: 'backpack', label: 'Backpack' },
    { id: 'wings', label: 'Fairy wings' },
    { id: 'balloon', label: 'Heart balloon' },
    { id: 'cape', label: 'Cape' },
];

/** A little companion that sits beside you. */
export const PETS: { id: CharacterLook['pet']; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'cat', label: 'Cat' },
    { id: 'bunny', label: 'Bunny' },
    { id: 'chick', label: 'Chick' },
    { id: 'frog', label: 'Frog' },
    { id: 'puppy', label: 'Puppy' },
    { id: 'panda', label: 'Panda' },
];

/** Suggested companion colours (premium members can also pick any colour). */
export const PET_PALETTE = ['#f5f5f4', '#fbbf24', '#f97316', '#a8a29e', '#44403c', '#fda4af', '#86efac', '#c4b5fd'];

/** Suggested colours for outfits, patterns and headwear (premium members can also pick any colour). */
export const STYLE_PALETTE = ['#7c9cbf', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f5f5f4', '#1f2937', '#a3e635'];

export const DEFAULT_LOOK: CharacterLook = {
    gender: 'neutral',
    skin: 's2',
    hair: 'short',
    hairColor: '#5a3825',
    outfit: 'classic',
    outfitColor: '#7c9cbf',
    pattern: 'none',
    patternColor: '#ffffff',
    headwear: 'none',
    headwearColor: '#ef4444',
    accessory: 'none',
    accessoryColor: '#f472b6',
    pet: 'none',
    petColor: '#f5f5f4',
};

/** The free basics: anyone can wear these. */
export const FREE_OUTFITS: CharacterLook['outfit'][] = ['classic', 'hoodie'];
export const FREE_HEADWEAR: CharacterLook['headwear'][] = ['none', 'beanie', 'cap', 'glasses'];
export const FREE_ACCESSORIES: CharacterLook['accessory'][] = ['none', 'scarf'];

/** Fields that can hold premium choices. */
export const PREMIUM_FIELDS = ['hairColor', 'outfit', 'outfitColor', 'pattern', 'patternColor', 'headwear', 'headwearColor', 'accessory', 'accessoryColor', 'pet', 'petColor'] as const;

/** Whether a value for a field is free for everyone. */
export function isFreeChoice(field: keyof CharacterLook, value: string): boolean {
    switch (field) {
        case 'hairColor': return HAIR_PALETTE.includes(value);
        case 'outfit': return (FREE_OUTFITS as string[]).includes(value);
        case 'headwear': return (FREE_HEADWEAR as string[]).includes(value);
        case 'accessory': return (FREE_ACCESSORIES as string[]).includes(value);
        case 'outfitColor': case 'headwearColor': case 'accessoryColor': return STYLE_PALETTE.includes(value);
        case 'pattern': case 'pet': return value === 'none';
        case 'patternColor': case 'petColor': return false;
        default: return true;
    }
}

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
        gender: pick('gender', ids(GENDERS)),
        skin: pick('skin', ids(SKIN_TONES)),
        hair: pick('hair', ids(HAIR_STYLES)),
        hairColor: hex('hairColor'),
        outfit: pick('outfit', ids(OUTFITS)),
        outfitColor: hex('outfitColor'),
        pattern: pick('pattern', ids(PATTERNS)),
        patternColor: hex('patternColor'),
        headwear: pick('headwear', ids(HEADWEAR)),
        headwearColor: hex('headwearColor'),
        accessory: pick('accessory', ids(ACCESSORIES)),
        accessoryColor: hex('accessoryColor'),
        pet: pick('pet', ids(PETS)),
        petColor: hex('petColor'),
    };
}

/** What others see: premium parts only while the membership is active. */
export function effectiveLook(look: CharacterLook, isPremium: boolean): CharacterLook {
    if (isPremium) return look;
    const shown = { ...look };
    for (const f of PREMIUM_FIELDS) {
        if (!isFreeChoice(f, look[f])) (shown as Record<string, string>)[f] = DEFAULT_LOOK[f];
    }
    return shown;
}

/** Fields in `draft` a free member may not save: premium choices that differ from what is saved. */
export function lockedChanges(draft: CharacterLook, saved: CharacterLook): string[] {
    return PREMIUM_FIELDS.filter(f => draft[f] !== saved[f] && !isFreeChoice(f, draft[f]));
}

/** Put the premium choices in `draft` back to what is saved (keeps free changes). */
export function withoutLockedChanges(draft: CharacterLook, saved: CharacterLook): CharacterLook {
    const out = { ...draft };
    for (const f of lockedChanges(draft, saved)) (out as Record<string, string>)[f] = saved[f as keyof CharacterLook];
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
                throw Object.assign(new Error('That item or colour is part of Premium.'), { code: 'premium_required' });
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
