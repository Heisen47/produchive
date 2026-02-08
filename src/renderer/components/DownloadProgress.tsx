import React, { useEffect, useState } from 'react';
import { Download, Loader2, Cpu, CheckCircle2 } from 'lucide-react';

interface DownloadProgressProps {
    progress: {
        text: string;
        progress?: number; 
        timeElapsed?: number;
        loaded?: number;
        total?: number;
    };
}

export const DownloadProgress: React.FC<DownloadProgressProps> = ({ progress }) => {
    const [startTime] = useState<number>(Date.now());
    const [estimatedTime, setEstimatedTime] = useState<string>('Calculating...');

    const percentage = progress.progress !== undefined
        ? Math.round(progress.progress * 100)
        : null;

    // Calculate estimated time remaining
    useEffect(() => {
        if (percentage !== null && percentage > 0) {
            const elapsed = (Date.now() - startTime) / 1000; // seconds
            const rate = percentage / elapsed; // % per second
            const remaining = (100 - percentage) / rate;

            if (remaining < 60) {
                setEstimatedTime(`~${Math.round(remaining)}s remaining`);
            } else if (remaining < 3600) {
                setEstimatedTime(`~${Math.round(remaining / 60)}m remaining`);
            } else {
                setEstimatedTime(`~${Math.round(remaining / 3600)}h remaining`);
            }
        }
    }, [percentage, startTime]);

    // Detect phase from text
    const isDownloading = progress.text?.toLowerCase().includes('loading') ||
        progress.text?.toLowerCase().includes('fetch') ||
        progress.text?.toLowerCase().includes('download');
    const isCompiling = progress.text?.toLowerCase().includes('shader') ||
        progress.text?.toLowerCase().includes('compil');
    const isInitializing = progress.text?.toLowerCase().includes('initializ');

    const getPhaseIcon = () => {
        if (isCompiling) return <Cpu size={20} className="text-purple-400" />;
        if (isDownloading) return <Download size={20} className="text-blue-400" />;
        return <Loader2 size={20} className="animate-spin text-blue-400" />;
    };

    const getPhaseColor = () => {
        if (isCompiling) return 'from-purple-600 to-indigo-600';
        return 'from-blue-600 to-cyan-600';
    };

    const getBackgroundColor = () => {
        if (isCompiling) return 'bg-purple-900/20 border-purple-800/50';
        return 'bg-blue-900/20 border-blue-800/50';
    };

    return (
        <div className={`${getBackgroundColor()} border rounded-xl p-5 space-y-4`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {getPhaseIcon()}
                    <div>
                        <h4 className="font-semibold text-gray-100">
                            {isCompiling ? 'Compiling Shaders' : isDownloading ? 'Downloading Model' : 'Initializing AI'}
                        </h4>
                        <p className="text-sm text-gray-400">{progress.text || 'Please wait...'}</p>
                    </div>
                </div>
                {percentage !== null && (
                    <div className="text-right">
                        <span className="text-2xl font-bold text-gray-100">{percentage}%</span>
                        <p className="text-xs text-gray-500">{estimatedTime}</p>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            {percentage !== null && (
                <div className="space-y-2">
                    <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r ${getPhaseColor()} transition-all duration-300 ease-out`}
                            style={{ width: `${percentage}%` }}
                        >
                            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                        </div>
                    </div>
                </div>
            )}

            {/* Stage Indicators */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                <div className={`flex items-center gap-1.5 ${isDownloading || isCompiling ? 'text-green-400' : 'text-gray-500'}`}>
                    <CheckCircle2 size={12} className={isDownloading || isCompiling ? '' : 'opacity-30'} />
                    <span>Initialize</span>
                </div>
                <div className="h-px flex-1 mx-2 bg-gray-700" />
                <div className={`flex items-center gap-1.5 ${isDownloading ? 'text-blue-400' : isCompiling ? 'text-green-400' : 'text-gray-500'}`}>
                    <Download size={12} className={isDownloading ? 'animate-pulse' : isCompiling ? '' : 'opacity-30'} />
                    <span>Download</span>
                </div>
                <div className="h-px flex-1 mx-2 bg-gray-700" />
                <div className={`flex items-center gap-1.5 ${isCompiling ? 'text-purple-400' : 'text-gray-500'}`}>
                    <Cpu size={12} className={isCompiling ? 'animate-pulse' : 'opacity-30'} />
                    <span>Compile</span>
                </div>
            </div>
        </div>
    );
};
