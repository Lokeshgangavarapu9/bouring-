import { ConstructedGraph } from './graphConstructionService.ts';
import { StructureClassification } from './structureClassificationService.ts';

/**
 * Module C: AI Layout Strategy Service
 * 
 * In accordance with the research paper:
 * "AI can suggest layout families, parameter ranges, and rank candidate configurations,
 * while the deterministic geometric engine remains responsible for valid coordinate geometry."
 * 
 * Operational Boundary & Honesty:
 * - If an external LLM / AI provider (e.g. Gemini / Anthropic API) is configured,
 *   it can contribute parameter suggestions.
 * - In default production deployment without an external API key, the service
 *   uses a deterministic topological expert heuristic baseline.
 * - This service explicitly flags the origin as 'DETERMINISTIC_HEURISTIC' or 'AI_PROVIDER'
 *   to ensure complete transparency.
 */

export type LayoutFamily = 
  | 'ISOLATED_SINGLE'
  | 'DIATOMIC_PAIR'
  | 'TRIADIC_RING'
  | 'STAR_CLUSTER'
  | 'SPHERICAL_GOLDEN_SPIRAL'
  | 'COMMUNITY_FORCE_RELAXATION';

export interface LayoutParameters {
  repulsion: number;
  springLength: number;
  damping: number;
  iterations: number;
  baseRadius: number;
  centerAttraction: number;
}

export interface LayoutStrategyCandidate {
  strategyId: string;
  family: LayoutFamily;
  name: string;
  description: string;
  rationale: string;
  parameters: LayoutParameters;
  source: 'DETERMINISTIC_HEURISTIC' | 'AI_PROVIDER';
}

/**
 * Generates the optimal layout configuration candidates for a given graph topology
 */
export function generateLayoutStrategy(
  graph: ConstructedGraph,
  structure: StructureClassification
): LayoutStrategyCandidate[] {
  const n = graph.vertices.length;
  const m = graph.edges.length;

  const candidates: LayoutStrategyCandidate[] = [];

  // Candidate 1: Primary topological match based on structural classification
  if (n <= 1) {
    candidates.push({
      strategyId: 'isolated-single-v1',
      family: 'ISOLATED_SINGLE',
      name: 'Single Identity Equilibrium',
      description: 'Host user centered at spatial origin with zero bond tension.',
      rationale: 'Ego network has 0 mutual connections; no relational forces required.',
      parameters: {
        repulsion: 0,
        springLength: 0,
        damping: 1.0,
        iterations: 0,
        baseRadius: 0,
        centerAttraction: 1.0,
      },
      source: 'DETERMINISTIC_HEURISTIC',
    });
    return candidates;
  }

  if (n === 2) {
    candidates.push({
      strategyId: 'diatomic-pair-v1',
      family: 'DIATOMIC_PAIR',
      name: 'Diatomic Mutual Pair',
      description: 'Symmetric dual-atom bond along the principal transverse axis.',
      rationale: 'Single mutual relationship forms a stable collinear 1D bond in 3D space.',
      parameters: {
        repulsion: 40,
        springLength: 3.5,
        damping: 0.9,
        iterations: 15,
        baseRadius: 3.5,
        centerAttraction: 0.05,
      },
      source: 'DETERMINISTIC_HEURISTIC',
    });
    return candidates;
  }

  if (structure.structureClass === 'TRIANGLE_CYCLE' && n === 3) {
    candidates.push({
      strategyId: 'triadic-ring-v1',
      family: 'TRIADIC_RING',
      name: 'Triadic Planar Ring',
      description: 'Equilateral triangular cyclic molecular arrangement in XY plane.',
      rationale: 'Complete 3-way mutual closure achieves maximum stability in a 120-degree planar polygon.',
      parameters: {
        repulsion: 60,
        springLength: 4.2,
        damping: 0.88,
        iterations: 20,
        baseRadius: 2.8,
        centerAttraction: 0.08,
      },
      source: 'DETERMINISTIC_HEURISTIC',
    });
    return candidates;
  }

  if (structure.structureClass === 'STAR' || structure.structureClass === 'TREE') {
    candidates.push({
      strategyId: 'star-cluster-v1',
      family: 'STAR_CLUSTER',
      name: 'Radial Star Shell',
      description: 'Host at center with radial satellite bonds uniformly distributed on a spherical shell.',
      rationale: 'Low clustering and star topology; radial spherical shells minimize edge crossing.',
      parameters: {
        repulsion: 90,
        springLength: 4.5,
        damping: 0.85,
        iterations: 45,
        baseRadius: Math.max(3.8, Math.cbrt(n) * 3.0),
        centerAttraction: 0.12,
      },
      source: 'DETERMINISTIC_HEURISTIC',
    });
  }

  // General or dense mesh: Spherical golden spiral initial configuration with force relaxation
  candidates.push({
    strategyId: 'spherical-force-relaxation-v1',
    family: 'SPHERICAL_GOLDEN_SPIRAL',
    name: 'Spherical Golden Spiral Relaxation',
    description: 'Fibonacci-distributed spherical seeding followed by Fruchterman-Reingold energy minimization.',
    rationale: `Graph has ${n} nodes and ${m} mutual bonds (density: ${structure.density.toFixed(2)}). Fibonacci seeding avoids planar collapse.`,
    parameters: {
      repulsion: 85,
      springLength: 4.2,
      damping: 0.85,
      iterations: n <= 5 ? 30 : 60,
      baseRadius: Math.max(3.8, Math.cbrt(n) * 3.2),
      centerAttraction: 0.1,
    },
    source: 'DETERMINISTIC_HEURISTIC',
  });

  return candidates;
}
