import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, LineChart, Line,
} from 'recharts';
import {
    Clock, Zap, Monitor, TrendingUp,
    Hourglass, BarChart3, Loader2, Brain,
    Star, ChevronDown, ChevronUp
} from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';
import { Activity } from '../global';
import { TotoroSceneBg } from './TotoroSceneBg';

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
                        {typeof entry.value === 'number' && entry.name !== 'Rating' ? formatMinutes(entry.value) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ─── Ratings Tooltip ───
const RatingTooltip = ({ active, payload, label, isDark }: any) => {
    if (!active || !payload?.length) return null;
    const rating = payload[0];
    return (
        <div
            className="rounded-xl p-3 text-sm shadow-lg"
            style={{
                background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                border: '1px solid var(--border-primary)',
                backdropFilter: 'blur(12px)',
            }}
        >
            {label && <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>}
            <div className="flex items-center gap-2 py-0.5">
                <Star size={12} fill={rating.value >= 7 ? '#4ade80' : rating.value >= 4 ? '#fbbf24' : '#f87171'} stroke="none" />
                <span style={{ color: 'var(--text-secondary)' }}>Rating:</span>
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{rating.value}/10</span>
            </div>
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

import { TotoroBg } from './TotoroBg';
import { NoFaceBg } from './NoFaceBg';
import { CalciferBg } from './CalciferBg';

// ... (other imports)

// ─── Metric Card ───
const MetricCard = ({ title, value, subtext, icon: Icon, delay = 0 }: any) => {
    let BgComponent = null;
    if (title === 'Total Time' || title === 'Most Used App') BgComponent = TotoroBg;
    if (title === 'Apps Tracked') BgComponent = NoFaceBg;
    if (title === 'Avg AI Rating') BgComponent = CalciferBg;

    return (
        <div
            className="glass-card rounded-2xl p-6 group cursor-default animate-fade-in-up relative overflow-hidden"
            style={{ animationDelay: `${delay}ms` }}
        >
            {BgComponent && <BgComponent className="opacity-30 dark:opacity-20 transition-opacity duration-500 group-hover:opacity-40 dark:group-hover:opacity-30" />}

            <div className="relative z-10">
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
        </div>
    );
};

// ─── Verdict color helpers ───
const getVerdictColor = (verdict: string) => {
    switch (verdict) {
        case 'productive': return '#4ade80';
        case 'unproductive': return '#f87171';
        case 'NA': return '#94a3b8';
        default: return '#fbbf24';
    }
};

const getRatingColor = (rating: number) => {
    if (rating >= 7) return '#4ade80';
    if (rating >= 4) return '#fbbf24';
    return '#f87171';
};

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════
export const UsageCharts = () => {
    const { activities, ratings } = useStore();
    const { isDark } = useTheme();
    const [period, setPeriod] = useState<TimePeriod>('today');
    const [rangeData, setRangeData] = useState<Record<string, { activities: Activity[] }>>({});
    const [loading, setLoading] = useState(false);
    const [expandedRating, setExpandedRating] = useState<number | null>(null);

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

    // ─── Filter ratings for the selected period ───
    const filteredRatings = useMemo(() => {
        const now = new Date();
        let startTime: number;

        if (period === 'today') {
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            startTime = todayStart.getTime();
        } else if (period === 'yesterday') {
            const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return ratings
                .filter((r: any) => r.timestamp >= yesterdayStart.getTime() && r.timestamp < yesterdayEnd.getTime())
                .sort((a: any, b: any) => b.timestamp - a.timestamp);
        } else if (period === '7days') {
            const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
            startTime = weekAgo.getTime();
        } else {
            const monthAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
            startTime = monthAgo.getTime();
        }

        return ratings
            .filter((r: any) => r.timestamp >= startTime)
            .sort((a: any, b: any) => b.timestamp - a.timestamp);
    }, [ratings, period]);

    // ─── Ratings chart data (for line chart in 7/30 day views) ───
    const ratingsChartData = useMemo(() => {
        if (period !== '7days' && period !== '30days') return [];

        // Group ratings by date, take average
        const byDate: Record<string, number[]> = {};
        filteredRatings.forEach((r: any) => {
            if (typeof r.rating !== 'number') return;
            const dateStr = new Date(r.timestamp).toISOString().split('T')[0];
            if (!byDate[dateStr]) byDate[dateStr] = [];
            byDate[dateStr].push(r.rating);
        });

        return Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dateStr, vals]) => ({
                date: getShortDate(dateStr),
                Rating: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10,
            }));
    }, [filteredRatings, period]);

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

        return { pieData, barData, topApps, totalDuration, appCount: topApps.length };
    }, [activities, rangeData, period]);

    const gridColor = isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(168, 162, 158, 0.2)';
    const axisColor = isDark ? '#64748b' : '#a8a29e';
    const top5Names = topApps.slice(0, 5).map(a => a.name);
    const avgRating = filteredRatings.length > 0
        ? Math.round(filteredRatings.filter((r: any) => typeof r.rating === 'number').reduce((s: number, r: any) => s + r.rating, 0) / filteredRatings.filter((r: any) => typeof r.rating === 'number').length * 10) / 10
        : null;

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
                    <div className={`grid grid-cols-1 gap-6 ${avgRating !== null ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
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
                            subtext="Distinct applications"
                            icon={Monitor}
                            delay={200}
                        />
                        {avgRating !== null && (
                            <MetricCard
                                title="Avg AI Rating"
                                value={`${avgRating}/10`}
                                subtext={`${filteredRatings.length} report${filteredRatings.length !== 1 ? 's' : ''}`}
                                icon={Brain}
                                delay={300}
                            />
                        )}
                    </div>

                    {/* Charts Row */}
                    {topApps.length > 0 ? (
                        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                            {/* Donut Chart */}
                            <div className="glass-card-static rounded-2xl p-6 animate-fade-in-up relative overflow-hidden" style={{ animationDelay: '100ms' }}>
                                <div className="flex items-center gap-2 mb-6">
                                    <BarChart3 size={20} style={{ color: 'var(--accent)' }} />
                                    <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                                        Usage Breakdown
                                    </h3>
                                </div>
                                <TotoroSceneBg opacity={0.1} />
                                <div className="h-[300px]" style={{ position: 'relative', zIndex: 1 }}>
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
                                                <div
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                                    style={{
                                                        background: CHART_COLORS[idx % CHART_COLORS.length] + '20',
                                                        color: CHART_COLORS[idx % CHART_COLORS.length],
                                                    }}
                                                >
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                                        {app.name}
                                                    </p>
                                                    {/* Bar track with catbus at tip */}
                                                    <div className="relative mt-2" style={{ height: '18px', width: '100%' }}>
                                                        {/* Track */}
                                                        <div
                                                            className="absolute bottom-0 left-0 w-full rounded-full"
                                                            style={{
                                                                height: '5px',
                                                                background: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(168,162,158,0.2)',
                                                            }}
                                                        />
                                                        {/* Fill bar */}
                                                        <div
                                                            className="absolute bottom-0 left-0 rounded-full transition-all duration-1000 ease-out animate-bar-shimmer"
                                                            style={{
                                                                height: '5px',
                                                                width: `${Math.min(100, (app.duration / Math.max(totalDuration, 1)) * 100)}%`,
                                                                background: `linear-gradient(90deg, ${CHART_COLORS[idx % CHART_COLORS.length]}88, ${CHART_COLORS[idx % CHART_COLORS.length]}, #fff8, ${CHART_COLORS[idx % CHART_COLORS.length]}, ${CHART_COLORS[idx % CHART_COLORS.length]}88)`,
                                                            }}
                                                        />
                                                        {/* Catbus at the tip */}
                                                        <div
                                                            className="absolute bottom-[2px] transition-all duration-1000 ease-out catbus-tip"
                                                            style={{
                                                                left: `calc(${Math.min(100, (app.duration / Math.max(totalDuration, 1)) * 100)}% - 10px)`,
                                                            }}
                                                        >
                                                            <svg viewBox="0 0 40 22" width="20" height="11" style={{ display: 'block', filter: `drop-shadow(0 0 3px ${CHART_COLORS[idx % CHART_COLORS.length]})` }}>
                                                                <rect x="2" y="4" width="34" height="14" rx="5" fill="#94a3b8" />
                                                                <rect x="5" y="7" width="5" height="4" rx="1" fill="#1e293b" opacity="0.7" />
                                                                <rect x="12" y="7" width="5" height="4" rx="1" fill="#1e293b" opacity="0.7" />
                                                                <rect x="19" y="7" width="5" height="4" rx="1" fill="#1e293b" opacity="0.7" />
                                                                <rect x="26" y="7" width="5" height="4" rx="1" fill="#1e293b" opacity="0.7" />
                                                                <circle cx="10" cy="18" r="3.5" fill="#334155" />
                                                                <circle cx="10" cy="18" r="1.5" fill="#64748b" />
                                                                <circle cx="28" cy="18" r="3.5" fill="#334155" />
                                                                <circle cx="28" cy="18" r="1.5" fill="#64748b" />
                                                                <ellipse cx="36" cy="11" rx="2" ry="1.5" fill="#fbbf24" opacity="0.9" />
                                                                <circle cx="37" cy="8" r="1.5" fill="white" />
                                                                <circle cx="37" cy="8" r="0.7" fill="#1e293b" />
                                                                <circle cx="37" cy="14" r="1.5" fill="white" />
                                                                <circle cx="37" cy="14" r="0.7" fill="#1e293b" />
                                                                <line x1="36" y1="11" x2="40" y2="10" stroke="#94a3b8" strokeWidth="0.5" />
                                                                <line x1="36" y1="11" x2="40" y2="12" stroke="#94a3b8" strokeWidth="0.5" />
                                                                <path d="M2,8 Q-2,4 0,1 Q2,-1 3,2" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
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

                    {/* ═══════════════════════════════════ */}
                    {/* AI Ratings Section */}
                    {/* ═══════════════════════════════════ */}
                    {filteredRatings.length > 0 && (
                        <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                            {/* Ratings Trend Line Chart (7/30 days only) */}
                            {ratingsChartData.length > 1 && (
                                <div className="glass-card-static rounded-2xl p-6">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Brain size={20} style={{ color: '#a855f7' }} />
                                        <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                                            Productivity Rating Trend
                                        </h3>
                                    </div>
                                    <div className="h-[200px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={ratingsChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fill: axisColor, fontSize: 11 }}
                                                    axisLine={{ stroke: gridColor }}
                                                    tickLine={false}
                                                />
                                                <YAxis
                                                    domain={[0, 10]}
                                                    tick={{ fill: axisColor, fontSize: 11 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    ticks={[0, 2, 4, 6, 8, 10]}
                                                />
                                                <Tooltip content={<RatingTooltip isDark={isDark} />} />
                                                <Line
                                                    type="monotone"
                                                    dataKey="Rating"
                                                    stroke="#a855f7"
                                                    strokeWidth={3}
                                                    dot={{ fill: '#a855f7', strokeWidth: 2, r: 5, stroke: isDark ? '#0f172a' : '#fff' }}
                                                    activeDot={{ r: 7, fill: '#a855f7', stroke: isDark ? '#0f172a' : '#fff', strokeWidth: 3 }}
                                                    animationDuration={800}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Past Ratings Cards */}
                            <div className="glass-card-static rounded-2xl p-6">
                                <div className="flex items-center gap-2 mb-6">
                                    <Star size={20} style={{ color: '#f59e0b' }} />
                                    <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                                        AI Reports
                                    </h3>
                                    <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                                        {filteredRatings.length} report{filteredRatings.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="space-y-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: '400px' }}>
                                    {filteredRatings.map((rating: any, idx: number) => {
                                        const isExpanded = expandedRating === idx;
                                        const ratingNum = typeof rating.rating === 'number' ? rating.rating : 0;
                                        const ratingColor = getRatingColor(ratingNum);
                                        const verdictColor = getVerdictColor(rating.verdict);

                                        return (
                                            <div
                                                key={rating.id || idx}
                                                className="rounded-xl overflow-hidden transition-all duration-300"
                                                style={{
                                                    background: 'var(--bg-elevated)',
                                                    border: `1px solid ${isExpanded ? verdictColor + '40' : 'var(--border-secondary)'}`,
                                                }}
                                            >
                                                {/* Collapsed header — always visible */}
                                                <button
                                                    onClick={() => setExpandedRating(isExpanded ? null : idx)}
                                                    className="w-full flex items-center gap-3 p-4 text-left transition-all duration-200"
                                                    onMouseEnter={(e) => {
                                                        if (!isExpanded) (e.currentTarget.parentElement as HTMLElement).style.borderColor = 'var(--border-hover)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isExpanded) (e.currentTarget.parentElement as HTMLElement).style.borderColor = 'var(--border-secondary)';
                                                    }}
                                                >
                                                    {/* Score badge */}
                                                    <div
                                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                                                        style={{ background: ratingColor + '18', color: ratingColor }}
                                                    >
                                                        {typeof rating.rating === 'number' ? rating.rating : '—'}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="text-xs font-bold uppercase px-2 py-0.5 rounded-md"
                                                                style={{ background: verdictColor + '18', color: verdictColor }}
                                                            >
                                                                {rating.verdict || 'N/A'}
                                                            </span>
                                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                                {rating.timestampReadable || new Date(rating.timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                                                            {rating.explanation}
                                                        </p>
                                                    </div>

                                                    {/* Expand toggle */}
                                                    <div className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </div>
                                                </button>

                                                {/* Expanded details */}
                                                {isExpanded && (
                                                    <div className="px-4 pb-4 animate-fade-in-up" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                                                        {/* Explanation */}
                                                        <p className="text-sm leading-relaxed py-3" style={{ color: 'var(--text-primary)' }}>
                                                            "{rating.explanation}"
                                                        </p>

                                                        {/* Categorization */}
                                                        {rating.categorization && (
                                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                                {[
                                                                    { label: 'Productive', items: rating.categorization.productive, color: '#4ade80' },
                                                                    { label: 'Neutral', items: rating.categorization.neutral, color: '#fbbf24' },
                                                                    { label: 'Distracting', items: rating.categorization.distracting, color: '#f87171' },
                                                                ].map((cat, i) => (
                                                                    <div key={i} className="rounded-lg p-2.5" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cat.color }}>{cat.label}</span>
                                                                        <div className="mt-1 space-y-0.5">
                                                                            {cat.items?.length > 0
                                                                                ? cat.items.map((app: string, j: number) => (
                                                                                    <p key={j} className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>• {app}</p>
                                                                                ))
                                                                                : <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>None</p>
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Tips */}
                                                        {rating.tips?.length > 0 && (
                                                            <div className="rounded-lg p-3" style={{ background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
                                                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#818cf8' }}>Tips</span>
                                                                <ul className="mt-1 space-y-1">
                                                                    {rating.tips.map((tip: string, i: number) => (
                                                                        <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: isDark ? '#c7d2fe' : '#4338ca' }}>
                                                                            <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: '#818cf8' }} />
                                                                            {tip}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
