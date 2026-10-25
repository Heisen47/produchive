import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

let stored: string | null = null;
const anthropicCreate = vi.fn();

vi.mock('electron', () => ({
    app: { getPath: () => '/tmp/produchive-test' },
    ipcMain: { handle: vi.fn() },
    safeStorage: {
        isEncryptionAvailable: () => true,
        encryptString: (s: string) => Buffer.from(`enc:${s}`),
        decryptString: (b: Buffer) => b.toString().replace(/^enc:/, ''),
    },
}));
vi.mock('node:fs/promises', () => ({
    default: {
        readFile: vi.fn(async () => {
            if (stored === null) throw new Error('ENOENT');
            return stored;
        }),
        writeFile: vi.fn(async (_p: string, data: string) => {
            stored = data;
        }),
        rm: vi.fn(async () => {
            stored = null;
        }),
    },
}));
vi.mock('../lib/logger', () => ({ createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) }));
vi.mock('@anthropic-ai/sdk', () => ({
    default: class {
        beta = { messages: { create: anthropicCreate } };
        models = {
            list: async function* () {
                yield { id: 'claude-opus-5-5' };
                yield { id: 'claude-haiku-5-5' };
            },
        };
    },
}));

import { validateBaseUrl, runExternalChat, listProviderModels, PROVIDERS } from '../externalAI';
import { createExternalEngine } from '../renderer/lib/externalEngine';

const setConfig = (config: object) => {
    stored = JSON.stringify(config);
};
const key = (k: string) => Buffer.from(`enc:${k}`).toString('base64');
const messages = [
    { role: 'system', content: 'You are a coach.' },
    { role: 'user', content: 'Rate my day' },
];

describe('external AI (main process)', () => {
    beforeEach(() => {
        stored = null;
        anthropicCreate.mockReset();
    });
    afterEach(() => vi.unstubAllGlobals());

    it('only allows https, or http to localhost', () => {
        expect(validateBaseUrl('https://api.example.com/v1/')).toBe('https://api.example.com/v1');
        expect(validateBaseUrl('http://localhost:11434/v1')).toBe('http://localhost:11434/v1');
        expect(() => validateBaseUrl('http://evil.example.com/v1')).toThrow(/https/);
        expect(() => validateBaseUrl('file:///etc/passwd')).toThrow(/https/);
        expect(() => validateBaseUrl('not a url')).toThrow(/full URL/);
    });

    it('pins every hosted provider to a fixed https URL', () => {
        for (const [name, info] of Object.entries(PROVIDERS)) {
            if (info.editableUrl) continue;
            expect(info.baseUrl, name).toMatch(/^https:\/\//);
            expect(info.needsKey, name).toBe(true);
        }
    });

    it('lists models from an OpenAI-compatible provider and strips Gemini prefixes', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ data: [{ id: 'models/gemini-b' }, { id: 'models/gemini-a' }] }),
        });
        vi.stubGlobal('fetch', fetchMock);

        expect(await listProviderModels({ provider: 'gemini', apiKey: 'g-key' })).toEqual(['gemini-a', 'gemini-b']);
        expect(fetchMock.mock.calls[0][0]).toBe('https://generativelanguage.googleapis.com/v1beta/openai/models');
        expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer g-key');
    });

    it('lists local Ollama models without a key, and needs a key for cloud providers', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ id: 'llama3.2' }] }) }));

        expect(await listProviderModels({ provider: 'ollama' })).toEqual(['llama3.2']);
        await expect(listProviderModels({ provider: 'groq' })).rejects.toThrow(/API key/);
    });

    it('lists Claude models through the SDK using the saved key', async () => {
        setConfig({ provider: 'anthropic', baseUrl: 'https://api.anthropic.com', model: 'claude-opus-5-5', encryptedKey: key('sk-ant') });

        expect(await listProviderModels({ provider: 'anthropic' })).toEqual(['claude-opus-5-5', 'claude-haiku-5-5']);
    });

    it('refuses to run before a key is saved', async () => {
        setConfig({ provider: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'some-model' });
        await expect(runExternalChat(messages, 0.2, new AbortController().signal)).rejects.toThrow(/not set up/);
    });

    it('calls an OpenAI-compatible endpoint with the decrypted key', async () => {
        setConfig({ provider: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'some-model', encryptedKey: key('sk-test') });
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: '{"rating":8}' } }] }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const out = await runExternalChat(messages, 0.2, new AbortController().signal);

        expect(out).toBe('{"rating":8}');
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://api.openai.com/v1/chat/completions');
        expect(init.headers.Authorization).toBe('Bearer sk-test');
        expect(JSON.parse(init.body)).toEqual({ model: 'some-model', messages, temperature: 0.2 });
    });

    it('reports provider errors in plain words', async () => {
        setConfig({ provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'm', encryptedKey: key('bad') });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized', json: async () => ({ error: { message: 'No auth' } }) }));

        await expect(runExternalChat(messages, undefined, new AbortController().signal)).rejects.toThrow('Invalid API key: No auth');
    });

    it('sends Claude requests through the SDK with system prompt, fallbacks and no temperature', async () => {
        setConfig({ provider: 'anthropic', baseUrl: 'https://api.anthropic.com', model: 'claude-opus-5-5', encryptedKey: key('sk-ant') });
        anthropicCreate.mockResolvedValue({
            stop_reason: 'end_turn',
            content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"rating":9}' }],
        });

        const out = await runExternalChat(messages, 0.7, new AbortController().signal);

        expect(out).toBe('{"rating":9}');
        const [params] = anthropicCreate.mock.calls[0];
        expect(params).toMatchObject({
            model: 'claude-opus-5-5',
            system: 'You are a coach.',
            messages: [{ role: 'user', content: 'Rate my day' }],
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
        });
        expect(params).not.toHaveProperty('temperature');
    });

    it('surfaces a Claude refusal as an error', async () => {
        setConfig({ provider: 'anthropic', baseUrl: 'https://api.anthropic.com', model: 'claude-haiku-5-5', encryptedKey: key('sk-ant') });
        anthropicCreate.mockResolvedValue({ stop_reason: 'refusal', content: [] });

        await expect(runExternalChat(messages, undefined, new AbortController().signal)).rejects.toThrow(/declined/);
        expect(anthropicCreate.mock.calls[0][0]).not.toHaveProperty('fallbacks');
    });
});

describe('external engine adapter (renderer)', () => {
    const config = { provider: 'ollama' as const, baseUrl: 'http://localhost:11434/v1', model: 'llama3.2', hasKey: false, configured: true };

    it('returns web-llm shaped completions', async () => {
        const externalAIChat = vi.fn().mockResolvedValue({ content: 'hello' });
        vi.stubGlobal('window', { electronAPI: { externalAIChat, externalAIAbort: vi.fn() } });

        const engine = createExternalEngine(config);
        const res = await engine.chat.completions.create({ messages: [{ role: 'user', content: 'hi' }], temperature: 0.5 });

        expect(res.choices[0].message.content).toBe('hello');
        expect(externalAIChat.mock.calls[0][0]).toMatchObject({ messages: [{ role: 'user', content: 'hi' }], temperature: 0.5 });
        vi.unstubAllGlobals();
    });

    it('turns an aborted request into an AbortError', async () => {
        const externalAIAbort = vi.fn();
        vi.stubGlobal('window', { electronAPI: { externalAIChat: vi.fn().mockResolvedValue({ aborted: true }), externalAIAbort } });
        const controller = new AbortController();

        const pending = createExternalEngine(config).chat.completions.create({ messages: [{ role: 'user', content: 'hi' }], signal: controller.signal });
        controller.abort();

        await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
        expect(externalAIAbort).toHaveBeenCalled();
        vi.unstubAllGlobals();
    });
});
