/// <reference types="vite/client" />

/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║  SINGLE SOURCE OF TRUTH for all environment URLs.        ║
 * ║                                                          ║
 * ║  Dev   → localhost defaults (no env vars needed)         ║
 * ║  Prod  → produchive.com (default for packaged builds)    ║
 * ║  QA    → override via VITE_API_URL / VITE_WEB_URL        ║
 * ║         e.g.  npm run make:qa                            ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

/** Backend API base URL (no trailing slash). */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:4000' : 'https://api.produchive.com');

/** Frontend / marketing website base URL (no trailing slash). */
export const WEB_BASE_URL: string =
  import.meta.env.VITE_WEB_URL
  || (import.meta.env.DEV ? 'http://localhost:3000' : 'https://produchive.com');

/**
 * WebSocket base URL — derived from API_BASE_URL by swapping http → ws.
 * e.g. https://api.produchive.com → wss://api.produchive.com
 */
export const WS_BASE_URL: string = API_BASE_URL.replace(/^http/, 'ws');
