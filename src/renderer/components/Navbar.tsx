import React from 'react';
import {
    LayoutDashboard,
    Activity as ActivityIcon,
    Target,
    Menu,
    X,
    Sun,
    Moon,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

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
        className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-300 text-sm font-medium group relative overflow-hidden
            ${active
                ? 'text-white'
                : 'hover:translate-x-0.5'
            }`}
        style={{
            background: active ? 'linear-gradient(135deg, var(--accent), var(--accent-dark))' : 'transparent',
            color: active ? '#fff' : 'var(--text-secondary)',
            boxShadow: active ? '0 4px 15px var(--accent-glow)' : 'none',
        }}
        onMouseEnter={(e) => {
            if (!active) {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
            }
        }}
        onMouseLeave={(e) => {
            if (!active) {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
            }
        }}
    >
        <Icon size={18} className={active ? 'drop-shadow-sm' : ''} />
        {!collapsed && <span className="tracking-wide">{label}</span>}
        {active && !collapsed && (
            <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        )}
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
    const { theme, toggleTheme, isDark } = useTheme();

    return (
        <aside
            className={`${isSidebarOpen ? 'w-64' : 'w-[72px]'} 
            flex flex-col z-20 transition-all duration-300 relative`}
            style={{
                background: 'var(--bg-card)',
                backdropFilter: 'blur(20px)',
                borderRight: '1px solid var(--border-card)',
                boxShadow: isDark ? '4px 0 30px rgba(0,0,0,0.3)' : '4px 0 20px rgba(0,0,0,0.05)',
            }}
        >
            {/* Sidebar glow accent */}
            {isDark && (
                <div className="absolute left-0 top-0 w-[2px] h-full bg-gradient-to-b from-blue-500/50 via-transparent to-blue-500/20" />
            )}

            {/* Header */}
            <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                <button
                    onClick={() => setSidebarOpen(!isSidebarOpen)}
                    className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
                    style={{
                        color: 'var(--text-muted)',
                        background: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                    }}
                >
                    <div className={`transition-transform duration-300 ${isSidebarOpen ? 'rotate-0' : 'rotate-180'}`}>
                        {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </div>
                </button>
                {isSidebarOpen && (
                    <h1 className="font-display font-bold text-lg tracking-tight gradient-text animate-fade-in">
                        Produchive
                    </h1>
                )}
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-3 py-4 space-y-1.5">
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

            {/* Bottom Section */}
            <div className="p-3 space-y-2" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-3' : 'justify-center'} py-2.5 rounded-xl transition-all duration-300 text-sm font-medium`}
                    style={{
                        color: 'var(--text-secondary)',
                        background: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                    }}
                >
                    <div className="transition-transform duration-500" style={{ transform: isDark ? 'rotate(0deg)' : 'rotate(360deg)' }}>
                        {isDark ? <Moon size={18} /> : <Sun size={18} />}
                    </div>
                    {isSidebarOpen && (
                        <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
                    )}
                </button>

                {/* AI Status */}
                {isSidebarOpen && isAIActive && (
                    <div
                        className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl animate-fade-in"
                        style={{
                            color: '#4ade80',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                        }}
                    >
                        <div className="relative">
                            <Target size={14} />
                            <div className="absolute inset-0 animate-ping opacity-30">
                                <Target size={14} />
                            </div>
                        </div>
                        <span className="font-medium">AI Active</span>
                    </div>
                )}
                {!isSidebarOpen && isAIActive && (
                    <div className="flex justify-center w-full">
                        <div className="relative">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-glow-green" />
                            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-40" />
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};
