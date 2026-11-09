import React, { useEffect, useMemo } from 'react';
import { Outlines } from '@react-three/drei';
import * as THREE from 'three';
import type { CharacterLook } from '../../lib/api-contract';

/**
 * Pieces of a customized character: fabric patterns, outfits, hair and
 * headwear. Sizes match Character in Shared3D: body capsule centred at y 0.8
 * (radius 0.25, y 0.3–1.3); head sphere radius 0.3 inside the head group.
 */

const Toon = ({ color, map, ...props }: { color: string; map?: THREE.Texture | null; [k: string]: any }) => (
  <meshToonMaterial color={map ? '#ffffff' : color} map={map ?? undefined} {...props} />
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

/** A small tiling fabric texture for the outfit, or null for a plain outfit. */
export function useFabric(pattern: CharacterLook['pattern'], base: string, ink: string): THREE.Texture | null {
  const texture = useMemo(() => {
    if (pattern === 'none' || typeof document === 'undefined') return null;
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = ink;
    if (pattern === 'stripes') {
      for (let y = 0; y < size; y += 16) ctx.fillRect(0, y, size, 7);
    } else if (pattern === 'dots') {
      for (const [x, y] of [[16, 16], [48, 48], [48, 16], [16, 48]]) {
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (pattern === 'stars') {
      drawStar(ctx, 18, 18, 9); drawStar(ctx, 48, 44, 7);
    } else if (pattern === 'checks') {
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < size; i += 16) { ctx.fillRect(i, 0, 8, size); ctx.fillRect(0, i, size, 8); }
      ctx.globalAlpha = 1;
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [pattern, base, ink]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

/* ---------------------------------------------------------------- outfits */

/** The torso, dressed for the chosen outfit (replaces the plain body capsule). */
export const OutfitBody = ({ look }: { look: CharacterLook }) => {
  const fabric = useFabric(look.pattern, look.outfitColor, look.patternColor);
  const cloth = look.outfitColor;
  const shirt = '#f5f5f4';

  // Overalls and cardigans show a shirt underneath, so the base body is the shirt.
  const bodyColor = look.outfit === 'overalls' || look.outfit === 'cardigan' ? shirt : cloth;
  const bodyFabric = look.outfit === 'overalls' ? null : look.outfit === 'cardigan' ? null : fabric;

  return (
    <group>
      <mesh position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.5, 4, 16]} />
        <Toon color={bodyColor} map={bodyFabric} />
        <Outlines thickness={0.015} color="#292524" />
      </mesh>

      {look.outfit === 'hoodie' && (
        <group>
          {/* Hood resting behind the neck, front pocket, drawstrings */}
          <mesh position={[0, 1.22, -0.13]} rotation={[Math.PI / 2.4, 0, 0]} castShadow>
            <torusGeometry args={[0.19, 0.075, 10, 24]} />
            <Toon color={shade(cloth, -0.12)} />
          </mesh>
          <mesh position={[0, 0.66, 0.235]}>
            <boxGeometry args={[0.32, 0.13, 0.04]} />
            <Toon color={shade(cloth, -0.15)} />
          </mesh>
          {[-0.06, 0.06].map(x => (
            <mesh key={x} position={[x, 1.08, 0.24]}>
              <cylinderGeometry args={[0.01, 0.01, 0.16, 6]} />
              <meshBasicMaterial color="#f8fafc" />
            </mesh>
          ))}
        </group>
      )}

      {look.outfit === 'dress' && (
        <group>
          <mesh position={[0, 0.5, 0]} castShadow>
            <coneGeometry args={[0.46, 0.62, 24, 1, true]} />
            <Toon color={cloth} map={fabric} side={THREE.DoubleSide} />
            <Outlines thickness={0.012} color="#292524" />
          </mesh>
          <mesh position={[0, 0.82, 0]}>
            <cylinderGeometry args={[0.262, 0.262, 0.06, 20]} />
            <Toon color={shade(cloth, -0.25)} />
          </mesh>
        </group>
      )}

      {look.outfit === 'kimono' && (
        <group>
          {/* Wide obi sash and a white crossed collar */}
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.265, 0.265, 0.16, 24]} />
            <Toon color={shade(cloth, -0.35)} />
          </mesh>
          <mesh position={[-0.05, 1.08, 0.215]} rotation={[0.2, 0, -0.6]}>
            <boxGeometry args={[0.05, 0.28, 0.03]} />
            <meshBasicMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[0.05, 1.08, 0.215]} rotation={[0.2, 0, 0.6]}>
            <boxGeometry args={[0.05, 0.28, 0.03]} />
            <meshBasicMaterial color="#f8fafc" />
          </mesh>
        </group>
      )}

      {look.outfit === 'overalls' && (
        <group>
          <mesh position={[0, 0.58, 0]} castShadow>
            <cylinderGeometry args={[0.265, 0.265, 0.5, 24]} />
            <Toon color={cloth} map={fabric} />
          </mesh>
          <mesh position={[0, 0.93, 0.2]}>
            <boxGeometry args={[0.28, 0.26, 0.08]} />
            <Toon color={cloth} map={fabric} />
          </mesh>
          {[-0.1, 0.1].map(x => (
            <mesh key={x} position={[x, 1.12, 0.05]} rotation={[0.9, 0, 0]}>
              <boxGeometry args={[0.05, 0.42, 0.03]} />
              <Toon color={shade(cloth, -0.1)} />
            </mesh>
          ))}
        </group>
      )}

      {look.outfit === 'cardigan' && (
        <group>
          {/* Two open front panels over the shirt, with buttons */}
          {[-1, 1].map(side => (
            <mesh key={side} position={[side * 0.13, 0.8, 0.13]} rotation={[0, side * 0.5, 0]}>
              <boxGeometry args={[0.16, 0.85, 0.2]} />
              <Toon color={cloth} map={fabric} />
            </mesh>
          ))}
          <mesh position={[0, 0.8, -0.05]}>
            <capsuleGeometry args={[0.255, 0.5, 4, 16]} />
            <Toon color={cloth} map={fabric} />
          </mesh>
          {[0.95, 0.8, 0.65].map(y => (
            <mesh key={y} position={[0.07, y, 0.25]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshBasicMaterial color={shade(cloth, -0.4)} />
            </mesh>
          ))}
        </group>
      )}
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
    default:
      return null;
  }
};
