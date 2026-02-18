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
    const { activities, isMonitoring, setMonitoring } = useStore();
    const { isDark } = useTheme();

    const stats = useMemo(() => {
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

    return (
        <div className="space-y-8">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Total Time Tracked"
                    value={formatDuration(stats.totalDuration)}
                    subtext="Today's activity"
                    icon={Clock}
                    delay={0}
                />
                <MetricCard
                    title="Most Used App"
                    value={stats.mostUsed ? stats.mostUsed.name : '-'}
                    subtext={stats.mostUsed ? formatDuration(stats.mostUsed.duration) : 'No data'}
                    icon={Zap}
                    delay={80}
                />
                <MetricCard
                    title="Active Sessions"
                    value={stats.activeCount}
                    subtext="Distinct activities logged"
                    icon={ActivityIcon}
                    delay={160}
                />
            </div>

            {/* Activity Table */}
            <div className="glass-card-static rounded-2xl overflow-hidden">
                <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
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
                            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95"
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
                    {stats.topApps.length > 0 ? (
                        stats.topApps.map((app, idx) => (
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
                                        <div className="h-1 w-full max-w-[120px] rounded-full mt-1 overflow-hidden" style={{ background: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(168,162,158,0.2)' }}>
                                            <div
                                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                                style={{
                                                    width: `${Math.min(100, (app.duration / Math.max(stats.totalDuration, 1)) * 100)}%`,
                                                    background: 'linear-gradient(90deg, var(--accent), var(--accent-light))',
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="w-24 sm:w-32 flex-shrink-0 text-right">
                                    <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                                        {formatDuration(app.duration)}
                                    </span>
                                    <span className="text-xs ml-1 sm:ml-2 transition-colors" style={{ color: 'var(--text-muted)' }}>
                                        {((app.duration / Math.max(stats.totalDuration, 1)) * 100).toFixed(0)}%
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
