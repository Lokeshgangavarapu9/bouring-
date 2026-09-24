import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { MoleculeIdentityConfig } from '../../types';
import { SpaceParticles } from '../molecular/SpaceParticles';
import { MoleculeVisualMotif3D } from './MoleculeVisualMotif3D';

interface MoleculeObjectProps {
  identity: MoleculeIdentityConfig;
  smoky?: boolean;
  twinkling?: boolean;
}

const MoleculeObject: React.FC<MoleculeObjectProps> = ({ identity, smoky, twinkling }) => {
  const groupRef = useRef<THREE.Group>(null);
  const hostRingRef = useRef<THREE.Mesh>(null);
  const nodeStyle = identity.node;

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();

    // Gentle floating and subtle slow rotation
    groupRef.current.position.y = Math.sin(time * 0.9) * 0.12;
    groupRef.current.rotation.y = time * 0.35;

    if (hostRingRef.current) {
      hostRingRef.current.rotation.z = time * 0.5;
    }
  });

  if (identity.id === 'default') {
    return (
      <group ref={groupRef} scale={[1.4, 1.4, 1.4]}>
        {/* Crystal Bond Tubes */}
        {[
          { s: [0, 0, 0] as [number, number, number], t: [-1.4, 0.85, 0.4] as [number, number, number] },
          { s: [0, 0, 0] as [number, number, number], t: [1.45, 0.6, -0.4] as [number, number, number] },
          { s: [0, 0, 0] as [number, number, number], t: [-0.95, -1.15, -0.45] as [number, number, number] },
          { s: [0, 0, 0] as [number, number, number], t: [1.15, -0.95, 0.52] as [number, number, number] },
          { s: [0, 0, 0] as [number, number, number], t: [0.2, 1.6, -0.32] as [number, number, number] },
          { s: [-1.4, 0.85, 0.4] as [number, number, number], t: [0.2, 1.6, -0.32] as [number, number, number] },
          { s: [1.45, 0.6, -0.4] as [number, number, number], t: [1.15, -0.95, 0.52] as [number, number, number] },
        ].map((bond, idx) => {
          const vS = new THREE.Vector3(...bond.s);
          const vT = new THREE.Vector3(...bond.t);
          const mid = new THREE.Vector3().addVectors(vS, vT).multiplyScalar(0.5);
          const len = vS.distanceTo(vT);
          const dir = new THREE.Vector3().subVectors(vT, vS).normalize();
          const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

          return (
            <mesh key={idx} position={mid} quaternion={quat}>
              <cylinderGeometry args={[0.024, 0.024, len, 16]} />
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
        })}

        {/* Crystal Spheres (Landing Page Signature Structure) */}
        {[
          { id: '1', pos: [0, 0, 0] as [number, number, number], color: '#818CF8', emissive: '#4F46E5', size: 0.52 },
          { id: '2', pos: [-1.4, 0.85, 0.4] as [number, number, number], color: '#A78BFA', emissive: '#7C3AED', size: 0.38 },
          { id: '3', pos: [1.45, 0.6, -0.4] as [number, number, number], color: '#67E8F9', emissive: '#06B6D4', size: 0.4 },
          { id: '4', pos: [-0.95, -1.15, -0.45] as [number, number, number], color: '#C084FC', emissive: '#9333EA', size: 0.36 },
          { id: '5', pos: [1.15, -0.95, 0.52] as [number, number, number], color: '#818CF8', emissive: '#4F46E5', size: 0.4 },
          { id: '6', pos: [0.2, 1.6, -0.32] as [number, number, number], color: '#93C5FD', emissive: '#3B82F6', size: 0.34 },
        ].map((node) => (
          <group key={node.id} position={node.pos}>
            <mesh>
              <sphereGeometry args={[node.size, 32, 32]} />
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
        ))}
      </group>
    );
  }

  return (
    <group ref={groupRef} scale={[2.2, 2.2, 2.2]}>
      {/* Dedicated Host Halo Ring */}
      <mesh ref={hostRingRef} rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[0.76, 0.82, 64]} />
        <meshBasicMaterial
          color={nodeStyle.sphereSelectedColor}
          transparent={true}
          opacity={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Procedural 3D Visual Motif specific to this identity with optional Smoky & Twinkling */}
      <MoleculeVisualMotif3D
        identity={identity}
        isSelf={true}
        smoky={smoky}
        twinkling={twinkling}
      />

      {/* Outer translucent pearl/glass sphere with realistic physical sheen */}
      <mesh>
        <sphereGeometry args={[0.55, 48, 48]} />
        <meshPhysicalMaterial
          color={nodeStyle.sphereColor}
          emissive={nodeStyle.emissiveColor}
          emissiveIntensity={nodeStyle.emissiveIntensity * 1.1}
          roughness={nodeStyle.roughness}
          metalness={nodeStyle.metalness}
          transmission={nodeStyle.transmission}
          thickness={nodeStyle.thickness}
          ior={nodeStyle.ior}
          iridescence={0.38}
          iridescenceIOR={1.35}
          transparent={true}
          opacity={nodeStyle.opacity}
          clearcoat={1}
          clearcoatRoughness={0.04}
        />
      </mesh>

      {/* Inner luminescent nucleus / smoky core */}
      <mesh>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial
          color={nodeStyle.nucleusColor}
          emissive={nodeStyle.nucleusEmissiveColor}
          emissiveIntensity={nodeStyle.nucleusEmissiveIntensity}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
};

interface SingleMoleculePreviewProps {
  identity: MoleculeIdentityConfig;
  smoky?: boolean;
  twinkling?: boolean;
}

export const SingleMoleculePreview: React.FC<SingleMoleculePreviewProps> = ({
  identity,
  smoky = false,
  twinkling = false,
}) => {
  return (
    <div className="relative w-full h-full min-h-[300px] sm:min-h-[380px] bg-[#060810] rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl flex items-center justify-center">
      {/* Background Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700 opacity-60"
        style={{
          background: `radial-gradient(circle at center, ${identity.node.glowColor}25 0%, rgba(6, 8, 16, 0.85) 55%, #060810 100%)`,
        }}
      />

      <Canvas camera={{ position: [0, 0, 5.5], fov: 42 }} dpr={[1, 2]}>
        <ambientLight intensity={0.6} color="#CBD5E1" />
        <directionalLight position={[6, 8, 5]} intensity={1.5} color="#FFFFFF" />
        <directionalLight position={[-6, -4, -5]} intensity={0.7} color={identity.node.glowColor} />
        <pointLight position={[0, 0, 0]} intensity={0.5} color={identity.node.emissiveColor} />

        <SpaceParticles count={250} color={identity.node.glowColor} opacity={0.35} />

        <MoleculeObject
          identity={identity}
          smoky={smoky}
          twinkling={twinkling}
        />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          rotateSpeed={0.7}
          dampingFactor={0.05}
        />
      </Canvas>

      {/* Floating identity badge on preview */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-800/90 text-xs font-semibold text-slate-200 backdrop-blur-md">
        <span
          className="w-2.5 h-2.5 rounded-full animate-pulse"
          style={{ backgroundColor: identity.node.glowColor }}
        />
        <span>{identity.name}</span>
        {identity.symbol && <span className="text-slate-400 font-mono text-[11px]">{identity.symbol}</span>}
        <span className="text-slate-500">·</span>
        <span className="text-[11px] text-slate-400 font-normal">Host Scale 1.75x</span>
      </div>

      <div className="absolute bottom-4 right-4 z-10 pointer-events-none hidden sm:block text-[11px] text-slate-500 bg-slate-950/60 px-2.5 py-1 rounded-full backdrop-blur-xs">
        Drag to inspect
      </div>
    </div>
  );
};
