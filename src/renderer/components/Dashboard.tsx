import React, { useMemo } from 'react';
import { 
    Clock, 
    TrendingUp, 
    Activity as ActivityIcon, 
    MoreHorizontal,
    ArrowUpRight,
    Zap,
    Hourglass
} from 'lucide-react';
import { useStore } from '../lib/store';

// Helper for formatting duration
const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ${Math.floor(seconds % 60)}s`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
};

// Metric Card Component
const MetricCard = ({ title, value, subtext, icon: Icon, trend }: any) => (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 transition-all hover:border-gray-700">
        <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-gray-800/50 text-gray-400">
                <Icon size={20} />
            </div>
            {trend && (
                <div className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-900/20 px-2 py-1 rounded-full border border-green-900/50">
                    <ArrowUpRight size={12} />
                    {trend}
                </div>
            )}
        </div>
        <div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
            <p className="text-2xl font-bold text-gray-100 tracking-tight">{value}</p>
             {subtext && <p className="text-xs text-gray-500 mt-2">{subtext}</p>}
        </div>
    </div>
);

export const Dashboard = () => {
    const { activities, isMonitoring, setMonitoring } = useStore();

    const stats = useMemo(() => {
        const appUsage: Record<string, number> = {};
        const appCounts: Record<string, number> = {};
        let totalDuration = 0;

        activities.forEach(act => {
             // Use aggregated duration from backend, fallback to 1s if missing
             const duration = (act.duration ? act.duration / 1000 : 1); 
             const appName = act.owner.name;
             
             // If we already have this app in our usage map, we should add to it?
             // Actually, since backend aggregates, duplicates should be minimal but good to be safe
             appUsage[appName] = (appUsage[appName] || 0) + duration;
             appCounts[appName] = (appCounts[appName] || 0) + 1;
             totalDuration += duration;
        });

        const sortedApps = Object.entries(appUsage)
            .sort(([, a], [, b]) => b - a)
            .map(([name, duration]) => ({ name, duration, count: appCounts[name] }));

        return {
            totalDuration,
            topApps: sortedApps,
            mostUsed: sortedApps[0],
            activeCount: activities.length
        };
    }, [activities]);

    const handleToggleMonitoring = async () => {
        if (isMonitoring) {
            await window.electronAPI.stopMonitoring();
            setMonitoring(false);
        } else {
            await window.electronAPI.startMonitoring();
            setMonitoring(true);
        }
    };

    return (
        <div className="space-y-8">
            {/* Top Row: Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard 
                    title="Total Time Tracked" 
                    value={formatDuration(stats.totalDuration)} 
                    subtext="Today's activity"
                    icon={Clock}
                />
                <MetricCard 
                    title="Most Used App" 
                    value={stats.mostUsed ? stats.mostUsed.name : '-'} 
                    subtext={stats.mostUsed ? formatDuration(stats.mostUsed.duration) : 'No data'}
                    icon={Zap}
                />
                 <MetricCard 
                    title="Active Sessions" 
                    value={stats.activeCount} 
                    subtext="Distinct activities logged"
                    icon={ActivityIcon}
                />
            </div>

            {/* Main Section: Activity Feed / Table */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-100">Activity Summary</h3>
                        <p className="text-sm text-gray-400">Aggregated usage by application</p>
                    </div>
                    <button 
                        onClick={handleToggleMonitoring}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            isMonitoring 
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50' 
                                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/50'
                        }`}
                    >
                        {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
                    </button>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-900/80 border-b border-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-6">Application</div>
                    <div className="col-span-4">Duration</div>
                    <div className="col-span-2 text-right">Share</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-gray-800/50">
                    {stats.topApps.length > 0 ? (
                        stats.topApps.map((app, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-800/30 transition-colors group">
                                <div className="col-span-6 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 font-bold text-xs">
                                        {app.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-200">{app.name}</p>
                                        <div className="h-1 w-24 bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                                            <div 
                                                className="h-full bg-blue-500/60 rounded-full" 
                                                style={{ width: `${Math.min(100, (app.duration / Math.max(stats.totalDuration, 1)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-4">
                                     <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-300 font-mono">
                                            {formatDuration(app.duration)}
                                        </span>
                                        <span className="text-xs text-gray-600 group-hover:text-gray-500 transition-colors">
                                            {((app.duration / Math.max(stats.totalDuration, 1)) * 100).toFixed(1)}%
                                        </span>
                                     </div>
                                </div>
                                <div className="col-span-2 text-right">
                                    <div className="text-sm text-gray-500">
                                         {/* Placeholder for actions */}
                                         <MoreHorizontal size={16} className="ml-auto cursor-pointer hover:text-gray-300" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            <Hourglass size={32} className="mx-auto mb-3 opacity-50" />
                            <p>No activity recorded today yet.</p>
                            <p className="text-xs mt-1">Start monitoring to track your work.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
