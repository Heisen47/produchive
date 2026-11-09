import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Falling rain or snow drawn as a single instanced mesh (one draw call).
 * Drops fall inside a box and wrap back to the top.
 */
export const Precipitation = ({
  kind, count = 300, area = [20, 12, 20], center = [0, 6, 0], color, speed,
}: {
  kind: 'rain' | 'snow';
  count?: number;
  area?: [number, number, number];
  center?: [number, number, number];
  color?: string;
  speed?: number;
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const fall = speed ?? (kind === 'rain' ? 9 : 0.9);
  const drops = useMemo(() => Array.from({ length: count }, (_, i) => {
    // Deterministic spread so the scene looks the same on every render.
    const r = (n: number) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
    return {
      x: (r(1) - 0.5) * area[0],
      y: r(2) * area[1],
      z: (r(3) - 0.5) * area[2],
      sway: r(4) * Math.PI * 2,
      rate: 0.7 + r(5) * 0.6,
    };
  }), [count, area]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = Math.min(delta, 0.1);
    drops.forEach((d, i) => {
      d.y -= fall * d.rate * dt;
      if (d.y < 0) d.y += area[1];
      if (kind === 'snow') d.sway += dt * 0.8;
      const swayX = kind === 'snow' ? Math.sin(d.sway) * 0.3 : 0;
      dummy.position.set(center[0] + d.x + swayX, center[1] - area[1] / 2 + d.y, center[2] + d.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      {kind === 'rain'
        ? <boxGeometry args={[0.015, 0.35, 0.015]} />
        : <sphereGeometry args={[0.05, 6, 6]} />}
      <meshBasicMaterial color={color ?? (kind === 'rain' ? '#cbd5e1' : '#ffffff')} transparent opacity={kind === 'rain' ? 0.55 : 0.9} />
    </instancedMesh>
  );
};
