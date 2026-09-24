import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// Nodes in a balanced 3D contrast geometry
const CONTRAST_NODES = [
  { id: '1', pos: [0, 0, 0] as [number, number, number], color: '#818CF8', emissive: '#4F46E5', size: 0.65 },
  { id: '2', pos: [-2.0, 1.1, 0.4] as [number, number, number], color: '#A78BFA', emissive: '#7C3AED', size: 0.52 },
  { id: '3', pos: [2.0, 0.8, -0.5] as [number, number, number], color: '#67E8F9', emissive: '#06B6D4', size: 0.54 },
  { id: '4', pos: [-1.2, -1.6, -0.6] as [number, number, number], color: '#C084FC', emissive: '#9333EA', size: 0.48 },
  { id: '5', pos: [1.5, -1.4, 0.6] as [number, number, number], color: '#93C5FD', emissive: '#3B82F6', size: 0.5 },
  { id: '6', pos: [0, 2.2, -0.4] as [number, number, number], color: '#818CF8', emissive: '#4F46E5', size: 0.46 },
];

const CONTRAST_BONDS = [
  { source: [0, 0, 0] as [number, number, number], target: [-2.0, 1.1, 0.4] as [number, number, number] },
  { source: [0, 0, 0] as [number, number, number], target: [2.0, 0.8, -0.5] as [number, number, number] },
  { source: [0, 0, 0] as [number, number, number], target: [-1.2, -1.6, -0.6] as [number, number, number] },
  { source: [0, 0, 0] as [number, number, number], target: [1.5, -1.4, 0.6] as [number, number, number] },
  { source: [0, 0, 0] as [number, number, number], target: [0, 2.2, -0.4] as [number, number, number] },
  { source: [-2.0, 1.1, 0.4] as [number, number, number], target: [0, 2.2, -0.4] as [number, number, number] },
  { source: [2.0, 0.8, -0.5] as [number, number, number], target: [1.5, -1.4, 0.6] as [number, number, number] },
];

const ContrastBond: React.FC<{ source: [number, number, number]; target: [number, number, number] }> = ({
  source,
  target,
}) => {
  const { position, quaternion, length } = useMemo(() => {
    const vS = new THREE.Vector3(...source);
    const vT = new THREE.Vector3(...target);
    const mid = new THREE.Vector3().addVectors(vS, vT).multiplyScalar(0.5);
    const len = vS.distanceTo(vT);
    const dir = new THREE.Vector3().subVectors(vT, vS).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    return { position: mid, quaternion: quat, length: len };
  }, [source, target]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.025, 0.025, length, 16]} />
      <meshStandardMaterial
        color="#818CF8"
        emissive="#6366F1"
        emissiveIntensity={0.6}
        roughness={0.2}
        transparent={true}
        opacity={0.7}
      />
    </mesh>
  );
};

const GlowingCrystalNode: React.FC<{ node: typeof CONTRAST_NODES[0] }> = ({ node }) => {
  return (
    <group position={node.pos}>
      {/* Outer translucent crystal shell */}
      <mesh>
        <sphereGeometry args={[node.size, 32, 32]} />
        <meshPhysicalMaterial
          color={node.color}
          emissive={node.emissive}
          emissiveIntensity={0.4}
          roughness={0.1}
          metalness={0.1}
          transmission={0.8}
          thickness={1.5}
          transparent={true}
          opacity={0.9}
          clearcoat={1}
        />
      </mesh>

      {/* Radiant inner core */}
      <mesh>
        <sphereGeometry args={[node.size * 0.42, 16, 16]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive={node.emissive}
          emissiveIntensity={1.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
};

const ContrastCluster: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current && !reducedMotion) {
      groupRef.current.rotation.y += delta * 0.15;
      groupRef.current.rotation.x = Math.sin(Date.now() * 0.0004) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {CONTRAST_BONDS.map((bond, idx) => (
        <ContrastBond key={`bond-${idx}`} source={bond.source} target={bond.target} />
      ))}
      {CONTRAST_NODES.map(node => (
        <GlowingCrystalNode key={node.id} node={node} />
      ))}
    </group>
  );
};

export const ContrastSection: React.FC = () => {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  return (
    <section className="relative w-full bg-[#070A14] text-white py-28 sm:py-36 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Radial Indigo Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-5xl text-center space-y-6">
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-light tracking-tight text-slate-100 leading-[1.12]">
          Your relationships are <br className="hidden sm:inline" />
          <span className="font-semibold bg-gradient-to-r from-indigo-300 via-indigo-100 to-violet-300 bg-clip-text text-transparent">
            already connected.
          </span>
        </h2>

        <p className="text-lg sm:text-xl text-indigo-200/80 font-light max-w-2xl mx-auto leading-relaxed">
          Boring gives them a structure you can explore.
        </p>

        {/* The Molecular Object as the Main Visual */}
        <div className="pt-8 w-full h-[380px] sm:h-[480px] relative flex items-center justify-center">
          {hasWebGL ? (
            <div className="w-full h-full">
              <Canvas
                camera={{ position: [0, 0, 7.2], fov: 45 }}
                dpr={[1, 1.8]}
                gl={{ antialias: true, alpha: true }}
              >
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 8, 5]} intensity={1.5} color="#E0E7FF" />
                <directionalLight position={[-5, -5, -4]} intensity={0.6} color="#A78BFA" />
                <pointLight position={[0, 0, 2]} intensity={1.2} color="#818CF8" />

                <Float
                  speed={reducedMotion ? 0 : 1.4}
                  rotationIntensity={reducedMotion ? 0 : 0.25}
                  floatIntensity={reducedMotion ? 0 : 0.4}
                >
                  <ContrastCluster reducedMotion={reducedMotion} />
                </Float>
              </Canvas>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
              <div className="h-16 w-16 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 text-xl font-bold">
                M
              </div>
              <p className="text-xs">Luminescent Molecular Network</p>
            </div>
          )}
        </div>

        <p className="text-xs text-indigo-300/60 tracking-wider uppercase font-mono pt-4">
          Spatial Relationship Topology • Zero Clutter
        </p>
      </div>
    </section>
  );
};
