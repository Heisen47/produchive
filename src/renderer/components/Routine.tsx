import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    Clock,
    Plus,
    Sparkles,
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
    Save
} from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';
import { Activity } from '../global';

// ─── Types ───
export interface PlannedRoutineItem {
    id: string;
    title: string;
    category: 'development' | 'research' | 'meeting' | 'design' | 'writing' | 'break' | 'meal' | 'sleep' | 'other';
    priority: 'high' | 'medium' | 'low';
    dayIndex: number; // 0 (Mon) - 6 (Sun)
    dateStr: string; // YYYY-MM-DD
    startHour: number; // 0 - 23
    startMinute: number; // 0, 15, 30, 45
    durationMinutes: number; // e.g. 30, 60, 90, 120
    completed: boolean;
    subtitle?: string;
    attendees?: string;
}

export interface ActivityGuess {
    category: string;
    label: string;
    confidence: number;
    topApp: string;
    topTitle: string;
    totalSeconds: number;
    appBreakdown: Array<{ name: string; seconds: number }>;
}

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
    const { activities, tasks } = useStore();
    const { isDark } = useTheme();

    // ─── View Modes: 'work_week' (5 days) | 'week' (7 days) | 'day' (1 day) ───
    const [viewMode, setViewMode] = useState<'work_week' | 'week' | 'day'>('work_week');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [pickerMonth, setPickerMonth] = useState<Date>(new Date());
    const [isMakerOpen, setIsMakerOpen] = useState(false);
    const [draggedItem, setDraggedItem] = useState<PlannedRoutineItem | null>(null);
    const [dragError, setDragError] = useState<string | null>(null);

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
    const [allRoutines, setAllRoutines] = useState<PlannedRoutineItem[]>(() => {
        try {
            const saved = localStorage.getItem('produchive_master_routines');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load master routines:', e);
        }
        return [
            {
                id: 'demo-1',
                title: 'Weekly check-in with Engineers',
                category: 'meeting',
                priority: 'high',
                dayIndex: 0,
                dateStr: formatDateStr(now),
                startHour: 14,
                startMinute: 0,
                durationMinutes: 90,
                completed: false,
                subtitle: 'Engineering lab',
                attendees: 'Core Dev Team',
            },
            {
                id: 'demo-2',
                title: 'Deep Focus: Architecture & Core API',
                category: 'development',
                priority: 'high',
                dayIndex: 0,
                dateStr: formatDateStr(now),
                startHour: 10,
                startMinute: 0,
                durationMinutes: 120,
                completed: false,
                subtitle: 'VS Code — main.ts',
            },
            {
                id: 'demo-3',
                title: 'Lunch & Recharge Break 🥗',
                category: 'meal',
                priority: 'medium',
                dayIndex: 0,
                dateStr: formatDateStr(now),
                startHour: 13,
                startMinute: 0,
                durationMinutes: 60,
                completed: false,
                subtitle: 'Healthy meal & fresh air',
            },
        ];
    });

    const saveMasterRoutines = (items: PlannedRoutineItem[]) => {
        setAllRoutines(items);
        try {
            localStorage.setItem('produchive_master_routines', JSON.stringify(items));
            window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
        } catch (e) {
            console.error('Failed to save master routines:', e);
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

    // ─── Routine Maker Form State ───
    const [availableHours, setAvailableHours] = useState<number>(8);
    const [startHourInput, setStartHourInput] = useState<number>(9);
    const [includeLunch, setIncludeLunch] = useState<boolean>(true);
    const [includeDinner, setIncludeDinner] = useState<boolean>(true);
    const [makerTasks, setMakerTasks] = useState<
        Array<{ title: string; duration: number; category: PlannedRoutineItem['category']; priority: PlannedRoutineItem['priority'] }>
    >([
        { title: 'Feature Implementation & Coding', duration: 120, category: 'development', priority: 'high' },
        { title: 'Code Review & Pull Requests', duration: 45, category: 'development', priority: 'medium' },
        { title: 'Technical Documentation & Architecture', duration: 60, category: 'writing', priority: 'medium' },
        { title: 'Project Deployment & Sync', duration: 45, category: 'meeting', priority: 'low' },
    ]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDuration, setNewTaskDuration] = useState(60);
    const [newTaskCategory, setNewTaskCategory] = useState<PlannedRoutineItem['category']>('development');
    const [newTaskPriority, setNewTaskPriority] = useState<PlannedRoutineItem['priority']>('high');

    // ─── Smart Schedule Generator ───
    const handleGenerateSchedule = () => {
        if (makerTasks.length === 0) return;

        const targetDateStr = formatDateStr(selectedDate);
        const otherRoutines = allRoutines.filter((r) => r.dateStr !== targetDateStr);

        const priorityOrder = { high: 1, medium: 2, low: 3 };
        const sorted = [...makerTasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        const newItems: PlannedRoutineItem[] = [];
        let cursorHour = startHourInput;
        let cursorMin = 0;

        sorted.forEach((task, index) => {
            // Lunch Break insertion at 12:30 PM
            if (includeLunch && cursorHour === 12 && cursorMin >= 30) {
                newItems.push({
                    id: `meal-lunch-${Date.now()}`,
                    title: 'Lunch Break & Recharge 🥗',
                    category: 'meal',
                    priority: 'high',
                    dayIndex: selectedDate.getDay(),
                    dateStr: targetDateStr,
                    startHour: 12,
                    startMinute: 30,
                    durationMinutes: 60,
                    completed: false,
                    subtitle: 'Healthy meal & fresh air',
                });
                cursorHour = 13;
                cursorMin = 30;
            }

            // Dinner Break insertion at 7:30 PM
            if (includeDinner && cursorHour === 19 && cursorMin >= 30) {
                newItems.push({
                    id: `meal-dinner-${Date.now()}`,
                    title: 'Dinner & Relaxation 🍽️',
                    category: 'meal',
                    priority: 'high',
                    dayIndex: selectedDate.getDay(),
                    dateStr: targetDateStr,
                    startHour: 19,
                    startMinute: 30,
                    durationMinutes: 60,
                    completed: false,
                    subtitle: 'Family / Rest',
                });
                cursorHour = 20;
                cursorMin = 30;
            }

            if (cursorHour >= 23) return;

            newItems.push({
                id: `routine-${Date.now()}-${index}`,
                title: task.title,
                category: task.category,
                priority: task.priority,
                dayIndex: selectedDate.getDay(),
                dateStr: targetDateStr,
                startHour: cursorHour,
                startMinute: cursorMin,
                durationMinutes: task.duration,
                completed: false,
                subtitle: task.category === 'development' ? 'Deep Work Block' : 'Scheduled Plan',
            });

            const totalMins = cursorMin + task.duration;
            cursorHour += Math.floor(totalMins / 60);
            cursorMin = totalMins % 60;
        });

        // Add Night Sleep indicator at 11:00 PM
        newItems.push({
            id: `sleep-${Date.now()}`,
            title: 'Night Sleep & Recovery 🌙',
            category: 'sleep',
            priority: 'high',
            dayIndex: selectedDate.getDay(),
            dateStr: targetDateStr,
            startHour: 23,
            startMinute: 0,
            durationMinutes: 60,
            completed: false,
            subtitle: 'Recommended 7-8 hrs rest',
        });

        saveMasterRoutines([...otherRoutines, ...newItems]);
        setIsMakerOpen(false);
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
            duration: 45,
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
                            Teams Schedule Timeline • Double-click any activity to view & edit details
                        </p>
                    </div>
                </div>

                {/* Right: Actions (Today + Your Plans) */}
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => setSelectedDate(new Date())}
                        className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border"
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

            {/* Drag Error Toast Alert */}
            {dragError && (
                <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-500 dark:text-red-300 text-xs font-semibold flex items-center gap-2.5 animate-fade-in shadow-lg">
                    <AlertCircle size={16} className="text-red-500 dark:text-red-400 shrink-0" />
                    <span>{dragError}</span>
                </div>
            )}

            {/* 3. Teams Calendar Grid Table */}
            <div
                className="rounded-3xl overflow-hidden border transition-colors"
                style={{
                    background: 'var(--bg-card-solid)',
                    borderColor: 'var(--border-secondary)',
                }}
            >
                {/* Column Headers (Days of the week) */}
                <div
                    className="grid grid-cols-[80px_repeat(auto-fit,minmax(0,1fr))] border-b"
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
                <div className="overflow-y-auto custom-scrollbar max-h-[680px] relative">
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
                                            {cellRoutines.map((item) => {
                                                const colors = getEventColors(item.category, isDark);
                                                const isPastTask = item.dateStr < todayStr || (item.dateStr === todayStr && item.startHour < currentHour);

                                                return (
                                                    <div
                                                        key={item.id}
                                                        draggable={!isPastTask}
                                                        onDragStart={(e) => handleDragStart(e, item)}
                                                        onDoubleClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedRoutineDetails({ ...item });
                                                        }}
                                                        className={`p-2.5 rounded-xl border shadow-md transition-all group relative overflow-hidden ${
                                                            isPastTask
                                                                ? 'cursor-default opacity-60'
                                                                : 'cursor-grab active:cursor-grabbing hover:scale-[1.02]'
                                                        } ${item.completed ? 'line-through' : ''}`}
                                                        style={{
                                                            background: colors.bg,
                                                            borderColor: colors.border,
                                                            boxShadow: isDark
                                                                ? '0 4px 12px rgba(0,0,0,0.25)'
                                                                : '0 2px 8px rgba(0,0,0,0.06)',
                                                        }}
                                                    >
                                                        <div className="flex items-start justify-between gap-1.5">
                                                            <div className="flex items-center gap-1.5 min-w-0">
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

                                                        <div
                                                            className="flex items-center justify-between mt-2 pt-1.5 border-t text-[10px]"
                                                            style={{
                                                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                                                color: colors.subtext,
                                                            }}
                                                        >
                                                            <span>
                                                                {formatTimeSlot(item.startHour, item.startMinute)} ({item.durationMinutes}m)
                                                            </span>

                                                            <div className="flex items-center gap-1.5">
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
                                                    </div>
                                                );
                                            })}

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
                                        setSelectedRoutineDetails(null);
                                    }}
                                    className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5"
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
                                    {selectedActivityDetails.guess.appBreakdown.map((app, i) => {
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

            {/* 6. "Your Plans" Modal Form */}
            {isMakerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                    <div
                        className="w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar border"
                        style={{
                            background: 'var(--bg-card-solid)',
                            borderColor: 'var(--border-card)',
                            boxShadow: 'var(--shadow-card)',
                        }}
                    >
                        <div
                            className="flex items-center justify-between pb-4 border-b mb-6"
                            style={{ borderColor: 'var(--border-secondary)' }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-[#5b5fc7]/20 text-[#5b5fc7] dark:text-[#7b83eb] border border-[#5b5fc7]/40">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                                        Your Daily Plans
                                    </h3>
                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        Tell us how much time you have and what you want to do today. We'll smart-schedule meals, deep work, and rest.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMakerOpen(false)}
                                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div
                                className="p-4 rounded-2xl border space-y-4"
                                style={{
                                    background: 'var(--bg-elevated)',
                                    borderColor: 'var(--border-secondary)',
                                }}
                            >
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#5b5fc7] dark:text-[#7b83eb] flex items-center gap-2">
                                    <Clock size={14} /> Step 1: Daily Time Budget & Routines
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                            Start Hour
                                        </label>
                                        <select
                                            value={startHourInput}
                                            onChange={(e) => setStartHourInput(Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#5b5fc7]"
                                            style={{
                                                background: 'var(--bg-input)',
                                                color: 'var(--text-primary)',
                                                borderColor: 'var(--border-input)',
                                            }}
                                        >
                                            {hours.map((h) => (
                                                <option key={h} value={h}>
                                                    {formatHourLabel(h)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                            Available Work Hours
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={16}
                                            value={availableHours}
                                            onChange={(e) => setAvailableHours(Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#5b5fc7]"
                                            style={{
                                                background: 'var(--bg-input)',
                                                color: 'var(--text-primary)',
                                                borderColor: 'var(--border-input)',
                                            }}
                                        />
                                    </div>
                                </div>

                                <div
                                    className="flex flex-wrap gap-4 pt-2 border-t text-xs"
                                    style={{
                                        borderColor: 'var(--border-secondary)',
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={includeLunch}
                                            onChange={(e) => setIncludeLunch(e.target.checked)}
                                            className="rounded text-[#5b5fc7]"
                                        />
                                        <span>Auto-slot Lunch Break (12:30 PM)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={includeDinner}
                                            onChange={(e) => setIncludeDinner(e.target.checked)}
                                            className="rounded text-[#5b5fc7]"
                                        />
                                        <span>Auto-slot Dinner Break (7:30 PM)</span>
                                    </label>
                                </div>
                            </div>

                            <div
                                className="p-4 rounded-2xl border space-y-4"
                                style={{
                                    background: 'var(--bg-elevated)',
                                    borderColor: 'var(--border-secondary)',
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                                        <ListTodo size={14} /> Step 2: What tasks do you want to accomplish today?
                                    </h4>

                                    {(tasks || []).length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleImportTasks}
                                            className="text-xs px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 transition-all flex items-center gap-1"
                                        >
                                            <Download size={12} /> Import from Tasks ({tasks.filter(t => !t.completed).length})
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                    <input
                                        type="text"
                                        placeholder="Task title (e.g. Implement GraphQL endpoint)"
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        className="sm:col-span-5 px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#5b5fc7]"
                                        style={{
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            borderColor: 'var(--border-input)',
                                        }}
                                    />

                                    <select
                                        value={newTaskCategory}
                                        onChange={(e) => setNewTaskCategory(e.target.value as any)}
                                        className="sm:col-span-3 px-2.5 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#5b5fc7]"
                                        style={{
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            borderColor: 'var(--border-input)',
                                        }}
                                    >
                                        <option value="development">💻 Coding / Dev</option>
                                        <option value="research">📚 Research</option>
                                        <option value="meeting">👥 Meeting</option>
                                        <option value="design">🎨 Design</option>
                                        <option value="writing">✍️ Writing</option>
                                        <option value="break">☕ Break</option>
                                        <option value="other">📦 Other</option>
                                    </select>

                                    <select
                                        value={newTaskDuration}
                                        onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                                        className="sm:col-span-2 px-2.5 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#5b5fc7]"
                                        style={{
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            borderColor: 'var(--border-input)',
                                        }}
                                    >
                                        <option value={30}>30m</option>
                                        <option value={45}>45m</option>
                                        <option value={60}>1 hr</option>
                                        <option value={90}>1.5 hrs</option>
                                        <option value={120}>2 hrs</option>
                                    </select>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!newTaskTitle.trim()) return;
                                            setMakerTasks((prev) => [
                                                ...prev,
                                                {
                                                    title: newTaskTitle.trim(),
                                                    duration: newTaskDuration,
                                                    category: newTaskCategory,
                                                    priority: newTaskPriority,
                                                },
                                            ]);
                                            setNewTaskTitle('');
                                        }}
                                        className="sm:col-span-2 py-2 px-3 rounded-xl bg-[#5b5fc7] hover:bg-[#4f52b2] text-white font-semibold text-xs flex items-center justify-center gap-1 transition-all shadow-md"
                                    >
                                        <Plus size={14} /> Add
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pt-1">
                                    {makerTasks.map((t, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-2.5 rounded-xl border"
                                            style={{
                                                background: 'var(--bg-input)',
                                                borderColor: 'var(--border-secondary)',
                                            }}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span
                                                    className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border"
                                                    style={{
                                                        background: 'var(--bg-elevated)',
                                                        borderColor: 'var(--border-card)',
                                                        color: 'var(--text-secondary)',
                                                    }}
                                                >
                                                    {t.category}
                                                </span>
                                                <span
                                                    className="text-xs font-semibold truncate"
                                                    style={{ color: 'var(--text-primary)' }}
                                                >
                                                    {t.title}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                    {t.duration}m
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setMakerTasks((prev) => prev.filter((_, i) => i !== idx))}
                                                    className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-end gap-3 mt-6 pt-4 border-t"
                            style={{ borderColor: 'var(--border-secondary)' }}
                        >
                            <button
                                type="button"
                                onClick={() => setIsMakerOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleGenerateSchedule}
                                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-300 flex items-center gap-2 shadow-lg hover:scale-105"
                                style={{
                                    background: 'linear-gradient(135deg, #5b5fc7 0%, #4f52b2 100%)',
                                    boxShadow: '0 4px 15px rgba(91, 95, 199, 0.4)',
                                }}
                            >
                                <Sparkles size={14} /> Smart Schedule & Generate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
