import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { GraphNode3D } from '../../types';
import { getMoleculeIdentity } from '../molecule/moleculeIdentities';
import { MoleculeVisualMotif3D } from '../molecule/MoleculeVisualMotif3D';

interface MolecularNodeProps {
  node: GraphNode3D;
  isSelected: boolean;
  isNeighbor: boolean;
  isSelf: boolean;
  onSelect: (nodeId: string) => void;
}

export const MolecularNode: React.FC<MolecularNodeProps> = ({
  node,
  isSelected,
  isNeighbor,
  isSelf,
  onSelect,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const hostRingRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Floating oscillation offset unique per node
  const seed = useRef(Math.random() * 100);

  // Retrieve this individual user's personal molecule identity
  const identity = getMoleculeIdentity(node.user.moleculeIdentity);
  const nodeStyle = identity.node;

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime() + seed.current;

    // Subtle restrained floating motion
    groupRef.current.position.y = node.position[1] + Math.sin(time * 0.8) * 0.08;
    groupRef.current.position.x = node.position[0] + Math.cos(time * 0.6) * 0.05;
    groupRef.current.position.z = node.position[2] + Math.sin(time * 0.5) * 0.05;

    // Slowly rotate host orbital ring if self node
    if (hostRingRef.current) {
      hostRingRef.current.rotation.z = time * 0.4;
    }

    // Host/Self scale vs Friend scale:
    // Host molecule is 1.75x normal scale (clearly larger, prominent, but balanced)
    // Friends are 1.0x normal scale
    const targetScale = isSelf
      ? (isSelected ? 2.05 : hovered ? 1.9 : 1.75)
      : (isSelected ? 1.25 : hovered ? 1.15 : isNeighbor ? 1.05 : 1.0);

    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
  });

  // Per-user dynamic aesthetic colors for this specific node
  const sphereColor = isSelected
    ? nodeStyle.sphereSelectedColor
    : isNeighbor
    ? nodeStyle.sphereNeighborColor
    : hovered
    ? nodeStyle.sphereHoveredColor
    : nodeStyle.sphereColor;

  const emissiveColor = isSelected
    ? nodeStyle.emissiveSelectedColor
    : isNeighbor
    ? nodeStyle.emissiveNeighborColor
    : hovered
    ? nodeStyle.emissiveHoveredColor
    : nodeStyle.emissiveColor;

  const emissiveIntensity = isSelected
    ? nodeStyle.selectedEmissiveIntensity
    : isNeighbor
    ? nodeStyle.emissiveIntensity * 1.3
    : hovered
    ? nodeStyle.emissiveIntensity * 1.4
    : nodeStyle.emissiveIntensity;

  const labelOffsetY = isSelf ? 1.18 : 0.82;
  const displayName = isSelf ? `${node.user.name} (You)` : node.user.name;

  return (
    <group ref={groupRef} position={node.position}>
      {/* Host / Self Emphasis: Dedicated bright outer halo ring for the current viewer */}
      {isSelf && (
        <mesh ref={hostRingRef} rotation={[Math.PI / 3, 0, 0]}>
          <ringGeometry args={[0.76, 0.83, 64]} />
          <meshBasicMaterial
            color={nodeStyle.sphereSelectedColor}
            transparent={true}
            opacity={hovered || isSelected ? 0.9 : 0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Procedural 3D Visual Motif unique to this molecule identity */}
      <MoleculeVisualMotif3D
        identity={identity}
        isSelf={isSelf}
        smoky={node.user.moleculeSmoky}
        twinkling={node.user.moleculeTwinkling}
      />

      {/* Outer translucent pearl/glass sphere with user's personal skin */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[0.54, 32, 32]} />
        <meshPhysicalMaterial
          color={sphereColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={nodeStyle.roughness}
          metalness={nodeStyle.metalness}
          transmission={nodeStyle.transmission}
          thickness={nodeStyle.thickness}
          ior={nodeStyle.ior}
          iridescence={0.36}
          iridescenceIOR={1.35}
          transparent={true}
          opacity={nodeStyle.opacity}
          clearcoat={1}
          clearcoatRoughness={0.06}
        />
      </mesh>

      {/* Inner luminescent nucleus with user's personal skin */}
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color={
            isSelected
              ? nodeStyle.nucleusSelectedColor
              : isNeighbor
              ? nodeStyle.nucleusNeighborColor
              : hovered
              ? nodeStyle.sphereHoveredColor
              : nodeStyle.nucleusColor
          }
          emissive={
            isSelected
              ? nodeStyle.emissiveSelectedColor
              : isNeighbor
              ? nodeStyle.emissiveNeighborColor
              : hovered
              ? nodeStyle.emissiveHoveredColor
              : nodeStyle.nucleusEmissiveColor
          }
          emissiveIntensity={
            isSelected
              ? 0.95
              : isNeighbor
              ? 0.65
              : hovered
              ? 0.8
              : nodeStyle.nucleusEmissiveIntensity
          }
          roughness={0.25}
        />
      </mesh>

      {/* Floating Name Label */}
      <Text
        position={[0, labelOffsetY, 0]}
        fontSize={isSelf ? 0.28 : 0.25}
        color={isSelf ? '#FFFFFF' : isSelected ? '#FFFFFF' : isNeighbor ? '#EDE9FE' : nodeStyle.labelColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={isSelf ? 0.035 : 0.025}
        outlineColor={nodeStyle.labelOutlineColor}
      >
        {displayName}
      </Text>
    </group>
  );
};
