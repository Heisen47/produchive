import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
    Clock,
    Activity as ActivityIcon,
    ArrowUpRight,
    Zap,
    Hourglass,
    Calendar as CalendarIcon,
    CheckCircle2,
    Circle,
    ArrowRight,
    ThumbsUp,
    ThumbsDown,
    Target,
    Layers,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';
import { analyticsService, websocketService } from '../lib/services';
import { submitActivityFeedback, inferActivityDetails } from '../lib/activityAutoTracker';

import { TotoroBg } from './TotoroBg';
import { NoFaceBg } from './NoFaceBg';
import { SootSpriteBg } from './SootSpriteBg';
import { TotoroBusStopBg } from './TotoroBusStopBg';
import { PeekabooCat } from './PeekabooCat';
import { StreakCard } from './StreakCard';
import { ScreenPermissionBanner } from './ScreenPermissionBanner';

// Helper for formatting duration
const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ${Math.floor(seconds % 60)}s`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
};

// Interactive Metric Card with tilt + shimmer
const MetricCard = ({ title, value, subtext, icon: Icon, trend, delay = 0, onClick }: any) => {
    const { isDark } = useTheme();
    const cardRef = useRef<HTMLDivElement>(null);
    const shimmerRef = useRef<HTMLDivElement>(null);

    let BgComponent = null;
    if (title === 'Total Time Tracked') BgComponent = TotoroBg;
    if (title === 'Most Used App') BgComponent = NoFaceBg;
    if (title === 'Active Sessions' || title === 'Focus Score') BgComponent = SootSpriteBg;

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        // Tilt: max 6 degrees
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;
        card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px) scale(1.02)`;

        // Move shimmer highlight
        if (shimmerRef.current) {
            shimmerRef.current.style.background = `radial-gradient(300px circle at ${x}px ${y}px, var(--accent-glow), transparent 70%)`;
        }
    }, []);

    const handleMouseLeave = useCallback(() => {
        const card = cardRef.current;
        if (card) {
            card.style.transform = 'perspective(600px) rotateX(0) rotateY(0) translateY(0) scale(1)';
        }
        if (shimmerRef.current) {
            shimmerRef.current.style.background = 'transparent';
        }
    }, []);

    return (
        <div
            ref={cardRef}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`glass-card rounded-2xl p-6 ${
                onClick ? 'cursor-pointer group hover:border-indigo-500/40 hover:shadow-lg' : 'cursor-default'
            } animate-fade-in-up relative overflow-hidden`}
            style={{
                animationDelay: `${delay}ms`,
                transition: 'transform 0.15s ease-out, box-shadow 0.3s ease, border-color 0.2s ease',
                willChange: 'transform',
            }}
            title={onClick ? 'Click to open Live Monitor' : undefined}
        >
            {BgComponent && <BgComponent className="opacity-30 dark:opacity-20 transition-opacity duration-500 group-hover:opacity-40 dark:group-hover:opacity-30" />}

            {/* Shimmer overlay */}
            <div
                ref={shimmerRef}
                className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300"
                style={{ opacity: 0.6 }}
            />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                    <div
                        className="p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110"
                        style={{
                            background: 'var(--accent-glow)',
                            color: 'var(--accent)',
                        }}
                    >
                        <Icon size={20} />
                    </div>
                    {trend && (
                        <div className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                            style={{
                                color: '#4ade80',
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                            }}
                        >
                            <ArrowUpRight size={12} />
                            {trend}
                        </div>
                    )}
                    {onClick && !trend && (
                        <span className="text-[10px] font-semibold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1 transition-colors opacity-80 group-hover:opacity-100">
                            Live Monitor
                            <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                        </span>
                    )}
                </div>
                <div>
                    <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{title}</h3>
                    <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{value}</p>
                    {subtext && <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{subtext}</p>}
                </div>
            </div>
        </div>
    );
};

export const Dashboard = ({ onNavigate }: { onNavigate?: (view: string) => void }) => {
    const { activities, isMonitoring, setMonitoring, stats: userStats, analytics, setAnalytics, routines, toggleRoutineComplete, ratings } = useStore();
    const { isDark } = useTheme();

    const todayStr = useMemo(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }, []);

    const todayRoutines = useMemo(() => {
        return (routines || []).filter((r) => r.dateStr === todayStr);
    }, [routines, todayStr]);

    const nowMinutes = useMemo(() => {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    }, []);

    const currentActiveRoutine = useMemo(() => {
        return todayRoutines.find((r) => {
            const start = r.startHour * 60 + r.startMinute;
            const end = start + r.durationMinutes;
            return nowMinutes >= start && nowMinutes < end;
        });
    }, [todayRoutines, nowMinutes]);

    const nextUpcomingRoutine = useMemo(() => {
        const upcoming = todayRoutines
            .filter((r) => r.startHour * 60 + r.startMinute > nowMinutes)
            .sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));
        return upcoming[0] || null;
    }, [todayRoutines, nowMinutes]);

    const routineStats = useMemo(() => {
        const scheduled = todayRoutines.filter((r) => !r.isAutoDetected);
        const total = scheduled.length;
        const completed = scheduled.filter((r) => r.completed).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        const autoDetected = todayRoutines.filter((r) => r.isAutoDetected);
        return { total, completed, percent, autoDetected };
    }, [todayRoutines]);

    const [isAutoTrayExpanded, setIsAutoTrayExpanded] = useState(false);

    const openLiveMonitor = () => {
        sessionStorage.setItem('analytics_initial_period', 'live');
        if (onNavigate) onNavigate('analytics');
        window.dispatchEvent(new CustomEvent('produchive_open_live_monitor'));
    };

    const usageStats = useMemo(() => {
        const appUsage: Record<string, number> = {};
        const appCounts: Record<string, number> = {};
        let totalDuration = 0;

        activities.forEach(act => {
            const duration = (act.duration ? act.duration / 1000 : 1);
            const appName = act.owner.name;
            appUsage[appName] = (appUsage[appName] || 0) + duration;
            appCounts[appName] = (appCounts[appName] || 0) + 1;
            totalDuration += duration;
        });

        const sortedApps = Object.entries(appUsage)
            .sort(([, a], [, b]) => b - a)
            .map(([name, duration]) => ({ name, duration, count: appCounts[name] }));

        return { totalDuration, topApps: sortedApps, mostUsed: sortedApps[0], activeCount: activities.length };
    }, [activities]);

    const focusScoreData = useMemo(() => {
        // 1. If remote backend returned a valid focusScore, use it
        if (analytics?.focusScore && analytics.focusScore > 0) {
            const val = Math.min(100, Math.round(analytics.focusScore));
            const label = val >= 80 ? 'Deep Focus' : val >= 50 ? 'Good Focus' : 'Needs Focus';
            return {
                value: `${val}/100`,
                subtext: `${label} · Real-time activity ratio`,
            };
        }

        // 2. If an AI evaluation rating exists for today, scale to 100
        const latestRating = ratings && ratings.length > 0 ? ratings[ratings.length - 1] : null;
        if (latestRating && typeof latestRating.rating === 'number') {
            const scaled = Math.min(100, Math.round(latestRating.rating * 10));
            const verdictLabel = latestRating.verdict ? `${latestRating.verdict.charAt(0).toUpperCase() + latestRating.verdict.slice(1)} Day` : 'AI Evaluated';
            return {
                value: `${scaled}/100`,
                subtext: `${verdictLabel} · AI productivity score`,
            };
        }

        // 3. Compute live from local activities & today's planned calendar targets
        if (!activities || activities.length === 0) {
            return {
                value: '—',
                subtext: isMonitoring ? 'Listening for active window...' : 'Enable monitor to measure focus',
            };
        }

        // Extract today's planned calendar targets (exclude meals/breaks/sleep)
        const plannedTitles = todayRoutines
            .filter((r) => !r.isAutoDetected && r.category !== 'meal' && r.category !== 'break' && r.category !== 'sleep')
            .map((r) => r.title.toLowerCase().trim())
            .filter(Boolean);

        let productiveSec = 0;
        let distractingSec = 0;
        let totalSec = 0;

        activities.forEach((act) => {
            const sec = act.duration ? act.duration / 1000 : 1;
            totalSec += sec;

            const appName = (act.owner?.name || '').toLowerCase();
            const winTitle = (act.title || '').toLowerCase();

            // Check if activity matches any planned routine task
            const matchesPlan = plannedTitles.some((target) =>
                target && (winTitle.includes(target) || appName.includes(target))
            );

            const inferred = inferActivityDetails(act.owner?.name || '', act.title || '');

            if (matchesPlan) {
                productiveSec += sec;
            } else if (inferred.category === 'break') {
                distractingSec += sec;
            } else if (
                inferred.category === 'development' ||
                inferred.category === 'research' ||
                inferred.category === 'writing' ||
                inferred.category === 'design' ||
                inferred.category === 'meeting'
            ) {
                productiveSec += sec;
            } else {
                // Neutral/other: 60% productive weight
                productiveSec += sec * 0.6;
            }
        });

        if (totalSec < 10) {
            return {
                value: '—',
                subtext: 'Gathering active session data...',
            };
        }

        const score = Math.min(100, Math.max(10, Math.round((productiveSec / totalSec) * 100)));
        const productiveMins = Math.round(productiveSec / 60);

        let label = 'Balanced';
        if (score >= 80) label = 'Deep Focus';
        else if (score >= 60) label = 'Good Focus';
        else if (score >= 40) label = 'Moderate Focus';
        else label = 'Needs Focus';

        return {
            value: `${score}/100`,
            subtext: `${label} · ${productiveMins}m productive time`,
        };
    }, [analytics?.focusScore, ratings, activities, todayRoutines, isMonitoring]);

    const handleToggleMonitoring = async () => {
        if (isMonitoring) {
            await window.electronAPI.stopMonitoring();
            setMonitoring(false);
        } else {
            const success = await window.electronAPI.startMonitoring();
            if (success) setMonitoring(true);
        }
    };

    // Fetch backend analytics summary on mount
    React.useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const summary = await analyticsService.getDailySummary();
                if (summary) {
                    setAnalytics({
                        focusScore: summary.focusScore || 0,
                        focusSeconds: summary.focusSeconds || 0,
                        idleSeconds: summary.idleSeconds || 0,
                        contextSwitches: summary.contextSwitches || 0,
                        topApps: summary.topApps || [],
                    });
                }
                const dna = await analyticsService.getProductivityDna();
                if (dna) {
                    setAnalytics({ productivityDna: dna });
                }
            } catch {
                // Fallback to local calculations if offline or backend unauthenticated
            }
        };

        fetchAnalytics();

        const handleAnalyticsUpdate = (data: any) => {
            if (data) {
                setAnalytics(data);
            }
        };

        websocketService.registerHandler('analytics.updated', handleAnalyticsUpdate);
        return () => {
            websocketService.unregisterHandler('analytics.updated', handleAnalyticsUpdate);
        };
    }, [setAnalytics]);

    const [showHalo, setShowHalo] = React.useState(false);


    React.useEffect(() => {
        const handleHighlight = () => {
            setShowHalo(true);
            setTimeout(() => setShowHalo(false), 5000);
        };
        window.addEventListener('highlight-monitoring', handleHighlight);

        const START_TIME_KEY = 'app_start_timestamp';
        let startTime = sessionStorage.getItem(START_TIME_KEY);
        if (!startTime) {
            startTime = Date.now().toString();
            sessionStorage.setItem(START_TIME_KEY, startTime);
        }

        let timer: any;
        const elapsed = Date.now() - parseInt(startTime);
        if (elapsed < 60000) {
            setShowHalo(true);
            timer = setTimeout(() => {
                setShowHalo(false);
            }, 60000 - elapsed);
        }
        
        return () => {
            window.removeEventListener('highlight-monitoring', handleHighlight);
            if (timer) clearTimeout(timer);
        };
    }, []);


    return (
        <div className="space-y-8">

            <div className="flex items-end justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        Welcome{' '}
                        <span className="relative inline-block">
                            {/* Straw hat — floats above "Captain", tips up on hover */}
                            <span
                                className="straw-hat-tip absolute pointer-events-auto"
                                style={{ left: '45px', top: '-20px', display: 'inline-block' }}
                                title="🎩"
                            >
                                <svg viewBox="0 0 64 32" width="52" height="26" style={{ display: 'block', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}>
                                    {/* Brim */}
                                    <ellipse cx="32" cy="22" rx="30" ry="8" fill="#c8860a" />
                                    <ellipse cx="32" cy="20" rx="30" ry="8" fill="#e8a020" />
                                    {/* Crown */}
                                    <ellipse cx="32" cy="14" rx="16" ry="12" fill="#e8a020" />
                                    <ellipse cx="32" cy="10" rx="14" ry="10" fill="#f0b030" />
                                    {/* Red band */}
                                    <ellipse cx="32" cy="20" rx="16" ry="4" fill="#dc2626" />
                                    <ellipse cx="32" cy="19" rx="16" ry="3.5" fill="#ef4444" />
                                    {/* Highlight */}
                                    <ellipse cx="26" cy="10" rx="5" ry="3" fill="#fcd34d" opacity="0.4" />
                                </svg>
                            </span>
                            <span className="text-accent">Captain</span>
                        </span>
                    </h1>
                    <span className="text-sm italic opacity-80" style={{ color: 'var(--text-secondary)' }}>Let's make today count together</span>
                </div>

                {/* Streak Card */}
                <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <StreakCard streak={userStats?.streak || 1} />
                </div>
            </div>

            {/* Screen Recording Permission Banner (macOS) */}
            <ScreenPermissionBanner />

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Time Tracked"
                    value={formatDuration(usageStats.totalDuration)}
                    subtext="Today's activity"
                    icon={Clock}
                    delay={0}
                    onClick={openLiveMonitor}
                />
                <MetricCard
                    title="Most Used App"
                    value={usageStats.mostUsed?.name || 'None'}
                    subtext={usageStats.mostUsed ? formatDuration(usageStats.mostUsed.duration) : 'No data'}
                    icon={Zap}
                    delay={80}
                    onClick={openLiveMonitor}
                />
                <MetricCard
                    title="Active Sessions"
                    value={usageStats.activeCount.toString()}
                    subtext="Distinct activities logged"
                    icon={ActivityIcon}
                    delay={160}
                    onClick={openLiveMonitor}
                />
                <MetricCard
                    title="Focus Score"
                    value={focusScoreData.value}
                    subtext={focusScoreData.subtext}
                    icon={Hourglass}
                    delay={240}
                />
            </div>

            {/* Today's Calendar & Routine Integration */}
            <div className="glass-card-static rounded-2xl p-6 relative overflow-hidden animate-fade-in-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                    <div className="flex items-center gap-3">
                        <div
                            className="p-2.5 rounded-xl transition-all"
                            style={{
                                background: 'rgba(91, 95, 199, 0.15)',
                                color: '#5b5fc7',
                                border: '1px solid rgba(91, 95, 199, 0.25)',
                            }}
                        >
                            <CalendarIcon size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Today's Schedule & Routine</h3>
                                <span
                                    className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                                    style={{
                                        background: routineStats.percent >= 80 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(91, 95, 199, 0.15)',
                                        color: routineStats.percent >= 80 ? '#4ade80' : '#818cf8',
                                        border: `1px solid ${routineStats.percent >= 80 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(91, 95, 199, 0.3)'}`,
                                    }}
                                >
                                    {routineStats.percent}% Adherence
                                </span>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                Live unified calendar • {routineStats.completed} of {routineStats.total} planned blocks completed
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => onNavigate && onNavigate('routine')}
                        className="self-start sm:self-auto px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                        style={{
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-primary)',
                        }}
                    >
                        <span>Open Calendar</span>
                        <ArrowRight size={13} style={{ color: '#5b5fc7' }} />
                    </button>
                </div>

                {/* 3 Overview Columns: Current Active Block, Next Up, Routine Progress */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Active Block */}
                    <div
                        className="p-4 rounded-xl relative overflow-hidden transition-all duration-200"
                        style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-secondary)',
                        }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                                style={{
                                    background: currentActiveRoutine ? 'rgba(91, 95, 199, 0.18)' : 'rgba(148, 163, 184, 0.15)',
                                    color: currentActiveRoutine ? '#818cf8' : 'var(--text-muted)',
                                }}
                            >
                                {currentActiveRoutine ? '● Current Block' : 'Free Time'}
                            </span>
                            {currentActiveRoutine && (
                                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                    {String(currentActiveRoutine.startHour).padStart(2, '0')}:{String(currentActiveRoutine.startMinute).padStart(2, '0')} -{' '}
                                    {(() => {
                                        const endMins = currentActiveRoutine.startHour * 60 + currentActiveRoutine.startMinute + currentActiveRoutine.durationMinutes;
                                        return `${String(Math.floor(endMins / 60) % 24).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
                                    })()}
                                </span>
                            )}
                        </div>

                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                                    {currentActiveRoutine ? currentActiveRoutine.title : 'No active block scheduled right now'}
                                </p>
                                <p className="text-xs truncate mt-1" style={{ color: 'var(--text-muted)' }}>
                                    {currentActiveRoutine?.subtitle || (todayRoutines.length > 0 ? 'Enjoy your break or focus freely.' : 'Plan today in Routine Calendar.')}
                                </p>
                            </div>

                            {currentActiveRoutine && (
                                <button
                                    onClick={() => toggleRoutineComplete(currentActiveRoutine.id)}
                                    className="p-1.5 rounded-lg transition-transform hover:scale-110 active:scale-95 shrink-0"
                                    title={currentActiveRoutine.completed ? 'Mark uncompleted' : 'Mark completed'}
                                    style={{
                                        color: currentActiveRoutine.completed ? '#4ade80' : 'var(--text-muted)',
                                        background: currentActiveRoutine.completed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                    }}
                                >
                                    {currentActiveRoutine.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Next Upcoming Block */}
                    <div
                        className="p-4 rounded-xl relative overflow-hidden transition-all duration-200"
                        style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-secondary)',
                        }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                                style={{
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    color: '#60a5fa',
                                }}
                            >
                                Next Up
                            </span>
                            {nextUpcomingRoutine && (
                                <span className="text-xs font-mono font-medium" style={{ color: '#60a5fa' }}>
                                    {String(nextUpcomingRoutine.startHour).padStart(2, '0')}:{String(nextUpcomingRoutine.startMinute).padStart(2, '0')}
                                </span>
                            )}
                        </div>

                        <div>
                            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                                {nextUpcomingRoutine ? nextUpcomingRoutine.title : 'All scheduled blocks complete! 🎉'}
                            </p>
                            <p className="text-xs truncate mt-1" style={{ color: 'var(--text-muted)' }}>
                                {nextUpcomingRoutine
                                    ? `Starts in ${Math.max(0, (nextUpcomingRoutine.startHour * 60 + nextUpcomingRoutine.startMinute) - nowMinutes)} mins (${nextUpcomingRoutine.durationMinutes}m block)`
                                    : 'No further routine items on today’s calendar.'}
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar & Adherence */}
                    <div
                        className="p-4 rounded-xl relative overflow-hidden transition-all duration-200 flex flex-col justify-between"
                        style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-secondary)',
                        }}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Today's Progress
                            </span>
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {routineStats.completed}/{routineStats.total} Done
                            </span>
                        </div>

                        {/* Visual Bar */}
                        <div className="my-2">
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(168,162,158,0.2)' }}>
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${routineStats.percent}%`,
                                        background: '#5b5fc7',
                                    }}
                                />
                            </div>
                        </div>

                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {routineStats.total === 0
                                ? 'No routine items set for today.'
                                : routineStats.percent >= 100
                                ? 'Outstanding! 100% of routine completed.'
                                : `${routineStats.total - routineStats.completed} block(s) remaining today.`}
                        </p>
                    </div>
                </div>

                {/* Auto-Detected Activity Collapsible Tray (Bottom Right) */}
                {routineStats.autoDetected.length > 0 && (
                    <div className="pt-3 mt-1 flex flex-col items-end" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                        <button
                            type="button"
                            onClick={() => setIsAutoTrayExpanded((prev) => !prev)}
                            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                            style={{
                                background: isAutoTrayExpanded ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-elevated)',
                                borderColor: isAutoTrayExpanded ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-secondary)',
                                color: isAutoTrayExpanded ? '#818cf8' : 'var(--text-secondary)',
                            }}
                            title={isAutoTrayExpanded ? 'Collapse auto-detected activity tray' : 'Expand auto-detected activity tray'}
                        >
                            <Layers size={13} className="text-emerald-400" />
                            <span>Auto-Detected Activity ({routineStats.autoDetected.length})</span>
                            {isAutoTrayExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>

                        {/* Expanded Tray Content */}
                        {isAutoTrayExpanded && (
                            <div className="w-full mt-3 space-y-2 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                        Logged to Calendar
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                        Click thumbs to submit accuracy feedback
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {routineStats.autoDetected.slice(-6).reverse().map((autoItem) => (
                                        <div
                                            key={autoItem.id}
                                            className="p-3 rounded-xl flex items-center justify-between gap-2.5 text-xs border transition-all"
                                            style={{
                                                background: 'var(--bg-elevated)',
                                                borderColor: 'var(--border-secondary)',
                                            }}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                                    {autoItem.title}
                                                </p>
                                                <p className="text-[10px] truncate opacity-70 font-mono" style={{ color: 'var(--text-muted)' }}>
                                                    {autoItem.detectedApp || 'Screen'} • {autoItem.durationMinutes}m
                                                </p>
                                            </div>

                                            {/* Feedback state */}
                                            {autoItem.detectionFeedback ? (
                                                <span
                                                    className="px-2 py-0.5 rounded text-[10px] font-semibold shrink-0"
                                                    style={{
                                                        background: autoItem.detectionFeedback === 'accurate' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                        color: autoItem.detectionFeedback === 'accurate' ? '#4ade80' : '#f87171',
                                                    }}
                                                >
                                                    {autoItem.detectionFeedback === 'accurate' ? 'Verified' : 'Corrected'}
                                                </span>
                                            ) : (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => submitActivityFeedback(autoItem.id, 'accurate')}
                                                        className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                                                        title="Confirm accurate detection"
                                                    >
                                                        <ThumbsUp size={12} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => submitActivityFeedback(autoItem.id, 'inaccurate')}
                                                        className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition-colors"
                                                        title="Report inaccurate detection"
                                                    >
                                                        <ThumbsDown size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Activity Table */}
            <div className="glass-card-static rounded-2xl overflow-hidden relative">
                <TotoroBusStopBg className="opacity-20 dark:opacity-20 translate-y-4" />
                <div className="relative z-10 p-6 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                    <div>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Activity Summary</h3>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aggregated usage by application</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => onNavigate && onNavigate('ai')}
                            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 hover:scale-105 active:scale-95"
                            style={{
                                background: 'rgba(147, 51, 234, 0.1)',
                                color: '#c084fc',
                                border: '1px solid rgba(147, 51, 234, 0.2)',
                            }}
                        >
                            <Zap size={16} />
                            Analyze with AI
                        </button>
                        <button
                            onClick={handleToggleMonitoring}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${!isMonitoring && showHalo ? 'ring-4 ring-emerald-500/50 shadow-[0_0_30px_rgba(74,222,128,0.5)] animate-pulse' : ''
                                }`}
                            style={{
                                background: isMonitoring ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                color: isMonitoring ? '#f87171' : '#4ade80',
                                border: `1px solid ${isMonitoring ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`,
                            }}
                        >
                            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
                        </button>
                    </div>
                </div>

                {/* Table Header */}
                <div
                    className="flex items-center justify-between px-4 sm:px-6 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{
                        background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(237,232,223,0.5)',
                        color: 'var(--text-muted)',
                        borderBottom: '1px solid var(--border-secondary)',
                    }}
                >
                    <div className="flex-1">Application</div>
                    <div className="w-24 sm:w-32 text-right">Duration</div>
                </div>

                {/* Table Body */}
                <div>
                    {usageStats.topApps.length > 0 ? (
                        usageStats.topApps.map((app, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 transition-all duration-200 group animate-fade-in-up"
                                style={{
                                    borderBottom: '1px solid var(--border-secondary)',
                                    animationDelay: `${idx * 50}ms`,
                                }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                            >
                                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                    <div
                                        className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                                        style={{
                                            background: 'var(--accent-glow)',
                                            color: 'var(--accent)',
                                            border: '1px solid var(--border-primary)',
                                        }}
                                    >
                                        {app.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{app.name}</p>
                                        {/* Bar track with catbus at tip */}
                                        <div className="relative mt-2" style={{ height: '18px', maxWidth: '120px' }}>
                                            {/* Track */}
                                            <div
                                                className="absolute bottom-0 left-0 w-full rounded-full"
                                                style={{
                                                    height: '4px',
                                                    background: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(168,162,158,0.2)',
                                                }}
                                            />
                                            {/* Fill bar */}
                                            <div
                                                className="absolute bottom-0 left-0 rounded-full transition-all duration-1000 ease-out animate-bar-shimmer"
                                                style={{
                                                    height: '4px',
                                                    width: `${Math.min(100, (app.duration / Math.max(usageStats.totalDuration, 1)) * 100)}%`,
                                                    background: 'linear-gradient(90deg, var(--accent-dark), var(--accent), var(--accent-light), var(--accent), var(--accent-dark))',
                                                }}
                                            />
                                            {/* Catbus at the tip */}
                                            <div
                                                className="absolute bottom-[2px] transition-all duration-1000 ease-out catbus-tip"
                                                style={{
                                                    left: `calc(${Math.min(100, (app.duration / Math.max(usageStats.totalDuration, 1)) * 100)}% - 10px)`,
                                                }}
                                            >
                                                <svg viewBox="0 0 40 22" width="20" height="11" style={{ display: 'block', filter: 'drop-shadow(0 0 3px var(--accent))' }}>
                                                    {/* Bus body */}
                                                    <rect x="2" y="4" width="34" height="14" rx="5" fill="#94a3b8" />
                                                    {/* Windows row */}
                                                    <rect x="5" y="7" width="5" height="4" rx="1" fill="#1e293b" opacity="0.7" />
                                                    <rect x="12" y="7" width="5" height="4" rx="1" fill="#1e293b" opacity="0.7" />
                                                    <rect x="19" y="7" width="5" height="4" rx="1" fill="#1e293b" opacity="0.7" />
                                                    <rect x="26" y="7" width="5" height="4" rx="1" fill="#1e293b" opacity="0.7" />
                                                    {/* Wheels */}
                                                    <circle cx="10" cy="18" r="3.5" fill="#334155" />
                                                    <circle cx="10" cy="18" r="1.5" fill="#64748b" />
                                                    <circle cx="28" cy="18" r="3.5" fill="#334155" />
                                                    <circle cx="28" cy="18" r="1.5" fill="#64748b" />
                                                    {/* Headlight */}
                                                    <ellipse cx="36" cy="11" rx="2" ry="1.5" fill="#fbbf24" opacity="0.9" />
                                                    {/* Catbus face — eyes on front */}
                                                    <circle cx="37" cy="8" r="1.5" fill="white" />
                                                    <circle cx="37" cy="8" r="0.7" fill="#1e293b" />
                                                    <circle cx="37" cy="14" r="1.5" fill="white" />
                                                    <circle cx="37" cy="14" r="0.7" fill="#1e293b" />
                                                    {/* Whiskers */}
                                                    <line x1="36" y1="11" x2="40" y2="10" stroke="#94a3b8" strokeWidth="0.5" />
                                                    <line x1="36" y1="11" x2="40" y2="12" stroke="#94a3b8" strokeWidth="0.5" />
                                                    {/* Tail */}
                                                    <path d="M2,8 Q-2,4 0,1 Q2,-1 3,2" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-24 sm:w-32 flex-shrink-0 text-right">
                                    <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                                        {formatDuration(app.duration)}
                                    </span>
                                    <span className="text-xs ml-1 sm:ml-2 transition-colors" style={{ color: 'var(--text-muted)' }}>
                                        {((app.duration / Math.max(usageStats.totalDuration, 1)) * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center animate-fade-in-up">
                            <div className="inline-block mb-4" style={{ animation: 'float 3s ease-in-out infinite' }}>
                                <Hourglass size={40} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                            </div>
                            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No activity recorded today yet.</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Start monitoring to track your work.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
