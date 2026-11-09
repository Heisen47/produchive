import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Occupant, Character, SmokePoof } from '../Shared3D';
import { SEATS_PER_TABLE, VISIBLE_TABLES } from '../../../lib/communityRooms';

/**
 * Shared layout for community rooms. Only the tables around you are drawn
 * (3 tables × 4 seats, local seats 0–11; see nearbyOccupants). Each scenery
 * supplies its backdrop, table and seat; this component places people,
 * glowing table lights and join/leave puffs.
 */

export type Vec3 = [number, number, number];

/** Table centres, chosen to fill the default isometric camera view. */
export const COMMUNITY_TABLES: { x: number; z: number }[] = [
  { x: -3, z: -2.5 },
  { x: 3.5, z: -0.5 },
  { x: -0.5, z: 3.8 },
];

const SEAT_RADIUS = 1.3;
/** Seat directions around a table: +x, +z, −x, −z (front seats first so they read clearly). */
const SEAT_DIRS: Array<[number, number]> = [[1, 0], [0, 1], [-1, 0], [0, -1]];

export function communitySeat(localSeat: number) {
  const table = COMMUNITY_TABLES[Math.floor(localSeat / SEATS_PER_TABLE) % VISIBLE_TABLES];
  const [dx, dz] = SEAT_DIRS[localSeat % SEATS_PER_TABLE];
  const angle = Math.atan2(dx, dz);
  return {
    table,
    pos: [table.x + dx * SEAT_RADIUS, 0, table.z + dz * SEAT_RADIUS] as Vec3,
    glowPos: [table.x + dx * 0.45, 0, table.z + dz * 0.45] as Vec3,
    /** Rotation that makes a person face the table. */
    rot: angle + Math.PI,
    /** Rotation for the seat itself (backrest away from the table). */
    seatRot: angle,
  };
}

/** A small light that glows on the table in front of each person. */
const Glow = ({ position, height, color }: { position: Vec3; height: number; color: string }) => {
  const halo = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!halo.current) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 2 + position[0] * 3) * 0.07;
    halo.current.scale.set(s, s, s);
  });
  return (
    <group position={[position[0], height, position[2]]}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.18, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={halo} position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.26, 10, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </group>
  );
};

export interface CommunitySceneProps {
  occupants: Occupant[];
  accent: string;
  /** Scenery drawn behind and around the tables. */
  children?: React.ReactNode;
  Table: React.FC<{ position: Vec3 }>;
  Seat: React.FC<{ position: Vec3; rotation: number }>;
  /** Table-top height, where the glows sit. */
  tableHeight: number;
  /** Glow colour for other people (yours uses the accent colour). */
  glowColor: string;
  /** Characters on dark backgrounds get lighter labels. */
  darkEnv?: boolean;
  /** Height of the floor people sit on (e.g. a raised dock or tatami). */
  floorY?: number;
}

export const CommunityScene = ({ occupants, accent, children, Table, Seat, tableHeight, glowColor, darkEnv = true, floorY = 0 }: CommunitySceneProps) => {
  const [poofs, setPoofs] = useState<{ id: string; pos: Vec3 }[]>([]);
  const prevRef = useRef<Occupant[]>([]);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev.length > 0) {
      const now = new Set(occupants.map(o => o.id));
      const before = new Set(prev.map(o => o.id));
      const add: { id: string; pos: Vec3 }[] = [];
      for (const o of occupants) if (!before.has(o.id) && !o.isUser) add.push({ id: `${o.id}-in-${Date.now()}`, pos: communitySeat(o.seatIdx).pos });
      for (const o of prev) if (!now.has(o.id)) add.push({ id: `${o.id}-out-${Date.now()}`, pos: communitySeat(o.seatIdx).pos });
      if (add.length) setPoofs(p => [...p, ...add]);
    }
    prevRef.current = occupants;
  }, [occupants]);

  const tablesInUse = useMemo(() => {
    const used = new Set<number>();
    for (const o of occupants) used.add(Math.floor(o.seatIdx / SEATS_PER_TABLE));
    return used;
  }, [occupants]);

  return (
    <group>
      {children}

      {COMMUNITY_TABLES.map((t, i) => (
        <group key={i}>
          <Table position={[t.x, 0, t.z]} />
          {/* One warm light per occupied table keeps the light count low. */}
          {tablesInUse.has(i) && (
            <pointLight position={[t.x, tableHeight + 1.2, t.z]} color={glowColor} intensity={3} distance={5} />
          )}
        </group>
      ))}

      {Array.from({ length: COMMUNITY_TABLES.length * SEATS_PER_TABLE }, (_, i) => {
        const s = communitySeat(i);
        return <Seat key={i} position={s.pos} rotation={s.seatRot} />;
      })}

      {occupants.map(o => {
        const s = communitySeat(o.seatIdx);
        return (
          <React.Fragment key={o.id}>
            <Glow position={s.glowPos} height={tableHeight} color={o.isUser ? accent : glowColor} />
            <Character occ={o} position={[s.pos[0], floorY, s.pos[2]]} rotation={s.rot} accent={accent} isDarkEnv={darkEnv} />
          </React.Fragment>
        );
      })}

      {poofs.map(p => (
        <SmokePoof
          key={p.id}
          position={[p.pos[0], floorY + 0.8, p.pos[2]]}
          onComplete={() => setPoofs(prev => prev.filter(x => x.id !== p.id))}
        />
      ))}
    </group>
  );
};
