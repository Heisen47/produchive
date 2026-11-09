import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { Occupant, GhibliMaterial } from '../Shared3D';
import { CommunityScene, Vec3 } from './CommunityScene';

/** Misty Lakeside Dock: a wooden dock on a still lake at dawn, with mist drifting over the water. */

const WATER = '#5b9ac0';

const Water = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.18 + Math.sin(clock.getElapsedTime() * 0.6) * 0.05;
  });
  return (
    <group>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial color={WATER} />
      </mesh>
      {/* Soft shimmer on the surface */}
      <mesh ref={ref} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial color="#e0f2fe" transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  );
};

/** Wide, faint sheets of mist that slowly slide across the lake. */
const Mist = () => {
  const sheets = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ z: -14 + i * 2.2, y: 0.4 + (i % 3) * 0.35, speed: 0.15 + (i % 4) * 0.05, phase: i * 1.7 })), []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    sheets.forEach((s, i) => {
      const m = refs.current[i];
      if (m) m.position.x = Math.sin(t * s.speed + s.phase) * 4;
    });
  });
  return (
    <group>
      {sheets.map((s, i) => (
        <mesh key={i} ref={el => { refs.current[i] = el; }} position={[0, s.y, s.z]}>
          <planeGeometry args={[40, 1.4]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

const Pine = ({ position, scale = 1 }: { position: Vec3; scale?: number }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.12, 0.15, 1, 6]} /><GhibliMaterial color="#5b3a29" /></mesh>
    <mesh position={[0, 1.6, 0]}><coneGeometry args={[0.9, 1.8, 8]} /><GhibliMaterial color="#2f5d46" /></mesh>
    <mesh position={[0, 2.5, 0]}><coneGeometry args={[0.65, 1.4, 8]} /><GhibliMaterial color="#3b6e55" /></mesh>
  </group>
);

const FarShore = () => {
  const pines = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ x: -20 + i * 2.6, s: 1.4 + ((i * 7) % 5) * 0.25 })), []);
  return (
    <group>
      {/* Hills */}
      <mesh position={[-8, 0, -22]}><coneGeometry args={[9, 8, 6]} /><GhibliMaterial color="#6b8f7e" /></mesh>
      <mesh position={[6, 0, -24]}><coneGeometry args={[11, 10, 6]} /><GhibliMaterial color="#5a7d6c" /></mesh>
      <mesh position={[-22, 0, -6]}><coneGeometry args={[8, 7, 6]} /><GhibliMaterial color="#6b8f7e" /></mesh>
      {pines.map((p, i) => <Pine key={i} position={[p.x, 0, -16]} scale={p.s} />)}
      {pines.slice(0, 10).map((p, i) => <Pine key={`l${i}`} position={[-16, 0, -14 + i * 2.8]} scale={p.s} />)}
    </group>
  );
};

const Rowboat = () => {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.x = 5 + Math.sin(t * 0.05) * 3;
    ref.current.rotation.z = Math.sin(t * 0.8) * 0.03;
    ref.current.position.y = 0.15 + Math.sin(t * 0.9) * 0.04;
  });
  return (
    <group ref={ref} position={[5, 0.15, -10]} rotation={[0, 0.4, 0]}>
      <mesh><boxGeometry args={[2.4, 0.35, 0.9]} /><GhibliMaterial color="#9a3412" /><Outlines thickness={0.015} color="#431407" /></mesh>
      <mesh position={[0, 0.12, 0]}><boxGeometry args={[2.2, 0.15, 0.7]} /><GhibliMaterial color="#c2763c" /></mesh>
      <mesh position={[0.3, 0.3, 0.6]} rotation={[0.6, 0, 0.2]}><boxGeometry args={[0.06, 0.06, 1.6]} /><GhibliMaterial color="#d6a46b" /></mesh>
    </group>
  );
};

const Reeds = ({ position }: { position: Vec3 }) => (
  <group position={position}>
    {Array.from({ length: 7 }, (_, i) => (
      <mesh key={i} position={[(i - 3) * 0.12, 0.6, ((i * 5) % 3) * 0.1]} rotation={[0, 0, (i - 3) * 0.06]}>
        <cylinderGeometry args={[0.02, 0.03, 1.2 + (i % 3) * 0.2, 4]} />
        <GhibliMaterial color="#65803d" />
      </mesh>
    ))}
  </group>
);

const Dock = () => (
  <group>
    {Array.from({ length: 11 }, (_, i) => (
      <mesh key={i} position={[0.3, 0.12, -5.5 + i * 1.12]} receiveShadow castShadow>
        <boxGeometry args={[13.5, 0.12, 1.05]} />
        <GhibliMaterial color={i % 2 ? '#9c7350' : '#8b6444'} />
      </mesh>
    ))}
    {[[-6.3, -5.8], [6.9, -5.8], [-6.3, 6], [6.9, 6]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.3, z]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 1.2, 8]} />
        <GhibliMaterial color="#5c3d25" />
      </mesh>
    ))}
    {/* Hanging lantern posts at the dock corners */}
    {[[-6.3, -5.8], [6.9, -5.8]].map(([x, z], i) => (
      <group key={`l${i}`} position={[x, 0, z]}>
        <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.05, 0.05, 2.4, 6]} /><GhibliMaterial color="#3f2a17" /></mesh>
        <mesh position={[0, 2.85, 0]}><boxGeometry args={[0.28, 0.32, 0.28]} /><meshBasicMaterial color="#fde68a" /></mesh>
      </group>
    ))}
  </group>
);

const BarrelTable = ({ position }: { position: Vec3 }) => (
  <group position={[position[0], 0.18, position[2]]}>
    <mesh position={[0, 0.36, 0]} castShadow>
      <cylinderGeometry args={[0.45, 0.4, 0.72, 14]} />
      <GhibliMaterial color="#7c5233" />
      <Outlines thickness={0.012} color="#3f2a17" />
    </mesh>
    <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.85, 0.85, 0.07, 20]} />
      <GhibliMaterial color="#a8794b" />
    </mesh>
  </group>
);

const Stump = ({ position, rotation }: { position: Vec3; rotation: number }) => (
  <group position={[position[0], 0.18, position[2]]} rotation={[0, rotation, 0]}>
    <mesh position={[0, 0.22, 0]} castShadow><cylinderGeometry args={[0.28, 0.3, 0.44, 12]} /><GhibliMaterial color="#6b4a2e" /></mesh>
    <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.28, 0.28, 0.02, 12]} /><GhibliMaterial color="#d6b58a" /></mesh>
  </group>
);

export const LakesideEnv = ({ occupants, accent }: { occupants: Occupant[]; accent: string }) => (
  <CommunityScene occupants={occupants} accent={accent} Table={BarrelTable} Seat={Stump} tableHeight={0.98} glowColor="#fde68a" darkEnv={false} floorY={0.18}>
    <ambientLight intensity={0.85} color="#fdf2f8" />
    <directionalLight position={[-6, 8, -12]} intensity={0.9} color="#fed7aa" castShadow />
    <hemisphereLight args={['#fbcfe8', '#3b6e55', 0.45]} />

    {/* Dawn sky and sun */}
    <mesh position={[0, 10, -28]}><planeGeometry args={[90, 30]} /><meshBasicMaterial color="#f8d4c8" fog={false} /></mesh>
    <mesh position={[-28, 10, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[90, 30]} /><meshBasicMaterial color="#f3dcd4" fog={false} /></mesh>
    <mesh position={[3, 5, -27.5]}><circleGeometry args={[2.4, 32]} /><meshBasicMaterial color="#fde68a" fog={false} /></mesh>

    <Water />
    <FarShore />
    <Mist />
    <Rowboat />
    <Reeds position={[-7.5, 0, -7]} />
    <Reeds position={[8.5, 0, 4]} />
    <Reeds position={[-8, 0, 7.5]} />
    <Dock />
    <Sparkles count={30} scale={[16, 3, 16]} position={[0, 1.5, 0]} size={2} speed={0.2} opacity={0.5} color="#ffffff" />
  </CommunityScene>
);
