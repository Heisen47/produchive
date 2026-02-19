import React, { useState, useEffect } from 'react';
import { Github, Bug, FileQuestionIcon, Ghost } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import Lottie from 'lottie-react';
import catAnimation from '../assets/cat.json';

interface FooterProps {
    isCatEnabled?: boolean;
    toggleCat?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ isCatEnabled = true, toggleCat }) => {
    const repoUrl = 'https://github.com/Heisen47/produchive';
    const issuesUrl = `${repoUrl}/issues`;
    const howToUseItUrl = `${repoUrl}/blob/master/docs/HOW_TO_USE_IT.md`;
    const { isDark } = useTheme();

    const [autoLaunch, setAutoLaunch] = useState(false);

    useEffect(() => {
        (window as any).electronAPI.getAutoLaunch?.()
            .then((enabled: boolean) => setAutoLaunch(enabled))
            .catch(() => {});
    }, []);

    const toggleAutoLaunch = async () => {
        const newValue = !autoLaunch;
        setAutoLaunch(newValue);
        await (window as any).electronAPI.setAutoLaunch(newValue);
    };

    return (
        <footer
            className="py-3 px-4 sm:px-8 mt-auto"
            style={{
                background: 'var(--bg-card)',
                backdropFilter: 'blur(20px)',
                borderTop: '1px solid var(--border-secondary)',
            }}
        >
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-4 order-2 sm:order-1">
                    <span>© {new Date().getFullYear()} Produchive</span>
                    <button
                        onClick={toggleAutoLaunch}
                        className="flex items-center gap-2 transition-colors duration-200"
                        title="Launch Produchive when your computer starts"
                        style={{ color: autoLaunch ? 'var(--accent)' : 'var(--text-muted)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = autoLaunch ? 'var(--accent)' : 'var(--text-muted)'; }}
                    >
                        <div
                            className="relative w-8 h-4 rounded-full transition-colors duration-300"
                            style={{ background: autoLaunch ? 'var(--accent)' : (isDark ? 'rgba(71,85,105,0.5)' : 'rgba(168,162,158,0.4)') }}
                        >
                            <div
                                className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-300 shadow-sm"
                                style={{ transform: autoLaunch ? 'translateX(16px)' : 'translateX(2px)' }}
                            />
                        </div>
                        <span className="hidden sm:inline">Launch at startup</span>
                    </button>
                    
                    {/* Cat Toggle */}
                    {toggleCat && (
                        <button
                            onClick={toggleCat}
                            className="flex items-center gap-2 transition-all duration-200 ml-4 group h-9 px-3 rounded-lg min-w-[140px] justify-center"
                            title={isCatEnabled ? "Disable the cat" : "Bring back the cat"}
                            style={{ 
                                color: 'var(--text-muted)',
                                background: 'transparent',
                                border: '1px solid transparent'
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-secondary)';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = 'transparent';
                                (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                            }}
                        >
                            {!isCatEnabled ? (
                                <div className="flex items-center gap-2 animate-fade-in w-full justify-center">
                                     <div className="w-6 h-6 opacity-50 grayscale group-hover:grayscale-0 transition-all duration-300">
                                        <Lottie animationData={catAnimation} loop={false} />
                                     </div>
                                     <span className="text-xs italic group-hover:text-accent transition-colors whitespace-nowrap">Missing the cat?</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 w-full justify-center">
                                    <Ghost size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                    <span className="text-xs opacity-50 group-hover:opacity-100 transition-opacity whitespace-nowrap">Hide Cat</span>
                                </div>
                            )}
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-3 sm:gap-4 order-1 sm:order-2">
                    {[
                        { href: issuesUrl, icon: Bug, label: 'Report an Issue', shortLabel: 'Issues' },
                        { href: repoUrl, icon: Github, label: 'GitHub', shortLabel: 'GitHub' },
                        { href: howToUseItUrl, icon: FileQuestionIcon, label: 'How to use it?', shortLabel: 'Help' },
                    ].map((link, i) => (
                        <a
                            key={i}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 sm:gap-2 transition-all duration-200"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                        >
                            <link.icon size={14} className="sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">{link.label}</span>
                            <span className="xs:hidden">{link.shortLabel}</span>
                        </a>
                    ))}
                </div>
            </div>
        </footer>
    );
};
