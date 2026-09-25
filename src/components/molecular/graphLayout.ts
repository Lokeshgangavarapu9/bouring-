import { User, Connection, GraphNode3D, GraphBond3D } from '../../types';

export interface LayoutInput {
  nodes: Array<{ id: string; user: User; degree?: number }>;
  edges: Array<{ sourceId: string; targetId: string }>;
  degree?: Map<string, number>;
  clustering?: Map<string, number>;
  communities?: string[][];
  topology?: string;
}

export interface LayoutResult {
  nodes: GraphNode3D[];
  bonds: GraphBond3D[];
  metadata?: {
    algorithm: string;
    iterations: number;
    computationTimeMs: number;
    score?: number;
  };
}

export interface LayoutEngine {
  name: string;
  computeLayout(input: LayoutInput, options?: Partial<LayoutOptions>): LayoutResult;
}

export interface LayoutOptions {
  repulsion: number;
  springLength: number;
  iterations: number;
  damping: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  repulsion: 80,
  springLength: 4.5,
  iterations: 50,
  damping: 0.85,
};

/**
 * Agent-Ready Classical Baseline Layout Engine
 */
export class ClassicalLayoutEngine implements LayoutEngine {
  name = 'Classical Force-Directed Baseline';

  computeLayout(input: LayoutInput, options?: Partial<LayoutOptions>): LayoutResult {
    const users = input.nodes.map(n => n.user);
    const connections: Connection[] = input.edges.map((e, idx) => ({
      id: `edge-${idx}`,
      requester_id: e.sourceId,
      receiver_id: e.targetId,
      status: 'ACCEPTED_ONE_WAY',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    return computeClassicalLayout(users, connections, options);
  }
}

/**
 * Classical 3D Force-Directed Layout for Molecule MVP
 * Computes 3D coordinates for nodes and assigns bond connections.
 * This is an internal baseline algorithm designed to be driven by backend/AI agents.
 */
export function computeClassicalLayout(
  users: User[],
  connections: Connection[],
  options: Partial<LayoutOptions> = {}
): LayoutResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 1. Enforce Mutual Rule: Only reciprocal connections form molecular bonds!
  // A -> B and B -> A must both exist.
  const activeConnections = connections.filter(
    c => c.status === 'ACCEPTED' || c.status === 'ACCEPTED_ONE_WAY'
  );
  const directedSet = new Set<string>();
  activeConnections.forEach(c => {
    directedSet.add(`${c.requester_id}->${c.receiver_id}`);
  });

  const mutualConnections = activeConnections.filter(c => {
    const reciprocalKey = `${c.receiver_id}->${c.requester_id}`;
    // Deduplicate pair so we only render one bond cylinder per mutual pair
    const isReciprocal = directedSet.has(reciprocalKey);
    return isReciprocal && c.requester_id < c.receiver_id;
  });

  // 2. Initialize nodes on a 3D spherical shell with deterministic jitter
  const n = users.length;
  const positions = new Map<string, [number, number, number]>();
  const velocities = new Map<string, [number, number, number]>();

  users.forEach((user, i) => {
    // Golden spiral distribution on a sphere
    const phi = Math.acos(1 - (2 * (i + 0.5)) / Math.max(n, 1));
    const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
    const radius = Math.max(3.5, Math.cbrt(n) * 2.8);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    positions.set(user.id, [x, y, z]);
    velocities.set(user.id, [0, 0, 0]);
  });

  // 3. Iterative classical force-directed relaxation
  for (let iter = 0; iter < opts.iterations; iter++) {
    // Repulsive forces between all pairs
    for (let i = 0; i < n; i++) {
      const u1 = users[i].id;
      const p1 = positions.get(u1)!;
      const v1 = velocities.get(u1)!;

      for (let j = i + 1; j < n; j++) {
        const u2 = users[j].id;
        const p2 = positions.get(u2)!;
        const v2 = velocities.get(u2)!;

        let dx = p1[0] - p2[0];
        let dy = p1[1] - p2[1];
        let dz = p1[2] - p2[2];
        let distSq = dx * dx + dy * dy + dz * dz + 0.01;
        let dist = Math.sqrt(distSq);

        let force = opts.repulsion / (distSq * dist);
        let fx = dx * force;
        let fy = dy * force;
        let fz = dz * force;

        v1[0] += fx;
        v1[1] += fy;
        v1[2] += fz;

        v2[0] -= fx;
        v2[1] -= fy;
        v2[2] -= fz;
      }
    }

    // Attractive spring forces along mutual bonds
    mutualConnections.forEach(conn => {
      const p1 = positions.get(conn.requester_id);
      const p2 = positions.get(conn.receiver_id);
      const v1 = velocities.get(conn.requester_id);
      const v2 = velocities.get(conn.receiver_id);

      if (p1 && p2 && v1 && v2) {
        let dx = p2[0] - p1[0];
        let dy = p2[1] - p1[1];
        let dz = p2[2] - p1[2];
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;

        let displacement = dist - opts.springLength;
        let springForce = displacement * 0.12;

        let fx = (dx / dist) * springForce;
        let fy = (dy / dist) * springForce;
        let fz = (dz / dist) * springForce;

        v1[0] += fx;
        v1[1] += fy;
        v1[2] += fz;

        v2[0] -= fx;
        v2[1] -= fy;
        v2[2] -= fz;
      }
    });

    // Center-gravity force to prevent drift
    users.forEach(u => {
      const p = positions.get(u.id)!;
      const v = velocities.get(u.id)!;
      v[0] -= p[0] * 0.03;
      v[1] -= p[1] * 0.03;
      v[2] -= p[2] * 0.03;

      // Apply velocities with damping
      p[0] += v[0] * 0.15;
      p[1] += v[1] * 0.15;
      p[2] += v[2] * 0.15;

      v[0] *= opts.damping;
      v[1] *= opts.damping;
      v[2] *= opts.damping;
    });
  }

  // 4. Build output GraphNode3D list
  const nodes: GraphNode3D[] = users.map(user => {
    const pos = positions.get(user.id) || [0, 0, 0];
    return {
      id: user.id,
      user,
      position: [pos[0], pos[1], pos[2]],
      size: 0.65,
    };
  });

  // 5. Build output GraphBond3D list
  const bonds: GraphBond3D[] = [];
  mutualConnections.forEach(conn => {
    const posSource = positions.get(conn.requester_id);
    const posTarget = positions.get(conn.receiver_id);

    if (posSource && posTarget) {
      bonds.push({
        id: conn.id,
        sourceId: conn.requester_id,
        targetId: conn.receiver_id,
        sourcePos: posSource,
        targetPos: posTarget,
        connection: conn,
      });
    }
  });

  return { nodes, bonds };
}
