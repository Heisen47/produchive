import React, { useRef, useMemo } from 'react';
import { Download, Cpu, Zap, Loader2 } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface DownloadProgressProps {
    progress: { text: string; progress?: number };
}

export const DownloadProgress: React.FC<DownloadProgressProps> = ({ progress }) => {
    const { isDark } = useTheme();
    const pct = typeof progress.progress === 'number' ? Math.round(progress.progress * 100) : null;
    const startTimeRef = useRef<number>(Date.now());

    // Detect stage from text
    const isDownloading = progress.text.toLowerCase().includes('download');
    const isCompiling = progress.text.toLowerCase().includes('compil');

    const stageIcon = isCompiling ? <Cpu size={20} /> : isDownloading ? <Download size={20} /> : <Zap size={20} />;
    const stageColor = isCompiling ? '#f472b6' : isDownloading ? '#60a5fa' : '#4ade80';

    // Compute approximate remaining time (ETA)
    const remainingTime = useMemo(() => {
        if (pct === null || pct <= 0 || pct >= 100) return null;

        // Try parsing elapsed seconds from progress report text (e.g. "71 secs elapsed")
        let elapsedSec: number | null = null;
        const match = progress.text.match(/(\d+(?:\.\d+)?)\s*(?:secs?|seconds?|s)\s*elapsed/i);
        if (match) {
            elapsedSec = parseFloat(match[1]);
        }

        // Fallback to measured wall-clock elapsed time
        if (!elapsedSec || elapsedSec <= 0) {
            elapsedSec = (Date.now() - startTimeRef.current) / 1000;
        }

        if (elapsedSec < 3) {
            return 'Estimating...';
        }

        const p = pct / 100;
        const remainingSec = Math.round((elapsedSec * (1 - p)) / p);

        if (remainingSec <= 0) return 'Almost ready';
        if (remainingSec < 60) return `~${remainingSec}s left`;
        const mins = Math.floor(remainingSec / 60);
        const secs = remainingSec % 60;
        if (mins < 60) {
            return secs > 0 ? `~${mins}m ${secs}s left` : `~${mins}m left`;
        }
        const hours = Math.floor(mins / 60);
        const remMins = mins % 60;
        return `~${hours}h ${remMins}m left`;
    }, [pct, progress.text]);

    return (
        <div
            className="rounded-2xl p-6 animate-fade-in-up glass-card-static"
            style={{
                borderColor: `${stageColor}33`,
            }}
        >
            <div className="flex items-center gap-4 mb-4">
                <div
                    className="p-2.5 rounded-xl shrink-0"
                    style={{ background: `${stageColor}15`, color: stageColor }}
                >
                    {stageIcon}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-display font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {isCompiling ? 'Compiling Model' : isDownloading ? 'Downloading Model' : 'Initializing AI'}
                    </h4>
                    <p className="text-[11px] leading-relaxed mt-0.5 break-words opacity-80" style={{ color: 'var(--text-muted)' }}>
                        {progress.text}
                    </p>
                </div>
                {pct !== null && (
                    <div className="flex flex-col items-end shrink-0 pl-2">
                        <span className="text-xl font-display font-bold leading-tight" style={{ color: stageColor }}>
                            {pct}%
                        </span>
                        {remainingTime && (
                            <span className="text-[11px] font-medium text-slate-400 mt-0.5 whitespace-nowrap">
                                {remainingTime}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Progress Track */}
            <div
                className="h-2 w-full rounded-full overflow-hidden relative"
                style={{ background: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(168,162,158,0.2)' }}
            >
                {pct !== null ? (
                    <div
                        className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                        style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${stageColor}, ${stageColor}aa)`,
                            boxShadow: `0 0 20px ${stageColor}40`,
                        }}
                    >
                        {/* Shimmer effect */}
                        <div
                            className="absolute inset-0 animate-shimmer"
                            style={{
                                background: `linear-gradient(90deg, transparent, ${stageColor}30, transparent)`,
                            }}
                        />
                    </div>
                ) : (
                    <div
                        className="h-full rounded-full animate-pulse"
                        style={{ width: '40%', background: stageColor, opacity: 0.4 }}
                    />
                )}
            </div>

            {/* Stage Indicators */}
            <div className="flex justify-between mt-3">
                {['Initialize', 'Download', 'Compile'].map((stage, i) => {
                    const isActive = (i === 0 && !isDownloading && !isCompiling) ||
                                     (i === 1 && isDownloading && !isCompiling) ||
                                     (i === 2 && isCompiling);
                    const isPast = (i === 0 && (isDownloading || isCompiling)) ||
                                   (i === 1 && isCompiling);
                    return (
                        <div key={stage} className="flex items-center gap-1.5">
                            <div
                                className="w-2 h-2 rounded-full transition-all duration-300"
                                style={{
                                    background: isActive ? stageColor : isPast ? stageColor : 'var(--text-muted)',
                                    opacity: isActive || isPast ? 1 : 0.3,
                                    boxShadow: isActive ? `0 0 8px ${stageColor}60` : 'none',
                                }}
                            />
                            <span
                                className="text-xs font-medium"
                                style={{
                                    color: isActive ? stageColor : isPast ? 'var(--text-secondary)' : 'var(--text-muted)',
                                }}
                            >
                                {stage}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
