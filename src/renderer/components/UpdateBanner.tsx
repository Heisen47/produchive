import React, { useState, useEffect } from 'react';
import { Info, Download, RefreshCw, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useTheme } from './ThemeProvider';

type UpdatePhase =
    | 'idle'
    | 'checking'
    | 'available'        // update found, waiting for user to click "Download"
    | 'downloading'      // downloading in progress
    | 'downloaded'       // download complete, waiting for user to click "Restart"
    | 'error';

interface DownloadProgress {
    percent: number;
    transferred: number;
    total: number;
}

export const UpdateBanner: React.FC = () => {
    const [phase, setPhase] = useState<UpdatePhase>('idle');
    const [version, setVersion] = useState<string>('');
    const [progress, setProgress] = useState<DownloadProgress>({ percent: 0, transferred: 0, total: 0 });
    const [errorMessage, setErrorMessage] = useState('');
    const [dismissed, setDismissed] = useState(false);
    const { isDark } = useTheme();

    useEffect(() => {
        const api = window.electronAPI;
        if (!api?.onUpdateStatus) return;

        api.onUpdateStatus((statusObj: any) => {
            switch (statusObj.status) {
                case 'checking':
                    setPhase('checking');
                    setDismissed(false);
                    break;
                case 'available':
                    setPhase('available');
                    if (statusObj.version) setVersion(statusObj.version);
                    setDismissed(false);
                    break;
                case 'not-available':
                    setPhase('idle');
                    break;
                case 'downloading':
                    setPhase('downloading');
                    if (statusObj.progress) setProgress(statusObj.progress);
                    break;
                case 'downloaded':
                    setPhase('downloaded');
                    if (statusObj.version) setVersion(statusObj.version);
                    break;
                case 'error':
                    setPhase('error');
                    setErrorMessage(statusObj.message || 'An unknown error occurred');
                    break;
            }
        });
    }, []);

    // Don't show anything when idle or dismissed
    if (phase === 'idle' || dismissed) return null;

    const handleDownload = async () => {
        try {
            setPhase('downloading');
            setProgress({ percent: 0, transferred: 0, total: 0 });
            await window.electronAPI.downloadUpdate();
            // Status will be updated via the IPC listener above
        } catch (err: any) {
            setPhase('error');
            setErrorMessage(err?.message || 'Download failed');
        }
    };

    const handleInstall = async () => {
        try {
            await window.electronAPI.installUpdate();
        } catch (err: any) {
            setPhase('error');
            setErrorMessage(err?.message || 'Installation failed');
        }
    };

    const handleCheckAgain = async () => {
        try {
            setPhase('checking');
            setErrorMessage('');
            await window.electronAPI.checkForUpdates();
        } catch (err: any) {
            setPhase('error');
            setErrorMessage(err?.message || 'Check failed');
        }
    };

    const formatBytes = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    const getBannerStyle = () => {
        if (phase === 'error') {
            return {
                background: isDark
                    ? 'linear-gradient(90deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))'
                    : 'linear-gradient(90deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))',
                borderBottom: '1px solid rgba(239,68,68,0.2)',
            };
        }
        if (phase === 'downloaded') {
            return {
                background: isDark
                    ? 'linear-gradient(90deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))'
                    : 'linear-gradient(90deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))',
                borderBottom: '1px solid rgba(34,197,94,0.2)',
            };
        }
        return {
            background: isDark
                ? 'linear-gradient(90deg, rgba(37,99,235,0.15), rgba(99,102,241,0.1))'
                : 'linear-gradient(90deg, rgba(37,99,235,0.08), rgba(99,102,241,0.05))',
            borderBottom: '1px solid rgba(37,99,235,0.2)',
        };
    };

    return (
        <div
            className="px-4 py-2.5 flex items-center gap-3 text-sm animate-fade-in relative overflow-hidden"
            style={getBannerStyle()}
        >
            {/* Download progress bar background */}
            {phase === 'downloading' && (
                <div
                    className="absolute inset-0 transition-all duration-300 ease-out"
                    style={{
                        width: `${progress.percent}%`,
                        background: isDark
                            ? 'rgba(37,99,235,0.1)'
                            : 'rgba(37,99,235,0.06)',
                    }}
                />
            )}

            {/* Icon */}
            <div className="relative z-10 flex items-center">
                {phase === 'checking' && (
                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-light)' }} />
                )}
                {phase === 'available' && (
                    <Info size={16} style={{ color: 'var(--accent-light)' }} />
                )}
                {phase === 'downloading' && (
                    <Download size={16} className="animate-bounce" style={{ color: 'var(--accent-light)' }} />
                )}
                {phase === 'downloaded' && (
                    <CheckCircle2 size={16} style={{ color: '#4ade80' }} />
                )}
                {phase === 'error' && (
                    <AlertCircle size={16} style={{ color: '#f87171' }} />
                )}
            </div>

            {/* Message */}
            <span className="relative z-10 flex-1" style={{ color: 'var(--text-secondary)' }}>
                {phase === 'checking' && (
                    <>Checking for updates...</>
                )}
                {phase === 'available' && (
                    <>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Update {version}
                        </span>{' '}
                        is available!
                    </>
                )}
                {phase === 'downloading' && (
                    <>
                        Downloading update...{' '}
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {progress.percent}%
                        </span>
                        {progress.total > 0 && (
                            <span className="ml-1 text-xs opacity-70">
                                ({formatBytes(progress.transferred)} / {formatBytes(progress.total)})
                            </span>
                        )}
                    </>
                )}
                {phase === 'downloaded' && (
                    <>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Update {version}
                        </span>{' '}
                        is ready. Restart to apply?
                    </>
                )}
                {phase === 'error' && (
                    <>
                        Update failed:{' '}
                        <span className="font-medium" style={{ color: '#f87171' }}>
                            {errorMessage}
                        </span>
                    </>
                )}
            </span>

            {/* Action Buttons */}
            <div className="relative z-10 flex items-center gap-2">
                {phase === 'available' && (
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 font-semibold transition-all bg-blue-500 hover:bg-blue-600 active:scale-95 text-white px-3 py-1 rounded text-xs"
                    >
                        <Download size={13} />
                        Download Now
                    </button>
                )}

                {phase === 'downloaded' && (
                    <button
                        onClick={handleInstall}
                        className="flex items-center gap-1.5 font-semibold transition-all bg-green-500 hover:bg-green-600 active:scale-95 text-white px-3 py-1 rounded text-xs"
                    >
                        <RefreshCw size={13} />
                        Restart & Update
                    </button>
                )}

                {phase === 'error' && (
                    <button
                        onClick={handleCheckAgain}
                        className="flex items-center gap-1.5 font-semibold transition-all bg-red-500/80 hover:bg-red-500 active:scale-95 text-white px-3 py-1 rounded text-xs"
                    >
                        <RefreshCw size={13} />
                        Retry
                    </button>
                )}
            </div>

            {/* Dismiss */}
            {phase !== 'downloading' && (
                <button
                    onClick={() => setDismissed(true)}
                    className="relative z-10 ml-auto p-1 rounded transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                    }}
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
};
