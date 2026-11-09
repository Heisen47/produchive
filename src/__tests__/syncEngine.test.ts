import { describe, it, expect, vi, beforeEach } from 'vitest';

const logBatch = vi.fn();
vi.mock('../renderer/lib/services/activityService', () => ({ activityService: { logBatch: (...a: any[]) => logBatch(...a) } }));
vi.mock('../renderer/lib/services/websocketService', () => ({
    websocketService: { connect: vi.fn(), registerHandler: vi.fn(), unregisterHandler: vi.fn() },
}));

const store = new Map<string, string>();
const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
};
vi.stubGlobal('localStorage', storage);
vi.stubGlobal('sessionStorage', { getItem: (k: string) => (k === 'token' ? 'tok' : null) });
vi.stubGlobal('navigator', { onLine: true });
vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });

const { SyncEngine, MAX_QUEUE } = await import('../renderer/lib/services/syncEngine');

const activity = (i: number) => ({ title: `Window ${i}`, owner: { name: 'App', path: 'C:/app.exe' } });
const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });

describe('SyncEngine (activity upload)', () => {
    beforeEach(() => {
        store.clear();
        logBatch.mockReset();
    });

    it('is off by default: queues nothing, sends nothing, and clears an old stuck queue', async () => {
        store.set('produchive_telemetry_queue', JSON.stringify(Array.from({ length: 3000 }, (_, i) => ({ i }))));
        const engine = new SyncEngine(false);
        expect(store.has('produchive_telemetry_queue')).toBe(false);
        for (let i = 0; i < 20; i++) engine.enqueueActivity(activity(i));
        await engine.flushQueue();
        expect(engine.getQueueLength()).toBe(0);
        expect(logBatch).not.toHaveBeenCalled();
    });

    it('when enabled, sends in chunks of at most 50', async () => {
        logBatch.mockResolvedValue({});
        const engine = new SyncEngine(true);
        logBatch.mockImplementation(async () => ({}));
        for (let i = 0; i < 9; i++) engine.enqueueActivity(activity(i)); // below the flush threshold
        (engine as any).queue.push(...Array.from({ length: 111 }, (_, i) => ({ eventType: 'x', payload: { i }, timestamp: String(i) })));
        await engine.flushQueue();
        expect(logBatch.mock.calls.map(c => c[0].length)).toEqual([50, 50, 20]);
        expect(engine.getQueueLength()).toBe(0);
    });

    it('caps the queue so a long outage cannot grow it forever', () => {
        logBatch.mockRejectedValue(new Error('offline'));
        const engine = new SyncEngine(true);
        for (let i = 0; i < MAX_QUEUE + 120; i++) engine.enqueueActivity(activity(i));
        expect(engine.getQueueLength()).toBe(MAX_QUEUE);
        const kept = JSON.parse(store.get('produchive_telemetry_queue')!);
        expect(kept[kept.length - 1].payload.title).toBe(`Window ${MAX_QUEUE + 119}`);
    });

    it('stops retrying for the session when the server has no endpoint (404)', async () => {
        logBatch.mockRejectedValue(httpError(404));
        const engine = new SyncEngine(true);
        (engine as any).queue.push({ eventType: 'x', payload: {}, timestamp: '1' });
        await engine.flushQueue();
        await engine.flushQueue();
        expect(logBatch).toHaveBeenCalledTimes(1);
        expect(engine.getQueueLength()).toBe(1);
    });

    it('halves the chunk size after a 413 and keeps the events', async () => {
        logBatch.mockRejectedValueOnce(httpError(413)).mockResolvedValue({});
        const engine = new SyncEngine(true);
        (engine as any).queue.push(...Array.from({ length: 60 }, (_, i) => ({ eventType: 'x', payload: { i }, timestamp: String(i) })));
        await engine.flushQueue();
        expect(engine.getQueueLength()).toBe(60);
        await engine.flushQueue();
        expect(logBatch.mock.calls.slice(1).map(c => c[0].length)).toEqual([25, 25, 10]);
        expect(engine.getQueueLength()).toBe(0);
    });
});
