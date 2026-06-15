import React, { useMemo } from 'react';
import { Sparkles, Outlines } from '@react-three/drei';
import { Occupant, GhibliMaterial, WallPoster, Desk, Character, WallClock, CoffeeMug, Bookshelf, PottedPlant, PendantLamp, SmokePoof } from './Shared3D';

const OutdoorScenery = () => (
  <group position={[14, 0, 0]}>
    {/* Ground */}
    <mesh position={[18, -0.1, 0]} rotation={[-Math.PI/2, 0, 0]}>
      <planeGeometry args={[40, 100]} />
      <meshBasicMaterial color="#16a34a" />
    </mesh>
    {/* Huge Sky wall */}
    <mesh position={[20, 15, 0]} rotation={[0, -Math.PI/2, 0]}>
      <planeGeometry args={[100, 40]} />
      <meshBasicMaterial color="#7dd3fc" />
    </mesh>
    {/* Sun */}
    <mesh position={[19.9, 18, -15]} rotation={[0, -Math.PI/2, 0]}>
      <circleGeometry args={[4, 32]} />
      <meshBasicMaterial color="#fef08a" />
    </mesh>

    {/* 3D Trees */}
    {[
      { z: -8, x: 2, scale: 1.2 },
      { z: -3, x: 5, scale: 1.5 },
      { z: 4, x: 3, scale: 1.3 },
      { z: 9, x: 6, scale: 1.6 },
    ].map((t, i) => (
      <group key={i} position={[t.x, 0, t.z]} scale={t.scale}>
        <mesh position={[0, 2, 0]}><cylinderGeometry args={[0.3, 0.5, 4]}/><meshBasicMaterial color="#78350f" /></mesh>
        <mesh position={[0, 4.5, 0]}><sphereGeometry args={[2, 16, 16]}/><meshBasicMaterial color="#15803d" /></mesh>
        <mesh position={[0.8, 5.5, 0.5]}><sphereGeometry args={[1.2, 16, 16]}/><meshBasicMaterial color="#22c55e" /></mesh>
      </group>
    ))}

    {/* Distant Hills */}
    <mesh position={[15, -2, -20]} scale={[1, 0.4, 1]}><sphereGeometry args={[15, 32, 32]}/><meshBasicMaterial color="#0d9488" /></mesh>
    <mesh position={[16, -2, 20]} scale={[1, 0.5, 1]}><sphereGeometry args={[18, 32, 32]}/><meshBasicMaterial color="#0f766e" /></mesh>
  </group>
);

const WindowFrame = ({ position }: { position: [number, number, number] }) => (
  <group position={position} rotation={[0, -Math.PI / 2, 0]}>
    {/* Glass Pane */}
    <mesh position={[0, 0, 0.25]}>
      <planeGeometry args={[6, 8]} />
      <meshBasicMaterial color="#ffffff" opacity={0.15} transparent />
    </mesh>
    {/* Mullions */}
    <mesh position={[0, 0, 0.3]}>
      <boxGeometry args={[6, 0.2, 0.1]} />
      <GhibliMaterial color="#0f172a" />
    </mesh>
    <mesh position={[0, 0, 0.3]}>
      <boxGeometry args={[0.2, 8, 0.1]} />
      <GhibliMaterial color="#0f172a" />
    </mesh>
    {/* Outer Frame */}
    <mesh position={[0, 3.9, 0.3]}><boxGeometry args={[6.2, 0.4, 0.1]} /><GhibliMaterial color="#0f172a" /></mesh>
    <mesh position={[0, -3.9, 0.3]}><boxGeometry args={[6.2, 0.4, 0.1]} /><GhibliMaterial color="#0f172a" /></mesh>
    <mesh position={[2.9, 0, 0.3]}><boxGeometry args={[0.4, 8, 0.1]} /><GhibliMaterial color="#0f172a" /></mesh>
    <mesh position={[-2.9, 0, 0.3]}><boxGeometry args={[0.4, 8, 0.1]} /><GhibliMaterial color="#0f172a" /></mesh>
  </group>
);

export const ClassroomEnv = ({ occupants, accent }: { occupants: Occupant[], accent: string }) => {
  const getSeatProps = (i: number): { pos: [number, number, number], deskPos: [number, number, number] } => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = (col - 1) * 4;
    const z = (row - 1) * -4 + 2; 
    return { pos: [x, 0, z], deskPos: [x, 0, z] };
  };

  const [poofs, setPoofs] = React.useState<{ id: string; pos: [number, number, number] }[]>([]);
  const prevOccupantsRef = React.useRef<Occupant[]>([]);

  React.useEffect(() => {
    const prev = prevOccupantsRef.current;
    if (prev.length > 0) {
      const currentIds = new Set(occupants.map(o => o.id));
      const prevIds = new Set(prev.map(o => o.id));

      // Joins
      occupants.forEach(occ => {
        if (!prevIds.has(occ.id)) {
          const { pos } = getSeatProps(occ.seatIdx);
          setPoofs(p => [...p, { id: `${occ.id}-join-${Date.now()}`, pos: [pos[0], pos[1], pos[2]] }]);
        }
      });

      // Leaves
      prev.forEach(occ => {
        if (!currentIds.has(occ.id)) {
          const { pos } = getSeatProps(occ.seatIdx);
          setPoofs(p => [...p, { id: `${occ.id}-leave-${Date.now()}`, pos: [pos[0], pos[1], pos[2]] }]);
        }
      });
    }
    prevOccupantsRef.current = occupants;
  }, [occupants]);

  return (
    <group>
      <ambientLight intensity={0.7} color="#fef08a" />
      <directionalLight position={[10, 15, -5]} intensity={1.2} color="#fffbeb" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0001} />
      
      <Sparkles count={100} scale={20} size={1.5} speed={0.1} opacity={0.4} color="#fef08a" />

      {/* Front Wall */}
      <mesh position={[0, 10, -10]} receiveShadow>
        <boxGeometry args={[100, 20, 0.5]} />
        <GhibliMaterial color="#fef08a" /> 
        <Outlines thickness={0.02} color="#ca8a04" />
      </mesh>
      
      {/* Right Wall with Holes for Windows */}
      <mesh position={[12, 1, 0]} receiveShadow><boxGeometry args={[0.5, 2, 100]} /><GhibliMaterial color="#fef08a" /><Outlines thickness={0.02} color="#ca8a04" /></mesh>
      <mesh position={[12, 15, 0]} receiveShadow><boxGeometry args={[0.5, 10, 100]} /><GhibliMaterial color="#fef08a" /><Outlines thickness={0.02} color="#ca8a04" /></mesh>
      <mesh position={[12, 6, -28.5]} receiveShadow><boxGeometry args={[0.5, 8, 43]} /><GhibliMaterial color="#fef08a" /><Outlines thickness={0.02} color="#ca8a04" /></mesh>
      <mesh position={[12, 6, 0]} receiveShadow><boxGeometry args={[0.5, 8, 2]} /><GhibliMaterial color="#fef08a" /><Outlines thickness={0.02} color="#ca8a04" /></mesh>
      <mesh position={[12, 6, 28.5]} receiveShadow><boxGeometry args={[0.5, 8, 43]} /><GhibliMaterial color="#fef08a" /><Outlines thickness={0.02} color="#ca8a04" /></mesh>

      {/* Outdoor Scenery seen through the holes */}
      <OutdoorScenery />

      {/* Window Frames */}
      {[-4, 4].map(z => (
        <WindowFrame key={z} position={[12, 6, z]} />
      ))}

      {/* Front Chalkboard (Lowered to be more visible) */}
      <mesh position={[0, 3.5, -9.7]} castShadow receiveShadow>
        <boxGeometry args={[14, 4, 0.2]} />
        <GhibliMaterial color="#064e3b" />
        <Outlines thickness={0.02} color="#022c22" />
      </mesh>
      <mesh position={[0, 1.5, -9.6]} castShadow>
        <boxGeometry args={[14.2, 0.1, 0.4]} />
        <GhibliMaterial color="#78350f" />
        <Outlines thickness={0.015} color="#451a03" />
      </mesh>

      {/* Classroom Props (Lowered to match chalkboard) */}
      <WallClock position={[0, 7.5, -9.7]} />
      <WallPoster position={[-9, 3.5, -9.7]} color="#fca5a5" />
      <WallPoster position={[-7.5, 4, -9.7]} color="#93c5fd" scale={[1.5, 1]} />
      <WallPoster position={[9, 3, -9.7]} color="#86efac" />
      
      {/* Teacher Desk & Teacher (Moved slightly to right) */}
      <Desk position={[-4, 0, -8]} rotation={0} variant="square" themeColor="#92400e" />
      <Character 
        occ={{ id: 'teacher', name: 'Teacher', isUser: false, elapsedSeconds: 0, seatIdx: 99 }} 
        position={[-4, 0, -8]} 
        rotation={0} 
        accent={accent} 
      />

      {occupants.map(occ => {
        const { pos, deskPos } = getSeatProps(occ.seatIdx);
        return (
          <React.Fragment key={occ.id}>
            <Desk position={deskPos} rotation={Math.PI} variant="square" themeColor="#b45309" />
            <Character occ={occ} position={pos} rotation={Math.PI} accent={accent} />
          </React.Fragment>
        );
      })}

      {poofs.map(p => (
        <SmokePoof
          key={p.id}
          position={[p.pos[0], p.pos[1] + 0.8, p.pos[2]]}
          onComplete={() => {
            setPoofs(prev => prev.filter(x => x.id !== p.id));
          }}
        />
      ))}
    </group>
  );
};
