import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Environment, ContactShadows, Outlines, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import classroomBg from '../../assets/rooms/classroom.png';
import cafeBg from '../../assets/rooms/cafe.png';
import libraryBg from '../../assets/rooms/library.png'
import { useGameStore } from '../../lib/gameStore';


export type SceneId = 'classroom' | 'cafe' | 'library';
export interface Occupant { id: string; name: string; isUser: boolean; elapsedSeconds: number; seatIdx: number; }

export const NPC_NAMES = ['Alex', 'Priya', 'Jordan', 'Sam', 'Mia', 'Yuki', 'Dani', 'Leo', 'Zoe'];

export const SCENE_META: Record<SceneId, {
  label: string; emoji: string; tagline: string; accent: string;
  bgImage: string;
  maxSeats: number;
}> = {
  classroom: {
    label: 'Classroom', emoji: '🏫', tagline: 'Hit the books together', accent: '#4ade80',
    bgImage: classroomBg, maxSeats: 9
  },
  cafe: {
    label: 'Café', emoji: '☕', tagline: 'Cozy corner, deep work', accent: '#f59e0b',
    bgImage: cafeBg, maxSeats: 4
  },
  library: {
    label: 'Library', emoji: '📚', tagline: 'Quiet stacks, deep focus', accent: '#a78bfa',
    bgImage: libraryBg, maxSeats: 6
  },
};

export function fmtHMS(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
export function fmtMin(s: number): string {
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}m` : ''}`;
}

// ─── Ghibli Materials & Props ──────────────────────────────────────────────────
export const GhibliMaterial = ({ color, ...props }: any) => (
  <meshToonMaterial color={color} {...props} />
);

const SteamParticle = ({ delay = 0, xOffset = 0 }: { delay?: number, xOffset?: number }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() + delay;
    const progress = (t % 2.0) / 2.0; 
    ref.current.position.y = 0.15 + progress * 0.4;
    ref.current.position.x = Math.sin(t * 3) * 0.05 + xOffset;
    const s = 0.03 + progress * 0.08;
    ref.current.scale.set(s, s, s);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.6 * (1 - progress);
  });
  
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color="#ffffff" transparent depthWrite={false} opacity={0.6} />
    </mesh>
  );
};

export const CoffeeMug = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <mesh position={[0, 0.08, 0]} castShadow>
      <cylinderGeometry args={[0.08, 0.08, 0.15, 16]} />
      <GhibliMaterial color="#f8fafc" />
      <Outlines thickness={0.005} color="#292524" />
    </mesh>
    <mesh position={[0.08, 0.08, 0]} rotation={[Math.PI/2, 0, 0]} castShadow>
      <torusGeometry args={[0.06, 0.02, 8, 16]} />
      <GhibliMaterial color="#f8fafc" />
    </mesh>
    {/* Stylized animated steam */}
    <SteamParticle delay={0} xOffset={0} />
    <SteamParticle delay={0.6} xOffset={0.02} />
    <SteamParticle delay={1.3} xOffset={-0.02} />
  </group>
);

export const PottedPlant = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <mesh position={[0, 0.5, 0]} castShadow>
      <cylinderGeometry args={[0.4, 0.3, 1, 16]} />
      <GhibliMaterial color="#78350f" />
      <Outlines thickness={0.015} color="#451a03" />
    </mesh>
    <mesh position={[0, 1.3, 0]} castShadow>
      <sphereGeometry args={[0.6, 16, 16]} />
      <GhibliMaterial color="#166534" />
      <Outlines thickness={0.02} color="#064e3b" />
    </mesh>
    <mesh position={[0.4, 1.1, 0.2]} castShadow>
      <sphereGeometry args={[0.4, 16, 16]} />
      <GhibliMaterial color="#15803d" />
      <Outlines thickness={0.02} color="#064e3b" />
    </mesh>
    <mesh position={[-0.3, 1.2, -0.3]} castShadow>
      <sphereGeometry args={[0.5, 16, 16]} />
      <GhibliMaterial color="#16a34a" />
      <Outlines thickness={0.02} color="#064e3b" />
    </mesh>
  </group>
);

export const Bookshelf = ({ position, rotation = 0 }: { position: [number, number, number], rotation?: number }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    <mesh position={[0, 2, 0]} castShadow>
      <boxGeometry args={[2, 4, 0.8]} />
      <GhibliMaterial color="#92400e" />
      <Outlines thickness={0.015} color="#451a03" />
    </mesh>
    {[0.5, 1.5, 2.5, 3.5].map(y => (
      <mesh key={y} position={[0, y, 0.2]} castShadow>
        <boxGeometry args={[1.8, 0.05, 0.4]} />
        <GhibliMaterial color="#78350f" />
        <Outlines thickness={0.01} color="#451a03" />
      </mesh>
    ))}
    <mesh position={[-0.5, 0.7, 0.2]} castShadow><boxGeometry args={[0.2, 0.4, 0.3]} /><GhibliMaterial color="#b91c1c" /><Outlines thickness={0.01} /></mesh>
    <mesh position={[-0.2, 0.7, 0.2]} rotation={[0, 0, -0.2]} castShadow><boxGeometry args={[0.15, 0.45, 0.3]} /><GhibliMaterial color="#0369a1" /><Outlines thickness={0.01} /></mesh>
    <mesh position={[0.5, 1.7, 0.2]} castShadow><boxGeometry args={[0.4, 0.35, 0.3]} /><GhibliMaterial color="#15803d" /><Outlines thickness={0.01} /></mesh>
    <mesh position={[0, 2.7, 0.2]} castShadow><boxGeometry args={[0.8, 0.4, 0.3]} /><GhibliMaterial color="#c2410c" /><Outlines thickness={0.01} /></mesh>
  </group>
);

export const PendantLamp = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <mesh position={[0, 3.5, 0]}>
      <cylinderGeometry args={[0.02, 0.02, 3, 8]} />
      <GhibliMaterial color="#1c1917" />
    </mesh>
    <mesh position={[0, 2, 0]}>
      <coneGeometry args={[0.5, 0.6, 16]} />
      <GhibliMaterial color="#78350f" />
      <Outlines thickness={0.015} color="#451a03" />
    </mesh>
    <mesh position={[0, 1.8, 0]}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
    <mesh position={[0, 1.8, 0]}>
      <sphereGeometry args={[0.25, 16, 16]} />
      <meshBasicMaterial color="#fef08a" transparent opacity={0.6} />
    </mesh>
    <mesh position={[0, 1.8, 0]}>
      <sphereGeometry args={[0.4, 16, 16]} />
      <meshBasicMaterial color="#fef08a" transparent opacity={0.2} />
    </mesh>
    <pointLight position={[0, 1.6, 0]} intensity={2} distance={15} color="#fef08a" />
  </group>
);

const Barista = ({ position }: { position: [number, number, number] }) => {
  const group = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (!group.current || !leftArm.current || !rightArm.current) return;
    const t = clock.getElapsedTime();
    // Sway horizontally while working
    group.current.position.x = position[0] + Math.sin(t * 1.5) * 0.15;
    // Animate arms
    leftArm.current.rotation.x = Math.PI / 2 + Math.sin(t * 8) * 0.3;
    rightArm.current.rotation.x = Math.PI / 2 + Math.cos(t * 8) * 0.3;
  });

  return (
    <group position={position} rotation={[0, 0, 0]} ref={group} scale={[1.3, 1.3, 1.3]}>
      {/* Body */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.5, 4, 16]} />
        <GhibliMaterial color="#1e293b" />
        <Outlines thickness={0.015} color="#0f172a" />
      </mesh>
      {/* Apron */}
      <mesh position={[0, 0.8, 0.15]} castShadow>
        <planeGeometry args={[0.3, 0.6]} />
        <meshBasicMaterial color="#78350f" />
      </mesh>
      
      {/* Head */}
      <group position={[0, 1.45, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.3, 16, 16]} />
          <GhibliMaterial color="#f8fafc" />
          <Outlines thickness={0.015} color="#292524" />
        </mesh>
        <CharacterFace />
        <mesh position={[0, 0.25, 0]} rotation={[0.1, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
          <GhibliMaterial color="#475569" />
          <Outlines thickness={0.015} color="#0f172a" />
        </mesh>
      </group>

      {/* Arms */}
      <mesh position={[-0.35, 1.1, 0]} ref={leftArm} castShadow>
        <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
        <GhibliMaterial color="#f8fafc" />
        <Outlines thickness={0.01} color="#292524" />
      </mesh>
      <mesh position={[0.35, 1.1, 0]} ref={rightArm} castShadow>
        <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
        <GhibliMaterial color="#f8fafc" />
        <Outlines thickness={0.01} color="#292524" />
      </mesh>
    </group>
  );
};

export const CoffeeStand = ({ position, rotation = 0 }: { position: [number, number, number], rotation?: number }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    {/* Barista behind the counter */}
    <Barista position={[-0.5, 0, -1.2]} />
    
    {/* Main Counter */}
    <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
      <boxGeometry args={[4, 1.2, 1.5]} />
      <GhibliMaterial color="#451a03" />
      <Outlines thickness={0.015} color="#290f01" />
    </mesh>
    {/* Counter Top */}
    <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
      <boxGeometry args={[4.2, 0.1, 1.7]} />
      <GhibliMaterial color="#f8fafc" />
      <Outlines thickness={0.015} color="#94a3b8" />
    </mesh>
    {/* Espresso Machine */}
    <group position={[-1, 1.3, -0.2]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1, 1, 0.6]} />
        <GhibliMaterial color="#1e293b" />
        <Outlines thickness={0.015} color="#0f172a" />
      </mesh>
      {/* Portafilters */}
      {[-0.2, 0.2].map(x => (
        <mesh key={x} position={[x, 0.4, 0.35]} rotation={[Math.PI/2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.1]} />
          <GhibliMaterial color="#94a3b8" />
        </mesh>
      ))}
      <SteamParticle delay={0} xOffset={-0.2} />
      <SteamParticle delay={0.5} xOffset={0.2} />
    </group>
    {/* Coffee Cups Stack */}
    <group position={[1, 1.3, 0]}>
      {[0, 1, 2].map(y => (
        <mesh key={`cup1-${y}`} position={[0, y * 0.15 + 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.08, 0.15, 16]} />
          <GhibliMaterial color="#fef08a" />
        </mesh>
      ))}
      {[0, 1].map(y => (
        <mesh key={`cup2-${y}`} position={[0.3, y * 0.15 + 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.08, 0.15, 16]} />
          <GhibliMaterial color="#fef08a" />
        </mesh>
      ))}
    </group>
    {/* Register / POS */}
    <group position={[1.5, 1.3, 0.2]} rotation={[0, -Math.PI / 6, 0]}>
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[0.6, 0.2, 0.4]} />
        <GhibliMaterial color="#e2e8f0" />
      </mesh>
      <mesh position={[0, 0.3, -0.1]} rotation={[Math.PI/6, 0, 0]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.05]} />
        <GhibliMaterial color="#0f172a" />
      </mesh>
    </group>
    {/* Display Case */}
    <group position={[0, 1.3, 0.3]}>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1, 0.8, 0.5]} />
        <meshBasicMaterial color="#bae6fd" transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI/2, 0, 0]}>
        <torusGeometry args={[0.15, 0.08, 8, 16, Math.PI]} />
        <GhibliMaterial color="#f59e0b" />
      </mesh>
    </group>
  </group>
);

export const WallPoster = ({ position, rotation = 0, color, scale = [1, 1.5] }: { position: [number, number, number], rotation?: number, color: string, scale?: [number, number] }) => (
  <mesh position={position} rotation={[0, rotation, 0]}>
    <planeGeometry args={[scale[0], scale[1]]} />
    <meshBasicMaterial color={color} />
  </mesh>
);

export const WallClock = ({ position, rotation = 0 }: { position: [number, number, number], rotation?: number }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    <mesh rotation={[Math.PI/2, 0, 0]}>
      <cylinderGeometry args={[0.6, 0.6, 0.1, 32]} />
      <GhibliMaterial color="#f8fafc" />
      <Outlines thickness={0.015} color="#94a3b8" />
    </mesh>
    <mesh position={[0, 0, 0.06]}>
      <boxGeometry args={[0.05, 0.4, 0.02]} />
      <meshBasicMaterial color="#0f172a" />
    </mesh>
  </group>
);


// ─── 3D Procedural Furniture ──────────────────────────────────────────────────

export const Desk = ({ position, rotation = 0, variant = 'square', themeColor = '#8b5cf6' }: { position: [number, number, number], rotation?: number, variant?: 'square' | 'round' | 'booth', themeColor?: string }) => {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {variant === 'square' && (
        <>
          <mesh position={[0, 0.7, 0.4]} castShadow receiveShadow>
            <boxGeometry args={[1.6, 0.05, 0.8]} />
            <GhibliMaterial color={themeColor} /> 
            <Outlines thickness={0.015} color="#292524" />
          </mesh>
          {[-0.75, 0.75].map(x => [0.05, 0.75].map(z => (
            <mesh key={`${x}-${z}`} position={[x, 0.35, z]} castShadow>
              <boxGeometry args={[0.05, 0.7, 0.05]} />
              <GhibliMaterial color="#444" />
              <Outlines thickness={0.015} color="#292524" />
            </mesh>
          )))}
        </>
      )}

      {variant === 'round' && (
        <>
          <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.6, 0.06, 1.6]} />
            <GhibliMaterial color={themeColor} /> 
          </mesh>
          {/* 4 short legs */}
          {[[0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]].map(([lx, lz], i) => (
            <mesh key={i} position={[lx, 0.35, lz]} castShadow>
              <boxGeometry args={[0.08, 0.7, 0.08]} />
              <GhibliMaterial color="#1c1917" />
            </mesh>
          ))}
        </>
      )}

      {variant === 'booth' && (
        <>
          <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.4, 0.05, 1.2]} />
            <GhibliMaterial color={themeColor} />
            <Outlines thickness={0.015} color="#292524" />
          </mesh>
          {/* High backs for seats */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <boxGeometry args={[2.4, 2, 0.2]} />
            <GhibliMaterial color="#1e1b4b" />
            <Outlines thickness={0.015} color="#0f172a" />
          </mesh>
          <mesh position={[-1.1, 0.35, 0]} castShadow><boxGeometry args={[0.1, 0.7, 0.8]} /><GhibliMaterial color="#0f172a" /><Outlines thickness={0.015} color="#292524" /></mesh>
          <mesh position={[1.1, 0.35, 0]} castShadow><boxGeometry args={[0.1, 0.7, 0.8]} /><GhibliMaterial color="#0f172a" /><Outlines thickness={0.015} color="#292524" /></mesh>
        </>
      )}
    </group>
  );
};

export const CharacterFace = () => (
  <group>
    {/* Eyes */}
    <mesh position={[-0.1, 0.05, 0.27]}><sphereGeometry args={[0.03, 8, 8]} /><meshBasicMaterial color="#0f172a" /></mesh>
    <mesh position={[0.1, 0.05, 0.27]}><sphereGeometry args={[0.03, 8, 8]} /><meshBasicMaterial color="#0f172a" /></mesh>
    {/* Blush */}
    <mesh position={[-0.15, -0.02, 0.26]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#fca5a5" /></mesh>
    <mesh position={[0.15, -0.02, 0.26]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#fca5a5" /></mesh>
    {/* Tiny smile */}
    <mesh position={[0, -0.05, 0.28]} rotation={[Math.PI, 0, 0]}><torusGeometry args={[0.03, 0.01, 8, 16, Math.PI]} /><meshBasicMaterial color="#0f172a" /></mesh>
  </group>
);

export const CharacterAccessory = ({ seed, isUser, accent }: { seed: number, isUser: boolean, accent: string }) => {
  const loadout = useGameStore(state => state.equippedLoadout);

  if (isUser) {
    const headItem = loadout['head'];

    if (headItem?.id === 'hat_wizard') {
      return (
        <mesh position={[0, 0.45, 0]} castShadow>
          <coneGeometry args={[0.2, 0.4, 8]} />
          <GhibliMaterial color="#4c1d95" />
          <Outlines thickness={0.015} color="#2e1065" />
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
            <GhibliMaterial color="#4c1d95" />
            <Outlines thickness={0.015} color="#2e1065" />
          </mesh>
        </mesh>
      );
    }
    
    if (headItem?.id === 'hat_crown') {
      return (
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.15, 8]} />
          <GhibliMaterial color="#fbbf24" />
          <Outlines thickness={0.015} color="#b45309" />
        </mesh>
      );
    }

    // Default basic user accent hat
    return (
      <mesh position={[0, 0.35, 0]} rotation={[0.1, 0, -0.1]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.2, 6]} />
        <GhibliMaterial color={accent} />
        <Outlines thickness={0.01} color="#78350f" />
      </mesh>
    );
  }

  const types = ['headphones', 'beanie', 'bun', 'glasses', 'none'];
  const type = types[seed % types.length];
  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const color = colors[seed % colors.length];

  if (type === 'headphones') {
    return (
      <group>
        <mesh position={[-0.32, 0, 0]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.12, 0.12, 0.06, 16]} /><GhibliMaterial color="#1e293b" /></mesh>
        <mesh position={[0.32, 0, 0]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.12, 0.12, 0.06, 16]} /><GhibliMaterial color="#1e293b" /></mesh>
        <mesh position={[0, 0, 0]}><torusGeometry args={[0.32, 0.03, 16, 32, Math.PI]} /><GhibliMaterial color="#1e293b" /></mesh>
      </group>
    );
  }
  if (type === 'beanie') {
    return (
      <mesh position={[0, 0.1, 0]} castShadow>
        <sphereGeometry args={[0.31, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <GhibliMaterial color={color} />
        <Outlines thickness={0.015} color="#1c1917" />
      </mesh>
    );
  }
  if (type === 'bun') {
    return (
      <mesh position={[0, 0.1, -0.28]} castShadow>
        <sphereGeometry args={[0.12, 16, 16]} />
        <GhibliMaterial color="#f8fafc" />
        <Outlines thickness={0.01} color="#94a3b8" />
      </mesh>
    );
  }
  if (type === 'glasses') {
    return (
      <group position={[0, 0.05, 0.28]}>
        <mesh position={[-0.12, 0, 0]}><torusGeometry args={[0.05, 0.015, 8, 16]} /><meshBasicMaterial color="#020617" /></mesh>
        <mesh position={[0.12, 0, 0]}><torusGeometry args={[0.05, 0.015, 8, 16]} /><meshBasicMaterial color="#020617" /></mesh>
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.01, 0.01, 0.1]} /><meshBasicMaterial color="#020617" /></mesh>
      </group>
    );
  }
  return null;
};

export const Character = ({ occ, position, rotation = 0, accent, isDarkEnv = false }: { occ: Occupant, position: [number, number, number], rotation?: number, accent: string, isDarkEnv?: boolean }) => {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const color = occ.isUser ? accent : '#94a3b8';
  
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime() + occ.seatIdx;
    group.current.position.y = position[1] + Math.sin(t * 2) * 0.02;
    // Add subtle head bobbing/looking around
    group.current.children[1].rotation.y = Math.sin(t * 0.5) * 0.1;
    group.current.children[1].rotation.x = Math.sin(t * 0.3) * 0.05;
    
    // Rotate to face camera when hovered
    const targetRot = hovered ? rotation + Math.PI : rotation + Math.sin(t * 0.2) * 0.05;
    group.current.rotation.y += (targetRot - group.current.rotation.y) * 0.1;
  });

  const icon = occ.isUser ? '⭐' : occ.seatIdx % 3 === 0 ? '🎵' : occ.seatIdx % 3 === 1 ? '💭' : '💡';

  return (
    <group 
      position={position} 
      rotation={[0, rotation, 0]} 
      ref={group}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      {/* Body */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.5, 4, 16]} />
        <GhibliMaterial color={color} />
        <Outlines thickness={0.015} color="#292524" />
      </mesh>

      {/* Head Group (Head, Face, Accessories) */}
      <group position={[0, 1.45, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.3, 16, 16]} />
          <GhibliMaterial color={occ.isUser ? '#fef08a' : '#f8fafc'} />
          <Outlines thickness={0.015} color="#292524" />
        </mesh>
        <CharacterFace />
        <CharacterAccessory seed={occ.seatIdx} isUser={occ.isUser} accent={accent} />
      </group>
      
      <mesh position={[0, 0.75, 0.4]} rotation={[0, Math.PI, 0]} castShadow>
        <boxGeometry args={[0.6, 0.04, 0.4]} />
        <GhibliMaterial color="#1e293b" />
        <Outlines thickness={0.01} color="#000" />
      </mesh>
      <mesh position={[0, 0.95, 0.58]} rotation={[-0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.6, 0.4, 0.04]} />
        <GhibliMaterial color="#1e293b" />
        <Outlines thickness={0.01} color="#000" />
      </mesh>
      <mesh position={[0, 0.95, 0.55]} rotation={[-0.2, 0, 0]}>
        <planeGeometry args={[0.55, 0.35]} />
        <meshBasicMaterial color={occ.isUser ? accent : '#7dd3fc'} />
      </mesh>

      {isDarkEnv && (
        <pointLight position={[0, 1.2, 0.4]} distance={2.5} intensity={occ.isUser ? 1.0 : 0.5} color={occ.isUser ? accent : '#7dd3fc'} />
      )}

      <Html position={[0, 2.1, 0]} center zIndexRange={[100, 0]}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          animation: `thoughtFloat ${3 + (occ.seatIdx % 2)}s ease-in-out infinite`,
          animationDelay: `${occ.seatIdx * 0.4}s`,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 800, color: occ.isUser ? accent : '#fff',
            background: 'rgba(15,23,42,0.85)', padding: '4px 10px', borderRadius: 16,
            whiteSpace: 'nowrap', letterSpacing: '0.5px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
            border: `1px solid ${occ.isUser ? accent : 'rgba(255,255,255,0.1)'}`,
          }}>
            {fmtMin(occ.elapsedSeconds)} <span style={{ marginLeft: 4 }}>{icon}</span>
          </div>
        </div>
      </Html>
    </group>
  );
};


