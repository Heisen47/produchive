import React, { useState, useEffect } from 'react';
import { Github, Bug, FileQuestionIcon } from 'lucide-react';

export const Footer: React.FC = () => {
    const repoUrl = 'https://github.com/Heisen47/produchive';
    const issuesUrl = `${repoUrl}/issues`;
    const howToUseItUrl = `${repoUrl}/blob/master/docs/HOW_TO_USE_IT.md`;

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
        <footer className="border-t border-gray-800 bg-gray-1000/80 backdrop-blur-sm py-4 px-4 sm:px-8 mt-auto">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-gray-400">
                <div className="flex items-center gap-4 order-2 sm:order-1">
                    <span>© {new Date().getFullYear()} Produchive</span>
                    <button
                        onClick={toggleAutoLaunch}
                        className="flex items-center gap-2 hover:text-gray-200 transition-colors"
                        title="Launch Produchive when your computer starts"
                    >
                        <div className={`relative w-8 h-4 rounded-full transition-colors ${autoLaunch ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${autoLaunch ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                        <span className="hidden sm:inline">Launch at startup</span>
                    </button>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 order-1 sm:order-2">
                    <a
                        href={issuesUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 sm:gap-2 hover:text-blue-400 transition-colors"
                    >
                        <Bug size={14} className="sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Report an Issue</span>
                        <span className="xs:hidden">Issues</span>
                    </a>
                    <a
                        href={repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 sm:gap-2 hover:text-white transition-colors"
                    >
                        <Github size={14} className="sm:w-4 sm:h-4" />
                        GitHub
                    </a>
                     <a
                        href={howToUseItUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 sm:gap-2 hover:text-white transition-colors"
                    >
                        <FileQuestionIcon size={14} className="sm:w-4 sm:h-4" />
                        How to use it?
                    </a>
                </div>
            </div>
        </footer>
    );
};

