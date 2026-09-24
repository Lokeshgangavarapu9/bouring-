import { useMemo, useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { User, Connection, GraphNode3D, GraphBond3D } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { computeClassicalLayout, LayoutOptions } from './graphLayout';
import { MolecularNode } from './MolecularNode';
import { MolecularBond } from './MolecularBond';
import { GraphControls } from './GraphControls';
import { SpaceParticles } from './SpaceParticles';
import { api } from '../../services/api';

export interface MolecularGraphHandle {
  resetCamera: () => void;
  fitNetwork: () => void;
  resetView: () => void;
}

export interface MolecularGraphProps {
  users: User[];
  connections: Connection[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  height?: string;
  showControls?: boolean;
  layoutOptions?: Partial<LayoutOptions>;
  hideTopBadges?: boolean;
  hideResetButton?: boolean;
  onMetricsChange?: (metrics: { nodeCount: number; bondCount: number }) => void;
}

/**
 * Helper to frame and animate camera smoothly around the graph bounds
 */
interface CameraManagerProps {
  nodes: GraphNode3D[];
  controlsRef: React.RefObject<OrbitControlsImpl>;
  triggerFit: number;
  triggerReset: number;
}

const CameraManager: React.FC<CameraManagerProps> = ({
  nodes,
  controlsRef,
  triggerFit,
  triggerReset,
}) => {
  const { camera, size } = useThree();
  const targetCamPos = useRef(new THREE.Vector3(0, 3, 16));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isAnimating = useRef(false);
  const initialFitDone = useRef(false);

  // Compute optimal camera framing based on node bounding sphere & viewport
  const computeFraming = (elevated: boolean) => {
    if (nodes.length === 0) {
      return {
        pos: new THREE.Vector3(0, elevated ? 3.5 : 2, 16),
        target: new THREE.Vector3(0, 0, 0),
      };
    }

    const box = new THREE.Box3();
    nodes.forEach(n => box.expandByPoint(new THREE.Vector3(...n.position)));
    const center = new THREE.Vector3();
    box.getCenter(center);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const radius = Math.max(sphere.radius, 2.5);

    const persCamera = camera as THREE.PerspectiveCamera;
    const vFov = (persCamera.fov * Math.PI) / 180;
    const aspect = Math.max(size.width / size.height, 0.5);

    const distV = radius / Math.tan(vFov / 2);
    const distH = radius / (Math.tan(vFov / 2) * aspect);
    // Adjusted padding so the molecular network clearly fills the viewport
    const padding = 1.12;
    const dist = Math.max(distV, distH) * padding;

    const elevation = elevated ? dist * 0.22 : dist * 0.12;
    const camPos = new THREE.Vector3(center.x, center.y + elevation, center.z + dist);

    return { pos: camPos, target: center };
  };

  // Initial auto-fit: immediately frames complete network on load
  useEffect(() => {
    if (nodes.length > 0 && !initialFitDone.current) {
      initialFitDone.current = true;
      const { pos, target } = computeFraming(false);
      camera.position.copy(pos);
      if (controlsRef.current) {
        controlsRef.current.target.copy(target);
        controlsRef.current.update();
      }
    }
  }, [nodes, size]);

  // Fit Network Trigger (frames complete graph smoothly)
  useEffect(() => {
    if (triggerFit > 0) {
      const { pos, target } = computeFraming(false);
      targetCamPos.current.copy(pos);
      targetLookAt.current.copy(target);
      isAnimating.current = true;
    }
  }, [triggerFit]);

  // Reset View Trigger (returns to default elevated overview)
  useEffect(() => {
    if (triggerReset > 0) {
      const { pos, target } = computeFraming(true);
      targetCamPos.current.copy(pos);
      targetLookAt.current.copy(target);
      isAnimating.current = true;
    }
  }, [triggerReset]);

  // Smooth lerp camera movement
  useFrame(() => {
    if (!isAnimating.current || !controlsRef.current) return;

    camera.position.lerp(targetCamPos.current, 0.08);
    controlsRef.current.target.lerp(targetLookAt.current, 0.08);
    controlsRef.current.update();

    if (
      camera.position.distanceTo(targetCamPos.current) < 0.03 &&
      controlsRef.current.target.distanceTo(targetLookAt.current) < 0.03
    ) {
      camera.position.copy(targetCamPos.current);
      controlsRef.current.target.copy(targetLookAt.current);
      controlsRef.current.update();
      isAnimating.current = false;
    }
  });

  return null;
};

export const MolecularGraph = forwardRef<MolecularGraphHandle, MolecularGraphProps>(({
  users,
  connections,
  selectedNodeId,
  onSelectNode,
  height = '100%',
  showControls = true,
  layoutOptions,
  hideTopBadges = false,
  hideResetButton = false,
  onMetricsChange,
}, ref) => {
  const { currentUser } = useAuth();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [triggerFit, setTriggerFit] = useState(0);
  const [triggerReset, setTriggerReset] = useState(0);
  const [backendLayout, setBackendLayout] = useState<{ nodes: GraphNode3D[]; bonds: GraphBond3D[] } | null>(null);

  // Fetch deterministic layout from backend service
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    api.network.getLayout(currentUser.id)
      .then(res => {
        if (isMounted && res.nodes && res.nodes.length > 0) {
          const mappedNodes: GraphNode3D[] = res.nodes.map(n => ({
            id: n.id,
            user: {
              ...n.user,
              moleculeIdentity: n.user.moleculeIdentity || 'default',
            },
            position: n.position,
            size: n.size || (n.isHost ? 1.15 : 0.82),
          }));
          const mappedBonds: GraphBond3D[] = res.bonds.map(b => ({
            id: b.id,
            sourceId: b.sourceId,
            targetId: b.targetId,
            sourcePos: b.sourcePos,
            targetPos: b.targetPos,
            connection: {
              id: b.id,
              requester_id: b.sourceId,
              receiver_id: b.targetId,
              status: 'ACCEPTED_ONE_WAY',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          }));
          setBackendLayout({ nodes: mappedNodes, bonds: mappedBonds });
        }
      })
      .catch(() => {
        // Fallback to client layout
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser, connections]);

  // Compute 3D positions with backend layout if available, falling back to client layout
  const { nodes, bonds } = useMemo(() => {
    if (backendLayout) {
      return backendLayout;
    }
    return computeClassicalLayout(users, connections, layoutOptions);
  }, [backendLayout, users, connections, layoutOptions]);

  // Notify parent of accurate node & bond metrics
  useEffect(() => {
    onMetricsChange?.({ nodeCount: nodes.length, bondCount: bonds.length });
  }, [nodes.length, bonds.length, onMetricsChange]);

  // Determine neighboring nodes to the selected node
  const neighborNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const neighbors = new Set<string>();
    bonds.forEach(b => {
      if (b.sourceId === selectedNodeId) neighbors.add(b.targetId);
      if (b.targetId === selectedNodeId) neighbors.add(b.sourceId);
    });
    return neighbors;
  }, [selectedNodeId, bonds]);

  const selectedUser = useMemo(() => {
    return users.find(u => u.id === selectedNodeId) || null;
  }, [users, selectedNodeId]);

  const neighborUsers = useMemo(() => {
    if (!selectedNodeId) return [];
    return users.filter(u => neighborNodeIds.has(u.id));
  }, [users, neighborNodeIds, selectedNodeId]);

  const handleFitNetwork = () => {
    setTriggerFit(prev => prev + 1);
  };

  const handleResetView = () => {
    setTriggerReset(prev => prev + 1);
  };

  const handleResetCamera = () => {
    handleResetView();
  };

  useImperativeHandle(ref, () => ({
    resetCamera: handleResetCamera,
    fitNetwork: handleFitNetwork,
    resetView: handleResetView,
  }));

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#060810]"
      style={{ height }}
    >
      {/* Neutral Deep Space Background Ambient Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(30, 27, 75, 0.22) 0%, rgba(6, 8, 16, 0.75) 60%, #060810 100%)',
        }}
      />

      <Canvas
        camera={{ position: [0, 2.5, 16], fov: 45 }}
        onPointerMissed={() => onSelectNode(null)}
        dpr={[1, 2]}
      >
        {/* Neutral Deep Space background & fog */}
        <color attach="background" args={['#060810']} />
        <fog attach="fog" args={['#060810', 35, 110]} />

        {/* Spatial background stars */}
        <SpaceParticles count={450} color="#C7D2FE" opacity={0.4} />

        {/* Balanced scientific lighting */}
        <ambientLight intensity={0.5} color="#CBD5E1" />
        <directionalLight position={[12, 16, 10]} intensity={1.3} color="#FFFFFF" />
        <directionalLight position={[-12, -8, -10]} intensity={0.65} color="#818CF8" />
        <pointLight position={[0, 0, 0]} intensity={0.35} color="#38BDF8" />

        {/* Smooth Orbit Controls with generous zoom range */}
        <OrbitControls
          ref={controlsRef}
          enableDamping={true}
          dampingFactor={0.05}
          rotateSpeed={0.8}
          zoomSpeed={0.9}
          minDistance={1.8}
          maxDistance={85}
        />

        {/* Auto Camera Manager: frames network on load & triggers animated transitions */}
        <CameraManager
          nodes={nodes}
          controlsRef={controlsRef}
          triggerFit={triggerFit}
          triggerReset={triggerReset}
        />

        {/* 3D Bonds (Connecting only accepted mutual relationships) */}
        {bonds.map(bond => {
          const isHighlighted =
            selectedNodeId !== null &&
            (bond.sourceId === selectedNodeId || bond.targetId === selectedNodeId);
          return (
            <MolecularBond
              key={bond.id}
              bond={bond}
              isHighlighted={isHighlighted}
            />
          );
        })}

        {/* 3D Nodes (People) - Each node renders in its OWN personal molecule identity! */}
        {nodes.map(node => (
          <MolecularNode
            key={node.id}
            node={node}
            isSelected={node.id === selectedNodeId}
            isNeighbor={neighborNodeIds.has(node.id)}
            isSelf={currentUser?.id === node.user.id}
            onSelect={(id) => onSelectNode(id === selectedNodeId ? null : id)}
          />
        ))}
      </Canvas>

      {/* Optional Overlay Controls & Information Drawer */}
      {showControls && (
        <GraphControls
          selectedUser={selectedUser}
          neighbors={neighborUsers}
          onSelectNeighbor={(id) => onSelectNode(id)}
          onClearSelection={() => onSelectNode(null)}
          onResetCamera={handleResetCamera}
          nodeCount={nodes.length}
          bondCount={bonds.length}
          hideTopBadges={hideTopBadges}
          hideResetButton={hideResetButton}
        />
      )}
    </div>
  );
});

MolecularGraph.displayName = 'MolecularGraph';


