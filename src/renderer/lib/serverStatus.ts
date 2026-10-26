/// <reference types="vite/client" />
/**
 * Whether the backend (api.produchive.com) is up. When it's down, features that
 * need it (sign-in, Premium, multiplayer rooms) open the website's
 * "server is napping" page instead of failing.
 *
 * Controlled by VITE_SERVER_STATUS at build time (mirrors the website's
 * NEXT_PUBLIC_SERVER_STATUS):
 *   "on"   – always use the server
 *   "off"  – always treat it as down
 *   "auto" – ping the server's /health endpoint and decide (default)
 */
import { api } from './api';
import { WEB_BASE_URL } from './config';

type ServerMode = 'on' | 'off' | 'auto';

const MODE = ((import.meta.env.VITE_SERVER_STATUS as string | undefined) || 'auto').trim().toLowerCase() as ServerMode;

export const SERVER_NAP_URL = `${WEB_BASE_URL}/server-nap`;

const HEALTH_TIMEOUT_MS = 3000;
const CACHE_MS = 60_000;
let cached: { up: boolean; at: number } | null = null;

export async function isServerUp(): Promise<boolean> {
    if (MODE === 'on') return true;
    if (MODE === 'off') return false;

    if (cached && Date.now() - cached.at < CACHE_MS) return cached.up;

    let up = false;
    try {
        // Uses the shared axios client so the request goes out exactly like every other API call
        const res = await api.get('/health', { timeout: HEALTH_TIMEOUT_MS });
        up = res.status >= 200 && res.status < 300;
    } catch {
        up = false;
    }
    cached = { up, at: Date.now() };
    return up;
}
