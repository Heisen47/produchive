import React, { useState, useEffect, useRef } from 'react';
import { GoalSetter } from './components/GoalSetter';
import { ActivityMonitor } from './components/ActivityMonitor';
import { ProductivityJudge } from './components/ProductivityJudge';
import { DebugPanel } from './components/DebugPanel';
import { Dashboard } from './components/Dashboard';
import { SystemLog } from './components/SystemLog';
import { GoalOnboarding } from './components/GoalOnboarding';
import { ErrorModal } from './components/ErrorModal';
import { Navbar } from './components/Navbar';
import { initEngine } from './lib/ai';
import { useStore } from './lib/store';
import {
    Loader2,
    Sparkles,
    XCircle,
    LayoutDashboard,
    Activity,
    Brain
} from 'lucide-react';
import { Footer } from './components/Footer';
import { DownloadProgress } from './components/DownloadProgress';

const viewIcons: Record<string, React.ElementType> = {
    dashboard: LayoutDashboard,
    monitor: Activity,
    ai: Brain
};


const App = () => {
    const { addActivity, goals, setError, error } = useStore();
    const [currentView, setCurrentView] = useState('dashboard');
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(true);
    const [isDataLoaded, setDataLoaded] = useState(false);

    // Listen for activity updates
    useEffect(() => {
        window.electronAPI.onActivityUpdate((activity) => {
            addActivity(activity);
        });

        const init = async () => {
            try {
                const sysInfo = await window.electronAPI.getSystemInfo();
                if (sysInfo.platform === 'linux' && (sysInfo.distro === 'arch' || sysInfo.distro?.includes('arch'))) {
                    setError("Arch Linux is not currently supported. Please use Windows or macOS. We haven't tested it on other Linux distributions yet. Kindly visit our Github page to raise a PR or open an issue.");
                }

                await useStore.getState().loadTasks();
            } catch (e: any) {
                setError("Failed to load initial data: " + e.message);
            }
            setDataLoaded(true);
        };
        init();
    }, [addActivity, setError]);

    const [engine, setEngine] = useState<any>(null);
    const [modelName, setModelName] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<{ text: string; progress?: number }>({ text: '' });
    const loadingRef = useRef(false);

    const startEngine = async () => {
        loadingRef.current = true;
        setLoading(true);

        try {
            const result = await initEngine((progress: any) => {
                if (!loadingRef.current) return;
                setProgress({
                    text: progress.text || '',
                    progress: progress.progress
                });
            });
            if (loadingRef.current) {
                setEngine(result.engine);
                setModelName(result.modelName);
                setLoading(false);
            }
        } catch (err: any) {
            if (loadingRef.current) {
                setError(err.message || "Failed to initialize AI");
                setLoading(false);
            }
        }
    };

    const cancelEngine = () => {
        loadingRef.current = false;
        setLoading(false);
        setProgress({ text: '' });
    };

    if (!isDataLoaded) {
        return (
            <div className="h-screen w-screen bg-gray-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                    <p className="text-gray-400 font-medium">Loading your workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-gray-950 text-gray-100 flex overflow-hidden font-sans selection:bg-blue-500/30">
            <ErrorModal />
            {showOnboarding && <GoalOnboarding onClose={() => setShowOnboarding(false)} />}

            {/* Sidebar */}
            <Navbar
                currentView={currentView}
                setCurrentView={setCurrentView}
                isSidebarOpen={isSidebarOpen}
                setSidebarOpen={setSidebarOpen}
                isAIActive={!!engine}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-gray-950 relative">
                {/* Header */}
                <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-gray-950/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        {(() => {
                            const Icon = viewIcons[currentView];
                            return Icon ? <Icon size={22} className="text-blue-400" /> : null;
                        })()}
                        <h2 className="text-xl font-semibold capitalize">{currentView}</h2>

                    </div>
                    <div className="flex items-center gap-4">
                        {loading ? (
                            <button
                                onClick={cancelEngine}
                                className="text-sm bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
                            >
                                <XCircle size={16} />
                                Stop
                            </button>
                        ) : engine ? (
                            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 border border-green-800/50 px-3 py-1.5 rounded-lg">
                                <Sparkles size={14} />
                                <span className="font-medium">{modelName.split('-')[0]}</span>
                            </div>
                        ) : (
                            <button
                                onClick={startEngine}
                                className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <Sparkles size={16} />
                                Activate AI
                            </button>
                        )}
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="max-w-6xl mx-auto space-y-8">
                        {/* Loading State */}
                        {loading && (
                            <DownloadProgress progress={progress} />
                        )}

                        {/* Views */}
                        {currentView === 'dashboard' && <Dashboard onNavigate={setCurrentView} />}

                        {currentView === 'monitor' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <SystemLog />
                                <ActivityMonitor />
                            </div>
                        )}

                        {currentView === 'ai' && (
                            <div className="space-y-6">
                                <GoalSetter />
                                <ProductivityJudge engine={engine} />
                            </div>
                        )}

                        <div className="space-y-6 pt-8 border-t border-gray-800">
                            <DebugPanel />
                        </div>
                    </div>
                </div>
                <Footer />
            </main>
        </div>
    );
};

export default App;
