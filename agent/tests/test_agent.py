"""
Unit and Integration Test Suite for Boring AI Agent Architecture
"""
import unittest
from agent.schemas.graph_schema import CompactGraphSummary, GraphLayoutRequest
from agent.schemas.layout_schema import LayoutDecisionResponse, EngineeringTaskRequest
from agent.tools.graph_tools import analyze_graph, get_metrics
from agent.tools.layout_tools import execute_classical_layout
from agent.tools.validation_tools import evaluate_layout
from agent.tools.cache_tools import (
    compute_cache_key,
    get_cached_layout,
    save_layout,
    clear_cache,
)
from agent.providers.colab_provider import MockAgentProvider
from agent.agent import BoringAgentOrchestrator

class TestBoringAgentArchitecture(unittest.TestCase):

    def setUp(self):
        clear_cache()
        self.orchestrator = BoringAgentOrchestrator(provider=MockAgentProvider())

    def test_relationship_invariants_and_graph_analysis(self):
        """
        Verify that graph analysis only processes supplied mutual edges.
        """
        sample_graph = {
            "nodes": [{"id": "user-1"}, {"id": "user-2"}, {"id": "user-3"}],
            "edges": [
                {"source": "user-1", "target": "user-2"},
                {"source": "user-2", "target": "user-3"},
                {"source": "user-3", "target": "user-1"},
            ]
        }
        analysis = analyze_graph(sample_graph)
        self.assertEqual(analysis["nodes"], 3)
        self.assertEqual(analysis["edges"], 3)
        self.assertEqual(analysis["connectedComponents"], 1)
        self.assertEqual(analysis["cycles"], 1)
        self.assertAlmostEqual(analysis["density"], 1.0)

    def test_compact_summary_schema_bounds(self):
        """
        Verify Pydantic validation on compact summary metrics.
        """
        summary = CompactGraphSummary(
            graphVersion="hash-v1-abc",
            nodes=12,
            edges=15,
            density=0.227,
            averageDegree=2.5,
            maxDegree=5,
            communities=2,
            connectedComponents=1,
            cycles=4,
            hubCount=1
        )
        self.assertEqual(summary.nodes, 12)
        self.assertEqual(summary.communities, 2)
        self.assertTrue(0.0 <= summary.density <= 1.0)

    def test_qwen35_layout_orchestration(self):
        """
        Verify Qwen3.5-9B reasoning returns bounded layout parameters and valid strategy.
        """
        summary = CompactGraphSummary(
            graphVersion="v100",
            nodes=5,
            edges=6,
            density=0.6,
            averageDegree=2.4,
            maxDegree=4,
            communities=1,
            connectedComponents=1,
            cycles=2,
            hubCount=1
        )
        req = GraphLayoutRequest(
            userId="user-alpha",
            graphVersion="v100",
            graphSummary=summary
        )

        decision = self.orchestrator.orchestrate_layout(req)
        self.assertEqual(decision.agent, "qwen3.5-9b")
        self.assertIn(decision.layoutStrategy, ["force_directed", "spherical_shell", "spectral_cluster", "hierarchical_layered"])
        self.assertTrue(0.1 <= decision.parameters.repulsion <= 5.0)
        self.assertTrue(0.5 <= decision.parameters.springLength <= 10.0)
        self.assertTrue(20 <= decision.parameters.iterations <= 300)
        self.assertEqual(decision.status, "AI_AVAILABLE")

    def test_qwen3_coder_routing(self):
        """
        Verify secondary engineering queries are routed to Qwen3-Coder.
        """
        task = EngineeringTaskRequest(
            taskType="tool_schema",
            prompt="Verify tool contract for getGraph"
        )
        resp = self.orchestrator.orchestrate_engineering_task(task)
        self.assertEqual(resp.agent, "qwen3-coder")
        self.assertFalse(resp.safeForExecution)
        self.assertIn("tool contract", resp.solution)

    def test_multi_user_cache_isolation(self):
        """
        Verify User A's cached layout is NEVER shared with User B, even if graphVersion matches.
        """
        summary = CompactGraphSummary(
            graphVersion="common-version-hash",
            nodes=3,
            edges=3,
            density=1.0,
            averageDegree=2.0,
            maxDegree=2,
            communities=1,
            connectedComponents=1,
            cycles=1,
            hubCount=0
        )
        req_user_a = GraphLayoutRequest(
            userId="user-A",
            graphVersion="common-version-hash",
            graphSummary=summary
        )
        req_user_b = GraphLayoutRequest(
            userId="user-B",
            graphVersion="common-version-hash",
            graphSummary=summary
        )

        # 1. User A request caches under user-A
        dec_a = self.orchestrator.orchestrate_layout(req_user_a)

        # 2. Check cache tool directly
        cached_a = get_cached_layout("user-A", "common-version-hash")
        cached_b = get_cached_layout("user-B", "common-version-hash")

        self.assertIsNotNone(cached_a)
        self.assertIsNone(cached_b)  # User B MUST NOT have User A's layout in cache!

    def test_classical_layout_execution_and_validation(self):
        """
        Verify that recommended parameters run through classical layout and validation passes.
        """
        nodes = [{"id": f"u{i}"} for i in range(4)]
        edges = [
            {"source": "u0", "target": "u1"},
            {"source": "u1", "target": "u2"},
            {"source": "u2", "target": "u3"},
            {"source": "u3", "target": "u0"},
        ]
        summary = CompactGraphSummary(
            graphVersion="cycle-4",
            nodes=4,
            edges=4,
            density=0.67,
            averageDegree=2.0,
            maxDegree=2,
            communities=1,
            connectedComponents=1,
            cycles=1,
            hubCount=0
        )
        req = GraphLayoutRequest(userId="user-test", graphVersion="cycle-4", graphSummary=summary)
        decision = self.orchestrator.orchestrate_layout(req)

        positions = execute_classical_layout(nodes, edges, decision.layoutStrategy, decision.parameters)
        self.assertEqual(len(positions), 4)

        evaluation = evaluate_layout(positions, edges, node_radius=0.5)
        self.assertTrue(evaluation["isValid"])
        self.assertEqual(evaluation["overlapCount"], 0)
        self.assertGreater(evaluation["minSeparation"], 0.5)

if __name__ == "__main__":
    unittest.main()
