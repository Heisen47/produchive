import React, { useEffect } from 'react';
import { XCircle, X, AlertTriangle, Copy, RefreshCw } from 'lucide-react';
import { useStore } from '../lib/store';

export const ErrorModal = () => {
    const { error, setError } = useStore();

    useEffect(() => {
        if (error) {
        }
    }, [error]);

    const [showDetails, setShowDetails] = React.useState(false);

    if (!error) return null;

    const copyError = () => {
        if (error) {
            navigator.clipboard.writeText(error);
        }
    };

    const reloadApp = () => {
        window.location.reload();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-red-500/30 rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 ring-1 ring-white/10">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-800 flex items-center gap-4 bg-gray-900/50">
                    <div className="bg-red-500/10 p-3 rounded-full shrink-0 ring-1 ring-red-500/20">
                        <AlertTriangle size={24} className="text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">Application Error</h3>
                        <p className="text-red-400 text-xs font-medium uppercase tracking-wider mt-0.5">Critical System Issue</p>
                    </div>
                    <button 
                        onClick={() => setError(null)}
                        className="ml-auto text-gray-500 hover:text-white transition-colors p-1"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <p className="text-gray-300 text-sm leading-relaxed mb-4">
                        An unexpected error has occurred. You can try reloading the application or copying the error details below to report the issue.
                    </p>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                             <button 
                                onClick={() => setShowDetails(!showDetails)}
                                className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                            >
                                {showDetails ? 'Hide' : 'Show'} Technical Details
                            </button>
                        </div>
                        
                        {showDetails && (
                            <div className="bg-black/50 rounded-lg border border-gray-800 p-4 relative group">
                                <pre className="text-xs font-mono text-red-300 whitespace-pre-wrap break-all leading-normal">
                                    {error}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-950/50 px-6 py-4 border-t border-gray-800 flex items-center justify-between gap-3">
                     <button
                        onClick={copyError}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors border border-gray-700 hover:border-gray-600 flex items-center gap-2"
                    >
                        <Copy size={14} />
                        Copy Error
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={reloadApp}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors border border-gray-700 hover:border-gray-600 flex items-center gap-2"
                        >
                            <RefreshCw size={14} />
                            Reload
                        </button>
                        <button
                            onClick={() => setError(null)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-red-900/20"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
