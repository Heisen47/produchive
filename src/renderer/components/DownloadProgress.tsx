import React from 'react';
import { Download, Cpu, Zap, Loader2 } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface DownloadProgressProps {
    progress: { text: string; progress?: number };
}

export const DownloadProgress: React.FC<DownloadProgressProps> = ({ progress }) => {
    const { isDark } = useTheme();
    const pct = typeof progress.progress === 'number' ? Math.round(progress.progress * 100) : null;

    // Detect stage from text
    const isDownloading = progress.text.toLowerCase().includes('download');
    const isCompiling = progress.text.toLowerCase().includes('compil');

    const stageIcon = isCompiling ? <Cpu size={20} /> : isDownloading ? <Download size={20} /> : <Zap size={20} />;
    const stageColor = isCompiling ? '#f472b6' : isDownloading ? '#60a5fa' : '#4ade80';

    return (
        <div
            className="rounded-2xl p-6 animate-fade-in-up glass-card-static"
            style={{
                borderColor: `${stageColor}33`,
            }}
        >
            <div className="flex items-center gap-4 mb-4">
                <div
                    className="p-2.5 rounded-xl"
                    style={{ background: `${stageColor}15`, color: stageColor }}
                >
                    {stageIcon}
                </div>
                <div className="flex-1">
                    <h4 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                        {isCompiling ? 'Compiling Model' : isDownloading ? 'Downloading Model' : 'Initializing AI'}
                    </h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{progress.text}</p>
                </div>
                {pct !== null && (
                    <span className="text-xl font-display font-bold" style={{ color: stageColor }}>
                        {pct}%
                    </span>
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
