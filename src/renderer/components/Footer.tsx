import React from 'react';
import { Github, Bug, FileQuestionIcon } from 'lucide-react';

export const Footer: React.FC = () => {
    const repoUrl = 'https://github.com/Heisen47/produchive';
    const issuesUrl = `${repoUrl}/issues`;
    const howToUseItUrl = `${repoUrl}/blob/main/docs/HOW_TO_USE_IT.md`;

    return (
        <footer className="border-t border-gray-800 bg-gray-1000/80 backdrop-blur-sm py-4 px-4 sm:px-8 mt-auto">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-gray-400">
                <span className="order-2 sm:order-1">© {new Date().getFullYear()} Produchive</span>
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
