import React from 'react';
import { Sparkles, Outlines } from '@react-three/drei';
import { Occupant, GhibliMaterial, WallPoster, Desk, Character, WallClock, CoffeeMug, Bookshelf, PottedPlant, PendantLamp, SmokePoof } from './Shared3D';

// ─── Palette ───────────────────────────────────────────────────────────────────
const P = {
  wallLight:    '#d4a574', // warm light brown
  wallMid:      '#c49060', // medium warm brown
  wallDark:     '#a0714a', // darker brown trim
  wallOutline:  '#8b5e3c',
  floor:        '#c8956c', // honey wood floor
  floorOutline: '#a0714a',
  rug:          '#b45309', // amber rug
  rugOutline:   '#92400e',
  shelf:        '#92400e', // rich brown shelves
  shelfOutline: '#78350f',
  shelfDark:    '#78350f',
  table:        '#b45309', // amber table tops
  tableOutline: '#92400e',
  tableLeg:     '#78350f',
  frame:        '#78350f', // window frames
  lampShade:    '#b45309',
  lampMetal:    '#92400e',
};

// ─── Arched Window (Golden Hour) ───────────────────────────────────────────────
const ArchedWindow = ({
  position,
  rotation = [0, 0, 0],
  width = 3,
  height = 5,
  hasSun = false,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  hasSun?: boolean;
}) => {
  const fw = 0.35;
  const d  = 0.3;
  const archH = width / 2;

  return (
    <group position={position} rotation={rotation}>
      {/* Golden hour sky — warm gradient approximated with two planes */}
      <mesh position={[0, (height + archH) * 0.15, 0]}>
        <planeGeometry args={[width, (height + archH) * 0.5]} />
        <meshBasicMaterial color="#fb923c" /> {/* upper orange */}
      </mesh>
      <mesh position={[0, -(height + archH) * 0.25, 0]}>
        <planeGeometry args={[width, (height + archH) * 0.6]} />
        <meshBasicMaterial color="#fde68a" /> {/* lower amber-yellow */}
      </mesh>

      {/* Horizon glow */}
      <Sparkles
        position={[0, -height * 0.1, 0.04]}
        count={30}
        scale={[width, height * 0.4, 0.02]}
        size={6}
        speed={0.05}
        opacity={0.5}
        color="#fef08a"
      />

      {hasSun && (
        <>
          {/* Sun disc */}
          <mesh position={[width / 5, -height * 0.05, 0.02]}>
            <circleGeometry args={[0.55, 32]} />
            <meshBasicMaterial color="#fef9c3" />
          </mesh>
          {/* Sun halo */}
          <mesh position={[width / 5, -height * 0.05, 0.01]}>
            <circleGeometry args={[0.75, 32]} />
            <meshBasicMaterial color="#fde68a" transparent opacity={0.5} />
          </mesh>
        </>
      )}

      {/* Frame — Left */}
      <mesh position={[-width / 2 - fw / 2, -archH / 2, 0.1]}>
        <boxGeometry args={[fw, height, d]} />
        <GhibliMaterial color={P.frame} />
        <Outlines thickness={0.03} color={P.shelfOutline} />
      </mesh>
      {/* Frame — Right */}
      <mesh position={[width / 2 + fw / 2, -archH / 2, 0.1]}>
        <boxGeometry args={[fw, height, d]} />
        <GhibliMaterial color={P.frame} />
        <Outlines thickness={0.03} color={P.shelfOutline} />
      </mesh>
      {/* Frame — Bottom */}
      <mesh position={[0, -height / 2 - archH / 2 - fw / 2, 0.1]}>
        <boxGeometry args={[width + fw * 2, fw, d]} />
        <GhibliMaterial color={P.frame} />
        <Outlines thickness={0.03} color={P.shelfOutline} />
      </mesh>
      {/* Arch top */}
      <mesh position={[0, height / 2 - archH / 2, 0.1]}>
        <torusGeometry args={[width / 2 + fw / 2, fw / 2, 8, 32, Math.PI]} />
        <GhibliMaterial color={P.frame} />
        <Outlines thickness={0.03} color={P.shelfOutline} />
      </mesh>
      {/* Vertical mullion */}
      <mesh position={[0, -archH / 2, 0.1]}>
        <boxGeometry args={[0.12, height, 0.1]} />
        <GhibliMaterial color={P.frame} />
      </mesh>
      {/* Horizontal mullion */}
      <mesh position={[0, height / 6 - archH / 2, 0.1]}>
        <boxGeometry args={[width, 0.12, 0.1]} />
        <GhibliMaterial color={P.frame} />
      </mesh>
    </group>
  );
};

// ─── Tall Bookshelf Wall ───────────────────────────────────────────────────────
const TallBookshelf = ({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    <mesh position={[0, 4, 0]} castShadow>
      <boxGeometry args={[2.4, 8, 0.9]} />
      <GhibliMaterial color={P.shelf} />
      <Outlines thickness={0.015} color={P.shelfOutline} />
    </mesh>
    {[0.8, 2.2, 3.6, 5.0, 6.4].map((y) => (
      <mesh key={y} position={[0, y, 0.22]} castShadow>
        <boxGeometry args={[2.2, 0.06, 0.5]} />
        <GhibliMaterial color={P.shelfDark} />
        <Outlines thickness={0.01} color={P.shelfOutline} />
      </mesh>
    ))}
    {/* Books — warm earthy tones to match golden hour */}
    {[
      { y: 1.2,  books: ['#b91c1c', '#d97706', '#15803d', '#c2410c', '#a16207', '#0f766e'] },
      { y: 2.6,  books: ['#b45309', '#92400e', '#be185d', '#065f46', '#78350f', '#1e3a8a'] },
      { y: 4.0,  books: ['#dc2626', '#d97706', '#16a34a', '#b45309', '#a16207', '#0891b2'] },
      { y: 5.4,  books: ['#9f1239', '#c2410c', '#166534', '#b45309', '#92400e', '#155e75'] },
      { y: 6.8,  books: ['#991b1b', '#b45309', '#14532d', '#92400e', '#78350f', '#164e63'] },
    ].map(({ y, books }) =>
      books.map((color, i) => (
        <mesh
          key={`${y}-${i}`}
          position={[-0.9 + i * 0.32, y, 0.22]}
          rotation={[0, 0, i % 3 === 2 ? 0.15 : 0]}
          castShadow
        >
          <boxGeometry args={[0.22, 0.7 + (i % 2) * 0.15, 0.35]} />
          <GhibliMaterial color={color} />
          <Outlines thickness={0.008} />
        </mesh>
      ))
    )}
  </group>
);

// ─── Reading Lamp ──────────────────────────────────────────────────────────────
const ReadingLamp = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <mesh position={[0, 0.05, 0]} castShadow>
      <cylinderGeometry args={[0.18, 0.22, 0.1, 16]} />
      <GhibliMaterial color={P.lampMetal} />
      <Outlines thickness={0.01} color={P.shelfOutline} />
    </mesh>
    <mesh position={[0, 0.8, 0]} castShadow>
      <cylinderGeometry args={[0.03, 0.03, 1.5, 8]} />
      <GhibliMaterial color={P.lampMetal} />
    </mesh>
    <mesh position={[0, 1.6, 0]} castShadow>
      <coneGeometry args={[0.35, 0.4, 16, 1, true]} />
      <GhibliMaterial color={P.lampShade} />
      <Outlines thickness={0.012} color={P.shelfOutline} />
    </mesh>
    <mesh position={[0, 1.45, 0]}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshBasicMaterial color="#fef9c3" />
    </mesh>
    <mesh position={[0, 1.45, 0]}>
      <sphereGeometry args={[0.18, 16, 16]} />
      <meshBasicMaterial color="#fef08a" transparent opacity={0.4} />
    </mesh>
    <pointLight position={[0, 1.4, 0]} intensity={2} distance={7} color="#fde68a" />
  </group>
);

// ─── Globe Decoration ──────────────────────────────────────────────────────────
const Globe = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <mesh position={[0, 0.6, 0]} castShadow>
      <sphereGeometry args={[0.35, 24, 24]} />
      <GhibliMaterial color="#0369a1" />
      <Outlines thickness={0.015} color="#1e3a8a" />
    </mesh>
    <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.37, 0.025, 8, 32]} />
      <GhibliMaterial color={P.lampMetal} />
    </mesh>
    <mesh position={[0, 0.15, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.12, 0.3, 12]} />
      <GhibliMaterial color={P.shelf} />
      <Outlines thickness={0.01} color={P.shelfOutline} />
    </mesh>
    <mesh position={[0, 0.05, 0]} castShadow>
      <cylinderGeometry args={[0.2, 0.2, 0.06, 16]} />
      <GhibliMaterial color={P.shelf} />
      <Outlines thickness={0.01} color={P.shelfOutline} />
    </mesh>
  </group>
);

// ─── Study Table ───────────────────────────────────────────────────────────────
const StudyTable = ({ x, z }: { x: number; z: number }) => (
  <group>
    <mesh position={[x, 0.02, z]} receiveShadow>
      <boxGeometry args={[3.8, 0.06, 3.8]} />
      <GhibliMaterial color={P.table} />
      <Outlines thickness={0.01} color={P.tableOutline} />
    </mesh>
    {([[0.85, 0.85], [-0.85, 0.85], [0.85, -0.85], [-0.85, -0.85]] as [number, number][]).map(([lx, lz], li) => (
      <mesh key={li} position={[x + lx, -0.3, z + lz]} castShadow>
        <boxGeometry args={[0.1, 0.65, 0.1]} />
        <GhibliMaterial color={P.tableLeg} />
      </mesh>
    ))}
    <PendantLamp position={[x, 4, z]} />
    <spotLight
      position={[x, 6, z]}
      angle={0.45}
      penumbra={0.7}
      intensity={4}
      color="#fde68a"
      castShadow
      distance={14}
    />
    <ReadingLamp position={[x + 1.2, 0.05, z - 1.2]} />
  </group>
);

// ─── Main Environment ──────────────────────────────────────────────────────────
export const LibraryEnv = ({ occupants, accent }: { occupants: Occupant[]; accent: string }) => {
  // 6 study tables — 3 columns × 2 rows
  const tables = [
    { x:  5,  z:  4.5 },
    { x:  0,  z:  4.5 },
    { x: -5,  z:  4.5 },
    { x:  5,  z: -2.5 },
    { x:  0,  z: -2.5 },
    { x: -5,  z: -2.5 },
  ];

  const getSeatProps = (
    i: number
  ): { pos: [number, number, number]; deskPos: [number, number, number]; rot: number; desk: boolean } => {
    const table = tables[i % tables.length];
    const angle = (i * Math.PI) / 2;
    const x = table.x + Math.sin(angle) * 1.2;
    const z = table.z + Math.cos(angle) * 1.2;
    return { pos: [x, 0, z], deskPos: [table.x, 0, table.z], rot: angle + Math.PI, desk: true };
  };

  const [poofs, setPoofs] = React.useState<{ id: string; pos: [number, number, number] }[]>([]);
  const [hasPoofedInitial, setHasPoofedInitial] = React.useState(false);
  const prevOccupantsRef = React.useRef<Occupant[]>([]);

  React.useEffect(() => {
    const userOcc = occupants.find(o => o.isUser);
    if (userOcc && !hasPoofedInitial) {
      const timer = setTimeout(() => {
        const { pos } = getSeatProps(userOcc.seatIdx);
        setPoofs(p => [...p, { id: `initial-user-${Date.now()}`, pos: [pos[0], pos[1], pos[2]] }]);
      }, 1200);
      setHasPoofedInitial(true);
      return () => clearTimeout(timer);
    }
  }, [occupants, hasPoofedInitial]);

  React.useEffect(() => {
    const prev = prevOccupantsRef.current;
    if (prev.length > 0) {
      const currentIds = new Set(occupants.map(o => o.id));
      const prevIds = new Set(prev.map(o => o.id));

      // Joins
      occupants.forEach(occ => {
        if (!prevIds.has(occ.id) && !occ.isUser) {
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
      {/* ── Golden hour lighting ── */}
      <ambientLight intensity={1.1} color="#fbbf24" />
      <directionalLight position={[-12, 8, 5]}  intensity={2.0} color="#fb923c" castShadow />
      <directionalLight position={[10,  12, -8]} intensity={0.8} color="#fde68a" />

      {/* Warm dust motes drifting in sunlight */}
      <Sparkles count={100} scale={26} size={2} speed={0.06} opacity={0.45} color="#fde68a" />

      {/* ── Walls — light warm brown ── */}
      {/* Back wall */}
      <mesh position={[0, 10, -12]} receiveShadow>
        <boxGeometry args={[100, 20, 0.5]} />
        <GhibliMaterial color={P.wallLight} />
        <Outlines thickness={0.02} color={P.wallOutline} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-12, 10, 0]} receiveShadow>
        <boxGeometry args={[0.5, 20, 100]} />
        <GhibliMaterial color={P.wallLight} />
        <Outlines thickness={0.02} color={P.wallOutline} />
      </mesh>
      {/* Wainscoting / lower wall panel */}
      <mesh position={[0, 1.5, -11.7]} receiveShadow>
        <boxGeometry args={[100, 3, 0.3]} />
        <GhibliMaterial color={P.wallMid} />
        <Outlines thickness={0.01} color={P.wallOutline} />
      </mesh>
      <mesh position={[-11.7, 1.5, 0]} receiveShadow>
        <boxGeometry args={[0.3, 3, 100]} />
        <GhibliMaterial color={P.wallMid} />
        <Outlines thickness={0.01} color={P.wallOutline} />
      </mesh>

      {/* ── Floor — honey wood planks ── */}
      <mesh position={[0, -0.26, 0]} receiveShadow>
        <boxGeometry args={[100, 0.5, 100]} />
        <GhibliMaterial color={P.floor} />
        <Outlines thickness={0.01} color={P.floorOutline} />
      </mesh>
      {/* Wide rug covering the study area */}
      <mesh position={[0, -0.01, 1]} receiveShadow>
        <boxGeometry args={[18, 0.02, 14]} />
        <GhibliMaterial color={P.rug} />
        <Outlines thickness={0.01} color={P.rugOutline} />
      </mesh>

      {/* ── Arched Windows — Back Wall ── */}
      <ArchedWindow position={[-6,  5.5, -11.7]} width={3.2} height={5} hasSun={true}  />
      <ArchedWindow position={[ 0,  5.5, -11.7]} width={3.2} height={5} hasSun={false} />
      <ArchedWindow position={[ 6,  5.5, -11.7]} width={3.2} height={5} hasSun={false} />

      {/* ── Arched Windows — Left Wall ── */}
      <ArchedWindow position={[-11.7, 5.5, -5]} rotation={[0, Math.PI / 2, 0]} width={3.2} height={5} hasSun={false} />
      <ArchedWindow position={[-11.7, 5.5,  3]} rotation={[0, Math.PI / 2, 0]} width={3.2} height={5} hasSun={false} />

      {/* ── Wall Clock ── */}
      <WallClock position={[0, 14, -11.7]} />

      {/* ── Framed Art / Posters ── */}
      <WallPoster position={[-9,  9, -11.7]} color="#92400e" scale={[2, 2.5]} />
      <WallPoster position={[ 9,  9, -11.7]} color="#78350f" scale={[2, 2.5]} />
      <WallPoster position={[-11.7, 8, -8]} rotation={Math.PI / 2} color="#a16207" scale={[2, 2]} />
      <WallPoster position={[-11.7, 8,  0]} rotation={Math.PI / 2} color="#b45309" scale={[2, 2]} />

      {/* ── Tall Bookshelves — Back Wall ── */}
      <TallBookshelf position={[-9.5, 0, -11.3]} />
      <TallBookshelf position={[-6.5, 0, -11.3]} />
      <TallBookshelf position={[ 3,   0, -11.3]} />
      <TallBookshelf position={[ 6,   0, -11.3]} />
      <TallBookshelf position={[ 9,   0, -11.3]} />

      {/* ── Tall Bookshelves — Left Wall ── */}
      <TallBookshelf position={[-11.3, 0, -9]}  rotation={Math.PI / 2} />
      <TallBookshelf position={[-11.3, 0, -6]}  rotation={Math.PI / 2} />
      <TallBookshelf position={[-11.3, 0,  1]}  rotation={Math.PI / 2} />
      <TallBookshelf position={[-11.3, 0,  4]}  rotation={Math.PI / 2} />
      <TallBookshelf position={[-11.3, 0,  7]}  rotation={Math.PI / 2} />

      {/* ── Freestanding Bookshelves as aisle dividers ── */}
      <Bookshelf position={[ 9.5, 0,  2]}  rotation={Math.PI / 2} />
      <Bookshelf position={[ 9.5, 0,  7]}  rotation={Math.PI / 2} />
      <Bookshelf position={[ 9.5, 0, -4]}  rotation={Math.PI / 2} />

      {/* ── Potted Plants ── */}
      <PottedPlant position={[ 10,  0, -10]} />
      <PottedPlant position={[-1.5, 0, -10.5]} />
      <PottedPlant position={[ 10,  0,  9]} />
      <PottedPlant position={[-1,   0,  9]} />

      {/* ── Decorative Globes ── */}
      <Globe position={[ 9,  0,  8.5]} />
      <Globe position={[-0.5, 0, -10]} />

      {/* ── 6 Study Tables ── */}
      {tables.map((t, idx) => (
        <StudyTable key={idx} x={t.x} z={t.z} />
      ))}

      {/* ── Occupants ── */}
      {occupants.map((occ) => {
        const { pos, deskPos, rot, desk } = getSeatProps(occ.seatIdx);
        return (
          <React.Fragment key={occ.id}>
            {desk && (
              <group>
                <Desk position={deskPos} variant="round" themeColor={P.table} />
                <CoffeeMug position={[deskPos[0] + 0.4, 0.75, deskPos[2] - 0.3]} />
              </group>
            )}
            <Character occ={occ} position={pos} rotation={rot} accent={accent} isDarkEnv={false} />
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
