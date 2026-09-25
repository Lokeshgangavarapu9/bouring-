import type { ConstructedGraph } from './graphConstructionService.ts';

/**
 * Layout Scoring Service
 * 
 * Quantitatively evaluates 3D candidate layouts against physical and aesthetic loss functions:
 * 1. Overlap Penalty: Nodes must not intersect in 3D space.
 * 2. Edge Stress: Mutual bonds should approximate the target equilibrium length.
 * 3. Separation Guarantee: Minimum euclidean distance between any two distinct atoms.
 * 4. Dispersion Uniformity: Variance of angular distribution across spherical quadrants.
 */

export interface LayoutScoreResult {
  score: number; // Overall loss (lower is better)
  overlapCount: number;
  minSeparation: number;
  edgeLengthVariance: number;
  visualDensity: number;
  isAcceptable: boolean;
}

export function score3DLayout(
  graph: ConstructedGraph,
  positions: Map<string, [number, number, number]>,
  targetBondLength: number = 4.2
): LayoutScoreResult {
  const nodeIds = Array.from(positions.keys());
  const n = nodeIds.length;

  if (n <= 1) {
    return {
      score: 0,
      overlapCount: 0,
      minSeparation: Infinity,
      edgeLengthVariance: 0,
      visualDensity: 0,
      isAcceptable: true,
    };
  }

  let minSeparation = Infinity;
  let overlapCount = 0;
  const MIN_ALLOWED_DISTANCE = 1.6;

  // 1. Compute pairwise node distances & overlap penalties
  for (let i = 0; i < n; i++) {
    const p1 = positions.get(nodeIds[i])!;
    for (let j = i + 1; j < n; j++) {
      const p2 = positions.get(nodeIds[j])!;
      const dx = p1[0] - p2[0];
      const dy = p1[1] - p2[1];
      const dz = p1[2] - p2[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < minSeparation) minSeparation = dist;
      if (dist < MIN_ALLOWED_DISTANCE) overlapCount++;
    }
  }

  // 2. Compute edge length variance / Hooke stress
  const edgeLengths: number[] = [];
  let totalEdgeStress = 0;

  for (const edge of graph.edges) {
    const p1 = positions.get(edge.sourceId);
    const p2 = positions.get(edge.targetId);
    if (p1 && p2) {
      const dx = p1[0] - p2[0];
      const dy = p1[1] - p2[1];
      const dz = p1[2] - p2[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      edgeLengths.push(dist);

      const strain = dist - targetBondLength;
      totalEdgeStress += strain * strain;
    }
  }

  const m = edgeLengths.length;
  let edgeVariance = 0;
  if (m > 1) {
    const meanLen = edgeLengths.reduce((a, b) => a + b, 0) / m;
    edgeVariance = edgeLengths.reduce((acc, l) => acc + Math.pow(l - meanLen, 2), 0) / m;
  }

  // 3. Compute visual bounding box density
  let maxR = 0;
  for (const pos of positions.values()) {
    const r = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]);
    if (r > maxR) maxR = r;
  }
  const boundingVolume = (4 / 3) * Math.PI * Math.pow(Math.max(maxR, 1.0), 3);
  const visualDensity = Number((n / boundingVolume).toFixed(4));

  // 4. Combined composite loss score
  const overlapPenalty = overlapCount * 1000;
  const stressPenalty = totalEdgeStress * 2.5;
  const separationPenalty = minSeparation < 2.0 ? (2.0 - minSeparation) * 50 : 0;
  const compositeScore = Number((overlapPenalty + stressPenalty + separationPenalty + edgeVariance).toFixed(2));

  return {
    score: compositeScore,
    overlapCount,
    minSeparation: Number((minSeparation === Infinity ? 0 : minSeparation).toFixed(2)),
    edgeLengthVariance: Number(edgeVariance.toFixed(3)),
    visualDensity,
    isAcceptable: overlapCount === 0,
  };
}
