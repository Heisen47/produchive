import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { Occupant, GhibliMaterial } from '../Shared3D';
import { CommunityScene, Vec3 } from './CommunityScene';

/** Zen Tea Garden: a tatami pavilion beside a koi pond, under falling cherry blossoms. */

const BLOSSOM = '#f9a8d4';

const CherryTree = ({ position, scale = 1 }: { position: Vec3; scale?: number }) => {
  const puffs = useMemo(() => [
    [0, 3.4, 0, 1.3], [0.9, 3.1, 0.3, 1], [-0.9, 3.2, -0.2, 1.05], [0.3, 3.9, -0.6, 0.9], [-0.4, 3.8, 0.7, 0.85],
  ] as const, []);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.4, 0]} rotation={[0, 0, 0.08]} castShadow>
        <cylinderGeometry args={[0.18, 0.3, 2.8, 8]} />
        <GhibliMaterial color="#5b3a29" />
      </mesh>
      {puffs.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <sphereGeometry args={[r, 14, 12]} />
          <GhibliMaterial color={i % 2 ? '#fbcfe8' : BLOSSOM} />
        </mesh>
      ))}
    </group>
  );
};

const StoneLantern = ({ position }: { position: Vec3 }) => (
  <group position={position}>
    <mesh position={[0, 0.15, 0]}><boxGeometry args={[0.7, 0.3, 0.7]} /><GhibliMaterial color="#a8a29e" /></mesh>
    <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.15, 0.18, 0.8, 8]} /><GhibliMaterial color="#a8a29e" /></mesh>
    <mesh position={[0, 1.25, 0]}><boxGeometry args={[0.55, 0.4, 0.55]} /><GhibliMaterial color="#a8a29e" /></mesh>
    <mesh position={[0, 1.25, 0.28]}><planeGeometry args={[0.25, 0.22]} /><meshBasicMaterial color="#fde68a" /></mesh>
    <mesh position={[0, 1.6, 0]}><coneGeometry args={[0.55, 0.35, 4]} /><GhibliMaterial color="#78716c" /></mesh>
  </group>
);

const Koi = ({ radius, speed, phase, color, center }: { radius: number; speed: number; phase: number; color: string; center: Vec3 }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const a = clock.getElapsedTime() * speed + phase;
    ref.current.position.set(center[0] + Math.cos(a) * radius, 0.06, center[2] + Math.sin(a) * radius * 0.7);
    ref.current.rotation.y = -a;
  });
  return (
    <mesh ref={ref} scale={[0.35, 0.08, 0.14]}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
};

const Pond = ({ position }: { position: Vec3 }) => (
  <group>
    <mesh position={[position[0], 0.02, position[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.7, 1]}>
      <circleGeometry args={[3.2, 32]} />
      <meshBasicMaterial color="#60a5fa" />
    </mesh>
    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => {
      const a = (i / 10) * Math.PI * 2;
      return (
        <mesh key={i} position={[position[0] + Math.cos(a) * 3.3, 0.12, position[2] + Math.sin(a) * 2.3]}>
          <dodecahedronGeometry args={[0.32, 0]} />
          <GhibliMaterial color="#9ca3af" />
        </mesh>
      );
    })}
    <Koi center={position} radius={1.6} speed={0.35} phase={0} color="#fb923c" />
    <Koi center={position} radius={2.1} speed={-0.28} phase={2} color="#f8fafc" />
    <Koi center={position} radius={1.1} speed={0.45} phase={4} color="#ef4444" />
    {/* Lily pads */}
    {[[0.9, -0.6], [-1.4, 0.4], [1.8, 0.8]].map(([x, z], i) => (
      <mesh key={`p${i}`} position={[position[0] + x, 0.04, position[2] + z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 12]} />
        <meshBasicMaterial color="#4d7c0f" />
      </mesh>
    ))}
  </group>
);

const BambooFence = ({ position, rotation = 0, length = 20 }: { position: Vec3; rotation?: number; length?: number }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    {Array.from({ length: Math.round(length / 0.35) }, (_, i) => (
      <mesh key={i} position={[-length / 2 + i * 0.35, 1.3, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 2.6 + (i % 3) * 0.15, 6]} />
        <GhibliMaterial color={i % 2 ? '#a3a35c' : '#8f9150'} />
      </mesh>
    ))}
    {[0.6, 2].map((y, i) => (
      <mesh key={`r${i}`} position={[0, y, 0.15]}>
        <boxGeometry args={[length, 0.08, 0.08]} />
        <GhibliMaterial color="#5b3a29" />
      </mesh>
    ))}
  </group>
);

/** Tatami platform with dark borders. */
const Tatami = () => (
  <group>
    {Array.from({ length: 4 }, (_, i) => Array.from({ length: 2 }, (_, j) => (
      <mesh key={`${i}-${j}`} position={[-5 + i * 3.5, 0.06, -4 + j * 7]} receiveShadow>
        <boxGeometry args={[3.4, 0.12, 6.9]} />
        <GhibliMaterial color="#d9cf9c" />
        <Outlines thickness={0.02} color="#3f2a17" />
      </mesh>
    )))}
  </group>
);

const TeaTable = ({ position }: { position: Vec3 }) => (
  <group position={[position[0], 0.12, position[2]]}>
    <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.5, 0.08, 1.5]} />
      <GhibliMaterial color="#3f1d0f" />
      <Outlines thickness={0.012} color="#1c0a04" />
    </mesh>
    {[[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.17, z]}><boxGeometry args={[0.1, 0.34, 0.1]} /><GhibliMaterial color="#3f1d0f" /></mesh>
    ))}
    {/* Teapot and cups */}
    <mesh position={[0, 0.52, 0]}><sphereGeometry args={[0.16, 12, 10]} /><GhibliMaterial color="#e7e5e4" /></mesh>
    <mesh position={[0.18, 0.54, 0]} rotation={[0, 0, -0.9]}><cylinderGeometry args={[0.02, 0.03, 0.14, 6]} /><GhibliMaterial color="#e7e5e4" /></mesh>
  </group>
);

const Zabuton = ({ position, rotation }: { position: Vec3; rotation: number }) => (
  <mesh position={[position[0], 0.17, position[2]]} rotation={[0, rotation, 0]} castShadow>
    <boxGeometry args={[0.7, 0.1, 0.7]} />
    <GhibliMaterial color="#7f1d1d" />
  </mesh>
);

export const TeaGardenEnv = ({ occupants, accent }: { occupants: Occupant[]; accent: string }) => (
  <CommunityScene occupants={occupants} accent={accent} Table={TeaTable} Seat={Zabuton} tableHeight={0.54} glowColor="#fde68a" darkEnv={false} floorY={0.12}>
    <ambientLight intensity={0.9} color="#fff1f2" />
    <directionalLight position={[8, 14, 6]} intensity={0.9} color="#fff7ed" castShadow />
    <hemisphereLight args={['#fce7f3', '#84a35c', 0.45]} />

    <mesh position={[0, 10, -20]}><planeGeometry args={[70, 30]} /><meshBasicMaterial color="#fbe8e4" fog={false} /></mesh>
    <mesh position={[-20, 10, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[70, 30]} /><meshBasicMaterial color="#f8ece8" fog={false} /></mesh>

    {/* Raked gravel around the pavilion */}
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[40, 40]} /><meshBasicMaterial color="#e7e0cf" /></mesh>
    <Tatami />
    <BambooFence position={[0, 0, -10]} />
    <BambooFence position={[-10, 0, 0]} rotation={Math.PI / 2} />

    <Pond position={[6, 0, -5.5]} />
    <CherryTree position={[-8, 0, -1]} scale={1.3} />
    <CherryTree position={[-7.5, 0, -8]} />
    <StoneLantern position={[3, 0, -8.5]} />
    <StoneLantern position={[-8.5, 0, -2]} />

    {/* Falling petals */}
    <Sparkles count={120} scale={[20, 8, 20]} position={[0, 4, 0]} size={5} speed={0.35} opacity={0.9} color={BLOSSOM} />
  </CommunityScene>
);
