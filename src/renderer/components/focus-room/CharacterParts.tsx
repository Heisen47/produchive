import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Outlines, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { CharacterLook } from '../../lib/api-contract';
import { skinColor } from '../../lib/characterLook';

/**
 * Pieces of a customized character: fabric patterns, outfits, hair and
 * headwear. Sizes match Character in Shared3D: body capsule centred at y 0.8
 * (radius 0.25, y 0.3–1.3); head sphere radius 0.3 inside the head group.
 */

/**
 * Toon material. Keyed on the texture: three.js compiles a material's shader
 * once, so adding a map to an existing material is ignored (it rendered white).
 */
const Toon = ({ color, map, ...props }: { color: string; map?: THREE.Texture | null; [k: string]: any }) => (
  <meshToonMaterial key={map ? map.uuid : 'plain'} color={map ? '#ffffff' : color} map={map ?? null} {...props} />
);

/** Lighten (amt > 0) or darken (amt < 0) a hex colour. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/* ---------------------------------------------------------------- fabric */

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * A tiling fabric texture, or null for plain cloth. `repeatX`/`repeatY` set how
 * many tiles wrap around and along the piece it is used on, so the print keeps
 * the same size on the body, skirt and sleeves. `upsideDown` is for pieces whose
 * texture runs from top to bottom.
 */
export function useFabric(pattern: CharacterLook['pattern'], base: string, ink: string, repeatX = 6, repeatY = 5, upsideDown = false): THREE.Texture | null {
  const texture = useMemo(() => {
    if (pattern === 'none' || typeof document === 'undefined') return null;
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = ink;
    if (pattern === 'stripes') {
      for (let y = 0; y < size; y += 32) ctx.fillRect(0, y, size, 13);
    } else if (pattern === 'dots') {
      for (const [x, y] of [[32, 32], [96, 96]]) {
        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
      }
    } else if (pattern === 'stars') {
      drawStar(ctx, 32, 34, 18); drawStar(ctx, 96, 98, 13);
    } else if (pattern === 'hearts') {
      const heart = (x: number, y: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x, y + r * 0.9);
        ctx.bezierCurveTo(x - r * 1.4, y - r * 0.2, x - r * 0.7, y - r * 1.3, x, y - r * 0.45);
        ctx.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.4, y - r * 0.2, x, y + r * 0.9);
        ctx.fill();
      };
      heart(32, 34, 15); heart(96, 98, 12);
    } else if (pattern === 'flowers') {
      const flower = (x: number, y: number, r: number) => {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#fde68a';
        ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = ink;
      };
      flower(32, 32, 9); flower(96, 96, 7);
    } else if (pattern === 'checks') {
      // Gingham: overlapping translucent bands, darker where they cross.
      ctx.globalAlpha = 0.45;
      for (let i = 0; i < size; i += 32) { ctx.fillRect(i, 0, 16, size); ctx.fillRect(0, i, size, 16); }
      ctx.globalAlpha = 1;
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    // Skirts are built from the waist down, so their print would otherwise be upside down.
    tex.flipY = !upsideDown;
    tex.anisotropy = 4;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [pattern, base, ink, repeatX, repeatY, upsideDown]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

/* ---------------------------------------------------------------- body shells */

const INK = '#292524';
const R = 0.25;          // body capsule radius
const LO = 0.55;         // bottom of the capsule's straight part
const HI = 1.05;         // top of the capsule's straight part
const CAP = (Math.PI / 2) * R;
const MID = HI - LO;

/** A point on the body outline (radius, height) at arc length `s` from the bottom, pushed out by `out`. */
function outlinePoint(s: number, out: number): THREE.Vector2 {
  const r = R + out;
  if (s <= CAP) { const t = s / R; return new THREE.Vector2(Math.sin(t) * r, LO - Math.cos(t) * r); }
  if (s <= CAP + MID) return new THREE.Vector2(r, LO + (s - CAP));
  const t = Math.min(Math.PI / 2, (s - CAP - MID) / R);
  return new THREE.Vector2(Math.cos(t) * r, HI + Math.sin(t) * r);
}

function heightToArc(y: number): number {
  if (y < LO) return R * Math.acos(Math.min(1, (LO - y) / R));
  if (y <= HI) return CAP + (y - LO);
  return CAP + MID + R * Math.asin(Math.min(1, (y - HI) / R));
}

/** Evenly spaced outline points between two heights, so fabric prints are not stretched. */
function shellProfile(y0: number, y1: number, out: number, steps = 28): THREE.Vector2[] {
  const s0 = heightToArc(y0), s1 = heightToArc(y1);
  return Array.from({ length: steps + 1 }, (_, i) => outlinePoint(s0 + ((s1 - s0) * i) / steps, out));
}

/**
 * A layer of clothing that hugs the body between two heights. `phiStart`/`phiLength`
 * wrap only part of the way round (0 is the front), e.g. for a bib or an open cardigan.
 */
const Shell = ({ y0, y1, out = 0, phiStart = 0, phiLength = Math.PI * 2, color, map, outline = false }: {
  y0: number; y1: number; out?: number; phiStart?: number; phiLength?: number; color: string; map?: THREE.Texture | null; outline?: boolean;
}) => {
  const points = useMemo(() => shellProfile(y0, y1, out), [y0, y1, out]);
  return (
    <mesh castShadow>
      <latheGeometry args={[points, 40, phiStart, phiLength]} />
      <Toon color={color} map={map} side={THREE.DoubleSide} />
      {outline && <Outlines thickness={0.012} color={INK} />}
    </mesh>
  );
};

/** Wrap a shell all the way round except a gap of `gap` radians at the front. */
const openFront = (gap: number) => ({ phiStart: gap / 2, phiLength: Math.PI * 2 - gap });

/** A point on the body surface (front is +z) at angle `phi` and height `y`, pushed out by `out`. */
function onBody(phi: number, y: number, out: number): [number, number, number] {
  const p = outlinePoint(heightToArc(y), out);
  return [Math.sin(phi) * p.x, p.y, Math.cos(phi) * p.x];
}

/** One side of a crossed kimono collar: from the shoulder, round the neck and across the chest. */
const Collar = ({ side, out, lead, radius, color }: { side: number; out: number; lead: number; radius: number; color: string }) => {
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(...onBody(side * (1.5 - lead), 1.2, out)),
    new THREE.Vector3(...onBody(side * (0.75 - lead), 1.14, out)),
    new THREE.Vector3(...onBody(side * (0.36 - lead * 0.5), 1.0, out)),
    new THREE.Vector3(...onBody(side * 0.04, 0.88, out)),
    new THREE.Vector3(...onBody(-side * 0.12, 0.76, out)),
  ]), [side, out, lead]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 24, radius, 8, false]} />
      <Toon color={color} />
    </mesh>
  );
};

/* ---------------------------------------------------------------- arms */

type Sleeve = 'none' | 'short' | 'puff' | 'long' | 'wide';

/** Two stubby arms with mitten hands, in the outfit's sleeves ('none' leaves them bare). */
const Arms = ({ sleeve, cloth, trim, skin, fabric, wideFabric }: {
  sleeve: Sleeve; cloth: string; trim: string; skin: string; fabric: THREE.Texture | null; wideFabric?: THREE.Texture | null;
}) => {
  const covered = sleeve === 'long' || sleeve === 'wide';
  return (
    <>
      {[-1, 1].map(side => (
        <group key={side} position={[side * 0.285, 1.0, 0]} rotation={[0, 0, side * 0.22]}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <capsuleGeometry args={[0.068, 0.2, 4, 12]} />
            <Toon color={covered ? cloth : skin} map={covered ? fabric : null} />
            <Outlines thickness={0.01} color={INK} />
          </mesh>
          <mesh position={[0, -0.33, 0.005]} castShadow>
            <sphereGeometry args={[0.066, 14, 12]} />
            <Toon color={skin} />
            <Outlines thickness={0.01} color={INK} />
          </mesh>

          {sleeve === 'short' && (
            <mesh position={[0, -0.05, 0]} castShadow>
              <capsuleGeometry args={[0.082, 0.07, 4, 12]} />
              <Toon color={cloth} map={fabric} />
              <Outlines thickness={0.01} color={INK} />
            </mesh>
          )}
          {sleeve === 'puff' && (
            <mesh position={[0, -0.04, 0]} scale={[1, 0.85, 1]} castShadow>
              <sphereGeometry args={[0.105, 16, 12]} />
              <Toon color={cloth} map={fabric} />
              <Outlines thickness={0.01} color={INK} />
            </mesh>
          )}
          {sleeve === 'long' && (
            <mesh position={[0, -0.255, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.066, 0.022, 8, 18]} />
              <Toon color={trim} />
            </mesh>
          )}
          {sleeve === 'wide' && (
            <RoundedBox args={[0.17, 0.3, 0.25]} radius={0.06} smoothness={3} position={[side * 0.01, -0.15, -0.02]} castShadow>
              <Toon color={cloth} map={wideFabric} />
              <Outlines thickness={0.01} color={INK} />
            </RoundedBox>
          )}
        </group>
      ))}
    </>
  );
};

/* ---------------------------------------------------------------- outfits */

const SHIRT = '#fbf7ef';

/** Bell-shaped skirt outline from the waist down to a slightly tucked hem. */
const SKIRT: THREE.Vector2[] = [
  ...Array.from({ length: 15 }, (_, i) => new THREE.Vector2(0.262 + 0.245 * (i / 14) ** 1.6, 0.86 - 0.52 * (i / 14))),
  new THREE.Vector2(0.49, 0.33),
];
const GOLD = '#f2b84b';

/** A shorter A-line skirt for the pinafore. */
const PINAFORE_SKIRT: THREE.Vector2[] = [
  ...Array.from({ length: 11 }, (_, i) => new THREE.Vector2(0.262 + 0.17 * (i / 10) ** 1.4, 0.86 - 0.44 * (i / 10))),
  new THREE.Vector2(0.415, 0.41),
];

const HEART_SHAPE = (() => {
  const h = new THREE.Shape();
  h.moveTo(0, -0.5);
  h.bezierCurveTo(-0.1, -0.35, -0.5, -0.15, -0.5, 0.15);
  h.bezierCurveTo(-0.5, 0.45, -0.12, 0.55, 0, 0.3);
  h.bezierCurveTo(0.12, 0.55, 0.5, 0.45, 0.5, 0.15);
  h.bezierCurveTo(0.5, -0.15, 0.1, -0.35, 0, -0.5);
  return h;
})();
const HEART_EXTRUDE = { depth: 0.12, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3, curveSegments: 16 };

const STAR_SHAPE = (() => {
  const st = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? 0.5 : 0.22;
    if (i === 0) st.moveTo(Math.cos(a) * r, Math.sin(a) * r); else st.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  st.closePath();
  return st;
})();

/** A small puffy heart facing +z (size is its width). */
const Heart = ({ size, color, outline = false, ...props }: { size: number; color: string; outline?: boolean; [k: string]: any }) => (
  <mesh scale={size} {...props}>
    <extrudeGeometry args={[HEART_SHAPE, HEART_EXTRUDE]} />
    <Toon color={color} />
    {outline && <Outlines thickness={0.006} color={INK} />}
  </mesh>
);

/** Two straps over the shoulders (overalls, pinafore, backpack), optionally with front buttons. */
const Straps = ({ x = 0.1, out = 0.018, width = 0.022, color, button }: { x?: number; out?: number; width?: number; color: string; button?: string }) => (
  <>
    {[-x, x].map(px => {
      const r = Math.sqrt(R * R - px * px) + out;
      return (
        <group key={px}>
          <mesh position={[px, HI, 0]} rotation={[0, Math.PI / 2, 0.15]}>
            <torusGeometry args={[r, width, 6, 24, Math.PI - 0.35]} />
            <Toon color={color} />
          </mesh>
          {button && (
            <mesh position={[px, HI + r * Math.sin(0.2), r * Math.cos(0.2) + 0.012]}>
              <sphereGeometry args={[0.026, 10, 8]} />
              <Toon color={button} />
            </mesh>
          )}
        </group>
      );
    })}
  </>
);

/** A little bow (sailor neckerchief, bow tie): two loops, a knot and optional tails, facing +z. */
const Bow = ({ color, size = 1, tails = false, ...props }: { color: string; size?: number; tails?: boolean; [k: string]: any }) => (
  <group scale={size} {...props}>
    {[-1, 1].map(side => (
      <mesh key={side} position={[side * 0.065, 0, 0]} rotation={[0, 0, side * -0.3]} scale={[1.4, 0.85, 0.5]}>
        <sphereGeometry args={[0.05, 12, 10]} />
        <Toon color={color} />
        <Outlines thickness={0.008} color={INK} />
      </mesh>
    ))}
    <mesh position={[0, 0, 0.015]}>
      <sphereGeometry args={[0.028, 10, 8]} />
      <Toon color={shade(color, -0.2)} />
    </mesh>
    {tails && [-1, 1].map(side => (
      <mesh key={side} position={[side * 0.03, -0.07, 0]} rotation={[0, 0, side * 0.35]}>
        <boxGeometry args={[0.035, 0.11, 0.015]} />
        <Toon color={color} />
      </mesh>
    ))}
  </group>
);

/** The torso, dressed for the chosen outfit (replaces the plain body capsule). */
export const OutfitBody = ({ look }: { look: CharacterLook }) => {
  const { outfit, outfitColor: cloth, pattern, patternColor: ink } = look;
  const skin = skinColor(look.skin);
  const trim = shade(cloth, -0.18);
  const deep = shade(cloth, -0.4);
  const light = shade(cloth, 0.7);

  const bodyFabric = useFabric(pattern, cloth, ink, 6, 5);
  const sleeveFabric = useFabric(pattern, cloth, ink, 2, 3);
  const skirtFabric = useFabric(['dress', 'sailor', 'pinafore'].includes(outfit) ? pattern : 'none', cloth, ink, 10, 2, outfit !== 'sailor');
  const ringFabric = useFabric(outfit === 'puffer' ? pattern : 'none', cloth, ink, 12, 1);
  const wideFabric = useFabric(outfit === 'kimono' ? pattern : 'none', cloth, ink, 1, 1.4);

  const arms = (sleeve: Sleeve, color = cloth, fabric = sleeveFabric, cuff = trim) => (
    <Arms sleeve={sleeve} cloth={color} trim={cuff} skin={skin} fabric={fabric} wideFabric={wideFabric} />
  );

  if (outfit === 'hoodie') {
    return (
      <group>
        <Shell y0={0.3} y1={1.3} color={cloth} map={bodyFabric} outline />
        {/* Ribbed hem */}
        <Shell y0={0.48} y1={0.58} out={0.014} color={trim} />
        {/* Hood: a soft roll round the neck and a slouch down the back */}
        <mesh position={[0, 1.2, -0.04]} rotation={[Math.PI / 2 - 0.35, 0, 0]} castShadow>
          <torusGeometry args={[0.2, 0.075, 12, 28]} />
          <Toon color={shade(cloth, -0.08)} />
          <Outlines thickness={0.01} color={INK} />
        </mesh>
        <mesh position={[0, 1.24, -0.23]} scale={[1.25, 1, 0.6]} castShadow>
          <sphereGeometry args={[0.16, 16, 12]} />
          <Toon color={shade(cloth, -0.08)} />
          <Outlines thickness={0.01} color={INK} />
        </mesh>
        {/* Kangaroo pocket */}
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[0.264, 0.264, 0.16, 20, 1, true, -0.62, 1.24]} />
          <Toon color={trim} side={THREE.DoubleSide} />
        </mesh>
        {/* Drawstrings with aglets */}
        {[-0.055, 0.055].map(x => (
          <group key={x}>
            <mesh position={[x, 1.04, 0.255]} rotation={[0.12, 0, 0]}>
              <cylinderGeometry args={[0.009, 0.009, 0.16, 6]} />
              <meshBasicMaterial color={light} />
            </mesh>
            <mesh position={[x, 0.955, 0.262]}>
              <sphereGeometry args={[0.016, 8, 8]} />
              <meshBasicMaterial color={shade(cloth, -0.5)} />
            </mesh>
          </group>
        ))}
        {arms('long')}
      </group>
    );
  }

  if (outfit === 'dress') {
    return (
      <group>
        <Shell y0={0.8} y1={1.3} color={cloth} map={bodyFabric} outline />
        <Shell y0={0.3} y1={0.84} out={-0.01} color={SHIRT} />
        {/* Bell skirt with a scalloped lace hem */}
        <mesh castShadow>
          <latheGeometry args={[SKIRT, 40]} />
          <Toon color={cloth} map={skirtFabric} side={THREE.DoubleSide} />
        </mesh>
        {Array.from({ length: 22 }, (_, i) => {
          const a = (i / 22) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.sin(a) * 0.5, 0.34, Math.cos(a) * 0.5]} scale={[1, 0.8, 1]}>
              <sphereGeometry args={[0.04, 10, 8]} />
              <Toon color={SHIRT} />
            </mesh>
          );
        })}
        {/* Waist ribbon and bow */}
        <mesh position={[0, 0.86, 0]}>
          <cylinderGeometry args={[0.268, 0.268, 0.06, 28]} />
          <Toon color={deep} />
        </mesh>
        {[-1, 1].map(side => (
          <mesh key={side} position={[side * 0.065, 0.87, 0.27]} rotation={[0, 0, side * -0.35]} scale={[1.35, 0.8, 0.5]}>
            <sphereGeometry args={[0.05, 12, 10]} />
            <Toon color={deep} />
            <Outlines thickness={0.008} color={INK} />
          </mesh>
        ))}
        <mesh position={[0, 0.865, 0.285]}>
          <sphereGeometry args={[0.026, 10, 8]} />
          <Toon color={shade(deep, -0.2)} />
        </mesh>
        {/* Round collar */}
        {[-1, 1].map(side => (
          <mesh key={side} position={[side * 0.075, 1.16, 0.205]} rotation={[1.1, 0, side * -0.35]}>
            <cylinderGeometry args={[0.085, 0.085, 0.014, 20]} />
            <Toon color={SHIRT} />
            <Outlines thickness={0.007} color={INK} />
          </mesh>
        ))}
        {arms('puff')}
      </group>
    );
  }

  if (outfit === 'kimono') {
    const obi = shade(cloth, -0.5);
    return (
      <group>
        <Shell y0={0.3} y1={1.3} color={cloth} map={bodyFabric} outline />
        {/* Crossed collar: white under-collar with a band over it, left over right */}
        {[1, -1].map(side => (
          <group key={side}>
            <Collar side={side} out={side < 0 ? 0.03 : 0.022} lead={0.12} radius={0.017} color={SHIRT} />
            <Collar side={side} out={side < 0 ? 0.036 : 0.028} lead={0} radius={0.026} color={trim} />
          </group>
        ))}
        {/* Obi sash, gold cord and a knot at the back */}
        <Shell y0={0.7} y1={0.93} out={0.068} color={obi} outline />
        <mesh position={[0, 0.815, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.32, 0.011, 6, 40]} />
          <Toon color={GOLD} />
        </mesh>
{[-1, 1].map(side => (
          <mesh key={side} position={[side * 0.11, 0.85, -0.34]} rotation={[0, 0, side * 0.3]} scale={[1.5, 0.9, 0.55]} castShadow>
            <sphereGeometry args={[0.075, 14, 10]} />
            <Toon color={shade(obi, 0.18)} />
            <Outlines thickness={0.01} color={INK} />
          </mesh>
        ))}
        <RoundedBox args={[0.09, 0.15, 0.08]} radius={0.03} smoothness={3} position={[0, 0.84, -0.35]} castShadow>
          <Toon color={shade(obi, 0.1)} />
          <Outlines thickness={0.01} color={INK} />
        </RoundedBox>
        {arms('wide')}
      </group>
    );
  }

  if (outfit === 'overalls') {
    return (
      <group>
        <Shell y0={0.3} y1={1.3} color={SHIRT} outline />
        {/* Trousers, bib and bib pocket */}
        <Shell y0={0.3} y1={0.86} out={0.014} color={cloth} map={bodyFabric} outline />
        <Shell y0={0.84} y1={1.1} out={0.016} phiStart={-0.6} phiLength={1.2} color={cloth} map={bodyFabric} outline />
        <Shell y0={0.92} y1={1.01} out={0.024} phiStart={-0.26} phiLength={0.52} color={trim} />
        {/* Straps over the shoulders, with gold buttons */}
        <Straps color={trim} button={GOLD} />
        {arms('short', SHIRT, null, trim)}
      </group>
    );
  }

  if (outfit === 'cardigan') {
    const gap = 0.8;
    const edge = 0.12;
    return (
      <group>
        <Shell y0={0.3} y1={1.3} color={SHIRT} outline />
        <Shell y0={0.3} y1={0.5} out={0.01} color="#475569" outline />
        {/* Open-front knit with a ribbed hem and button bands */}
        <Shell y0={0.44} y1={1.22} out={0.016} {...openFront(gap)} color={cloth} map={bodyFabric} outline />
        <Shell y0={0.44} y1={0.53} out={0.022} {...openFront(gap)} color={trim} />
        <Shell y0={0.44} y1={1.2} out={0.022} phiStart={gap / 2} phiLength={edge} color={trim} />
        <Shell y0={0.44} y1={1.2} out={0.022} phiStart={-gap / 2 - edge} phiLength={edge} color={trim} />
        {[0.66, 0.81, 0.96].map(y => (
          <mesh key={y} position={onBody(gap / 2 + edge / 2, y, 0.034)}>
            <sphereGeometry args={[0.021, 10, 8]} />
            <Toon color={light} />
          </mesh>
        ))}
        {arms('long')}
      </group>
    );
  }

  if (outfit === 'sailor') {
    const back = { phiStart: Math.PI - 0.8, phiLength: 1.6 };
    return (
      <group>
        <Shell y0={0.3} y1={1.3} color={SHIRT} outline />
        {/* Pleated skirt */}
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.262, 0.4, 0.4, 14, 1, true]} />
          <Toon color={cloth} map={skirtFabric} side={THREE.DoubleSide} flatShading />
        </mesh>
        {/* Sailor collar: open at the front, a square flap at the back, white trim */}
        <Shell y0={1.0} y1={1.24} out={0.018} {...openFront(1.3)} color={cloth} outline />
        <Shell y0={1.0} y1={1.03} out={0.024} {...openFront(1.3)} color={SHIRT} />
        <Shell y0={0.86} y1={1.1} out={0.02} {...back} color={cloth} />
        <Shell y0={0.86} y1={0.89} out={0.026} {...back} color={SHIRT} />
        <Bow color="#e11d48" tails position={[0, 1.0, 0.262]} />
        {arms('short', SHIRT, null)}
      </group>
    );
  }

  if (outfit === 'pinafore') {
    return (
      <group>
        <Shell y0={0.3} y1={1.3} color={SHIRT} outline />
        <mesh castShadow>
          <latheGeometry args={[PINAFORE_SKIRT, 40]} />
          <Toon color={cloth} map={skirtFabric} side={THREE.DoubleSide} />
        </mesh>
        {/* Frilled hem */}
        <mesh position={[0, 0.415, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.418, 0.026, 8, 40]} />
          <Toon color={SHIRT} />
        </mesh>
        <Shell y0={0.84} y1={1.1} out={0.016} phiStart={-0.55} phiLength={1.1} color={cloth} map={bodyFabric} outline />
        <Straps color={trim} button={SHIRT} />
        <Heart size={0.09} color={light} outline position={[0, 0.955, 0.275]} />
        {arms('puff', SHIRT, null)}
      </group>
    );
  }

  if (outfit === 'tutu') {
    const tulle = shade(cloth, 0.45);
    return (
      <group>
        <Shell y0={0.3} y1={1.3} color={cloth} map={bodyFabric} outline />
        {/* Three layers of tulle */}
        {[0, 1, 2].map(i => (
          <mesh key={i} position={[0, 0.79 - i * 0.055, 0]} rotation={[0, i * 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.258 + i * 0.012, 0.5 - i * 0.03, 0.13, 12, 1, true]} />
            <Toon color={i % 2 ? shade(tulle, 0.3) : tulle} side={THREE.DoubleSide} flatShading />
            <Outlines thickness={0.006} color={INK} />
          </mesh>
        ))}
        {/* A little rose at the waist */}
        <mesh position={[-0.12, 0.84, 0.235]}>
          <sphereGeometry args={[0.038, 12, 10]} />
          <Toon color={deep} />
          <Outlines thickness={0.006} color={INK} />
        </mesh>
        <mesh position={[-0.07, 0.82, 0.245]} rotation={[0, 0, -0.8]} scale={[1.6, 0.7, 0.5]}>
          <sphereGeometry args={[0.02, 8, 6]} />
          <Toon color="#4d7c0f" />
        </mesh>
        {arms('none')}
      </group>
    );
  }

  if (outfit === 'puffer') {
    return (
      <group>
        <Shell y0={0.3} y1={1.3} color={cloth} map={bodyFabric} outline />
        {/* Quilted rings */}
        {[0.5, 0.66, 0.82, 0.98].map(y => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.262, 0.055, 10, 32]} />
            <Toon color={cloth} map={ringFabric} />
            <Outlines thickness={0.006} color={INK} />
          </mesh>
        ))}
        {/* Stand-up collar and zip pull */}
        <mesh position={[0, 1.17, 0]}>
          <cylinderGeometry args={[0.2, 0.235, 0.1, 24, 1, true]} />
          <Toon color={trim} side={THREE.DoubleSide} />
          <Outlines thickness={0.006} color={INK} />
        </mesh>
        <mesh position={[0, 1.1, 0.262]}>
          <boxGeometry args={[0.025, 0.05, 0.012]} />
          <Toon color={GOLD} />
        </mesh>
        {arms('long')}
      </group>
    );
  }

  if (outfit === 'sweater') {
    return (
      <group>
        <Shell y0={0.3} y1={1.3} color={cloth} map={bodyFabric} outline />
        <Shell y0={0.3} y1={0.48} out={0.01} color="#475569" outline />
        <Shell y0={0.46} y1={0.55} out={0.016} color={trim} />
        {/* Turtleneck */}
        <mesh position={[0, 1.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.055, 10, 28]} />
          <Toon color={trim} />
        </mesh>
        <mesh position={[0, 1.21, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.165, 0.045, 10, 28]} />
          <Toon color={trim} />
        </mesh>
        <Heart size={0.11} color={light} outline position={[0, 0.86, 0.262]} />
        {arms('long')}
      </group>
    );
  }

  // Classic: crew-neck tee tucked into slate trousers.
  return (
    <group>
      <Shell y0={0.3} y1={1.3} color={cloth} map={bodyFabric} outline />
      <Shell y0={0.3} y1={0.6} out={0.012} color="#475569" outline />
      <Shell y0={0.56} y1={0.62} out={0.018} color="#334155" />
      <mesh position={[0, 1.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.026, 8, 28]} />
        <Toon color={trim} />
      </mesh>
      {arms('short')}
    </group>
  );
};

/* ---------------------------------------------------------------- hair */

/** Hair, inside the head group (head radius 0.3, face toward +z). */
export const Hair = ({ look }: { look: CharacterLook }) => {
  const c = look.hairColor;
  if (look.hair === 'none') return null;
  const top = (
    <mesh position={[0, 0.01, -0.01]} castShadow>
      <sphereGeometry args={[0.32, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.36]} />
      <Toon color={c} />
    </mesh>
  );
  // Sides and back, leaving the face open (front is +z, phi = π/2).
  const sides = (length: number) => (
    <mesh castShadow>
      <sphereGeometry args={[0.325, 20, 12, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * length]} />
      <Toon color={c} side={THREE.DoubleSide} />
    </mesh>
  );

  if (look.hair === 'short') return top;
  if (look.hair === 'bob') return <group>{top}{sides(0.66)}</group>;
  if (look.hair === 'long') {
    return (
      <group>
        {top}
        {sides(0.6)}
        <mesh position={[0, -0.28, -0.17]} castShadow>
          <capsuleGeometry args={[0.2, 0.32, 4, 12]} />
          <Toon color={c} />
        </mesh>
      </group>
    );
  }
  if (look.hair === 'bun') {
    return (
      <group>
        {top}
        <mesh position={[0, 0.27, -0.16]} castShadow>
          <sphereGeometry args={[0.13, 14, 12]} />
          <Toon color={c} />
          <Outlines thickness={0.01} color="#1c1917" />
        </mesh>
      </group>
    );
  }
  if (look.hair === 'pigtails') {
    return (
      <group>
        {top}
        {[-1, 1].map(side => (
          <group key={side}>
            <mesh position={[side * 0.33, -0.06, -0.06]} scale={[0.85, 1.25, 0.85]} castShadow>
              <sphereGeometry args={[0.12, 14, 12]} />
              <Toon color={c} />
              <Outlines thickness={0.01} color="#1c1917" />
            </mesh>
            <mesh position={[side * 0.3, 0.07, -0.05]} rotation={[0, 0, side * 0.5]}>
              <torusGeometry args={[0.04, 0.018, 8, 14]} />
              <Toon color="#f472b6" />
            </mesh>
          </group>
        ))}
      </group>
    );
  }
  if (look.hair === 'ponytail') {
    return (
      <group>
        {top}
        {sides(0.45)}
        <mesh position={[0, -0.06, -0.37]} rotation={[0.35, 0, 0]} castShadow>
          <capsuleGeometry args={[0.09, 0.26, 4, 12]} />
          <Toon color={c} />
          <Outlines thickness={0.01} color="#1c1917" />
        </mesh>
        <mesh position={[0, 0.13, -0.31]} rotation={[0.35, 0, 0]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <Toon color="#f472b6" />
        </mesh>
      </group>
    );
  }
  // curly: a ring of small puffs over the top and back
  const puffs: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) {
    const a = Math.PI / 2 + 0.7 + (i / 8) * (Math.PI * 2 - 1.4);
    puffs.push([Math.cos(a) * 0.25, 0.16, Math.sin(a) * 0.25]);
  }
  return (
    <group>
      {top}
      {puffs.map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <sphereGeometry args={[0.11, 10, 8]} />
          <Toon color={i % 2 ? shade(c, 0.08) : c} />
        </mesh>
      ))}
    </group>
  );
};

/* ---------------------------------------------------------------- headwear */

export const Headwear = ({ look }: { look: CharacterLook }) => {
  const c = look.headwearColor;
  switch (look.headwear) {
    case 'beanie':
      return (
        <group>
          <mesh position={[0, 0.06, 0]} castShadow>
            <sphereGeometry args={[0.335, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Toon color={c} />
            <Outlines thickness={0.015} color="#1c1917" />
          </mesh>
          <mesh position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.32, 0.045, 10, 28]} />
            <Toon color={shade(c, -0.18)} />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <Toon color={shade(c, 0.4)} />
          </mesh>
        </group>
      );
    case 'cap':
      return (
        <group rotation={[-0.08, 0, 0]}>
          <mesh position={[0, 0.07, 0]} castShadow>
            <sphereGeometry args={[0.325, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Toon color={c} />
            <Outlines thickness={0.015} color="#1c1917" />
          </mesh>
          <mesh position={[0, 0.09, 0.3]} rotation={[0.18, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.025, 20, 1, false, -Math.PI / 2, Math.PI]} />
            <Toon color={shade(c, -0.15)} />
          </mesh>
        </group>
      );
    case 'flower-crown':
      return (
        <group position={[0, 0.17, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.27, 0.025, 8, 28]} />
            <Toon color="#4d7c0f" />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.27, 0.02, Math.sin(a) * 0.27]}>
                <sphereGeometry args={[0.055, 10, 8]} />
                <Toon color={i % 2 ? '#fef9c3' : c} />
              </mesh>
            );
          })}
        </group>
      );
    case 'cat-ears':
      return (
        <group>
          {[-1, 1].map(side => (
            <group key={side} position={[side * 0.17, 0.26, 0]} rotation={[0, 0, side * -0.35]}>
              <mesh castShadow>
                <coneGeometry args={[0.1, 0.2, 4]} />
                <Toon color={c} />
                <Outlines thickness={0.01} color="#1c1917" />
              </mesh>
              <mesh position={[0, -0.01, 0.03]} scale={[0.6, 0.7, 0.6]}>
                <coneGeometry args={[0.1, 0.2, 4]} />
                <Toon color="#fbcfe8" />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 'headphones':
      return (
        <group>
          <mesh position={[-0.32, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.12, 0.12, 0.06, 16]} /><Toon color={c} /></mesh>
          <mesh position={[0.32, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.12, 0.12, 0.06, 16]} /><Toon color={c} /></mesh>
          <mesh><torusGeometry args={[0.32, 0.03, 16, 32, Math.PI]} /><Toon color={shade(c, -0.3)} /></mesh>
        </group>
      );
    case 'witch-hat':
      return (
        <group position={[0, 0.2, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.48, 0.48, 0.03, 28]} />
            <Toon color={c} />
            <Outlines thickness={0.012} color="#1c1917" />
          </mesh>
          <mesh position={[0.03, 0.3, -0.02]} rotation={[-0.12, 0, -0.12]} castShadow>
            <coneGeometry args={[0.26, 0.62, 20]} />
            <Toon color={c} />
            <Outlines thickness={0.012} color="#1c1917" />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.265, 0.265, 0.07, 24]} />
            <Toon color="#fbbf24" />
          </mesh>
        </group>
      );
    case 'glasses':
      return (
        <group position={[0, 0.05, 0.28]}>
          <mesh position={[-0.12, 0, 0]}><torusGeometry args={[0.055, 0.015, 8, 16]} /><meshBasicMaterial color={c} /></mesh>
          <mesh position={[0.12, 0, 0]}><torusGeometry args={[0.055, 0.015, 8, 16]} /><meshBasicMaterial color={c} /></mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.01, 0.01, 0.1]} /><meshBasicMaterial color={c} /></mesh>
        </group>
      );
    case 'bow':
      return <Bow color={c} size={1.5} position={[0.15, 0.26, 0.04]} rotation={[0, 0.3, -0.5]} />;
    case 'bunny-ears':
    case 'bear-ears': {
      const bunny = look.headwear === 'bunny-ears';
      return (
        <group>
          <mesh position={[0, 0, -0.02]}>
            <torusGeometry args={[0.31, 0.016, 6, 28, Math.PI]} />
            <Toon color={shade(c, -0.2)} />
          </mesh>
          {[-1, 1].map(side => bunny ? (
            <group key={side} position={[side * 0.11, 0.3, -0.03]} rotation={[0, 0, side * -0.18]}>
              <mesh position={[0, 0.15, 0]} castShadow>
                <capsuleGeometry args={[0.055, 0.24, 4, 12]} />
                <Toon color={c} />
                <Outlines thickness={0.01} color="#1c1917" />
              </mesh>
              <mesh position={[0, 0.14, 0.03]} scale={[0.55, 0.8, 0.4]}>
                <capsuleGeometry args={[0.055, 0.24, 4, 12]} />
                <Toon color="#fbcfe8" />
              </mesh>
            </group>
          ) : (
            <group key={side} position={[side * 0.21, 0.24, -0.02]}>
              <mesh scale={[1, 1, 0.7]} castShadow>
                <sphereGeometry args={[0.095, 14, 12]} />
                <Toon color={c} />
                <Outlines thickness={0.01} color="#1c1917" />
              </mesh>
              <mesh position={[0, -0.005, 0.045]} scale={[1, 1, 0.4]}>
                <sphereGeometry args={[0.055, 12, 10]} />
                <Toon color={shade(c, 0.4)} />
              </mesh>
            </group>
          ))}
        </group>
      );
    }
    case 'beret':
      return (
        <group position={[0.03, 0.25, -0.02]} rotation={[0, 0, -0.25]}>
          <mesh scale={[1, 0.32, 1]} castShadow>
            <sphereGeometry args={[0.34, 20, 14]} />
            <Toon color={c} />
            <Outlines thickness={0.012} color="#1c1917" />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.014, 0.018, 0.05, 8]} />
            <Toon color={shade(c, -0.25)} />
          </mesh>
        </group>
      );
    case 'crown':
      return (
        <group position={[0, 0.29, 0]} rotation={[0, 0, 0.12]}>
          <mesh>
            <cylinderGeometry args={[0.14, 0.15, 0.08, 20, 1, true]} />
            <Toon color="#fbbf24" side={THREE.DoubleSide} />
            <Outlines thickness={0.008} color="#1c1917" />
          </mesh>
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <group key={i}>
                <mesh position={[Math.sin(a) * 0.14, 0.075, Math.cos(a) * 0.14]}>
                  <coneGeometry args={[0.035, 0.08, 8]} />
                  <Toon color="#fbbf24" />
                </mesh>
                <mesh position={[Math.sin(a) * 0.148, 0, Math.cos(a) * 0.148]}>
                  <sphereGeometry args={[0.022, 10, 8]} />
                  <Toon color={c} />
                </mesh>
              </group>
            );
          })}
        </group>
      );
    case 'party-hat':
      return (
        <group position={[0.06, 0.36, 0]} rotation={[0, 0, -0.22]}>
          <mesh castShadow>
            <coneGeometry args={[0.13, 0.32, 24]} />
            <Toon color={c} />
            <Outlines thickness={0.01} color="#1c1917" />
          </mesh>
          {[-0.06, 0.04].map(y => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.13 * (0.5 - (y + 0.02) / 0.32) + 0.008, 0.012, 6, 24]} />
              <Toon color={shade(c, 0.6)} />
            </mesh>
          ))}
          <mesh position={[0, 0.17, 0]}>
            <sphereGeometry args={[0.045, 12, 10]} />
            <Toon color="#fde68a" />
            <Outlines thickness={0.008} color="#1c1917" />
          </mesh>
        </group>
      );
    case 'frog-hat':
      return (
        <group position={[0, 0.1, 0]}>
          <mesh scale={[1, 0.85, 1]} castShadow>
            <sphereGeometry args={[0.33, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Toon color={c} side={THREE.DoubleSide} />
            <Outlines thickness={0.012} color="#1c1917" />
          </mesh>
          <mesh position={[0, 0.005, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.025, 32]} />
            <Toon color={shade(c, -0.15)} />
          </mesh>
          {[-1, 1].map(side => (
            <group key={side} position={[side * 0.13, 0.27, 0.13]}>
              <mesh><sphereGeometry args={[0.075, 14, 12]} /><Toon color={c} /><Outlines thickness={0.008} color="#1c1917" /></mesh>
              <mesh position={[0, 0.01, 0.055]}><sphereGeometry args={[0.04, 12, 10]} /><meshBasicMaterial color="#ffffff" /></mesh>
              <mesh position={[0, 0.012, 0.085]}><sphereGeometry args={[0.022, 10, 8]} /><meshBasicMaterial color="#0f172a" /></mesh>
            </group>
          ))}
        </group>
      );
    case 'star-clips':
      return (
        <group>
          {[[-0.2, 0.18, 0.16, 0.3], [-0.12, 0.25, 0.15, -0.2], [0.2, 0.18, 0.16, -0.3]].map(([x, y, z, r], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[-0.5, x > 0 ? 0.5 : -0.5, r]} scale={i === 1 ? 0.07 : 0.09}>
              <extrudeGeometry args={[STAR_SHAPE, HEART_EXTRUDE]} />
              <Toon color={c} />
              <Outlines thickness={0.06} color="#1c1917" />
            </mesh>
          ))}
        </group>
      );
    case 'halo':
      return (
        <mesh position={[0, 0.48, -0.02]} rotation={[Math.PI / 2 - 0.25, 0, 0]}>
          <torusGeometry args={[0.17, 0.022, 10, 32]} />
          <meshBasicMaterial color={c} />
        </mesh>
      );
    default:
      return null;
  }
};

/* ---------------------------------------------------------------- accessories */

/** One fairy wing that flutters from a hinge at the back. */
const Wing = ({ side, color }: { side: number; color: string }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = side * (0.35 + Math.sin(clock.getElapsedTime() * 5) * 0.2);
  });
  const mat = <Toon color={color} transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} />;
  return (
    <group ref={ref} position={[side * 0.05, 1.0, -0.25]}>
      <mesh position={[side * 0.17, 0.1, 0]} rotation={[0, 0, side * 0.5]} scale={[1, 0.6, 0.06]}>
        <sphereGeometry args={[0.18, 16, 12]} />
        {mat}
      </mesh>
      <mesh position={[side * 0.13, -0.11, 0]} rotation={[0, 0, side * -0.45]} scale={[0.75, 0.48, 0.06]}>
        <sphereGeometry args={[0.16, 16, 12]} />
        {mat}
      </mesh>
    </group>
  );
};

/** The cape hangs from the shoulders and flares out to the floor at the back. */
const CAPE: THREE.Vector2[] = Array.from({ length: 12 }, (_, i) => {
  const t = i / 11;
  return new THREE.Vector2(0.24 + 0.22 * t ** 1.3, 1.16 - 0.84 * t);
});

/** A heart balloon on a string, held in the right hand, bobbing gently. */
const Balloon = ({ color }: { color: string }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      ref.current.position.y = Math.sin(t * 1.4) * 0.03;
      ref.current.rotation.z = Math.sin(t * 0.9) * 0.08;
    }
  });
  const hand = new THREE.Vector3(0.36, 0.68, 0.02);
  const top = new THREE.Vector3(0.55, 1.6, 0.05);
  const mid = hand.clone().add(top).multiplyScalar(0.5);
  const len = hand.distanceTo(top);
  const tilt = Math.atan2(top.x - hand.x, top.y - hand.y);
  return (
    <group ref={ref}>
      <mesh position={mid} rotation={[0, 0, -tilt]}>
        <cylinderGeometry args={[0.004, 0.004, len, 4]} />
        <meshBasicMaterial color="#e5e7eb" />
      </mesh>
      <Heart size={0.36} color={color} outline position={[top.x, top.y + 0.17, top.z - 0.03]} />
      <mesh position={[top.x - 0.06, top.y + 0.23, top.z + 0.05]}>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
      </mesh>
    </group>
  );
};

/** Something worn over the outfit: scarf, bow tie, necklace, backpack, wings, balloon or cape. */
export const Accessory = ({ look }: { look: CharacterLook }) => {
  const c = look.accessoryColor;
  switch (look.accessory) {
    case 'scarf':
      return (
        <group>
          <mesh position={[0, 1.15, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.215, 0.06, 10, 28]} />
            <Toon color={c} />
            <Outlines thickness={0.008} color={INK} />
          </mesh>
          <group position={[0.11, 0.98, 0.25]} rotation={[0.15, 0, 0.12]}>
            <RoundedBox args={[0.11, 0.3, 0.05]} radius={0.02} smoothness={2} castShadow>
              <Toon color={c} />
              <Outlines thickness={0.008} color={INK} />
            </RoundedBox>
            <mesh position={[0, -0.09, 0.02]}>
              <boxGeometry args={[0.112, 0.035, 0.02]} />
              <Toon color={shade(c, -0.25)} />
            </mesh>
          </group>
        </group>
      );
    case 'bow-tie':
      return <Bow color={c} size={0.8} position={[0, 1.1, 0.25]} />;
    case 'necklace':
      return (
        <group>
          {Array.from({ length: 15 }, (_, i) => {
            const phi = -1.3 + (i / 14) * 2.6;
            return (
              <mesh key={i} position={onBody(phi, 1.14 - 0.06 * Math.cos(phi), 0.014)}>
                <sphereGeometry args={[0.016, 8, 6]} />
                <Toon color={c} />
              </mesh>
            );
          })}
          <Heart size={0.05} color={shade(c, -0.15)} outline position={[0, 1.04, 0.255]} />
        </group>
      );
    case 'backpack':
      return (
        <group>
          <RoundedBox args={[0.34, 0.38, 0.16]} radius={0.06} smoothness={3} position={[0, 0.84, -0.34]} castShadow>
            <Toon color={c} />
            <Outlines thickness={0.01} color={INK} />
          </RoundedBox>
          <RoundedBox args={[0.24, 0.14, 0.06]} radius={0.025} smoothness={2} position={[0, 0.74, -0.43]}>
            <Toon color={shade(c, -0.15)} />
            <Outlines thickness={0.008} color={INK} />
          </RoundedBox>
          <Heart size={0.05} color={shade(c, 0.6)} position={[0, 0.74, -0.465]} rotation={[0, Math.PI, 0]} />
          <Straps x={0.12} out={0.03} width={0.025} color={shade(c, -0.3)} />
        </group>
      );
    case 'wings':
      return <group>{[-1, 1].map(side => <Wing key={side} side={side} color={c} />)}</group>;
    case 'balloon':
      return <Balloon color={c} />;
    case 'cape':
      return (
        <group>
          <mesh castShadow>
            <latheGeometry args={[CAPE, 24, Math.PI - 1.15, 2.3]} />
            <Toon color={c} side={THREE.DoubleSide} />
            <Outlines thickness={0.008} color={INK} />
          </mesh>
          <mesh position={[0, 1.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.2, 0.03, 8, 28]} />
            <Toon color={shade(c, -0.25)} />
          </mesh>
          <mesh position={[0, 1.13, 0.2]}>
            <sphereGeometry args={[0.03, 10, 8]} />
            <Toon color={GOLD} />
            <Outlines thickness={0.006} color={INK} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
};

/* ---------------------------------------------------------------- companions */

const PetEyes = ({ y, z, spread = 0.042, size = 0.016 }: { y: number; z: number; spread?: number; size?: number }) => (
  <>
    {[-1, 1].map(side => (
      <group key={side} position={[side * spread, y, z]}>
        <mesh><sphereGeometry args={[size, 12, 10]} /><meshBasicMaterial color="#0f172a" /></mesh>
        <mesh position={[size * 0.35, size * 0.4, size * 0.75]}><sphereGeometry args={[size * 0.38, 8, 6]} /><meshBasicMaterial color="#ffffff" /></mesh>
      </group>
    ))}
    {[-1, 1].map(side => (
      <mesh key={`b${side}`} position={[side * (spread + 0.025), y - 0.025, z - 0.012]}>
        <sphereGeometry args={[0.014, 8, 8]} />
        <meshBasicMaterial color="#fda4af" />
      </mesh>
    ))}
  </>
);

/** Path of the cat's tail: from the rump, round the side and curling up at the tip. */
const CAT_TAIL = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0.05, -0.1),
  new THREE.Vector3(0.09, 0.03, -0.11),
  new THREE.Vector3(0.15, 0.06, -0.03),
  new THREE.Vector3(0.16, 0.14, 0.03),
  new THREE.Vector3(0.13, 0.2, 0.05),
]);

/** A chibi cat sitting upright: big round head, pointed ears, whiskers, a bell collar and a curling tail. */
const Cat = ({ color, tail }: { color: string; tail: React.RefObject<THREE.Mesh> }) => {
  const line = <Outlines thickness={0.008} color={INK} />;
  const belly = shade(color, 0.55);
  const inner = '#f9a8d4';
  return (
    <group>
      {/* Body: a pear sitting up, with a pale chest and two front paws */}
      <mesh position={[0, 0.1, 0]} scale={[1, 1.05, 0.95]} castShadow>
        <sphereGeometry args={[0.11, 18, 14]} />
        <Toon color={color} />
        {line}
      </mesh>
      <mesh position={[0, 0.11, 0.07]} scale={[0.75, 0.85, 0.5]}>
        <sphereGeometry args={[0.08, 14, 10]} />
        <Toon color={belly} />
      </mesh>
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 0.045, 0.018, 0.085]} scale={[1, 0.75, 1.25]}>
          <sphereGeometry args={[0.032, 12, 10]} />
          <Toon color={belly} />
          {line}
        </mesh>
      ))}

      {/* Tail (wags from the base) */}
      <mesh ref={tail} castShadow>
        <tubeGeometry args={[CAT_TAIL, 20, 0.022, 8, false]} />
        <Toon color={color} />
        {line}
      </mesh>
      <mesh position={[0.13, 0.2, 0.05]}>
        <sphereGeometry args={[0.024, 10, 8]} />
        <Toon color={belly} />
      </mesh>

      {/* Collar with a little bell */}
      <mesh position={[0, 0.195, 0.005]} rotation={[Math.PI / 2 - 0.15, 0, 0]}>
        <torusGeometry args={[0.072, 0.012, 8, 24]} />
        <Toon color="#ef4444" />
      </mesh>
      <mesh position={[0, 0.18, 0.078]}>
        <sphereGeometry args={[0.019, 10, 8]} />
        <Toon color="#fbbf24" />
        {line}
      </mesh>

      {/* Head: wide and round, with cheeks */}
      <group position={[0, 0.3, 0.015]}>
        <mesh scale={[1.18, 0.98, 1]} castShadow>
          <sphereGeometry args={[0.11, 20, 16]} />
          <Toon color={color} />
          {line}
        </mesh>
        {/* Ears: flattened cones with pink insides, tilted out */}
        {[-1, 1].map(side => (
          <group key={side} position={[side * 0.075, 0.085, -0.005]} rotation={[0, 0, side * -0.38]}>
            <mesh scale={[1, 1, 0.55]}>
              <coneGeometry args={[0.048, 0.085, 16]} />
              <Toon color={color} />
              {line}
            </mesh>
            <mesh position={[0, -0.008, 0.016]} scale={[0.6, 0.7, 0.3]}>
              <coneGeometry args={[0.048, 0.085, 16]} />
              <Toon color={inner} />
            </mesh>
          </group>
        ))}
        {/* Muzzle, nose and a little "w" mouth */}
        {[-1, 1].map(side => (
          <mesh key={side} position={[side * 0.022, -0.035, 0.093]} scale={[1, 0.8, 0.7]}>
            <sphereGeometry args={[0.028, 12, 10]} />
            <Toon color={belly} />
          </mesh>
        ))}
        <mesh position={[0, -0.016, 0.113]} rotation={[Math.PI / 2, 0, Math.PI]} scale={[1.3, 1, 0.8]}>
          <coneGeometry args={[0.011, 0.012, 3]} />
          <meshBasicMaterial color="#f472b6" />
        </mesh>
        {[-1, 1].map(side => (
          <mesh key={side} position={[side * 0.013, -0.034, 0.118]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.012, 0.0035, 6, 12, Math.PI]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
        ))}
        {/* Whiskers */}
        {[-1, 1].map(side => [0.012, -0.012].map(dy => (
          <mesh key={`${side}${dy}`} position={[side * 0.1, -0.03 + dy, 0.075]} rotation={[0, side * -0.45, Math.PI / 2 + side * dy * 10]}>
            <cylinderGeometry args={[0.0022, 0.0022, 0.07, 4]} />
            <meshBasicMaterial color={shade(color, -0.55)} />
          </mesh>
        )))}
        <PetEyes y={0.012} z={0.096} spread={0.045} size={0.02} />
      </group>
    </group>
  );
};

/** A chibi puppy sitting up: floppy ears, a pale snout with a button nose, a tongue and a wagging tail. */
const Puppy = ({ color, tail }: { color: string; tail: React.RefObject<THREE.Mesh> }) => {
  const line = <Outlines thickness={0.008} color={INK} />;
  const pale = shade(color, 0.6);
  const ear = shade(color, -0.3);
  return (
    <group>
      <mesh position={[0, 0.1, 0]} scale={[1, 1.05, 0.95]} castShadow><sphereGeometry args={[0.11, 18, 14]} /><Toon color={color} />{line}</mesh>
      <mesh position={[0, 0.11, 0.07]} scale={[0.75, 0.85, 0.5]}><sphereGeometry args={[0.08, 14, 10]} /><Toon color={pale} /></mesh>
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 0.045, 0.018, 0.085]} scale={[1, 0.75, 1.25]}><sphereGeometry args={[0.032, 12, 10]} /><Toon color={pale} />{line}</mesh>
      ))}
      <group position={[0, 0.1, -0.1]}>
        <mesh ref={tail} position={[0, 0.06, -0.02]} rotation={[-0.6, 0, 0]}>
          <capsuleGeometry args={[0.022, 0.08, 4, 8]} /><Toon color={color} />{line}
        </mesh>
      </group>
      <group position={[0, 0.3, 0.015]}>
        <mesh scale={[1.1, 1, 1]} castShadow><sphereGeometry args={[0.11, 20, 16]} /><Toon color={color} />{line}</mesh>
        {[-1, 1].map(side => (
          <mesh key={side} position={[side * 0.11, -0.02, -0.005]} rotation={[0, 0, side * 0.35]} scale={[0.55, 1.15, 0.45]} castShadow>
            <sphereGeometry args={[0.07, 14, 10]} /><Toon color={ear} />{line}
          </mesh>
        ))}
        <mesh position={[0, -0.035, 0.085]} scale={[1.1, 0.8, 0.8]}><sphereGeometry args={[0.048, 14, 10]} /><Toon color={pale} /></mesh>
        <mesh position={[0, -0.012, 0.125]} scale={[1.3, 0.9, 0.9]}><sphereGeometry args={[0.016, 10, 8]} /><meshBasicMaterial color="#0f172a" /></mesh>
        <mesh position={[0, -0.07, 0.11]} rotation={[0.4, 0, 0]} scale={[1, 1.2, 0.5]}><sphereGeometry args={[0.016, 8, 6]} /><Toon color="#fb7185" /></mesh>
        <PetEyes y={0.022} z={0.095} spread={0.045} size={0.019} />
      </group>
    </group>
  );
};

/** A chibi panda: white with dark ears, eye patches, arms and feet (the colour picks the dark parts). */
const Panda = ({ color }: { color: string }) => {
  const line = <Outlines thickness={0.008} color={INK} />;
  const n = parseInt(color.slice(1), 16);
  const light = ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 200;
  const dark = light ? '#292524' : color;
  const white = '#fafaf9';
  return (
    <group>
      <mesh position={[0, 0.11, 0]} scale={[1.05, 1, 0.95]} castShadow><sphereGeometry args={[0.12, 18, 14]} /><Toon color={white} />{line}</mesh>
      {[-1, 1].map(side => (
        <group key={side}>
          <mesh position={[side * 0.1, 0.12, 0.04]} rotation={[0, 0, side * 0.5]} scale={[0.7, 1.2, 0.8]}><sphereGeometry args={[0.045, 12, 10]} /><Toon color={dark} />{line}</mesh>
          <mesh position={[side * 0.06, 0.02, 0.07]} scale={[1, 0.7, 1.2]}><sphereGeometry args={[0.04, 12, 10]} /><Toon color={dark} />{line}</mesh>
        </group>
      ))}
      <group position={[0, 0.3, 0.01]}>
        <mesh scale={[1.12, 1, 1]} castShadow><sphereGeometry args={[0.115, 20, 16]} /><Toon color={white} />{line}</mesh>
        {[-1, 1].map(side => (
          <mesh key={side} position={[side * 0.085, 0.085, -0.01]} scale={[1, 1, 0.6]}><sphereGeometry args={[0.04, 12, 10]} /><Toon color={dark} />{line}</mesh>
        ))}
        {[-1, 1].map(side => (
          <mesh key={side} position={[side * 0.045, 0.01, 0.09]} rotation={[0, 0, side * -0.5]} scale={[0.75, 1.05, 0.4]}><sphereGeometry args={[0.035, 12, 10]} /><Toon color={dark} /></mesh>
        ))}
        {[-1, 1].map(side => (
          <group key={side} position={[side * 0.045, 0.014, 0.106]}>
            <mesh><sphereGeometry args={[0.012, 8, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh position={[0.003, 0.003, 0.009]}><sphereGeometry args={[0.006, 6, 6]} /><meshBasicMaterial color="#0f172a" /></mesh>
          </group>
        ))}
        <mesh position={[0, -0.03, 0.112]} scale={[1.3, 0.9, 0.8]}><sphereGeometry args={[0.012, 8, 6]} /><meshBasicMaterial color="#0f172a" /></mesh>
        {[-1, 1].map(side => (
          <mesh key={side} position={[side * 0.075, -0.04, 0.085]}><sphereGeometry args={[0.014, 8, 6]} /><meshBasicMaterial color="#fda4af" /></mesh>
        ))}
      </group>
    </group>
  );
};

/** A little companion that sits beside the character and idles. */
export const Pet = ({ look, ...props }: { look: CharacterLook; [k: string]: any }) => {
  const ref = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      ref.current.position.y = look.pet === 'frog' || look.pet === 'bunny' || look.pet === 'puppy' ? Math.max(0, Math.sin(t * 2.2)) ** 8 * 0.06 : 0;
      ref.current.rotation.z = Math.sin(t * 1.3) * 0.05;
    }
    if (tail.current) tail.current.rotation.y = Math.sin(t * 2.4) * 0.25;
  });
  if (look.pet === 'none') return null;
  const c = look.petColor;
  const line = <Outlines thickness={0.008} color={INK} />;

  return (
    <group {...props}>
      <group ref={ref}>
        {look.pet === 'cat' && <Cat color={c} tail={tail} />}
        {look.pet === 'puppy' && <Puppy color={c} tail={tail} />}
        {look.pet === 'panda' && <Panda color={c} />}
        {look.pet === 'bunny' && (
          <>
            <mesh position={[0, 0.11, 0]} scale={[1, 0.9, 1.1]} castShadow><sphereGeometry args={[0.12, 16, 12]} /><Toon color={c} />{line}</mesh>
            <mesh position={[0, 0.25, 0.06]} castShadow><sphereGeometry args={[0.1, 16, 12]} /><Toon color={c} />{line}</mesh>
            {[-1, 1].map(side => (
              <group key={side} position={[side * 0.042, 0.4, 0.04]} rotation={[0, 0, side * -0.15]}>
                <mesh><capsuleGeometry args={[0.028, 0.13, 4, 8]} /><Toon color={c} />{line}</mesh>
                <mesh position={[0, 0, 0.016]} scale={[0.5, 0.85, 0.4]}><capsuleGeometry args={[0.028, 0.13, 4, 8]} /><Toon color="#fbcfe8" /></mesh>
              </group>
            ))}
            <PetEyes y={0.26} z={0.152} spread={0.038} />
            <mesh position={[0, 0.235, 0.16]}><sphereGeometry args={[0.01, 8, 6]} /><meshBasicMaterial color="#f472b6" /></mesh>
            <mesh position={[0, 0.1, -0.135]}><sphereGeometry args={[0.04, 10, 8]} /><Toon color="#ffffff" /></mesh>
          </>
        )}
        {look.pet === 'chick' && (
          <>
            <mesh position={[0, 0.14, 0]} castShadow><sphereGeometry args={[0.14, 18, 14]} /><Toon color={c} />{line}</mesh>
            {[-1, 1].map(side => (
              <mesh key={side} position={[side * 0.135, 0.12, -0.01]} rotation={[0, 0, side * 0.5]} scale={[0.4, 0.8, 0.7]}>
                <sphereGeometry args={[0.07, 10, 8]} /><Toon color={shade(c, -0.08)} />
              </mesh>
            ))}
            {[-0.25, 0.25].map(a => (
              <mesh key={a} position={[0, 0.29, 0]} rotation={[0, 0, a]}><capsuleGeometry args={[0.012, 0.05, 4, 6]} /><Toon color={shade(c, -0.1)} /></mesh>
            ))}
            <mesh position={[0, 0.15, 0.145]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.026, 0.05, 8]} /><Toon color="#f97316" /></mesh>
            <PetEyes y={0.19} z={0.125} spread={0.05} />
            {[-1, 1].map(side => (
              <mesh key={side} position={[side * 0.045, 0.008, 0.05]} scale={[1, 0.3, 1.4]}><sphereGeometry args={[0.025, 8, 6]} /><Toon color="#f97316" /></mesh>
            ))}
          </>
        )}
        {look.pet === 'frog' && (
          <>
            <mesh position={[0, 0.1, 0]} scale={[1.2, 0.78, 1]} castShadow><sphereGeometry args={[0.13, 18, 14]} /><Toon color={c} />{line}</mesh>
            {[-1, 1].map(side => (
              <group key={side} position={[side * 0.065, 0.19, 0.04]}>
                <mesh><sphereGeometry args={[0.045, 12, 10]} /><Toon color={c} />{line}</mesh>
                <mesh position={[0, 0.005, 0.038]}><sphereGeometry args={[0.018, 8, 8]} /><meshBasicMaterial color="#0f172a" /></mesh>
              </group>
            ))}
            <mesh position={[0, 0.11, 0.13]} rotation={[Math.PI, 0, 0]}><torusGeometry args={[0.04, 0.007, 6, 14, Math.PI]} /><meshBasicMaterial color="#0f172a" /></mesh>
            {[-1, 1].map(side => (
              <mesh key={side} position={[side * 0.085, 0.1, 0.11]}><sphereGeometry args={[0.016, 8, 6]} /><meshBasicMaterial color="#fda4af" /></mesh>
            ))}
            {[-1, 1].map(side => (
              <mesh key={`f${side}`} position={[side * 0.09, 0.01, 0.08]} scale={[1.3, 0.35, 1]}><sphereGeometry args={[0.035, 8, 6]} /><Toon color={shade(c, -0.1)} /></mesh>
            ))}
          </>
        )}
      </group>
    </group>
  );
};
