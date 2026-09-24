import React, { useMemo } from 'react';
import * as THREE from 'three';

interface SpaceParticlesProps {
  count?: number;
  color?: string;
  opacity?: number;
}

/**
 * Lightweight, subtle starfield particles providing authentic parallax depth
 * in the dark space 3D visualization without distracting textures or heavy shaders.
 */
export const SpaceParticles: React.FC<SpaceParticlesProps> = ({
  count = 450,
  color = '#C7D2FE',
  opacity = 0.45,
}) => {
  const [positions, opacities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const op = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute randomly in a spherical shell around the network
      const radius = 25 + Math.random() * 45;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);

      op[i] = 0.25 + Math.random() * 0.45;
    }

    return [pos, op];
  }, [count]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    return geo;
  }, [positions, opacities]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.12}
        color={color}
        transparent={true}
        opacity={opacity}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  );
};
