import { db } from '../db/database.ts';
import { getUserById, SanitizedUser } from './authService.ts';
import { getMutualPartnerIds } from './relationshipService.ts';

/**
 * Module B: Graph Construction Service
 * 
 * Authoritatively builds the mathematical ego-network graph G = (V, E)
 * strictly from actual database MUTUAL relationships and verified user records.
 * 
 * Invariants:
 * 1. Only verified MUTUAL connections constitute edges E.
 * 2. Unconnected, one-way requested, or rejected relationships are strictly excluded.
 * 3. The host user is always vertex 0 (V_0).
 */

export interface GraphVertex {
  id: string;
  user: SanitizedUser;
  isHost: boolean;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface ConstructedGraph {
  hostUserId: string;
  vertices: GraphVertex[];
  edges: GraphEdge[];
  adjacency: Map<string, Set<string>>;
}

/**
 * Constructs the authoritative ego-network graph for a host user
 */
export function constructEgoGraph(hostUserId: string): ConstructedGraph {
  const hostUser = getUserById(hostUserId);
  if (!hostUser) {
    throw new Error(`Host user ${hostUserId} not found`);
  }

  // 1. Retrieve all direct mutual partners of the host user
  const directPartnerIds = getMutualPartnerIds(hostUserId);
  const egoUserIds = [hostUserId, ...directPartnerIds];

  // 2. Build vertices V
  const vertices: GraphVertex[] = [];
  const validUserIds = new Set<string>();

  for (const uid of egoUserIds) {
    const user = getUserById(uid);
    if (user) {
      vertices.push({
        id: user.id,
        user,
        isHost: user.id === hostUserId,
      });
      validUserIds.add(user.id);
    }
  }

  // 3. Build edges E from mutual relationships among all vertices in the ego graph
  // Query only canonical mutual pairs (user_a_id < user_b_id)
  const edges: GraphEdge[] = [];
  const adjacency = new Map<string, Set<string>>();
  validUserIds.forEach(id => adjacency.set(id, new Set<string>()));

  if (egoUserIds.length > 1) {
    const placeholders = egoUserIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT user_a_id, user_b_id, created_at
      FROM mutual_relationships
      WHERE user_a_id IN (${placeholders})
        AND user_b_id IN (${placeholders})
    `);

    const rows = stmt.all(...egoUserIds, ...egoUserIds) as Array<{
      user_a_id: string;
      user_b_id: string;
      created_at: string;
    }>;

    for (const row of rows) {
      if (validUserIds.has(row.user_a_id) && validUserIds.has(row.user_b_id)) {
        edges.push({
          id: `edge-${row.user_a_id}-${row.user_b_id}`,
          sourceId: row.user_a_id,
          targetId: row.user_b_id,
        });

        adjacency.get(row.user_a_id)?.add(row.user_b_id);
        adjacency.get(row.user_b_id)?.add(row.user_a_id);
      }
    }
  }

  return {
    hostUserId,
    vertices,
    edges,
    adjacency,
  };
}
