import { db } from '../db/database.ts';
import { getMutualPartnerIds } from './relationshipService.ts';
import { getUserById, SanitizedUser } from './authService.ts';

export interface EgoGraph {
  hostUserId: string;
  hostUser: SanitizedUser;
  nodes: SanitizedUser[];
  mutualEdges: [string, string][];
  metrics: GraphMetrics;
}

export interface GraphMetrics {
  degree: number;
  neighborCount: number;
  triangleCount: number;
  clusteringCoefficient: number;
  density: number;
  componentCount: number;
  cycleCount: number;
  communities: string[][];
}

/**
 * Build the host user's local mutual ego-network and calculate deterministic graph metrics
 */
export function buildEgoGraph(hostUserId: string): EgoGraph {
  const hostUser = getUserById(hostUserId);
  if (!hostUser) throw new Error('Host user not found');

  // 1. Direct mutual partners of host
  const neighborIds = getMutualPartnerIds(hostUserId);
  const allNodeIds = Array.from(new Set([hostUserId, ...neighborIds]));

  // Fetch node user details
  const nodes = allNodeIds
    .map(id => getUserById(id))
    .filter((u): u is SanitizedUser => Boolean(u));

  // 2. Fetch all mutual edges within this ego-network (induced mutual subgraph)
  // Edges connecting host to neighbors, and edges between neighbors themselves
  const mutualEdges: [string, string][] = [];
  if (allNodeIds.length > 1) {
    const placeholders = allNodeIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT user_a_id, user_b_id FROM mutual_relationships
      WHERE user_a_id IN (${placeholders}) AND user_b_id IN (${placeholders})
    `);
    const rows = stmt.all(...allNodeIds, ...allNodeIds) as { user_a_id: string; user_b_id: string }[];
    for (const r of rows) {
      mutualEdges.push([r.user_a_id, r.user_b_id]);
    }
  }

  // 3. Graph Analysis:
  const k = neighborIds.length; // Host mutual degree

  // Count edges strictly between neighbors of host (triangles)
  const neighborSet = new Set(neighborIds);
  let triangles = 0;
  const neighborEdges: [string, string][] = [];

  for (const [u, v] of mutualEdges) {
    if (neighborSet.has(u) && neighborSet.has(v)) {
      triangles++;
      neighborEdges.push([u, v]);
    }
  }

  // Local clustering coefficient: C_i = 2 * T_i / (k_i * (k_i - 1))
  let clusteringCoefficient = 0;
  if (k >= 2) {
    clusteringCoefficient = (2 * triangles) / (k * (k - 1));
  }

  // Total ego network density
  const totalNodes = allNodeIds.length;
  let density = 0;
  if (totalNodes >= 2) {
    const maxPossibleEdges = (totalNodes * (totalNodes - 1)) / 2;
    density = mutualEdges.length / maxPossibleEdges;
  }

  // 4. Connected components among neighbors (excluding host)
  const visited = new Set<string>();
  const communities: string[][] = [];

  const neighborAdj = new Map<string, Set<string>>();
  for (const id of neighborIds) {
    neighborAdj.set(id, new Set<string>());
  }
  for (const [u, v] of neighborEdges) {
    neighborAdj.get(u)?.add(v);
    neighborAdj.get(v)?.add(u);
  }

  for (const id of neighborIds) {
    if (!visited.has(id)) {
      const comp: string[] = [];
      const queue = [id];
      visited.add(id);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        comp.push(curr);
        const nbrs = neighborAdj.get(curr) || new Set();
        for (const nbr of nbrs) {
          if (!visited.has(nbr)) {
            visited.add(nbr);
            queue.push(nbr);
          }
        }
      }
      communities.push(comp);
    }
  }

  const componentCount = communities.length;
  const cycleCount = triangles; // For ego-networks, 3-cycles are prime topological indicators

  return {
    hostUserId,
    hostUser,
    nodes,
    mutualEdges,
    metrics: {
      degree: k,
      neighborCount: k,
      triangleCount: triangles,
      clusteringCoefficient: Number(clusteringCoefficient.toFixed(4)),
      density: Number(density.toFixed(4)),
      componentCount,
      cycleCount,
      communities,
    },
  };
}
