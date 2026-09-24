import React, { useMemo } from 'react';
import * as THREE from 'three';
import { GraphBond3D } from '../../types';

interface MolecularBondProps {
  bond: GraphBond3D;
  isHighlighted: boolean;
}

export const MolecularBond: React.FC<MolecularBondProps> = ({
  bond,
  isHighlighted,
}) => {
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

  // Bonds are neutral and elegant — they represent accepted connections.
  // They do NOT inherit any user's molecule identity color.
  const bondColor = isHighlighted ? '#A5B4FC' : '#64748B';
  const emissiveColor = isHighlighted ? '#6366F1' : '#38BDF8';
  const emissiveIntensity = isHighlighted ? 0.8 : 0.25;
  const radius = isHighlighted ? 0.042 : 0.026;
  const opacity = isHighlighted ? 0.9 : 0.55;

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 12]} />
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
