import React, { useEffect, useRef } from 'react';
import { Terminal, Activity, Monitor, Shield } from 'lucide-react';
import { useStore } from '../lib/store';

export const SystemLog = () => {
    const { systemEvents, addSystemEvent, isMonitoring } = useStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Subscribe to system events
        const unsubscribe = window.electronAPI.onSystemEvent((event: any) => {
            addSystemEvent(event);
        });
        
        // Cleanup not really possible with current preload exposure (on is persistent), 
        // but typically you'd return a cleanup function. 
        // For now, onSystemEvent likely adds a listener that persists.
        // If we want cleanup, we'd need to expose removeListener.
        // Given the app structure, this is acceptable for now.
        
        return () => {
             // ideally remove listener
        };
    }, [addSystemEvent]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [systemEvents]);

    if (!isMonitoring && systemEvents.length === 0) {
        return (
            <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-[300px]">
                <div className="bg-gray-900 p-4 rounded-full mb-4">
                    <Shield size={32} className="text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-300">System Monitor Inactive</h3>
                <p className="text-gray-500 text-sm mt-2 max-w-xs">
                    Start monitoring to view real-time system calls and process context switches.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden flex flex-col h-[300px]">
            {/* Terminal Header */}
            <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-green-400" />
                    <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">System Kernel Log</span>
                </div>
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
            </div>

            {/* Terminal Output */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 custom-scrollbar bg-gray-950/50"
            >
                {systemEvents.map((event, idx) => (
                    <div key={idx} className="flex gap-3 hover:bg-gray-900/50 px-2 py-0.5 rounded transition-colors group">
                        <span className="text-gray-600 shrink-0">
                            [{new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}]
                        </span>
                        <div className="flex-1 break-all">
                            <span className={`font-bold mr-2 ${
                                event.type === 'SYS_PROCESS_SWITCH' ? 'text-purple-400' :
                                event.type === 'SYS_WINDOW_FOCUS' ? 'text-blue-400' :
                                'text-gray-500'
                            }`}>
                                {event.type}
                            </span>
                            <span className="text-gray-300">{event.content}</span>
                        </div>
                        {event.details && (
                             <span className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                pid:{event.details.pid}
                            </span>
                        )}
                    </div>
                ))}
                {isMonitoring && (
                    <div className="animate-pulse flex items-center gap-2 text-green-500/50 px-2 mt-2">
                        <Activity size={12} />
                        <span>listening for system calls...</span>
                    </div>
                )}
            </div>
        </div>
    );
};
