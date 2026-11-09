import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { Occupant, GhibliMaterial, PottedPlant, CoffeeMug } from '../Shared3D';
import { CommunityScene, Vec3 } from './CommunityScene';

/** Waterfall Café: an open wooden terrace beside a waterfall pouring into a misty pool. */

const ROCK = '#4b6358';
const ROCK_DARK = '#3b4f45';

/** Streams of water sliding down the cliff, looping. */
const Waterfall = ({ position, width = 4, height = 11 }: { position: Vec3; width?: number; height?: number }) => {
  const strands = useMemo(() => Array.from({ length: 9 }, (_, i) => ({
    x: (i / 8 - 0.5) * width,
    w: 0.25 + ((i * 37) % 5) * 0.06,
    speed: 2.5 + ((i * 13) % 7) * 0.35,
    offset: (i * 0.37) % 1,
  })), [width]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    strands.forEach((s, i) => {
      const m = refs.current[i];
      if (!m) return;
      // Each strand is a short bright streak that slides down the sheet of water.
      const y = ((t * s.speed / height + s.offset) % 1);
      m.position.y = height / 2 - y * height;
    });
  });
  return (
    <group position={position}>
      {/* The sheet of water */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#bae6fd" transparent opacity={0.85} />
      </mesh>
      {strands.map((s, i) => (
        <mesh key={i} ref={el => { refs.current[i] = el; }} position={[s.x, 0, 0.05]}>
          <planeGeometry args={[s.w, 1.6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
        </mesh>
      ))}
    </group>
  );
};

const Cliff = () => {
  const rocks = useMemo(() => {
    const out: { p: Vec3; s: number; c: string }[] = [];
    let seed = 3;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 26; i++) {
      const alongBack = i < 15;
      const t = alongBack ? i / 14 : (i - 15) / 10;
      const p: Vec3 = alongBack
        ? [-14 + t * 28, 1 + rand() * 9, -13 - rand() * 2]
        : [-13 - rand() * 2, 1 + rand() * 7, -10 + t * 22];
      out.push({ p, s: 2 + rand() * 2.5, c: rand() > 0.5 ? ROCK : ROCK_DARK });
    }
    return out;
  }, []);
  return (
    <group>
      {rocks.map((r, i) => (
        <mesh key={i} position={r.p} rotation={[r.s, r.s * 2, 0]}>
          <dodecahedronGeometry args={[r.s, 0]} />
          <GhibliMaterial color={r.c} />
        </mesh>
      ))}
      {/* Moss and ferns along the top */}
      {rocks.filter((_, i) => i % 3 === 0).map((r, i) => (
        <mesh key={`m${i}`} position={[r.p[0], r.p[1] + r.s * 0.8, r.p[2]]}>
          <sphereGeometry args={[r.s * 0.55, 10, 8]} />
          <GhibliMaterial color="#4d7c0f" />
        </mesh>
      ))}
    </group>
  );
};

const Deck = () => (
  <group>
    {Array.from({ length: 12 }, (_, i) => (
      <mesh key={i} position={[0, 0.03, -8.5 + i * 1.6]} receiveShadow>
        <boxGeometry args={[19, 0.06, 1.5]} />
        <GhibliMaterial color={i % 2 ? '#8b5e3c' : '#7c5233'} />
      </mesh>
    ))}
    {/* Railing along the back edge of the deck */}
    {Array.from({ length: 6 }, (_, i) => (
      <mesh key={`p${i}`} position={[-2 + i * 2, 0.5, -9.3]} castShadow>
        <boxGeometry args={[0.12, 1, 0.12]} />
        <GhibliMaterial color="#5c3d25" />
      </mesh>
    ))}
    <mesh position={[3, 1, -9.3]}>
      <boxGeometry args={[10, 0.1, 0.12]} />
      <GhibliMaterial color="#5c3d25" />
    </mesh>
  </group>
);

const CafeTable = ({ position }: { position: Vec3 }) => (
  <group position={position}>
    <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.85, 0.85, 0.07, 24]} />
      <GhibliMaterial color="#f5f0e6" />
      <Outlines thickness={0.012} color="#57534e" />
    </mesh>
    <mesh position={[0, 0.38, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.06, 0.75, 8]} />
      <GhibliMaterial color="#292524" />
    </mesh>
    <mesh position={[0, 0.02, 0]}>
      <cylinderGeometry args={[0.35, 0.35, 0.04, 16]} />
      <GhibliMaterial color="#292524" />
    </mesh>
    <CoffeeMug position={[0.2, 0.79, -0.15]} />
    {/* Parasol */}
    <mesh position={[0, 1.8, 0]}>
      <cylinderGeometry args={[0.03, 0.03, 2.2, 6]} />
      <GhibliMaterial color="#e7e5e4" />
    </mesh>
    <mesh position={[0, 2.9, 0]} castShadow>
      <coneGeometry args={[1.4, 0.5, 8, 1, true]} />
      <GhibliMaterial color="#0f766e" side={THREE.DoubleSide} />
    </mesh>
  </group>
);

const Stool = ({ position, rotation }: { position: Vec3; rotation: number }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    <mesh position={[0, 0.45, 0]} castShadow>
      <cylinderGeometry args={[0.28, 0.28, 0.08, 14]} />
      <GhibliMaterial color="#a16207" />
    </mesh>
    <mesh position={[0, 0.22, 0]}>
      <cylinderGeometry args={[0.05, 0.08, 0.45, 8]} />
      <GhibliMaterial color="#292524" />
    </mesh>
  </group>
);

export const WaterfallCafeEnv = ({ occupants, accent }: { occupants: Occupant[]; accent: string }) => (
  <CommunityScene occupants={occupants} accent={accent} Table={CafeTable} Seat={Stool} tableHeight={0.78} glowColor="#fef3c7" darkEnv={false}>
    <ambientLight intensity={0.9} color="#ecfeff" />
    <directionalLight position={[10, 18, 6]} intensity={1.1} color="#fff7ed" castShadow />
    <hemisphereLight args={['#bae6fd', '#4b6358', 0.5]} />

    {/* Sky behind the cliffs */}
    <mesh position={[0, 10, -19]}>
      <planeGeometry args={[70, 30]} />
      <meshBasicMaterial color="#cdeefa" fog={false} />
    </mesh>

    <Cliff />
    {/* The waterfall pours down the left cliff, inside the default camera view. */}
    <group position={[-9, 0, -1.2]} rotation={[0, Math.PI / 2, 0]}>
      <Waterfall position={[0, 3.4, 0]} width={3.4} height={6.8} />
      {[[-2.5, 2.4, -0.4, 1.7], [2.5, 2.8, -0.4, 1.8], [-2.3, 5.6, -0.6, 1.6], [2.4, 6, -0.6, 1.5], [0, 7.6, -0.8, 2], [-3.1, 0.8, 0.2, 1.2], [3, 0.8, 0.2, 1.3]].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[r, r * 1.7, 0]}>
          <dodecahedronGeometry args={[r, 0]} />
          <GhibliMaterial color={i % 2 ? ROCK : ROCK_DARK} />
        </mesh>
      ))}
      {[[-2.2, 4.2], [2.3, 4.6], [0.4, 9]].map(([x, y], i) => (
        <mesh key={`f${i}`} position={[x, y, 0.3]}><sphereGeometry args={[0.9, 10, 8]} /><GhibliMaterial color="#4d7c0f" /></mesh>
      ))}
    </group>
    {/* Plunge pool and mist where the water lands */}
    <mesh position={[-7.4, 0.08, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[2.1, 32]} />
      <meshBasicMaterial color="#38bdf8" />
    </mesh>
    {[0, 1, 2, 3, 4, 5, 6].map(i => {
      const a = -Math.PI * 0.4 + (i / 6) * Math.PI * 0.8;
      return (
        <mesh key={`pr${i}`} position={[-7.4 + Math.cos(a) * 2.2, 0.2, -1.2 + Math.sin(a) * 2.2]}>
          <dodecahedronGeometry args={[0.45, 0]} />
          <GhibliMaterial color="#6b7f75" />
        </mesh>
      );
    })}
    <Sparkles count={80} scale={[3, 2.5, 3.5]} position={[-7.8, 1.2, -1.2]} size={9} speed={0.7} opacity={0.75} color="#ffffff" />
    <Sparkles count={40} scale={[18, 6, 18]} position={[0, 3, 0]} size={2} speed={0.2} opacity={0.5} color="#a7f3d0" />

    <Deck />
    <PottedPlant position={[7.5, 0, -7.5]} />
    <PottedPlant position={[-3, 0, -8.6]} />
    <PottedPlant position={[-8.5, 0, 6]} />
  </CommunityScene>
);
