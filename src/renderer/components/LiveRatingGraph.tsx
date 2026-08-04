import React, { useMemo } from 'react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Crown, Lock, Activity, Sparkles, Star } from 'lucide-react';

interface LiveRatingGraphProps {
    onOpenPaywall: () => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div
                className="p-3 rounded-xl shadow-xl border text-xs space-y-1 animate-fade-in"
                style={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    borderColor: 'rgba(167, 139, 250, 0.4)',
                    color: '#fff',
                    backdropFilter: 'blur(10px)'
                }}
            >
                <div className="font-bold flex items-center gap-1 text-purple-300">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    <span>Score: {data.rating}/10</span>
                </div>
                <div className="text-[11px] opacity-80">{data.time}</div>
                {data.appName && <div className="text-[11px] font-mono text-emerald-400 truncate max-w-[200px]">{data.appName}</div>}
                {data.explanation && <div className="text-[10px] opacity-70 italic max-w-[220px]">{data.explanation}</div>}
            </div>
        );
    }
    return null;
};

export const LiveRatingGraph: React.FC<LiveRatingGraphProps> = ({ onOpenPaywall }) => {
    const { isDark } = useTheme();
    const isPremium = useStore(state => state.isPremium);
    const ratings = useStore(state => state.ratings);

    // Format chart data live from ratings
    const chartData = useMemo(() => {
        if (!ratings || ratings.length === 0) {
            // Provide a realistic fallback preview pattern if no ratings yet
            return [
                { time: '10:00 AM', rating: 7, appName: 'VS Code', explanation: 'Productive coding session' },
                { time: '11:00 AM', rating: 9, appName: 'GitHub', explanation: 'PR Code review' },
                { time: '12:00 PM', rating: 5, appName: 'Browser', explanation: 'Research' },
                { time: '01:00 PM', rating: 8, appName: 'Terminal', explanation: 'Build execution' },
                { time: '02:00 PM', rating: 10, appName: 'Produchive', explanation: 'Focused work' }
            ];
        }

        return ratings.slice(-20).map((r: any, idx: number) => {
            const timeStr = r.timestampReadable || (r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `Log #${idx + 1}`);
            const ratingNum = typeof r.rating === 'number' ? r.rating : 7;
            return {
                time: timeStr,
                rating: ratingNum,
                appName: r.appName || r.app || 'App Activity',
                explanation: r.explanation || r.verdict || ''
            };
        });
    }, [ratings]);

    const avgRating = useMemo(() => {
        if (!ratings || ratings.length === 0) return 8.2;
        const valid = ratings.filter((r: any) => typeof r.rating === 'number');
        if (valid.length === 0) return 8.0;
        const sum = valid.reduce((acc: number, curr: any) => acc + curr.rating, 0);
        return Math.round((sum / valid.length) * 10) / 10;
    }, [ratings]);

    return (
        <div
            className="rounded-2xl p-5 transition-all duration-300 relative overflow-hidden"
            style={{
                background: isDark ? 'var(--bg-card)' : 'rgba(255, 255, 255, 0.9)',
                border: '1px solid var(--border-secondary)',
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-purple-400" />
                    <h3 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                        Live Activity Goal Ratings
                    </h3>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Crown size={10} />
                        <span>PREMIUM</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <span className="text-xs opacity-75" style={{ color: 'var(--text-secondary)' }}>Live Avg Score: </span>
                        <span className="text-sm font-extrabold text-emerald-400 font-mono">{avgRating}/10</span>
                    </div>
                </div>
            </div>

            {/* Recharts Area Container */}
            <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="liveRatingGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={10} tickLine={false} />
                        <YAxis domain={[0, 10]} stroke="var(--text-secondary)" fontSize={10} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="rating"
                            stroke="#a78bfa"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#liveRatingGrad)"
                            dot={{ r: 4, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 1.5 }}
                            activeDot={{ r: 6, fill: '#fbbf24' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>

                {/* Subtle Non-Premium Lock Overlay */}
                {!isPremium && (
                    <div
                        className="absolute inset-0 rounded-xl flex flex-col items-center justify-center p-4 text-center z-10 transition-all duration-300"
                        style={{
                            background: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.75)',
                            backdropFilter: 'blur(6px)',
                            border: '1px solid rgba(245, 158, 11, 0.2)'
                        }}
                    >
                        <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center mb-2 text-amber-400 border border-amber-500/30">
                            <Lock size={18} />
                        </div>
                        <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                            Unlock Live Recharts Goal Analytics
                        </h4>
                        <p className="text-xs opacity-75 max-w-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                            Automatically streams real-time AI activity scores and goal trends live into interactive graphs.
                        </p>
                        <button
                            onClick={onOpenPaywall}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md"
                            style={{
                                background: 'linear-gradient(135deg, #f59e0b, #fb923c)',
                                color: '#fff'
                            }}
                        >
                            <Crown size={12} />
                            <span>Unlock with Premium</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
