import React, { useState, useEffect } from 'react';
import { Bug, FolderOpen, FileText, Database, Info, Copy, Check } from 'lucide-react';
import type { SystemInfo } from '../global';

export const DebugPanel = () => {
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
    const [dbContents, setDbContents] = useState<any>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadSystemInfo();
        }
    }, [isOpen]);

    const loadSystemInfo = async () => {
        const info = await window.electronAPI.getSystemInfo();
        setSystemInfo(info);
    };

    const loadDbContents = async () => {
        const contents = await window.electronAPI.getDbContents();
        setDbContents(contents);
    };

    const openUserDataFolder = async () => {
        await window.electronAPI.openUserDataFolder();
    };

    const openLogFile = async () => {
        await window.electronAPI.openLogFile();
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-full shadow-lg border border-gray-700 cursor-pointer transition-all z-50"
                title="Open Debug Panel"
            >
                <Bug size={20} />
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 w-[500px] max-h-[600px] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bug size={20} className="text-orange-400" />
                    <h3 className="font-bold text-white">Debug Panel</h3>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white cursor-pointer"
                >
                    ✕
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {/* Quick Actions */}
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={openUserDataFolder}
                            className="p-3 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700/50 rounded-lg text-left cursor-pointer transition-all"
                        >
                            <FolderOpen size={16} className="text-blue-400 mb-1" />
                            <div className="text-xs text-white font-medium">Open Data Folder</div>
                        </button>
                        <button
                            onClick={openLogFile}
                            className="p-3 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700/50 rounded-lg text-left cursor-pointer transition-all"
                        >
                            <FileText size={16} className="text-purple-400 mb-1" />
                            <div className="text-xs text-white font-medium">Open Log File</div>
                        </button>
                        <button
                            onClick={loadDbContents}
                            className="p-3 bg-green-900/30 hover:bg-green-900/50 border border-green-700/50 rounded-lg text-left cursor-pointer transition-all"
                        >
                            <Database size={16} className="text-green-400 mb-1" />
                            <div className="text-xs text-white font-medium">View Database</div>
                        </button>
                        <button
                            onClick={loadSystemInfo}
                            className="p-3 bg-orange-900/30 hover:bg-orange-900/50 border border-orange-700/50 rounded-lg text-left cursor-pointer transition-all"
                        >
                            <Info size={16} className="text-orange-400 mb-1" />
                            <div className="text-xs text-white font-medium">Refresh Info</div>
                        </button>
                    </div>
                </div>

                {/* System Info */}
                {systemInfo && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">System Information</h4>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 space-y-2 text-xs">
                            <InfoRow
                                label="User Data Path"
                                value={systemInfo.userDataPath}
                                onCopy={() => copyToClipboard(systemInfo.userDataPath, 'userData')}
                                copied={copied === 'userData'}
                            />
                            <InfoRow
                                label="Database Path"
                                value={systemInfo.dbPath}
                                onCopy={() => copyToClipboard(systemInfo.dbPath, 'db')}
                                copied={copied === 'db'}
                            />
                            <InfoRow
                                label="Log Path"
                                value={systemInfo.logPath}
                                onCopy={() => copyToClipboard(systemInfo.logPath, 'log')}
                                copied={copied === 'log'}
                            />
                            <div className="pt-2 border-t border-gray-700">
                                <div className="text-gray-400 mb-1">Versions</div>
                                <div className="text-gray-300 space-y-1 pl-2">
                                    <div>Electron: {systemInfo.versions.electron}</div>
                                    <div>Chrome: {systemInfo.versions.chrome}</div>
                                    <div>Node: {systemInfo.versions.node}</div>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-gray-700">
                                <div className="text-gray-400">Platform: <span className="text-gray-300">{systemInfo.platform} ({systemInfo.arch})</span></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Database Contents */}
                {dbContents && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Database Contents</h4>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 space-y-2 text-xs">
                            <div className="text-gray-400">
                                Tasks: <span className="text-white font-medium">{dbContents.tasks?.length || 0}</span>
                            </div>
                            <div className="text-gray-400">
                                Activities: <span className="text-white font-medium">{dbContents.activities?.length || 0}</span>
                            </div>
                            <div className="text-gray-400">
                                Goal: <span className="text-white font-medium">{dbContents.goal || 'Not set'}</span>
                            </div>
                            <details className="mt-2">
                                <summary className="cursor-pointer text-blue-400 hover:text-blue-300">View Raw JSON</summary>
                                <pre className="mt-2 p-2 bg-black/30 rounded text-[10px] overflow-x-auto text-gray-300">
                                    {JSON.stringify(dbContents, null, 2)}
                                </pre>
                            </details>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const InfoRow = ({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) => (
    <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
            <div className="text-gray-400">{label}</div>
            <div className="text-gray-300 font-mono text-[10px] truncate" title={value}>{value}</div>
        </div>
        <button
            onClick={onCopy}
            className="p-1 hover:bg-gray-700 rounded cursor-pointer transition-colors flex-shrink-0"
            title="Copy to clipboard"
        >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-400" />}
        </button>
    </div>
);
