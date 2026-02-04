import React, { useEffect } from 'react';
import { XCircle, X } from 'lucide-react';
import { useStore } from '../lib/store';

export const ErrorModal = () => {
    const { error, setError } = useStore();

    useEffect(() => {
        if (error) {
            // Auto-dismiss after 10 seconds if needed, but for "required errors" explicit dismissal is better.
            // keeping it manual for now.
        }
    }, [error]);

    if (!error) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-red-500/30 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="bg-red-900/20 p-3 rounded-full shrink-0">
                            <XCircle size={32} className="text-red-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-2">Error Occurred</h3>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                {error}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-950/50 px-6 py-4 flex justify-end">
                    <button
                        onClick={() => setError(null)}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};
