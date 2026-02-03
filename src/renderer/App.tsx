import React, { useState, useEffect } from 'react';
import { GoalSetter } from './components/GoalSetter';
import { ActivityMonitor } from './components/ActivityMonitor';
import { ProductivityJudge } from './components/ProductivityJudge';
import { DebugPanel } from './components/DebugPanel';
import { Dashboard } from './components/Dashboard';
import { SystemLog } from './components/SystemLog';
import { initEngine } from './lib/ai';
import { useStore } from './lib/store';
import {
    LayoutDashboard,
    Activity as ActivityIcon,
    Settings,
    Bot,
    Loader2,
    Sparkles,
    AlertTriangle,
    Menu,
    X,
    LogOut
} from 'lucide-react';

// Sidebar Link Component
const SidebarLink = ({ icon: Icon, label, active, onClick }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
            active 
                ? 'bg-blue-500/10 text-blue-400' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        }`}
    >
        <Icon size={18} />
        {label}
    </button>
);

const App = () => {
    const { addActivity } = useStore();
    const [currentView, setCurrentView] = useState('dashboard');
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    // Listen for activity updates
    useEffect(() => {
        window.electronAPI.onActivityUpdate((activity) => {
            addActivity(activity);
        });
    }, [addActivity]);

    const [engine, setEngine] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const [error, setError] = useState<string>('');

    const startEngine = async () => {
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
        <div className="h-screen w-screen bg-gray-950 text-gray-100 flex overflow-hidden font-sans selection:bg-blue-500/30">
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
                    />
                    <SidebarLink 
                        icon={ActivityIcon} 
                        label="Live Monitor" 
                        active={currentView === 'monitor'} 
                        onClick={() => setCurrentView('monitor')} 
                    />
                    <SidebarLink 
                        icon={Bot} 
                        label="AI Insights" 
                        active={currentView === 'ai'} 
                        onClick={() => setCurrentView('ai')} 
                    />
                     <SidebarLink 
                        icon={Settings} 
                        label="Settings" 
                        active={currentView === 'settings'} 
                        onClick={() => setCurrentView('settings')} 
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
                            <Bot size={14} />
                            <span>AI Active</span>
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
                        {!engine && (
                            <button
                                onClick={startEngine}
                                disabled={loading}
                                className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                {loading ? 'Loading AI...' : 'Activate AI'}
                            </button>
                        )}
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="max-w-6xl mx-auto space-y-8">
                         {/* Loading/Error States */}
                         {loading && (
                            <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4 flex items-center gap-3">
                                <Loader2 size={18} className="animate-spin text-blue-400" />
                                <span className="text-sm text-blue-200">{progress || 'Initializing AI...'}</span>
                            </div>
                        )}
                        {error && (
                            <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4 flex items-center gap-3">
                                <AlertTriangle size={18} className="text-red-400" />
                                <span className="text-sm text-red-200">{error}</span>
                            </div>
                        )}

                        {/* Views */}
                        {currentView === 'dashboard' && <Dashboard />}
                        
                        {currentView === 'monitor' && (
                            <div className="space-y-6">
                                <SystemLog />
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <ActivityMonitor />
                                </div>
                            </div>
                        )}

                        {currentView === 'ai' && (
                            <div className="space-y-6">
                                <GoalSetter />
                                <ProductivityJudge engine={engine} />
                            </div>
                        )}
                        
                         {currentView === 'settings' && (
                            <div className="space-y-6">
                                <DebugPanel />
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;

