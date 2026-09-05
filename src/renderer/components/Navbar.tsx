import React, { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard,
    Calendar,
    Target,
    Brain,
    Coffee,
    Sun,
    Moon,
    BarChart3,
    Pin,
    PinOff,
    LucideIcon
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface SidebarLinkProps {
    icon: LucideIcon;
    label: string;
    active: boolean;
    onClick: () => void;
    collapsed: boolean;
}

const SidebarLink = ({ icon: Icon, label, active, onClick, collapsed }: SidebarLinkProps) => {
    const { isDark } = useTheme();
    return (
        <button
            onClick={onClick}
            title=""
            className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'justify-start px-3.5'} py-3 rounded-2xl transition-all duration-300 text-sm font-medium group relative overflow-visible`}
            style={{
                background: active ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                border: active ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid transparent',
                boxShadow: active ? '0 0 15px var(--accent-glow)' : 'none',
            }}
            onMouseEnter={(e) => {
                if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-primary)';
                }
            }}
            onMouseLeave={(e) => {
                if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                }
            }}
        >
            {/* Active state glowing vertical tubelight pill */}
            {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-blue-500 shadow-[0_0_8px_var(--accent),0_0_15px_var(--accent)]" />
            )}
            
            <div className={`flex items-center justify-center shrink-0 ${collapsed ? 'w-full' : ''}`}>
                <Icon size={18} className={active ? 'drop-shadow-[0_0_5px_var(--accent-glow)]' : ''} />
            </div>

            <span className={`tracking-wide whitespace-nowrap transition-all duration-300 origin-left ${collapsed ? 'opacity-0 w-0 scale-90 ml-0 pointer-events-none' : 'opacity-100 w-auto scale-100 ml-3'}`}>
                {label}
            </span>
            
            {active && !collapsed && (
                <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_var(--accent)] animate-pulse" />
            )}

            {/* Custom Glassmorphic Tooltip when collapsed */}
            {collapsed && (
                <div 
                    className="absolute left-[64px] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 pointer-events-none transition-all duration-200 z-[100]"
                    style={{
                        background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25), 0 0 10px var(--accent-glow)',
                        color: 'var(--text-primary)',
                        backdropFilter: 'blur(10px)',
                    }}
                >
                    {label}
                </div>
            )}
        </button>
    );
};

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
    const [isPinned, setIsPinned] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize pin state from localStorage
    useEffect(() => {
        const pinned = localStorage.getItem('sidebar-pinned') === 'true';
        setIsPinned(pinned);
        if (pinned) {
            setSidebarOpen(true);
        } else {
            setSidebarOpen(false);
        }
    }, [setSidebarOpen]);

    const togglePin = (e: React.MouseEvent) => {
        e.stopPropagation();
        const next = !isPinned;
        setIsPinned(next);
        localStorage.setItem('sidebar-pinned', String(next));
        if (next) {
            setSidebarOpen(true);
        }
    };

    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setSidebarOpen(true);
    };

    const handleMouseLeave = () => {
        if (isPinned) return;
        timeoutRef.current = setTimeout(() => {
            setSidebarOpen(false);
        }, 350);
    };

    const handleLinkClick = (view: string) => {
        setCurrentView(view);
        // Auto-close on click if not pinned
        if (!isPinned) {
            setSidebarOpen(false);
        }
    };

    // Styling configuration matching Apple glassmorphism
    const glassStyles: React.CSSProperties = {
        background: isDark 
            ? 'rgba(10, 14, 26, 0.45)' 
            : 'rgba(245, 240, 232, 0.65)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: isDark 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 30px rgba(59, 130, 246, 0.15)' 
            : '0 20px 40px -12px rgba(0, 0, 0, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 0 15px rgba(59, 130, 246, 0.08)',
    };

    const isOpen = isSidebarOpen || isPinned;

    return (
        <>
            {/* 1. Left-Edge Hover Detection Zone - wider for smoother UX */}
            {!isOpen && (
                <div 
                    className="fixed left-0 top-0 w-6 h-full z-[98] bg-transparent cursor-pointer"
                    onMouseEnter={handleMouseEnter}
                />
            )}

            {/* 2. Visual Neon Tubelight edge indicator when closed */}
            {!isOpen && (
                <div 
                    className="fixed left-1.5 top-1/2 -translate-y-1/2 w-1 h-20 rounded-full z-[97] pointer-events-none transition-all duration-500 opacity-60 hover:opacity-100 animate-pulse"
                    style={{
                        background: 'var(--accent)',
                        boxShadow: '0 0 10px var(--accent), 0 0 20px var(--accent-glow)'
                    }}
                />
            )}

            {/* 3. Floating Sidebar Container */}
            <aside
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="fixed top-[5vh] h-[90vh] z-[99] rounded-[2.25rem] flex flex-col justify-between p-3.5 transition-all duration-500 ease-out"
                style={{
                    ...glassStyles,
                    transform: isOpen ? 'translateX(0) scale(1)' : 'translateX(-120%) scale(0.95)',
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none',
                    left: '1.25rem',
                    width: isPinned ? '256px' : '76px',
                    overflow: 'visible' /* Prevent tooltip clipping */
                }}
            >
                {/* Neon Light Strip inside the sidebar container representing a tubelight */}
                <div 
                    className="absolute right-0 top-[10%] w-[1.5px] h-[80%] bg-gradient-to-b from-transparent via-blue-500/70 to-transparent blur-[0.5px] opacity-60 pointer-events-none"
                    style={{
                        boxShadow: '0 0 8px var(--accent), 0 0 15px var(--accent)'
                    }}
                />

                {/* Header */}
                <div 
                    className={`p-1.5 flex transition-all duration-300 ${!isPinned ? 'flex-col items-center gap-4' : 'items-center justify-between w-full'}`} 
                    style={{ borderBottom: '1px solid var(--border-secondary)' }}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-blue-500/10 shadow-[0_0_10px_var(--accent-glow)] border border-blue-500/20 shrink-0">
                            <span className="text-blue-400 font-bold text-sm">P</span>
                        </div>
                        <h1 className={`font-display font-bold text-lg tracking-tight gradient-text transition-all duration-300 origin-left ${!isPinned ? 'opacity-0 w-0 scale-90 pointer-events-none' : 'opacity-100 w-auto scale-100'}`}>
                            Produchive
                        </h1>
                    </div>

                    {/* Pin button */}
                    <button
                        onClick={togglePin}
                        title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                        className={`p-2 rounded-xl transition-all duration-300 hover:bg-slate-500/10 shrink-0`}
                        style={{
                            background: isPinned ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                            color: isPinned ? 'var(--accent)' : 'var(--text-muted)'
                        }}
                    >
                        {isPinned ? <PinOff size={16} /> : <Pin size={16} className="rotate-45" />}
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-0.5 py-6 space-y-2" style={{ overflow: 'visible' }}>
                    <SidebarLink
                        icon={LayoutDashboard}
                        label="Dashboard"
                        active={currentView === 'dashboard'}
                        onClick={() => handleLinkClick('dashboard')}
                        collapsed={!isPinned}
                    />
                    <SidebarLink
                        icon={BarChart3}
                        label="Analytics"
                        active={currentView === 'analytics'}
                        onClick={() => handleLinkClick('analytics')}
                        collapsed={!isPinned}
                    />
                    <SidebarLink
                        icon={Calendar}
                        label="Routine"
                        active={currentView === 'routine' || currentView === 'monitor'}
                        onClick={() => handleLinkClick('routine')}
                        collapsed={!isPinned}
                    />
                    <SidebarLink
                        icon={Brain}
                        label="AI Insights"
                        active={currentView === 'ai'}
                        onClick={() => handleLinkClick('ai')}
                        collapsed={!isPinned}
                    />
                    {/* Focus Rooms Section */}
                    <div className="mt-4 pt-4 border-t border-slate-500/10" style={{ overflow: 'visible' }}>
                        <SidebarLink
                            icon={Coffee}
                            label="Focus Rooms ✦"
                            active={currentView === 'focusroom'}
                            onClick={() => handleLinkClick('focusroom')}
                            collapsed={!isPinned}
                        />
                    </div>
                </nav>

                {/* Bottom Section */}
                <div className="p-0.5 space-y-3" style={{ borderTop: '1px solid var(--border-secondary)', overflow: 'visible' }}>
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        title=""
                        className="w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-300 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-500/10 group relative overflow-visible"
                        style={{
                            color: 'var(--text-secondary)',
                            background: 'transparent',
                        }}
                    >
                        <div className={`flex items-center justify-center shrink-0 ${!isPinned ? 'w-full' : ''}`}>
                            <div className="transition-transform duration-500" style={{ transform: isDark ? 'rotate(0deg)' : 'rotate(360deg)' }}>
                                {isDark ? <Moon size={18} /> : <Sun size={18} />}
                            </div>
                        </div>
                        <span className={`tracking-wide whitespace-nowrap transition-all duration-300 origin-left ${!isPinned ? 'opacity-0 w-0 scale-90 pointer-events-none' : 'opacity-100 w-auto scale-100 ml-3'}`}>
                            {isDark ? 'Dark Mode' : 'Light Mode'}
                        </span>

                        {/* Theme Toggle Tooltip */}
                        {!isPinned && (
                            <div 
                                className="absolute left-[64px] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 pointer-events-none transition-all duration-200 z-[100]"
                                style={{
                                    background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                    border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25), 0 0 10px var(--accent-glow)',
                                    color: 'var(--text-primary)',
                                    backdropFilter: 'blur(10px)',
                                }}
                            >
                                {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            </div>
                        )}
                    </button>

                    {/* AI Status */}
                    {isAIActive && (
                        <div
                            className={`flex items-center rounded-xl animate-fade-in transition-all duration-300 group relative overflow-visible ${!isPinned ? 'justify-center p-2 border-none bg-transparent' : 'gap-2.5 px-3 py-2.5 border border-green-500/15 bg-green-500/10'}`}
                            style={{
                                color: '#4ade80',
                                boxShadow: isPinned ? '0 0 10px rgba(34, 197, 94, 0.05)' : 'none'
                            }}
                        >
                            <div className="relative shrink-0">
                                <Target size={14} />
                                <div className="absolute inset-0 animate-ping opacity-30">
                                    <Target size={14} />
                                </div>
                            </div>
                            <span className={`font-semibold text-xs tracking-wide whitespace-nowrap transition-all duration-300 origin-left ${!isPinned ? 'opacity-0 w-0 scale-90 pointer-events-none' : 'opacity-100 w-auto scale-100 ml-2.5'}`}>
                                AI Engine Active
                            </span>

                            {/* AI Status Tooltip */}
                            {!isPinned && (
                                <div 
                                    className="absolute left-[64px] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 pointer-events-none transition-all duration-200 z-[100]"
                                    style={{
                                        background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                        border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25), 0 0 10px var(--accent-glow)',
                                        color: 'var(--text-primary)',
                                        backdropFilter: 'blur(10px)',
                                    }}
                                >
                                    AI Engine Active
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
};
