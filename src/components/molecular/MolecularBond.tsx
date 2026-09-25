import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { GraphBond3D } from '../../types';

interface MolecularBondProps {
  bond: GraphBond3D;
  isHighlighted: boolean;
  currentUserId?: string;
  onSelect?: (targetUserId: string) => void;
}

export const MolecularBond: React.FC<MolecularBondProps> = ({
  bond,
  isHighlighted,
  currentUserId,
  onSelect,
}) => {
  const [hovered, setHovered] = useState(false);

  const { position, quaternion, length } = useMemo(() => {
    const vSource = new THREE.Vector3(...bond.sourcePos);
    const vTarget = new THREE.Vector3(...bond.targetPos);
    
    // Midpoint position
    const mid = new THREE.Vector3().addVectors(vSource, vTarget).multiplyScalar(0.5);
    
    // Distance/length
    const dist = vSource.distanceTo(vTarget);
    
    // Orientation quaternion aligning standard Y-axis cylinder to (vTarget - vSource)
    const dir = new THREE.Vector3().subVectors(vTarget, vSource).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);

    return {
      position: mid,
      quaternion: quat,
      length: dist,
    };
  }, [bond.sourcePos, bond.targetPos]);

  // Bonds are neutral and elegant — they represent accepted mutual connections.
  const activeHighlight = isHighlighted || hovered;
  const bondColor = activeHighlight ? '#A5B4FC' : '#64748B';
  const emissiveColor = activeHighlight ? '#6366F1' : '#38BDF8';
  const emissiveIntensity = activeHighlight ? 0.85 : 0.25;
  const radius = activeHighlight ? 0.046 : 0.026;
  const opacity = activeHighlight ? 0.95 : 0.55;

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!onSelect) return;
    // Identify the friend connected by this bond
    const friendId = currentUserId === bond.sourceId ? bond.targetId : bond.sourceId;
    onSelect(friendId);
  };

  return (
    <mesh
      position={position}
      quaternion={quaternion}
      onClick={handleClick}
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
      <cylinderGeometry args={[radius, radius, length, 16]} />
      <meshStandardMaterial
        color={bondColor}
        emissive={emissiveColor}
        emissiveIntensity={emissiveIntensity}
        roughness={0.2}
        metalness={0.1}
        transparent={true}
        opacity={opacity}
      />
    </mesh>
  );
};
