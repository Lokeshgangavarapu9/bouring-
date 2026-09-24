import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { Sparkles, ArrowRight, User, Network } from 'lucide-react';

interface StageConfig {
  number: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
}

const STAGES: StageConfig[] = [
  {
    number: '01',
    badge: 'Stage 1 — Individuals',
    title: 'People become nodes.',
    subtitle: 'Every person exists as an organic spatial point.',
    description: 'In Boring, individuals are represented as calm, translucent crystal spheres with their own spatial presence, subtle breathing rhythm, and identity.',
  },
  {
    number: '02',
    badge: 'Stage 2 — Relationships',
    title: 'Connections become bonds.',
    subtitle: 'Mutual acceptance forms physical ties.',
    description: 'When two people mutually accept each other, a translucent crystal bond forms between their nodes. Unverified requests never clutter your structure.',
  },
  {
    number: '03',
    badge: 'Stage 3 — Structure',
    title: 'Together, they become a structure.',
    subtitle: 'Mutual circles naturally coalesce.',
    description: 'As your shared relationships grow, individual bonds crystallize into an organic molecular architecture that reflects your true social proximity.',
  },
  {
    number: '04',
    badge: 'Stage 4 — Perspective',
    title: 'Your network becomes something you can see.',
    subtitle: 'Spatial depth reveals real community geometry.',
    description: 'Rotate around your relationships. Spatial arrangements allow you to intuitively perceive cluster density and shared bridges at a glance.',
  },
  {
    number: '05',
    badge: 'Stage 5 — Inspection',
    title: 'Explore the people around you.',
    subtitle: 'Hover and select to highlight immediate mutual ties.',
    description: 'Select any node to highlight its verified bonds and immediately reveal close mutual peers, with distant nodes softly receding.',
  },
  {
    number: '06',
    badge: 'Stage 6 — The Molecular World',
    title: 'One network. Many ways to see it.',
    subtitle: 'A living, breathing spatial social graph.',
    description: 'Step inside your connections. Experience an interactive 3D universe that scales with you while preserving calm visual clarity.',
  },
];

// 3D Scene for the Story Canvas
interface StorySceneProps {
  stage: number;
  reducedMotion: boolean;
  selectedSubNode: number | null;
  onSelectSubNode: (idx: number) => void;
}

const StoryCanvasScene: React.FC<StorySceneProps> = ({
  stage,
  reducedMotion,
  selectedSubNode,
  onSelectSubNode,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Target positions for 10 potential nodes across all stages
  const targetPositions = useMemo(() => {
    return [
      // Node 0 (Root user)
      [0, 0, 0],
      // Node 1 (First bond in Stage 2+)
      stage >= 2 ? [2.1, 0.4, 0] : [0, 0, 0],
      // Node 2 (Stage 3+)
      stage >= 3 ? [-1.7, 1.4, 0.6] : stage >= 2 ? [2.1, 0.4, 0] : [0, 0, 0],
      // Node 3 (Stage 3+)
      stage >= 3 ? [0.6, -1.8, -0.8] : [0, 0, 0],
      // Nodes 4-6 (Stage 4+)
      stage >= 4 ? [-2.2, -1.2, 0.8] : [0, 0, 0],
      stage >= 4 ? [2.6, -1.4, -0.6] : [0, 0, 0],
      stage >= 4 ? [-0.8, 2.3, -1.0] : [0, 0, 0],
      // Nodes 7-9 (Stage 5+)
      stage >= 5 ? [1.8, 2.1, 0.6] : [0, 0, 0],
      stage >= 5 ? [-3.1, 0.8, -0.4] : [0, 0, 0],
      stage >= 5 ? [0, -2.5, 1.1] : [0, 0, 0],
    ] as [number, number, number][];
  }, [stage]);

  // Active bonds depending on stage
  const activeBonds = useMemo(() => {
    if (stage === 1) return [];
    if (stage === 2) return [[0, 1]];
    if (stage === 3) return [[0, 1], [0, 2], [0, 3], [1, 3]];
    if (stage === 4) return [[0, 1], [0, 2], [0, 3], [1, 3], [0, 4], [1, 5], [2, 6]];
    // Stage 5 & 6
    return [
      [0, 1], [0, 2], [0, 3], [1, 3],
      [0, 4], [1, 5], [2, 6],
      [3, 9], [4, 8], [5, 7], [1, 7],
    ];
  }, [stage]);

  // Current smooth positions for lerping
  const currentPositions = useRef<[number, number, number][]>(
    targetPositions.map(pos => [...pos] as [number, number, number])
  );

  const nodeRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (!reducedMotion) {
      // Camera / group breathing rotation
      const rotSpeed = stage === 4 ? 0.22 : 0.12;
      groupRef.current.rotation.y += delta * rotSpeed;
      if (stage === 4) {
        groupRef.current.rotation.x = Math.sin(Date.now() * 0.0006) * 0.15;
      } else {
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.05);
      }
    }

    // Lerp positions toward targetPositions
    const lerpSpeed = 0.08;
    targetPositions.forEach((target, i) => {
      const cur = currentPositions.current[i];
      if (cur) {
        cur[0] = THREE.MathUtils.lerp(cur[0], target[0], lerpSpeed);
        cur[1] = THREE.MathUtils.lerp(cur[1], target[1], lerpSpeed);
        cur[2] = THREE.MathUtils.lerp(cur[2], target[2], lerpSpeed);

        const nodeEl = nodeRefs.current[i];
        if (nodeEl) {
          nodeEl.position.set(cur[0], cur[1], cur[2]);

          // Scale up visible nodes, scale down dormant nodes
          const isDormant = (target[0] === 0 && target[1] === 0 && target[2] === 0 && i !== 0);
          const targetScale = isDormant ? 0.001 : 1.0;
          nodeEl.scale.setScalar(
            THREE.MathUtils.lerp(nodeEl.scale.x, targetScale, 0.1)
          );
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      {/* Dynamic Bonds */}
      {activeBonds.map(([sIdx, tIdx], idx) => {
        const pS = currentPositions.current[sIdx];
        const pT = currentPositions.current[tIdx];
        if (!pS || !pT) return null;

        const vS = new THREE.Vector3(...pS);
        const vT = new THREE.Vector3(...pT);
        const mid = new THREE.Vector3().addVectors(vS, vT).multiplyScalar(0.5);
        const len = vS.distanceTo(vT);
        const dir = new THREE.Vector3().subVectors(vT, vS).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        const isHighlighted =
          stage === 5 &&
          selectedSubNode !== null &&
          (sIdx === selectedSubNode || tIdx === selectedSubNode);

        return (
          <mesh key={`story-bond-${idx}`} position={mid} quaternion={quat}>
            <cylinderGeometry args={[0.035, 0.035, Math.max(0.01, len), 14]} />
            <meshPhysicalMaterial
              color={isHighlighted ? '#818CF8' : '#A5B4FC'}
              emissive={isHighlighted ? '#6366F1' : '#818CF8'}
              emissiveIntensity={isHighlighted ? 0.8 : 0.25}
              roughness={0.2}
              transmission={0.65}
              transparent={true}
              opacity={0.75}
            />
          </mesh>
        );
      })}

      {/* Nodes */}
      {targetPositions.map((_, i) => {
        const colors = [
          '#818CF8', // Center Indigo
          '#A78BFA', // Lavender
          '#67E8F9', // Cyan
          '#F472B6', // Rose
          '#38BDF8', // Sky
          '#C084FC', // Violet
          '#818CF8',
          '#A78BFA',
          '#67E8F9',
          '#93C5FD',
        ];
        const color = colors[i % colors.length];
        const isSelected = stage === 5 && selectedSubNode === i;
        const isNeighbor =
          stage === 5 &&
          selectedSubNode !== null &&
          activeBonds.some(
            ([s, t]) => (s === selectedSubNode && t === i) || (t === selectedSubNode && s === i)
          );

        return (
          <group
            key={`story-node-${i}`}
            ref={el => (nodeRefs.current[i] = el)}
            position={targetPositions[i]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSubNode(i);
            }}
          >
            {/* Crystal outer */}
            <mesh>
              <sphereGeometry args={[0.5, 28, 28]} />
              <meshPhysicalMaterial
                color={isSelected ? '#4F46E5' : isNeighbor ? '#818CF8' : color}
                emissive={isSelected ? '#4F46E5' : color}
                emissiveIntensity={isSelected ? 0.9 : isNeighbor ? 0.5 : 0.2}
                roughness={0.12}
                transmission={0.75}
                thickness={1.4}
                transparent={true}
                opacity={0.9}
                clearcoat={1}
              />
            </mesh>

            {/* Inner nucleus */}
            <mesh>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial
                color={isSelected ? '#EEF2FF' : color}
                emissive={color}
                emissiveIntensity={isSelected ? 1.0 : 0.8}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

export const MolecularStory: React.FC = () => {
  const [currentStage, setCurrentStage] = useState(1);
  const [selectedSubNode, setSelectedSubNode] = useState<number | null>(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
  }, []);

  const activeInfo = STAGES[currentStage - 1];

  return (
    <section id="story" className="relative py-28 sm:py-36 px-4 sm:px-6 lg:px-8 bg-[#FAF9F5] border-t border-slate-200/60 overflow-hidden">
      {/* Gentle background auras */}
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-violet-200/15 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3.5 py-1 text-xs font-semibold text-indigo-700 backdrop-blur-md shadow-xs mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Continuous Scroll Story</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-slate-900 leading-tight">
            How people become a <br />
            <span className="font-semibold bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-900 bg-clip-text text-transparent">
              molecular structure
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-500 leading-relaxed font-normal">
            Follow the continuous evolution from a single individual to an interactive, interconnected 3D universe.
          </p>
        </div>

        {/* Interactive Storyboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Narrative Content (5 cols) */}
          <div className="lg:col-span-5 space-y-6 order-2 lg:order-1">
            {/* Stage Selector Pills */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs overflow-x-auto">
              {STAGES.map((s, idx) => {
                const stageNum = idx + 1;
                const isActive = currentStage === stageNum;
                return (
                  <button
                    key={s.number}
                    type="button"
                    onClick={() => {
                      setCurrentStage(stageNum);
                      if (stageNum === 5) setSelectedSubNode(0);
                    }}
                    className={`flex-1 min-w-[40px] py-2 px-2 rounded-xl text-xs font-semibold transition-all text-center ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                    aria-label={`Go to Stage ${stageNum}`}
                  >
                    <span>{s.number}</span>
                  </button>
                );
              })}
            </div>

            {/* Narrative Card */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/90 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  {activeInfo.badge}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {activeInfo.number} / 06
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-light text-slate-900 tracking-tight leading-tight">
                {activeInfo.title}
              </h3>

              <p className="mt-2 text-sm font-medium text-slate-700">
                {activeInfo.subtitle}
              </p>

              <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {activeInfo.description}
              </p>

              {/* Special interactive controls for Stage 5 */}
              {currentStage === 5 && (
                <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-medium flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-indigo-600" />
                      Click any sphere on canvas to inspect neighbors:
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedSubNode(0)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        selectedSubNode === 0
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      Node 0 (Root)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubNode(1)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        selectedSubNode === 1
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      Node 1 (Peer)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubNode(2)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        selectedSubNode === 2
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      Node 2 (Peer)
                    </button>
                  </div>
                </div>
              )}

              {/* Stepper Footer Buttons */}
              <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  disabled={currentStage === 1}
                  onClick={() => setCurrentStage(s => Math.max(1, s - 1))}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                    currentStage === 1
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ← Previous
                </button>

                {currentStage < 6 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStage(s => Math.min(6, s + 1))}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors"
                  >
                    <span>Next Stage</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <a
                    href="/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <span>Login →</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live Evolving 3D Scene (7 cols) */}
          <div className="lg:col-span-7 w-full h-[460px] sm:h-[540px] lg:h-[600px] relative order-1 lg:order-2">
            <div className="w-full h-full rounded-3xl overflow-hidden glass-panel border border-white/90 shadow-2xl relative">
              <Canvas
                camera={{ position: [0, 0, 7.8], fov: 45 }}
                dpr={[1, 1.8]}
                gl={{ antialias: true, alpha: true }}
              >
                <ambientLight intensity={0.8} />
                <directionalLight position={[6, 8, 5]} intensity={1.2} />
                <directionalLight position={[-6, -6, -4]} intensity={0.4} color="#C4B5FD" />
                <pointLight position={[0, 0, 2]} intensity={0.6} color="#818CF8" />

                <Float
                  speed={reducedMotion ? 0 : 1.2}
                  rotationIntensity={reducedMotion ? 0 : 0.2}
                  floatIntensity={reducedMotion ? 0 : 0.3}
                >
                  <StoryCanvasScene
                    stage={currentStage}
                    reducedMotion={reducedMotion}
                    selectedSubNode={selectedSubNode}
                    onSelectSubNode={setSelectedSubNode}
                  />
                </Float>
              </Canvas>

              {/* Status pill overlay */}
              <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-2 rounded-full bg-white/85 backdrop-blur-md px-3.5 py-1.5 border border-slate-200/60 shadow-xs text-[11px] text-slate-600 font-medium">
                <Network className="h-3.5 w-3.5 text-indigo-500" />
                <span>
                  {currentStage === 1 && '1 Individual Node'}
                  {currentStage === 2 && '2 Nodes & 1 Verified Bond'}
                  {currentStage === 3 && '4 Nodes in Emerging Cluster'}
                  {currentStage === 4 && '7 Nodes with Spatial Depth'}
                  {currentStage === 5 && 'Interactive Neighbor Highlight'}
                  {currentStage === 6 && 'Complete 10-Node Molecular Network'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
