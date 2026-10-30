import { describe, it, expect, beforeEach, vi } from 'vitest';
import { STARTER_CATFOOD } from '../renderer/lib/catfood';

// Simulates db.json settings behind the get-settings / set-setting IPC, with a delay
// so overlapping loads interleave like they do under React StrictMode.
let dbSettings: Record<string, any>;
let storage: Record<string, string>;
const setSetting = vi.fn(async (key: string, value: any) => {
    dbSettings[key] = JSON.parse(JSON.stringify(value));
    return dbSettings;
});

const freshStore = async () => {
    vi.resetModules();
    return import('../renderer/lib/catfoodStore');
};

describe('catfood store: loading', () => {
    beforeEach(() => {
        dbSettings = {};
        storage = {};
        setSetting.mockClear();
        vi.stubGlobal('localStorage', {
            getItem: (k: string) => storage[k] ?? null,
            setItem: (k: string, v: string) => { storage[k] = v; },
            removeItem: (k: string) => { delete storage[k]; },
        });
        vi.stubGlobal('window', {
            dispatchEvent: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            electronAPI: {
                // Snapshot at call time, returned later: a second overlapping read sees stale data.
                getSettings: vi.fn(() => {
                    const snapshot = JSON.parse(JSON.stringify(dbSettings));
                    return new Promise((r) => setTimeout(() => r(snapshot), 10));
                }),
                setSetting,
            },
        });
    });

    it('keeps the starter grant when the engine starts twice at once (StrictMode)', async () => {
        const { useCatfoodStore } = await freshStore();
        const { load } = useCatfoodStore.getState();
        await Promise.all([load(), load()]);
        expect(useCatfoodStore.getState().balance).toBe(STARTER_CATFOOD);
        expect(setSetting).toHaveBeenCalledTimes(1);
        expect(dbSettings.catfood.grants.starter).toBe(STARTER_CATFOOD);
    });

    it('does not grant again on the next launch', async () => {
        await (await freshStore()).useCatfoodStore.getState().load();
        setSetting.mockClear();

        const { useCatfoodStore } = await freshStore();
        await useCatfoodStore.getState().load();
        expect(useCatfoodStore.getState().balance).toBe(STARTER_CATFOOD);
        expect(setSetting).not.toHaveBeenCalled();
    });

    it('a pet before loading finishes cannot overwrite the saved grant', async () => {
        vi.useFakeTimers();
        try {
            dbSettings.catfood = { version: 2, sessions: {}, grants: { starter: STARTER_CATFOOD }, spends: [], pets: {} };
            const { useCatfoodStore } = await freshStore();
            useCatfoodStore.getState().pet(); // tap before db.json was read
            await vi.advanceTimersByTimeAsync(2000);
            expect(dbSettings.catfood.grants.starter).toBe(STARTER_CATFOOD);
            expect(Object.values(dbSettings.catfood.pets)).toEqual([1]);
            expect(useCatfoodStore.getState().balance).toBe(STARTER_CATFOOD);
        } finally {
            vi.useRealTimers();
        }
    });
});
