import { isExternalEngine, isLocalProvider } from './externalEngine';

// Google API Services User Data Policy (Limited Use): data from the Google Calendar API
// may be used by the on-device model, but must never be sent to cloud AI providers.

export const GOOGLE_CALENDAR_SOURCE = 'google_calendar' as const;

export const isGoogleSourced = (item: { source?: string } | null | undefined): boolean =>
    item?.source === GOOGLE_CALENDAR_SOURCE;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** True when prompts sent to this engine never leave the user's computer */
export const engineKeepsDataOnDevice = (engine: any): boolean => {
    if (!engine) return true; // no AI: heuristics only
    if (!isExternalEngine(engine)) return true; // WebLLM runs in-process
    if (!isLocalProvider(engine.config.provider)) return false;
    // Ollama / LM Studio URLs are editable, so only trust a loopback address
    try {
        return LOOPBACK_HOSTS.has(new URL(engine.config.baseUrl).hostname);
    } catch {
        return false;
    }
};

/** Drops Google Calendar items unless the engine keeps data on this device */
export const withoutGoogleDataFor = <T extends { source?: string }>(items: T[], engine: any): T[] =>
    engineKeepsDataOnDevice(engine) ? items : items.filter((item) => !isGoogleSourced(item));
