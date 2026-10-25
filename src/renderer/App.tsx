import React, { useState, useEffect, useRef } from 'react';
import { StudyRooms } from './components/StudyRooms';
import { FocusRoom } from './components/FocusRoom';
import { PremiumPaywall } from './components/PremiumPaywall';
import { ActivityMonitor } from './components/ActivityMonitor';
import { ProductivityJudge } from './components/ProductivityJudge';
import { Dashboard } from './components/Dashboard';
import { UsageCharts } from './components/UsageCharts';
import { WelcomeModal } from './components/WelcomeModal';
import { ActivityConfirmationPopup } from './components/ActivityConfirmationPopup';
import { DebugPanel } from './components/DebugPanel';
import { Toaster, toast } from 'sonner';
import { ErrorModal } from './components/ErrorModal';
import { LoginModal } from './components/LoginModal';
import { Navbar } from './components/Navbar';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { initEngine, parseAIErrorMessage, AVAILABLE_MODELS, hasModelInCache, getPersistedDownloadedModels, requestPersistentStorage, MODELS_CHANGED_EVENT, AIModel } from './lib/ai';
import { useStore } from './lib/store';
import { apiClient } from './lib/api';
import { syncEngine } from './lib/services';
import { setGoogleAuthToken } from './lib/googleCalendar';
import { activityAutoTracker } from './lib/activityAutoTracker';
import { aiNudgeService } from './lib/aiNudgeService';
import { studyAssistantService } from './lib/studyAssistantService';
import {
    Loader2,
    Bot,
    ChevronDown,
    Cloud,
    XCircle,
    LayoutDashboard,
    BarChart3,
    Activity,
    Calendar,
    Brain,
    Users2,
    Coffee,
    UserCircle,
    Crown,
    Settings,
    FolderSync
} from 'lucide-react';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { Footer } from './components/Footer';
import { DownloadProgress } from './components/DownloadProgress';
import { UpdateBanner } from './components/UpdateBanner';
import { PeekabooCat } from './components/PeekabooCat';
import { SakuraTree } from './components/SakuraTree';
import { ModelManager } from './components/ModelManager';
import { createExternalEngine, isExternalEngine, getAISource, setAISource, PROVIDER_LABELS } from './lib/externalEngine';
import type { ExternalAIConfig } from './global';
import { PromptEditorModal } from './components/PromptEditorModal';
import { Routine } from './components/Routine';
import { FeedbackModal } from './components/FeedbackModal';
import { trackUsageSeconds, shouldShowFeedbackPrompt } from './lib/feedbackManager';
import { version as appVersion } from '../../package.json';

const viewIcons: Record<string, React.ComponentType<any>> = {
    dashboard: LayoutDashboard,
    analytics: BarChart3,
    routine: Calendar,
    monitor: Calendar,
    ai: Brain,
    focusroom: Coffee,
};


const viewLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    analytics: 'Analytics',
    routine: 'Routine',
    monitor: 'Routine',
    ai: 'AI Insights',
    focusroom: 'Focus Rooms ✦',
};

const AppContent = () => {
    const { addActivity, goals, setError, error, selectedModelId, isPremium, user } = useStore();
    const { isDark } = useTheme();
    const [currentView, setCurrentView] = useState('dashboard');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false); // Loaded from DB
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showDriveSyncModal, setShowDriveSyncModal] = useState(false);
    const [isDataLoaded, setDataLoaded] = useState(false);
    const [viewKey, setViewKey] = useState(0);
    const [isCatEnabled, setCatEnabled] = useState(true);
    const [isInRoom, setInRoom] = useState(false);

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

    // Forcibly clear any orphaned or stuck 'Logged to Calendar' toasts and purge SnippingTool events
    useEffect(() => {
        const cleanupLegacy = () => {
            try {
                toast.dismiss();
                const toasts = document.querySelectorAll('[data-sonner-toast]');
                toasts.forEach((el) => {
                    const txt = el.textContent || '';
                    if (txt.includes('Logged to Calendar') || txt.includes('Accurate detection?')) {
                        el.remove();
                    }
                });

                const raw = localStorage.getItem('produchive_master_routines');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const filtered = parsed.filter((r: any) => {
                        if (!r.isAutoDetected) return true;
                        const app = (r.detectedApp || '').toLowerCase();
                        const title = (r.title || '').toLowerCase();
                        if (app.includes('snippingtool') || title.includes('snippingtool') || app.includes('screenclipping')) {
                            return false;
                        }
                        if ((r.durationMinutes || 0) < 5 && (r.actualDurationSeconds || 0) < 300) {
                            return false;
                        }
                        return true;
                    });
                    if (filtered.length !== parsed.length) {
                        localStorage.setItem('produchive_master_routines', JSON.stringify(filtered));
                        window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
                    }
                }
            } catch (_) {}
        };

        cleanupLegacy();
        window.addEventListener('produchive_routine_updated', cleanupLegacy);
        const interval = setInterval(cleanupLegacy, 60000);
        return () => {
            window.removeEventListener('produchive_routine_updated', cleanupLegacy);
            clearInterval(interval);
        };
    }, []);

    // Listen for activity updates and deep link auth tokens
    useEffect(() => {
        syncEngine.start();
        activityAutoTracker.init();
        studyAssistantService.init();

        window.electronAPI.onActivityUpdate((activity) => {
            addActivity(activity);
            syncEngine.enqueueActivity(activity);
            aiNudgeService.handleActivity(activity);

            // Trigger Pomodoro technique strictly when user is studying
            const appLower = (activity.owner?.name || '').toLowerCase();
            const titleLower = (activity.title || '').toLowerCase();
            const isStudyApp =
                appLower.includes('pdf') ||
                appLower.includes('preview') ||
                appLower.includes('acrobat') ||
                appLower.includes('anki') ||
                appLower.includes('quizlet') ||
                appLower.includes('coursera') ||
                appLower.includes('khan') ||
                titleLower.includes('photosynthesis') ||
                titleLower.includes('.pdf') ||
                titleLower.includes('textbook') ||
                titleLower.includes('lecture') ||
                titleLower.includes('chapter');

            if (isStudyApp) {
                let topic = 'General Study';
                if (titleLower.includes('photosynthesis')) topic = 'Photosynthesis';
                else if (activity.title && activity.title.length > 3) {
                    topic = activity.title.split(/[-—|]/)[0].trim().substring(0, 35);
                }
                studyAssistantService.startStudy(topic);
            }
        });


        // Set up real-time listener for deep link auth tokens
        window.electronAPI.onAuthToken(async (token) => {
            sessionStorage.setItem('token', token);
            localStorage.setItem('token', token);
            try {
                const me = await apiClient.getMe();
                useStore.getState().setUser(me);
                window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
                setShowLoginModal(false);
            } catch (err) {
                console.error('Failed to retrieve user info with deep-linked token:', err);
                sessionStorage.removeItem('token');
            }
        });

        // Listen for Google Calendar access token (sent separately from JWT)
        window.electronAPI.onGcalToken(({ gcalToken, gcalEmail }) => {
            console.log('Received Google Calendar token for:', gcalEmail);
            setGoogleAuthToken(gcalToken, gcalEmail);
            window.dispatchEvent(new CustomEvent('produchive_gcal_authenticated'));
            window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
        });

        const handleOpenSyncModal = () => setShowDriveSyncModal(true);
        window.addEventListener('produchive_open_sync_modal', handleOpenSyncModal);

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
                    localStorage.setItem('token', token);
                } else {
                    // Restore user session if token exists in session storage
                    token = sessionStorage.getItem('token') || localStorage.getItem('token');
                }

                if (token) {
                    try {
                        const me = await apiClient.getMe();
                        useStore.getState().setUser(me);
                        if (me.email && (me.email.toLowerCase().endsWith('@gmail.com') || me.email.toLowerCase().endsWith('@googlemail.com'))) {
                            setGoogleAuthToken(token, me.email);
                        }
                        window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
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
    const [downloadedModel, setDownloadedModel] = useState<AIModel | null>(() => {
        try {
            const persisted = getPersistedDownloadedModels();
            if (persisted.length > 0) {
                return AVAILABLE_MODELS.find((m) => persisted.includes(m.id)) || null;
            }
        } catch {}
        return null;
    });
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<{ text: string; progress?: number }>({ text: '' });
    const [showModelSelector, setShowModelSelector] = useState(false);
    const [externalConfig, setExternalConfig] = useState<ExternalAIConfig | null>(null);

    // Restore the API model on launch when it was the last one used (no download or GPU load needed)
    useEffect(() => {
        let mounted = true;
        window.electronAPI?.externalAIGetConfig?.().then((config) => {
            if (!mounted) return;
            setExternalConfig(config);
            if (config?.configured && getAISource() === 'external') {
                const external = createExternalEngine(config);
                setEngine(external);
                setModelName(config.model);
                aiNudgeService.setEngine(external);
            }
        }).catch(() => {});
        return () => { mounted = false; };
    }, []);
    const [showPromptEditor, setShowPromptEditor] = useState(false);
    const loadingRef = useRef(false);
    const selectorRef = useRef<HTMLDivElement>(null);

    // Detect which supported AI model is fully installed on disk (survives app restarts)
    useEffect(() => {
        let mounted = true;
        requestPersistentStorage();
        const checkDownloaded = async () => {
            // Prefer the user's selected model, then any other installed one
            const ordered = [...AVAILABLE_MODELS].sort((a, b) =>
                Number(b.id === selectedModelId) - Number(a.id === selectedModelId)
            );
            for (const model of ordered) {
                try {
                    if (await hasModelInCache(model.id)) {
                        if (mounted) setDownloadedModel(model);
                        return;
                    }
                } catch {
                    // Ignore cache checking errors
                }
            }
            if (mounted) setDownloadedModel(null);
        };
        checkDownloaded();
        window.addEventListener(MODELS_CHANGED_EVENT, checkDownloaded);
        return () => {
            mounted = false;
            window.removeEventListener(MODELS_CHANGED_EVENT, checkDownloaded);
        };
    }, [engine, selectedModelId]);

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

    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

    // Track active usage time & prompt for feedback after 1 hour threshold
    useEffect(() => {
        const checkPrompt = () => {
            if (shouldShowFeedbackPrompt(appVersion)) {
                setShowFeedbackModal(true);
            }
        };

        // Initial check on app startup
        checkPrompt();

        // Increment active time every 10 seconds while app is open
        const interval = setInterval(() => {
            trackUsageSeconds(10);
            checkPrompt();
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const startEngine = async (modelIdToUse?: string) => {
        loadingRef.current = true;
        setLoading(true);

        try {
            const targetModelId = modelIdToUse || selectedModelId || downloadedModel?.id || undefined;
            const result = await initEngine((progress: any) => {
                if (!loadingRef.current) return;
                setProgress({
                    text: progress.text || '',
                    progress: progress.progress
                });
            }, targetModelId);
            if (loadingRef.current) {
                setAISource('local');
                setEngine(result.engine);
                setModelName(result.modelName);
                aiNudgeService.setEngine(result.engine);
                setLoading(false);
                return result.engine;
            }
        } catch (err: any) {
            if (loadingRef.current) {
                setEngine(null);
                aiNudgeService.setEngine(null);
                const friendlyMessage = parseAIErrorMessage(err, modelIdToUse || selectedModelId || undefined);
                setError(friendlyMessage);
                setLoading(false);
                throw new Error(friendlyMessage);
            }
        }
    };

    const cancelEngine = () => {
        loadingRef.current = false;
        aiNudgeService.setEngine(null);
        setLoading(false);
        setProgress({ text: '' });
    };

    const unloadEngine = async () => {
        try {
            await engine?.unload?.();
        } catch (e) {
            console.warn('Failed to unload AI engine', e);
        }
        cancelEngine();
        setEngine(null);
        setModelName('');
    };

    // Switch to an API model; frees the GPU memory held by a local model first
    const activateExternalEngine = async (config: ExternalAIConfig) => {
        if (engine && !isExternalEngine(engine)) await unloadEngine();
        cancelEngine();
        const external = createExternalEngine(config);
        setEngine(external);
        setModelName(config.model);
        aiNudgeService.setEngine(external);
        setAISource('external');
    };

    const activeModelLabel = isExternalEngine(engine)
        ? engine.config.model
        : AVAILABLE_MODELS.find((m) => m.id === modelName)?.name || modelName.split('-')[0];

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
            {/* Background tree: first child so all later (positioned) content paints over it */}
            {!isInRoom && <SakuraTree />}
            <ErrorModal />
            <ActivityConfirmationPopup />
            <DebugPanel />
            <FeedbackModal
                isOpen={showFeedbackModal}
                onClose={() => setShowFeedbackModal(false)}
                currentVersion={appVersion}
            />
            <Toaster
                position="bottom-right"
                theme={isDark ? 'dark' : 'light'}
                duration={3500}
                visibleToasts={1}
                toastOptions={{
                    duration: 3500,
                    style: {
                        background: 'var(--bg-card-solid)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-card)',
                        boxShadow: 'var(--shadow-card)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        padding: '10px 14px',
                    },
                }}
            />
            {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
            {showDriveSyncModal && <GoogleDriveSyncModal isOpen={showDriveSyncModal} onClose={() => setShowDriveSyncModal(false)} />}
            {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
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
            <main className="flex-1 flex flex-col min-w-0 relative">
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
                        ) : (
                            <div className="relative flex items-center gap-1.5" ref={selectorRef}>
                                {engine ? (
                                    <button
                                        onClick={() => setShowModelSelector(!showModelSelector)}
                                        className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl transition-all hover:bg-green-500/20 active:scale-95 cursor-pointer"
                                        style={{
                                            background: 'rgba(34, 197, 94, 0.1)',
                                            color: '#4ade80',
                                            border: '1px solid rgba(34, 197, 94, 0.2)',
                                        }}
                                        title={isExternalEngine(engine) ? `Using ${engine.config.model} via ${PROVIDER_LABELS[engine.config.provider]}` : undefined}
                                    >
                                        {isExternalEngine(engine) ? <Cloud size={14} /> : <Bot size={14} />}
                                        <span className="font-medium max-w-[160px] truncate">{activeModelLabel}</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse ml-1" />
                                    </button>
                                ) : downloadedModel ? (
                                    <>
                                        <button
                                            onClick={() => startEngine(downloadedModel.id)}
                                            className="flex items-center gap-2 text-sm px-3.5 py-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                            style={{
                                                background: 'rgba(99, 102, 241, 0.12)',
                                                color: '#a5b4fc',
                                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                            }}
                                            title={`${downloadedModel.name} is installed on this device. Click to load it — no download needed.`}
                                        >
                                            <Bot size={14} className="text-indigo-400" />
                                            <span className="font-semibold">{downloadedModel.name}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">Installed</span>
                                        </button>
                                        <button
                                            onClick={() => setShowModelSelector(!showModelSelector)}
                                            aria-label="Choose AI model"
                                            title="Choose AI model"
                                            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-card-hover)] cursor-pointer"
                                            style={{ color: 'var(--text-muted)', border: '1px solid var(--border-primary)' }}
                                        >
                                            <ChevronDown size={14} />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setShowModelSelector(!showModelSelector)}
                                        className="text-sm px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 glow-ring hover:scale-105 cursor-pointer"
                                        style={{
                                            background: 'var(--bg-elevated)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-primary)',
                                        }}
                                    >
                                        <Bot size={16} style={{ color: 'var(--accent)' }} />
                                        Activate AI
                                    </button>
                                )}

                                {showModelSelector && (
                                    <div
                                        className="absolute top-full right-0 mt-2 w-[380px] max-w-[calc(100vw-32px)] rounded-xl shadow-2xl border animate-fade-in z-50 overflow-hidden"
                                        style={{
                                            background: isDark ? 'rgba(15, 23, 42, 0.97)' : 'rgba(255, 255, 255, 0.97)',
                                            borderColor: 'var(--border-secondary)',
                                            backdropFilter: 'blur(20px)'
                                        }}
                                    >
                                        <ModelManager
                                            activeModelId={engine && !isExternalEngine(engine) ? modelName : undefined}
                                            externalConfig={externalConfig}
                                            externalActive={isExternalEngine(engine)}
                                            onExternalConfigChange={setExternalConfig}
                                            onUseExternal={async (config) => {
                                                await activateExternalEngine(config);
                                                setShowModelSelector(false);
                                            }}
                                            onApply={(modelId) => {
                                                cancelEngine();
                                                setShowModelSelector(false);
                                                setTimeout(() => startEngine(modelId), 100);
                                            }}
                                            onEditPrompt={() => {
                                                setShowModelSelector(false);
                                                setShowPromptEditor(true);
                                            }}
                                            onClose={() => setShowModelSelector(false)}
                                            onUnloadActive={async () => {
                                                await unloadEngine();
                                                setShowModelSelector(false);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => setShowDriveSyncModal(true)}
                            className="p-2 rounded-xl transition-all flex items-center justify-center relative group hover:scale-105 cursor-pointer"
                            style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-primary)',
                                color: 'var(--text-primary)',
                            }}
                            title="Encrypted Device Sync & Backup"
                        >
                            <FolderSync size={18} style={{ color: 'var(--accent)' }} />
                        </button>

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
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-8">
                    <div className="max-w-6xl mx-auto space-y-8">
                        {/* Loading State */}
                        {loading && (
                            <DownloadProgress progress={progress} />
                        )}

                        {/* Views with animation */}
                        <div key={viewKey} className="animate-fade-in-up">
                            {currentView === 'dashboard' && (
                                <Dashboard
                                    onNavigate={handleViewChange}
                                    engine={engine}
                                    onStartEngine={startEngine}
                                    isEngineLoading={loading}
                                    engineProgress={progress}
                                    downloadedModelName={downloadedModel?.name}
                                />
                            )}

                            {currentView === 'analytics' && <UsageCharts />}

                            {(currentView === 'routine' || currentView === 'monitor') && (
                                <Routine
                                    engine={engine}
                                    onStartEngine={startEngine}
                                    isEngineLoading={loading}
                                    engineProgress={progress}
                                    downloadedModelName={downloadedModel?.name}
                                    downloadedModelId={downloadedModel?.id}
                                    downloadedModel={downloadedModel}
                                    onOpenModelSelector={() => setShowModelSelector(true)}
                                />
                            )}

                            {currentView === 'ai' && (
                                <div className="space-y-6">
                                    <ProductivityJudge engine={engine} modelLabel={engine ? activeModelLabel : undefined} onNavigate={handleViewChange} />
                                </div>
                            )}

                            {currentView === 'focusroom' && <StudyRooms onNavigate={handleViewChange} onRoomChange={setInRoom} />}
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
