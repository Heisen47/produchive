/**
 * Website URL helpers — builds URLs pointing to the Produchive website
 * with optional token pass-through for seamless auth handoff.
 *
 * All base URLs come from config.ts (single source of truth).
 */

import { API_BASE_URL, WEB_BASE_URL, FEEDBACK_GOOGLE_FORM_URL } from './config';
import { isServerUp, SERVER_NAP_URL } from './serverStatus';

// Re-export so existing `import { WEB_BASE_URL } from '../lib/urls'` still works.
export { WEB_BASE_URL, FEEDBACK_GOOGLE_FORM_URL };

/**
 * Build a website URL with optional auth token attached as a query param.
 * Routes through the backend /auth/redirect endpoint to force a hard reload in the browser.
 */
export function getWebUrl(path: string): string {
  const token = sessionStorage.getItem('token');
  const base = `${API_BASE_URL}/auth/redirect?path=${encodeURIComponent(path)}`;
  if (token) {
    return `${base}&token=${encodeURIComponent(token)}`;
  }
  return base;
}

/**
 * Open a raw URL in the user's default system browser.
 * Uses Electron's shell.openExternal via IPC with a fallback to window.open
 * if running in web context or if IPC is not yet loaded.
 */
export function openUrl(url: string): void {
  if (window.electronAPI && typeof window.electronAPI.openExternalUrl === 'function') {
    window.electronAPI.openExternalUrl(url);
  } else {
    console.warn('window.electronAPI.openExternalUrl not available. Falling back to window.open.');
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Open a website page in the user's default system browser.
 * Uses Electron's shell.openExternal via IPC so the URL opens as
 * a new tab in Chrome/Safari/Firefox — not an Electron child window.
 * The normal route hops through the backend for the token handoff; when the
 * backend is down, the page is opened on the website directly instead.
 */
export function openWebPage(path: string): void {
  isServerUp().then((up) => openUrl(up ? getWebUrl(path) : `${WEB_BASE_URL}${path}`));
}

/**
 * For features that need the backend (sign-in, Premium, multiplayer rooms).
 * Returns true when the backend is up; otherwise opens the website's
 * "server is napping" page and returns false.
 */
export async function requireServer(): Promise<boolean> {
  if (await isServerUp()) return true;
  openUrl(SERVER_NAP_URL);
  return false;
}

/** Open a website page that needs the backend, or the "server is napping" page when it's down. */
export function openServerPage(path: string): void {
  requireServer().then((up) => {
    if (up) openUrl(getWebUrl(path));
  });
}

/**
 * Open the Google Feedback Form in the user's default system browser.
 */
export function openFeedbackForm(): void {
  openUrl(FEEDBACK_GOOGLE_FORM_URL);
}

