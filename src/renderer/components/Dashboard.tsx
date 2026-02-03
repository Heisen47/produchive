import React, { useMemo } from 'react';
import { Play, Square, Activity, Clock, BarChart3, PieChart } from 'lucide-react';
import { useStore } from '../lib/store';

export const Dashboard = () => {
    const { activities, isMonitoring, setMonitoring } = useStore();

    const stats = useMemo(() => {
        const appUsage: Record<string, number> = {};
        let totalDuration = 0;

        // Calculate time based on activities
        // Assuming activities are logged periodically or we estimate duration between them
        // For accurate duration, we'd need start/end times. 
        // With simple polling (e.g. every 3s), we can approximate each activity = 3s or 1s.
        // The current backend polls every 1s.
        
        activities.forEach(act => {
             // Simply count occurrences for now roughly as seconds if backend polls at 1s
             const appName = act.owner.name;
             appUsage[appName] = (appUsage[appName] || 0) + 1; // 1 second per sample
             totalDuration += 1;
        });

        const sortedApps = Object.entries(appUsage)
            .sort(([, a], [, b]) => b - a)
            .map(([name, duration]) => ({ name, duration }));

        return {
            totalDuration,
            topApps: sortedApps,
            activeSince: activities.length > 0 ? activities[0].timestamp : null
        };
    }, [activities]);

    const handleToggleMonitoring = async () => {
        if (isMonitoring) {
            await window.electronAPI.stopMonitoring();
            setMonitoring(false);
        } else {
            // Clear old "active session" logs if desired, or keep them.
            // Let's keep them for history.
            await window.electronAPI.startMonitoring();
            setMonitoring(true);
        }
    };

    const formatDuration = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        if (mins < 60) return `${mins}m ${seconds % 60}s`;
        const hrs = Math.floor(mins / 60);
        return `${hrs}h ${mins % 60}m`;
    };

    return (
        <div className="space-y-6">
            {/* Control Bar */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isMonitoring ? 'bg-green-500/10 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                        <Activity size={24} className={isMonitoring ? 'animate-pulse' : ''} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">
                            {isMonitoring ? 'Monitoring Active' : 'Monitoring Paused'}
                        </h2>
                        <p className="text-gray-400 text-xs">
                            {isMonitoring 
                                ? 'Tracking system calls and application usage...' 
                                : 'Start monitoring to track your productivity.'}
                        </p>
                    </div>
                </div>
                
                <button
                    onClick={handleToggleMonitoring}
                    className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                        isMonitoring 
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50' 
                            : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/50'
                    }`}
                >
                    {isMonitoring ? (
                        <>
                            <Square size={18} fill="currentColor" />
                            Stop Monitoring
                        </>
                    ) : (
                        <>
                            <Play size={18} fill="currentColor" />
                            Start Monitoring
                        </>
                    )}
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <Clock size={16} />
                        <span className="text-xs font-medium uppercase">Total Time Tracked</span>
                    </div>
                    <p className="text-2xl font-mono text-white">{formatDuration(stats.totalDuration)}</p>
                </div>
                
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 md:col-span-2">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <BarChart3 size={16} />
                        <span className="text-xs font-medium uppercase">Top Applications</span>
                    </div>
                    
                    <div className="space-y-3">
                        {stats.topApps.slice(0, 3).map((app, idx) => (
                            <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-300 font-medium">{app.name}</span>
                                    <span className="text-gray-500">{formatDuration(app.duration)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${
                                            idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-purple-500' : 'bg-teal-500'
                                        }`}
                                        style={{ width: `${Math.min(100, (app.duration / Math.max(stats.totalDuration, 1)) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {stats.topApps.length === 0 && (
                            <p className="text-gray-600 text-sm">No usage data available yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
