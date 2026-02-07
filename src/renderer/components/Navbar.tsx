import React from 'react';
import {
    LayoutDashboard,
    Activity as ActivityIcon,
    Target,
    Menu,
    X,
} from 'lucide-react';

interface SidebarLinkProps {
    icon: React.ElementType;
    label: string;
    active: boolean;
    onClick: () => void;
    collapsed: boolean;
}

const SidebarLink = ({ icon: Icon, label, active, onClick, collapsed }: SidebarLinkProps) => (
    <button
        onClick={onClick}
        title={collapsed ? label : ''}
        className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${active
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
    >
        <Icon size={18} />
        {!collapsed && <span>{label}</span>}
    </button>
);

interface NavbarProps {
    currentView: string;
    setCurrentView: (view: string) => void;
    isSidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    isAIActive: boolean;
}

export const Navbar = ({
    currentView,
    setCurrentView,
    isSidebarOpen,
    setSidebarOpen,
    isAIActive
}: NavbarProps) => {
    return (
        <aside
            className={`${isSidebarOpen ? 'w-64' : 'w-20'} 
            bg-gray-900/50 border-r border-gray-800 transition-all duration-300 flex flex-col z-20`}
        >
            {/* Header with hamburger at top */}
            <div className="p-4 border-b border-gray-800 flex items-center ">           
                <button
                    onClick={() => setSidebarOpen(!isSidebarOpen)}
                    className="p-2 text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-800/50"
                >
                    {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
                 <div className="">
                    
                    {isSidebarOpen && (
                        <h1 className="font-bold text-lg tracking-tight text-gray-100 gap-2">Produchive</h1>
                    )}
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 py-4 space-y-1">
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

            {/* AI Status Indicator at bottom */}
            <div className="p-4 border-t border-gray-800">
                {isSidebarOpen && isAIActive && (
                    <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/20 px-3 py-2 rounded-lg border border-green-900/50">
                        <Target size={14} />
                        <span>AI Active</span>
                    </div>
                )}
                {!isSidebarOpen && isAIActive && (
                    <div className="flex justify-center w-full">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                    </div>
                )}
            </div>
        </aside>
    );
};
