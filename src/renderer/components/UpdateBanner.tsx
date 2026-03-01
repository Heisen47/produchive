import React, { useState, useEffect } from 'react';
import { Info, ExternalLink, X } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export const UpdateBanner: React.FC = () => {
    const [updateStatus, setUpdateStatus] = useState<'checking' | 'downloading' | 'ready' | null>(null);
    const [version, setVersion] = useState<string>('');
    const [dismissed, setDismissed] = useState(false);
    const { isDark } = useTheme();

    useEffect(() => {
        // Listen for native update events from update-electron-app
        const autoUpdaterAPI = (window as any).electronAPI;
        if (autoUpdaterAPI?.onUpdateStatus) {
            autoUpdaterAPI.onUpdateStatus((statusObj: any) => {
                setUpdateStatus(statusObj.status);
                if (statusObj.version) setVersion(statusObj.version);
            });
        }
    }, []);

    if (!updateStatus || dismissed) return null;

    const handleInstall = (e: React.MouseEvent) => {
        e.preventDefault();
        if (updateStatus === 'ready') {
            (window as any).electronAPI?.installUpdate();
        }
    };

    return (
        <div
            className="px-4 py-2.5 flex items-center gap-3 text-sm animate-fade-in"
            style={{
                background: isDark ? 'linear-gradient(90deg, rgba(37,99,235,0.15), rgba(99,102,241,0.1))' : 'linear-gradient(90deg, rgba(37,99,235,0.08), rgba(99,102,241,0.05))',
                borderBottom: '1px solid rgba(37,99,235,0.2)',
            }}
        >
            <Info size={16} style={{ color: 'var(--accent-light)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>
                {updateStatus === 'downloading' ? (
                    <>Downloading a <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>new background update</span>...</>
                ) : (
                    <><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Update {version}</span> is ready to install.</>
                )}
            </span>

            {updateStatus === 'ready' && (
                <button
                    onClick={handleInstall}
                    className="flex items-center gap-1 font-semibold transition-colors bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                >
                    Restart to Install
                </button>
            )}

            <button
                onClick={() => setDismissed(true)}
                className="ml-auto p-1 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
            >
                <X size={14} />
            </button>
        </div>
    );
};
