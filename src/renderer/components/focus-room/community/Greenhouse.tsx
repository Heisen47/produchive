import React, { useMemo } from 'react';
import { Outlines } from '@react-three/drei';
import { Occupant, GhibliMaterial, PottedPlant, PendantLamp } from '../Shared3D';
import { CommunityScene, Vec3 } from './CommunityScene';
import { Precipitation } from './Precipitation';

/** Rainy Greenhouse: a glass conservatory full of plants, with rain falling outside. */

const FRAME = '#2f5d46';
const GLASS = '#e0f2f1';

/** A glass wall: thin frame bars over a faint pane. */
const GlassWall = ({ position, rotation = 0, width = 20, height = 9 }: { position: Vec3; rotation?: number; width?: number; height?: number }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    <mesh position={[0, height / 2, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color={GLASS} transparent opacity={0.22} depthWrite={false} />
    </mesh>
    {Array.from({ length: Math.round(width / 2.5) + 1 }, (_, i) => (
      <mesh key={`v${i}`} position={[-width / 2 + i * 2.5, height / 2, 0.02]}>
        <boxGeometry args={[0.12, height, 0.12]} />
        <GhibliMaterial color={FRAME} />
      </mesh>
    ))}
    {[0.05, height / 3, (2 * height) / 3, height].map((y, i) => (
      <mesh key={`h${i}`} position={[0, y, 0.02]}>
        <boxGeometry args={[width, 0.12, 0.12]} />
        <GhibliMaterial color={FRAME} />
      </mesh>
    ))}
  </group>
);

/** Rain streaking down the glass, outside the room. */
const RainOutside = () => (
  <>
    <Precipitation kind="rain" count={260} area={[30, 14, 3]} center={[0, 7, -12]} />
    <Precipitation kind="rain" count={260} area={[3, 14, 30]} center={[-12, 7, 0]} />
  </>
);

const Fern = ({ position, scale = 1 }: { position: Vec3; scale?: number }) => {
  const leaves = useMemo(() => Array.from({ length: 7 }, (_, i) => (i / 7) * Math.PI * 2), []);
  return (
    <group position={position} scale={scale}>
      {leaves.map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * 0.35, 0.45, Math.cos(a) * 0.35]} rotation={[Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9]}>
          <boxGeometry args={[0.18, 0.9, 0.04]} />
          <GhibliMaterial color={i % 2 ? '#3f7d4f' : '#4d9a5f'} />
        </mesh>
      ))}
    </group>
  );
};

const HangingPlant = ({ position }: { position: Vec3 }) => (
  <group position={position}>
    <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.01, 0.01, 2, 4]} /><GhibliMaterial color="#1c1917" /></mesh>
    <mesh><cylinderGeometry args={[0.3, 0.22, 0.35, 12]} /><GhibliMaterial color="#c2410c" /></mesh>
    {[-0.2, 0, 0.2].map((x, i) => (
      <mesh key={i} position={[x, -0.45 - i * 0.1, 0.05 * i]}>
        <boxGeometry args={[0.08, 0.8, 0.08]} />
        <GhibliMaterial color="#4d9a5f" />
      </mesh>
    ))}
  </group>
);

const PottingTable = ({ position }: { position: Vec3 }) => (
  <group position={position}>
    <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.7, 0.09, 1.7]} />
      <GhibliMaterial color="#a8794b" />
      <Outlines thickness={0.012} color="#3f2a17" />
    </mesh>
    {[[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.38, z]} castShadow>
        <boxGeometry args={[0.09, 0.76, 0.09]} />
        <GhibliMaterial color="#6b4a2e" />
      </mesh>
    ))}
    {/* Seedling tray */}
    <mesh position={[0, 0.86, 0]}><boxGeometry args={[0.6, 0.08, 0.35]} /><GhibliMaterial color="#57534e" /></mesh>
    {[-0.2, 0, 0.2].map((x, i) => (
      <mesh key={i} position={[x, 0.96, 0]}><sphereGeometry args={[0.08, 8, 6]} /><GhibliMaterial color="#65a30d" /></mesh>
    ))}
  </group>
);

const Bench = ({ position, rotation }: { position: Vec3; rotation: number }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[0.55, 0.07, 0.45]} /><GhibliMaterial color="#8b5e3c" /></mesh>
    <mesh position={[0, 0.22, 0]}><boxGeometry args={[0.45, 0.44, 0.35]} /><GhibliMaterial color="#6b4a2e" /></mesh>
  </group>
);

export const GreenhouseEnv = ({ occupants, accent }: { occupants: Occupant[]; accent: string }) => (
  <CommunityScene occupants={occupants} accent={accent} Table={PottingTable} Seat={Bench} tableHeight={0.83} glowColor="#fef9c3" darkEnv={false}>
    <ambientLight intensity={0.75} color="#e2f0e6" />
    <directionalLight position={[6, 16, 8]} intensity={0.6} color="#f1f5f9" castShadow />
    <hemisphereLight args={['#dbeafe', '#3f6212', 0.5]} />

    {/* Grey rainy sky beyond the glass */}
    <mesh position={[0, 10, -18]}><planeGeometry args={[70, 30]} /><meshBasicMaterial color="#94a3b8" fog={false} /></mesh>
    <mesh position={[-18, 10, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[70, 30]} /><meshBasicMaterial color="#94a3b8" fog={false} /></mesh>
    <RainOutside />

    {/* Stone tile floor */}
    {Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => (
      <mesh key={`${i}-${j}`} position={[-8.3 + i * 3.3, 0.02, -8.3 + j * 3.3]} receiveShadow>
        <boxGeometry args={[3.2, 0.04, 3.2]} />
        <GhibliMaterial color={(i + j) % 2 ? '#a3a98f' : '#949b80'} />
      </mesh>
    )))}

    <GlassWall position={[0, 0, -10]} />
    <GlassWall position={[-10, 0, 0]} rotation={Math.PI / 2} />

    {/* Planter beds along the glass */}
    <mesh position={[0, 0.35, -9.2]} castShadow><boxGeometry args={[18, 0.7, 1.1]} /><GhibliMaterial color="#78350f" /></mesh>
    <mesh position={[-9.2, 0.35, 0]} castShadow><boxGeometry args={[1.1, 0.7, 18]} /><GhibliMaterial color="#78350f" /></mesh>
    {Array.from({ length: 8 }, (_, i) => <Fern key={`b${i}`} position={[-8 + i * 2.2, 0.7, -9.2]} scale={1 + (i % 3) * 0.25} />)}
    {Array.from({ length: 7 }, (_, i) => <Fern key={`l${i}`} position={[-9.2, 0.7, -6 + i * 2.2]} scale={1 + (i % 2) * 0.3} />)}

    <PottedPlant position={[7.5, 0, -7]} />
    <PottedPlant position={[-7, 0, 7.5]} />
    <HangingPlant position={[0.5, 5, -5]} />
    <HangingPlant position={[-5.5, 5, 1]} />
    <HangingPlant position={[5.5, 5, 3.5]} />
    <PendantLamp position={[1.5, 2.2, 1.5]} />
  </CommunityScene>
);
