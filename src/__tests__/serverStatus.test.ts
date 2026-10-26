import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const apiGet = vi.fn();
const openExternalUrl = vi.fn();

vi.mock('../renderer/lib/api', () => ({ api: { get: apiGet } }));
vi.mock('../renderer/lib/config', () => ({
    API_BASE_URL: 'https://api.produchive.com',
    WEB_BASE_URL: 'https://produchive.com',
    FEEDBACK_GOOGLE_FORM_URL: 'https://forms.gle/x',
}));

// Fresh module per test so the 60s cache and the build-time mode start clean.
async function load(mode?: string) {
    vi.resetModules();
    if (mode) vi.stubEnv('VITE_SERVER_STATUS', mode);
    const status = await import('../renderer/lib/serverStatus');
    const urls = await import('../renderer/lib/urls');
    return { ...status, ...urls };
}

beforeEach(() => {
    apiGet.mockReset();
    openExternalUrl.mockReset();
    vi.stubGlobal('window', { electronAPI: { openExternalUrl } });
    vi.stubGlobal('sessionStorage', { getItem: () => null });
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('isServerUp', () => {
    it('is up when /health answers 200', async () => {
        apiGet.mockResolvedValue({ status: 200 });
        const { isServerUp } = await load();
        expect(await isServerUp()).toBe(true);
        expect(apiGet).toHaveBeenCalledWith('/health', { timeout: 3000 });
    });

    it('is down when /health fails or times out', async () => {
        apiGet.mockRejectedValue(new Error('timeout of 3000ms exceeded'));
        const { isServerUp } = await load();
        expect(await isServerUp()).toBe(false);
    });

    it('caches the result instead of pinging on every click', async () => {
        apiGet.mockResolvedValue({ status: 200 });
        const { isServerUp } = await load();
        await isServerUp();
        await isServerUp();
        expect(apiGet).toHaveBeenCalledTimes(1);
    });

    it('honours the manual on/off switch without pinging', async () => {
        let mod = await load('off');
        expect(await mod.isServerUp()).toBe(false);
        mod = await load('on');
        expect(await mod.isServerUp()).toBe(true);
        expect(apiGet).not.toHaveBeenCalled();
    });
});

describe('server-aware website links', () => {
    it('opens the napping page instead of sign-in when the backend is down', async () => {
        const { openServerPage } = await load('off');
        openServerPage('/?from=app&action=login');
        await vi.waitFor(() => expect(openExternalUrl).toHaveBeenCalledWith('https://produchive.com/server-nap'));
    });

    it('goes through the backend redirect for sign-in when it is up', async () => {
        const { openServerPage } = await load('on');
        openServerPage('/?from=app&action=login');
        await vi.waitFor(() =>
            expect(openExternalUrl).toHaveBeenCalledWith(
                'https://api.produchive.com/auth/redirect?path=%2F%3Ffrom%3Dapp%26action%3Dlogin',
            ),
        );
    });

    it('opens ordinary pages on the website directly when the backend is down', async () => {
        const { openWebPage } = await load('off');
        openWebPage('/faq');
        await vi.waitFor(() => expect(openExternalUrl).toHaveBeenCalledWith('https://produchive.com/faq'));
    });

    it('requireServer reports down and shows the napping page', async () => {
        const { requireServer } = await load('off');
        expect(await requireServer()).toBe(false);
        expect(openExternalUrl).toHaveBeenCalledWith('https://produchive.com/server-nap');
    });
});
