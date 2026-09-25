"""
Deterministic Layout Validation Tools for Boring Agent
"""
import math
from typing import Dict, Any, List, Tuple

def evaluate_layout(
    positions: Dict[str, Tuple[float, float, float]],
    edges: List[Dict[str, Any]],
    node_radius: float = 0.8
) -> Dict[str, Any]:
    """
    Validates physical criteria:
    - Overlap count (distance < 2 * node_radius)
    - Minimum node separation
    - Extreme edge length variance
    - Numerical stability (NaN / Infinity checks)
    - Coordinate bounds
    """
    nids = list(positions.keys())
    n = len(nids)
    if n <= 1:
        return {
            "isValid": True,
            "overlapCount": 0,
            "minSeparation": 999.0,
            "edgeLengthVariance": 0.0,
            "bounded": True,
            "stable": True,
            "score": 1.0,
        }

    # 1. Numerical stability & bounds check
    for nid, pos in positions.items():
        for coord in pos:
            if math.isnan(coord) or math.isinf(coord):
                return {
                    "isValid": False,
                    "reason": "Numerical instability: NaN/Inf coordinates detected",
                    "overlapCount": 999,
                    "minSeparation": 0.0,
                    "score": 0.0,
                }
            if abs(coord) > 500.0:
                return {
                    "isValid": False,
                    "reason": f"Coordinate out of camera bounds: {coord}",
                    "overlapCount": 999,
                    "minSeparation": 0.0,
                    "score": 0.0,
                }

    # 2. Overlap & min separation
    min_dist = float("inf")
    overlap_count = 0
    collision_threshold = node_radius * 2.0

    for i in range(n):
        pos_a = positions[nids[i]]
        for j in range(i + 1, n):
            pos_b = positions[nids[j]]
            dx = pos_a[0] - pos_b[0]
            dy = pos_a[1] - pos_b[1]
            dz = pos_a[2] - pos_b[2]
            d = math.sqrt(dx * dx + dy * dy + dz * dz)

            if d < min_dist:
                min_dist = d
            if d < collision_threshold:
                overlap_count += 1

    # 3. Edge length variance
    edge_lengths = []
    for e in edges:
        s, t = e["source"], e["target"]
        if s in positions and t in positions:
            p_s = positions[s]
            p_t = positions[t]
            d = math.sqrt(
                (p_s[0] - p_t[0]) ** 2 +
                (p_s[1] - p_t[1]) ** 2 +
                (p_s[2] - p_t[2]) ** 2
            )
            edge_lengths.append(d)

    variance = 0.0
    if edge_lengths:
        avg_len = sum(edge_lengths) / len(edge_lengths)
        variance = sum((l - avg_len) ** 2 for l in edge_lengths) / len(edge_lengths)

    # Score from 0.0 to 1.0
    score = 1.0
    if overlap_count > 0:
        score -= min(0.8, overlap_count * 0.2)
    score -= min(0.2, variance * 0.02)

    is_valid = overlap_count == 0

    return {
        "isValid": is_valid,
        "overlapCount": overlap_count,
        "minSeparation": round(min_dist, 3) if min_dist != float("inf") else 0.0,
        "edgeLengthVariance": round(variance, 3),
        "score": round(max(0.0, score), 3),
    }
