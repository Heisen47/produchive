import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Lottie from 'lottie-react';
import catAnimation from '../assets/cat.json';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';
import { Sparkles, Check, X, Brain } from 'lucide-react';

type Side = 'top' | 'bottom' | 'left' | 'right';

interface CatPosition {
    side: Side;
    offset: number; // Percentage 0-100 along the edge
}

interface PeekabooCatProps {
    isSidebarOpen: boolean;
    onNavigate?: (view: string) => void;
}

export const PeekabooCat: React.FC<PeekabooCatProps> = ({ isSidebarOpen, onNavigate }) => {
    const goals = useStore(state => state.goals);
    const addTask = useStore(state => state.addTask);
    const isSpacedReviewScheduled = useStore(state => state.isSpacedReviewScheduled);
    const setSpacedReviewScheduled = useStore(state => state.setSpacedReviewScheduled);
    const { isDark } = useTheme();

    const [isVisible, setIsVisible] = useState(false);
    const [showBubble, setShowBubble] = useState(false);
    const [scheduledMsg, setScheduledMsg] = useState(false);
    const [position, setPosition] = useState<CatPosition>({ side: 'bottom', offset: 70 });
    const [rotation, setRotation] = useState(0);

    const activeGoal = goals.length > 0 ? goals[0] : 'LeetCode & Study Practice';

    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

    const triggerCat = useCallback(() => {
        // If user already scheduled 3-day review, do not auto pop up
        if (isSpacedReviewScheduled) return;

        // Position at bottom right edge for assistant suggestions
        const side: Side = 'bottom';
        const offset = 80; // Bottom-right area

        setPosition({ side, offset });
        setRotation(0);
        
        requestAnimationFrame(() => {
            setIsVisible(true);
            setTimeout(() => {
                setShowBubble(true);
            }, 300);
        });

        // Hide after 25 seconds (longer window for interaction)
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
            setShowBubble(false);
            setTimeout(() => {
                setIsVisible(false);
            }, 500);
        }, 25000); 
    }, [isSpacedReviewScheduled]);

    useEffect(() => {
        if (isSpacedReviewScheduled) return;

        // Initial delay
        const initialTimer = setTimeout(triggerCat, 3000);

        // Loop every 45 seconds for subtle assistant pops
        const interval = setInterval(() => {
            triggerCat();
        }, 45000);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, [triggerCat, isSpacedReviewScheduled]);

    const handleScheduleReview = async () => {
        const taskText = `3-Day Review: ${activeGoal} (Scientific Spaced Repetition)`;

        // Mark as scheduled so it won't pop up again
        setSpacedReviewScheduled(true);

        try {
            await addTask(taskText);
        } catch (err) {
            console.warn('[PeekabooCat] addTask store error:', err);
            // Fallback: update store tasks array directly so task appears in UI
            const newTask = {
                id: crypto.randomUUID(),
                text: taskText,
                completed: false,
                created: Date.now(),
                createdAt: new Date().toLocaleString(),
            };
            useStore.setState(state => ({ tasks: [...(state.tasks || []), newTask] }));
        }

        if (window.electronAPI?.saveSpacedRepetition) {
            try {
                await window.electronAPI.saveSpacedRepetition({
                    topic: activeGoal,
                    title: taskText,
                    daysDelay: 3.5
                });
            } catch (err) {
                console.warn('[PeekabooCat] saveSpacedRepetition IPC error:', err);
            }
        }

        setScheduledMsg(true);

        // Redirect user to Analytics page after short success callout
        setTimeout(() => {
            setShowBubble(false);
            setIsVisible(false);
            setScheduledMsg(false);
            if (onNavigate) {
                onNavigate('analytics');
            }
        }, 1200);
    };

    const sidebarWidth = isSidebarOpen ? 100 : 0; 

    const getStyles = (): React.CSSProperties => {
        const base: React.CSSProperties = {
            position: 'fixed',
            zIndex: 9999,
            transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            width: '120px',
            height: '120px',
            pointerEvents: 'auto',
            willChange: 'transform',
        };

        return {
            ...base,
            bottom: 0,
            left: `${position.offset}%`,
            transform: `translate(-50%, ${isVisible ? '0%' : '100%'})`,
        };
    };

    const handleHoverOrClickCat = () => {
        if (!isVisible) {
            setIsVisible(true);
        }
        setShowBubble(true);
        // Reset timer when hovered/clicked so it stays visible while interacting
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
            setShowBubble(false);
            setTimeout(() => {
                setIsVisible(false);
            }, 500);
        }, 25000);
    };

    return createPortal(
        <div 
            style={getStyles()} 
            className="relative cursor-pointer group"
            onMouseEnter={handleHoverOrClickCat}
            onClick={handleHoverOrClickCat}
        >
            {/* Assistant Cat Speech Bubble (Directly above cat) */}
            {showBubble && (
                <div
                    className="absolute bottom-[105px] -left-36 w-72 p-3.5 rounded-2xl shadow-2xl border text-xs animate-fade-in z-50 pointer-events-auto"
                    style={{
                        background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                        borderColor: isDark ? 'rgba(168, 85, 247, 0.4)' : 'rgba(168, 85, 247, 0.3)',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        backdropFilter: 'blur(16px)',
                        boxShadow: isDark 
                            ? '0 10px 30px rgba(0,0,0,0.6), 0 0 15px rgba(168, 85, 247, 0.25)'
                            : '0 10px 30px rgba(0,0,0,0.15), 0 0 15px rgba(168, 85, 247, 0.15)'
                    }}
                >
                    {/* Tail bubble triangle pointing directly down to cat */}
                    <div
                        className="absolute -bottom-2 left-[180px] w-4 h-4 rotate-45 border-r border-b"
                        style={{
                            background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                            borderColor: isDark ? 'rgba(168, 85, 247, 0.4)' : 'rgba(168, 85, 247, 0.3)'
                        }}
                    />

                    <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-purple-400 text-[11px]">
                            <Brain size={13} className="text-purple-400" />
                            <span>Assistant Suggestion</span>
                        </div>
                        <button
                            onClick={() => setShowBubble(false)}
                            className="text-gray-400 hover:text-gray-200 transition-colors p-0.5 cursor-pointer"
                        >
                            <X size={12} />
                        </button>
                    </div>

                    {scheduledMsg ? (
                        <div className="flex items-center gap-2 text-emerald-500 font-bold py-1">
                            <Check size={16} />
                            <span>Scheduled 3-day review for "{activeGoal}"! 🎯</span>
                        </div>
                    ) : (
                        <>
                            <p className="text-[11px] leading-relaxed opacity-90 mb-2.5" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>
                                🧠 <strong>Scientific Tip:</strong> Reviewing topics like <strong>"{activeGoal}"</strong> 3–4 days after studying is the scientifically proven way to lock knowledge into long-term memory!
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleScheduleReview}
                                    className="flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-1 shadow-md"
                                    style={{
                                        background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
                                        color: '#fff'
                                    }}
                                >
                                    <Sparkles size={10} />
                                    <span>Schedule 3-Day Review</span>
                                </button>
                                <button
                                    onClick={() => setShowBubble(false)}
                                    className="py-1.5 px-2.5 rounded-lg text-[10px] font-semibold opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                                    style={{
                                        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                        color: isDark ? '#fff' : '#0f172a'
                                    }}
                                >
                                    Later
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            <Lottie 
                animationData={catAnimation} 
                loop={true}
                style={{ width: '100%', height: '100%' }}
            />
        </div>,
        document.body
    );
};
