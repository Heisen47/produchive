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
    Layers,
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

// ─── Categories & Styling Matching Teams Calendar ───
const EVENT_COLORS: Record<string, { bg: string; border: string; accent: string; text: string }> = {
    development: { bg: '#2b2d42', border: '#4f52b2', accent: '#7b83eb', text: '#e2e8f0' },
    meeting: { bg: '#373059', border: '#6e65a0', accent: '#a594f9', text: '#f3f4f6' },
    research: { bg: '#253342', border: '#3b82f6', accent: '#60a5fa', text: '#e2e8f0' },
    design: { bg: '#1e3a47', border: '#06b6d4', accent: '#22d3ee', text: '#e2e8f0' },
    writing: { bg: '#1f3d36', border: '#10b981', accent: '#34d399', text: '#e2e8f0' },
    meal: { bg: '#3f2d24', border: '#f97316', accent: '#fb923c', text: '#ffedd5' },
    break: { bg: '#3a3022', border: '#f59e0b', accent: '#fbbf24', text: '#fef3c7' },
    sleep: { bg: '#1e2238', border: '#6366f1', accent: '#818cf8', text: '#e0e7ff' },
    other: { bg: '#282b36', border: '#64748b', accent: '#94a3b8', text: '#e2e8f0' },
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
    const [isMakerOpen, setIsMakerOpen] = useState(false);
    const [draggedItem, setDraggedItem] = useState<PlannedRoutineItem | null>(null);
    const [dragError, setDragError] = useState<string | null>(null);

    // ─── Double-Click Detail Modal States ───
    const [selectedRoutineDetails, setSelectedRoutineDetails] = useState<PlannedRoutineItem | null>(null);
    const [selectedActivityDetails, setSelectedActivityDetails] = useState<{
        dateStr: string;
        hour: number;
        guess: ActivityGuess;
    } | null>(null);

    // Range activities from database
    const [rangeActivities, setRangeActivities] = useState<Record<string, { activities: Activity[] }>>({});

    // Current Time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const todayStr = formatDateStr(now);

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
        } catch (e) {
            console.error('Failed to save master routines:', e);
        }
    };

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

        // Validation 1: Dragged task must NOT be a past task
        const isSourcePast = draggedItem.dateStr < todayStr || (draggedItem.dateStr === todayStr && draggedItem.startHour < currentHour);
        if (isSourcePast) {
            setDragError(`Past tasks cannot be dragged to the future! (${draggedItem.title} belongs to a past timeslot).`);
            setTimeout(() => setDragError(null), 4500);
            setDraggedItem(null);
            return;
        }

        // Validation 2: Target timeslot must NOT be in the past
        const isTargetPast = targetDateStr < todayStr || (targetDateStr === todayStr && targetHour < currentHour);
        if (isTargetPast) {
            setDragError(`Cannot drag tasks into the past! (${formatHourLabel(targetHour)} has already passed). Drag to ${formatHourLabel(currentHour)} or later.`);
            setTimeout(() => setDragError(null), 4500);
            setDraggedItem(null);
            return;
        }

        // Move the item to new date & hour
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
                className="rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                style={{
                    background: isDark ? '#1f1f23' : '#ffffff',
                    border: '1px solid var(--border-secondary)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                }}
            >
                {/* Left: Icon & Title */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#5b5fc7]/20 border border-[#5b5fc7]/40 text-[#7b83eb] shadow-sm">
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-display font-bold text-slate-100 flex items-center gap-2">
                            Calendar
                        </h1>
                        <p className="text-xs text-slate-400">
                            Teams Schedule Timeline • Double-click any activity to view & edit details
                        </p>
                    </div>
                </div>

                {/* Right: Actions (Today + Your Plans) */}
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => setSelectedDate(new Date())}
                        className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all hover:bg-white/5 border border-slate-700 text-slate-300"
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
                className="rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-4"
                style={{
                    background: isDark ? '#1a1a1e' : '#f8f9fa',
                    border: '1px solid var(--border-secondary)',
                }}
            >
                {/* Date Controls */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSelectedDate(new Date())}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-slate-700 transition-all"
                    >
                        Today
                    </button>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleDateStep(-1)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                            title="Previous"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => handleDateStep(1)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                            title="Next"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="font-display font-bold text-sm text-slate-100 flex items-center gap-1 ml-2">
                        <span>
                            {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <ChevronDown size={14} className="text-slate-400" />
                    </div>
                </div>

                {/* View Switcher Dropdown */}
                <div className="flex items-center rounded-xl p-1 bg-slate-900/60 border border-slate-700">
                    <button
                        onClick={() => setViewMode('day')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            viewMode === 'day' ? 'bg-[#5b5fc7] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Day
                    </button>
                    <button
                        onClick={() => setViewMode('work_week')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            viewMode === 'work_week' ? 'bg-[#5b5fc7] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Work week
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            viewMode === 'week' ? 'bg-[#5b5fc7] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Week
                    </button>
                </div>
            </div>

            {/* Drag Error Toast Alert */}
            {dragError && (
                <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2.5 animate-fade-in shadow-lg">
                    <AlertCircle size={16} className="text-red-400 shrink-0" />
                    <span>{dragError}</span>
                </div>
            )}

            {/* 3. Teams Calendar Grid Table */}
            <div
                className="rounded-3xl overflow-hidden border"
                style={{
                    background: isDark ? '#141416' : '#ffffff',
                    borderColor: 'var(--border-secondary)',
                }}
            >
                {/* Column Headers (Days of the week) */}
                <div className="grid grid-cols-[80px_repeat(auto-fit,minmax(0,1fr))] border-b border-slate-800 bg-slate-900/40">
                    <div className="p-3 border-r border-slate-800 text-[11px] font-semibold text-slate-500 text-center">
                        GMT+5:30
                    </div>

                    {displayDays.map((day, idx) => {
                        const dateStr = formatDateStr(day);
                        const isDayToday = dateStr === todayStr;
                        const dayName = day.toLocaleDateString('en-US', { weekday: 'long' });
                        const dayNum = day.getDate();

                        return (
                            <div
                                key={idx}
                                className={`p-3 text-left border-r border-slate-800/80 transition-colors ${
                                    isDayToday ? 'bg-blue-500/5' : ''
                                }`}
                            >
                                <div className="text-xl font-display font-bold text-slate-100">{dayNum}</div>
                                <div className={`text-xs font-medium ${isDayToday ? 'text-[#7b83eb] font-bold' : 'text-slate-400'}`}>
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
                                className={`grid grid-cols-[80px_repeat(auto-fit,minmax(0,1fr))] min-h-[90px] border-b border-slate-800/50 relative ${
                                    isCurrentHourRow ? 'bg-white/[0.01]' : ''
                                }`}
                            >
                                <div className="p-2.5 text-right pr-4 text-xs font-semibold text-slate-400 border-r border-slate-800/80 select-none flex flex-col justify-start">
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
                                            className={`p-1.5 border-r border-slate-800/60 transition-colors relative flex flex-col gap-1.5 ${
                                                isDayToday ? 'bg-blue-500/[0.02]' : ''
                                            } hover:bg-white/[0.02]`}
                                        >
                                            {/* Draggable Routine Cards */}
                                            {cellRoutines.map((item) => {
                                                const colors = EVENT_COLORS[item.category] || EVENT_COLORS.other;
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
                                                            boxShadow: `0 4px 12px rgba(0,0,0,0.25)`,
                                                        }}
                                                    >
                                                        <div className="flex items-start justify-between gap-1.5">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <h4 className="font-semibold text-xs text-slate-100 leading-tight truncate">
                                                                    {item.title}
                                                                </h4>
                                                                {isPastTask && (
                                                                    <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-slate-400 shrink-0 font-medium">
                                                                        Past
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {!isPastTask && (
                                                                <GripVertical
                                                                    size={12}
                                                                    className="text-slate-400 opacity-0 group-hover:opacity-100 shrink-0 cursor-grab"
                                                                />
                                                            )}
                                                        </div>

                                                        {item.subtitle && (
                                                            <p className="text-[11px] text-slate-300 mt-1 truncate">
                                                                {item.subtitle}
                                                            </p>
                                                        )}

                                                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/10 text-[10px] text-slate-400">
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
                                                                    className="hover:text-emerald-400 transition-colors"
                                                                    title="Mark done"
                                                                >
                                                                    {item.completed ? (
                                                                        <CheckCircle2 size={13} className="text-emerald-400" />
                                                                    ) : (
                                                                        <Circle size={13} />
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedRoutineDetails({ ...item });
                                                                    }}
                                                                    className="hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-all"
                                                                    title="Edit Details"
                                                                >
                                                                    <Edit3 size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        saveMasterRoutines(allRoutines.filter((r) => r.id !== item.id));
                                                                    }}
                                                                    className="hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
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
                                                    className="p-2 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-xs shadow-md cursor-pointer hover:border-emerald-400 transition-all"
                                                    title={`Double-click for details. Tracked: ${guess.topApp} (${Math.round(guess.totalSeconds / 60)}m)`}
                                                >
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="font-bold text-[11px] text-emerald-400 truncate">
                                                            🤖 {guess.label}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {formatDuration(guess.totalSeconds)}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
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

            {/* 4. Task Details / Edit Modal (Triggered by Double Clicking a Routine Card) */}
            {selectedRoutineDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                    <div
                        className="w-full max-w-lg rounded-3xl p-6 shadow-2xl relative"
                        style={{
                            background: isDark ? '#1a1a20' : '#ffffff',
                            border: '1px solid var(--border-primary)',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-slate-700/50 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-[#5b5fc7]/20 text-[#7b83eb] border border-[#5b5fc7]/40">
                                    <Edit3 size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-display font-bold text-slate-100">
                                        Task & Routine Details
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        {selectedRoutineDetails.dateStr} • {formatTimeSlot(selectedRoutineDetails.startHour, selectedRoutineDetails.startMinute)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedRoutineDetails(null)}
                                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Title</label>
                                <input
                                    type="text"
                                    value={selectedRoutineDetails.title}
                                    onChange={(e) =>
                                        setSelectedRoutineDetails({ ...selectedRoutineDetails, title: e.target.value })
                                    }
                                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-[#5b5fc7]"
                                />
                            </div>

                            {/* Subtitle / Notes */}
                            <div>
                                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Subtitle / Location</label>
                                <input
                                    type="text"
                                    value={selectedRoutineDetails.subtitle || ''}
                                    onChange={(e) =>
                                        setSelectedRoutineDetails({ ...selectedRoutineDetails, subtitle: e.target.value })
                                    }
                                    placeholder="e.g. Engineering Room / VS Code"
                                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-[#5b5fc7]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Category */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Category</label>
                                    <select
                                        value={selectedRoutineDetails.category}
                                        onChange={(e) =>
                                            setSelectedRoutineDetails({
                                                ...selectedRoutineDetails,
                                                category: e.target.value as any,
                                            })
                                        }
                                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#5b5fc7]"
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

                                {/* Duration */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Duration (Minutes)</label>
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
                                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#5b5fc7]"
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                                <span className="text-xs text-slate-300">Completion Status</span>
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
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                    }`}
                                >
                                    {selectedRoutineDetails.completed ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                                    {selectedRoutineDetails.completed ? 'Completed' : 'Mark as Done'}
                                </button>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-700/60">
                            <button
                                type="button"
                                onClick={() => {
                                    saveMasterRoutines(allRoutines.filter((r) => r.id !== selectedRoutineDetails.id));
                                    setSelectedRoutineDetails(null);
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1.5"
                            >
                                <Trash2 size={14} /> Delete
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedRoutineDetails(null)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all"
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

            {/* 5. Tracked Activity Inspection Modal (Triggered by Double Clicking an Activity Guess Card) */}
            {selectedActivityDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                    <div
                        className="w-full max-w-lg rounded-3xl p-6 shadow-2xl relative"
                        style={{
                            background: isDark ? '#1a1a20' : '#ffffff',
                            border: '1px solid var(--border-primary)',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-slate-700/50 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                    <ActivityIcon size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-display font-bold text-slate-100">
                                        Tracked Activity Inspection
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        {selectedActivityDetails.dateStr} • {formatHourLabel(selectedActivityDetails.hour)} Slot
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedActivityDetails(null)}
                                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Classification */}
                            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-emerald-400">
                                        🤖 {selectedActivityDetails.guess.label}
                                    </span>
                                    <span className="text-xs font-mono text-emerald-300">
                                        {selectedActivityDetails.guess.confidence}% Confidence
                                    </span>
                                </div>
                                <p className="text-xs text-slate-300">
                                    Primary Application: <strong>{selectedActivityDetails.guess.topApp}</strong>
                                </p>
                                <p className="text-[11px] text-slate-400 truncate mt-1">
                                    Window: {selectedActivityDetails.guess.topTitle}
                                </p>
                            </div>

                            {/* Total Time & Breakdown */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                                    <span>App Usage Breakdown</span>
                                    <span className="font-mono text-indigo-400">
                                        Total: {formatDuration(selectedActivityDetails.guess.totalSeconds)}
                                    </span>
                                </h4>

                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {selectedActivityDetails.guess.appBreakdown.map((app, i) => {
                                        const pct = Math.round(
                                            (app.seconds / (selectedActivityDetails.guess.totalSeconds || 1)) * 100
                                        );
                                        return (
                                            <div key={i} className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-semibold text-slate-200">{app.name}</span>
                                                    <span className="text-slate-400 font-mono">
                                                        {formatDuration(app.seconds)} ({pct}%)
                                                    </span>
                                                </div>
                                                <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-400 rounded-full"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-700/60">
                            <button
                                type="button"
                                onClick={() => {
                                    // Convert this tracked activity into a planned routine item!
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
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-indigo-300 hover:bg-indigo-500/15 transition-all flex items-center gap-1.5"
                            >
                                <Plus size={14} /> Add as Routine Block
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedActivityDetails(null)}
                                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all"
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
                        className="w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
                        style={{
                            background: isDark ? '#1a1a20' : '#ffffff',
                            border: '1px solid var(--border-primary)',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-slate-700/50 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-[#5b5fc7]/20 text-[#7b83eb] border border-[#5b5fc7]/40">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-display font-bold text-slate-100">Your Daily Plans</h3>
                                    <p className="text-xs text-slate-400">
                                        Tell us how much time you have and what you want to do today. We'll smart-schedule meals, deep work, and rest.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMakerOpen(false)}
                                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-700/60 space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7b83eb] flex items-center gap-2">
                                    <Clock size={14} /> Step 1: Daily Time Budget & Routines
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1.5 block">Start Hour</label>
                                        <select
                                            value={startHourInput}
                                            onChange={(e) => setStartHourInput(Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#5b5fc7]"
                                        >
                                            {hours.map((h) => (
                                                <option key={h} value={h}>
                                                    {formatHourLabel(h)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs text-slate-400 mb-1.5 block">Available Work Hours</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={16}
                                            value={availableHours}
                                            onChange={(e) => setAvailableHours(Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#5b5fc7]"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-800 text-xs text-slate-300">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={includeLunch}
                                            onChange={(e) => setIncludeLunch(e.target.checked)}
                                            className="rounded bg-slate-800 border-slate-600 text-[#5b5fc7]"
                                        />
                                        <span>Auto-slot Lunch Break (12:30 PM)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={includeDinner}
                                            onChange={(e) => setIncludeDinner(e.target.checked)}
                                            className="rounded bg-slate-800 border-slate-600 text-[#5b5fc7]"
                                        />
                                        <span>Auto-slot Dinner Break (7:30 PM)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-700/60 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                                        <ListTodo size={14} /> Step 2: What tasks do you want to accomplish today?
                                    </h4>

                                    {(tasks || []).length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleImportTasks}
                                            className="text-xs px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition-all flex items-center gap-1"
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
                                        className="sm:col-span-5 px-3 py-2 rounded-xl text-xs bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#5b5fc7]"
                                    />

                                    <select
                                        value={newTaskCategory}
                                        onChange={(e) => setNewTaskCategory(e.target.value as any)}
                                        className="sm:col-span-3 px-2.5 py-2 rounded-xl text-xs bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#5b5fc7]"
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
                                        className="sm:col-span-2 px-2.5 py-2 rounded-xl text-xs bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#5b5fc7]"
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
                                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-white/5 border border-white/10 text-slate-300">
                                                    {t.category}
                                                </span>
                                                <span className="text-xs font-semibold text-slate-200 truncate">
                                                    {t.title}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-slate-400">{t.duration}m</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setMakerTasks((prev) => prev.filter((_, i) => i !== idx))}
                                                    className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700/60">
                            <button
                                type="button"
                                onClick={() => setIsMakerOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all"
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
