import React, { useEffect, useRef } from 'react';
import { Terminal, Activity, Monitor, Shield } from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';

export const SystemLog = () => {
    const { systemEvents, addSystemEvent, isMonitoring } = useStore();
    const { isDark } = useTheme();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = window.electronAPI.onSystemEvent((event: any) => {
            addSystemEvent(event);
        });

        return () => {};
    }, [addSystemEvent]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [systemEvents]);

    if (!isMonitoring && systemEvents.length === 0) {
        return (
            <div
                className="glass-card-static rounded-2xl p-6 flex flex-col items-center justify-center text-center h-[300px] animate-fade-in-up"
            >
                <div
                    className="p-4 rounded-full mb-4 animate-float"
                    style={{ background: 'var(--bg-elevated)' }}
                >
                    <Shield size={32} style={{ color: 'var(--text-muted)' }} />
                </div>
                <h3 className="text-lg font-display font-semibold" style={{ color: 'var(--text-secondary)' }}>System Monitor Inactive</h3>
                <p className="text-sm mt-2 max-w-xs" style={{ color: 'var(--text-muted)' }}>
                    Start monitoring to view real-time system calls and process context switches.
                </p>
            </div>
        );
    }

    return (
        <div className="glass-card-static rounded-2xl overflow-hidden flex flex-col h-[300px] animate-fade-in-up">
            {/* Terminal Header */}
            <div
                className="px-4 py-2 flex items-center justify-between"
                style={{
                    background: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(237,232,223,0.8)',
                    borderBottom: '1px solid var(--border-secondary)',
                }}
            >
                <div className="flex items-center gap-2">
                    <Terminal size={14} style={{ color: '#4ade80' }} />
                    <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>System Kernel Log</span>
                </div>
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444', boxShadow: isDark ? '0 0 6px rgba(239,68,68,0.4)' : 'none' }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#eab308', boxShadow: isDark ? '0 0 6px rgba(234,179,8,0.4)' : 'none' }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e', boxShadow: isDark ? '0 0 6px rgba(34,197,94,0.4)' : 'none' }} />
                </div>
            </div>

            {/* Terminal Output */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 custom-scrollbar"
                style={{ background: isDark ? 'rgba(10,14,26,0.5)' : 'rgba(255,255,255,0.3)' }}
            >
                {systemEvents.map((event, idx) => (
                    <div
                        key={idx}
                        className="flex gap-3 px-2 py-0.5 rounded transition-all duration-200 group"
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                        <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>
                            [{new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}]
                        </span>
                        <div className="flex-1 break-all">
                            <span className={`font-bold mr-2`} style={{
                                color: event.type === 'SYS_PROCESS_SWITCH' ? '#c084fc' :
                                       event.type === 'SYS_WINDOW_FOCUS' ? '#60a5fa' :
                                       'var(--text-muted)'
                            }}>
                                {event.type}
                            </span>
                            <span style={{ color: 'var(--text-secondary)' }}>{event.content}</span>
                        </div>
                        {event.details && (
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                                pid:{event.details.pid}
                            </span>
                        )}
                    </div>
                ))}
                {isMonitoring && (
                    <div className="animate-pulse flex items-center gap-2 px-2 mt-2" style={{ color: 'rgba(34,197,94,0.5)' }}>
                        <Activity size={12} />
                        <span>listening for system calls...</span>
                    </div>
                )}
            </div>
        </div>
    );
};
