import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    Clock,
    Plus,
    Sparkles,
    Lightbulb,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Trash2,
    RefreshCw,
    CheckCircle2,
    Circle,
    X,
    ListTodo,
    Download,
    AlertCircle,
    GripVertical,
    Edit3,
    Activity as ActivityIcon,
    Save,
    ArrowRightLeft,
    ArrowLeft,
    Check,
    Moon,
    Loader2,
    ThumbsUp,
    ThumbsDown,
    Target,
    Quote
} from 'lucide-react';
import { submitActivityFeedback } from '../lib/activityAutoTracker';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';
import { Activity } from '../global';
import { GoogleOAuthModal } from './GoogleOAuthModal';
import { LoginModal } from './LoginModal';
import { TotoroBusStopBg } from './TotoroBusStopBg';
import { getGoogleAuthToken, getGoogleCalendarConfig, performGoogleCalendarSync, isGoogleCalendarConnected, isCalendarSyncUpToDate } from '../lib/googleCalendar';
import {
    distributeSmartSchedule,
    allocateProductiveTaskDurations,
    recalculateSequentialSchedule,
    generateForwardSmartSchedule,
    generateWeeklySmartSchedule,
    autoBalanceSchedule,
    getMindsetCardData,
    calculateDayEventCollisions,
    resolveCollisionsSequentially,
    EventCollisionInfo,
    TaskToSchedule
} from '../lib/smartScheduler';

// ─── Types ───
import type { PlannedRoutineItem, ActivityGuess } from '../types/routine';
export type { PlannedRoutineItem, ActivityGuess };

// ─── Categories & Styling with Proper Contrast for Light & Dark Mode ───
const getEventColors = (category: string, isDark: boolean) => {
    if (isDark) {
        const darkMap: Record<string, { bg: string; border: string; accent: string; text: string; subtext: string }> = {
            development: { bg: '#232738', border: '#4f52b2', accent: '#7b83eb', text: '#f8fafc', subtext: '#94a3b8' },
            meeting: { bg: '#2e2646', border: '#7c6cb8', accent: '#a594f9', text: '#f8fafc', subtext: '#cbd5e1' },
            research: { bg: '#1c2b3d', border: '#3b82f6', accent: '#60a5fa', text: '#f8fafc', subtext: '#94a3b8' },
            design: { bg: '#16313f', border: '#06b6d4', accent: '#22d3ee', text: '#f8fafc', subtext: '#94a3b8' },
            writing: { bg: '#16332d', border: '#10b981', accent: '#34d399', text: '#f8fafc', subtext: '#94a3b8' },
            meal: { bg: '#36241a', border: '#f97316', accent: '#fb923c', text: '#fff7ed', subtext: '#fed7aa' },
            break: { bg: '#322817', border: '#f59e0b', accent: '#fbbf24', text: '#fefce8', subtext: '#fde68a' },
            sleep: { bg: '#191b30', border: '#6366f1', accent: '#818cf8', text: '#e0e7ff', subtext: '#c7d2fe' },
            other: { bg: '#1e222e', border: '#64748b', accent: '#94a3b8', text: '#f8fafc', subtext: '#94a3b8' },
        };
        return darkMap[category] || darkMap.other;
    } else {
        const lightMap: Record<string, { bg: string; border: string; accent: string; text: string; subtext: string }> = {
            development: { bg: '#eef2ff', border: '#818cf8', accent: '#4338ca', text: '#1e1b4b', subtext: '#4338ca' },
            meeting: { bg: '#f5f3ff', border: '#a78bfa', accent: '#6d28d9', text: '#2e1065', subtext: '#5b21b6' },
            research: { bg: '#eff6ff', border: '#60a5fa', accent: '#1d4ed8', text: '#172554', subtext: '#1e40af' },
            design: { bg: '#ecfeff', border: '#22d3ee', accent: '#0e7490', text: '#083344', subtext: '#0e7490' },
            writing: { bg: '#ecfdf5', border: '#34d399', accent: '#047857', text: '#022c22', subtext: '#065f46' },
            meal: { bg: '#fff7ed', border: '#fb923c', accent: '#c2410c', text: '#431407', subtext: '#9a3412' },
            break: { bg: '#fefce8', border: '#fcd34d', accent: '#b45309', text: '#451a03', subtext: '#92400e' },
            sleep: { bg: '#e0e7ff', border: '#818cf8', accent: '#3730a3', text: '#1e1b4b', subtext: '#312e81' },
            other: { bg: '#f1f5f9', border: '#94a3b8', accent: '#334155', text: '#0f172a', subtext: '#475569' },
        };
        return lightMap[category] || lightMap.other;
    }
};

// ─── Date Helpers ───
const formatDateStr = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getStartOfWeek = (d: Date): Date => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    return new Date(date.setDate(diff));
};

const formatHourLabel = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
};

const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
};

const formatTimeSlot = (hour: number, minute: number = 0) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const minStr = minute < 10 ? `0${minute}` : `${minute}`;
    return `${displayHour}:${minStr} ${period}`;
};

const getDaysInMonthGrid = (year: number, month: number) => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startingDay = firstDayOfMonth.getDay() - 1;
    if (startingDay === -1) startingDay = 6;

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
        days.push({
            date: new Date(year, month - 1, prevMonthLastDay - i),
            isCurrentMonth: false,
        });
    }

    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
        days.push({
            date: new Date(year, month, i),
            isCurrentMonth: true,
        });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
        days.push({
            date: new Date(year, month + 1, i),
            isCurrentMonth: false,
        });
    }

    return days;
};

// ─── Activity Guesser Engine ───
const guessActivityForHour = (hourActivities: Activity[]): ActivityGuess | null => {
    if (!hourActivities || hourActivities.length === 0) return null;

    const appUsage: Record<string, { seconds: number; titles: string[] }> = {};
    let totalSeconds = 0;

    hourActivities.forEach((act) => {
        const dur = act.duration ? act.duration / 1000 : 1;
        totalSeconds += dur;
        const appName = act.owner?.name || 'Unknown';
        if (!appUsage[appName]) {
            appUsage[appName] = { seconds: 0, titles: [] };
        }
        appUsage[appName].seconds += dur;
        if (act.title && !appUsage[appName].titles.includes(act.title)) {
            appUsage[appName].titles.push(act.title);
        }
    });

    const sortedApps = Object.entries(appUsage)
        .map(([name, data]) => ({ name, seconds: data.seconds, titles: data.titles }))
        .sort((a, b) => b.seconds - a.seconds);

    const top = sortedApps[0];
    if (!top) return null;
    const topName = top.name.toLowerCase();
    const topTitle = (top.titles[0] || '').toLowerCase();

    let category = 'other';
    let label = 'General Computer Usage';

    if (
        topName.includes('code') ||
        topName.includes('cursor') ||
        topName.includes('studio') ||
        topName.includes('xcode') ||
        topName.includes('intellij') ||
        topName.includes('terminal') ||
        topName.includes('iterm') ||
        topName.includes('warp') ||
        topName.includes('git') ||
        topTitle.includes('.ts') ||
        topTitle.includes('.tsx') ||
        topTitle.includes('.js') ||
        topTitle.includes('.py') ||
        topTitle.includes('github') ||
        topTitle.includes('localhost')
    ) {
        category = 'development';
        label = 'Software Engineering';
    } else if (
        topName.includes('slack') ||
        topName.includes('teams') ||
        topName.includes('discord') ||
        topName.includes('zoom') ||
        topName.includes('meet') ||
        topName.includes('telegram') ||
        topName.includes('whatsapp') ||
        topName.includes('mail') ||
        topName.includes('outlook')
    ) {
        category = 'meeting';
        label = 'Team Collaboration';
    } else if (
        topName.includes('figma') ||
        topName.includes('photoshop') ||
        topName.includes('illustrator') ||
        topName.includes('canva') ||
        topName.includes('sketch')
    ) {
        category = 'design';
        label = 'UI / UX Design';
    } else if (
        topName.includes('notion') ||
        topName.includes('obsidian') ||
        topName.includes('word') ||
        topName.includes('notes') ||
        topTitle.includes('docs.google')
    ) {
        category = 'writing';
        label = 'Documentation';
    } else if (
        topName.includes('chrome') ||
        topName.includes('safari') ||
        topName.includes('brave') ||
        topName.includes('firefox') ||
        topName.includes('edge') ||
        topName.includes('arc')
    ) {
        if (
            topTitle.includes('youtube') ||
            topTitle.includes('netflix') ||
            topTitle.includes('reddit') ||
            topTitle.includes('twitter')
        ) {
            category = 'break';
            label = 'Media Break';
        } else {
            category = 'research';
            label = 'Technical Research';
        }
    }

    const confidence = Math.min(98, Math.round((top.seconds / (totalSeconds || 1)) * 100));

    return {
        category,
        label,
        confidence,
        topApp: top.name,
        topTitle: top.titles[0] || top.name,
        totalSeconds,
        appBreakdown: sortedApps.map((a) => ({ name: a.name, seconds: a.seconds })),
    };
};

export const Routine = () => {
    const { activities, tasks, user } = useStore();
    const { isDark } = useTheme();

    // ─── View Modes: 'work_week' (5 days) | 'week' (7 days) | 'day' (1 day) ───
    const [viewMode, setViewMode] = useState<'work_week' | 'week' | 'day'>('work_week');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [pickerMonth, setPickerMonth] = useState<Date>(new Date());
    const [isMakerOpen, setIsMakerOpen] = useState(false);
    const [isGoogleSyncOpen, setIsGoogleSyncOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(() => isGoogleCalendarConnected());
    const [isDirectSyncing, setIsDirectSyncing] = useState(false);
    const [syncToast, setSyncToast] = useState<string | null>(null);
    const [draggedItem, setDraggedItem] = useState<PlannedRoutineItem | null>(null);
    const [dragError, setDragError] = useState<string | null>(null);

    const checkGoogleAuth = () => {
        const connected = isGoogleCalendarConnected();
        setIsGoogleLoggedIn(connected);
    };

    // Google Calendar Sync (Temporarily disabled - Under Google OAuth review)
    const handleDirectSync = async () => {
        // Disabled pending Google review
        /*
        setIsDirectSyncing(true);
        try {
            const res = await performGoogleCalendarSync(allRoutines);
            setAllRoutines(res.updatedRoutines);
            const msg = res.pulledCount > 0 || res.pushedCount > 0
                ? `Synced with Google Calendar! (+${res.pulledCount} events, ${res.pushedCount} uploaded)`
                : `Google Calendar up to date!`;
            setSyncToast(msg);
            setTimeout(() => setSyncToast(null), 4000);
        } catch (err: any) {
            console.error('Direct sync failed:', err);
            setIsLoginModalOpen(true);
        } finally {
            setIsDirectSyncing(false);
        }
        */
    };

    // Google Calendar Auto-Sync and Login State Listener (Disabled pending Google review)
    useEffect(() => {
        checkGoogleAuth();
        const handleAuthChange = () => checkGoogleAuth();

        window.addEventListener('storage', handleAuthChange);
        window.addEventListener('produchive_routine_updated', handleAuthChange);

        /*
        const handleGcalAuth = () => {
            checkGoogleAuth();
            handleDirectSync();
        };
        window.addEventListener('produchive_gcal_authenticated', handleGcalAuth);

        const config = getGoogleCalendarConfig();
        const token = getGoogleAuthToken();
        if (config.autoSync && (config.icalUrl || token)) {
            performGoogleCalendarSync(allRoutines)
                .then((res) => {
                    if (res.pulledCount > 0) {
                        setAllRoutines(res.updatedRoutines);
                    }
                })
                .catch((e) => console.log('Auto GCal sync:', e.message));
        }
        */

        return () => {
            window.removeEventListener('storage', handleAuthChange);
            window.removeEventListener('produchive_routine_updated', handleAuthChange);
            // window.removeEventListener('produchive_gcal_authenticated', handleGcalAuth);
        };
    }, [user]);

    // Sync picker month when selectedDate changes
    useEffect(() => {
        setPickerMonth(new Date(selectedDate));
    }, [selectedDate]);

    // ─── Double-Click Detail Modal States ───
    const [selectedRoutineDetails, setSelectedRoutineDetails] = useState<PlannedRoutineItem | null>(null);
    const [selectedActivityDetails, setSelectedActivityDetails] = useState<{
        dateStr: string;
        hour: number;
        guess: ActivityGuess;
    } | null>(null);

    // Multi-app overflow collapse modal
    const [slotAppsModal, setSlotAppsModal] = useState<{
        dateStr: string;
        hour: number;
        items: PlannedRoutineItem[];
    } | null>(null);

    const handleRateActivity = async (
        e: React.MouseEvent,
        item: PlannedRoutineItem,
        rating: 'accurate' | 'inaccurate',
        corrections?: { category?: PlannedRoutineItem['category']; title?: string }
    ) => {
        e.stopPropagation();
        await submitActivityFeedback(item.id, rating, corrections);
        try {
            const saved = localStorage.getItem('produchive_master_routines');
            if (saved) {
                setAllRoutines(JSON.parse(saved));
            }
        } catch (_) {}
    };

    // Range activities from database
    const [rangeActivities, setRangeActivities] = useState<Record<string, { activities: Activity[] }>>({});

    // Current Time & TimeZone
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const todayStr = formatDateStr(now);

    const userTimeZoneLabel = useMemo(() => {
        try {
            const offset = -new Date().getTimezoneOffset();
            const sign = offset >= 0 ? '+' : '-';
            const absOffset = Math.abs(offset);
            const hours = Math.floor(absOffset / 60);
            const mins = absOffset % 60;
            return `GMT${sign}${hours}${mins > 0 ? `:${mins < 10 ? '0' : ''}${mins}` : ''}`;
        } catch {
            return 'Local';
        }
    }, []);

    // ─── Week Days Calculation ───
    const startOfWeek = useMemo(() => getStartOfWeek(selectedDate), [selectedDate]);
    const displayDays = useMemo(() => {
        if (viewMode === 'day') {
            return [selectedDate];
        }
        const count = viewMode === 'work_week' ? 5 : 7;
        return Array.from({ length: count }).map((_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [selectedDate, startOfWeek, viewMode]);

    // ─── Routine Storage ───
    // Track if all local routine items are in sync with Google Calendar
    // (Disables the sync button when up to date, re-enables on any change)
    const [allRoutines, setAllRoutines] = useState<PlannedRoutineItem[]>(() => {
        try {
            const saved = localStorage.getItem('produchive_master_routines');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load master routines:', e);
        }
        return [];
    });

    const isSynced = isGoogleLoggedIn && isCalendarSyncUpToDate(allRoutines);

    const saveMasterRoutines = (items: PlannedRoutineItem[]) => {
        const previousRoutines = allRoutines;
        setAllRoutines(items);
        try {
            localStorage.setItem('produchive_master_routines', JSON.stringify(items));
            window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
        } catch (e) {
            console.error('Failed to save master routines:', e);
        }

        // Bidirectional sync: sync completion state with tasks in store & DB
        try {
            const currentTasks = useStore.getState().tasks;
            items.forEach((item) => {
                const prev = previousRoutines.find((r) => r.id === item.id);
                if (prev && prev.completed !== item.completed) {
                    const itemTitle = item.title.trim().toLowerCase();
                    const matchingTask = currentTasks.find(
                        (t) =>
                            item.taskId === t.id ||
                            t.text.trim().toLowerCase() === itemTitle ||
                            itemTitle.includes(t.text.trim().toLowerCase())
                    );
                    if (matchingTask && matchingTask.completed !== item.completed && window.electronAPI?.updateTask) {
                        window.electronAPI.updateTask({ ...matchingTask, completed: item.completed }).then((tasks) => {
                            useStore.setState({ tasks });
                        }).catch(console.error);
                    }
                }
            });
        } catch (err) {
            console.error('Error syncing routine with tasks:', err);
        }
    };

    // ─── Listen for external routine updates (e.g. from Auto-Confirmation popup) ───
    useEffect(() => {
        const handleRoutineUpdate = () => {
            try {
                const saved = localStorage.getItem('produchive_master_routines');
                if (saved) {
                    setAllRoutines(JSON.parse(saved));
                }
            } catch (e) {
                console.error(e);
            }
        };

        window.addEventListener('produchive_routine_updated', handleRoutineUpdate);
        window.addEventListener('storage', handleRoutineUpdate);
        return () => {
            window.removeEventListener('produchive_routine_updated', handleRoutineUpdate);
            window.removeEventListener('storage', handleRoutineUpdate);
        };
    }, []);

    // ─── Fetch Activity Data for displayed range ───
    useEffect(() => {
        const fetchRange = async () => {
            try {
                if (displayDays.length > 0) {
                    const startStr = formatDateStr(displayDays[0]);
                    const endStr = formatDateStr(displayDays[displayDays.length - 1]);
                    const data = await window.electronAPI.getActivityDataRange(startStr, endStr);
                    setRangeActivities(data || {});
                }
            } catch (e) {
                console.error('Failed to fetch range activities:', e);
            }
        };
        fetchRange();
    }, [displayDays]);

    // ─── Precompute Overlapping Task Collision Layouts per Day (Side-by-side positioning) ───
    const collisionsByDate = useMemo(() => {
        const map = new Map<string, Map<string, EventCollisionInfo>>();
        const grouped = new Map<string, PlannedRoutineItem[]>();

        for (const r of allRoutines) {
            if (!grouped.has(r.dateStr)) {
                grouped.set(r.dateStr, []);
            }
            grouped.get(r.dateStr)!.push(r);
        }

        for (const [dStr, dayItems] of grouped.entries()) {
            map.set(dStr, calculateDayEventCollisions(dayItems));
        }
        return map;
    }, [allRoutines]);

    // ─── Routine Maker Form State (Day vs Week Planner) ───
    const [planScope, setPlanScope] = useState<'day' | 'week'>('day');
    const [selectedPreviewDay, setSelectedPreviewDay] = useState<string>('all');
    const [allottedHours, setAllottedHours] = useState<number>(6);
    const [weeklyTotalHours, setWeeklyTotalHours] = useState<number>(20);
    const [includeSaturday, setIncludeSaturday] = useState<boolean>(false);
    const [includeSunday, setIncludeSunday] = useState<boolean>(false);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [makerPhase, setMakerPhase] = useState<'input' | 'preview'>('input');
    const [startHourInput, setStartHourInput] = useState<number>(9);
    const [weekStartHourInput, setWeekStartHourInput] = useState<number>(9);
    const [includeBreakfast, setIncludeBreakfast] = useState<boolean>(false);
    const [includeLunch, setIncludeLunch] = useState<boolean>(true);
    const [includeRestBlocks, setIncludeRestBlocks] = useState<boolean>(true);
    const [includeDinner, setIncludeDinner] = useState<boolean>(true);
    const [makerTasks, setMakerTasks] = useState<
        Array<{ title: string; category?: PlannedRoutineItem['category']; priority?: PlannedRoutineItem['priority'] }>
    >([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [previewSchedule, setPreviewSchedule] = useState<PlannedRoutineItem[]>([]);

    // Active week dates (Monday to Friday default; includes Sat/Sun if user opts in)
    const activeWeekDates = useMemo(() => {
        return displayDays
            .filter((d) => {
                const dayNum = d.getDay(); // 0 is Sunday, 6 is Saturday
                if (dayNum === 6) return includeSaturday;
                if (dayNum === 0) return includeSunday;
                return true; // Monday to Friday (work week)
            })
            .map((d) => formatDateStr(d));
    }, [displayDays, includeSaturday, includeSunday]);

    // ─── Personalized Task Suggestions (Derived from user's history and task backlog) ───
    const personalizedTaskSuggestions = useMemo(() => {
        const routineIgnore = new Set([
            'breakfast', 'lunch', 'dinner', 'rest blocks', 'rest break', 'coffee', 'walk',
            'night sleep & recovery', 'night sleep', 'evening walk & unwind', 'afternoon recharge & coffee',
            'core focus & deep work', 'task execution & review'
        ]);

        const taskMap = new Map<string, { title: string; category?: PlannedRoutineItem['category']; priority?: PlannedRoutineItem['priority']; count: number }>();

        // 1. From allRoutines (past schedules user has worked on or applied)
        for (const r of allRoutines) {
            const low = r.title.trim().toLowerCase();
            if (!low || routineIgnore.has(low) || r.category === 'meal' || r.category === 'sleep') continue;
            const key = low;
            if (!taskMap.has(key)) {
                taskMap.set(key, { title: r.title.trim(), category: r.category, priority: r.priority, count: 1 });
            } else {
                taskMap.get(key)!.count += 1;
            }
        }

        // 2. From tasks in useStore (user's task backlog)
        for (const t of tasks || []) {
            const titleStr = t.text || '';
            const low = titleStr.trim().toLowerCase();
            if (!low) continue;
            const key = low;
            if (!taskMap.has(key)) {
                taskMap.set(key, { title: titleStr.trim(), category: 'development', priority: 'high', count: 3 });
            } else {
                taskMap.get(key)!.count += 3;
            }
        }

        // 3. Fallback smart defaults if user has little to no history yet
        const defaults: Array<{ title: string; category: PlannedRoutineItem['category']; priority: PlannedRoutineItem['priority']; count: number }> = [
            { title: 'Leetcode & DSA', category: 'development', priority: 'high', count: 0 },
            { title: 'Video Editing', category: 'writing', priority: 'high', count: 0 },
            { title: 'Feature Development', category: 'development', priority: 'high', count: 0 },
            { title: 'System Design Study', category: 'development', priority: 'high', count: 0 },
            { title: 'Code Review & PRs', category: 'writing', priority: 'medium', count: 0 },
        ];

        for (const d of defaults) {
            const key = d.title.toLowerCase();
            if (!taskMap.has(key)) {
                taskMap.set(key, d);
            }
        }

        // Filter out tasks that are ALREADY added to makerTasks
        const existingTitles = new Set(makerTasks.map((t) => t.title.trim().toLowerCase()));

        return Array.from(taskMap.values())
            .filter((t) => !existingTitles.has(t.title.toLowerCase()))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [allRoutines, tasks, makerTasks]);

    // When opening Plan Your Day modal for today, automatically default startHourInput to current future hour
    useEffect(() => {
        if (isMakerOpen) {
            const isToday = formatDateStr(selectedDate) === todayStr;
            if (isToday) {
                const nowHour = new Date().getHours();
                setStartHourInput(Math.min(23, nowHour));
            } else {
                setStartHourInput(9);
            }
        }
    }, [isMakerOpen, selectedDate, todayStr]);

    // ─── Smart Forward Schedule Generator (Day vs Week Mode) ───
    const handleGenerateSchedule = () => {
        if (makerTasks.length === 0 && !includeLunch && !includeDinner && !includeBreakfast) return;
        setIsGenerating(true);

        setTimeout(() => {
            if (planScope === 'week') {
                const currentH = new Date().getHours();
                const newItems = generateWeeklySmartSchedule({
                    weekDates: activeWeekDates,
                    tasks: makerTasks,
                    totalWeeklyHours: weeklyTotalHours,
                    defaultStartHour: weekStartHourInput,
                    todayDateStr: todayStr,
                    todayCurrentHour: currentH,
                    includeBreakfast,
                    includeLunch,
                    includeRestBlocks,
                    includeDinner,
                });
                setPreviewSchedule(newItems);
                setSelectedPreviewDay('all');
                setMakerPhase('preview');
                setIsGenerating(false);
                return;
            }

            const targetDateStr = formatDateStr(selectedDate);
            const isSelectedToday = targetDateStr === todayStr;
            const currentH = new Date().getHours();
            const actualStartHour = isSelectedToday ? Math.max(startHourInput, currentH) : startHourInput;
            const allottedMinutes = Math.max(30, allottedHours * 60);

            const newItems = generateForwardSmartSchedule({
                tasks: makerTasks,
                allottedMinutes,
                startHour: actualStartHour,
                startMinute: 0,
                dateStr: targetDateStr,
                includeBreakfast,
                includeLunch,
                includeRestBlocks,
                includeDinner,
            });

            setPreviewSchedule(newItems);
            setMakerPhase('preview');
            setIsGenerating(false);
        }, 750);
    };

    const handleApplySchedule = () => {
        if (planScope === 'week') {
            const activeDatesSet = new Set(activeWeekDates);
            const otherRoutines = allRoutines.filter((r) => !activeDatesSet.has(r.dateStr));
            saveMasterRoutines([...otherRoutines, ...previewSchedule]);
            setIsMakerOpen(false);
            setMakerPhase('input');
            setPreviewSchedule([]);
            setSyncToast(`${activeWeekDates.length}-Day Weekly Schedule applied! 🚀`);
            setTimeout(() => setSyncToast(null), 4000);
            return;
        }

        const targetDateStr = formatDateStr(selectedDate);
        const otherRoutines = allRoutines.filter((r) => r.dateStr !== targetDateStr);
        saveMasterRoutines([...otherRoutines, ...previewSchedule]);
        setIsMakerOpen(false);
        setMakerPhase('input');
        setPreviewSchedule([]);
        setSyncToast('Schedule applied to Routine planner! 🎯');
        setTimeout(() => setSyncToast(null), 4000);
    };

    const handleUpdatePreviewDuration = (itemId: string, newDuration: number) => {
        const itemToUpdate = previewSchedule.find((i) => i.id === itemId);
        if (!itemToUpdate) return;

        const targetDateStr = itemToUpdate.dateStr;
        const isSelectedToday = targetDateStr === todayStr;
        const currentH = new Date().getHours();
        const actualStartHour = isSelectedToday ? Math.max(startHourInput, currentH) : startHourInput;

        if (planScope === 'week') {
            const dayItems = previewSchedule.filter((i) => i.dateStr === targetDateStr);
            const otherDaysItems = previewSchedule.filter((i) => i.dateStr !== targetDateStr);
            const dayTargetMins = Math.max(30, Math.round((weeklyTotalHours * 60) / Math.max(1, activeWeekDates.length)));
            const balancedDay = autoBalanceSchedule(dayItems, itemId, newDuration, dayTargetMins, actualStartHour, 0);
            setPreviewSchedule([...otherDaysItems, ...balancedDay]);
            return;
        }

        setPreviewSchedule((prev) => {
            return autoBalanceSchedule(prev, itemId, newDuration, allottedHours * 60, actualStartHour, 0);
        });
    };

    const handleRemovePreviewItem = (itemId: string) => {
        const itemToRemove = previewSchedule.find((i) => i.id === itemId);
        if (!itemToRemove) return;

        const targetDateStr = itemToRemove.dateStr;
        const isSelectedToday = targetDateStr === todayStr;
        const currentH = new Date().getHours();
        const actualStartHour = isSelectedToday ? Math.max(startHourInput, currentH) : startHourInput;

        if (planScope === 'week') {
            const dayItems = previewSchedule.filter((i) => i.dateStr === targetDateStr && i.id !== itemId);
            const otherDaysItems = previewSchedule.filter((i) => i.dateStr !== targetDateStr);
            const recalculatedDay = recalculateSequentialSchedule(dayItems, actualStartHour, 0);
            setPreviewSchedule([...otherDaysItems, ...recalculatedDay]);
            return;
        }

        setPreviewSchedule((prev) => {
            const filtered = prev.filter((item) => item.id !== itemId);
            return recalculateSequentialSchedule(filtered, actualStartHour, 0);
        });
    };

    // ─── Drag and Drop Handlers with Past Task & Past Timeslot Blocking ───
    const handleDragStart = (e: React.DragEvent, item: PlannedRoutineItem) => {
        const isPast = item.dateStr < todayStr || (item.dateStr === todayStr && item.startHour < currentHour);
        if (isPast) {
            e.preventDefault();
            setDragError(`Past tasks cannot be moved! (${item.title} is from a past timeslot).`);
            setTimeout(() => setDragError(null), 4500);
            return;
        }
        setDraggedItem(item);
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, targetHour: number, targetDateStr: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetHour: number, targetDateStr: string) => {
        e.preventDefault();
        if (!draggedItem) return;

        const isSourcePast = draggedItem.dateStr < todayStr || (draggedItem.dateStr === todayStr && draggedItem.startHour < currentHour);
        if (isSourcePast) {
            setDragError(`Past tasks cannot be dragged to the future! (${draggedItem.title} belongs to a past timeslot).`);
            setTimeout(() => setDragError(null), 4500);
            setDraggedItem(null);
            return;
        }

        const isTargetPast = targetDateStr < todayStr || (targetDateStr === todayStr && targetHour < currentHour);
        if (isTargetPast) {
            setDragError(`Cannot drag tasks into the past! (${formatHourLabel(targetHour)} has already passed). Drag to ${formatHourLabel(currentHour)} or later.`);
            setTimeout(() => setDragError(null), 4500);
            setDraggedItem(null);
            return;
        }

        const updated = allRoutines.map((item) => {
            if (item.id === draggedItem.id) {
                return {
                    ...item,
                    dateStr: targetDateStr,
                    startHour: targetHour,
                    startMinute: 0,
                };
            }
            return item;
        });

        saveMasterRoutines(updated);
        setDraggedItem(null);
    };

    const handleImportTasks = () => {
        const uncompleted = (tasks || []).filter((t) => !t.completed);
        if (uncompleted.length === 0) return;

        const imported = uncompleted.map((t) => ({
            title: t.text,
            category: 'development' as const,
            priority: 'high' as const,
        }));

        setMakerTasks((prev) => [...prev, ...imported]);
    };

    const handleDateStep = (step: number) => {
        const d = new Date(selectedDate);
        const days = viewMode === 'day' ? step : step * 7;
        d.setDate(d.getDate() + days);
        setSelectedDate(d);
    };

    // Range of date strings for current view (Day, Work week, or Full week)
    const displayRangeDateStrs = useMemo(
        () => new Set(displayDays.map((d) => formatDateStr(d))),
        [displayDays]
    );

    const displayDaysRoutinesCount = useMemo(() => {
        return allRoutines.filter((r) => displayRangeDateStrs.has(r.dateStr)).length;
    }, [allRoutines, displayRangeDateStrs]);

    const handleClearCurrentRangeSchedule = () => {
        const isDayView = viewMode === 'day';
        const label = isDayView ? 'day' : 'week';
        if (displayDaysRoutinesCount === 0) return;

        const remaining = allRoutines.filter((r) => !displayRangeDateStrs.has(r.dateStr));
        saveMasterRoutines(remaining);
        setSyncToast(`Cleared all routine events for this ${label}`);
        setTimeout(() => setSyncToast(null), 3500);
    };

    const hours = Array.from({ length: 18 }).map((_, i) => i + 6); // 6 AM to 11 PM

    return (
        <div className="space-y-4 animate-fade-in-up pb-10 select-none">
            {/* 1. Teams Top Navigation Header */}
            <div
                className="rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
                style={{
                    background: 'var(--bg-card-solid)',
                    border: '1px solid var(--border-secondary)',
                    boxShadow: 'var(--shadow-card)',
                }}
            >
                {/* Left: Icon & Title */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#5b5fc7]/20 border border-[#5b5fc7]/40 text-[#5b5fc7] dark:text-[#7b83eb] shadow-sm">
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <h1
                            className="text-xl font-display font-bold flex items-center gap-2"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Routine
                        </h1>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Your Schedule Timeline • Double-click any activity to view & edit details
                        </p>
                    </div>
                </div>

                {/* Right: Actions (Google Sync + Today + Your Plans) */}
                <div className="flex items-center gap-2.5">
                    {/* Google Calendar Sync Button (Disabled - Under Google Review) */}
                    <button
                        disabled
                        className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border opacity-60 cursor-not-allowed select-none"
                        style={{
                            background: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
                            color: isDark ? '#93c5fd' : '#2563eb',
                            borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                        }}
                        title="Coming soon — Syncs this routine with your Google Calendar"
                    >
                        <RefreshCw size={13} /> Sync
                    </button>

                    <button
                        onClick={() => setSelectedDate(new Date())}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border"
                        style={{
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            borderColor: 'var(--border-card)',
                        }}
                    >
                        <RefreshCw size={13} /> Today
                    </button>

                    {/* Primary Button: + Your plans */}
                    <button
                        onClick={() => setIsMakerOpen(true)}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{
                            background: 'linear-gradient(135deg, #5b5fc7 0%, #4f52b2 100%)',
                            boxShadow: '0 4px 15px rgba(91, 95, 199, 0.4)',
                        }}
                    >
                        <Plus size={15} /> Your plans
                    </button>
                </div>
            </div>

            {/* 2. Teams Sub-Header Toolbar (Date Nav & View Selector) */}
            <div
                className="rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-4 transition-colors"
                style={{
                    background: 'var(--bg-card-solid)',
                    border: '1px solid var(--border-secondary)',
                }}
            >
                {/* Date Controls */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSelectedDate(new Date())}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                        style={{
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            borderColor: 'var(--border-card)',
                        }}
                    >
                        Today
                    </button>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleDateStep(-1)}
                            className="p-1.5 rounded-lg transition-all hover:bg-black/5 dark:hover:bg-white/10"
                            style={{ color: 'var(--text-secondary)' }}
                            title="Previous"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => handleDateStep(1)}
                            className="p-1.5 rounded-lg transition-all hover:bg-black/5 dark:hover:bg-white/10"
                            style={{ color: 'var(--text-secondary)' }}
                            title="Next"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Interactive Calendar Popover Trigger */}
                    <div className="relative ml-2">
                        <button
                            type="button"
                            onClick={() => setIsDatePickerOpen((prev) => !prev)}
                            className="font-display font-bold text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all border border-transparent hover:border-slate-300 dark:hover:border-slate-700 active:scale-95"
                            style={{ color: 'var(--text-primary)' }}
                            title="Open Calendar"
                        >
                            <span>
                                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <ChevronDown
                                size={14}
                                style={{ color: 'var(--text-secondary)' }}
                                className={`transition-transform duration-200 ${
                                    isDatePickerOpen ? 'rotate-180 text-[#5b5fc7]' : ''
                                }`}
                            />
                        </button>

                        {/* Dropdown Mini Calendar Popover */}
                        {isDatePickerOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setIsDatePickerOpen(false)}
                                />
                                <div
                                    className="absolute top-full left-0 mt-2 z-50 w-72 rounded-2xl p-4 shadow-2xl border animate-scale-in"
                                    style={{
                                        background: 'var(--bg-card-solid)',
                                        borderColor: 'var(--border-card)',
                                        boxShadow: isDark
                                            ? '0 20px 45px rgba(0,0,0,0.6)'
                                            : '0 15px 35px rgba(0,0,0,0.15)',
                                    }}
                                >
                                    {/* Month Navigation */}
                                    <div className="flex items-center justify-between mb-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const d = new Date(pickerMonth);
                                                d.setMonth(d.getMonth() - 1);
                                                setPickerMonth(d);
                                            }}
                                            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <ChevronLeft size={16} />
                                        </button>

                                        <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                                            {pickerMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const d = new Date(pickerMonth);
                                                d.setMonth(d.getMonth() + 1);
                                                setPickerMonth(d);
                                            }}
                                            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>

                                    {/* Weekday headers */}
                                    <div
                                        className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold mb-1"
                                        style={{ color: 'var(--text-muted)' }}
                                    >
                                        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                                            <div key={d}>{d}</div>
                                        ))}
                                    </div>

                                    {/* Day grid */}
                                    <div className="grid grid-cols-7 gap-1 text-center">
                                        {getDaysInMonthGrid(pickerMonth.getFullYear(), pickerMonth.getMonth()).map(
                                            (cell, idx) => {
                                                const cellDateStr = formatDateStr(cell.date);
                                                const isSelected = cellDateStr === formatDateStr(selectedDate);
                                                const isCellToday = cellDateStr === todayStr;

                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedDate(cell.date);
                                                            setIsDatePickerOpen(false);
                                                        }}
                                                        className={`h-7 w-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                                                            isSelected
                                                                ? 'bg-[#5b5fc7] text-white shadow-md font-bold'
                                                                : isCellToday
                                                                ? 'border border-[#5b5fc7] text-[#5b5fc7] dark:text-[#7b83eb] font-bold'
                                                                : cell.isCurrentMonth
                                                                ? 'hover:bg-black/5 dark:hover:bg-white/10'
                                                                : 'opacity-40 hover:bg-black/5 dark:hover:bg-white/5'
                                                        }`}
                                                        style={{
                                                            color: isSelected
                                                                ? '#ffffff'
                                                                : isCellToday
                                                                ? undefined
                                                                : cell.isCurrentMonth
                                                                ? 'var(--text-primary)'
                                                                : 'var(--text-muted)',
                                                        }}
                                                    >
                                                        {cell.date.getDate()}
                                                    </button>
                                                );
                                            }
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div
                                        className="mt-3 pt-2.5 border-t flex items-center justify-between text-[11px]"
                                        style={{ borderColor: 'var(--border-secondary)' }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const t = new Date();
                                                setSelectedDate(t);
                                                setPickerMonth(t);
                                                setIsDatePickerOpen(false);
                                            }}
                                            className="text-[#5b5fc7] dark:text-[#7b83eb] hover:underline font-semibold"
                                        >
                                            Jump to Today
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsDatePickerOpen(false)}
                                            style={{ color: 'var(--text-muted)' }}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Clear Routine for visible Day / Week */}
                    {displayDaysRoutinesCount > 0 && (
                        <button
                            type="button"
                            onClick={handleClearCurrentRangeSchedule}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 text-slate-400 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 cursor-pointer active:scale-95"
                            style={{
                                background: 'var(--bg-elevated)',
                                borderColor: 'var(--border-card)',
                            }}
                            title={viewMode === 'day' ? 'Remove all events for today' : 'Remove all events for the entire week'}
                        >
                            <Trash2 size={13} className="text-red-400/80 shrink-0" />
                            <span>{viewMode === 'day' ? 'Clear Day' : 'Clear Week'}</span>
                        </button>
                    )}

                    {/* View Switcher Dropdown */}
                    <div
                        className="flex items-center rounded-xl p-1 border"
                        style={{
                            background: 'var(--bg-elevated)',
                            borderColor: 'var(--border-card)',
                        }}
                    >
                        <button
                            onClick={() => setViewMode('day')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === 'day' ? 'bg-[#5b5fc7] text-white shadow-sm' : ''
                            }`}
                            style={{
                                color: viewMode === 'day' ? '#ffffff' : 'var(--text-secondary)',
                            }}
                        >
                            Day
                        </button>
                        <button
                            onClick={() => setViewMode('work_week')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === 'work_week' ? 'bg-[#5b5fc7] text-white shadow-sm' : ''
                            }`}
                            style={{
                                color: viewMode === 'work_week' ? '#ffffff' : 'var(--text-secondary)',
                            }}
                        >
                            Work week
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === 'week' ? 'bg-[#5b5fc7] text-white shadow-sm' : ''
                            }`}
                            style={{
                                color: viewMode === 'week' ? '#ffffff' : 'var(--text-secondary)',
                            }}
                        >
                            Week
                        </button>
                    </div>
                </div>
            </div>

            {/* Drag Error Toast Alert */}
            {dragError && (
                <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-500 dark:text-red-300 text-xs font-semibold flex items-center gap-2.5 animate-fade-in shadow-lg">
                    <AlertCircle size={16} className="text-red-500 dark:text-red-400 shrink-0" />
                    <span>{dragError}</span>
                </div>
            )}

            {/* 3. Teams Calendar Grid Table */}
            <div
                className="rounded-3xl overflow-hidden border transition-colors relative"
                style={{
                    background: 'var(--bg-card-solid)',
                    borderColor: 'var(--border-secondary)',
                }}
            >
                {/* Totoro Bus Stop Background Illustration */}
                <TotoroBusStopBg className="opacity-20 dark:opacity-20 translate-y-4 pointer-events-none" />

                {/* Column Headers (Days of the week) */}
                <div
                    className="grid grid-cols-[80px_repeat(auto-fit,minmax(0,1fr))] border-b relative z-10"
                    style={{
                        background: 'var(--bg-secondary)',
                        borderColor: 'var(--border-secondary)',
                    }}
                >
                    <div
                        className="p-3 border-r text-[11px] font-semibold text-center"
                        style={{
                            color: 'var(--text-muted)',
                            borderColor: 'var(--border-secondary)',
                        }}
                    >
                        {userTimeZoneLabel}
                    </div>

                    {displayDays.map((day, idx) => {
                        const dateStr = formatDateStr(day);
                        const isDayToday = dateStr === todayStr;
                        const dayName = day.toLocaleDateString('en-US', { weekday: 'long' });
                        const dayNum = day.getDate();

                        return (
                            <div
                                key={idx}
                                className={`p-3 text-left border-r transition-colors ${
                                    isDayToday ? 'bg-indigo-500/10' : ''
                                }`}
                                style={{ borderColor: 'var(--border-secondary)' }}
                            >
                                <div
                                    className="text-xl font-display font-bold"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    {dayNum}
                                </div>
                                <div
                                    className={`text-xs font-medium ${
                                        isDayToday
                                            ? 'text-[#5b5fc7] dark:text-[#7b83eb] font-bold'
                                            : ''
                                    }`}
                                    style={{
                                        color: isDayToday ? undefined : 'var(--text-secondary)',
                                    }}
                                >
                                    {dayName}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Hours Timeline */}
                <div className="overflow-y-auto custom-scrollbar max-h-[680px] relative z-10">
                    {hours.map((hour) => {
                        const isCurrentHourRow = now.getHours() === hour;

                        return (
                            <div
                                key={hour}
                                className={`grid grid-cols-[80px_repeat(auto-fit,minmax(0,1fr))] min-h-[90px] border-b relative ${
                                    isCurrentHourRow ? 'bg-indigo-500/[0.03]' : ''
                                }`}
                                style={{ borderColor: 'var(--border-secondary)' }}
                            >
                                <div
                                    className="p-2.5 text-right pr-4 text-xs font-semibold border-r select-none flex flex-col justify-start"
                                    style={{
                                        color: 'var(--text-secondary)',
                                        borderColor: 'var(--border-secondary)',
                                    }}
                                >
                                    <span>{formatHourLabel(hour)}</span>
                                </div>

                                {isCurrentHourRow && (
                                    <div
                                        className="absolute left-[80px] right-0 h-[2px] z-30 pointer-events-none"
                                        style={{
                                            top: `${Math.round((currentMinute / 60) * 100)}%`,
                                            background: '#f97316',
                                            boxShadow: '0 0 8px #f97316, 0 0 15px rgba(249, 115, 22, 0.4)',
                                        }}
                                    >
                                        <div className="absolute -left-1.5 -top-1 w-2.5 h-2.5 rounded-full bg-orange-500 shadow-md" />
                                    </div>
                                )}

                                {displayDays.map((day, colIdx) => {
                                    const dateStr = formatDateStr(day);
                                    const isDayToday = dateStr === todayStr;

                                    const cellRoutines = allRoutines.filter(
                                        (r) => r.dateStr === dateStr && r.startHour === hour
                                    );

                                    // Handle CSS overflow: if > 2 auto-detected apps in same slot, collapse excess into "+N apps detected"
                                    const regularRoutines = cellRoutines.filter((r) => !r.isAutoDetected);
                                    const autoRoutines = cellRoutines.filter((r) => r.isAutoDetected);
                                    const shouldCollapseAuto = autoRoutines.length > 2;
                                    const visibleRoutines = shouldCollapseAuto
                                        ? [...regularRoutines, autoRoutines[0]]
                                        : cellRoutines;
                                    const hiddenAutoCount = shouldCollapseAuto ? autoRoutines.length - 1 : 0;

                                    const dayActs = isDayToday
                                        ? activities
                                        : rangeActivities[dateStr]?.activities || [];

                                    const hourActs = (dayActs || []).filter((act) => {
                                        if (!act.timestamp) return false;
                                        return new Date(act.timestamp).getHours() === hour;
                                    });

                                    const guess = guessActivityForHour(hourActs);

                                    return (
                                        <div
                                            key={colIdx}
                                            onDragOver={(e) => handleDragOver(e, hour, dateStr)}
                                            onDrop={(e) => handleDrop(e, hour, dateStr)}
                                            className={`p-1.5 border-r transition-colors relative flex flex-col gap-1.5 ${
                                                isDayToday ? 'bg-indigo-500/[0.03]' : ''
                                            } hover:bg-black/[0.02] dark:hover:bg-white/[0.02]`}
                                            style={{ borderColor: 'var(--border-secondary)' }}
                                        >
                                            {/* Draggable Routine Cards */}
                                            {visibleRoutines.map((item) => {
                                                const colors = getEventColors(item.category, isDark);
                                                const isPastTask = item.dateStr < todayStr || (item.dateStr === todayStr && item.startHour < currentHour);
                                                const collisionInfo = collisionsByDate.get(dateStr)?.get(item.id) || { colIndex: 0, totalCols: 1 };
                                                const { colIndex, totalCols } = collisionInfo;
                                                const isColliding = totalCols > 1;

                                                const duration = Math.max(15, item.durationMinutes || 30);
                                                const rawHeight = Math.round((duration / 60) * 90) - 6;
                                                // 15m events use 18px height so they fit cleanly without overflowing into the next :15 start
                                                const calculatedHeight = duration <= 15 ? 18 : Math.max(30, rawHeight);
                                                const isCompact = calculatedHeight <= 26;

                                                const endMinTotal = item.startHour * 60 + item.startMinute + duration;
                                                const endH = Math.floor(endMinTotal / 60) % 24;
                                                const endM = endMinTotal % 60;
                                                const timeRangeString = `${formatTimeSlot(item.startHour, item.startMinute)} - ${formatTimeSlot(endH, endM)} (${duration}m)`;

                                                const colWidthPercent = 100 / totalCols;
                                                const colLeftPercent = (colIndex * 100) / totalCols;
                                                const widthStyle = isColliding ? `calc(${colWidthPercent}% - 6px)` : 'calc(100% - 12px)';
                                                const leftStyle = isColliding ? `calc(${colLeftPercent}% + ${colIndex === 0 ? 4 : 2}px)` : '6px';
                                                const topOffset = Math.round((item.startMinute / 60) * 90) + 4;

                                                return (
                                                    <div
                                                        key={item.id}
                                                        draggable={!isPastTask}
                                                        onDragStart={(e) => handleDragStart(e, item)}
                                                        onDoubleClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedRoutineDetails({ ...item });
                                                        }}
                                                        className={`rounded-xl border shadow-md transition-all group overflow-hidden flex flex-col justify-between ${
                                                            isCompact ? 'px-2 py-0.5' : 'p-2'
                                                        } ${
                                                            isPastTask
                                                                ? 'cursor-default opacity-60'
                                                                : 'cursor-grab active:cursor-grabbing hover:scale-[1.01]'
                                                        } ${item.completed ? 'line-through' : ''}`}
                                                        style={{
                                                            background: colors.bg,
                                                            borderColor: colors.border,
                                                            boxShadow: isDark
                                                                ? '0 4px 12px rgba(0,0,0,0.25)'
                                                                : '0 2px 8px rgba(0,0,0,0.06)',
                                                            position: 'absolute',
                                                            top: `${topOffset}px`,
                                                            height: `${calculatedHeight}px`,
                                                            left: leftStyle,
                                                            width: widthStyle,
                                                            zIndex: 20 + colIndex,
                                                        }}
                                                    >
                                                        {isCompact ? (
                                                            <div className="flex items-center justify-between gap-1 w-full h-full">
                                                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                                    {item.isAutoDetected && (
                                                                        <span
                                                                            className="text-[8px] px-1 py-0.2 rounded font-bold uppercase shrink-0 bg-emerald-500/20 text-emerald-400"
                                                                            title={`Auto-detected: ${item.detectedApp}`}
                                                                        >
                                                                            🤖 Auto
                                                                        </span>
                                                                    )}
                                                                    <h4
                                                                        className="font-semibold text-[11px] leading-none truncate"
                                                                        style={{ color: colors.text }}
                                                                    >
                                                                        {item.title}
                                                                    </h4>
                                                                    <span className="text-[9px] font-mono opacity-80 shrink-0" style={{ color: colors.subtext }}>
                                                                        {formatTimeSlot(item.startHour, item.startMinute)}
                                                                    </span>
                                                                    {isPastTask && (
                                                                        <span
                                                                            className="text-[9px] px-1 py-0.2 rounded font-medium shrink-0"
                                                                            style={{
                                                                                background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.08)',
                                                                                color: colors.subtext,
                                                                            }}
                                                                        >
                                                                            Past
                                                                        </span>
                                                                    )}
                                                                    {item.isAutoDetected && (
                                                                        <div className="flex items-center gap-0.5 shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
                                                                            {!item.detectionFeedback ? (
                                                                                <>
                                                                                    <button
                                                                                        onClick={(e) => handleRateActivity(e, item, 'accurate')}
                                                                                        className="hover:scale-125 transition-transform text-[9px]"
                                                                                        title="Detection accurate"
                                                                                    >
                                                                                        👍
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => handleRateActivity(e, item, 'inaccurate')}
                                                                                        className="hover:scale-125 transition-transform text-[9px]"
                                                                                        title="Detection inaccurate"
                                                                                    >
                                                                                        👎
                                                                                    </button>
                                                                                </>
                                                                            ) : item.detectionFeedback === 'accurate' ? (
                                                                                <span className="text-[8px] font-bold text-emerald-500">✓</span>
                                                                            ) : (
                                                                                <span className="text-[8px] font-bold text-amber-500">⚠️</span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            saveMasterRoutines(
                                                                                allRoutines.map((r) =>
                                                                                    r.id === item.id ? { ...r, completed: !r.completed } : r
                                                                                )
                                                                            );
                                                                        }}
                                                                        className="hover:text-emerald-500 transition-colors"
                                                                        title="Mark done"
                                                                    >
                                                                        {item.completed ? (
                                                                            <CheckCircle2 size={12} className="text-emerald-500" />
                                                                        ) : (
                                                                            <Circle size={12} />
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedRoutineDetails({ ...item });
                                                                        }}
                                                                        className="opacity-0 group-hover:opacity-100 hover:text-indigo-500 transition-all"
                                                                        title="Edit Details"
                                                                    >
                                                                        <Edit3 size={11} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div>
                                                                    <div className="flex items-start justify-between gap-1.5">
                                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                                            {item.isAutoDetected && (
                                                                                <span
                                                                                    className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 bg-emerald-500/20 text-emerald-400"
                                                                                    title={`Auto-detected: ${item.detectedApp}`}
                                                                                >
                                                                                    🤖 Auto
                                                                                </span>
                                                                            )}
                                                                            <h4
                                                                                className="font-semibold text-xs leading-tight truncate"
                                                                                style={{ color: colors.text }}
                                                                            >
                                                                                {item.title}
                                                                            </h4>
                                                                            {isPastTask && (
                                                                                <span
                                                                                    className="text-[9px] px-1 py-0.2 rounded font-medium shrink-0"
                                                                                    style={{
                                                                                        background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.08)',
                                                                                        color: colors.subtext,
                                                                                    }}
                                                                                >
                                                                                    Past
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {!isPastTask && (
                                                                            <GripVertical
                                                                                size={12}
                                                                                style={{ color: colors.subtext }}
                                                                                className="opacity-0 group-hover:opacity-100 shrink-0 cursor-grab"
                                                                            />
                                                                        )}
                                                                    </div>

                                                                    {item.subtitle && (
                                                                        <p
                                                                            className="text-[11px] mt-1 truncate"
                                                                            style={{ color: colors.subtext }}
                                                                        >
                                                                            {item.subtitle}
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                <div
                                                                    className="flex items-center justify-between mt-2 pt-1.5 border-t text-[10px]"
                                                                    style={{
                                                                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                                                        color: colors.subtext,
                                                                    }}
                                                                >
                                                                    <span className="font-medium truncate">
                                                                        {timeRangeString}
                                                                    </span>

                                                                    {/* Accuracy rating buttons for auto-detected events */}
                                                                    {item.isAutoDetected && (
                                                                        <div className="flex items-center gap-1 shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
                                                                            {!item.detectionFeedback ? (
                                                                                <div className="flex items-center gap-1 text-[9px] bg-black/10 dark:bg-white/5 px-1.5 py-0.5 rounded-lg">
                                                                                    <span className="opacity-75">Accurate?</span>
                                                                                    <button
                                                                                        onClick={(e) => handleRateActivity(e, item, 'accurate')}
                                                                                        className="hover:scale-125 transition-transform"
                                                                                        title="Mark detection accurate"
                                                                                    >
                                                                                        👍
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => handleRateActivity(e, item, 'inaccurate')}
                                                                                        className="hover:scale-125 transition-transform"
                                                                                        title="Mark detection inaccurate"
                                                                                    >
                                                                                        👎
                                                                                    </button>
                                                                                </div>
                                                                            ) : item.detectionFeedback === 'accurate' ? (
                                                                                <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5">
                                                                                    ✓ Accurate
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[9px] text-amber-400 font-bold flex items-center gap-0.5">
                                                                                    ⚠️ Inaccurate
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                saveMasterRoutines(
                                                                                    allRoutines.map((r) =>
                                                                                        r.id === item.id ? { ...r, completed: !r.completed } : r
                                                                                    )
                                                                                );
                                                                            }}
                                                                            className="hover:text-emerald-500 transition-colors"
                                                                            title="Mark done"
                                                                        >
                                                                            {item.completed ? (
                                                                                <CheckCircle2 size={13} className="text-emerald-500" />
                                                                            ) : (
                                                                                <Circle size={13} />
                                                                            )}
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedRoutineDetails({ ...item });
                                                                            }}
                                                                            className="opacity-0 group-hover:opacity-100 hover:text-indigo-500 transition-all"
                                                                            title="Edit Details"
                                                                        >
                                                                            <Edit3 size={12} />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                saveMasterRoutines(allRoutines.filter((r) => r.id !== item.id));
                                                                            }}
                                                                            className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Overflow badge if more than 2 auto-detected apps in this slot */}
                                            {hiddenAutoCount > 0 && (
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSlotAppsModal({
                                                            dateStr,
                                                            hour,
                                                            items: autoRoutines,
                                                        });
                                                    }}
                                                    className="rounded-lg border shadow-sm px-2 py-1 transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-between text-[11px] font-semibold animate-fade-in group"
                                                    style={{
                                                        background: isDark ? 'rgba(30, 41, 59, 0.95)' : '#f8fafc',
                                                        borderColor: isDark ? 'rgba(99, 102, 241, 0.5)' : '#cbd5e1',
                                                        position: 'absolute',
                                                        bottom: '2px',
                                                        left: '4px',
                                                        right: '4px',
                                                        zIndex: 35,
                                                    }}
                                                    title="Click to view all detected apps"
                                                >
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <Sparkles size={11} className="text-indigo-400 shrink-0" />
                                                        <span className="text-indigo-400 truncate text-[10px] font-bold">
                                                            +{hiddenAutoCount} apps detected
                                                        </span>
                                                    </div>
                                                    <span className="text-[9px] text-slate-400 group-hover:text-indigo-300 shrink-0 font-medium">
                                                        View all →
                                                    </span>
                                                </div>
                                            )}

                                            {/* Tracked Activity Guess Card */}
                                            {guess && (
                                                <div
                                                    onDoubleClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedActivityDetails({ dateStr, hour, guess });
                                                    }}
                                                    className="p-2 rounded-xl border text-xs shadow-md cursor-pointer transition-all hover:scale-[1.02]"
                                                    style={{
                                                        background: isDark ? 'rgba(15, 23, 42, 0.85)' : '#f0fdf4',
                                                        borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.4)',
                                                    }}
                                                    title={`Double-click for details. Tracked: ${guess.topApp} (${Math.round(guess.totalSeconds / 60)}m)`}
                                                >
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400 truncate">
                                                            🤖 {guess.label}
                                                        </span>
                                                        <span
                                                            className="text-[10px] font-mono"
                                                            style={{ color: 'var(--text-muted)' }}
                                                        >
                                                            {formatDuration(guess.totalSeconds)}
                                                        </span>
                                                    </div>
                                                    <p
                                                        className="text-[10px] truncate mt-0.5"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        {guess.topApp}: {guess.topTitle}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 4. Task Details Modal */}
            {selectedRoutineDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                    <div
                        className="w-full max-w-lg rounded-3xl p-6 shadow-2xl relative border"
                        style={{
                            background: 'var(--bg-card-solid)',
                            borderColor: 'var(--border-card)',
                            boxShadow: 'var(--shadow-card)',
                        }}
                    >
                        <div
                            className="flex items-center justify-between pb-4 border-b mb-5"
                            style={{ borderColor: 'var(--border-secondary)' }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-[#5b5fc7]/20 text-[#5b5fc7] dark:text-[#7b83eb] border border-[#5b5fc7]/40">
                                    <Edit3 size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                                        Task & Routine Details
                                    </h3>
                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        {selectedRoutineDetails.dateStr} • {formatTimeSlot(selectedRoutineDetails.startHour, selectedRoutineDetails.startMinute)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedRoutineDetails(null)}
                                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={selectedRoutineDetails.title}
                                    onChange={(e) =>
                                        setSelectedRoutineDetails({ ...selectedRoutineDetails, title: e.target.value })
                                    }
                                    className="w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#5b5fc7]"
                                    style={{
                                        background: 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        borderColor: 'var(--border-input)',
                                    }}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                                    Subtitle / Location
                                </label>
                                <input
                                    type="text"
                                    value={selectedRoutineDetails.subtitle || ''}
                                    onChange={(e) =>
                                        setSelectedRoutineDetails({ ...selectedRoutineDetails, subtitle: e.target.value })
                                    }
                                    placeholder="e.g. Engineering Room / VS Code"
                                    className="w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#5b5fc7]"
                                    style={{
                                        background: 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        borderColor: 'var(--border-input)',
                                    }}
                                />
                            </div>

                            {/* Date & Start Time Scheduling */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                                        Scheduled Date
                                    </label>
                                    <input
                                        type="date"
                                        value={selectedRoutineDetails.dateStr}
                                        onChange={(e) => {
                                            const newDateStr = e.target.value;
                                            const newDayIndex = new Date(newDateStr).getDay();
                                            setSelectedRoutineDetails({
                                                ...selectedRoutineDetails,
                                                dateStr: newDateStr,
                                                dayIndex: newDayIndex,
                                            });
                                        }}
                                        className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#5b5fc7]"
                                        style={{
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            borderColor: 'var(--border-input)',
                                        }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                                            Start Hour
                                        </label>
                                        <select
                                            value={selectedRoutineDetails.startHour}
                                            onChange={(e) =>
                                                setSelectedRoutineDetails({
                                                    ...selectedRoutineDetails,
                                                    startHour: Number(e.target.value),
                                                })
                                            }
                                            className="w-full px-2.5 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#5b5fc7]"
                                            style={{
                                                background: 'var(--bg-input)',
                                                color: 'var(--text-primary)',
                                                borderColor: 'var(--border-input)',
                                            }}
                                        >
                                            {Array.from({ length: 24 }).map((_, h) => (
                                                <option key={h} value={h}>
                                                    {formatHourLabel(h)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                                            Minute
                                        </label>
                                        <select
                                            value={selectedRoutineDetails.startMinute}
                                            onChange={(e) =>
                                                setSelectedRoutineDetails({
                                                    ...selectedRoutineDetails,
                                                    startMinute: Number(e.target.value),
                                                })
                                            }
                                            className="w-full px-2.5 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#5b5fc7]"
                                            style={{
                                                background: 'var(--bg-input)',
                                                color: 'var(--text-primary)',
                                                borderColor: 'var(--border-input)',
                                            }}
                                        >
                                            <option value={0}>:00</option>
                                            <option value={15}>:15</option>
                                            <option value={30}>:30</option>
                                            <option value={45}>:45</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                                        Category
                                    </label>
                                    <select
                                        value={selectedRoutineDetails.category}
                                        onChange={(e) =>
                                            setSelectedRoutineDetails({
                                                ...selectedRoutineDetails,
                                                category: e.target.value as any,
                                            })
                                        }
                                        className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#5b5fc7]"
                                        style={{
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            borderColor: 'var(--border-input)',
                                        }}
                                    >
                                        <option value="development">💻 Development</option>
                                        <option value="research">📚 Research</option>
                                        <option value="meeting">👥 Meeting</option>
                                        <option value="design">🎨 Design</option>
                                        <option value="writing">✍️ Writing</option>
                                        <option value="meal">🥗 Meal</option>
                                        <option value="break">☕ Break</option>
                                        <option value="sleep">🌙 Sleep</option>
                                        <option value="other">📦 Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                                        Duration (Minutes)
                                    </label>
                                    <input
                                        type="number"
                                        min={15}
                                        max={300}
                                        step={15}
                                        value={selectedRoutineDetails.durationMinutes}
                                        onChange={(e) =>
                                            setSelectedRoutineDetails({
                                                ...selectedRoutineDetails,
                                                durationMinutes: Number(e.target.value),
                                            })
                                        }
                                        className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#5b5fc7]"
                                        style={{
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            borderColor: 'var(--border-input)',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Auto-detected event feedback & accuracy inspection */}
                            {selectedRoutineDetails.isAutoDetected && (
                                <div
                                    className="p-3.5 rounded-2xl border"
                                    style={{
                                        background: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
                                        borderColor: 'rgba(16, 185, 129, 0.3)',
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-500">
                                            <Sparkles size={13} /> Screen Activity Detection
                                        </span>
                                        {selectedRoutineDetails.detectionConfidence && (
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-semibold">
                                                {selectedRoutineDetails.detectionConfidence}% Confidence
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
                                        Detected App: <strong>{selectedRoutineDetails.detectedApp || 'Screen Monitor'}</strong>
                                    </p>
                                    {selectedRoutineDetails.detectedTitle && (
                                        <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                            Window: "{selectedRoutineDetails.detectedTitle}"
                                        </p>
                                    )}
                                    <div className="mt-3 pt-2.5 border-t border-emerald-500/20">
                                        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                                            Was this detection accurate?
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    await submitActivityFeedback(selectedRoutineDetails.id, 'accurate');
                                                    setSelectedRoutineDetails({
                                                        ...selectedRoutineDetails,
                                                        detectionFeedback: 'accurate',
                                                        feedbackAt: Date.now(),
                                                    });
                                                    try {
                                                        const saved = localStorage.getItem('produchive_master_routines');
                                                        if (saved) setAllRoutines(JSON.parse(saved));
                                                    } catch (_) {}
                                                }}
                                                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                                    selectedRoutineDetails.detectionFeedback === 'accurate'
                                                        ? 'bg-emerald-500 text-white shadow-md'
                                                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                                }`}
                                            >
                                                <ThumbsUp size={12} /> 👍 Accurate
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    await submitActivityFeedback(selectedRoutineDetails.id, 'inaccurate');
                                                    setSelectedRoutineDetails({
                                                        ...selectedRoutineDetails,
                                                        detectionFeedback: 'inaccurate',
                                                        feedbackAt: Date.now(),
                                                    });
                                                    try {
                                                        const saved = localStorage.getItem('produchive_master_routines');
                                                        if (saved) setAllRoutines(JSON.parse(saved));
                                                    } catch (_) {}
                                                }}
                                                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                                    selectedRoutineDetails.detectionFeedback === 'inaccurate'
                                                        ? 'bg-amber-500 text-white shadow-md'
                                                        : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                                                }`}
                                            >
                                                <ThumbsDown size={12} /> 👎 Inaccurate
                                            </button>
                                        </div>
                                        {selectedRoutineDetails.detectionFeedback && (
                                            <p className="text-[10px] text-slate-400 mt-2 text-center">
                                                Rating recorded and stored for developer feedback.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div
                                className="p-3 rounded-xl border flex items-center justify-between"
                                style={{
                                    background: 'var(--bg-elevated)',
                                    borderColor: 'var(--border-secondary)',
                                }}
                            >
                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Completion Status</span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedRoutineDetails({
                                            ...selectedRoutineDetails,
                                            completed: !selectedRoutineDetails.completed,
                                        })
                                    }
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                        selectedRoutineDetails.completed
                                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40'
                                            : 'bg-black/5 dark:bg-white/5'
                                    }`}
                                    style={{
                                        color: selectedRoutineDetails.completed ? undefined : 'var(--text-primary)',
                                    }}
                                >
                                    {selectedRoutineDetails.completed ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                                    {selectedRoutineDetails.completed ? 'Completed' : 'Mark as Done'}
                                </button>
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between gap-3 mt-6 pt-4 border-t"
                            style={{ borderColor: 'var(--border-secondary)' }}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    saveMasterRoutines(allRoutines.filter((r) => r.id !== selectedRoutineDetails.id));
                                    setSelectedRoutineDetails(null);
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-1.5"
                            >
                                <Trash2 size={14} /> Delete
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedRoutineDetails(null)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/10"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        saveMasterRoutines(
                                            allRoutines.map((r) =>
                                                r.id === selectedRoutineDetails.id ? selectedRoutineDetails : r
                                            )
                                        );
                                        try {
                                            const [y, m, d] = selectedRoutineDetails.dateStr.split('-').map(Number);
                                            setSelectedDate(new Date(y, m - 1, d));
                                        } catch (_) {}
                                        setSelectedRoutineDetails(null);
                                    }}
                                    className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95"
                                    style={{
                                        background: 'linear-gradient(135deg, #5b5fc7 0%, #4f52b2 100%)',
                                    }}
                                >
                                    <Save size={13} /> Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Tracked Activity Inspection Modal */}
            {selectedActivityDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                    <div
                        className="w-full max-w-lg rounded-3xl p-6 shadow-2xl relative border"
                        style={{
                            background: 'var(--bg-card-solid)',
                            borderColor: 'var(--border-card)',
                            boxShadow: 'var(--shadow-card)',
                        }}
                    >
                        <div
                            className="flex items-center justify-between pb-4 border-b mb-5"
                            style={{ borderColor: 'var(--border-secondary)' }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/40">
                                    <ActivityIcon size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                                        Tracked Activity Inspection
                                    </h3>
                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        {selectedActivityDetails.dateStr} • {formatHourLabel(selectedActivityDetails.hour)} Slot
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedActivityDetails(null)}
                                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div
                                className="p-3.5 rounded-2xl border"
                                style={{
                                    background: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4',
                                    borderColor: 'rgba(16, 185, 129, 0.3)',
                                }}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                        🤖 {selectedActivityDetails.guess.label}
                                    </span>
                                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-300">
                                        {selectedActivityDetails.guess.confidence}% Confidence
                                    </span>
                                </div>
                                <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
                                    Primary Application: <strong>{selectedActivityDetails.guess.topApp}</strong>
                                </p>
                                <p className="text-[11px] truncate mt-1" style={{ color: 'var(--text-secondary)' }}>
                                    Window: {selectedActivityDetails.guess.topTitle}
                                </p>
                            </div>

                            <div>
                                <h4
                                    className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    <span>App Usage Breakdown</span>
                                    <span className="font-mono text-[#5b5fc7] dark:text-indigo-400">
                                        Total: {formatDuration(selectedActivityDetails.guess.totalSeconds)}
                                    </span>
                                </h4>

                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {selectedActivityDetails.guess.appBreakdown.map((app: { name: string; seconds: number }, i: number) => {
                                        const pct = Math.round(
                                            (app.seconds / (selectedActivityDetails.guess.totalSeconds || 1)) * 100
                                        );
                                        return (
                                            <div
                                                key={i}
                                                className="p-2 rounded-xl border text-xs"
                                                style={{
                                                    background: 'var(--bg-elevated)',
                                                    borderColor: 'var(--border-secondary)',
                                                }}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                        {app.name}
                                                    </span>
                                                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                                                        {formatDuration(app.seconds)} ({pct}%)
                                                    </span>
                                                </div>
                                                <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-slate-700 overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-500 rounded-full"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between gap-3 mt-6 pt-4 border-t"
                            style={{ borderColor: 'var(--border-secondary)' }}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    const newRoutine: PlannedRoutineItem = {
                                        id: `converted-${Date.now()}`,
                                        title: selectedActivityDetails.guess.label,
                                        category: (selectedActivityDetails.guess.category as any) || 'other',
                                        priority: 'medium',
                                        dayIndex: new Date(selectedActivityDetails.dateStr).getDay(),
                                        dateStr: selectedActivityDetails.dateStr,
                                        startHour: selectedActivityDetails.hour,
                                        startMinute: 0,
                                        durationMinutes: 60,
                                        completed: true,
                                        subtitle: `Tracked ${selectedActivityDetails.guess.topApp}`,
                                    };
                                    saveMasterRoutines([...allRoutines, newRoutine]);
                                    setSelectedActivityDetails(null);
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5b5fc7] dark:text-indigo-300 hover:bg-indigo-500/15 transition-all flex items-center gap-1.5"
                            >
                                <Plus size={14} /> Add as Routine Block
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedActivityDetails(null)}
                                className="px-5 py-2 rounded-xl text-xs font-semibold border transition-all"
                                style={{
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    borderColor: 'var(--border-card)',
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5.5 Multi-App Overflow Modal (shows each separate detected app event at this time) */}
            {slotAppsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                    <div
                        className="w-full max-w-lg rounded-3xl p-6 shadow-2xl relative border"
                        style={{
                            background: 'var(--bg-card-solid)',
                            borderColor: 'var(--border-card)',
                            boxShadow: 'var(--shadow-card)',
                        }}
                    >
                        <div className="flex items-center justify-between pb-4 border-b mb-5" style={{ borderColor: 'var(--border-secondary)' }}>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                    <Sparkles size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                                        Detected Apps at {formatHourLabel(slotAppsModal.hour)}
                                    </h3>
                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        {slotAppsModal.dateStr} • {slotAppsModal.items.length} separate events tracked
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSlotAppsModal(null)}
                                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all text-slate-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                            {slotAppsModal.items.map((appItem) => {
                                const colors = getEventColors(appItem.category, isDark);
                                return (
                                    <div
                                        key={appItem.id}
                                        className="p-3.5 rounded-2xl border transition-all"
                                        style={{
                                            background: colors.bg,
                                            borderColor: colors.border,
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-xs truncate" style={{ color: colors.text }}>
                                                        {appItem.title}
                                                    </h4>
                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase" style={{ background: colors.accent + '20', color: colors.accent }}>
                                                        {appItem.category}
                                                    </span>
                                                </div>
                                                {appItem.detectedTitle && (
                                                    <p className="text-[11px] truncate mt-0.5" style={{ color: colors.subtext }}>
                                                        {appItem.detectedApp}: {appItem.detectedTitle}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-mono shrink-0 px-2 py-0.5 rounded-lg bg-black/10 dark:bg-black/20" style={{ color: colors.text }}>
                                                {appItem.durationMinutes}m duration
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t text-xs" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px]" style={{ color: colors.subtext }}>Was detection accurate?</span>
                                                {!appItem.detectionFeedback ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={async (e) => {
                                                                await handleRateActivity(e, appItem, 'accurate');
                                                                setSlotAppsModal((prev) => prev ? {
                                                                    ...prev,
                                                                    items: prev.items.map(it => it.id === appItem.id ? { ...it, detectionFeedback: 'accurate' } : it)
                                                                } : null);
                                                            }}
                                                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all flex items-center gap-1"
                                                        >
                                                            <ThumbsUp size={10} /> Accurate
                                                        </button>
                                                        <button
                                                            onClick={async (e) => {
                                                                await handleRateActivity(e, appItem, 'inaccurate');
                                                                setSlotAppsModal((prev) => prev ? {
                                                                    ...prev,
                                                                    items: prev.items.map(it => it.id === appItem.id ? { ...it, detectionFeedback: 'inaccurate' } : it)
                                                                } : null);
                                                            }}
                                                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all flex items-center gap-1"
                                                        >
                                                            <ThumbsDown size={10} /> Inaccurate
                                                        </button>
                                                    </div>
                                                ) : appItem.detectionFeedback === 'accurate' ? (
                                                    <span className="text-[10px] font-bold text-emerald-400">✓ Accurate (Rated)</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-amber-400">⚠️ Inaccurate (Feedback Sent)</span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => {
                                                        setSlotAppsModal(null);
                                                        setSelectedRoutineDetails(appItem);
                                                    }}
                                                    className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-300"
                                                    title="Edit Details"
                                                >
                                                    <Edit3 size={13} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        saveMasterRoutines(allRoutines.filter(r => r.id !== appItem.id));
                                                        setSlotAppsModal((prev) => prev ? {
                                                            ...prev,
                                                            items: prev.items.filter(it => it.id !== appItem.id)
                                                        } : null);
                                                    }}
                                                    className="p-1 rounded-lg hover:bg-red-500/20 text-red-400"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-5 pt-3 border-t flex justify-end" style={{ borderColor: 'var(--border-secondary)' }}>
                            <button
                                onClick={() => setSlotAppsModal(null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold"
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. "Plan Your Day / Week" Smart Routine Maker & Preview Modal */}
            {isMakerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                    <div
                        className="w-full max-w-xl rounded-3xl p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar border space-y-3.5"
                        style={{
                            background: 'var(--bg-card-solid)',
                            borderColor: 'var(--border-card)',
                            boxShadow: 'var(--shadow-card)',
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-secondary)' }}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 rounded-xl bg-[#5b5fc7]/15 text-[#5b5fc7] dark:text-[#7b83eb] shrink-0">
                                    <CalendarIcon size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                        {makerPhase === 'input'
                                            ? planScope === 'day'
                                                ? 'Plan Your Day'
                                                : 'Plan Your Week'
                                            : planScope === 'day'
                                            ? 'Review & Fine-Tune Day Schedule'
                                            : 'Review & Fine-Tune Weekly Schedule'}
                                    </h3>
                                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                        {makerPhase === 'input'
                                            ? planScope === 'day'
                                                ? 'Set available hours and tasks to intelligently generate your day.'
                                                : 'Set daily work hours and tasks to distribute across all 7 days.'
                                            : 'Fine-tune task durations before applying to your routine.'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setIsMakerOpen(false);
                                    setMakerPhase('input');
                                }}
                                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all cursor-pointer shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Centered Scope Selector: Day Plan vs Week Plan */}
                        {makerPhase === 'input' && (
                            <div className="flex justify-center w-full py-0.5">
                                <div
                                    className="inline-flex p-1 rounded-2xl border transition-all"
                                    style={{
                                        background: 'var(--bg-input)',
                                        borderColor: 'var(--border-secondary)',
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setPlanScope('day')}
                                        className={`px-6 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                            planScope === 'day'
                                                ? 'bg-[#5b5fc7] text-white shadow-md'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        Day Plan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPlanScope('week')}
                                        className={`px-6 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                            planScope === 'week'
                                                ? 'bg-[#5b5fc7] text-white shadow-md'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        Week Plan
                                    </button>
                                </div>
                            </div>
                        )}

                        {makerPhase === 'input' ? (
                            <>
                                {/* Section 1: Available Time Selection */}
                                <div
                                    className="p-3.5 rounded-2xl border space-y-2.5 shadow-sm transition-all"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        borderColor: 'rgba(255, 255, 255, 0.08)',
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                            <Clock size={13} className="text-[#5b5fc7]" />
                                            {planScope === 'day' ? 'Available Time Today' : 'Total Weekly Work Hours'}
                                        </label>
                                        <span className="text-xs font-bold text-[#5b5fc7] dark:text-[#7b83eb]">
                                            {planScope === 'day'
                                                ? `${allottedHours} ${allottedHours === 1 ? 'hour' : 'hours'} (${allottedHours * 60}m)`
                                                : `${weeklyTotalHours} hours weekly (~${(weeklyTotalHours / Math.max(1, activeWeekDates.length)).toFixed(1)}h/day across ${activeWeekDates.length} days)`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {(planScope === 'day' ? [2, 4, 6, 8, 10] : [10, 15, 20, 30, 40]).map((h) => {
                                            const isSelected = planScope === 'day' ? allottedHours === h : weeklyTotalHours === h;
                                            return (
                                                <button
                                                    key={h}
                                                    type="button"
                                                    onClick={() => {
                                                        if (planScope === 'day') setAllottedHours(h);
                                                        else setWeeklyTotalHours(h);
                                                    }}
                                                    className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-[#5b5fc7] text-white border-[#5b5fc7] shadow-sm shadow-[#5b5fc7]/30'
                                                            : 'bg-black/20 dark:bg-white/5 border-slate-700/40 text-slate-300 hover:text-white hover:border-slate-500'
                                                    }`}
                                                >
                                                    {h} hrs
                                                </button>
                                            );
                                        })}
                                        <div className="flex items-center gap-1.5 ml-auto text-xs text-slate-400">
                                            <span>Custom:</span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={planScope === 'day' ? 16 : 80}
                                                value={planScope === 'day' ? allottedHours : weeklyTotalHours}
                                                onChange={(e) => {
                                                    const val = Math.max(1, Math.min(planScope === 'day' ? 16 : 80, Number(e.target.value) || 1));
                                                    if (planScope === 'day') setAllottedHours(val);
                                                    else setWeeklyTotalHours(val);
                                                }}
                                                className="w-12 px-1.5 py-0.5 rounded-lg text-xs font-semibold border bg-black/20 dark:bg-white/5 text-center focus:outline-none focus:border-[#5b5fc7]"
                                                style={{ color: 'var(--text-primary)', borderColor: 'rgba(255, 255, 255, 0.12)' }}
                                            />
                                            <span>h</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Routine Blocks & Scope Card (Zero Height Shift) */}
                                <div
                                    className="p-3.5 rounded-2xl border space-y-2.5 shadow-sm transition-all"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        borderColor: 'rgba(255, 255, 255, 0.08)',
                                    }}
                                >
                                    {/* Row 1: Routine blocks + Start selector */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <button
                                                type="button"
                                                onClick={() => setIncludeBreakfast(!includeBreakfast)}
                                                className={`text-xs px-2.5 py-1 rounded-xl border font-semibold transition-all cursor-pointer ${
                                                    includeBreakfast
                                                        ? 'bg-[#5b5fc7]/20 border-[#5b5fc7]/60 text-[#7b83eb]'
                                                        : 'bg-black/20 dark:bg-white/5 border-slate-700/40 text-slate-300 hover:text-white'
                                                }`}
                                            >
                                                Breakfast
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIncludeLunch(!includeLunch)}
                                                className={`text-xs px-2.5 py-1 rounded-xl border font-semibold transition-all cursor-pointer ${
                                                    includeLunch
                                                        ? 'bg-[#5b5fc7]/20 border-[#5b5fc7]/60 text-[#7b83eb]'
                                                        : 'bg-black/20 dark:bg-white/5 border-slate-700/40 text-slate-300 hover:text-white'
                                                }`}
                                            >
                                                Lunch
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIncludeRestBlocks(!includeRestBlocks)}
                                                className={`text-xs px-2.5 py-1 rounded-xl border font-semibold transition-all cursor-pointer ${
                                                    includeRestBlocks
                                                        ? 'bg-[#5b5fc7]/20 border-[#5b5fc7]/60 text-[#7b83eb]'
                                                        : 'bg-black/20 dark:bg-white/5 border-slate-700/40 text-slate-300 hover:text-white'
                                                }`}
                                            >
                                                Rest Breaks
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIncludeDinner(!includeDinner)}
                                                className={`text-xs px-2.5 py-1 rounded-xl border font-semibold transition-all cursor-pointer ${
                                                    includeDinner
                                                        ? 'bg-[#5b5fc7]/20 border-[#5b5fc7]/60 text-[#7b83eb]'
                                                        : 'bg-black/20 dark:bg-white/5 border-slate-700/40 text-slate-300 hover:text-white'
                                                }`}
                                            >
                                                Dinner
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-300">
                                            <span className="font-medium text-slate-400">Start:</span>
                                            <select
                                                value={planScope === 'day' ? startHourInput : weekStartHourInput}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (planScope === 'day') setStartHourInput(val);
                                                    else setWeekStartHourInput(val);
                                                }}
                                                className="px-2 py-1 rounded-xl text-xs font-semibold border bg-black/20 dark:bg-white/5 focus:outline-none focus:border-[#5b5fc7] cursor-pointer"
                                                style={{ color: 'var(--text-primary)', borderColor: 'rgba(255, 255, 255, 0.12)' }}
                                            >
                                                {hours
                                                    .filter((h) => (formatDateStr(selectedDate) === todayStr && planScope === 'day' ? h >= new Date().getHours() : h >= 6 && h <= 23))
                                                    .map((h) => (
                                                        <option key={h} value={h} className="bg-slate-900 text-white">
                                                            {formatHourLabel(h)}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Row 2: Fixed height & aligned sub-row for both Day and Week */}
                                    <div className="flex items-center justify-between pt-2 border-t text-xs text-slate-400" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                                        {planScope === 'day' ? (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-medium text-slate-400">Target Schedule:</span>
                                                    <span className="text-[11px] text-slate-300 font-semibold px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                                                        {formatDateStr(selectedDate) === todayStr ? 'Today (24h Routine Cycle)' : formatDateStr(selectedDate)}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] text-slate-400 font-medium">Single Day Focus</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-medium text-slate-400">Included Days:</span>
                                                    <span className="text-[11px] text-slate-300 font-semibold px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                                                        Mon – Fri (Work Week)
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <label className="flex items-center gap-1.5 text-xs text-slate-300 font-medium cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={includeSaturday}
                                                            onChange={(e) => setIncludeSaturday(e.target.checked)}
                                                            className="rounded accent-[#5b5fc7] cursor-pointer"
                                                        />
                                                        Include Saturday
                                                    </label>
                                                    <label className="flex items-center gap-1.5 text-xs text-slate-300 font-medium cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={includeSunday}
                                                            onChange={(e) => setIncludeSunday(e.target.checked)}
                                                            className="rounded accent-[#5b5fc7] cursor-pointer"
                                                        />
                                                        Include Sunday
                                                    </label>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Section 3: Tasks Section Card */}
                                <div
                                    className="p-3.5 rounded-2xl border space-y-2.5 shadow-sm transition-all"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        borderColor: 'rgba(255, 255, 255, 0.08)',
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                                            {planScope === 'day' ? `Today's Tasks (${makerTasks.length})` : `Weekly Tasks (${makerTasks.length})`}
                                        </label>
                                        {(tasks || []).filter(t => !t.completed).length > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleImportTasks}
                                                className="text-xs px-2.5 py-1 rounded-lg bg-[#5b5fc7]/15 hover:bg-[#5b5fc7]/25 text-[#7b83eb] font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Download size={11} /> Import from Tasks ({tasks.filter(t => !t.completed).length})
                                            </button>
                                        )}
                                    </div>

                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            if (!newTaskTitle.trim()) return;
                                            setMakerTasks((prev) => [
                                                ...prev,
                                                {
                                                    title: newTaskTitle.trim(),
                                                    priority: 'high',
                                                },
                                            ]);
                                            setNewTaskTitle('');
                                        }}
                                        className="flex items-center gap-2"
                                    >
                                        <input
                                            type="text"
                                            placeholder={planScope === 'day' ? "Add task (e.g. Video editing, Leetcode, Build feature)..." : "Add weekly task (e.g. Build auth, Write docs, Deploy staging)..."}
                                            value={newTaskTitle}
                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#5b5fc7] transition-all bg-black/20 dark:bg-white/5"
                                            style={{
                                                color: 'var(--text-primary)',
                                                borderColor: 'rgba(255, 255, 255, 0.12)',
                                            }}
                                        />

                                        <button
                                            type="submit"
                                            disabled={!newTaskTitle.trim()}
                                            className="py-2 px-3.5 rounded-xl bg-[#5b5fc7] hover:bg-[#4f52b2] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
                                        >
                                            <Plus size={14} /> Add
                                        </button>
                                    </form>

                                    {/* Personalized Quick Suggestions */}
                                    {personalizedTaskSuggestions.length > 0 && (
                                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1 shrink-0">
                                                <Lightbulb size={15} className="text-[#5b5fc7]" /> 
                                                Suggested:
                                            </span>
                                            {personalizedTaskSuggestions.map((sug, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => {
                                                        setMakerTasks((prev) => [
                                                            ...prev,
                                                            {
                                                                title: sug.title,
                                                                category: sug.category,
                                                                priority: sug.priority || 'high',
                                                            },
                                                        ]);
                                                    }}
                                                    className="text-[11px] px-2 py-0.5 rounded-lg border bg-black/20 dark:bg-white/5 border-slate-700/40 hover:border-[#5b5fc7]/60 hover:bg-[#5b5fc7]/15 text-slate-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer group"
                                                >
                                                    <Plus size={10} className="text-slate-400 group-hover:text-[#7b83eb]" />
                                                    <span className="truncate max-w-[125px]">{sug.title}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Task List */}
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pt-0.5">
                                        {makerTasks.length === 0 ? (
                                            <div className="py-4 text-center border border-dashed rounded-xl" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                                                <p className="text-xs text-slate-400">
                                                    {planScope === 'day'
                                                        ? 'No tasks added yet. Type above or click a suggestion to start.'
                                                        : 'No weekly tasks added yet. Type above or click a suggestion to distribute across the week.'}
                                                </p>
                                            </div>
                                        ) : (
                                            makerTasks.map((t, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between px-3 py-2 rounded-xl border group hover:border-[#5b5fc7]/40 transition-all bg-black/25 dark:bg-white/[0.04]"
                                                    style={{
                                                        borderColor: 'rgba(255, 255, 255, 0.07)',
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <span className="w-2 h-2 rounded-full bg-[#5b5fc7] shrink-0"></span>
                                                        <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                                            {t.title}
                                                        </span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setMakerTasks((prev) => prev.filter((_, i) => i !== idx))}
                                                        className="p-1 rounded text-slate-400 hover:text-red-400 opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Footer Phase 1 */}
                                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
                                    <div className="text-xs text-slate-400">
                                        <span>
                                            {planScope === 'day'
                                                ? `Budget: ${allottedHours}h available from ${formatHourLabel(startHourInput)}`
                                                : `Weekly Budget: ${weeklyTotalHours}h total (~${(weeklyTotalHours / Math.max(1, activeWeekDates.length)).toFixed(1)}h/day starting ${formatHourLabel(weekStartHourInput)})`}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setIsMakerOpen(false)}
                                            className="px-3.5 py-2 rounded-xl text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all text-slate-400 hover:text-slate-200 cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleGenerateSchedule}
                                            disabled={isGenerating || (makerTasks.length === 0 && !includeLunch && !includeDinner && !includeBreakfast)}
                                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#5b5fc7] to-[#4f52b2] hover:opacity-95 text-white font-semibold text-xs shadow-md shadow-[#5b5fc7]/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin text-white" />
                                                    <span>Optimizing Schedule...</span>
                                                </>
                                            ) : (
                                                <span>Generate Schedule</span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Phase 2: Schedule Preview & Duration Adjustment */}
                                <div className="space-y-3.5">
                                    {/* Allotted Budget Summary Bar */}
                                    {(() => {
                                        const productiveMins = previewSchedule
                                            .filter((item) => item.category !== 'meal' && item.category !== 'sleep' && item.category !== 'break')
                                            .reduce((sum, item) => sum + item.durationMinutes, 0);
                                        const scheduledDaysCount = new Set(previewSchedule.map((i) => i.dateStr)).size || activeWeekDates.length;
                                        const endHour = previewSchedule.length > 0
                                            ? Math.floor((previewSchedule[previewSchedule.length - 1].startHour * 60 + previewSchedule[previewSchedule.length - 1].startMinute + previewSchedule[previewSchedule.length - 1].durationMinutes) / 60) % 24
                                            : startHourInput;

                                        return (
                                            <div className="p-3.5 rounded-2xl border space-y-2.5 bg-[#5b5fc7]/10 border-[#5b5fc7]/30">
                                                <div className="flex items-center justify-between text-xs font-semibold">
                                                    <span className="text-[#5b5fc7] dark:text-[#7b83eb] flex items-center gap-1.5 font-bold">
                                                        <Clock size={13} /> {planScope === 'day' ? `${formatHourLabel(previewSchedule[0]?.startHour || startHourInput)} → ${formatHourLabel(endHour)} Routine` : `${scheduledDaysCount}-Day Weekly Plan (${previewSchedule.length} total blocks)`}
                                                    </span>
                                                    <span className="font-mono text-emerald-400 text-xs font-bold">
                                                        {(productiveMins / 60).toFixed(1)}h {planScope === 'day' ? `/ ${allottedHours}h Work Time` : `/ ${weeklyTotalHours}h Weekly Total (~${(productiveMins / 60 / Math.max(1, scheduledDaysCount)).toFixed(1)}h/day)`}
                                                    </span>
                                                </div>

                                                <div className="w-full h-2 rounded-full bg-slate-800/60 overflow-hidden">
                                                    <div
                                                        className="h-full transition-all duration-300 rounded-full bg-[#5b5fc7] w-full"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Mindset & Focus / Recovery Card - Prominently Highlighted Sections */}
                                    {(() => {
                                        const budgetForMindset = planScope === 'day' ? allottedHours : Math.round(weeklyTotalHours / Math.max(1, activeWeekDates.length));
                                        const mindsetData = getMindsetCardData(previewSchedule, budgetForMindset, startHourInput);
                                        const isSleepType = mindsetData.type === 'sleep';

                                        return (
                                            <div
                                                className="p-4 rounded-2xl border space-y-3 backdrop-blur-md shadow-sm transition-all"
                                                style={{
                                                    background: isDark
                                                        ? 'rgba(91, 95, 199, 0.08)'
                                                        : 'rgba(91, 95, 199, 0.04)',
                                                    borderColor: isDark
                                                        ? 'rgba(91, 95, 199, 0.28)'
                                                        : 'rgba(91, 95, 199, 0.22)',
                                                }}
                                            >
                                                {/* 1. Header Section: Title & Badge */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 font-bold text-xs text-[#5b5fc7] dark:text-[#8b92f7]">
                                                        {isSleepType ? <Moon size={15} /> : <Target size={15} />}
                                                        <span className="tracking-tight text-sm font-display">{mindsetData.title}</span>
                                                    </div>
                                                    <span
                                                        className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border shadow-sm"
                                                        style={{
                                                            background: isSleepType
                                                                ? 'rgba(129, 140, 248, 0.15)'
                                                                : 'rgba(91, 95, 199, 0.2)',
                                                            borderColor: isSleepType
                                                                ? 'rgba(129, 140, 248, 0.3)'
                                                                : 'rgba(91, 95, 199, 0.4)',
                                                            color: isSleepType ? '#a5b4fc' : '#8b92f7',
                                                        }}
                                                    >
                                                        {mindsetData.badge}
                                                    </span>
                                                </div>

                                                {/* 2. Highlighted Quote Block */}
                                                <div
                                                    className="p-3.5 rounded-xl border relative overflow-hidden"
                                                    style={{
                                                        background: isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(255, 255, 255, 0.6)',
                                                        borderColor: 'rgba(91, 95, 199, 0.25)',
                                                        borderLeft: '4px solid #5b5fc7',
                                                    }}
                                                >
                                                    <div className="flex items-start gap-2.5">
                                                        <Quote size={18} className="text-[#5b5fc7] shrink-0 mt-0.5 opacity-80" />
                                                        <div className="space-y-1.5 flex-1 min-w-0">
                                                            <p className="text-[13px] font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                                                                “{mindsetData.quote}”
                                                            </p>
                                                            <div className="flex items-center gap-2 pt-0.5">
                                                                <span className="text-[11px] font-semibold text-[#5b5fc7] dark:text-[#a5b4fc]">
                                                                    — {mindsetData.author}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 3. Highlighted Insight / Strategy Tip */}
                                                {mindsetData.tip && (
                                                    <div
                                                        className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold"
                                                        style={{
                                                            background: isSleepType
                                                                ? 'rgba(245, 158, 11, 0.1)'
                                                                : 'rgba(16, 185, 129, 0.1)',
                                                            borderColor: isSleepType
                                                                ? 'rgba(245, 158, 11, 0.25)'
                                                                : 'rgba(16, 185, 129, 0.25)',
                                                            color: isSleepType ? '#fbbf24' : '#34d399',
                                                        }}
                                                    >
                                                        <span className="text-sm shrink-0">{isSleepType ? '🌙' : '⚡'}</span>
                                                        <span className="leading-snug">{mindsetData.tip}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Week Day Filter Tabs (if Week mode) */}
                                    {planScope === 'week' && (
                                        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPreviewDay('all')}
                                                className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                                                    selectedPreviewDay === 'all'
                                                        ? 'bg-[#5b5fc7] text-white shadow-sm'
                                                        : 'bg-black/5 dark:bg-white/5 text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                All {activeWeekDates.length} Days ({previewSchedule.length})
                                            </button>
                                            {displayDays
                                                .filter((d) => activeWeekDates.includes(formatDateStr(d)))
                                                .map((d) => {
                                                    const dStr = formatDateStr(d);
                                                    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
                                                    const count = previewSchedule.filter((item) => item.dateStr === dStr).length;
                                                    return (
                                                        <button
                                                            key={dStr}
                                                            type="button"
                                                            onClick={() => setSelectedPreviewDay(dStr)}
                                                            className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                                                                selectedPreviewDay === dStr
                                                                    ? 'bg-[#5b5fc7] text-white shadow-sm'
                                                                    : 'bg-black/5 dark:bg-white/5 text-slate-400 hover:text-slate-200'
                                                            }`}
                                                        >
                                                            {dayName} ({count})
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    )}

                                    {/* Generated Schedule Timeline Items */}
                                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                                        {previewSchedule
                                            .filter((item) => selectedPreviewDay === 'all' || item.dateStr === selectedPreviewDay)
                                            .map((item) => {
                                                const dayLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(item.dateStr).getDay()];

                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center justify-between p-2.5 rounded-xl border gap-2 group transition-all"
                                                        style={{
                                                            background: 'var(--bg-input)',
                                                            borderColor: 'var(--border-secondary)',
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            {planScope === 'week' && (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 uppercase shrink-0">
                                                                    {dayLabel}
                                                                </span>
                                                            )}
                                                            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#5b5fc7]/15 text-[#5b5fc7] dark:text-[#7b83eb] shrink-0">
                                                                {String(item.startHour).padStart(2, '0')}:{String(item.startMinute).padStart(2, '0')}
                                                            </span>
                                                            <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                                                {item.title}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {/* Duration Selector with auto balancing & full range support */}
                                                            {(() => {
                                                                const DURATION_PRESETS = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 270, 300, 360, 420, 480];
                                                                const allOptions = Array.from(new Set([...DURATION_PRESETS, item.durationMinutes])).sort((a, b) => a - b);

                                                                const formatMins = (mins: number) => {
                                                                    if (mins < 60) return `${mins}m`;
                                                                    const h = Math.floor(mins / 60);
                                                                    const m = mins % 60;
                                                                    if (m === 0) return `${h}h`;
                                                                    if (m === 30) return `${h}.5h`;
                                                                    return `${h}h ${m}m`;
                                                                };

                                                                return (
                                                                    <select
                                                                        value={item.durationMinutes}
                                                                        onChange={(e) => handleUpdatePreviewDuration(item.id, Number(e.target.value))}
                                                                        className="px-2.5 py-1 rounded-lg text-xs font-mono border bg-transparent focus:outline-none focus:border-[#5b5fc7] cursor-pointer"
                                                                        style={{ color: 'var(--text-primary)', borderColor: 'var(--border-card)' }}
                                                                    >
                                                                        {allOptions.map((mins) => (
                                                                            <option key={mins} value={mins} className="bg-slate-900 text-white">
                                                                                {formatMins(mins)}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                );
                                                            })()}

                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemovePreviewItem(item.id)}
                                                                className="p-1 rounded text-slate-400 hover:text-red-400 opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>

                                {/* Footer Phase 2 */}
                                <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
                                    <button
                                        type="button"
                                        onClick={() => setMakerPhase('input')}
                                        className="px-3.5 py-2 rounded-xl text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <ArrowLeft size={13} /> Back to Tasks
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleApplySchedule}
                                        disabled={previewSchedule.length === 0}
                                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        <Check size={14} /> {planScope === 'day' ? 'Apply to Day Routine' : 'Apply to Week Routine'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Sync Success Toast */}
            {syncToast && (
                <div className="fixed bottom-6 left-6 z-50 p-3 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 text-xs font-bold shadow-xl flex items-center gap-2 animate-fade-in-up backdrop-blur-md">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span>{syncToast}</span>
                </div>
            )}

            {/* 7. Google OAuth Sync Modal */}
            <GoogleOAuthModal
                isOpen={isGoogleSyncOpen}
                onClose={() => setIsGoogleSyncOpen(false)}
                currentRoutines={allRoutines}
                onRoutinesUpdated={(newRoutines) => saveMasterRoutines(newRoutines)}
                onAuthChanged={checkGoogleAuth}
            />

            {/* 8. Main App Login Modal */}
            {isLoginModalOpen && (
                <LoginModal onClose={() => setIsLoginModalOpen(false)} />
            )}
        </div>
    );
};
