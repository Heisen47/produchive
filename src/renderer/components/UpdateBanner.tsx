import React, { useState, useEffect } from 'react';
import { ArrowUpRight, X, RefreshCw } from 'lucide-react';

interface UpdateInfo {
    updateAvailable: boolean;
    latestVersion?: string;
    currentVersion: string;
    releaseUrl?: string;
}

export const UpdateBanner: React.FC = () => {
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const check = async () => {
            try {
                const info = await (window as any).electronAPI.checkForUpdates();
                if (info?.updateAvailable) {
                    setUpdateInfo(info);
                }
            } catch {
                // Silently fail — no banner shown
            }
        };
        check();
    }, []);

    if (!updateInfo?.updateAvailable || dismissed) return null;

    return (
        <div className="bg-indigo-600/20 border border-indigo-500/30 text-indigo-200 px-4 py-2.5 flex items-center justify-between text-sm rounded-lg mx-8 mt-4">
            <div className="flex items-center gap-2">
                <RefreshCw size={14} className="text-indigo-400" />
                <span>
                    A new version <strong className="text-white">v{updateInfo.latestVersion}</strong> is available!
                    <span className="text-indigo-400 ml-1">(current: v{updateInfo.currentVersion})</span>
                </span>
            </div>
            <div className="flex items-center gap-2">
                <a
                    href={updateInfo.releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md font-medium transition-colors"
                >
                    Download
                    <ArrowUpRight size={14} />
                </a>
                <button
                    onClick={() => setDismissed(true)}
                    className="p-1 text-indigo-400 hover:text-white transition-colors rounded"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};
