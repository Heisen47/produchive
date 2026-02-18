import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend,
} from 'recharts';
import {
    Clock, Zap, Monitor, TrendingUp,
    Hourglass, BarChart3, Loader2
} from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';
import { Activity } from '../global';

// ─── Color palette ───
const CHART_COLORS = [
    '#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981',
    '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#84cc16',
    '#e11d48', '#0ea5e9',
];

type TimePeriod = 'today' | 'yesterday' | '7days' | '30days';

const PERIOD_LABELS: Record<TimePeriod, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    '7days': 'Last 7 Days',
    '30days': 'Last 30 Days',
};

// ─── Helpers ───
const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
};

const formatMinutes = (mins: number) => {
    if (mins < 60) return `${Math.round(mins)}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${Math.round(mins % 60)}m`;
};

const getDateStr = (daysAgo: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
};

const getShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ─── Aggregate activities into app usage ───
const aggregateActivities = (activities: Activity[]): { name: string; duration: number }[] => {
    const appUsage: Record<string, number> = {};
    activities.forEach(act => {
        const duration = (act.duration ? act.duration / 1000 : 1);
        const appName = act.owner.name;
        appUsage[appName] = (appUsage[appName] || 0) + duration;
    });
    return Object.entries(appUsage)
        .sort(([, a], [, b]) => b - a)
        .map(([name, duration]) => ({ name, duration }));
};

// ─── Custom Tooltip ───
const CustomTooltip = ({ active, payload, label, isDark }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div
            className="rounded-xl p-3 text-sm shadow-lg"
            style={{
                background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                border: '1px solid var(--border-primary)',
                backdropFilter: 'blur(12px)',
            }}
        >
            {label && <p className="font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{label}</p>}
            {payload.map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color || entry.payload?.fill }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{entry.name}:</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {formatMinutes(entry.value)}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ─── Custom Pie Label ───
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

// ─── Metric Card ───
const MetricCard = ({ title, value, subtext, icon: Icon, delay = 0 }: any) => (
    <div
        className="glass-card rounded-2xl p-6 group cursor-default animate-fade-in-up"
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className="flex items-start justify-between mb-4">
            <div
                className="p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110"
                style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
            >
                <Icon size={20} />
            </div>
        </div>
        <div>
            <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{title}</h3>
            <p className="text-2xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{value}</p>
            {subtext && <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{subtext}</p>}
        </div>
    </div>
);

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════
export const UsageCharts = () => {
    const { activities } = useStore();
    const { isDark } = useTheme();
    const [period, setPeriod] = useState<TimePeriod>('today');
    const [rangeData, setRangeData] = useState<Record<string, { activities: Activity[] }>>({});
    const [loading, setLoading] = useState(false);

    // ─── Fetch data for the selected period ───
    const fetchData = useCallback(async (p: TimePeriod) => {
        if (p === 'today') return;
        setLoading(true);
        try {
            const endDate = p === 'yesterday' ? getDateStr(1) : getDateStr(0);
            const startDate = p === 'yesterday' ? getDateStr(1) : p === '7days' ? getDateStr(6) : getDateStr(29);
            const data = await window.electronAPI.getActivityDataRange(startDate, endDate);
            setRangeData(data);
        } catch (e) {
            console.error('Failed to fetch activity range:', e);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData(period);
    }, [period, fetchData]);

    // ─── Compute chart data ───
    const { pieData, barData, topApps, totalDuration, appCount } = useMemo(() => {
        let allActivities: Activity[] = [];

        if (period === 'today') {
            allActivities = activities;
        } else if (period === 'yesterday') {
            const dateStr = getDateStr(1);
            allActivities = rangeData[dateStr]?.activities || [];
        } else {
            Object.values(rangeData).forEach(day => {
                allActivities = [...allActivities, ...day.activities];
            });
        }

        const topApps = aggregateActivities(allActivities);
        const totalDuration = topApps.reduce((sum, a) => sum + a.duration, 0);

        // Pie data — top 8 apps + "Other"
        const topForPie = topApps.slice(0, 8);
        const otherDuration = topApps.slice(8).reduce((sum, a) => sum + a.duration, 0);
        const pieData = [
            ...topForPie.map((app, i) => ({
                name: app.name,
                value: Math.round(app.duration / 60 * 100) / 100,
                fill: CHART_COLORS[i % CHART_COLORS.length],
            })),
            ...(otherDuration > 0 ? [{
                name: 'Other',
                value: Math.round(otherDuration / 60 * 100) / 100,
                fill: '#475569',
            }] : []),
        ];

        // Bar data — daily breakdown (only for 7days / 30days)
        let barData: any[] = [];
        if (period === '7days' || period === '30days') {
            const dates = Object.keys(rangeData).sort();
            const top5Names = topApps.slice(0, 5).map(a => a.name);

            barData = dates.map(dateStr => {
                const dayActivities = rangeData[dateStr]?.activities || [];
                const dayAgg = aggregateActivities(dayActivities);
                const entry: any = { date: getShortDate(dateStr) };

                top5Names.forEach(name => {
                    const app = dayAgg.find(a => a.name === name);
                    entry[name] = app ? Math.round(app.duration / 60 * 100) / 100 : 0;
                });

                const otherDur = dayAgg
                    .filter(a => !top5Names.includes(a.name))
                    .reduce((sum, a) => sum + a.duration, 0);
                entry['Other'] = Math.round(otherDur / 60 * 100) / 100;

                return entry;
            });
        }

        return {
            pieData,
            barData,
            topApps,
            totalDuration,
            appCount: topApps.length,
        };
    }, [activities, rangeData, period]);

    const gridColor = isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(168, 162, 158, 0.2)';
    const axisColor = isDark ? '#64748b' : '#a8a29e';
    const top5Names = topApps.slice(0, 5).map(a => a.name);

    return (
        <div className="space-y-8">
            {/* Period Tabs */}
            <div className="flex items-center gap-2 animate-fade-in-up">
                {(Object.keys(PERIOD_LABELS) as TimePeriod[]).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105"
                        style={{
                            background: period === p
                                ? 'linear-gradient(135deg, var(--accent), var(--accent-dark))'
                                : 'var(--bg-elevated)',
                            color: period === p ? '#fff' : 'var(--text-secondary)',
                            border: `1px solid ${period === p ? 'transparent' : 'var(--border-secondary)'}`,
                            boxShadow: period === p ? '0 4px 15px var(--accent-glow)' : 'none',
                        }}
                    >
                        {PERIOD_LABELS[p]}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-16 animate-fade-in-up">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading activity data...</p>
                    </div>
                </div>
            )}

            {!loading && (
                <>
                    {/* Metric Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <MetricCard
                            title="Total Time"
                            value={formatDuration(totalDuration)}
                            subtext={PERIOD_LABELS[period]}
                            icon={Clock}
                            delay={0}
                        />
                        <MetricCard
                            title="Most Used App"
                            value={topApps[0]?.name || '—'}
                            subtext={topApps[0] ? formatDuration(topApps[0].duration) : 'No data'}
                            icon={Zap}
                            delay={100}
                        />
                        <MetricCard
                            title="Apps Tracked"
                            value={appCount}
                            subtext={`Distinct applications`}
                            icon={Monitor}
                            delay={200}
                        />
                    </div>

                    {/* Charts Row */}
                    {topApps.length > 0 ? (
                        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                            {/* Donut Chart */}
                            <div className="glass-card-static rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                                <div className="flex items-center gap-2 mb-6">
                                    <BarChart3 size={20} style={{ color: 'var(--accent)' }} />
                                    <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                                        Usage Breakdown
                                    </h3>
                                </div>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={120}
                                                paddingAngle={3}
                                                dataKey="value"
                                                labelLine={false}
                                                label={renderCustomLabel}
                                                animationBegin={0}
                                                animationDuration={800}
                                                animationEasing="ease-out"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.fill}
                                                        stroke="transparent"
                                                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip isDark={isDark} />} />
                                            <Legend
                                                wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)', paddingTop: '12px' }}
                                                iconType="circle"
                                                iconSize={8}
                                            />
                                            {/* Center text overlay */}
                                            <text
                                                x="50%" y="47%"
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                                fill={isDark ? '#f1f5f9' : '#1a1612'}
                                                fontSize={22}
                                                fontWeight={700}
                                                fontFamily="Inter, system-ui"
                                            >
                                                {formatDuration(totalDuration)}
                                            </text>
                                            <text
                                                x="50%" y="57%"
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                                fill={isDark ? '#64748b' : '#a8a29e'}
                                                fontSize={12}
                                            >
                                                total
                                            </text>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Bar Chart (7/30 days) or Top Apps List (today/yesterday) */}
                            {(period === '7days' || period === '30days') ? (
                                <div className="glass-card-static rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                                    <div className="flex items-center gap-2 mb-6">
                                        <TrendingUp size={20} style={{ color: '#8b5cf6' }} />
                                        <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                                            Daily Comparison
                                        </h3>
                                    </div>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fill: axisColor, fontSize: 11 }}
                                                    axisLine={{ stroke: gridColor }}
                                                    tickLine={false}
                                                    interval={period === '30days' ? 4 : 0}
                                                />
                                                <YAxis
                                                    tick={{ fill: axisColor, fontSize: 11 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tickFormatter={(v) => `${Math.round(v)}m`}
                                                />
                                                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                                                <Legend
                                                    wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)', paddingTop: '8px' }}
                                                    iconType="circle"
                                                    iconSize={8}
                                                />
                                                {top5Names.map((name, i) => (
                                                    <Bar
                                                        key={name}
                                                        dataKey={name}
                                                        stackId="a"
                                                        fill={CHART_COLORS[i]}
                                                        radius={i === top5Names.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                                        animationDuration={600}
                                                        animationBegin={i * 100}
                                                    />
                                                ))}
                                                <Bar
                                                    dataKey="Other"
                                                    stackId="a"
                                                    fill="#475569"
                                                    radius={top5Names.length === 0 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                                    animationDuration={600}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            ) : (
                                /* Top Apps Ranked List */
                                <div className="glass-card-static rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                                    <div className="flex items-center gap-2 mb-6">
                                        <TrendingUp size={20} style={{ color: '#8b5cf6' }} />
                                        <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                                            Top Applications
                                        </h3>
                                    </div>
                                    <div className="space-y-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: '300px' }}>
                                        {topApps.slice(0, 10).map((app, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group"
                                                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-secondary)' }}
                                                onMouseEnter={(e) => {
                                                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)';
                                                    (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-secondary)';
                                                    (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                                                }}
                                            >
                                                {/* Rank */}
                                                <div
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                                    style={{
                                                        background: CHART_COLORS[idx % CHART_COLORS.length] + '20',
                                                        color: CHART_COLORS[idx % CHART_COLORS.length],
                                                    }}
                                                >
                                                    {idx + 1}
                                                </div>
                                                {/* App info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                                        {app.name}
                                                    </p>
                                                    <div className="h-1.5 w-full rounded-full mt-1 overflow-hidden" style={{ background: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(168,162,158,0.2)' }}>
                                                        <div
                                                            className="h-full rounded-full transition-all duration-1000 ease-out"
                                                            style={{
                                                                width: `${Math.min(100, (app.duration / Math.max(totalDuration, 1)) * 100)}%`,
                                                                background: `linear-gradient(90deg, ${CHART_COLORS[idx % CHART_COLORS.length]}, ${CHART_COLORS[(idx + 1) % CHART_COLORS.length]})`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                {/* Duration */}
                                                <div className="text-right flex-shrink-0">
                                                    <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                                                        {formatDuration(app.duration)}
                                                    </span>
                                                    <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>
                                                        {((app.duration / Math.max(totalDuration, 1)) * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Empty State */
                        <div className="glass-card-static rounded-2xl p-12 text-center animate-fade-in-up">
                            <div className="animate-float inline-block mb-4">
                                <Hourglass size={48} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                            </div>
                            <p className="font-display font-medium text-lg" style={{ color: 'var(--text-secondary)' }}>
                                No activity data for {PERIOD_LABELS[period].toLowerCase()}
                            </p>
                            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                                Start monitoring from the Dashboard to begin tracking your app usage.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
