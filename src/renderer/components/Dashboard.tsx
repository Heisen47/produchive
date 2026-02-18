import React, { useMemo, useRef, useCallback } from 'react';
import {
    Clock,
    Activity as ActivityIcon,
    ArrowUpRight,
    Zap,
    Hourglass
} from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';

import { TotoroBg } from './TotoroBg';
import { NoFaceBg } from './NoFaceBg';
import { SootSpriteBg } from './SootSpriteBg';
import { TotoroBusStopBg } from './TotoroBusStopBg';

// Helper for formatting duration
const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ${Math.floor(seconds % 60)}s`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
};

// Interactive Metric Card with tilt + shimmer
const MetricCard = ({ title, value, subtext, icon: Icon, trend, delay = 0 }: any) => {
    const { isDark } = useTheme();
    const cardRef = useRef<HTMLDivElement>(null);
    const shimmerRef = useRef<HTMLDivElement>(null);

    let BgComponent = null;
    if (title === 'Total Time Tracked') BgComponent = TotoroBg;
    if (title === 'Most Used App') BgComponent = NoFaceBg;
    if (title === 'Active Sessions') BgComponent = SootSpriteBg;

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
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="glass-card rounded-2xl p-6 cursor-default animate-fade-in-up relative overflow-hidden"
            style={{
                animationDelay: `${delay}ms`,
                transition: 'transform 0.15s ease-out, box-shadow 0.3s ease',
                willChange: 'transform',
            }}
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
    const { activities, isMonitoring, setMonitoring, stats: userStats } = useStore();
    const { isDark } = useTheme();

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

    const handleToggleMonitoring = async () => {
        if (isMonitoring) {
            await window.electronAPI.stopMonitoring();
            setMonitoring(false);
        } else {
            const success = await window.electronAPI.startMonitoring();
            if (success) setMonitoring(true);
        }
    };

    const [showHalo, setShowHalo] = React.useState(false);

    React.useEffect(() => {
        const START_TIME_KEY = 'app_start_timestamp';
        let startTime = sessionStorage.getItem(START_TIME_KEY);
        if (!startTime) {
            startTime = Date.now().toString();
            sessionStorage.setItem(START_TIME_KEY, startTime);
        }

        const elapsed = Date.now() - parseInt(startTime);
        if (elapsed < 60000) {
            setShowHalo(true);
            const timer = setTimeout(() => {
                setShowHalo(false);
            }, 60000 - elapsed);
            return () => clearTimeout(timer);
        }
    }, []);

    // ... existing code ...

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

                {/* Streak Red Box */}
                <div className="flex flex-col items-center justify-center px-4 py-2 rounded-xl border animate-fade-in"
                    style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderColor: 'rgba(239, 68, 68, 0.2)',
                        color: '#ef4444'
                    }}
                >
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Streak</span>
                    <div className="flex items-center gap-1">
                        <span className="text-xl font-bold">{userStats?.streak || 1}</span>
                        <span className="text-lg">🔥</span>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Total Time Tracked"
                    value={formatDuration(usageStats.totalDuration)}
                    subtext="Today's activity"
                    icon={Clock}
                    delay={0}
                />
                <MetricCard
                    title="Most Used App"
                    value={usageStats.mostUsed?.name || 'None'}
                    subtext={usageStats.mostUsed ? formatDuration(usageStats.mostUsed.duration) : 'No data'}
                    icon={Zap}
                    delay={80}
                />
                <MetricCard
                    title="Active Sessions"
                    value={usageStats.activeCount.toString()}
                    subtext="Distinct activities logged"
                    icon={ActivityIcon}
                    delay={160}
                />
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
