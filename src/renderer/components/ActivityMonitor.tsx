import React, { useEffect } from 'react';
import { Activity, Clock, Chrome, FileText } from 'lucide-react';
import { useStore } from '../lib/store';

export const ActivityMonitor = () => {
    const { activities, addActivity } = useStore();

    useEffect(() => {
        window.electronAPI.onActivityUpdate((activity) => {
            addActivity(activity);
        });
    }, [addActivity]);

    const getAppIcon = (appName: string) => {
        const name = appName.toLowerCase();
        if (name.includes('chrome') || name.includes('firefox') || name.includes('edge')) {
            return <Chrome size={16} className="text-blue-400" />;
        }
        return <FileText size={16} className="text-gray-400" />;
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    if (activities.length === 0) {
        return (
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center">
                <div className="inline-flex p-3 bg-gray-800 rounded-full mb-3">
                    <Activity size={24} className="text-gray-500" />
                </div>
                <p className="text-gray-500 text-sm">Monitoring your activities...</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
                <Activity size={20} className="text-teal-400" />
                <h3 className="font-bold text-white">Recent Activities</h3>
                <span className="ml-auto text-xs text-gray-500">{activities.length} tracked</span>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {activities.slice(-10).reverse().map((activity, idx) => (
                    <div
                        key={idx}
                        className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 hover:bg-gray-800 transition-colors"
                    >
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                                {getAppIcon(activity.owner.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate font-medium">
                                    {activity.title}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {activity.owner.name}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock size={12} />
                                {formatTime(activity.timestamp)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
