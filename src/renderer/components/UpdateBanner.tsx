import React, { useState, useEffect } from 'react';
import { Info, ExternalLink, X } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export const UpdateBanner: React.FC = () => {
    const [updateInfo, setUpdateInfo] = useState<any>(null);
    const [dismissed, setDismissed] = useState(false);
    const { isDark } = useTheme();

    useEffect(() => {
        (window as any).electronAPI?.checkForUpdates?.()
            .then((info: any) => {
                if (info) setUpdateInfo(info);
            })
            .catch(() => {});
    }, []);

    if (!updateInfo?.updateAvailable || dismissed) return null;

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
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>A new version {updateInfo.version}</span> is available.
            </span>
            <a
                href={updateInfo.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-semibold transition-colors"
                style={{ color: 'var(--accent)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-light)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
            >
                Download <ExternalLink size={12} />
            </a>
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
