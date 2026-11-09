import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
});
vi.stubGlobal('sessionStorage', { getItem: (): string | null => null });

const {
    DEFAULT_LOOK, HAIR_PALETTE, normalizeLook, effectiveLook, lockedChanges, withoutLockedChanges, useCharacterLook, skinColor,
} = await import('../renderer/lib/characterLook');
const { shade } = await import('../renderer/components/focus-room/CharacterParts');

const outfit = {
    ...DEFAULT_LOOK,
    skin: 's4' as const, hair: 'bun' as const, hairColor: HAIR_PALETTE[3],
    outfit: 'kimono' as const, outfitColor: '#be123c', pattern: 'stars' as const, patternColor: '#fde68a',
    headwear: 'cat-ears' as const, headwearColor: '#1f2937',
};

describe('character looks', () => {
    beforeEach(() => store.clear());

    it('fills unknown or missing fields with defaults', () => {
        expect(normalizeLook(null)).toEqual(DEFAULT_LOOK);
        expect(normalizeLook({ outfit: 'spacesuit', hairColor: 'pink', skin: 's6' })).toEqual({ ...DEFAULT_LOOK, skin: 's6' });
        expect(normalizeLook({ outfitColor: '#ABCDEF' }).outfitColor).toBe('#abcdef');
    });

    it('free members show only skin, hair and a palette hair colour', () => {
        const shown = effectiveLook({ ...outfit, hairColor: '#ff00ff' }, false);
        // A palette colour is free, so the (hidden) hat keeps its colour; the premium items fall back.
        expect(shown).toEqual({ ...DEFAULT_LOOK, skin: 's4', hair: 'bun', headwearColor: '#1f2937' });
        expect(effectiveLook(outfit, true)).toEqual(outfit);
    });

    it('spots premium changes a free member is trying on, and removes only those', () => {
        const draft = { ...DEFAULT_LOOK, skin: 's1' as const, outfit: 'dress' as const, hairColor: '#123456' };
        expect(lockedChanges(draft, DEFAULT_LOOK).sort()).toEqual(['hairColor', 'outfit']);
        const cleaned = withoutLockedChanges(draft, DEFAULT_LOOK);
        expect(cleaned).toEqual({ ...DEFAULT_LOOK, skin: 's1' });
        expect(lockedChanges(cleaned, DEFAULT_LOOK)).toEqual([]);
    });

    it('a lapsed member can still change hair without losing the saved outfit', () => {
        const draft = { ...outfit, hair: 'curly' as const };
        expect(lockedChanges(draft, outfit)).toEqual([]);
    });

    it('saving premium items without premium is refused; free parts save on this device', async () => {
        useCharacterLook.setState({ saved: DEFAULT_LOOK, effective: DEFAULT_LOOK, isPremium: false });
        await expect(useCharacterLook.getState().save(outfit)).rejects.toMatchObject({ code: 'premium_required' });

        const free = { ...DEFAULT_LOOK, skin: 's5' as const, hair: 'long' as const };
        await useCharacterLook.getState().save(free);
        expect(useCharacterLook.getState().saved).toEqual(free);
        expect(JSON.parse(store.get('produchive_character_look')!)).toEqual(free);
    });

    it('premium members can save the full outfit', async () => {
        useCharacterLook.setState({ saved: DEFAULT_LOOK, effective: DEFAULT_LOOK, isPremium: true });
        await useCharacterLook.getState().save(outfit);
        expect(useCharacterLook.getState().effective).toEqual(outfit);
    });

    it('colour helpers', () => {
        expect(skinColor('s1')).toBe('#fde3cf');
        expect(shade('#808080', 0.5)).toBe('#c0c0c0');
        expect(shade('#808080', -0.5)).toBe('#404040');
    });
});

describe('gender', () => {
    it('defaults to neutral and rejects unknown values', () => {
        expect(normalizeLook({}).gender).toBe('neutral');
        expect(normalizeLook({ gender: 'feminine' }).gender).toBe('feminine');
        expect(normalizeLook({ gender: 'robot' }).gender).toBe('neutral');
    });

    it('is free: kept for non-premium members and never a locked change', () => {
        const look = { ...DEFAULT_LOOK, gender: 'masculine' as const };
        expect(effectiveLook(look, false).gender).toBe('masculine');
        expect(lockedChanges(look, DEFAULT_LOOK)).toEqual([]);
    });
});

describe('accessories and companions', () => {
    it('accepts the new items and drops unknown ones', () => {
        const look = normalizeLook({ outfit: 'tutu', hair: 'pigtails', headwear: 'crown', accessory: 'wings', pet: 'frog', petColor: '#86EFAC' });
        expect(look).toMatchObject({ outfit: 'tutu', hair: 'pigtails', headwear: 'crown', accessory: 'wings', pet: 'frog', petColor: '#86efac' });
        expect(normalizeLook({ accessory: 'jetpack', pet: 'dragon' })).toMatchObject({ accessory: 'none', pet: 'none' });
    });

    it('are premium: hidden for free members and locked when tried on', () => {
        const look = { ...DEFAULT_LOOK, accessory: 'backpack' as const, pet: 'cat' as const };
        expect(effectiveLook(look, false)).toMatchObject({ accessory: 'none', pet: 'none' });
        expect(lockedChanges(look, DEFAULT_LOOK).sort()).toEqual(['accessory', 'pet']);
    });
});

describe('free basics', () => {
    const free = { ...DEFAULT_LOOK, outfit: 'hoodie' as const, outfitColor: '#ec4899', headwear: 'cap' as const, headwearColor: '#10b981', accessory: 'scarf' as const, accessoryColor: '#f59e0b' };

    it('lets free members wear the basics in palette colours', () => {
        expect(lockedChanges(free, DEFAULT_LOOK)).toEqual([]);
        expect(effectiveLook(free, false)).toEqual(free);
    });

    it('still locks custom colours and premium items for free members', () => {
        const draft = { ...free, outfitColor: '#123456', headwear: 'crown' as const, pattern: 'hearts' as const, pet: 'panda' as const };
        expect(lockedChanges(draft, DEFAULT_LOOK).sort()).toEqual(['headwear', 'outfitColor', 'pattern', 'pet']);
        expect(effectiveLook(draft, false)).toMatchObject({ outfit: 'hoodie', outfitColor: DEFAULT_LOOK.outfitColor, headwear: 'none', pattern: 'none', pet: 'none', accessory: 'scarf' });
        expect(withoutLockedChanges(draft, DEFAULT_LOOK)).toEqual({ ...free, outfitColor: DEFAULT_LOOK.outfitColor, headwear: 'none' });
    });
});
