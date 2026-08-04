import { useState, useEffect, useRef, useCallback } from 'react';

export type TimerMode = 'stopwatch' | 'pomodoro';
export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroConfig {
    focusDurationSec: number;     // default 25 * 60 = 1500
    shortBreakDurationSec: number; // default 5 * 60 = 300
    longBreakDurationSec: number;  // default 15 * 60 = 900
    cyclesBeforeLongBreak: number; // default 4
}

const DEFAULT_CONFIG: PomodoroConfig = {
    focusDurationSec: 25 * 60,
    shortBreakDurationSec: 5 * 60,
    longBreakDurationSec: 15 * 60,
    cyclesBeforeLongBreak: 4,
};

// Web Audio API chime synthesis for phase transition
const playPhaseChime = (phase: PomodoroPhase) => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = phase === 'focus' ? 'sine' : 'triangle';
        const freq = phase === 'focus' ? 523.25 : phase === 'shortBreak' ? 659.25 : 783.99; // C5, E5, G5
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 1.2);
    } catch (err) {
        console.warn('Audio chime unsupported:', err);
    }
};

export const usePomodoroTimer = (
    config: Partial<PomodoroConfig> = {}
) => {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    const [mode, setMode] = useState<TimerMode>('stopwatch');
    const [phase, setPhase] = useState<PomodoroPhase>('focus');
    const [completedCycles, setCompletedCycles] = useState(0);

    // Stopwatch counter (counts up)
    const [stopwatchSec, setStopwatchSec] = useState(0);

    // Pomodoro countdown (counts down)
    const [pomodoroSec, setPomodoroSec] = useState(cfg.focusDurationSec);

    const [isPaused, setIsPaused] = useState(false);

    // Timer tick interval
    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            if (mode === 'stopwatch') {
                setStopwatchSec(s => s + 1);
            } else {
                setPomodoroSec(sec => {
                    if (sec <= 1) {
                        // Phase finished!
                        handlePhaseComplete();
                        return 0;
                    }
                    return sec - 1;
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isPaused, mode, phase, completedCycles]);

    const handlePhaseComplete = useCallback(() => {
        const startedAt = new Date().toISOString();
        const durationSec = phase === 'focus' ? cfg.focusDurationSec : phase === 'shortBreak' ? cfg.shortBreakDurationSec : cfg.longBreakDurationSec;

        // Persist session to local system database
        if (window.electronAPI?.savePomodoroSession) {
            window.electronAPI.savePomodoroSession({
                phase,
                durationSeconds: durationSec,
                cycleNumber: completedCycles + 1,
                startedAt,
            }).catch((err: any) => console.error('[PomodoroDB] Error saving session:', err));
        }

        if (phase === 'focus') {
            const nextCycle = completedCycles + 1;
            setCompletedCycles(nextCycle);

            if (nextCycle % cfg.cyclesBeforeLongBreak === 0) {
                setPhase('longBreak');
                setPomodoroSec(cfg.longBreakDurationSec);
                playPhaseChime('longBreak');
            } else {
                setPhase('shortBreak');
                setPomodoroSec(cfg.shortBreakDurationSec);
                playPhaseChime('shortBreak');
            }
        } else {
            // Break finished -> back to focus
            setPhase('focus');
            setPomodoroSec(cfg.focusDurationSec);
            playPhaseChime('focus');
        }
    }, [phase, completedCycles, cfg]);

    const switchTimerMode = useCallback((newMode: TimerMode) => {
        setMode(newMode);
        if (newMode === 'pomodoro') {
            setPhase('focus');
            setPomodoroSec(cfg.focusDurationSec);
        }
    }, [cfg]);

    const skipPhase = useCallback(() => {
        handlePhaseComplete();
    }, [handlePhaseComplete]);

    const resetPomodoro = useCallback(() => {
        setPhase('focus');
        setCompletedCycles(0);
        setPomodoroSec(cfg.focusDurationSec);
    }, [cfg]);

    const togglePause = useCallback(() => {
        setIsPaused(prev => !prev);
    }, []);

    // Format display time
    const displaySeconds = mode === 'stopwatch' ? stopwatchSec : pomodoroSec;

    const formatTime = (totalSec: number) => {
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        const mm = String(mins).padStart(2, '0');
        const ss = String(secs).padStart(2, '0');
        if (hrs > 0) {
            const hh = String(hrs).padStart(2, '0');
            return `${hh}:${mm}:${ss}`;
        }
        return `${mm}:${ss}`;
    };

    return {
        mode,
        phase,
        completedCycles,
        totalCycles: cfg.cyclesBeforeLongBreak,
        displaySeconds,
        formattedTime: formatTime(displaySeconds),
        isPaused,
        togglePause,
        switchTimerMode,
        skipPhase,
        resetPomodoro,
    };
};
