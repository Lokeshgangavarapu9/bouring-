"""
Deterministic Classical Layout Engine in Python
Mirrors the Boring backend layout solver for candidate generation and benchmark validation.
"""
import math
import random
from typing import Dict, Any, List, Tuple
from ..schemas.layout_schema import LayoutParameters

def execute_classical_layout(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    strategy: str,
    params: LayoutParameters,
    seed: int = 42
) -> Dict[str, Tuple[float, float, float]]:
    """
    Computes deterministic 3D coordinates based on registered algorithm and bounded parameters.
    """
    rng = random.Random(seed)
    n = len(nodes)
    if n == 0:
        return {}

    node_ids = [n["id"] for n in nodes]
    positions: Dict[str, List[float]] = {}

    # Initial seeding on 3D sphere / Fibonacci spiral
    phi = (1 + math.sqrt(5)) / 2
    for i, nid in enumerate(node_ids):
        if i == 0:
            positions[nid] = [0.0, 0.0, 0.0]
            continue
        y = 1 - (i / float(max(1, n - 1))) * 2
        radius = math.sqrt(max(0.0, 1 - y * y))
        theta = 2 * math.pi * i / phi
        r = params.springLength * 2.5
        positions[nid] = [
            round(math.cos(theta) * radius * r, 3),
            round(y * r, 3),
            round(math.sin(theta) * radius * r, 3)
        ]

    if strategy == "spherical_shell":
        # Spherical layout: radius is fixed based on springLength
        return {nid: (p[0], p[1], p[2]) for nid, p in positions.items()}

    # Force-directed relaxation passes
    k_repulsion = params.repulsion * 12.0
    k_spring = 1.0 / max(0.1, params.springLength)
    damping = params.damping or 0.85
    center_attraction = params.centerAttraction or 0.1

    velocities = {nid: [0.0, 0.0, 0.0] for nid in node_ids}

    for step in range(params.iterations):
        # 1. Repulsion between all node pairs
        for i in range(n):
            id_a = node_ids[i]
            pos_a = positions[id_a]
            for j in range(i + 1, n):
                id_b = node_ids[j]
                pos_b = positions[id_b]

                dx = pos_a[0] - pos_b[0]
                dy = pos_a[1] - pos_b[1]
                dz = pos_a[2] - pos_b[2]
                dist_sq = dx * dx + dy * dy + dz * dz + 0.01
                dist = math.sqrt(dist_sq)

                f = k_repulsion / dist_sq
                fx = (dx / dist) * f
                fy = (dy / dist) * f
                fz = (dz / dist) * f

                velocities[id_a][0] += fx
                velocities[id_a][1] += fy
                velocities[id_a][2] += fz
                velocities[id_b][0] -= fx
                velocities[id_b][1] -= fy
                velocities[id_b][2] -= fz

        # 2. Attraction along mutual bonds (edges)
        for e in edges:
            s, t = e["source"], e["target"]
            if s in positions and t in positions:
                pos_s = positions[s]
                pos_t = positions[t]

                dx = pos_s[0] - pos_t[0]
                dy = pos_s[1] - pos_t[1]
                dz = pos_s[2] - pos_t[2]
                dist = math.sqrt(dx * dx + dy * dy + dz * dz + 0.001)

                displacement = dist - params.springLength
                f = k_spring * displacement

                fx = (dx / dist) * f
                fy = (dy / dist) * f
                fz = (dz / dist) * f

                velocities[s][0] -= fx
                velocities[s][1] -= fy
                velocities[s][2] -= fz
                velocities[t][0] += fx
                velocities[t][1] += fy
                velocities[t][2] += fz

        # 3. Center gravity pull & velocity integration
        for nid in node_ids:
            pos = positions[nid]
            vel = velocities[nid]

            # Center pull
            vel[0] -= pos[0] * center_attraction
            vel[1] -= pos[1] * center_attraction
            vel[2] -= pos[2] * center_attraction

            # Apply velocity with damping
            pos[0] = round(pos[0] + vel[0] * 0.05, 3)
            pos[1] = round(pos[1] + vel[1] * 0.05, 3)
            pos[2] = round(pos[2] + vel[2] * 0.05, 3)

            vel[0] *= damping
            vel[1] *= damping
            vel[2] *= damping

    return {nid: (p[0], p[1], p[2]) for nid, p in positions.items()}

def generate_layout_candidate(
    graph_data: Dict[str, Any],
    strategy: str,
    params: LayoutParameters
) -> Dict[str, Any]:
    """
    Generates candidate layout coordinates and metadata.
    """
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])
    positions = execute_classical_layout(nodes, edges, strategy, params)

    return {
        "strategy": strategy,
        "parameters": params.model_dump(),
        "positions": {nid: list(coords) for nid, coords in positions.items()},
        "nodeCount": len(positions),
        "edgeCount": len(edges),
    }
