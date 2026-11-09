import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { Occupant, GhibliMaterial } from '../Shared3D';
import { CommunityScene, Vec3 } from './CommunityScene';

/** Rooftop Observatory: a night rooftop with a dome, a telescope, string lights and the city below. */

const SKY = '#0b1026';
const PARAPET = '#312e81';
const WARM = '#fde68a';

const SkyPanel = ({ position, rotation = [0, 0, 0], withMoon = false }: { position: Vec3; rotation?: Vec3; withMoon?: boolean }) => (
  <group position={position} rotation={rotation}>
    <mesh>
      <planeGeometry args={[60, 30]} />
      <meshBasicMaterial color={SKY} fog={false} />
    </mesh>
    <Sparkles position={[0, 4, 0.2]} count={160} scale={[60, 22, 0.1]} size={4} speed={0.15} opacity={1} color="#e0e7ff" />
    {withMoon && (
      <group position={[8, 9, 0.3]}>
        <mesh><circleGeometry args={[2, 32]} /><meshBasicMaterial color={WARM} fog={false} /></mesh>
        <mesh position={[0, 0, -0.05]}><circleGeometry args={[3.2, 32]} /><meshBasicMaterial color={WARM} transparent opacity={0.12} fog={false} /></mesh>
      </group>
    )}
  </group>
);

const ShootingStar = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() % 9) / 9;
    const active = t < 0.12;
    ref.current.visible = active;
    if (active) {
      const p = t / 0.12;
      ref.current.position.set(-12 + p * 18, 14 - p * 5, -17.5);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 1 - p;
    }
  });
  return (
    <mesh ref={ref} rotation={[0, 0, -0.27]}>
      <planeGeometry args={[2.2, 0.06]} />
      <meshBasicMaterial color="#ffffff" transparent fog={false} />
    </mesh>
  );
};

const Skyline = () => {
  const buildings = useMemo(() => {
    let seed = 7;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    return Array.from({ length: 9 }, (_, i) => {
      const h = 3 + rand() * 7;
      return { x: -16 + i * 4, w: 2.5 + rand(), h, lit: Array.from({ length: 4 }, () => [rand() - 0.5, 0.2 + rand() * 0.7]) };
    });
  }, []);
  return (
    <group>
      {buildings.map((b, i) => (
        <group key={i} position={[b.x, b.h / 2 - 3, -15]}>
          <mesh><boxGeometry args={[b.w, b.h, 2]} /><meshBasicMaterial color="#111633" /></mesh>
          {b.lit.map(([fx, fy], j) => (
            <mesh key={j} position={[fx * b.w * 0.8, (fy - 0.5) * b.h, 1.01]}>
              <planeGeometry args={[0.25, 0.3]} />
              <meshBasicMaterial color={WARM} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

const Telescope = ({ position }: { position: Vec3 }) => {
  const head = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (head.current) head.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.15) * 0.6;
  });
  return (
    <group position={position}>
      {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * 0.35, 0.75, Math.cos(a) * 0.35]} rotation={[Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 1.6, 8]} />
          <GhibliMaterial color="#94a3b8" />
        </mesh>
      ))}
      <group ref={head} position={[0, 1.6, 0]}>
        <mesh rotation={[0, 0, Math.PI / 3]} position={[0.3, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.24, 1.8, 16]} />
          <GhibliMaterial color="#e2e8f0" />
          <Outlines thickness={0.015} color="#1e293b" />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 3]} position={[1.05, 0.63, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.2, 16]} />
          <GhibliMaterial color="#334155" />
        </mesh>
      </group>
    </group>
  );
};

const Dome = ({ position }: { position: Vec3 }) => (
  <group position={position}>
    <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[2.2, 2.2, 2.4, 24]} />
      <GhibliMaterial color="#cbd5e1" />
      <Outlines thickness={0.02} color="#1e293b" />
    </mesh>
    <mesh position={[0, 2.4, 0]} castShadow>
      <sphereGeometry args={[2.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <GhibliMaterial color="#e2e8f0" />
      <Outlines thickness={0.02} color="#1e293b" />
    </mesh>
    <mesh position={[1.2, 3.3, 1.2]} rotation={[0, Math.PI / 4, -0.5]}>
      <boxGeometry args={[0.5, 1.6, 0.1]} />
      <meshBasicMaterial color={WARM} />
    </mesh>
  </group>
);

const StringLights = ({ from, to, height = 3.6, sag = 0.8, bulbs = 12 }: { from: [number, number]; to: [number, number]; height?: number; sag?: number; bulbs?: number }) => {
  const points = useMemo(() => Array.from({ length: bulbs }, (_, i) => {
    const t = (i + 0.5) / bulbs;
    return [from[0] + (to[0] - from[0]) * t, height - sag * 4 * t * (1 - t), from[1] + (to[1] - from[1]) * t] as Vec3;
  }), [from, to, height, sag, bulbs]);
  return (
    <group>
      {[from, to].map(([x, z], i) => (
        <mesh key={i} position={[x, height / 2, z]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, height, 8]} />
          <GhibliMaterial color="#1e293b" />
        </mesh>
      ))}
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial color={i % 3 === 0 ? '#fca5a5' : WARM} />
        </mesh>
      ))}
    </group>
  );
};

const LowTable = ({ position }: { position: Vec3 }) => (
  <group position={position}>
    <mesh position={[0, 0.02, 0]} receiveShadow>
      <cylinderGeometry args={[2.1, 2.1, 0.04, 32]} />
      <GhibliMaterial color="#3730a3" />
    </mesh>
    <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.85, 0.85, 0.08, 24]} />
      <GhibliMaterial color="#78350f" />
      <Outlines thickness={0.015} color="#1c1917" />
    </mesh>
    <mesh position={[0, 0.2, 0]} castShadow>
      <cylinderGeometry args={[0.12, 0.18, 0.4, 12]} />
      <GhibliMaterial color="#451a03" />
    </mesh>
  </group>
);

const CUSHIONS = ['#9d174d', '#0e7490', '#a16207', '#4d7c0f'];
const Cushion = ({ position, rotation }: { position: Vec3; rotation: number }) => (
  <mesh position={[position[0], 0.08, position[2]]} rotation={[0, rotation, 0]} castShadow>
    <cylinderGeometry args={[0.45, 0.5, 0.16, 16]} />
    <GhibliMaterial color={CUSHIONS[Math.abs(Math.round(position[0] * 3 + position[2])) % CUSHIONS.length]} />
  </mesh>
);

export const ObservatoryEnv = ({ occupants, accent }: { occupants: Occupant[]; accent: string }) => (
  <CommunityScene occupants={occupants} accent={accent} Table={LowTable} Seat={Cushion} tableHeight={0.46} glowColor={WARM}>
    <ambientLight intensity={0.55} color="#6366f1" />
    <directionalLight position={[8, 15, 4]} intensity={0.5} color="#c7d2fe" castShadow />
    <hemisphereLight args={['#312e81', '#0b1026', 0.4]} />

    <SkyPanel position={[0, 8, -18]} withMoon />
    <SkyPanel position={[-18, 8, 0]} rotation={[0, Math.PI / 2, 0]} />
    <ShootingStar />
    <Skyline />
    <Sparkles count={50} scale={[18, 4, 18]} position={[0, 2, 0]} size={3} speed={0.3} opacity={0.8} color={WARM} />

    <mesh position={[0, 0.6, -10]} receiveShadow castShadow>
      <boxGeometry args={[20.6, 1.2, 0.6]} />
      <GhibliMaterial color={PARAPET} />
      <Outlines thickness={0.02} color="#0b1026" />
    </mesh>
    <mesh position={[-10, 0.6, 0]} receiveShadow castShadow>
      <boxGeometry args={[0.6, 1.2, 20]} />
      <GhibliMaterial color={PARAPET} />
      <Outlines thickness={0.02} color="#0b1026" />
    </mesh>

    <Dome position={[-6.8, 0, -6.8]} />
    <Telescope position={[5.5, 0, -5.5]} />
    <StringLights from={[-7, -7]} to={[7, -7]} />
    <StringLights from={[-7, -7]} to={[-7, 7]} />
  </CommunityScene>
);
