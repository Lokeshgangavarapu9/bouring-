import { db } from '../db/database.ts';
import { SanitizedUser } from './authService.ts';
import { constructEgoGraph, ConstructedGraph } from './graphConstructionService.ts';
import { buildEgoGraph } from './graphAnalysisService.ts';
import { classifyStructure, StructureClassification } from './structureClassificationService.ts';
import { generateLayoutStrategy, LayoutStrategyCandidate } from './aiLayoutStrategyService.ts';
import { score3DLayout, LayoutScoreResult } from './layoutScoringService.ts';
import { defaultOptimizer, LayoutOptimizer } from './optimizationService.ts';
import { getCachedLayout, saveCachedLayout } from './cacheService.ts';

export const ALGORITHM_VERSION = 'boring-pipeline-v1';

export interface LayoutNode3D {
  id: string;
  user: SanitizedUser;
  position: [number, number, number];
  size: number;
  isHost: boolean;
}

export interface LayoutBond3D {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePos: [number, number, number];
  targetPos: [number, number, number];
}

export interface LayoutQualityMetrics {
  overlapCount: number;
  minSeparation: number;
  edgeLengthVariance: number;
  visualDensity: number;
  computationTimeMs: number;
  score?: number;
}

export interface NetworkLayoutResponse {
  hostUserId: string;
  graphVersion: number;
  algorithmVersion: string;
  structure: StructureClassification;
  strategyUsed: LayoutStrategyCandidate;
  nodes: LayoutNode3D[];
  bonds: LayoutBond3D[];
  qualityMetrics: LayoutQualityMetrics;
  fromCache: boolean;
}

/**
 * Retrieve current graph_version for user from database
 */
function getCurrentGraphVersion(userId: string): number {
  const stmt = db.prepare('SELECT graph_version FROM user_graph_versions WHERE user_id = ?');
  const row = stmt.get(userId) as { graph_version: number } | undefined;
  return row ? row.graph_version : 1;
}

/**
 * TRACEABLE PIPELINE ORCHESTRATION:
 * 
 * User/Connection Layer (DB)
 *        ↓
 * Graph Construction Service (Module B)
 *        ↓
 * Graph Analysis & Structure Classification
 *        ↓
 * AI Layout Strategy Service (Module C)
 *        ↓
 * Candidate Optimization Service (Module D)
 *        ↓
 * Layout Scoring Service
 *        ↓
 * Layout Cache (SQLite)
 *        ↓
 * Interactive 3D Molecular Layout
 */
export function getOrComputeLayout(
  hostUserId: string,
  optimizer: LayoutOptimizer = defaultOptimizer
): NetworkLayoutResponse {
  const startTime = performance.now();
  const graphVersion = getCurrentGraphVersion(hostUserId);

  // 1. Check layout cache
  const cached = getCachedLayout(hostUserId, graphVersion, ALGORITHM_VERSION);
  if (cached) {
    try {
      const layoutData = JSON.parse(cached.layout_data);
      const qualityMetrics = JSON.parse(cached.quality_metrics);
      const structure = JSON.parse(cached.structure_class);

      return {
        hostUserId,
        graphVersion,
        algorithmVersion: ALGORITHM_VERSION,
        structure,
        strategyUsed: layoutData.strategyUsed,
        nodes: layoutData.nodes,
        bonds: layoutData.bonds,
        qualityMetrics: {
          ...qualityMetrics,
          computationTimeMs: Number((performance.now() - startTime).toFixed(2)),
        },
        fromCache: true,
      };
    } catch {}
  }

  // 2. Module B: Graph Construction
  const constructedGraph = constructEgoGraph(hostUserId);

  // 3. Graph Analysis & Structure Classification
  const ego = buildEgoGraph(hostUserId);
  const structure = classifyStructure(ego.metrics);

  // 4. Module C: AI / Heuristic Layout Strategy & Candidate Generation
  const candidates = generateLayoutStrategy(constructedGraph, structure);
  const selectedStrategy = candidates[0]; // Best topological fit

  // 5. Module D: Optimization Service (Classical or Quantum Formulation)
  const seed = `${hostUserId}-v${graphVersion}`;
  const optimizationResult = optimizer.optimize(constructedGraph, selectedStrategy, seed);

  // 6. Layout Scoring & Physical Validation
  const scoring = score3DLayout(constructedGraph, optimizationResult.positions, selectedStrategy.parameters.springLength || 4.2);

  // 7. Assemble 3D Nodes & Bonds
  const layoutNodes: LayoutNode3D[] = constructedGraph.vertices.map(v => {
    const pos = optimizationResult.positions.get(v.id) || [0, 0, 0];
    return {
      id: v.id,
      user: v.user,
      position: [
        Number(pos[0].toFixed(3)),
        Number(pos[1].toFixed(3)),
        Number(pos[2].toFixed(3)),
      ],
      size: v.isHost ? 1.15 : 0.82,
      isHost: v.isHost,
    };
  });

  const layoutBonds: LayoutBond3D[] = constructedGraph.edges.map(e => {
    const p1 = optimizationResult.positions.get(e.sourceId) || [0, 0, 0];
    const p2 = optimizationResult.positions.get(e.targetId) || [0, 0, 0];
    return {
      id: e.id,
      sourceId: e.sourceId,
      targetId: e.targetId,
      sourcePos: [
        Number(p1[0].toFixed(3)),
        Number(p1[1].toFixed(3)),
        Number(p1[2].toFixed(3)),
      ],
      targetPos: [
        Number(p2[0].toFixed(3)),
        Number(p2[1].toFixed(3)),
        Number(p2[2].toFixed(3)),
      ],
    };
  });

  const qualityMetrics: LayoutQualityMetrics = {
    overlapCount: scoring.overlapCount,
    minSeparation: scoring.minSeparation,
    edgeLengthVariance: scoring.edgeLengthVariance,
    visualDensity: scoring.visualDensity,
    score: scoring.score,
    computationTimeMs: Number((performance.now() - startTime).toFixed(2)),
  };

  // 8. Cache valid layout in SQLite
  try {
    saveCachedLayout(
      hostUserId,
      graphVersion,
      ALGORITHM_VERSION,
      JSON.stringify(structure),
      {
        nodes: layoutNodes,
        bonds: layoutBonds,
        strategyUsed: selectedStrategy,
      },
      qualityMetrics
    );
  } catch (err) {
    console.error('Failed to cache layout:', err);
  }

  return {
    hostUserId,
    graphVersion,
    algorithmVersion: ALGORITHM_VERSION,
    structure,
    strategyUsed: selectedStrategy,
    nodes: layoutNodes,
    bonds: layoutBonds,
    qualityMetrics,
    fromCache: false,
  };
}
