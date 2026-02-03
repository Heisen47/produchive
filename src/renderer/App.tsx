import React, { useState } from 'react';
import { GoalSetter } from './components/GoalSetter';
import { ActivityMonitor } from './components/ActivityMonitor';
import { ProductivityJudge } from './components/ProductivityJudge';
import { DebugPanel } from './components/DebugPanel';
import { Dashboard } from './components/Dashboard';
import { SystemLog } from './components/SystemLog';
import { initEngine } from './lib/ai';
import { Loader2, Sparkles, AlertTriangle, Bot } from 'lucide-react';

const App = () => {
    // ... (keep usage of hooks)
    const [engine, setEngine] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const [error, setError] = useState<string>('');

    const startEngine = async () => {
        // ... (keep implementation)
        setLoading(true);
        setError('');
        try {
            const eng = await initEngine((progress: any) => {
                setProgress(progress.text);
            });
            setEngine(eng);
            setLoading(false);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to initialize AI");
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex flex-col overflow-hidden font-sans">
            {/* Header */}
            <header className="p-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-teal-400 bg-clip-text text-transparent">
                            Produchive
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">AI-Powered Productivity Monitor</p>
                    </div>
                    {!engine ? (
                        <button
                            onClick={startEngine}
                            disabled={loading}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Loading AI...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} />
                                    Activate AI
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 text-green-400 bg-green-900/30 px-4 py-2 rounded-xl border border-green-700/50">
                            <Bot size={20} />
                            <span className="text-sm font-semibold">AI Active</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-7xl mx-auto p-6 space-y-6">
                    {/* Loading Progress */}
                    {loading && (
                        <div className="bg-blue-900/30 border border-blue-700/50 rounded-2xl p-4">
                            <div className="flex items-center gap-3">
                                <Loader2 size={20} className="animate-spin text-blue-400" />
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-blue-200">Initializing AI Model...</p>
                                    <p className="text-xs text-gray-400 font-mono truncate mt-1">{progress}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-900/30 border border-red-700/50 rounded-2xl p-4 flex items-center gap-3">
                            <AlertTriangle size={20} className="text-red-400" />
                            <p className="text-red-200 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Dashboard & Controls */}
                    <Dashboard />
                    
                    {/* System Logs */}
                    <SystemLog />

                    {/* Goal Setter */}
                    <GoalSetter />

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Activity Monitor */}
                        <div>
                            <ActivityMonitor />
                        </div>

                        {/* Productivity Judge */}
                        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Bot size={20} className="text-purple-400" />
                                <h3 className="font-bold text-white">AI Productivity Analysis</h3>
                            </div>
                            <p className="text-gray-400 text-sm mb-4">
                                Let the AI analyze your recent activities and provide insights on your productivity.
                            </p>
                            <ProductivityJudge engine={engine} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Debug Panel */}
            <DebugPanel />
        </div>
    );
};

export default App;

