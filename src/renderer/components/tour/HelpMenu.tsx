import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle, Compass, MapPin, BookOpen, ExternalLink } from 'lucide-react';
import { MAIN_TOUR, PAGE_TOURS, type TourView } from '../../lib/tour/tourManifest';
import { useTour } from '../../lib/tour/tourStore';

interface HelpMenuProps {
    currentView?: string;
    /** Opens the written guide in the browser. */
    onOpenGuide?: () => void;
}

const pageTourFor = (view?: string) => {
    if (!view) return undefined;
    const key = (view === 'monitor' ? 'routine' : view) as TourView;
    return PAGE_TOURS[key];
};

/** Footer "Help" button: replay the tour, tour the current page, or read the guide. */
export const HelpMenu: React.FC<HelpMenuProps> = ({ currentView, onOpenGuide }) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const firstItemRef = useRef<HTMLButtonElement>(null);
    const start = useTour((s) => s.start);
    const pageTour = pageTourFor(currentView);

    useEffect(() => {
        if (!open) return;
        firstItemRef.current?.focus();
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const itemClass = 'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium transition-colors cursor-pointer hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400';

    return (
        <div ref={rootRef} className="relative" data-tour="help-menu">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-haspopup="menu"
                className="flex items-center gap-1.5 sm:gap-2 transition-colors duration-200 cursor-pointer"
                style={{ color: open ? 'var(--accent)' : 'var(--text-muted)' }}
                title="Help and guided tours"
            >
                <HelpCircle size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Help</span>
            </button>

            {open && (
                <div
                    role="menu"
                    aria-label="Help"
                    className="absolute bottom-full right-0 mb-2 w-56 rounded-xl p-1.5 z-50 animate-fade-in"
                    style={{
                        background: 'var(--bg-card-solid)',
                        border: '1px solid var(--border-secondary)',
                        boxShadow: 'var(--shadow-card)',
                        color: 'var(--text-primary)',
                    }}
                >
                    <button
                        ref={firstItemRef}
                        role="menuitem"
                        type="button"
                        className={itemClass}
                        onClick={() => { setOpen(false); start(MAIN_TOUR, 'replay'); }}
                    >
                        <Compass size={14} className="text-indigo-400 shrink-0" />
                        Take the tour
                    </button>
                    {pageTour && (
                        <button
                            role="menuitem"
                            type="button"
                            className={itemClass}
                            onClick={() => { setOpen(false); start(pageTour, 'replay'); }}
                        >
                            <MapPin size={14} className="text-indigo-400 shrink-0" />
                            Tour this page
                        </button>
                    )}
                    {onOpenGuide && (
                        <button
                            role="menuitem"
                            type="button"
                            className={itemClass}
                            onClick={() => { setOpen(false); onOpenGuide(); }}
                        >
                            <BookOpen size={14} className="text-indigo-400 shrink-0" />
                            <span className="flex-1">Read the guide</span>
                            <ExternalLink size={11} style={{ color: 'var(--text-muted)' }} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
