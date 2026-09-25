import crypto from 'node:crypto';
import { db } from '../db/database.ts';
import { buildEgoGraph, GraphMetrics } from './graphAnalysisService.ts';
import { constructEgoGraph, ConstructedGraph } from './graphConstructionService.ts';
import { getUserById } from './authService.ts';
import { getMutualPartnerIds } from './relationshipService.ts';

/**
 * Module: Graph Pipeline Service
 * 
 * Implements the authoritative, deterministic 10-step pipeline:
 * AUTHENTICATED USER
 *         ↓
 * USER ID
 *         ↓
 * DATABASE
 *         ↓
 * RELATIONSHIP RECORDS
 *         ↓
 * RELATIONSHIP ENGINE
 *         ↓
 * MUTUAL RELATIONSHIPS
 *         ↓
 * MUTUAL GRAPH
 *         ↓
 * GRAPH METRICS
 *         ↓
 * CANONICAL GRAPH
 *         ↓
 * GRAPH VERSION
 *         ↓
 * GRAPH SNAPSHOT
 *         ↓
 * AI-SAFE GRAPH SUMMARY
 *         ↓
 * [STOP - AI DOES NOT MODIFY RELATIONSHIPS]
 */

export interface CanonicalGraphTopology {
  hostUserId: string;
  sortedNodeIds: string[];
  canonicalEdges: string[]; // ['userA:userB', 'userA:userC'] with userA < userB
  canonicalRepresentation: string;
}

export interface GraphSnapshot {
  userId: string;
  graphVersion: string;
  graphVersionNumber: number;
  generatedAt: string;
  nodes: Array<{ id: string; username: string; displayName: string }>;
  edges: Array<{ sourceId: string; targetId: string }>;
  metrics: GraphMetrics;
}

export interface GraphSummaryForAI {
  graphVersion: string;
  nodes: number;
  edges: number;
  density: number;
  averageDegree: number;
  maxDegree: number;
  communities: number;
  connectedComponents: number;
  cycles: number;
  hubCount: number;
}

/**
 * Computes the canonicalized topological representation for an ego-network.
 * Enforces stable alphabetical ordering so identical graphs always produce identical signatures.
 */
export function getCanonicalGraphTopology(hostUserId: string): CanonicalGraphTopology {
  const mutualPartnerIds = getMutualPartnerIds(hostUserId);
  const allNodeIds = Array.from(new Set([hostUserId, ...mutualPartnerIds])).sort();

  const canonicalEdges: string[] = [];
  if (allNodeIds.length > 1) {
    const placeholders = allNodeIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT user_a_id, user_b_id FROM mutual_relationships
      WHERE user_a_id IN (${placeholders}) AND user_b_id IN (${placeholders})
    `);
    const rows = stmt.all(...allNodeIds, ...allNodeIds) as Array<{ user_a_id: string; user_b_id: string }>;

    for (const r of rows) {
      const [u, v] = r.user_a_id < r.user_b_id ? [r.user_a_id, r.user_b_id] : [r.user_b_id, r.user_a_id];
      canonicalEdges.push(`${u}:${v}`);
    }
  }

  // Stable sort edges
  canonicalEdges.sort();

  const canonicalRepresentation = `nodes:${allNodeIds.join(',')}|edges:${canonicalEdges.join(',')}`;

  return {
    hostUserId,
    sortedNodeIds: allNodeIds,
    canonicalEdges,
    canonicalRepresentation,
  };
}

/**
 * Generates a deterministic SHA-256 hash of the canonical graph topology.
 * Changes ONLY when graph topology changes (not when user profile, bio, or avatar changes).
 */
export function computeDeterministicGraphVersion(hostUserId: string): {
  hash: string;
  versionNumber: number;
} {
  const { canonicalRepresentation } = getCanonicalGraphTopology(hostUserId);
  const hash = 'gv_' + crypto.createHash('sha256').update(canonicalRepresentation).digest('hex').substring(0, 16);

  // Retrieve or initialize version counter in database
  const getStmt = db.prepare('SELECT graph_version, graph_hash FROM user_graph_versions WHERE user_id = ?');
  const row = getStmt.get(hostUserId) as { graph_version: number; graph_hash?: string } | undefined;

  let versionNumber = 1;
  const now = new Date().toISOString();

  if (row) {
    if (row.graph_hash !== hash) {
      versionNumber = row.graph_version + 1;
      db.prepare('UPDATE user_graph_versions SET graph_version = ?, graph_hash = ?, updated_at = ? WHERE user_id = ?')
        .run(versionNumber, hash, now, hostUserId);
    } else {
      versionNumber = row.graph_version;
    }
  } else {
    db.prepare('INSERT INTO user_graph_versions (user_id, graph_version, graph_hash, updated_at) VALUES (?, ?, ?, ?)')
      .run(hostUserId, 1, hash, now);
  }

  return { hash, versionNumber };
}

/**
 * Builds an immutable snapshot of the user's graph derived strictly from database state.
 */
export function createGraphSnapshot(hostUserId: string): GraphSnapshot {
  const ego = buildEgoGraph(hostUserId);
  const { hash, versionNumber } = computeDeterministicGraphVersion(hostUserId);
  const now = new Date().toISOString();

  const nodes = ego.nodes.map(n => ({
    id: n.id,
    username: n.username,
    displayName: n.name,
  }));

  const edges = ego.mutualEdges.map(([u, v]) => ({
    sourceId: u,
    targetId: v,
  }));

  return {
    userId: hostUserId,
    graphVersion: hash,
    graphVersionNumber: versionNumber,
    generatedAt: now,
    nodes,
    edges,
    metrics: ego.metrics,
  };
}

/**
 * Creates an AI-Safe Graph Summary containing strictly topological and structural metrics.
 * GUARANTEED ZERO PII: names, emails, avatars, bios, and authentication secrets are excluded.
 */
export function createAiSafeGraphSummary(hostUserId: string): GraphSummaryForAI {
  const ego = buildEgoGraph(hostUserId);
  const { hash } = computeDeterministicGraphVersion(hostUserId);
  const m = ego.metrics;
  const n = ego.nodes.length;
  const edgeCount = ego.mutualEdges.length;

  return {
    graphVersion: hash,
    nodes: n,
    edges: edgeCount,
    density: m.density,
    averageDegree: n > 0 ? Number(((2 * edgeCount) / n).toFixed(2)) : 0,
    maxDegree: m.degree,
    communities: m.communities ? m.communities.length : 1,
    connectedComponents: m.componentCount || 1,
    cycles: m.cycleCount || 0,
    hubCount: m.degree >= 3 ? 1 : 0,
  };
}

/**
 * Complete Pipeline Execution
 */
export function executeGraphPipeline(hostUserId: string) {
  const topology = getCanonicalGraphTopology(hostUserId);
  const { hash, versionNumber } = computeDeterministicGraphVersion(hostUserId);
  const snapshot = createGraphSnapshot(hostUserId);
  const aiSafeSummary = createAiSafeGraphSummary(hostUserId);

  return {
    hostUserId,
    canonicalTopology: topology,
    graphVersionHash: hash,
    graphVersionNumber: versionNumber,
    snapshot,
    aiSafeSummary,
  };
}
