import { db } from '../db/database.ts';
import { getMutualPartnerIds } from './relationshipService.ts';
import { buildEgoGraph, type GraphMetrics } from './graphAnalysisService.ts';
import { computeDeterministicGraphVersion, type GraphSnapshot, type GraphSummaryForAI } from './graphPipelineService.ts';
import { getUserById } from './authService.ts';

/**
 * Module: Graph Projection Service
 * 
 * The SECOND LOGICAL DATA LAYER in Boring Social Architecture:
 * 
 * ┌────────────────────────────────────────────────────────┐
 * │ 1. SOURCE DATA (SQLite boring.db)                      │
 * │    Authoritative Truth: users, relationships           │
 * └──────────────────────────┬─────────────────────────────┘
 *                            │
 *                            ▼
 * ┌────────────────────────────────────────────────────────┐
 * │ 2. GRAPH PROJECTION (Derived Representation)          │
 * │    Strict Topology: GraphProjectionNode, GraphEdge     │
 * │    - Nodes: { nodeId, userId }                         │
 * │    - Edges: { sourceUserId, targetUserId, 'MUTUAL' }   │
 * └──────────────────────────┬─────────────────────────────┘
 *                            │
 *                            ▼
 * ┌────────────────────────────────────────────────────────┐
 * │ 3. AI-SAFE SUMMARY (GraphSummaryForAI)                 │
 * │    Minimal, Zero-PII Topology for Qwen3.5-9B          │
 * └────────────────────────────────────────────────────────┘
 */

export interface GraphProjectionNode {
  nodeId: string;
  userId: string;
}

export interface GraphProjectionEdge {
  sourceUserId: string;
  targetUserId: string;
  relationshipType: 'MUTUAL';
}

export interface GraphProjection {
  hostUserId: string;
  graphVersion: string;
  nodes: GraphProjectionNode[];
  edges: GraphProjectionEdge[];
  metrics: GraphMetrics;
  generatedAt: string;
}

export interface GraphDisplayNode {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  bio: string;
  moleculeIdentity: string;
}

/**
 * Builds the pure topological Graph Projection from authoritative SQLite state.
 * Contains ONLY graph identifiers (userId) and MUTUAL edges.
 * Contains ZERO profile strings or private user data.
 */
export function projectMutualGraph(hostUserId: string): GraphProjection {
  const mutualPartnerIds = getMutualPartnerIds(hostUserId);
  const allUserIds = Array.from(new Set([hostUserId, ...mutualPartnerIds])).sort();

  // 1. Pure Topology Nodes: Canonical identity is ALWAYS userId
  const nodes: GraphProjectionNode[] = allUserIds.map(uid => ({
    nodeId: uid,
    userId: uid,
  }));

  // 2. Pure Topology Edges: Strictly MUTUAL relationships with canonical ordering (u < v)
  const edges: GraphProjectionEdge[] = [];
  if (allUserIds.length > 1) {
    const placeholders = allUserIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT user_a_id, user_b_id FROM mutual_relationships
      WHERE user_a_id IN (${placeholders}) AND user_b_id IN (${placeholders})
    `);
    const rows = stmt.all(...allUserIds, ...allUserIds) as Array<{ user_a_id: string; user_b_id: string }>;

    for (const r of rows) {
      const [source, target] = r.user_a_id < r.user_b_id ? [r.user_a_id, r.user_b_id] : [r.user_b_id, r.user_a_id];
      edges.push({
        sourceUserId: source,
        targetUserId: target,
        relationshipType: 'MUTUAL',
      });
    }
  }

  // Stable sort edges
  edges.sort((a, b) => {
    if (a.sourceUserId !== b.sourceUserId) return a.sourceUserId.localeCompare(b.sourceUserId);
    return a.targetUserId.localeCompare(b.targetUserId);
  });

  const ego = buildEgoGraph(hostUserId);
  const { hash } = computeDeterministicGraphVersion(hostUserId);
  const now = new Date().toISOString();

  return {
    hostUserId,
    graphVersion: hash,
    nodes,
    edges,
    metrics: ego.metrics,
    generatedAt: now,
  };
}

/**
 * Generates authorized display data for the 3D Lab renderer.
 * Strictly separated from topology and NEVER sent to Qwen3.5-9B.
 */
export function getAuthorizedGraphDisplayData(
  hostUserId: string,
  projection: GraphProjection
): GraphDisplayNode[] {
  const displayNodes: GraphDisplayNode[] = [];

  for (const node of projection.nodes) {
    const user = getUserById(node.userId);
    if (user) {
      displayNodes.push({
        userId: user.id,
        displayName: user.name,
        username: user.username,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        moleculeIdentity: user.moleculeIdentity,
      });
    }
  }

  return displayNodes;
}

/**
 * Projects the AI-Safe Graph Summary from the Graph Projection.
 * Guarantees zero personal details, names, emails, or credentials.
 */
export function projectAiSafeSummary(projection: GraphProjection): GraphSummaryForAI {
  const n = projection.nodes.length;
  const m = projection.edges.length;
  const metrics = projection.metrics;

  return {
    graphVersion: projection.graphVersion,
    nodes: n,
    edges: m,
    density: metrics.density,
    averageDegree: n > 0 ? Number(((2 * m) / n).toFixed(2)) : 0,
    maxDegree: metrics.degree,
    communities: metrics.communities ? metrics.communities.length : 1,
    connectedComponents: metrics.componentCount || 1,
    cycles: metrics.cycleCount || 0,
    hubCount: metrics.degree >= 3 ? 1 : 0,
  };
}
