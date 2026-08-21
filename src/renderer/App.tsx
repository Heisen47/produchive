import React, { useState, useEffect, useRef } from 'react';
import { StudyRooms } from './components/StudyRooms';
import { FocusRoom } from './components/FocusRoom';
import { PremiumPaywall } from './components/PremiumPaywall';
import { GoalSetter } from './components/GoalSetter';
import { ActivityMonitor } from './components/ActivityMonitor';
import { ProductivityJudge } from './components/ProductivityJudge';
import { DebugPanel } from './components/DebugPanel';
import { Dashboard } from './components/Dashboard';
import { UsageCharts } from './components/UsageCharts';
import { SystemLog } from './components/SystemLog';
import { GoalOnboarding } from './components/GoalOnboarding';
import { WelcomeGuide } from './components/WelcomeGuide';
import { ErrorModal } from './components/ErrorModal';
import { LoginModal } from './components/LoginModal';
import { Navbar } from './components/Navbar';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { initEngine } from './lib/ai';
import { useStore } from './lib/store';
import { apiClient } from './lib/api';
import { syncEngine } from './lib/services';
import {
    Loader2,
    Sparkles,
    XCircle,
    LayoutDashboard,
    BarChart3,
    Activity,
    Brain,
    Users2,
    Coffee,
    UserCircle,
    Crown,
    Settings
} from 'lucide-react';
import { Footer } from './components/Footer';
import { DownloadProgress } from './components/DownloadProgress';
import { UpdateBanner } from './components/UpdateBanner';
import { PeekabooCat } from './components/PeekabooCat';
import { ModelManager } from './components/ModelManager';
import { PromptEditorModal } from './components/PromptEditorModal';

const viewIcons: Record<string, React.ComponentType<any>> = {
    dashboard: LayoutDashboard,
    analytics: BarChart3,
    monitor: Activity,
    ai: Brain,
    focusroom: Coffee,
};


const viewLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    analytics: 'Analytics',
    monitor: 'Live Monitor',
    ai: 'Goals & AI',
    focusroom: 'Focus Rooms ✦',
};

const AppContent = () => {
    const { addActivity, goals, setError, error, selectedModelId, isPremium, user } = useStore();
    const { isDark } = useTheme();
    const [currentView, setCurrentView] = useState('dashboard');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(true);
    const [showWelcome, setShowWelcome] = useState(false); // Loaded from DB
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isDataLoaded, setDataLoaded] = useState(false);
    const [viewKey, setViewKey] = useState(0);
    const [isCatEnabled, setCatEnabled] = useState(true);

    const toggleCat = async () => {
        const newValue = !isCatEnabled;
        setCatEnabled(newValue);
        await window.electronAPI.setSetting('catEnabled', newValue);
    };

    // Animate on view change
    const handleViewChange = (view: string) => {
        setCurrentView(view);
        setViewKey(prev => prev + 1);
    };

    // Listen for activity updates and deep link auth tokens
    useEffect(() => {
        syncEngine.start();

        window.electronAPI.onActivityUpdate((activity) => {
            addActivity(activity);
            syncEngine.enqueueActivity(activity);
        });


        // Set up real-time listener for deep link auth tokens
        window.electronAPI.onAuthToken(async (token) => {
            sessionStorage.setItem('token', token);
            try {
                const me = await apiClient.getMe();
                useStore.getState().setUser(me);
                setShowLoginModal(false);
            } catch (err) {
                console.error('Failed to retrieve user info with deep-linked token:', err);
                sessionStorage.removeItem('token');
            }
        });

        const init = async () => {
            try {
                const sysInfo = await window.electronAPI.getSystemInfo();
                if (sysInfo.platform === 'linux' && (sysInfo.distro === 'arch' || sysInfo.distro?.includes('arch'))) {
                    setError("Arch Linux is not currently supported. Please use Windows or macOS. We haven't tested it on other Linux distributions yet. Kindly visit our Github page to raise a PR or open an issue.");
                }

                await useStore.getState().loadTasks();

                // Check welcome guide flag from DB
                const settings = await window.electronAPI.getSettings();
                if (!settings?.welcomeDismissed) {
                    setShowWelcome(true);
                }
                
                // Load cat setting
                if (settings?.catEnabled !== undefined) {
                    setCatEnabled(settings.catEnabled);
                }

                // Check if we have a pending deep link token from startup
                let token = await window.electronAPI.getPendingToken();
                if (token) {
                    sessionStorage.setItem('token', token);
                } else {
                    // Restore user session if token exists in session storage
                    token = sessionStorage.getItem('token');
                }

                if (token) {
                    try {
                        const me = await apiClient.getMe();
                        useStore.getState().setUser(me);
                    } catch (err) {
                        console.error('Failed to restore user session:', err);
                        sessionStorage.removeItem('token');
                    }
                }
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
    const [showModelSelector, setShowModelSelector] = useState(false);
    const [showPromptEditor, setShowPromptEditor] = useState(false);
    const loadingRef = useRef(false);
    const selectorRef = useRef<HTMLDivElement>(null);

    // Close selector when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
                setShowModelSelector(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            }, selectedModelId || undefined);
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
            <div className="h-screen w-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
                <div className="flex flex-col items-center gap-4 animate-fade-in-up">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
                            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
                        </div>
                        <div className="absolute inset-0 rounded-2xl animate-glow-pulse" />
                    </div>
                    <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Loading your workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex overflow-hidden font-sans selection:bg-blue-500/30" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <ErrorModal />
            {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
            {showWelcome && <WelcomeGuide onClose={() => setShowWelcome(false)} />}
            {!showWelcome && showOnboarding && <GoalOnboarding onClose={() => setShowOnboarding(false)} />}
            {showPromptEditor && <PromptEditorModal onClose={() => setShowPromptEditor(false)} />}
            
            {isCatEnabled && <PeekabooCat isSidebarOpen={isSidebarOpen} />}

            {/* Sidebar */}
            <Navbar
                currentView={currentView}
                setCurrentView={handleViewChange}
                isSidebarOpen={isSidebarOpen}
                setSidebarOpen={setSidebarOpen}
                isAIActive={!!engine}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 relative" style={{ background: 'var(--bg-primary)' }}>
                <UpdateBanner />

                {/* Header */}
                <header
                    className="h-16 flex items-center justify-between px-8 sticky top-0 z-10"
                    style={{
                        background: isDark ? 'rgba(10, 14, 26, 0.8)' : 'rgba(245, 240, 232, 0.8)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid var(--border-secondary)',
                    }}
                >
                    <div className="flex items-center gap-3">
                        {(() => {
                            const Icon = viewIcons[currentView];
                            return Icon ? <Icon size={22} style={{ color: 'var(--accent)' }} /> : null;
                        })()}
                        <h2 className="text-xl font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {viewLabels[currentView] || currentView}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {loading ? (
                            <button
                                onClick={cancelEngine}
                                className="text-sm px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 hover:scale-105"
                                style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: '#f87171',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                }}
                            >
                                <XCircle size={16} />
                                Stop
                            </button>
                        ) : engine ? (
                            <div className="relative" ref={selectorRef}>
                                <button
                                    onClick={() => setShowModelSelector(!showModelSelector)}
                                    className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl transition-all hover:bg-green-500/20 active:scale-95 cursor-pointer"
                                    style={{
                                        background: 'rgba(34, 197, 94, 0.1)',
                                        color: '#4ade80',
                                        border: '1px solid rgba(34, 197, 94, 0.2)',
                                    }}
                                >
                                    <Sparkles size={14} />
                                    <span className="font-medium">{modelName.split('-')[0]}</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse ml-1" />
                                </button>

                                {showModelSelector && (
                                    <div 
                                        className="absolute top-full right-0 mt-2 w-80 p-4 rounded-xl shadow-2xl border animate-fade-in z-50 overflow-hidden"
                                        style={{
                                            background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                            borderColor: 'var(--border-secondary)',
                                            backdropFilter: 'blur(20px)'
                                        }}
                                    >
                                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                                            <h4 className="font-bold text-sm">Select Model</h4>
                                            <button 
                                                onClick={() => setShowModelSelector(false)}
                                                className="text-xs opacity-60 hover:opacity-100 p-1"
                                            >
                                                Close
                                            </button>
                                        </div>
                                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                                            <ModelManager />
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-white/10 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    // Trigger reload if model changed
                                                    if (selectedModelId && selectedModelId !== modelName) {
                                                        cancelEngine();
                                                        setTimeout(() => startEngine(), 100);
                                                    }
                                                    setShowModelSelector(false);
                                                }}
                                                className="flex-grow py-2 rounded-lg text-xs font-bold transition-colors hover:bg-white/10 bg-white/5"
                                            >
                                                Apply & Reload
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowModelSelector(false);
                                                    setShowPromptEditor(true);
                                                }}
                                                className="px-3 py-2 rounded-lg text-xs font-bold transition-colors hover:bg-white/10 bg-white/5 flex items-center gap-1"
                                                title="Edit AI system prompt"
                                            >
                                                <Settings size={12} />
                                                Prompt
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={startEngine}
                                className="text-sm px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 glow-ring hover:scale-105"
                                style={{
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-primary)',
                                }}
                            >
                                <Sparkles size={16} style={{ color: 'var(--accent)' }} />
                                Activate AI
                            </button>
                        )}

                        <button
                            onClick={() => setShowLoginModal(true)}
                            className="p-2 rounded-full transition-all flex items-center justify-center relative group hover:scale-105"
                            style={isPremium ? {
                                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(218, 165, 32, 0.1) 100%)', 
                                border: '1px solid rgba(255, 215, 0, 0.5)',
                                boxShadow: '0 0 15px rgba(255, 215, 0, 0.2), inset 0 0 10px rgba(218, 165, 32, 0.1)'
                            } : { 
                                background: 'var(--bg-elevated)', 
                                border: '1px solid var(--border-primary)',
                                boxShadow: 'none'
                            }}
                            title={user ? `Logged in as ${user.email}${isPremium ? ' (Premium)' : ''}` : "Login"}
                        >
                            {isPremium ? (
                                <Crown 
                                    size={20} 
                                    style={{ 
                                        color: '#FFD700',
                                        filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.4))'
                                    }} 
                                />
                            ) : (
                                <UserCircle 
                                    size={20} 
                                    style={{ 
                                        color: user ? 'var(--accent)' : 'var(--text-secondary)' 
                                    }} 
                                />
                            )}
                            {user && !isPremium && (
                                <div 
                                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-primary)]"
                                    style={{ backgroundColor: '#22c55e' }}
                                />
                            )}
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="max-w-6xl mx-auto space-y-8">
                        {/* Loading State */}
                        {loading && (
                            <DownloadProgress progress={progress} />
                        )}

                        {/* Views with animation */}
                        <div key={viewKey} className="animate-fade-in-up">
                            {currentView === 'dashboard' && <Dashboard onNavigate={handleViewChange} />}

                            {currentView === 'analytics' && <UsageCharts />}

                            {currentView === 'monitor' && (
                                <div className="space-y-6">
                                    <ActivityMonitor />
                                    <SystemLog />
                                </div>
                            )}

                            {currentView === 'ai' && (
                                <div className="space-y-6">
                                    <GoalSetter />
                                    <ProductivityJudge engine={engine} />
                                </div>
                            )}

                            {currentView === 'focusroom' && <StudyRooms onNavigate={handleViewChange} />}
                        </div>

                        <div className="space-y-6 pt-8" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                            <DebugPanel />
                        </div>
                    </div>
                </div>
                <Footer isCatEnabled={isCatEnabled} toggleCat={toggleCat} />
            </main>
        </div>
    );
};

const App = () => {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
};

export default App;
