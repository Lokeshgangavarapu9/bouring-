import { GraphMetrics } from './graphAnalysisService.ts';

export type StructureClass =
  | 'ISOLATED_NODE'
  | 'PAIR'
  | 'PATH_CHAIN'
  | 'STAR_BRANCH'
  | 'TRIANGLE_CYCLE'
  | 'CLUSTERED_COMMUNITY'
  | 'MULTI_COMMUNITY'
  | 'DENSE_EGO_NETWORK';

export interface StructureClassification {
  structureClass: StructureClass;
  explanation: string;
  recommendedLayoutMode: 'central-isolated' | 'linear-pair' | 'chain' | 'star' | 'triadic-ring' | 'clustered-force' | 'multi-lobe-force';
}

/**
 * Classify ego-network into justified, explainable topological structure classes.
 * Adheres strictly to the specification: structure is driven by graph topology,
 * NOT arbitrary chemical names or fixed mutual-count formulas.
 */
export function classifyStructure(metrics: GraphMetrics): StructureClassification {
  const { degree, clusteringCoefficient, density, componentCount, cycleCount, communities } = metrics;

  // 1. Isolated Node
  if (degree === 0) {
    return {
      structureClass: 'ISOLATED_NODE',
      explanation: 'No mutual connections. The host user is an isolated atom-like node.',
      recommendedLayoutMode: 'central-isolated',
    };
  }

  // 2. Pair
  if (degree === 1) {
    return {
      structureClass: 'PAIR',
      explanation: 'Single reciprocal connection forming a 2-node diatomic bond.',
      recommendedLayoutMode: 'linear-pair',
    };
  }

  // 3. Dense Ego-Network
  if (degree >= 10 && density >= 0.3) {
    return {
      structureClass: 'DENSE_EGO_NETWORK',
      explanation: `High degree (${degree}) with significant inter-neighbor density (${density}). Arranged via high-capacity 3D force relaxation.`,
      recommendedLayoutMode: 'clustered-force',
    };
  }

  // 4. Multi-Community Structure
  // If the host's neighbors split into multiple non-trivial disjoint communities
  const substantialCommunities = communities.filter(c => c.length >= 2);
  if (substantialCommunities.length >= 2 && componentCount >= 2) {
    return {
      structureClass: 'MULTI_COMMUNITY',
      explanation: `Ego network partitions into ${substantialCommunities.length} distinct neighbor communities around the host. Rendered as distinct lobes.`,
      recommendedLayoutMode: 'multi-lobe-force',
    };
  }

  // 5. Triangle / Cycle
  // When clustering coefficient is significant and triangles are present (e.g. 1 triangle on degree 3 = 0.333)
  if (cycleCount > 0 && clusteringCoefficient >= 0.3) {
    return {
      structureClass: 'TRIANGLE_CYCLE',
      explanation: `Contains closed triadic cycles (clustering: ${clusteringCoefficient}, triangles: ${cycleCount}). Preserved with cyclic ring geometry.`,
      recommendedLayoutMode: 'triadic-ring',
    };
  }

  // 6. Clustered Community
  if (degree >= 4 && clusteringCoefficient >= 0.25) {
    return {
      structureClass: 'CLUSTERED_COMMUNITY',
      explanation: `Tightly connected neighborhood with mutual edges between friends (clustering: ${clusteringCoefficient}).`,
      recommendedLayoutMode: 'clustered-force',
    };
  }

  // 7. Star / Branch
  // Multiple neighbors, but zero or very low clustering among them (independent friend branches)
  if (degree >= 3 && clusteringCoefficient === 0) {
    return {
      structureClass: 'STAR_BRANCH',
      explanation: `Star topology: host serves as central hub connecting ${degree} disjoint neighbor branches without triadic closure.`,
      recommendedLayoutMode: 'star',
    };
  }

  // 8. Path / Chain
  // Linear or sequential connection pattern
  return {
    structureClass: 'PATH_CHAIN',
    explanation: `Sequence/chain topology with modest branching (degree: ${degree}, clustering: ${clusteringCoefficient}).`,
    recommendedLayoutMode: 'chain',
  };
}
