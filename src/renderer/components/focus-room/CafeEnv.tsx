import React, { useMemo } from 'react';
import { Sparkles, Outlines } from '@react-three/drei';
import { Occupant, GhibliMaterial, WallPoster, Desk, Character, WallClock, CoffeeMug, Bookshelf, PottedPlant, PendantLamp, CoffeeStand } from './Shared3D';

const WoodenWindow = ({ position, rotation = [0, 0, 0], width = 3.5, height = 5.5, hasMoon = false }: { position: [number, number, number], rotation?: [number, number, number], width?: number, height?: number, hasMoon?: boolean }) => {
  const fw = 0.4; // chunkier frame
  const d = 0.3; // depth
  const frameColor = "#0f172a"; // very dark slate, almost black
  return (
    <group position={position} rotation={rotation}>
      {/* Sky backdrop - distinct deep twilight blue */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#1e3a8a" />
      </mesh>
      {/* Stars - pulled forward to prevent clipping */}
      <Sparkles position={[0, 0, 0.1]} count={100} scale={[width, height, 0.05]} size={5} speed={0.2} opacity={1} color="#fef08a" />
      
      {hasMoon && (
        <mesh position={[-width/3, height/3, 0.01]}><sphereGeometry args={[0.7, 16, 16]} /><meshBasicMaterial color="#fef08a" /></mesh>
      )}

      {/* Frame Top */}
      <mesh position={[0, height/2 + fw/2, 0.1]}><boxGeometry args={[width + fw*2, fw, d]} /><GhibliMaterial color={frameColor} /><Outlines thickness={0.03} color="#000" /></mesh>
      {/* Frame Bottom */}
      <mesh position={[0, -height/2 - fw/2, 0.1]}><boxGeometry args={[width + fw*2, fw, d]} /><GhibliMaterial color={frameColor} /><Outlines thickness={0.03} color="#000" /></mesh>
      {/* Frame Left */}
      <mesh position={[-width/2 - fw/2, 0, 0.1]}><boxGeometry args={[fw, height, d]} /><GhibliMaterial color={frameColor} /><Outlines thickness={0.03} color="#000" /></mesh>
      {/* Frame Right */}
      <mesh position={[width/2 + fw/2, 0, 0.1]}><boxGeometry args={[fw, height, d]} /><GhibliMaterial color={frameColor} /><Outlines thickness={0.03} color="#000" /></mesh>
      
      {/* Vertical Mullion */}
      <mesh position={[0, 0, 0.1]}><boxGeometry args={[0.15, height, 0.1]} /><GhibliMaterial color={frameColor} /></mesh>
      {/* Horizontal Mullion 1 */}
      <mesh position={[0, height/6, 0.1]}><boxGeometry args={[width, 0.15, 0.1]} /><GhibliMaterial color={frameColor} /></mesh>
      {/* Horizontal Mullion 2 */}
      <mesh position={[0, -height/6, 0.1]}><boxGeometry args={[width, 0.15, 0.1]} /><GhibliMaterial color={frameColor} /></mesh>
    </group>
  );
};

export const CafeEnv = ({ occupants, accent }: { occupants: Occupant[], accent: string }) => {
  const tables = [
    { x: 5, z: 5 },
    { x: -5, z: 4 },
    { x: -4, z: -4 },
    { x: 5, z: -5 },
  ];

  const getSeatProps = (i: number): { pos: [number, number, number], deskPos: [number, number, number], rot: number, desk: boolean } => {
    const table = tables[i % tables.length];
    const angle = (i * Math.PI / 2); 
    const x = table.x + Math.sin(angle) * 1.1;
    const z = table.z + Math.cos(angle) * 1.1;
    return { pos: [x, 0, z], deskPos: [table.x, 0, table.z], rot: angle + Math.PI, desk: true };
  };

  return (
    <group>
      <ambientLight intensity={0.9} color="#78350f" /> 
      <directionalLight position={[0, 15, 0]} intensity={0.8} color="#fde047" />
      
      <Sparkles count={120} scale={20} size={2} speed={0.15} opacity={0.6} color="#f59e0b" /> 

      {/* Walls */}
      <mesh position={[0, 10, -10]} receiveShadow>
        <boxGeometry args={[100, 20, 0.5]} />
        <GhibliMaterial color="#451a03" />
        <Outlines thickness={0.02} color="#290f01" />
      </mesh>
      <mesh position={[-10, 10, 0]} receiveShadow>
        <boxGeometry args={[0.5, 20, 100]} />
        <GhibliMaterial color="#451a03" />
        <Outlines thickness={0.02} color="#290f01" />
      </mesh>
      
      {/* Windows - Back Wall */}
      <WoodenWindow position={[-5, 3.5, -9.7]} width={3} height={4} hasMoon={true} />
      <WoodenWindow position={[5, 3.5, -9.7]} width={3} height={4} hasMoon={false} />
      
      {/* Windows - Left Wall */}
      <WoodenWindow position={[-9.7, 3.5, -4]} rotation={[0, Math.PI / 2, 0]} width={3} height={4} hasMoon={false} />
      <WoodenWindow position={[-9.7, 3.5, 4]} rotation={[0, Math.PI / 2, 0]} width={3} height={4} hasMoon={false} />

      {/* Props */}
      <WallClock position={[0, 12, -9.7]} />
      <WallPoster position={[-7, 8, -9.7]} color="#fca5a5" scale={[2, 3]} />
      <WallPoster position={[7, 7.5, -9.7]} color="#93c5fd" scale={[1.5, 2]} />
      <WallPoster position={[-9.7, 7, -4]} rotation={Math.PI / 2} color="#86efac" scale={[2, 2.5]} />
      
      <Bookshelf position={[-8, 0, -8]} rotation={Math.PI / 4} />
      <Bookshelf position={[-8, 0, -3]} rotation={Math.PI / 2} />
      <PottedPlant position={[8, 0, -8]} />
      <PottedPlant position={[-8, 0, 8]} />
      <PottedPlant position={[-2, 0, -8.5]} />
      <PottedPlant position={[5, 0, -8.5]} />
      
      <CoffeeStand position={[0, 0, 0]} rotation={0} />

      {tables.map((t, idx) => (
        <group key={idx}>
          <mesh position={[t.x, 0.02, t.z]} receiveShadow>
            <boxGeometry args={[3.5, 0.04, 3.5]} />
            <GhibliMaterial color="#7f1d1d" />
          </mesh>
          <PendantLamp position={[t.x, 3.5, t.z]} />
          <spotLight position={[t.x, 5.5, t.z]} angle={0.4} penumbra={0.6} intensity={4} color="#fef08a" castShadow distance={15} />
        </group>
      ))}

      {occupants.map(occ => {
        const { pos, deskPos, rot, desk } = getSeatProps(occ.seatIdx);
        return (
          <React.Fragment key={occ.id}>
            {desk && (
              <group>
                <Desk position={deskPos} variant="round" themeColor="#9a3412" />
                <CoffeeMug position={[deskPos[0] - 0.3, 0.75, deskPos[2] + 0.2]} />
              </group>
            )}
            <Character occ={occ} position={pos} rotation={rot} accent={accent} isDarkEnv={true} />
          </React.Fragment>
        );
      })}
    </group>
  );
};

