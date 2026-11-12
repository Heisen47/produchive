import React, { useCallback, useEffect, useState } from 'react';
import { Star, X } from 'lucide-react';
import { useTheme } from './ThemeProvider';

/** Fired by FocusRoom after a focus session has been saved. */
export const FOCUS_SESSION_SAVED_EVENT = 'produchive:focus-session-saved';

const LAUNCH_CHECK_DELAY_MS = 60_000;

/**
 * Small card asking Microsoft Store users to rate the app. The main process
 * decides when it may appear (Store installs only, after real use, at most twice).
 */
export const StoreReviewPrompt: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const { isDark } = useTheme();

    const check = useCallback(async () => {
        try {
            const show = await window.electronAPI?.storeReviewCheck?.();
            if (show) setVisible(true);
        } catch (e) {
            console.error('[store-review] check failed', e);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(check, LAUNCH_CHECK_DELAY_MS);
        const onSessionSaved = () => window.setTimeout(check, 1500);
        window.addEventListener(FOCUS_SESSION_SAVED_EVENT, onSessionSaved);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener(FOCUS_SESSION_SAVED_EVENT, onSessionSaved);
        };
    }, [check]);

    const respond = async (action: 'rate' | 'later' | 'never') => {
        setVisible(false);
        try {
            await window.electronAPI?.storeReviewRespond?.(action);
        } catch (e) {
            console.error('[store-review] respond failed', e);
        }
    };

    if (!visible) return null;

    return (
        <div
            role="dialog"
            aria-labelledby="store-review-title"
            className="fixed bottom-6 right-6 z-50 w-[340px] max-w-[calc(100vw-3rem)] rounded-2xl p-5 shadow-2xl"
            style={{
                background: isDark ? 'rgba(17, 24, 39, 0.96)' : 'rgba(255, 252, 246, 0.98)',
                border: '1px solid var(--border-secondary)',
                backdropFilter: 'blur(20px)',
            }}
        >
            <button
                onClick={() => respond('later')}
                aria-label="Close"
                className="absolute top-3 right-3 p-1 rounded-md opacity-60 hover:opacity-100"
                style={{ color: 'var(--text-secondary)' }}
            >
                <X size={16} />
            </button>

            <div className="flex items-center gap-1 mb-3" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} size={18} fill="#f5b301" color="#f5b301" />
                ))}
            </div>

            <h3 id="store-review-title" className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                Enjoying Produchive?
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                A quick rating on the Microsoft Store helps other people find the app. It takes a few seconds.
            </p>

            <div className="flex flex-col gap-2">
                <button
                    onClick={() => respond('rate')}
                    className="w-full py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ background: 'var(--accent)' }}
                >
                    Rate on Microsoft Store
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={() => respond('later')}
                        className="flex-1 py-2 rounded-lg text-sm"
                        style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-secondary)' }}
                    >
                        Maybe later
                    </button>
                    <button
                        onClick={() => respond('never')}
                        className="flex-1 py-2 rounded-lg text-sm"
                        style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-secondary)' }}
                    >
                        No thanks
                    </button>
                </div>
            </div>
        </div>
    );
};
