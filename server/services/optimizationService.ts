import { ConstructedGraph } from './graphConstructionService.ts';
import { LayoutStrategyCandidate } from './aiLayoutStrategyService.ts';

/**
 * Module D: Optimization Service
 * 
 * Defines the formal LayoutOptimizer interface separating classical production optimization
 * from experimental quantum/QUBO/QAOA formulations.
 * 
 * Pipeline:
 * Real User Connections -> Graph Construction -> Classical Optimization -> 3D Visualization
 */

export interface LayoutOptimizationResult {
  positions: Map<string, [number, number, number]>;
  optimizerUsed: string;
  isExperimental: boolean;
  iterationsCompleted: number;
  computationTimeMs: number;
}

export interface LayoutOptimizer {
  readonly name: string;
  readonly type: 'CLASSICAL' | 'QUANTUM_EXPERIMENTAL';
  optimize(
    graph: ConstructedGraph,
    candidate: LayoutStrategyCandidate,
    seedStr: string
  ): LayoutOptimizationResult;
}

/**
 * Deterministic pseudo-random number generator (Mulberry32)
 */
function createDeterministicRng(seedStr: string) {
  let h = 0xefc8249d;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 0x9e3779b9);
  }
  let s = h >>> 0;

  return function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Production Optimizer: Deterministic Classical Force-Directed Relaxation
 * Implements Fruchterman-Reingold spring-electrical simulation in 3D Euclidean space.
 */
export class ClassicalForceDirectedOptimizer implements LayoutOptimizer {
  readonly name = 'ClassicalForceDirectedOptimizer-v1';
  readonly type = 'CLASSICAL' as const;

  optimize(
    graph: ConstructedGraph,
    candidate: LayoutStrategyCandidate,
    seedStr: string
  ): LayoutOptimizationResult {
    const startTime = performance.now();
    const rng = createDeterministicRng(seedStr);
    const nodes = graph.vertices;
    const n = nodes.length;
    const hostUserId = graph.hostUserId;

    const positions = new Map<string, [number, number, number]>();
    const velocities = new Map<string, [number, number, number]>();

    // 1. Initial Seeding based on Layout Strategy Family
    if (n <= 1) {
      positions.set(hostUserId, [0, 0, 0]);
      velocities.set(hostUserId, [0, 0, 0]);
      return {
        positions,
        optimizerUsed: this.name,
        isExperimental: false,
        iterationsCompleted: 0,
        computationTimeMs: Number((performance.now() - startTime).toFixed(2)),
      };
    }

    if (candidate.family === 'DIATOMIC_PAIR' && n === 2) {
      const other = nodes.find(u => u.id !== hostUserId)!;
      positions.set(hostUserId, [-1.75, 0, 0]);
      positions.set(other.id, [1.75, 0, 0]);
      velocities.set(hostUserId, [0, 0, 0]);
      velocities.set(other.id, [0, 0, 0]);
    } else if (candidate.family === 'TRIADIC_RING' && n === 3) {
      const radius = candidate.parameters.baseRadius;
      nodes.forEach((u, i) => {
        const angle = (2 * Math.PI * i) / 3 - Math.PI / 2;
        positions.set(u.id, [radius * Math.cos(angle), radius * Math.sin(angle), 0]);
        velocities.set(u.id, [0, 0, 0]);
      });
    } else {
      // General Spherical Golden Spiral seeding
      positions.set(hostUserId, [0, 0, 0]);
      velocities.set(hostUserId, [0, 0, 0]);

      const neighbors = nodes.filter(u => u.id !== hostUserId);
      const count = neighbors.length;
      const baseRadius = candidate.parameters.baseRadius;

      neighbors.forEach((u, i) => {
        const phi = Math.acos(1 - (2 * (i + 0.5)) / Math.max(count, 1));
        const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5) + rng() * 0.1;
        const r = baseRadius + (rng() * 0.4 - 0.2);

        positions.set(u.id, [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ]);
        velocities.set(u.id, [0, 0, 0]);
      });
    }

    // 2. Physical Relaxation Iterations
    const { iterations, repulsion, springLength, damping, centerAttraction } = candidate.parameters;

    for (let iter = 0; iter < iterations; iter++) {
      // Repulsive forces between all pairs
      for (let i = 0; i < n; i++) {
        const u1 = nodes[i].id;
        const p1 = positions.get(u1)!;
        const v1 = velocities.get(u1)!;

        for (let j = i + 1; j < n; j++) {
          const u2 = nodes[j].id;
          const p2 = positions.get(u2)!;
          const v2 = velocities.get(u2)!;

          let dx = p1[0] - p2[0];
          let dy = p1[1] - p2[1];
          let dz = p1[2] - p2[2];
          let distSq = dx * dx + dy * dy + dz * dz;
          if (distSq < 0.0001) {
            dx = (rng() - 0.5) * 0.1;
            dy = (rng() - 0.5) * 0.1;
            dz = (rng() - 0.5) * 0.1;
            distSq = dx * dx + dy * dy + dz * dz;
          }
          const dist = Math.sqrt(distSq);
          const force = repulsion / (distSq + 0.5);

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          const fz = (dz / dist) * force;

          if (u1 !== hostUserId) {
            v1[0] += fx;
            v1[1] += fy;
            v1[2] += fz;
          }
          if (u2 !== hostUserId) {
            v2[0] -= fx;
            v2[1] -= fy;
            v2[2] -= fz;
          }
        }
      }

      // Attractive forces along mutual edges
      for (const edge of graph.edges) {
        const p1 = positions.get(edge.sourceId);
        const p2 = positions.get(edge.targetId);
        const v1 = velocities.get(edge.sourceId);
        const v2 = velocities.get(edge.targetId);

        if (!p1 || !p2 || !v1 || !v2) continue;

        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const dz = p2[2] - p1[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
        const displacement = dist - springLength;
        const force = displacement * 0.12;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        if (edge.sourceId !== hostUserId) {
          v1[0] += fx;
          v1[1] += fy;
          v1[2] += fz;
        }
        if (edge.targetId !== hostUserId) {
          v2[0] -= fx;
          v2[1] -= fy;
          v2[2] -= fz;
        }
      }

      // Weak center gravitational attraction to origin
      for (const u of nodes) {
        if (u.id === hostUserId) continue;
        const p = positions.get(u.id)!;
        const v = velocities.get(u.id)!;
        v[0] -= p[0] * centerAttraction;
        v[1] -= p[1] * centerAttraction;
        v[2] -= p[2] * centerAttraction;
      }

      // Velocity integration & damping
      for (const u of nodes) {
        if (u.id === hostUserId) continue;
        const p = positions.get(u.id)!;
        const v = velocities.get(u.id)!;

        p[0] += v[0];
        p[1] += v[1];
        p[2] += v[2];

        v[0] *= damping;
        v[1] *= damping;
        v[2] *= damping;
      }
    }

    return {
      positions,
      optimizerUsed: this.name,
      isExperimental: false,
      iterationsCompleted: iterations,
      computationTimeMs: Number((performance.now() - startTime).toFixed(2)),
    };
  }
}

/**
 * Experimental Research Stub: Quantum / QUBO / QAOA Layout Optimizer
 * 
 * Formal research formulation as detailed in:
 * "AI-Assisted Molecular 3D Social Graphs with Quantum Optimization"
 * 
 * Status: EXPERIMENTAL RESEARCH
 * In production, physical quantum processing units (QPUs) or cloud simulators (e.g. Qiskit Aer,
 * Amazon Braket, D-Wave Leap) are not connected.
 * This class documents the Hamiltonian mapping and transparently delegates to the Classical
 * Force-Directed Optimizer while noting its experimental research status.
 */
export class QuantumLayoutOptimizer implements LayoutOptimizer {
  readonly name = 'QuantumLayoutOptimizer-ExperimentalStub';
  readonly type = 'QUANTUM_EXPERIMENTAL' as const;
  private classicalFallback = new ClassicalForceDirectedOptimizer();

  optimize(
    graph: ConstructedGraph,
    candidate: LayoutStrategyCandidate,
    seedStr: string
  ): LayoutOptimizationResult {
    // 1. Log theoretical QUBO mapping formulation:
    // H_QUBO = \sum_{i < j} J_{ij} \sigma_i^z \sigma_j^z + \sum_i h_i \sigma_i^z
    // In this formulation, 3D spherical bin coordinates are mapped onto binary decision variables x_{i,k} \in {0, 1}.

    // 2. Delegate to verified classical optimizer without fabricating fake quantum hardware execution
    const classicalResult = this.classicalFallback.optimize(graph, candidate, seedStr);

    return {
      ...classicalResult,
      optimizerUsed: `${this.name} [Delegated to Classical Baseline: Hardware QPU Not Present]`,
      isExperimental: true,
    };
  }
}

// Default export of active production optimizer
export const defaultOptimizer: LayoutOptimizer = new ClassicalForceDirectedOptimizer();
