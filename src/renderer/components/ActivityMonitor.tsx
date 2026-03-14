import React, { useEffect, useMemo } from 'react';
import { Activity, Lock, Unlock, ShieldBan, FileText, Globe } from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';

const CHART_COLORS = [
    '#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981',
    '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#84cc16',
    '#e11d48', '#0ea5e9',
];

const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
};

const getAppIcon = (appName: string) => {
    const name = appName.toLowerCase();
    if (name.includes('chrome') || name.includes('brave') || name.includes('edge') || name.includes('firefox') || name.includes('safari')) {
        return <Globe size={14} />;
    }
    return <FileText size={14} />;
};

export const ActivityMonitor = () => {
    const { activities, addActivity, blockedActivities, blockActivity, unblockActivity } = useStore();
    const { isDark } = useTheme();

    useEffect(() => {
        window.electronAPI.onActivityUpdate((activity) => {
            addActivity(activity);
        });
    }, [addActivity]);

    // Aggregate activities by app name
    const appSummary = useMemo(() => {
        const appUsage: Record<string, { name: string; duration: number; titles: string[] }> = {};
        activities.forEach(act => {
            const duration = act.duration ? act.duration / 1000 : 1;
            const appName = act.owner.name;
            if (!appUsage[appName]) {
                appUsage[appName] = { name: appName, duration: 0, titles: [] };
            }
            appUsage[appName].duration += duration;
            if (!appUsage[appName].titles.includes(act.title)) {
                appUsage[appName].titles.push(act.title);
            }
        });
        return Object.values(appUsage).sort((a, b) => b.duration - a.duration);
    }, [activities]);

    // Sort: blocked first, then by duration
    const sortedApps = useMemo(() => {
        const isAppBlocked = (name: string) => blockedActivities.some(a => a.owner.name === name);
        const blocked = appSummary.filter(a => isAppBlocked(a.name));
        const unblocked = appSummary.filter(a => !isAppBlocked(a.name));
        return [...blocked, ...unblocked];
    }, [appSummary, blockedActivities]);

    const isBlocked = (appName: string) =>
        blockedActivities.some(a => a.owner.name === appName);

    const maxDuration = sortedApps.length > 0 ? Math.max(...sortedApps.map(a => a.duration)) : 1;

    const handleToggleBlock = async (app: { name: string; titles: string[] }) => {
        const matchingActivity = activities.find(a => a.owner.name === app.name);
        if (!matchingActivity) {
            console.warn('[BlockMode] No matching activity found for:', app.name);
            return;
        }

        try {
            if (isBlocked(app.name)) {
                console.log('[BlockMode] Unblocking:', app.name);
                await unblockActivity(matchingActivity);
            } else {
                console.log('[BlockMode] Blocking:', app.name);
                await blockActivity(matchingActivity);
            }
        } catch (e) {
            console.error('[BlockMode] Toggle failed:', e);
        }
    };

    if (activities.length === 0) {
        return (
            <div className="glass-card-static rounded-2xl p-8 text-center flex flex-col items-center justify-center animate-fade-in-up" style={{ minHeight: '200px' }}>
                <div className="p-3 rounded-full mb-3 animate-float" style={{ background: 'var(--bg-elevated)' }}>
                    <Activity size={24} style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Monitoring your activities...</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Switch between apps to see them appear here</p>
            </div>
        );
    }

    return (
        <div className="glass-card-static rounded-2xl p-5 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center gap-2 mb-5">
                <Activity size={20} style={{ color: '#2dd4bf' }} />
                <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>Activity Summary</h3>
                <span className="ml-auto text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                    {sortedApps.length} apps tracked
                </span>
                {blockedActivities.length > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                        <ShieldBan size={12} className="inline mr-1" style={{ verticalAlign: '-2px' }} />
                        {blockedActivities.length} blocked
                    </span>
                )}
            </div>

            {/* App list with bars */}
            <div className="space-y-2 overflow-y-auto custom-scrollbar" style={{ maxHeight: '400px' }}>
                {sortedApps.map((app, idx) => {
                    const blocked = isBlocked(app.name);
                    const barPercent = Math.min(100, (app.duration / maxDuration) * 100);
                    const colorIndex = appSummary.findIndex(a => a.name === app.name); // Color by original rank
                    const color = CHART_COLORS[colorIndex % CHART_COLORS.length];

                    return (
                        <div
                            key={app.name}
                            className="group relative rounded-xl p-3 transition-all duration-200"
                            style={{
                                background: blocked
                                    ? (isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)')
                                    : 'var(--bg-elevated)',
                                border: blocked
                                    ? '1px solid rgba(239, 68, 68, 0.3)'
                                    : '1px solid var(--border-secondary)',
                            }}
                            onMouseEnter={(e) => {
                                if (!blocked) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)';
                            }}
                            onMouseLeave={(e) => {
                                if (!blocked) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-secondary)';
                            }}
                        >
                            <div className="flex items-center gap-3">
                                {/* App icon + name */}
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div
                                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                        style={{
                                            background: blocked ? 'rgba(239, 68, 68, 0.15)' : color + '20',
                                            color: blocked ? '#ef4444' : color,
                                        }}
                                    >
                                        {blocked ? <Lock size={14} /> : getAppIcon(app.name)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium truncate" style={{ color: blocked ? '#ef4444' : 'var(--text-primary)' }}>
                                                {app.name}
                                            </p>
                                            {blocked && (
                                                <span
                                                    className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded animate-pulse flex-shrink-0"
                                                    style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
                                                >
                                                    blocked
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Duration */}
                                <span className="text-xs font-mono flex-shrink-0" style={{ color: blocked ? '#ef4444' : 'var(--text-secondary)' }}>
                                    {formatDuration(app.duration)}
                                </span>

                                {/* Lock/Unlock button */}
                                <button
                                    onClick={() => handleToggleBlock(app)}
                                    className="p-1.5 rounded-lg transition-all duration-200 flex-shrink-0"
                                    style={{
                                        background: blocked
                                            ? 'rgba(239, 68, 68, 0.15)'
                                            : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                                        color: blocked ? '#ef4444' : 'var(--text-muted)',
                                        border: blocked
                                            ? '1px solid rgba(239, 68, 68, 0.3)'
                                            : '1px solid transparent',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!blocked) {
                                            (e.currentTarget as HTMLElement).style.background = 'rgba(239, 68, 68, 0.1)';
                                            (e.currentTarget as HTMLElement).style.color = '#ef4444';
                                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239, 68, 68, 0.2)';
                                        } else {
                                            (e.currentTarget as HTMLElement).style.background = 'rgba(34, 197, 94, 0.1)';
                                            (e.currentTarget as HTMLElement).style.color = '#22c55e';
                                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(34, 197, 94, 0.2)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!blocked) {
                                            (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
                                            (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                                            (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                                        } else {
                                            (e.currentTarget as HTMLElement).style.background = 'rgba(239, 68, 68, 0.15)';
                                            (e.currentTarget as HTMLElement).style.color = '#ef4444';
                                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239, 68, 68, 0.3)';
                                        }
                                    }}
                                    title={blocked ? 'Unblock this app' : 'Block this app'}
                                >
                                    {blocked ? <Unlock size={14} /> : <Lock size={14} />}
                                </button>
                            </div>

                            {/* Usage bar */}
                            <div className="mt-2 relative" style={{ height: '4px' }}>
                                <div
                                    className="absolute inset-0 rounded-full"
                                    style={{
                                        background: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(168,162,158,0.15)',
                                    }}
                                />
                                <div
                                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
                                    style={{
                                        width: `${barPercent}%`,
                                        background: blocked
                                            ? 'linear-gradient(90deg, rgba(239,68,68,0.4), rgba(239,68,68,0.7))'
                                            : `linear-gradient(90deg, ${color}88, ${color})`,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
