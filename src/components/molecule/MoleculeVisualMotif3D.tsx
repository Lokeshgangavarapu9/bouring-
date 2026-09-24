import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MoleculeIdentityConfig } from '../../types';

interface MoleculeVisualMotif3DProps {
  identity: MoleculeIdentityConfig;
  isSelf?: boolean;
  smoky?: boolean;
  twinkling?: boolean;
}

/**
 * Smooth 3D Internal Wisp & Motif System
 */
export const MoleculeVisualMotif3D: React.FC<MoleculeVisualMotif3DProps> = ({
  identity,
  smoky = false,
  twinkling = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const wispRef1 = useRef<THREE.Group>(null);
  const wispRef2 = useRef<THREE.Group>(null);
  const smokyRef = useRef<THREE.Group>(null);
  const twinkleRef = useRef<THREE.Points>(null);

  const { theme } = identity;

  // Gentle procedural rotation & floating flow
  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.15;
    }

    if (wispRef1.current) {
      wispRef1.current.rotation.y = t * 0.22;
      wispRef1.current.rotation.x = Math.sin(t * 0.3) * 0.12;
    }

    if (wispRef2.current) {
      wispRef2.current.rotation.y = -t * 0.18;
      wispRef2.current.rotation.z = Math.cos(t * 0.25) * 0.1;
    }

    if (smokyRef.current) {
      smokyRef.current.rotation.y = t * 0.1;
      smokyRef.current.rotation.x = Math.sin(t * 0.15) * 0.08;
    }

    if (twinkleRef.current) {
      // Gentle sinusoidal twinkle pulse
      const pulse = 0.65 + Math.sin(t * 2.2) * 0.35;
      const mat = twinkleRef.current.material as THREE.PointsMaterial;
      if (mat) {
        mat.opacity = pulse;
      }
    }
  });

  // Generates 8 tiny, delicate twinkling star points within the sphere volume
  const twinklePositions = useMemo(() => {
    const pts = new Float32Array(8 * 3);
    const r = 0.38;
    const angles = [0.2, 1.1, 1.9, 2.7, 3.5, 4.3, 5.1, 5.9];
    angles.forEach((a, i) => {
      pts[i * 3] = Math.cos(a) * r * (0.6 + (i % 3) * 0.15);
      pts[i * 3 + 1] = Math.sin(a * 1.5) * r * 0.7;
      pts[i * 3 + 2] = Math.sin(a) * r * (0.6 + (i % 2) * 0.2);
    });
    return pts;
  }, []);

  // Identity-specific smooth 3D wisp geometries
  const renderIdentityWisps = () => {
    switch (theme.wispStyle) {
      case 'curved-luminous': // Aries: soft warm pearlescent orb with delicate curved luminous wisps
        return (
          <group ref={wispRef1}>
            <mesh rotation={[0.4, 0.2, 0.3]}>
              <torusGeometry args={[0.34, 0.022, 16, 48, Math.PI * 1.4]} />
              <meshStandardMaterial
                color={theme.internalWispColor}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.65}
                transparent={true}
                opacity={0.6}
                roughness={0.2}
              />
            </mesh>
            <mesh rotation={[-0.5, 0.8, -0.2]}>
              <torusGeometry args={[0.26, 0.018, 16, 48, Math.PI * 1.2]} />
              <meshStandardMaterial
                color={theme.secondaryWispColor || theme.internalWispColor}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.5}
                transparent={true}
                opacity={0.5}
                roughness={0.2}
              />
            </mesh>
          </group>
        );

      case 'botanical-surface': // Taurus: soft earthy pearl orb with gentle botanical-like surface wisps
        return (
          <group ref={wispRef1}>
            <mesh rotation={[0.2, 0.4, 0.1]}>
              <torusGeometry args={[0.36, 0.02, 16, 48, Math.PI * 1.5]} />
              <meshStandardMaterial
                color={theme.internalWispColor}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.55}
                transparent={true}
                opacity={0.65}
                roughness={0.25}
              />
            </mesh>
            <mesh rotation={[-0.3, -0.6, 0.5]}>
              <torusGeometry args={[0.28, 0.016, 16, 48, Math.PI * 1.1]} />
              <meshStandardMaterial
                color={theme.secondaryWispColor || '#D6E2D5'}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.45}
                transparent={true}
                opacity={0.5}
              />
            </mesh>
          </group>
        );

      case 'dual-orbit': // Gemini: dual-color orb with two delicate translucent orbit wisps
        return (
          <>
            <group ref={wispRef1}>
              <mesh rotation={[Math.PI / 4, 0.2, 0]}>
                <torusGeometry args={[0.38, 0.016, 16, 64]} />
                <meshStandardMaterial
                  color={theme.internalWispColor}
                  emissive={theme.internalWispColor}
                  emissiveIntensity={0.65}
                  transparent={true}
                  opacity={0.65}
                />
              </mesh>
            </group>
            <group ref={wispRef2}>
              <mesh rotation={[-Math.PI / 4, -0.2, 0.4]}>
                <torusGeometry args={[0.36, 0.016, 16, 64]} />
                <meshStandardMaterial
                  color={theme.secondaryWispColor || '#7AD1F5'}
                  emissive={theme.secondaryWispColor || '#7AD1F5'}
                  emissiveIntensity={0.65}
                  transparent={true}
                  opacity={0.65}
                />
              </mesh>
            </group>
          </>
        );

      case 'watery-cloud': // Cancer: watery pearl orb with soft cloud-like translucent layers
        return (
          <group ref={wispRef1}>
            <mesh>
              <sphereGeometry args={[0.36, 32, 32]} />
              <meshPhysicalMaterial
                color={theme.internalWispColor}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.25}
                transparent={true}
                opacity={0.38}
                roughness={0.2}
                transmission={0.4}
              />
            </mesh>
            <mesh rotation={[0.4, 0.3, 0]}>
              <torusGeometry args={[0.38, 0.02, 16, 48, Math.PI * 1.3]} />
              <meshStandardMaterial
                color={theme.secondaryWispColor || '#C2E2F7'}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.5}
                transparent={true}
                opacity={0.55}
              />
            </mesh>
          </group>
        );

      case 'golden-radiance': // Leo: warm golden pearl orb with a gentle inner radiance
        return (
          <group ref={wispRef1}>
            <mesh>
              <sphereGeometry args={[0.28, 24, 24]} />
              <meshStandardMaterial
                color={theme.internalWispColor}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.8}
                transparent={true}
                opacity={0.7}
                roughness={0.3}
              />
            </mesh>
            <mesh rotation={[0.5, 0.2, 0.4]}>
              <torusGeometry args={[0.37, 0.02, 16, 48, Math.PI * 1.6]} />
              <meshStandardMaterial
                color={theme.secondaryWispColor || '#FDE09A'}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.6}
                transparent={true}
                opacity={0.6}
              />
            </mesh>
          </group>
        );

      case 'mint-leaf': // Virgo: clean mint-ivory orb with fine soft leaf-like texture
        return (
          <group ref={wispRef1}>
            <mesh rotation={[0.3, 0.5, 0.2]}>
              <torusGeometry args={[0.35, 0.018, 16, 48, Math.PI * 1.4]} />
              <meshStandardMaterial
                color={theme.internalWispColor}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.55}
                transparent={true}
                opacity={0.65}
              />
            </mesh>
            <mesh rotation={[-0.4, -0.3, 0.6]}>
              <torusGeometry args={[0.29, 0.016, 16, 48, Math.PI * 1.2]} />
              <meshStandardMaterial
                color={theme.secondaryWispColor || '#DDF0E5'}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.45}
                transparent={true}
                opacity={0.5}
              />
            </mesh>
          </group>
        );

      case 'silky-bands': // Libra: balanced lilac pearl orb with two silky translucent bands
        return (
          <group ref={wispRef1}>
            <mesh rotation={[Math.PI / 6, 0.3, 0]}>
              <torusGeometry args={[0.37, 0.02, 16, 64]} />
              <meshPhysicalMaterial
                color={theme.internalWispColor}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.5}
                transparent={true}
                opacity={0.65}
                roughness={0.15}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 6, -0.3, 0]}>
              <torusGeometry args={[0.35, 0.018, 16, 64]} />
              <meshPhysicalMaterial
                color={theme.secondaryWispColor || '#E8DCF7'}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.45}
                transparent={true}
                opacity={0.55}
                roughness={0.15}
              />
            </mesh>
          </group>
        );

      case 'smoky-sweep': // Scorpio: deep violet pearl orb with one soft smoky luminous sweep
        return (
          <group ref={wispRef1}>
            <mesh rotation={[0.5, 0.4, 0.2]}>
              <torusGeometry args={[0.36, 0.026, 16, 64, Math.PI * 1.7]} />
              <meshStandardMaterial
                color={theme.internalWispColor}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.8}
                transparent={true}
                opacity={0.7}
                roughness={0.2}
              />
            </mesh>
          </group>
        );

      case 'diagonal-trail': // Sagittarius: cool pearl orb with one graceful diagonal light trail
        return (
          <group ref={wispRef1}>
            <mesh rotation={[Math.PI / 4, Math.PI / 4, 0.2]}>
              <torusGeometry args={[0.38, 0.022, 16, 64, Math.PI * 1.5]} />
              <meshStandardMaterial
                color={theme.internalWispColor}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.7}
                transparent={true}
                opacity={0.65}
              />
            </mesh>
          </group>
        );

      case 'mineral-curved': // Capricorn: soft teal mineral pearl orb with subtle curved texture
        return (
          <group ref={wispRef1}>
            <mesh rotation={[0.3, 0.2, 0.6]}>
              <torusGeometry args={[0.36, 0.02, 16, 48, Math.PI * 1.3]} />
              <meshStandardMaterial
                color={theme.internalWispColor}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.55}
                transparent={true}
                opacity={0.65}
              />
            </mesh>
            <mesh rotation={[-0.4, 0.5, -0.3]}>
              <torusGeometry args={[0.3, 0.016, 16, 48, Math.PI * 1.2]} />
              <meshStandardMaterial
                color={theme.secondaryWispColor || '#C7E4DF'}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.45}
                transparent={true}
                opacity={0.5}
              />
            </mesh>
          </group>
        );

      case 'flowing-wisps': // Aquarius: aqua pearl orb wrapped by silky flowing translucent wisps
        return (
          <group ref={wispRef1}>
            <mesh rotation={[0.4, 0.5, 0.3]}>
              <torusGeometry args={[0.38, 0.022, 16, 64, Math.PI * 1.6]} />
              <meshPhysicalMaterial
                color={theme.internalWispColor}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.65}
                transparent={true}
                opacity={0.65}
                roughness={0.15}
              />
            </mesh>
            <mesh rotation={[-0.5, -0.3, 0.6]}>
              <torusGeometry args={[0.32, 0.018, 16, 64, Math.PI * 1.3]} />
              <meshPhysicalMaterial
                color={theme.secondaryWispColor || '#B6EFF2'}
                emissive={theme.internalWispColor}
                emissiveIntensity={0.5}
                transparent={true}
                opacity={0.55}
                roughness={0.15}
              />
            </mesh>
          </group>
        );

      case 'dual-flowing': // Pisces: blue-pink pearl orb with two gentle flowing light wisps
        return (
          <>
            <group ref={wispRef1}>
              <mesh rotation={[0.4, 0.3, 0.2]}>
                <torusGeometry args={[0.36, 0.02, 16, 64, Math.PI * 1.5]} />
                <meshStandardMaterial
                  color={theme.internalWispColor}
                  emissive={theme.internalWispColor}
                  emissiveIntensity={0.65}
                  transparent={true}
                  opacity={0.65}
                />
              </mesh>
            </group>
            <group ref={wispRef2}>
              <mesh rotation={[-0.4, -0.4, 0.5]}>
                <torusGeometry args={[0.33, 0.018, 16, 64, Math.PI * 1.4]} />
                <meshStandardMaterial
                  color={theme.secondaryWispColor || '#7EB0EC'}
                  emissive={theme.secondaryWispColor || '#7EB0EC'}
                  emissiveIntensity={0.6}
                  transparent={true}
                  opacity={0.6}
                />
              </mesh>
            </group>
          </>
        );

      case 'neutral-pearl': // Signature Landing-Page Crystal Molecule
      default:
        return (
          <group ref={wispRef1}>
            {/* Satellite Crystal Spheres with glowing nuclei */}
            {[
              { pos: [-0.32, 0.2, 0.1] as [number, number, number], col: '#A78BFA', em: '#7C3AED', r: 0.1 },
              { pos: [0.34, 0.14, -0.09] as [number, number, number], col: '#67E8F9', em: '#06B6D4', r: 0.1 },
              { pos: [-0.22, -0.26, -0.11] as [number, number, number], col: '#C084FC', em: '#9333EA', r: 0.09 },
              { pos: [0.26, -0.22, 0.12] as [number, number, number], col: '#818CF8', em: '#4F46E5', r: 0.1 },
              { pos: [0.05, 0.36, -0.08] as [number, number, number], col: '#93C5FD', em: '#3B82F6', r: 0.085 },
            ].map((sat, idx) => (
              <group key={idx} position={sat.pos}>
                <mesh>
                  <sphereGeometry args={[sat.r, 20, 20]} />
                  <meshPhysicalMaterial
                    color={sat.col}
                    emissive={sat.em}
                    emissiveIntensity={0.3}
                    roughness={0.1}
                    metalness={0.08}
                    transmission={0.8}
                    thickness={1.6}
                    transparent={true}
                    opacity={0.9}
                    clearcoat={1}
                  />
                </mesh>
                <mesh>
                  <sphereGeometry args={[sat.r * 0.38, 12, 12]} />
                  <meshStandardMaterial
                    color={sat.em}
                    emissive={sat.em}
                    emissiveIntensity={1.0}
                  />
                </mesh>
              </group>
            ))}

            {/* Micro crystal bond lines */}
            {[
              { from: [0, 0, 0], to: [-0.32, 0.2, 0.1] },
              { from: [0, 0, 0], to: [0.34, 0.14, -0.09] },
              { from: [0, 0, 0], to: [-0.22, -0.26, -0.11] },
              { from: [0, 0, 0], to: [0.26, -0.22, 0.12] },
              { from: [0, 0, 0], to: [0.05, 0.36, -0.08] },
              { from: [-0.32, 0.2, 0.1], to: [0.05, 0.36, -0.08] },
              { from: [0.34, 0.14, -0.09], to: [0.26, -0.22, 0.12] },
            ].map((b, i) => {
              const vA = new THREE.Vector3(...b.from);
              const vB = new THREE.Vector3(...b.to);
              const mid = new THREE.Vector3().addVectors(vA, vB).multiplyScalar(0.5);
              const len = vA.distanceTo(vB);
              const dir = new THREE.Vector3().subVectors(vB, vA).normalize();
              const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
              return (
                <mesh key={i} position={mid} quaternion={quat}>
                  <cylinderGeometry args={[0.012, 0.012, len, 12]} />
                  <meshPhysicalMaterial
                    color="#CBD5E1"
                    emissive="#A5B4FC"
                    emissiveIntensity={0.3}
                    transmission={0.7}
                    transparent={true}
                    opacity={0.65}
                    roughness={0.15}
                  />
                </mesh>
              );
            })}
          </group>
        );
    }
  };

  return (
    <group ref={groupRef}>
      {/* 1. Core Internal Wisp & Motif System */}
      {renderIdentityWisps()}

      {/* 2. Optional Smoky Effect Layer (PDF Page 19: Fluffy translucent cloud-like wisps) */}
      {smoky && (
        <group ref={smokyRef}>
          <mesh rotation={[0.2, 0.5, 0.1]}>
            <sphereGeometry args={[0.42, 28, 28]} />
            <meshPhysicalMaterial
              color={theme.internalWispColor}
              emissive={theme.glowColor}
              emissiveIntensity={0.3}
              transparent={true}
              opacity={0.22}
              roughness={0.4}
              transmission={0.6}
              thickness={0.8}
            />
          </mesh>
          <mesh rotation={[-0.3, 0.2, -0.4]}>
            <torusGeometry args={[0.41, 0.03, 16, 48, Math.PI * 1.8]} />
            <meshStandardMaterial
              color="#FFFFFF"
              emissive={theme.glowColor}
              emissiveIntensity={0.35}
              transparent={true}
              opacity={0.35}
              roughness={0.3}
            />
          </mesh>
        </group>
      )}

      {/* 3. Optional Twinkling Effect Layer (PDF Page 20: Tiny controlled light points, gentle pulse) */}
      {twinkling && (
        <points ref={twinkleRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={8}
              array={twinklePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.045}
            color="#FFFFFF"
            transparent={true}
            opacity={0.85}
            sizeAttenuation={true}
          />
        </points>
      )}
    </group>
  );
};
