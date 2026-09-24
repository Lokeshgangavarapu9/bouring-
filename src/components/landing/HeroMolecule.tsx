import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// Refined hero molecule configuration with crystal nodes
interface HeroNode {
  id: string;
  pos: [number, number, number];
  color: string;
  emissive: string;
  size: number;
}

interface HeroBond {
  source: [number, number, number];
  target: [number, number, number];
}

const HERO_NODES: HeroNode[] = [
  { id: '1', pos: [0, 0, 0], color: '#818CF8', emissive: '#4F46E5', size: 0.68 },
  { id: '2', pos: [-2.1, 1.3, 0.6], color: '#A78BFA', emissive: '#7C3AED', size: 0.52 },
  { id: '3', pos: [2.2, 0.9, -0.6], color: '#67E8F9', emissive: '#06B6D4', size: 0.54 },
  { id: '4', pos: [-1.4, -1.7, -0.7], color: '#C084FC', emissive: '#9333EA', size: 0.5 },
  { id: '5', pos: [1.7, -1.4, 0.8], color: '#818CF8', emissive: '#4F46E5', size: 0.55 },
  { id: '6', pos: [0.3, 2.4, -0.5], color: '#93C5FD', emissive: '#3B82F6', size: 0.46 },
];

const HERO_BONDS: HeroBond[] = [
  { source: [0, 0, 0], target: [-2.1, 1.3, 0.6] },
  { source: [0, 0, 0], target: [2.2, 0.9, -0.6] },
  { source: [0, 0, 0], target: [-1.4, -1.7, -0.7] },
  { source: [0, 0, 0], target: [1.7, -1.4, 0.8] },
  { source: [0, 0, 0], target: [0.3, 2.4, -0.5] },
  { source: [-2.1, 1.3, 0.6], target: [0.3, 2.4, -0.5] },
  { source: [2.2, 0.9, -0.6], target: [1.7, -1.4, 0.8] },
];

// Translucent Crystal Bond Tube Component
const BondTube: React.FC<{ source: [number, number, number]; target: [number, number, number] }> = ({
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
      <cylinderGeometry args={[0.03, 0.03, length, 16]} />
      <meshPhysicalMaterial
        color="#CBD5E1"
        emissive="#A5B4FC"
        emissiveIntensity={0.3}
        roughness={0.15}
        metalness={0.1}
        transmission={0.7}
        transparent={true}
        opacity={0.65}
      />
    </mesh>
  );
};

// Node Sphere with Refined Crystal & Internal Nucleus Appearance
const CrystalSphere: React.FC<{ node: HeroNode }> = ({ node }) => {
  return (
    <group position={node.pos}>
      {/* Outer translucent crystal sphere */}
      <mesh>
        <sphereGeometry args={[node.size, 36, 36]} />
        <meshPhysicalMaterial
          color={node.color}
          emissive={node.emissive}
          emissiveIntensity={0.25}
          roughness={0.1}
          metalness={0.08}
          transmission={0.8}
          thickness={1.6}
          transparent={true}
          opacity={0.9}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>

      {/* Internal nucleus core */}
      <mesh>
        <sphereGeometry args={[node.size * 0.36, 16, 16]} />
        <meshStandardMaterial
          color={node.emissive}
          emissive={node.emissive}
          emissiveIntensity={1.0}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
};

// Interactive Molecular Cluster with Soft Parallax & Damped Autonomous Rotation
const InteractiveMolecularCluster: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const groupRef = useRef<THREE.Group>(null);
  const targetRotation = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = (e.clientY / window.innerHeight - 0.5) * 2;
      targetRotation.current = {
        x: normY * 0.22,
        y: normX * 0.32,
      };
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('mousemove', handlePointerMove);
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (!reducedMotion) {
      // Gentle autonomous rotation
      groupRef.current.rotation.y += delta * 0.1;

      // Damped pointer response
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        targetRotation.current.x,
        0.04
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        -targetRotation.current.y * 0.4,
        0.04
      );
    }
  });

  return (
    <group ref={groupRef}>
      {/* Bonds */}
      {HERO_BONDS.map((bond, idx) => (
        <BondTube key={`bond-${idx}`} source={bond.source} target={bond.target} />
      ))}

      {/* Nodes */}
      {HERO_NODES.map(node => (
        <CrystalSphere key={node.id} node={node} />
      ))}
    </group>
  );
};

export const HeroMolecule: React.FC<{ className?: string }> = ({ className = '' }) => {
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

  if (!hasWebGL) {
    return (
      <div className={`flex items-center justify-center p-8 text-center ${className}`}>
        <div className="max-w-sm space-y-2">
          <div className="h-14 w-14 mx-auto rounded-full bg-gradient-to-tr from-indigo-200 to-violet-200 flex items-center justify-center text-indigo-700 font-serif text-xl font-bold shadow-inner">
            M
          </div>
          <p className="text-xs font-semibold text-slate-700">3D Molecular Architecture</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full pointer-events-auto ${className}`}>
      {/* Soft Ambient Refraction Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-violet-200/20 rounded-full blur-3xl pointer-events-none" />

      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 42 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.0} />
        <directionalLight position={[6, 8, 5]} intensity={1.3} />
        <directionalLight position={[-6, -6, -4]} intensity={0.5} color="#C4B5FD" />
        <pointLight position={[0, 0, 3]} intensity={0.8} color="#818CF8" />

        <Float
          speed={reducedMotion ? 0 : 1.2}
          rotationIntensity={reducedMotion ? 0 : 0.2}
          floatIntensity={reducedMotion ? 0 : 0.35}
        >
          <InteractiveMolecularCluster reducedMotion={reducedMotion} />
        </Float>
      </Canvas>
    </div>
  );
};
