import React, { useState, useEffect, useRef } from 'react';
import { GoalSetter } from './components/GoalSetter';
import { ActivityMonitor } from './components/ActivityMonitor';
import { ProductivityJudge } from './components/ProductivityJudge';
import { DebugPanel } from './components/DebugPanel';
import { Dashboard } from './components/Dashboard';
import { SystemLog } from './components/SystemLog';
import { GoalOnboarding } from './components/GoalOnboarding';
import { ErrorModal } from './components/ErrorModal';
import { initEngine } from './lib/ai';
import { useStore } from './lib/store';
import {
    LayoutDashboard,
    Activity as ActivityIcon,
    Target,
    Loader2,
    Sparkles,
    Menu,
    X,
    XCircle
} from 'lucide-react';


// Sidebar Link Component
const SidebarLink = ({ icon: Icon, label, active, onClick, collapsed }: any) => (
    <button
        onClick={onClick}
        title={collapsed ? label : ''}
        className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
            active 
                ? 'bg-blue-500/10 text-blue-400' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        }`}
    >
        <Icon size={18} />
        {!collapsed && <span>{label}</span>}
    </button>
);


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
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const loadingRef = useRef(false);

    const startEngine = async () => {
        loadingRef.current = true;
        setLoading(true);

        try {
            const eng = await initEngine((progress: any) => {
                if (!loadingRef.current) return;
                setProgress(progress.text);
            });
            if (loadingRef.current) {
                setEngine(eng);
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
        setProgress('');
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
            <aside 
                className={`${isSidebarOpen ? 'w-64' : 'w-20'} 
                bg-gray-900/50 border-r border-gray-800 transition-all duration-300 flex flex-col z-20`}
            >
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
                        <ActivityIcon size={18} className="text-white" />
                    </div>
                    {isSidebarOpen && (
                        <h1 className="font-bold text-lg tracking-tight">Produchive</h1>
                    )}
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <SidebarLink 
                        icon={LayoutDashboard} 
                        label="Dashboard" 
                        active={currentView === 'dashboard'} 
                        onClick={() => setCurrentView('dashboard')} 
                        collapsed={!isSidebarOpen}
                    />
                    <SidebarLink 
                        icon={ActivityIcon} 
                        label="Live Monitor" 
                        active={currentView === 'monitor'} 
                        onClick={() => setCurrentView('monitor')} 
                        collapsed={!isSidebarOpen}
                    />
                    <SidebarLink 
                        icon={Target} 
                        label="Set your goals" 
                        active={currentView === 'ai'} 
                        onClick={() => setCurrentView('ai')} 
                        collapsed={!isSidebarOpen}
                    />
                </nav>


                <div className="p-4 border-t border-gray-800">
                     <button
                        onClick={() => setSidebarOpen(!isSidebarOpen)} 
                        className="w-full flex items-center justify-center p-2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
                    </button>
                    {isSidebarOpen && engine && (
                         <div className="mt-4 flex items-center gap-2 text-xs text-green-400 bg-green-900/20 px-3 py-2 rounded-lg border border-green-900/50">
                            <Target size={14} />
                            <span>AI Active</span>
                        </div>
                    )}
                    {!isSidebarOpen && engine && (
                        <div className="mt-4 flex justify-center w-full">
                           <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                       </div>
                   )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-gray-950 relative">
                {/* Header */}
                <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-gray-950/50 backdrop-blur-sm sticky top-0 z-10">
                    <div>
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
                        ) : !engine && (
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
                            <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4 flex items-center gap-3">
                                <Loader2 size={18} className="animate-spin text-blue-400" />
                                <span className="text-sm text-blue-200">{progress || 'Initializing AI...'}</span>
                            </div>
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
            </main>
        </div>
    );
};

export default App;
