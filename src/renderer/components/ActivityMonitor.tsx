import React, { useEffect } from 'react';
import { Activity, Clock, Chrome, FileText } from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';

export const ActivityMonitor = () => {
    const { activities, addActivity } = useStore();
    const { isDark } = useTheme();

    useEffect(() => {
        window.electronAPI.onActivityUpdate((activity) => {
            addActivity(activity);
        });
    }, [addActivity]);

    const getAppIcon = (appName: string) => {
        const name = appName.toLowerCase();
        if (name.includes('chrome') || name.includes('firefox') || name.includes('edge')) {
            return <Chrome size={16} style={{ color: 'var(--accent-light)' }} />;
        }
        return <FileText size={16} style={{ color: 'var(--text-muted)' }} />;
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    if (activities.length === 0) {
        return (
            <div className="glass-card-static rounded-2xl p-6 text-center h-[300px] flex flex-col items-center justify-center animate-fade-in-up">
                <div className="p-3 rounded-full mb-3 animate-float" style={{ background: 'var(--bg-elevated)' }}>
                    <Activity size={24} style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Monitoring your activities...</p>
            </div>
        );
    }

    return (
        <div className="glass-card-static rounded-2xl p-4 h-[300px] flex flex-col animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4 shrink-0">
                <Activity size={20} style={{ color: '#2dd4bf' }} />
                <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>Recent Activities</h3>
                <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{activities.length} tracked</span>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                {activities.slice(-10).reverse().map((activity, idx) => (
                    <div
                        key={idx}
                        className="rounded-xl p-3 transition-all duration-200 animate-fade-in-up"
                        style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-secondary)',
                            animationDelay: `${idx * 50}ms`,
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)';
                            (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-secondary)';
                            (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                        }}
                    >
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                                {getAppIcon(activity.owner.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {activity.title}
                                </p>
                                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                                    {activity.owner.name}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
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
