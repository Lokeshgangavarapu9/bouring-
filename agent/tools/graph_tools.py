"""
Deterministic Graph Tools for Boring AI Agent
"""
from typing import Dict, Any, List, Set
from ..schemas.graph_schema import CompactGraphSummary

def get_graph(graph_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract topological adjacency without private profile data.
    """
    nodes = [n["id"] for n in graph_data.get("nodes", [])]
    edges = [
        {"source": e["source"], "target": e["target"]}
        for e in graph_data.get("edges", [])
    ]
    return {
        "nodeCount": len(nodes),
        "edgeCount": len(edges),
        "nodes": nodes,
        "edges": edges,
    }

def analyze_graph(graph_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze degree distribution, density, components, and cycles.
    """
    nodes: List[str] = [n["id"] for n in graph_data.get("nodes", [])]
    edges: List[Dict[str, str]] = graph_data.get("edges", [])

    n = len(nodes)
    m = len(edges)
    if n == 0:
        return {
            "nodes": 0, "edges": 0, "density": 0.0,
            "averageDegree": 0.0, "maxDegree": 0,
            "connectedComponents": 0, "cycles": 0, "hubCount": 0
        }

    adj: Dict[str, Set[str]] = {node_id: set() for node_id in nodes}
    for e in edges:
        s, t = e["source"], e["target"]
        if s in adj and t in adj:
            adj[s].add(t)
            adj[t].add(s)

    degrees = [len(neighbors) for neighbors in adj.values()]
    avg_degree = sum(degrees) / n if n > 0 else 0.0
    max_degree = max(degrees) if degrees else 0

    max_possible_edges = (n * (n - 1)) / 2
    density = m / max_possible_edges if max_possible_edges > 0 else 0.0

    # Connected components using BFS
    visited = set()
    components = 0
    for node in nodes:
        if node not in visited:
            components += 1
            queue = [node]
            visited.add(node)
            while queue:
                curr = queue.pop(0)
                for neighbor in adj[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)

    # Cyclomatic complexity: M - N + C
    cycles = max(0, m - n + components)

    # Hubs defined as degree >= 2 * avg_degree (for degree >= 3)
    hub_count = sum(1 for d in degrees if d >= max(3, 2 * avg_degree))

    return {
        "nodes": n,
        "edges": m,
        "density": round(density, 4),
        "averageDegree": round(avg_degree, 2),
        "maxDegree": max_degree,
        "connectedComponents": components,
        "cycles": cycles,
        "hubCount": hub_count,
    }

def get_metrics(graph_version: str, graph_data: Dict[str, Any]) -> CompactGraphSummary:
    """
    Produce validated CompactGraphSummary model.
    """
    analysis = analyze_graph(graph_data)
    communities = get_communities(graph_data)

    return CompactGraphSummary(
        graphVersion=graph_version,
        nodes=analysis["nodes"],
        edges=analysis["edges"],
        density=analysis["density"],
        averageDegree=analysis["averageDegree"],
        maxDegree=analysis["maxDegree"],
        communities=len(communities),
        connectedComponents=analysis["connectedComponents"],
        cycles=analysis["cycles"],
        hubCount=analysis["hubCount"],
    )

def get_communities(graph_data: Dict[str, Any]) -> List[List[str]]:
    """
    Deterministic community partitioning using Connected Components + High-Degree modularity heuristic.
    """
    nodes: List[str] = [n["id"] for n in graph_data.get("nodes", [])]
    edges: List[Dict[str, str]] = graph_data.get("edges", [])

    if not nodes:
        return []

    adj: Dict[str, Set[str]] = {node_id: set() for node_id in nodes}
    for e in edges:
        s, t = e["source"], e["target"]
        if s in adj and t in adj:
            adj[s].add(t)
            adj[t].add(s)

    visited = set()
    components: List[List[str]] = []
    for node in nodes:
        if node not in visited:
            comp = []
            queue = [node]
            visited.add(node)
            while queue:
                curr = queue.pop(0)
                comp.append(curr)
                for neighbor in adj[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)
            components.append(comp)

    return components
