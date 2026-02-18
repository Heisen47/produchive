import React, { useState } from 'react';
import { Bug, ChevronDown, ChevronUp, HardDrive, FolderOpen, FileText, Database, Settings } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export const DebugPanel: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [systemInfo, setSystemInfo] = useState<any>(null);
    const [dbContents, setDbContents] = useState<any>(null);
    const { isDark } = useTheme();

    const loadSystemInfo = async () => {
        try {
            const info = await window.electronAPI.getSystemInfo();
            setSystemInfo(info);
        } catch {}
    };

    const loadDbContents = async () => {
        try {
            const contents = await (window.electronAPI as any).getDbContents();
            setDbContents(contents);
        } catch {}
    };

    const handleToggle = () => {
        const newOpen = !isOpen;
        setIsOpen(newOpen);
        if (newOpen && !systemInfo) {
            loadSystemInfo();
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={handleToggle}
                className="fixed bottom-20 right-4 p-3 rounded-full transition-all duration-300 z-30 hover:scale-110"
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-muted)',
                    boxShadow: 'var(--shadow-card)',
                    backdropFilter: 'blur(20px)',
                }}
                title="Debug Panel"
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-card)'; }}
            >
                <Bug size={18} />
            </button>
        );
    }

    return (
        <div
            className="fixed bottom-20 right-4 w-96 max-h-[70vh] rounded-2xl overflow-hidden flex flex-col z-30 animate-scale-in glass-card-static"
            style={{
                boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.5)' : '0 15px 40px rgba(0,0,0,0.1)',
            }}
        >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                <div className="flex items-center gap-2">
                    <Settings size={16} style={{ color: 'var(--accent)' }} className="animate-spin" />
                    <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Debug Panel</h3>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                >
                    <ChevronDown size={16} />
                </button>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar space-y-3">
                {/* System Info */}
                {systemInfo && (
                    <div className="rounded-xl p-3 text-xs font-mono space-y-1" style={{ background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)', border: '1px solid var(--border-secondary)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <HardDrive size={12} style={{ color: 'var(--accent)' }} />
                            <span className="font-sans font-bold text-xs" style={{ color: 'var(--text-primary)' }}>System</span>
                        </div>
                        {Object.entries(systemInfo).map(([key, value]) => (
                            <div key={key} className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{key}</span>
                                <span className="truncate max-w-[200px]">{String(value)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'User Data', icon: FolderOpen, onClick: () => (window.electronAPI as any).openUserDataFolder?.() },
                        { label: 'Log File', icon: FileText, onClick: () => (window.electronAPI as any).openLogFile?.() },
                        { label: 'Load DB', icon: Database, onClick: loadDbContents },
                        { label: 'Refresh Info', icon: HardDrive, onClick: loadSystemInfo },
                    ].map((btn, i) => (
                        <button
                            key={i}
                            onClick={btn.onClick}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200"
                            style={{
                                background: 'var(--bg-elevated)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-secondary)',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-secondary)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
                        >
                            <btn.icon size={14} />
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* DB Contents */}
                {dbContents && (
                    <div className="rounded-xl p-3 text-xs font-mono overflow-x-auto custom-scrollbar" style={{ background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)', border: '1px solid var(--border-secondary)' }}>
                        <pre style={{ color: 'var(--text-muted)' }}>{JSON.stringify(dbContents, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};
