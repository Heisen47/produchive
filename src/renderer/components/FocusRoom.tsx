import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Crown } from 'lucide-react';
import { useTheme } from './ThemeProvider';

// ─── Dummy / Placeholder Background Imports ────────────────────────────────────
// IMPORTANT: The user must replace these .svg files with the .jpg / .png 
// images they provided in the chat.
import classroomBg from '../assets/rooms/classroom.png';
import trainBg from '../assets/rooms/train.png';
import cafeBg from '../assets/rooms/cafe.png';

// ─── Types ────────────────────────────────────────────────────────────────────
type SceneId = 'classroom' | 'train' | 'cafe';
interface Occupant { id: string; name: string; isUser: boolean; elapsedSeconds: number; seatIdx: number; }

// ─── Data & Config ────────────────────────────────────────────────────────────
const NPC_NAMES = ['Alex', 'Priya', 'Jordan', 'Sam', 'Mia', 'Yuki', 'Dani', 'Leo', 'Zoe'];

const SCENE_META: Record<SceneId, {
  label: string; emoji: string; tagline: string; accent: string;
  bgImage: string;
  timerBox: { top: string; left: string; width: string; height: string };
  timerBoxStyle?: React.CSSProperties;
  seats: { left: string; top: string; scale?: number }[];
}> = {
  classroom: {
    label: 'Classroom', emoji: '🏫', tagline: 'Hit the books together', accent: '#4ade80',
    bgImage: classroomBg,
    // Covers the baked-in text on the chalkboard
    timerBox: { top: '23%', left: '26%', width: '48%', height: '18%' },
    timerBoxStyle: { background: '#224a30', border: 'none', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' },
    seats: [
      { left: '50%', top: '78%', scale: 1 },    // Front Center (User)
      { left: '17%', top: '76%', scale: 1 },    // Front Left
      { left: '83%', top: '76%', scale: 1 },    // Front Right
      { left: '50%', top: '56%', scale: 0.8 },  // Mid Center
      { left: '25%', top: '56%', scale: 0.8 },  // Mid Left
      { left: '75%', top: '56%', scale: 0.8 },  // Mid Right
      { left: '50%', top: '44%', scale: 0.65 }, // Back Center
      { left: '33%', top: '44%', scale: 0.65 }, // Back Left
      { left: '67%', top: '44%', scale: 0.65 }, // Back Right
    ]
  },
  train: {
    label: 'Night Train', emoji: '🚂', tagline: 'Study on the move', accent: '#3b82f6',
    bgImage: trainBg,
    // Covers the baked-in text on the window
    timerBox: { top: '20%', left: '26%', width: '48%', height: '22%' },
    timerBoxStyle: { background: 'rgba(10, 25, 45, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' },
    seats: [
      { left: '78%', top: '65%', scale: 1 },    // Front Right (User)
      { left: '22%', top: '65%', scale: 1 },    // Front Left
      { left: '72%', top: '52%', scale: 0.75 }, // Mid Right
      { left: '28%', top: '52%', scale: 0.75 }, // Mid Left
      { left: '67%', top: '45%', scale: 0.6 },  // Back Right
      { left: '33%', top: '45%', scale: 0.6 },  // Back Left
    ]
  },
  cafe: {
    label: 'Café', emoji: '☕', tagline: 'Cozy corner, deep work', accent: '#f59e0b',
    bgImage: cafeBg,
    // Custom floating badge since there is no obvious board
    timerBox: { top: '4%', left: '4%', width: '30%', height: '12%' },
    timerBoxStyle: { background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
    seats: [
      { left: '88%', top: '70%', scale: 1 },    // Right foreground (User)
      { left: '15%', top: '60%', scale: 0.85 }, // Left foreground
      { left: '45%', top: '55%', scale: 0.7 },  // Mid right
      { left: '32%', top: '48%', scale: 0.6 },  // Mid left
    ]
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtHMS(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
function fmtMin(s: number): string {
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}m` : ''}`;
}

// ─── Floating Element (for occasional movement) ────────────────────────────────
const FloatingIndicator = ({ occ, accent }: { occ: Occupant, accent: string }) => {
  // Occasional movement logic: Some NPCs have thought bubbles, some have Zzz, some have music notes
  const icon = occ.isUser ? '⭐' : occ.seatIdx % 3 === 0 ? '🎵' : occ.seatIdx % 3 === 1 ? '💭' : '💡';
  
  return (
    <div style={{
      position: 'absolute', bottom: '20px', left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      animation: `thoughtFloat ${3 + (occ.seatIdx % 2)}s ease-in-out infinite`,
      animationDelay: `${occ.seatIdx * 0.4}s`,
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: occ.isUser ? accent : '#fff',
        background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: 12,
        marginBottom: 4, whiteSpace: 'nowrap', letterSpacing: '0.3px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        border: `1px solid ${occ.isUser ? accent : 'rgba(255,255,255,0.15)'}`,
      }}>
        {fmtMin(occ.elapsedSeconds)} {icon}
      </div>
    </div>
  );
};

// ─── Room View (Image-Based) ──────────────────────────────────────────────────
const RoomView = ({ occupants, sessionSeconds, onLeave, scene, accent }: {
  occupants: Occupant[]; sessionSeconds: number; onLeave: () => void; scene: SceneId; accent: string;
}) => {
  const meta = SCENE_META[scene];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden', userSelect: 'none', backgroundColor: '#000' }}>
      
      {/* 1. Photorealistic Background Layer */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url('${meta.bgImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        // Very subtle breathing animation to give the room life
        animation: 'roomBreathe 15s ease-in-out infinite alternate',
      }} />

      {/* 2. Timer Overlay (Hides baked text and shows live timer) */}
      <div style={{
        position: 'absolute',
        ...meta.timerBox,
        ...meta.timerBoxStyle,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 5,
      }}>
        {scene !== 'cafe' && (
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.2cqw', fontFamily: 'Georgia,serif', letterSpacing: 1, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
            Quiet Study Hall
          </div>
        )}
        <div style={{ color: '#fff', fontSize: scene === 'cafe' ? '24px' : '3.5cqw', fontWeight: 700, fontFamily: 'monospace', letterSpacing: 2, textShadow: `0 0 15px ${accent}80`, marginTop: '1%' }}>
          {fmtHMS(sessionSeconds)}
        </div>
      </div>

      {/* 3. Seats / Overlays Layer */}
      {occupants.map(occ => {
        const seatConfig = meta.seats[occ.seatIdx];
        if (!seatConfig) return null; // Safety check if fewer seats config than occupants
        
        return (
          <div key={occ.id} style={{
            position: 'absolute',
            left: seatConfig.left,
            top: seatConfig.top,
            transform: `translate(-50%, -50%) scale(${seatConfig.scale || 1})`,
            zIndex: 10 + occ.seatIdx, // Ensure closer seats are on top
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            {/* Occasional movement / Live indicators */}
            <FloatingIndicator occ={occ} accent={accent} />

            {/* Glowing Ring on the floor to ground the characters and highlight the user */}
            <div style={{
              width: 80, height: 24, borderRadius: '50%',
              marginTop: 40, // push it down to the floor level
              border: `3px solid ${occ.isUser ? '#fbbf24' : '#4ade80'}`,
              boxShadow: `0 0 15px 4px ${occ.isUser ? 'rgba(251,191,36,0.6)' : 'rgba(74,222,128,0.5)'}, inset 0 0 10px ${occ.isUser ? 'rgba(251,191,36,0.4)' : 'rgba(74,222,128,0.4)'}`,
              animation: `glowRingPulse ${occ.isUser ? 1.5 : 2.5}s ease-in-out infinite`,
              animationDelay: `${occ.seatIdx * 0.3}s`,
            }} />
          </div>
        );
      })}

      {/* HUD Layer */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onLeave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          <ArrowLeft size={13} /> Leave
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 20, background: 'rgba(0,0,0,0.6)', border: `1px solid ${accent}60`, color: accent, fontSize: 12, fontWeight: 700, backdropFilter: 'blur(8px)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, display: 'inline-block', boxShadow: `0 0 8px ${accent}`, animation: 'glowRingPulse 1.6s ease-in-out infinite' }} />
          {meta.emoji} {meta.label} · {occupants.length} studying
        </div>
      </div>
      
      {/* Aspect Ratio Constraint container queries */}
      <style>{`
        .container-query-wrapper { container-type: inline-size; }
        @keyframes roomBreathe { 0% { transform: scale(1); } 100% { transform: scale(1.03); } }
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
          <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', letterSpacing: 2, textTransform: 'uppercase' }}>Premium Feature</span>
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Focus Rooms</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 5 }}>Immersive environments for deep work.</p>
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 800 }}>
        {(Object.entries(SCENE_META) as [SceneId, typeof SCENE_META[SceneId]][]).map(([id, m]) => (
          <button key={id} onClick={() => onPick(id)} style={{
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
            {/* Thumbnail Image */}
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
    seatIdx: i + 1, // Skip index 0, reserve for user
  })), []);

  const sessionSeconds = Math.floor((Date.now() - sessionStart) / 1000);
  const accent = scene ? SCENE_META[scene].accent : '#4ade80';

  const occupants: Occupant[] = scene ? [
    { id: 'user', name: 'You', isUser: true, elapsedSeconds: sessionSeconds, seatIdx: 0 },
    ...npcs.slice(0, SCENE_META[scene].seats.length - 1).map(n => ({ ...n, elapsedSeconds: n.elapsedSeconds + tick })),
  ] : [];

  if (!scene) return <ScenePicker onPick={setScene} />;

  return (
    <div className="container-query-wrapper" style={{ height: 'calc(100vh - 135px)', minHeight: 480, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      {/* Constrain the room view to a square aspect ratio to match the provided images perfectly */}
      <div style={{ width: '100%', maxWidth: '85vh', aspectRatio: '1 / 1', position: 'relative', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
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
