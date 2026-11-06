import { describe, it, expect, vi } from 'vitest';
import {
    GOOGLE_CALENDAR_SOURCE,
    engineKeepsDataOnDevice,
    isGoogleSourced,
    withoutGoogleDataFor,
} from '../renderer/lib/googleDataPolicy';
import { generateProductivityAnalysis } from '../renderer/lib/productivityAnalysisService';

const external = (provider: string, baseUrl = '') => ({
    isExternal: true,
    config: { provider, baseUrl, model: 'm', hasKey: true, configured: true },
});

const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const routines = [
    { dateStr: today, title: 'Dentist appointment', category: 'meeting', durationMinutes: 60, source: GOOGLE_CALENDAR_SOURCE },
    { dateStr: today, title: 'Build sync feature', category: 'development', durationMinutes: 90 },
];

const promptSentTo = async (engine: any): Promise<string> => {
    const create = vi.fn(async () => ({
        choices: [{ message: { content: '{"rating":7,"verdict":"productive","explanation":"x","tips":[],"categorization":{"productive":[],"neutral":[],"distracting":[]}}' } }],
    }));
    await generateProductivityAnalysis({
        activities: [{ title: 'main.ts', owner: { name: 'VS Code' }, duration: 600000 }],
        routines,
        engine: { ...engine, chat: { completions: { create } } },
    });
    return JSON.stringify(create.mock.calls);
};

describe('googleDataPolicy', () => {
    it('recognises Google Calendar items', () => {
        expect(isGoogleSourced({ source: GOOGLE_CALENDAR_SOURCE })).toBe(true);
        expect(isGoogleSourced({})).toBe(false);
        expect(isGoogleSourced(null)).toBe(false);
    });

    it('treats WebLLM and no engine as on-device', () => {
        expect(engineKeepsDataOnDevice(null)).toBe(true);
        expect(engineKeepsDataOnDevice({ chat: {} })).toBe(true);
    });

    it('treats cloud providers as off-device', () => {
        expect(engineKeepsDataOnDevice(external('openai'))).toBe(false);
        expect(engineKeepsDataOnDevice(external('anthropic'))).toBe(false);
        expect(engineKeepsDataOnDevice(external('custom', 'http://localhost:8080/v1'))).toBe(false);
    });

    it('only trusts local providers on a loopback address', () => {
        expect(engineKeepsDataOnDevice(external('ollama', 'http://localhost:11434/v1'))).toBe(true);
        expect(engineKeepsDataOnDevice(external('lmstudio', 'http://127.0.0.1:1234/v1'))).toBe(true);
        expect(engineKeepsDataOnDevice(external('ollama', 'http://gpu-box.example.com:11434/v1'))).toBe(false);
        expect(engineKeepsDataOnDevice(external('ollama', 'not a url'))).toBe(false);
    });

    it('filters Google items only for off-device engines', () => {
        expect(withoutGoogleDataFor(routines, null)).toHaveLength(2);
        expect(withoutGoogleDataFor(routines, external('openai')).map((r) => r.title)).toEqual(['Build sync feature']);
    });

    it('keeps Google Calendar events out of prompts sent to cloud providers', async () => {
        const prompt = await promptSentTo(external('openai'));
        expect(prompt).not.toContain('Dentist appointment');
        expect(prompt).toContain('Build sync feature');
    });

    it('still gives Google Calendar events to the on-device model', async () => {
        const prompt = await promptSentTo({});
        expect(prompt).toContain('Dentist appointment');
    });
});
