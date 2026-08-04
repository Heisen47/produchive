import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { useTheme } from './ThemeProvider';
import {
    Maximize2, Pause, Play, Copy, Check, X, Users, Crown, Sparkles, ExternalLink
} from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { ClassroomEnv } from './focus-room/ClassroomEnv';
import { CafeEnv } from './focus-room/CafeEnv';
import { LibraryEnv } from './focus-room/LibraryEnv';
import { SceneId, fmtHMS } from './focus-room/Shared3D';
import { apiClient } from '../lib/api';
import { usePomodoroTimer } from '../lib/usePomodoroTimer';

interface StudyRoomMiniPlayerProps {
    onNavigate: (view: string) => void;
}

export const StudyRoomMiniPlayer: React.FC<StudyRoomMiniPlayerProps> = ({ onNavigate }) => {
    const { isDark } = useTheme();
    const isPremium = useStore(state => state.isPremium);
    const activeRoomSession = useStore(state => state.activeRoomSession);
    const isPiPActive = useStore(state => state.isPiPActive);
    const setIsPiPActive = useStore(state => state.setIsPiPActive);
    const leaveActiveRoomSession = useStore(state => state.leaveActiveRoomSession);

    const [copied, setCopied] = useState(false);
    const [isNativePiP, setIsNativePiP] = useState(false);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    if (!activeRoomSession || !isPiPActive) {
        return null;
    }

    const { joinCode, scene, occupants = [], socket, isPaused } = activeRoomSession;

    // Calculate max study time among occupants for display
    const maxStudySeconds = occupants.reduce((max, occ) => Math.max(max, occ.elapsedSeconds || 0), 0);

    const handleExpand = () => {
        setIsPiPActive(false);
        onNavigate('focusroom');
    };

    const handleTogglePause = () => {
        const nextPaused = !isPaused;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'room:pause',
                payload: { paused: nextPaused }
            }));
        }
    };

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(joinCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy join code:', err);
        }
    };

    const handleLeave = async () => {
        try {
            await apiClient.leaveRoom(joinCode);
        } catch (err) {
            console.error('Error leaving room:', err);
        }
        leaveActiveRoomSession();
    };

    // Native OS Picture-in-Picture streaming using Canvas captureStream
    const handleNativePiP = async () => {
        try {
            const canvasEl = canvasContainerRef.current?.querySelector('canvas');
            if (!canvasEl) {
                alert('3D viewport loading. Please try native PiP in a moment.');
                return;
            }

            // Capture stream from canvas
            const stream = (canvasEl as any).captureStream(30);
            if (!videoRef.current) {
                const vid = document.createElement('video');
                vid.autoplay = true;
                vid.muted = true;
                vid.srcObject = stream;
                vid.style.display = 'none';
                document.body.appendChild(vid);
                (videoRef as any).current = vid;
            } else {
                videoRef.current.srcObject = stream;
            }

            await videoRef.current.play();
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                setIsNativePiP(false);
            } else if (videoRef.current.requestPictureInPicture) {
                await videoRef.current.requestPictureInPicture();
                setIsNativePiP(true);
                videoRef.current.addEventListener('leavepictureinpicture', () => {
                    setIsNativePiP(false);
                }, { once: true });
            }
        } catch (err: any) {
            console.error('Failed to launch OS Picture-in-Picture:', err);
            alert(`Native OS PiP error: ${err.message || 'Not supported in this browser environment'}`);
        }
    };

    const render3DScene = () => {
        const sceneId: SceneId = (scene === 'school' ? 'classroom' : scene) || 'classroom';

        return (
            <Canvas
                camera={{ position: [0, 5, 10], fov: 45 }}
                style={{ width: '100%', height: '100%', borderRadius: 12, background: '#0a0e1a' }}
                gl={{ preserveDrawingBuffer: true }}
            >
                <ambientLight intensity={0.7} />
                <directionalLight position={[10, 15, 10]} intensity={1.2} />
                <OrbitControls autoRotate autoRotateSpeed={0.8} enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.2} />
                <Environment preset="city" />

                {sceneId === 'classroom' && <ClassroomEnv occupants={occupants} accent="#14b8a6" />}
                {sceneId === 'cafe' && <CafeEnv occupants={occupants} accent="#f59e0b" />}
                {sceneId === 'library' && <LibraryEnv occupants={occupants} accent="#a78bfa" />}
            </Canvas>
        );
    };

    return (
        <div
            className="fixed bottom-6 right-6 z-50 animate-fade-in transition-all duration-300"
            style={{
                width: 340,
                height: 230,
                borderRadius: 20,
                background: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(167, 139, 250, 0.4)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 20px rgba(167, 139, 250, 0.25)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}
        >
            {/* Header bar */}
            <div
                className="px-3.5 py-2 flex items-center justify-between border-b"
                style={{
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                    background: 'linear-gradient(90deg, rgba(167,139,250,0.12), transparent)'
                }}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <div className="relative flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <div className="absolute w-3.5 h-3.5 rounded-full bg-green-400/40 animate-ping" />
                    </div>
                    <span className="font-mono text-xs font-bold tracking-wider text-purple-400 truncate">
                        {joinCode}
                    </span>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-500/10 text-[10px] font-semibold text-purple-300 border border-purple-500/20">
                        <Users size={10} />
                        <span>{occupants.length}</span>
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                        <Crown size={10} />
                        <span>P2P PiP</span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={handleExpand}
                        title="Expand to Full Room"
                        className="p-1 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                    >
                        <Maximize2 size={14} />
                    </button>
                    <button
                        onClick={handleLeave}
                        title="Leave Room"
                        className="p-1 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Viewport 3D Canvas */}
            <div className="flex-1 relative overflow-hidden" ref={canvasContainerRef}>
                {render3DScene()}

                {/* Focus Timer & Pomodoro Overlay */}
                {(() => {
                    const pomodoro = usePomodoroTimer();
                    const isPomo = pomodoro.mode === 'pomodoro';
                    return (
                        <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-white font-mono text-xs font-bold shadow-lg">
                            <div className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-amber-400' : isPomo ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
                            <span>{isPomo ? `${pomodoro.phase === 'focus' ? '🍅' : '☕'} ${pomodoro.formattedTime}` : fmtHMS(maxStudySeconds)}</span>
                        </div>
                    );
                })()}
            </div>

            {/* Bottom Controls Bar (YouTube Style Miniplayer Controls) */}
            <div
                className="px-3 py-2 flex items-center justify-between border-t"
                style={{
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                    background: isDark ? 'rgba(10, 14, 26, 0.7)' : 'rgba(240, 240, 245, 0.8)'
                }}
            >
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={handleTogglePause}
                        className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-all active:scale-95 cursor-pointer flex items-center gap-1 text-xs font-medium"
                        title={isPaused ? "Resume Focus Timer" : "Pause Focus Timer"}
                    >
                        {isPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
                        <span>{isPaused ? 'Resume' : 'Pause'}</span>
                    </button>

                    <button
                        onClick={handleCopyCode}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all active:scale-95 cursor-pointer flex items-center gap-1 text-xs"
                        title="Copy Room Code"
                    >
                        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span className={copied ? 'text-emerald-400 font-semibold' : ''}>{copied ? 'Copied!' : 'Code'}</span>
                    </button>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={handleNativePiP}
                        className={`p-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer flex items-center gap-1 text-xs font-medium ${
                            isNativePiP
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border-indigo-500/30'
                        }`}
                        title="Pop out into native OS floating Picture-in-Picture window"
                    >
                        <ExternalLink size={12} />
                        <span>{isNativePiP ? 'OS PiP Active' : 'OS PiP'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
