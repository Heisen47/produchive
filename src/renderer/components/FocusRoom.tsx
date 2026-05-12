import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ArrowLeft, Maximize2, Minimize2, Lock, Unlock, Pause, Play, Eye, Users, Zap, BookOpen, Coffee, GraduationCap, ChevronDown, Sparkles as SparklesIcon } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useStore } from '../lib/store';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { SceneId, Occupant, SCENE_META, fmtHMS, GhibliMaterial, NPC_NAMES } from './focus-room/Shared3D';
import { ClassroomEnv } from './focus-room/ClassroomEnv';
import { CafeEnv } from './focus-room/CafeEnv';
import { LibraryEnv } from './focus-room/LibraryEnv';

// ─── Scene preview SVGs (inline, no external assets needed) ──────────────────
const SCENE_PREVIEWS: Record<SceneId, string> = {
  classroom: `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140">
  <rect width="220" height="140" fill="#0d9488"/>
  <rect x="0" y="0" width="220" height="100" fill="#0f766e"/>
  <rect x="0" y="100" width="220" height="40" fill="#065f46"/>
  <rect x="40" y="12" width="140" height="52" rx="3" fill="#064e3b"/>
  <rect x="44" y="16" width="132" height="44" rx="2" fill="#065f46"/>
  <line x1="55" y1="30" x2="155" y2="30" stroke="#a7f3d0" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
  <line x1="55" y1="40" x2="130" y2="40" stroke="#a7f3d0" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
  <line x1="55" y1="50" x2="145" y2="50" stroke="#a7f3d0" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  <rect x="20"  y="78" width="36" height="18" rx="2" fill="#14b8a6"/>
  <rect x="92"  y="78" width="36" height="18" rx="2" fill="#14b8a6"/>
  <rect x="164" y="78" width="36" height="18" rx="2" fill="#14b8a6"/>
  <rect x="24"  y="96" width="3" height="8" fill="#0d9488"/>
  <rect x="49"  y="96" width="3" height="8" fill="#0d9488"/>
  <rect x="96"  y="96" width="3" height="8" fill="#0d9488"/>
  <rect x="121" y="96" width="3" height="8" fill="#0d9488"/>
  <rect x="168" y="96" width="3" height="8" fill="#0d9488"/>
  <rect x="193" y="96" width="3" height="8" fill="#0d9488"/>
  <circle cx="38"  cy="74" r="5" fill="#4ade80"/>
  <circle cx="110" cy="74" r="5" fill="#94a3b8"/>
  <circle cx="182" cy="74" r="5" fill="#94a3b8"/>
  <rect x="26" y="74" width="12" height="7" rx="1" fill="#1e293b"/>
  <rect x="98" y="74" width="12" height="7" rx="1" fill="#1e293b"/>
  <rect x="170" y="74" width="12" height="7" rx="1" fill="#1e293b"/>
  <rect x="4" y="18" width="22" height="30" rx="2" fill="#7dd3fc" opacity="0.6"/>
  <line x1="15" y1="18" x2="15" y2="48" stroke="#0f172a" stroke-width="1"/>
  <line x1="4"  y1="33" x2="26" y2="33" stroke="#0f172a" stroke-width="1"/>
  <rect x="194" y="18" width="22" height="30" rx="2" fill="#7dd3fc" opacity="0.6"/>
  <line x1="205" y1="18" x2="205" y2="48" stroke="#0f172a" stroke-width="1"/>
  <line x1="194" y1="33" x2="216" y2="33" stroke="#0f172a" stroke-width="1"/>
</svg>`)}`,

  cafe: `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140">
  <rect width="220" height="140" fill="#291811"/>
  <rect x="0" y="0" width="220" height="105" fill="#451a03"/>
  <rect x="0" y="105" width="220" height="35" fill="#291811"/>
  <rect x="12" y="14" width="38" height="52" rx="3" fill="#1e3a8a"/>
  <circle cx="22" cy="26" r="6" fill="#fef08a" opacity="0.9"/>
  <line x1="31" y1="14" x2="31" y2="66" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="12" y1="40" x2="50" y2="40" stroke="#0f172a" stroke-width="1.5"/>
  <rect x="170" y="14" width="38" height="52" rx="3" fill="#1e3a8a"/>
  <line x1="189" y1="14" x2="189" y2="66" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="170" y1="40" x2="208" y2="40" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="18" cy="55" r="1" fill="#fef08a"/>
  <circle cx="42" cy="22" r="1" fill="#fef08a"/>
  <circle cx="175" cy="25" r="1" fill="#fef08a"/>
  <circle cx="200" cy="55" r="1" fill="#fef08a"/>
  <rect x="72" y="30" width="16" height="40" rx="1" fill="#92400e"/>
  <rect x="73" y="38" width="14" height="3" fill="#78350f"/>
  <rect x="73" y="50" width="14" height="3" fill="#78350f"/>
  <rect x="74" y="39" width="3" height="8" fill="#b91c1c"/>
  <rect x="78" y="39" width="3" height="9" fill="#1d4ed8"/>
  <rect x="82" y="40" width="3" height="7" fill="#15803d"/>
  <rect x="90"  y="88" width="40" height="14" rx="2" fill="#7f1d1d"/>
  <rect x="155" y="88" width="40" height="14" rx="2" fill="#7f1d1d"/>
  <circle cx="110" cy="72" r="8" fill="#fef08a" opacity="0.25"/>
  <circle cx="110" cy="72" r="4" fill="#fef08a" opacity="0.6"/>
  <circle cx="175" cy="72" r="8" fill="#fef08a" opacity="0.25"/>
  <circle cx="175" cy="72" r="4" fill="#fef08a" opacity="0.6"/>
  <circle cx="110" cy="84" r="5" fill="#f59e0b"/>
  <circle cx="175" cy="84" r="5" fill="#94a3b8"/>
  <rect x="100" y="86" width="5" height="4" rx="1" fill="#f8fafc"/>
  <rect x="165" y="86" width="5" height="4" rx="1" fill="#f8fafc"/>
  <rect x="196" y="96" width="10" height="10" rx="2" fill="#78350f"/>
  <circle cx="201" cy="93" r="7" fill="#166534"/>
</svg>`)}`,

  library: `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140">
  <rect width="220" height="140" fill="#c8956c"/>
  <rect x="0" y="0" width="220" height="105" fill="#d4a574"/>
  <rect x="0" y="105" width="220" height="35" fill="#c8956c"/>
  <rect x="30" y="100" width="160" height="10" rx="2" fill="#b45309" opacity="0.7"/>
  <rect x="0" y="82" width="220" height="8" fill="#c49060"/>
  <rect x="8" y="14" width="30" height="42" rx="2" fill="#fb923c"/>
  <rect x="8" y="14" width="30" height="22" rx="2" fill="#fde68a"/>
  <ellipse cx="23" cy="14" rx="15" ry="8" fill="#fde68a"/>
  <circle cx="28" cy="24" r="5" fill="#fef9c3" opacity="0.9"/>
  <line x1="23" y1="14" x2="23" y2="56" stroke="#78350f" stroke-width="1.2"/>
  <line x1="8"  y1="35" x2="38" y2="35" stroke="#78350f" stroke-width="1.2"/>
  <rect x="95" y="14" width="30" height="42" rx="2" fill="#fb923c"/>
  <rect x="95" y="14" width="30" height="22" rx="2" fill="#fde68a"/>
  <ellipse cx="110" cy="14" rx="15" ry="8" fill="#fde68a"/>
  <line x1="110" y1="14" x2="110" y2="56" stroke="#78350f" stroke-width="1.2"/>
  <line x1="95"  y1="35" x2="125" y2="35" stroke="#78350f" stroke-width="1.2"/>
  <rect x="182" y="14" width="30" height="42" rx="2" fill="#fb923c"/>
  <rect x="182" y="14" width="30" height="22" rx="2" fill="#fde68a"/>
  <ellipse cx="197" cy="14" rx="15" ry="8" fill="#fde68a"/>
  <line x1="197" y1="14" x2="197" y2="56" stroke="#78350f" stroke-width="1.2"/>
  <line x1="182" y1="35" x2="212" y2="35" stroke="#78350f" stroke-width="1.2"/>
  <rect x="0" y="10" width="6" height="72" fill="#92400e"/>
  <rect x="1" y="20" width="4" height="2" fill="#b91c1c"/>
  <rect x="1" y="28" width="4" height="2" fill="#1d4ed8"/>
  <rect x="1" y="36" width="4" height="2" fill="#15803d"/>
  <rect x="1" y="44" width="4" height="2" fill="#d97706"/>
  <rect x="1" y="52" width="4" height="2" fill="#7c3aed"/>
  <rect x="1" y="60" width="4" height="2" fill="#b91c1c"/>
  <rect x="1" y="68" width="4" height="2" fill="#0369a1"/>
  <rect x="214" y="10" width="6" height="72" fill="#92400e"/>
  <rect x="215" y="20" width="4" height="2" fill="#dc2626"/>
  <rect x="215" y="28" width="4" height="2" fill="#2563eb"/>
  <rect x="215" y="36" width="4" height="2" fill="#16a34a"/>
  <rect x="215" y="44" width="4" height="2" fill="#b45309"/>
  <rect x="215" y="52" width="4" height="2" fill="#6d28d9"/>
  <rect x="215" y="60" width="4" height="2" fill="#0891b2"/>
  <rect x="215" y="68" width="4" height="2" fill="#991b1b"/>
  <rect x="42"  y="88" width="44" height="12" rx="2" fill="#b45309"/>
  <rect x="130" y="88" width="44" height="12" rx="2" fill="#b45309"/>
  <circle cx="64"  cy="74" r="10" fill="#fde68a" opacity="0.3"/>
  <circle cx="64"  cy="74" r="5"  fill="#fef08a" opacity="0.7"/>
  <circle cx="152" cy="74" r="10" fill="#fde68a" opacity="0.3"/>
  <circle cx="152" cy="74" r="5"  fill="#fef08a" opacity="0.7"/>
  <circle cx="55"  cy="84" r="5" fill="#a78bfa"/>
  <circle cx="75"  cy="84" r="5" fill="#94a3b8"/>
  <circle cx="143" cy="84" r="5" fill="#94a3b8"/>
  <circle cx="163" cy="84" r="5" fill="#94a3b8"/>
  <rect x="8"  y="56" width="30" height="30" fill="#fde68a" opacity="0.08"/>
  <rect x="95" y="56" width="30" height="30" fill="#fde68a" opacity="0.08"/>
  <rect x="182" y="56" width="30" height="30" fill="#fde68a" opacity="0.08"/>
</svg>`)}`,
};

const Scene3D = ({ occupants, scene, accent }: { occupants: Occupant[], scene: SceneId, accent: string }) => {
  const fogColor = scene === 'classroom' ? '#14b8a6' : scene === 'library' ? '#e8c99a' : '#451a03';
  const floorColor = scene === 'classroom' ? '#0f766e' : scene === 'library' ? '#c8956c' : '#291811';

  let minAz = 0;
  let maxAz = 0;
  if (scene === 'classroom') {
    minAz = -Math.PI / 2 + 0.1;
    maxAz = -0.1;
  } else if (scene === 'cafe') {
    minAz = 0.1;
    maxAz = Math.PI / 2 - 0.1;
  } else if (scene === 'library') {
    minAz = 0.1;
    maxAz = Math.PI / 2 - 0.1;
  }

  return (
    <>
      <color attach="background" args={[fogColor]} />
      <fog attach="fog" args={[fogColor, 15, 60]} />
      <Environment preset="city" />
      
      {/* Massive solid floor block to hide the void beneath the floor */}
      <mesh position={[0, -50.01, 0]} receiveShadow>
        <boxGeometry args={[1000, 100, 1000]} />
        <GhibliMaterial color={floorColor} />
      </mesh>
      
      <ContactShadows position={[0, 0.02, 0]} opacity={0.8} scale={50} blur={2.5} far={4} color="#000" />

      {scene === 'classroom' && <ClassroomEnv occupants={occupants} accent={accent} />}
      {scene === 'cafe' && <CafeEnv occupants={occupants} accent={accent} />}
      {scene === 'library' && <LibraryEnv occupants={occupants} accent={accent} />}

      <OrbitControls 
        makeDefault 
        enableDamping 
        enablePan={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2 - 0.1} 
        minZoom={65} 
        maxZoom={200}
        minAzimuthAngle={minAz}
        maxAzimuthAngle={maxAz}
      />
    </>
  );
};

// ─── Room View (3D Canvas Based) ──────────────────────────────────────────────
const RoomView = ({ occupants, sessionSeconds, onLeave, scene, accent, isPaused, togglePause, mode }: {
  occupants: Occupant[]; sessionSeconds: number; onLeave: () => void; scene: SceneId; accent: string;
  isPaused: boolean; togglePause: () => void; mode: RoomMode;
}) => {
  const meta = SCENE_META[scene];
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);

  // Sync fullscreen state; auto-unlock when fullscreen exits
  useEffect(() => {
    const handler = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs) {
        setIsLocked(false);
        setShowUnlockPrompt(false);
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Clean exit when Electron signals the app is quitting
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onBeforeQuit) return;
    api.onBeforeQuit(async () => {
      setIsLocked(false);
      setShowUnlockPrompt(false);
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch (_) {}
      }
    });
  }, []);

  // Intercept Escape when locked to prevent fullscreen exit
  useEffect(() => {
    if (!isLocked) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setShowUnlockPrompt(true);
      }
      if (e.key === 'l' || e.key === 'L') {
        setShowUnlockPrompt(true);
      }
    };
    // Capture phase so we intercept before the browser handles Escape
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [isLocked]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  const toggleLock = useCallback(() => {
    if (!isFullscreen) return; // lock only available in fullscreen
    setIsLocked(prev => !prev);
    setShowUnlockPrompt(false);
  }, [isFullscreen]);

  const hudVisible = !isLocked;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', borderRadius: isFullscreen ? 0 : 16, overflow: 'hidden', userSelect: 'none', backgroundColor: '#0f172a' }}>

      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <Canvas shadows orthographic camera={{ position: [20, 10, 20], zoom: 65, near: -100, far: 100 }}>
          <React.Suspense fallback={null}>
            <Scene3D occupants={occupants} scene={scene} accent={accent} />
          </React.Suspense>
        </Canvas>
      </div>

      {/* Hanging Ropes for Timer — only in study mode */}
      {mode === 'study' && (
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 80, display: 'flex', justifyContent: 'space-between', zIndex: 4 }}>
          <div style={{ width: 3, height: 20, background: '#78350f', boxShadow: '2px 0 4px rgba(0,0,0,0.3)' }} />
          <div style={{ width: 3, height: 20, background: '#78350f', boxShadow: '2px 0 4px rgba(0,0,0,0.3)' }} />
        </div>
      )}

      {/* View mode badge */}
      {mode === 'view' && (
        <div style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 5, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 18px', borderRadius: 8,
          background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, letterSpacing: 2,
          backdropFilter: 'blur(8px)',
        }}>
          👁 VIEW MODE
        </div>
      )}

      {/* Timer banner — study mode only; plain when unlocked, clickable when locked */}
      {mode === 'study' && (isLocked ? (
        <button
          onClick={togglePause}
          title={isPaused ? 'Resume timer' : 'Pause timer'}
          style={{
            position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: scene === 'classroom' ? '#064e3b' : scene === 'library' ? '#78350f' : '#451a03',
            border: `3px solid ${isPaused ? accent : scene === 'classroom' ? '#78350f' : scene === 'library' ? '#451a03' : '#291811'}`,
            borderRadius: 8, padding: '8px 32px',
            boxShadow: isPaused
              ? `0 8px 24px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.4), 0 0 0 2px ${accent}44`
              : `0 8px 24px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.4)`,
            zIndex: 5, cursor: 'pointer',
            transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(-50%) scale(1.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(-50%) scale(1)'; }}
        >
          {/* Label */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            color: 'rgba(255,255,255,0.95)',
            fontSize: 9, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 2,
          }}>
            {isPaused ? 'PAUSED' : meta.label}
          </div>
          {/* Timer + icon row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              color: '#ffffff',
              fontSize: 28, fontWeight: 700, fontFamily: 'Georgia, serif', letterSpacing: 2,
              textShadow: '0 1px 3px rgba(0,0,0,1)',
              opacity: isPaused ? 0.55 : 1,
              transition: 'opacity 0.3s',
            }}>
              {fmtHMS(sessionSeconds)}
            </div>
            {/* Pause / play icon embedded in banner */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 8,
              background: isPaused ? accent : 'rgba(255,255,255,0.12)',
              color: isPaused ? '#000' : 'rgba(255,255,255,0.85)',
              flexShrink: 0,
              transition: 'background 0.2s, color 0.2s',
              boxShadow: isPaused ? `0 0 10px ${accent}88` : 'none',
            }}>
              {isPaused ? <Play size={16} strokeWidth={2.5} /> : <Pause size={16} strokeWidth={2.5} />}
            </div>
          </div>
        </button>
      ) : (
        <div
          style={{
            position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: scene === 'classroom' ? '#064e3b' : scene === 'library' ? '#78350f' : '#451a03',
            border: `3px solid ${scene === 'classroom' ? '#78350f' : scene === 'library' ? '#451a03' : '#291811'}`,
            borderRadius: 8, padding: '8px 32px',
            boxShadow: `0 8px 24px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.4)`,
            zIndex: 5, pointerEvents: 'none',
          }}
        >
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 2 }}>
            {meta.label}
          </div>
          <div style={{ color: '#fef3c7', fontSize: 28, fontWeight: 700, fontFamily: 'Georgia, serif', letterSpacing: 2, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            {fmtHMS(sessionSeconds)}
          </div>
        </div>
      ))}

      {/* Locked top bar — replaces the HUD when locked, always reachable */}
      {isLocked && (
        <div style={{
          position: 'absolute', top: 16, left: 16, right: 16, zIndex: 20,
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          transition: 'opacity 0.4s',
          opacity: 1,
          pointerEvents: 'auto',
        }}>
          <button
            onClick={toggleLock}
            title="Unlock screen"
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 16px', borderRadius: 20, cursor: 'pointer',
              backdropFilter: 'blur(8px)', transition: 'all 0.2s',
              background: `${accent}22`, border: `1px solid ${accent}55`,
              color: accent, fontSize: 12, fontWeight: 700,
              boxShadow: `0 0 14px ${accent}33`,
              animation: 'lockPulse 3s ease-in-out infinite',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${accent}44`; e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${accent}22`; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Lock size={13} /> Unlock
          </button>
        </div>
      )}

      {/* HUD Layer — fades out when locked */}
      <div style={{
        position: 'absolute', top: 16, left: 16, right: 16, zIndex: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        transition: 'opacity 0.4s, transform 0.4s',
        opacity: hudVisible ? 1 : 0,
        transform: hudVisible ? 'translateY(0)' : 'translateY(-8px)',
        pointerEvents: hudVisible ? 'auto' : 'none',
      }}>
        <button
          onClick={onLeave}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; }}
        >
          <ArrowLeft size={16} /> Leave
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 20, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: '#fef3c7', fontSize: 13, fontWeight: 700, backdropFilter: 'blur(8px)', boxShadow: `0 4px 12px rgba(0,0,0,0.2)` }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, display: 'inline-block', boxShadow: `0 0 10px ${accent}`, animation: 'glowRingPulse 1.6s ease-in-out infinite' }} />
            {mode === 'study' ? `${occupants.length} Studying` : 'Viewing'}
          </div>

          {/* Lock button — only shown in fullscreen */}
          {isFullscreen && (
            <button
              onClick={toggleLock}
              title={isLocked ? 'Unlock screen' : 'Lock screen'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 20, cursor: 'pointer',
                backdropFilter: 'blur(8px)', transition: 'all 0.2s', flexShrink: 0,
                background: isLocked ? `${accent}33` : 'rgba(0,0,0,0.4)',
                border: `1px solid ${isLocked ? accent : 'rgba(255,255,255,0.15)'}`,
                color: isLocked ? accent : '#fff',
                boxShadow: isLocked ? `0 0 12px ${accent}66` : '0 4px 12px rgba(0,0,0,0.2)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {isLocked ? <Lock size={15} /> : <Unlock size={15} />}
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 20, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; }}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Lock indicator — visible in bottom-right when locked, click to unlock */}
      {isLocked && (
        <button
          onClick={() => setShowUnlockPrompt(true)}
          title="Click or press L to unlock"
          style={{
            position: 'absolute', bottom: 20, right: 20, zIndex: 30,
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '7px 14px', borderRadius: 20,
            background: `${accent}22`, border: `1px solid ${accent}55`,
            color: accent, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', backdropFilter: 'blur(8px)',
            boxShadow: `0 0 16px ${accent}33`,
            animation: 'lockPulse 3s ease-in-out infinite',
          }}
        >
          <Lock size={13} /> Locked · press L to unlock
        </button>
      )}

      {/* Unlock prompt overlay */}
      {showUnlockPrompt && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          }}
          onClick={() => setShowUnlockPrompt(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(15,23,42,0.95)', border: `1px solid ${accent}44`,
              borderRadius: 20, padding: '32px 40px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px ${accent}22`,
              minWidth: 280,
            }}
          >
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${accent}22`, border: `2px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={22} color={accent} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Screen is locked</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Unlock to leave or interact with the UI</div>
            </div>
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button
                onClick={() => setShowUnlockPrompt(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Stay focused
              </button>
              <button
                onClick={toggleLock}
                style={{ flex: 1, padding: '10px', borderRadius: 12, background: accent, border: 'none', color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 16px ${accent}66` }}
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes thoughtFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes glowRingPulse { 0% { opacity: 0.6; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } 100% { opacity: 0.6; transform: scale(0.95); } }
        @keyframes lockPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
};

// ─── Scene Picker ─────────────────────────────────────────────────────────────
type RoomMode = 'view' | 'study';

// Map scene IDs to lucide icons
const SCENE_ICONS: Record<SceneId, React.ReactNode> = {
  classroom: <GraduationCap size={18} strokeWidth={1.8} />,
  cafe:      <Coffee size={18} strokeWidth={1.8} />,
  library:   <BookOpen size={18} strokeWidth={1.8} />,
};

const SCENE_LABEL: Record<string, string> = { classroom: 'Classroom', cafe: 'Café', library: 'Library' };
const SCENE_EMOJI: Record<string, string> = { classroom: '🎓', cafe: '☕', library: '📚' };

const ScenePicker = ({ onPick, onNavigate }: { onPick: (s: SceneId, mode: RoomMode) => void, onNavigate?: (view: string) => void }) => {
  const { isDark } = useTheme();
  const { isMonitoring } = useStore();
  const [expanded, setExpanded] = useState<SceneId | null>(null);
  const [pastSessions, setPastSessions] = useState<any[]>([]);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.getFocusSessions) {
      api.getFocusSessions().then((s: any[]) => setPastSessions(s)).catch(() => {});
    }
  }, []);

  const base = isDark
    ? { card: 'rgba(15,23,42,0.85)', cardBorder: 'rgba(255,255,255,0.07)', text: '#f1f5f9', sub: '#94a3b8' }
    : { card: 'rgba(255,255,255,0.9)',  cardBorder: 'rgba(0,0,0,0.08)',       text: '#0f172a', sub: '#64748b' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, padding: '40px 24px 48px', height: '100%', overflowY: 'auto' }} className="custom-scrollbar">

      {/* Page header */}
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(109,40,217,0.12)', border: '1px solid rgba(167,139,250,0.25)', marginBottom: 14 }}>
          <SparklesIcon size={11} color="#a78bfa" strokeWidth={2} />
          <span style={{ fontSize: 10, fontWeight: 800, color: '#a78bfa', letterSpacing: 2, textTransform: 'uppercase' }}>Focus Rooms</span>
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', color: base.text, lineHeight: 1.2 }}>Pick your space</h2>
        <p style={{ fontSize: 13, color: base.sub, margin: 0, lineHeight: 1.6 }}>Immersive 3D environments built for deep work. Study alongside Alex, Priya, Jordan, Sam, Mia, Yuki, Dani, Leo, Zoe — always free.</p>
      </div>

      {/* Scene cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 760 }}>
        {(Object.entries(SCENE_META) as [SceneId, typeof SCENE_META[SceneId]][]).map(([id, m]) => {
          const isOpen = expanded === id;
          return (
            <div key={id} style={{
              width: 220, borderRadius: 20, overflow: 'hidden',
              background: base.card,
              border: isOpen ? `1px solid ${m.accent}70` : `1px solid ${base.cardBorder}`,
              backdropFilter: 'blur(14px)',
              boxShadow: isOpen
                ? `0 20px 48px rgba(0,0,0,0.3), 0 0 0 2px ${m.accent}30`
                : isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isOpen ? 'translateY(-6px)' : 'translateY(0)',
            }}>
              {/* Thumbnail */}
              <button
                onClick={() => setExpanded(isOpen ? null : id)}
                style={{ width: '100%', padding: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'block', textAlign: 'left' }}
              >
                <div style={{ width: '100%', height: 130, backgroundImage: `url('${SCENE_PREVIEWS[id]}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />

                {/* Card body */}
                <div style={{ padding: '14px 18px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: m.accent }}>{SCENE_ICONS[id]}</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: base.text }}>{m.label}</span>
                    </div>
                    <ChevronDown
                      size={14}
                      color={base.sub}
                      strokeWidth={2}
                      style={{ transition: 'transform 0.25s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
                    />
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: base.sub, lineHeight: 1.5 }}>{m.tagline}</p>
                </div>
              </button>

              {/* Expanded actions */}
              <div style={{ overflow: 'hidden', maxHeight: isOpen ? 130 : 0, transition: 'max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div style={{ padding: '0 14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Divider */}
                  <div style={{ height: 1, background: `${base.cardBorder}`, marginBottom: 2 }} />

                  {/* View Room */}
                  <button
                    onClick={() => onPick(id, 'view')}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 10,
                      background: 'transparent',
                      border: `1px solid ${base.cardBorder}`,
                      color: base.sub, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = base.text; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = base.sub; }}
                  >
                    <Eye size={13} strokeWidth={2} /> View Room
                  </button>

                  {/* Join Study Group */}
                  <button
                    onClick={() => {
                      if (!isMonitoring) {
                        if (onNavigate) {
                          onNavigate('dashboard');
                          // Give a slight delay for the dashboard view to render before triggering the pulse
                          setTimeout(() => {
                            window.dispatchEvent(new Event('highlight-monitoring'));
                          }, 100);
                        }
                        return;
                      }
                      onPick(id, 'study');
                    }}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 10,
                      background: m.accent,
                      border: 'none',
                      color: '#000', fontSize: 12, fontWeight: 800,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                      boxShadow: `0 4px 14px ${m.accent}44`,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                  >
                    <Users size={13} strokeWidth={2.5} /> Join Study Group
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Past Sessions (grouped by day) ──────────────── */}
      {pastSessions.length > 0 && (() => {
        // Group sessions by date string (e.g. "May 12, 2026")
        const byDay: Record<string, { totalSec: number; rooms: Record<string, number>; date: string }> = {};
        pastSessions.forEach((s: any) => {
          const d = new Date(s.startedAt);
          const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          if (!byDay[key]) byDay[key] = { totalSec: 0, rooms: {}, date: key };
          byDay[key].totalSec += s.durationSeconds || 0;
          byDay[key].rooms[s.scene] = (byDay[key].rooms[s.scene] || 0) + 1;
        });
        const days = Object.values(byDay).slice(0, 10);
        const fmtDur = (sec: number) => {
          const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
          return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
        };

        return (
          <div style={{
            maxWidth: 760, width: '100%',
            borderRadius: 20,
            background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.7)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            backdropFilter: 'blur(16px)',
            overflow: 'hidden',
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.25)' : '0 8px 32px rgba(0,0,0,0.06)',
          }}>
            {/* Header bar */}
            <div style={{
              padding: '14px 20px',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: isDark ? 'rgba(167,139,250,0.15)' : 'rgba(167,139,250,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BookOpen size={14} color="#a78bfa" strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: base.text, letterSpacing: 0.2 }}>Recent Sessions</span>
              <span style={{ fontSize: 11, color: base.sub, marginLeft: 'auto', fontWeight: 600 }}>{pastSessions.length} session{pastSessions.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Day rows — scrollable */}
            <div style={{ padding: '6px 0', maxHeight: 320, overflowY: 'auto' }} className="custom-scrollbar">
              {days.map((day, i) => {
                const roomEntries = Object.entries(day.rooms);
                const roomTags = roomEntries.map(([scene, count]) => ({
                  label: SCENE_LABEL[scene] ?? scene,
                  accent: SCENE_META[scene as SceneId]?.accent ?? '#a78bfa',
                  count,
                }));
                return (
                  <div key={day.date} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 20px',
                    borderBottom: i < days.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` : 'none',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Date */}
                    <span style={{ fontSize: 12, fontWeight: 600, color: base.sub, minWidth: 90, whiteSpace: 'nowrap' }}>{day.date}</span>
                    {/* Room tags */}
                    <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
                      {roomTags.map(r => (
                        <span key={r.label} style={{
                          fontSize: 11, fontWeight: 600, color: r.accent,
                          background: `${r.accent}12`, padding: '2px 8px', borderRadius: 6,
                          whiteSpace: 'nowrap',
                        }}>
                          {r.label}{r.count > 1 ? ` (×${r.count})` : ''}
                        </span>
                      ))}
                    </div>
                    {/* Total duration */}
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: '#a78bfa',
                      background: 'rgba(167,139,250,0.12)', padding: '3px 10px', borderRadius: 8,
                      whiteSpace: 'nowrap', minWidth: 52, textAlign: 'center',
                    }}>{fmtDur(day.totalSec)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      <div style={{
        maxWidth: 480, width: '100%',
        borderRadius: 20,
        background: isDark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.8)',
        border: '1px solid rgba(167,139,250,0.25)',
        backdropFilter: 'blur(14px)',
        overflow: 'hidden',
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 60%, #a78bfa 100%)',
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Zap size={18} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: 0.2 }}>Study with real friends</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2, fontWeight: 500 }}>Live multiplayer rooms · Coming soon</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px 22px' }}>
          <p style={{ margin: '0 0 18px', fontSize: 13, color: base.sub, lineHeight: 1.65 }}>
            We're building real-time rooms where you can invite your actual friends, see them as characters, and study together — same vibe, real accountability.
          </p>

          <div>
            <a
              href="https://forms.gle/aQJdFwULQiHcnxw37"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', padding: '10px 20px', borderRadius: 10,
                background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
                textDecoration: 'none', color: '#fff', fontSize: 12, fontWeight: 800,
                boxShadow: '0 4px 14px rgba(109,40,217,0.35)',
                alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              <Users size={13} strokeWidth={2.5} /> Let us know what you want
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────
export const FocusRoom: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const [scene, setScene] = useState<SceneId | null>(null);
  const [mode, setMode] = useState<RoomMode>('study');
  const [tick, setTick] = useState(0);
  const sessionStartRef = useRef(Date.now());
  const sessionStartedAt = useRef<string>(new Date().toISOString());
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<number>(0);

  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      if (!prev) {
        setPausedAt(tick);
      }
      return !prev;
    });
  }, [tick]);

  // Timer only ticks in study mode and when not paused
  useEffect(() => {
    if (!scene || mode !== 'study' || isPaused) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [scene, mode, isPaused]);

  const npcs = useMemo(() => NPC_NAMES.map((name, i) => ({
    id: `npc-${i}`, name, isUser: false,
    elapsedSeconds: Math.floor(Math.random() * 7200) + 300,
    seatIdx: i + 1, 
  })), []);

  const sessionSeconds = isPaused ? pausedAt : tick;
  const accent = scene ? SCENE_META[scene].accent : '#4ade80';

  // In view mode: no user occupant, NPCs still populate the room for ambience
  const occupants: Occupant[] = scene ? (mode === 'study' ? [
    { id: 'user', name: 'You', isUser: true, elapsedSeconds: sessionSeconds, seatIdx: 0 },
    ...npcs.slice(0, SCENE_META[scene].maxSeats - 1).map(n => ({ ...n, elapsedSeconds: n.elapsedSeconds + tick })),
  ] : [
    ...npcs.slice(0, SCENE_META[scene].maxSeats).map(n => ({ ...n, elapsedSeconds: n.elapsedSeconds + tick })),
  ]) : [];

  const handleLeave = useCallback(() => {
    // Persist session to DB before tearing down (only study mode > 30s is worth saving)
    if (mode === 'study' && sessionSeconds >= 30 && scene) {
      const api = (window as any).electronAPI;
      if (api?.saveFocusSession) {
        api.saveFocusSession({
          scene,
          durationSeconds: sessionSeconds,
          startedAt: sessionStartedAt.current,
        }).catch(() => {});
      }
    }
    setScene(null);
    setMode('study');
    setTick(0);
    setIsPaused(false);
    setPausedAt(0);
    sessionStartRef.current = Date.now();
    sessionStartedAt.current = new Date().toISOString();
  }, [scene, mode, sessionSeconds]);

  if (!scene) return <ScenePicker onPick={(s, m) => { setScene(s); setMode(m); }} onNavigate={onNavigate} />;

  return (
    <div style={{ height: 'calc(100vh - 135px)', minHeight: 480, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <RoomView
          scene={scene} occupants={occupants}
          sessionSeconds={sessionSeconds}
          onLeave={handleLeave}
          accent={accent}
          isPaused={isPaused}
          togglePause={togglePause}
          mode={mode}
        />
      </div>
    </div>
  );
};
