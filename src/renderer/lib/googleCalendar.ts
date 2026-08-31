import { PlannedRoutineItem } from '../components/Routine';

// ─── Cookie Helpers ───
export const setCookie = (name: string, value: string, days = 60) => {
    try {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
    } catch (e) {
        console.error('Failed to set cookie:', e);
    }
};

export const getCookie = (name: string): string | null => {
    try {
        const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
        return match ? decodeURIComponent(match[3]) : null;
    } catch (e) {
        return null;
    }
};

export const deleteCookie = (name: string) => {
    try {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    } catch (e) {
        console.error('Failed to delete cookie:', e);
    }
};

export const getGoogleAuthToken = (): string | null => {
    return getCookie('gcal_oauth_token') || localStorage.getItem('gcal_oauth_token') || null;
};

export const getGoogleUserEmail = (): string | null => {
    return getCookie('gcal_user_email') || localStorage.getItem('gcal_user_email') || null;
};

export const setGoogleAuthToken = (token: string, userEmail?: string) => {
    setCookie('gcal_oauth_token', token, 60);
    localStorage.setItem('gcal_oauth_token', token);
    if (userEmail) {
        setCookie('gcal_user_email', userEmail, 60);
        localStorage.setItem('gcal_user_email', userEmail);
    }
};

export const clearGoogleAuth = () => {
    deleteCookie('gcal_oauth_token');
    deleteCookie('gcal_user_email');
    localStorage.removeItem('gcal_oauth_token');
    localStorage.removeItem('gcal_user_email');
};

export interface GoogleCalendarConfig {
    mode: 'oauth' | 'ical';
    calendarId: string;
    icalUrl: string;
    autoSync: boolean;
    lastSynced: string | null;
    syncDirection: 'two-way' | 'pull-only' | 'push-only';
}

const STORAGE_KEY = 'produchive_gcal_sync_config';

export const getGoogleCalendarConfig = (): GoogleCalendarConfig => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to load Google Calendar config:', e);
    }
    return {
        mode: 'oauth',
        calendarId: 'primary',
        icalUrl: '',
        autoSync: true,
        lastSynced: null,
        syncDirection: 'two-way',
    };
};

export const saveGoogleCalendarConfig = (config: GoogleCalendarConfig) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.error('Failed to save Google Calendar config:', e);
    }
};

// ─── Format Helpers ───
const pad2 = (n: number) => String(n).padStart(2, '0');

const formatICSDate = (dateStr: string, hour: number, minute: number): string => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, hour, minute, 0);
    return dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

const parseICSDate = (icsDateStr: string): { dateStr: string; hour: number; minute: number } => {
    const clean = icsDateStr.replace(/[^0-9T]/g, '');
    if (clean.includes('T')) {
        const [dPart, tPart] = clean.split('T');
        const year = dPart.substring(0, 4);
        const month = dPart.substring(4, 6);
        const day = dPart.substring(6, 8);
        const hour = parseInt(tPart.substring(0, 2), 10) || 0;
        const min = parseInt(tPart.substring(2, 4), 10) || 0;
        return {
            dateStr: `${year}-${month}-${day}`,
            hour,
            minute: min,
        };
    } else {
        const year = clean.substring(0, 4);
        const month = clean.substring(4, 6);
        const day = clean.substring(6, 8);
        return {
            dateStr: `${year}-${month}-${day}`,
            hour: 9,
            minute: 0,
        };
    }
};

const inferCategory = (title: string, description: string = ''): PlannedRoutineItem['category'] => {
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes('code') || text.includes('dev') || text.includes('api') || text.includes('git') || text.includes('bug') || text.includes('frontend') || text.includes('backend') || text.includes('pr')) {
        return 'development';
    }
    if (text.includes('meeting') || text.includes('sync') || text.includes('standup') || text.includes('call') || text.includes('1:1') || text.includes('interview')) {
        return 'meeting';
    }
    if (text.includes('research') || text.includes('study') || text.includes('read') || text.includes('learn') || text.includes('explore')) {
        return 'research';
    }
    if (text.includes('design') || text.includes('ui') || text.includes('ux') || text.includes('figma') || text.includes('mockup')) {
        return 'design';
    }
    if (text.includes('write') || text.includes('doc') || text.includes('notes') || text.includes('article') || text.includes('spec')) {
        return 'writing';
    }
    if (text.includes('lunch') || text.includes('dinner') || text.includes('breakfast') || text.includes('meal') || text.includes('food') || text.includes('eat')) {
        return 'meal';
    }
    if (text.includes('break') || text.includes('coffee') || text.includes('walk') || text.includes('rest') || text.includes('gym') || text.includes('workout')) {
        return 'break';
    }
    if (text.includes('sleep') || text.includes('bed') || text.includes('nap')) {
        return 'sleep';
    }
    return 'other';
};

// ─── 1. Generate Standard RFC 5545 .ics Calendar ───
export const generateICalendar = (routines: PlannedRoutineItem[]): string => {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Produchive//Produchive Routine Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Produchive Routine',
        'X-WR-TIMEZONE:UTC',
    ];

    routines.forEach((r) => {
        const startISO = formatICSDate(r.dateStr, r.startHour, r.startMinute);
        const endMinutes = r.startMinute + r.durationMinutes;
        const endHour = r.startHour + Math.floor(endMinutes / 60);
        const endMin = endMinutes % 60;
        const endISO = formatICSDate(r.dateStr, endHour, endMin);

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:produchive-${r.id}@produchive.app`);
        lines.push(`DTSTAMP:${formatICSDate(r.dateStr, 0, 0)}`);
        lines.push(`DTSTART:${startISO}`);
        lines.push(`DTEND:${endISO}`);
        lines.push(`SUMMARY:${r.title.replace(/[\r\n]/g, ' ')}`);
        if (r.subtitle) {
            lines.push(`DESCRIPTION:${r.subtitle.replace(/[\r\n]/g, ' ')}`);
        }
        lines.push(`CATEGORIES:${r.category.toUpperCase()}`);
        lines.push(`STATUS:${r.completed ? 'COMPLETED' : 'CONFIRMED'}`);
        lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
};

// ─── 2. Parse iCalendar (.ics) String ───
export const parseICalendar = (icsText: string): PlannedRoutineItem[] => {
    const items: PlannedRoutineItem[] = [];
    if (!icsText || !icsText.includes('BEGIN:VEVENT')) return items;

    const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
    const eventBlocks = unfolded.split('BEGIN:VEVENT');

    eventBlocks.slice(1).forEach((block, idx) => {
        const getProp = (propName: string) => {
            const regex = new RegExp(`(?:^|\\r?\\n)${propName}(?:;[^:]*)?:(.*)(?:\\r?\\n|$)`, 'i');
            const match = block.match(regex);
            return match ? match[1].trim() : '';
        };

        const summary = getProp('SUMMARY') || 'Scheduled Activity';
        const description = getProp('DESCRIPTION') || '';
        const dtstart = getProp('DTSTART');
        const dtend = getProp('DTEND');
        const uid = getProp('UID') || `ical-${Date.now()}-${idx}`;
        const status = getProp('STATUS').toUpperCase();

        if (dtstart) {
            const startParsed = parseICSDate(dtstart);
            let durationMinutes = 60;

            if (dtend) {
                const endParsed = parseICSDate(dtend);
                const startTotal = startParsed.hour * 60 + startParsed.minute;
                const endTotal = endParsed.hour * 60 + endParsed.minute;
                if (endTotal > startTotal) {
                    durationMinutes = endTotal - startTotal;
                }
            }

            const [y, m, d] = startParsed.dateStr.split('-').map(Number);
            const eventDate = new Date(y, m - 1, d);

            items.push({
                id: uid.replace(/^produchive-/, '').replace(/@produchive\.app$/, ''),
                title: summary,
                subtitle: description || undefined,
                category: inferCategory(summary, description),
                priority: 'medium',
                dayIndex: eventDate.getDay(),
                dateStr: startParsed.dateStr,
                startHour: startParsed.hour,
                startMinute: startParsed.minute,
                durationMinutes,
                completed: status === 'COMPLETED',
            });
        }
    });

    return items;
};

// ─── 3. Download .ics File ───
export const downloadICalFile = (routines: PlannedRoutineItem[], filename = 'produchive-routine.ics') => {
    const icsContent = generateICalendar(routines);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};

// ─── 4. Fetch Google Calendar via iCal URL / WebCal ───
export const fetchGoogleCalendarViaICal = async (icalUrl: string): Promise<PlannedRoutineItem[]> => {
    if (!icalUrl || !icalUrl.trim()) {
        throw new Error('Please provide a valid Google Calendar iCal URL.');
    }

    let url = icalUrl.trim();
    if (url.startsWith('webcal://')) {
        url = url.replace('webcal://', 'https://');
    }

    try {
        let icsData: string = '';

        if (window.electronAPI && typeof window.electronAPI.fetchUrl === 'function') {
            const res = await window.electronAPI.fetchUrl(url);
            if (!res.ok || !res.data) {
                throw new Error(res.error || `HTTP ${res.status} ${res.statusText}`);
            }
            icsData = res.data;
        } else {
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Failed to fetch calendar: HTTP ${res.status}`);
            }
            icsData = await res.text();
        }

        return parseICalendar(icsData);
    } catch (err: any) {
        console.error('Error fetching Google Calendar iCal:', err);
        throw new Error(`Google Calendar Sync Failed: ${err.message}`);
    }
};

// ─── 5. Fetch Google Calendar via OAuth API v3 ───
export const fetchGoogleCalendarViaAPI = async (
    accessToken: string,
    calendarId = 'primary'
): Promise<PlannedRoutineItem[]> => {
    if (!accessToken || !accessToken.trim()) {
        throw new Error('Google OAuth Access Token is required.');
    }

    const endpoint = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?maxResults=250&singleEvents=true&orderBy=startTime`;

    try {
        let json: any = null;

        if (window.electronAPI && typeof window.electronAPI.fetchUrl === 'function') {
            const res = await window.electronAPI.fetchUrl(endpoint, {
                headers: {
                    Authorization: `Bearer ${accessToken.trim()}`,
                    Accept: 'application/json',
                },
            });
            if (!res.ok || !res.data) {
                throw new Error(res.error || `Google API error: HTTP ${res.status}`);
            }
            json = JSON.parse(res.data);
        } else {
            const res = await fetch(endpoint, {
                headers: {
                    Authorization: `Bearer ${accessToken.trim()}`,
                    Accept: 'application/json',
                },
            });
            if (!res.ok) {
                throw new Error(`Google API error: HTTP ${res.status}`);
            }
            json = await res.json();
        }

        const items: PlannedRoutineItem[] = [];
        const events = json.items || [];

        events.forEach((ev: any) => {
            const startRaw = ev.start?.dateTime || ev.start?.date;
            const endRaw = ev.end?.dateTime || ev.end?.date;
            if (!startRaw) return;

            const startDate = new Date(startRaw);
            const endDate = endRaw ? new Date(endRaw) : new Date(startDate.getTime() + 60 * 60000);

            const durationMinutes = Math.max(15, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
            const y = startDate.getFullYear();
            const m = pad2(startDate.getMonth() + 1);
            const d = pad2(startDate.getDate());
            const dateStr = `${y}-${m}-${d}`;

            items.push({
                id: ev.id || `gcal-${Date.now()}`,
                title: ev.summary || 'Google Calendar Event',
                subtitle: ev.description || ev.location || undefined,
                category: inferCategory(ev.summary || '', ev.description || ''),
                priority: 'medium',
                dayIndex: startDate.getDay(),
                dateStr,
                startHour: startDate.getHours(),
                startMinute: startDate.getMinutes(),
                durationMinutes,
                completed: false,
            });
        });

        return items;
    } catch (err: any) {
        console.error('Error fetching Google Calendar API:', err);
        throw new Error(`Google Calendar API error: ${err.message}`);
    }
};

// ─── 6. Push Routine to Google Calendar via REST API ───
export const pushRoutineToGoogleAPI = async (
    accessToken: string,
    routine: PlannedRoutineItem,
    calendarId = 'primary'
) => {
    const endpoint = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

    const [y, m, d] = routine.dateStr.split('-').map(Number);
    const startObj = new Date(y, m - 1, d, routine.startHour, routine.startMinute, 0);
    const endTotalMins = routine.startMinute + routine.durationMinutes;
    const endObj = new Date(y, m - 1, d, routine.startHour + Math.floor(endTotalMins / 60), endTotalMins % 60, 0);

    const body = {
        summary: routine.title,
        description: routine.subtitle || `Category: ${routine.category} • Produchive Routine Planner`,
        start: {
            dateTime: startObj.toISOString(),
        },
        end: {
            dateTime: endObj.toISOString(),
        },
    };

    if (window.electronAPI && typeof window.electronAPI.fetchUrl === 'function') {
        const res = await window.electronAPI.fetchUrl(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken.trim()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(res.error || `Failed to push event: HTTP ${res.status}`);
        return JSON.parse(res.data || '{}');
    } else {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken.trim()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Failed to push event: HTTP ${res.status}`);
        return await res.json();
    }
};

// ─── 7. Full 2-Way Sync Engine (Reads from Cookie / Storage) ───
export const performGoogleCalendarSync = async (
    currentRoutines: PlannedRoutineItem[],
    customConfig?: GoogleCalendarConfig
): Promise<{
    updatedRoutines: PlannedRoutineItem[];
    pulledCount: number;
    pushedCount: number;
}> => {
    const config = customConfig || getGoogleCalendarConfig();
    const token = getGoogleAuthToken();

    let remoteItems: PlannedRoutineItem[] = [];
    let pushedCount = 0;

    if (token) {
        // Authenticated with Google OAuth
        remoteItems = await fetchGoogleCalendarViaAPI(token, config.calendarId || 'primary');

        if (config.syncDirection === 'two-way' || config.syncDirection === 'push-only') {
            const remoteTitles = new Set(remoteItems.map((r) => `${r.dateStr}-${r.startHour}-${r.title.toLowerCase()}`));
            for (const localItem of currentRoutines) {
                const key = `${localItem.dateStr}-${localItem.startHour}-${localItem.title.toLowerCase()}`;
                if (!remoteTitles.has(key)) {
                    try {
                        await pushRoutineToGoogleAPI(token, localItem, config.calendarId || 'primary');
                        pushedCount++;
                    } catch (e) {
                        console.warn('Could not push routine:', localItem.title, e);
                    }
                }
            }
        }
    } else if (config.icalUrl) {
        // iCal Feed Mode
        remoteItems = await fetchGoogleCalendarViaICal(config.icalUrl);
    } else {
        throw new Error('Please sign in with Google or provide a calendar link to sync.');
    }

    // Merge remote items with local routines
    const routineMap = new Map<string, PlannedRoutineItem>();
    currentRoutines.forEach((r) => routineMap.set(r.id, r));

    let pulledCount = 0;
    remoteItems.forEach((remote) => {
        const existingKey = Array.from(routineMap.values()).find(
            (r) => r.id === remote.id || (r.dateStr === remote.dateStr && r.startHour === remote.startHour && r.title.toLowerCase() === remote.title.toLowerCase())
        );

        if (!existingKey) {
            routineMap.set(remote.id, remote);
            pulledCount++;
        }
    });

    const updatedRoutines = Array.from(routineMap.values());

    config.lastSynced = new Date().toISOString();
    saveGoogleCalendarConfig(config);

    try {
        localStorage.setItem('produchive_master_routines', JSON.stringify(updatedRoutines));
        window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
    } catch (e) {
        console.error(e);
    }

    return {
        updatedRoutines,
        pulledCount,
        pushedCount,
    };
};
