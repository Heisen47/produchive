/**
 * Website URL helpers — builds URLs pointing to the Produchive website
 * with optional token pass-through for seamless auth handoff.
 *
 * Dev  → http://localhost:3000
 * Prod → https://produchive.com
 */

const WEB_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:3000'
  : 'https://produchive.com';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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
 */
export function openWebPage(path: string): void {
  openUrl(getWebUrl(path));
}
