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
        expect(shown).toEqual({ ...DEFAULT_LOOK, skin: 's4', hair: 'bun' });
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
