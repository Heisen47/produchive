import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Crown } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { SceneId, Occupant, SCENE_META, fmtHMS, GhibliMaterial, NPC_NAMES } from './focus-room/Shared3D';
import { ClassroomEnv } from './focus-room/ClassroomEnv';
import { CafeEnv } from './focus-room/CafeEnv';
import { LibraryEnv } from './focus-room/LibraryEnv';

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
const RoomView = ({ occupants, sessionSeconds, onLeave, scene, accent }: {
  occupants: Occupant[]; sessionSeconds: number; onLeave: () => void; scene: SceneId; accent: string;
}) => {
  const meta = SCENE_META[scene];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden', userSelect: 'none', backgroundColor: '#0f172a' }}>
      
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <Canvas shadows orthographic camera={{ position: [20, 10, 20], zoom: 65, near: -100, far: 100 }}>
          <React.Suspense fallback={null}>
            <Scene3D occupants={occupants} scene={scene} accent={accent} />
          </React.Suspense>
        </Canvas>
      </div>

      {/* Hanging Ropes for Timer */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 80, display: 'flex', justifyContent: 'space-between', zIndex: 4 }}>
        <div style={{ width: 3, height: 20, background: '#78350f', boxShadow: '2px 0 4px rgba(0,0,0,0.3)' }} />
        <div style={{ width: 3, height: 20, background: '#78350f', boxShadow: '2px 0 4px rgba(0,0,0,0.3)' }} />
      </div>

      {/* Timer Overlay */}
      <div style={{
        position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: scene === 'classroom' ? '#064e3b' : scene === 'library' ? '#78350f' : '#451a03',
        border: `3px solid ${scene === 'classroom' ? '#78350f' : scene === 'library' ? '#451a03' : '#291811'}`,
        borderRadius: 8, padding: '8px 32px',
        boxShadow: `0 8px 24px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.4)`,
        zIndex: 5, pointerEvents: 'none'
      }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 2 }}>
          {meta.label}
        </div>
        <div style={{ color: '#fef3c7', fontSize: 28, fontWeight: 700, fontFamily: 'Georgia, serif', letterSpacing: 2, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
          {fmtHMS(sessionSeconds)}
        </div>
      </div>

      {/* HUD Layer */}
      <div style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onLeave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; }}>
          <ArrowLeft size={16} /> Leave
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 20, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: '#fef3c7', fontSize: 13, fontWeight: 700, backdropFilter: 'blur(8px)', boxShadow: `0 4px 12px rgba(0,0,0,0.2)` }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, display: 'inline-block', boxShadow: `0 0 10px ${accent}`, animation: 'glowRingPulse 1.6s ease-in-out infinite' }} />
          {meta.emoji} {occupants.length} Studying
        </div>
      </div>
      
      <style>{`
        @keyframes thoughtFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes glowRingPulse { 0% { opacity: 0.6; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } 100% { opacity: 0.6; transform: scale(0.95); } }
      `}</style>
    </div>
  );
};

// ─── Scene Picker ─────────────────────────────────────────────────────────────
const ScenePicker = ({ onPick }: { onPick: (s: SceneId) => void }) => {
  const { isDark } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, padding: '36px 20px', height: '100%', overflowY: 'auto' }} className="custom-scrollbar">
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
          <Crown size={16} style={{ color: '#f59e0b' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', letterSpacing: 2, textTransform: 'uppercase' }}>Premium 3D Experience</span>
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Focus Rooms</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 5 }}>Immersive 3D environments for deep work.</p>
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 800 }}>
        {(Object.entries(SCENE_META) as [SceneId, typeof SCENE_META[SceneId]][]).map(([id, m]) => (
          <button key={id} onClick={() => onPick(id as SceneId)} style={{
            width: 220, padding: 0, overflow: 'hidden',
            background: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)',
            border: '1px solid var(--border-card)', borderRadius: 20, cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
            backdropFilter: 'blur(12px)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: 'var(--shadow-card)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = 'translateY(-8px) scale(1.02)';
            el.style.boxShadow = `0 24px 48px rgba(0,0,0,0.4), 0 0 0 2px ${m.accent}60`;
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = 'translateY(0) scale(1)';
            el.style.boxShadow = 'var(--shadow-card)';
          }}>
            <div style={{ width: '100%', height: 140, backgroundImage: `url('${m.bgImage}')`, backgroundSize: 'cover', backgroundPosition: 'center', borderBottom: '1px solid var(--border-card)' }} />
            
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{m.emoji}</span> {m.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 12 }}>{m.tagline}</div>
              <div style={{ fontSize: 12, color: '#fff', fontWeight: 700, background: m.accent, padding: '6px 20px', borderRadius: 20, width: '100%', transition: 'background 0.2s' }}>
                Enter Room
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────
export const FocusRoom: React.FC = () => {
  const [scene, setScene] = useState<SceneId | null>(null);
  const [tick, setTick] = useState(0);
  const [sessionStart] = useState(() => Date.now());

  useEffect(() => {
    if (!scene) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [scene]);

  const npcs = useMemo(() => NPC_NAMES.map((name, i) => ({
    id: `npc-${i}`, name, isUser: false,
    elapsedSeconds: Math.floor(Math.random() * 7200) + 300,
    seatIdx: i + 1, 
  })), []);

  const sessionSeconds = Math.floor((Date.now() - sessionStart) / 1000);
  const accent = scene ? SCENE_META[scene].accent : '#4ade80';

  const occupants: Occupant[] = scene ? [
    { id: 'user', name: 'You', isUser: true, elapsedSeconds: sessionSeconds, seatIdx: 0 },
    ...npcs.slice(0, SCENE_META[scene].maxSeats - 1).map(n => ({ ...n, elapsedSeconds: n.elapsedSeconds + tick })),
  ] : [];

  if (!scene) return <ScenePicker onPick={setScene} />;

  return (
    <div style={{ height: 'calc(100vh - 135px)', minHeight: 480, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <RoomView
          scene={scene} occupants={occupants}
          sessionSeconds={sessionSeconds + tick}
          onLeave={() => setScene(null)}
          accent={accent}
        />
      </div>
    </div>
  );
};
