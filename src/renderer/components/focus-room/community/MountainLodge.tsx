import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { Occupant, GhibliMaterial, Bookshelf } from '../Shared3D';
import { CommunityScene, Vec3 } from './CommunityScene';
import { Precipitation } from './Precipitation';

/** Snowy Mountain Lodge: a timber lodge with a crackling fireplace and a big window onto snowy peaks. */

const LOG = '#7a4e2d';
const LOG_DARK = '#5c3a21';

const LogWall = ({ position, rotation = 0, length = 20, height = 9, windowFrom, windowTo }: {
  position: Vec3; rotation?: number; length?: number; height?: number; windowFrom?: number; windowTo?: number;
}) => {
  const logs = Math.round(height / 0.55);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: logs }, (_, i) => {
        const y = 0.3 + i * 0.55;
        // Leave a gap for the window between windowFrom..windowTo along the wall, rows 3..11.
        if (windowFrom !== undefined && windowTo !== undefined && i >= 3 && i <= 11) {
          const leftLen = windowFrom + length / 2;
          const rightLen = length / 2 - windowTo;
          return (
            <group key={i}>
              <mesh position={[-length / 2 + leftLen / 2, y, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.28, 0.28, leftLen, 10]} />
                <GhibliMaterial color={i % 2 ? LOG : LOG_DARK} />
              </mesh>
              <mesh position={[length / 2 - rightLen / 2, y, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.28, 0.28, rightLen, 10]} />
                <GhibliMaterial color={i % 2 ? LOG : LOG_DARK} />
              </mesh>
            </group>
          );
        }
        return (
          <mesh key={i} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.28, 0.28, length, 10]} />
            <GhibliMaterial color={i % 2 ? LOG : LOG_DARK} />
          </mesh>
        );
      })}
    </group>
  );
};

/** What you see through the big window: night sky, snowy peaks and falling snow. */
const MountainView = () => (
  <group>
    <mesh position={[0, 8, -16]}><planeGeometry args={[60, 30]} /><meshBasicMaterial color="#1e293b" fog={false} /></mesh>
    <Sparkles position={[0, 11, -15.5]} count={60} scale={[30, 8, 0.1]} size={3} speed={0.1} color="#e0e7ff" />
    {[[-6, 9, 7], [2, 11, 8], [9, 8, 6]].map(([x, h, r], i) => (
      <group key={i} position={[x, 0, -14]}>
        <mesh position={[0, h / 2, 0]}><coneGeometry args={[r, h, 6]} /><meshBasicMaterial color={i % 2 ? '#64748b' : '#94a3b8'} /></mesh>
        <mesh position={[0, h - h * 0.15, 0.01]}><coneGeometry args={[r * 0.32, h * 0.3, 6]} /><meshBasicMaterial color="#f8fafc" /></mesh>
      </group>
    ))}
    {Array.from({ length: 10 }, (_, i) => (
      <mesh key={`t${i}`} position={[-10 + i * 2.3, 1.2, -12.5]}>
        <coneGeometry args={[0.7, 2.4, 7]} />
        <meshBasicMaterial color="#e2e8f0" />
      </mesh>
    ))}
    <Precipitation kind="snow" count={220} area={[26, 10, 3]} center={[0, 5, -12]} />
  </group>
);

const Fire = ({ position }: { position: Vec3 }) => {
  const flames = useRef<(THREE.Mesh | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    flames.current.forEach((f, i) => {
      if (!f) return;
      const s = 1 + Math.sin(t * (7 + i * 2) + i) * 0.15 + Math.sin(t * 13 + i * 3) * 0.08;
      f.scale.set(1, s, 1);
    });
    if (light.current) light.current.intensity = 6 + Math.sin(t * 9) * 0.8 + Math.sin(t * 17) * 0.5;
  });
  return (
    <group position={position}>
      {[['#f97316', 0.35, 0.9, 0], ['#fbbf24', 0.25, 0.7, 0.15], ['#fde68a', 0.14, 0.45, -0.1]].map(([c, r, h, x], i) => (
        <mesh key={i} ref={el => { flames.current[i] = el; }} position={[x as number, (h as number) / 2, 0.1 * i]}>
          <coneGeometry args={[r as number, h as number, 8]} />
          <meshBasicMaterial color={c as string} />
        </mesh>
      ))}
      <pointLight ref={light} position={[1, 1, 0]} color="#fb923c" intensity={6} distance={14} />
      <Sparkles count={20} scale={[0.8, 1.6, 0.6]} position={[0, 1, 0]} size={3} speed={1.2} color="#fdba74" />
    </group>
  );
};

const Fireplace = ({ position }: { position: Vec3 }) => (
  <group position={position} rotation={[0, Math.PI / 2, 0]}>
    <mesh position={[0, 2.5, 0]} castShadow>
      <boxGeometry args={[3.4, 5, 1.2]} />
      <GhibliMaterial color="#78716c" />
      <Outlines thickness={0.02} color="#292524" />
    </mesh>
    <mesh position={[0, 0.9, 0.61]}><boxGeometry args={[1.8, 1.5, 0.05]} /><meshBasicMaterial color="#1c1917" /></mesh>
    <mesh position={[0, 1.75, 0.7]}><boxGeometry args={[3.6, 0.18, 0.4]} /><GhibliMaterial color={LOG_DARK} /></mesh>
    <Fire position={[0, 0.25, 0.75]} />
  </group>
);

const Rug = () => (
  <mesh position={[0.3, 0.025, 0.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <circleGeometry args={[6.5, 40]} />
    <meshBasicMaterial color="#7f1d1d" />
  </mesh>
);

const WoodTable = ({ position }: { position: Vec3 }) => (
  <group position={position}>
    <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.9, 0.9, 0.12, 20]} />
      <GhibliMaterial color="#a0693e" />
      <Outlines thickness={0.012} color="#3f2a17" />
    </mesh>
    <mesh position={[0, 0.37, 0]} castShadow><cylinderGeometry args={[0.18, 0.28, 0.74, 10]} /><GhibliMaterial color={LOG_DARK} /></mesh>
  </group>
);

const Armchair = ({ position, rotation }: { position: Vec3; rotation: number }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[0.7, 0.3, 0.6]} /><GhibliMaterial color="#9a3412" /></mesh>
    <mesh position={[0, 0.65, 0.28]} castShadow><boxGeometry args={[0.7, 0.6, 0.12]} /><GhibliMaterial color="#9a3412" /></mesh>
  </group>
);

export const MountainLodgeEnv = ({ occupants, accent }: { occupants: Occupant[]; accent: string }) => (
  <CommunityScene occupants={occupants} accent={accent} Table={WoodTable} Seat={Armchair} tableHeight={0.81} glowColor="#fdba74">
    <ambientLight intensity={0.45} color="#fed7aa" />
    <hemisphereLight args={['#fde68a', '#292524', 0.35]} />

    <MountainView />

    {/* Plank floor */}
    {Array.from({ length: 12 }, (_, i) => (
      <mesh key={i} position={[0, 0.01, -9 + i * 1.6]} receiveShadow>
        <boxGeometry args={[20, 0.02, 1.55]} />
        <GhibliMaterial color={i % 2 ? '#6b4a33' : '#5f412c'} />
      </mesh>
    ))}
    <Rug />

    <LogWall position={[0, 0, -10]} windowFrom={-6} windowTo={6} />
    {/* Window frame */}
    <mesh position={[0, 1.8, -9.85]}><boxGeometry args={[12.3, 0.25, 0.3]} /><GhibliMaterial color={LOG_DARK} /></mesh>
    <mesh position={[0, 6.6, -9.85]}><boxGeometry args={[12.3, 0.25, 0.3]} /><GhibliMaterial color={LOG_DARK} /></mesh>
    {[-6, -2, 2, 6].map((x, i) => (
      <mesh key={i} position={[x, 4.2, -9.85]}><boxGeometry args={[0.2, 4.9, 0.3]} /><GhibliMaterial color={LOG_DARK} /></mesh>
    ))}
    <LogWall position={[-10, 0, 0]} rotation={Math.PI / 2} />

    <Fireplace position={[-9.3, 0, 1.5]} />
    <Bookshelf position={[-8.8, 0, -6.5]} rotation={Math.PI / 2} />
    <Bookshelf position={[-8.8, 0, 6.5]} rotation={Math.PI / 2} />
  </CommunityScene>
);
