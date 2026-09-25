"""
Colab Model Provider & Deterministic Mock Provider for Boring Agent
"""
import json
import logging
from typing import Optional, Any
from .base import AgentProvider
from ..schemas.graph_schema import CompactGraphSummary
from ..schemas.layout_schema import (
    LayoutDecisionResponse,
    LayoutParameters,
    EngineeringTaskRequest,
    EngineeringTaskResponse,
)
from ..config import PRIMARY_MODEL, CODER_MODEL

logger = logging.getLogger("BoringAgent")

class MockAgentProvider(AgentProvider):
    """
    Deterministic simulated provider for local testing and CI/CD without GPU or remote endpoints.
    Emulates Qwen3.5-9B topological reasoning and Qwen3-Coder output.
    """

    def generate_layout_decision(
        self,
        summary: CompactGraphSummary
    ) -> LayoutDecisionResponse:
        n = summary.nodes
        m = summary.edges
        density = summary.density
        communities = summary.communities
        cycles = summary.cycles

        reason_codes = []
        if n <= 1:
            strategy = "spherical_shell"
            params = LayoutParameters(repulsion=0.5, springLength=1.0, iterations=30)
            reason_codes.append("isolated_or_empty")
        elif n == 2:
            strategy = "force_directed"
            params = LayoutParameters(repulsion=0.6, springLength=1.2, iterations=40)
            reason_codes.append("diatomic_pair")
        elif cycles > 0 and communities <= 2:
            strategy = "force_directed"
            params = LayoutParameters(
                repulsion=round(0.8 + 0.1 * min(cycles, 5), 2),
                springLength=1.1,
                iterations=120,
                communitySeparation=1.2
            )
            reason_codes.extend(["cyclic_topology", "moderate_density"])
        elif communities > 2:
            strategy = "spectral_cluster"
            params = LayoutParameters(
                repulsion=1.2,
                springLength=1.4,
                iterations=150,
                communitySeparation=2.0
            )
            reason_codes.extend(["multiple_communities", "cluster_isolation"])
        elif density < 0.05:
            strategy = "force_directed"
            params = LayoutParameters(repulsion=0.9, springLength=1.5, iterations=100)
            reason_codes.append("sparse_network")
        else:
            strategy = "force_directed"
            params = LayoutParameters(repulsion=0.8, springLength=1.1, iterations=120)
            reason_codes.append("dense_connected_core")

        return LayoutDecisionResponse(
            agent="qwen3.5-9b",
            layoutStrategy=strategy,  # type: ignore
            parameters=params,
            reasonCodes=reason_codes,
            confidence=0.88,
            status="AI_AVAILABLE"
        )

    def assist_engineering_task(
        self,
        request: EngineeringTaskRequest
    ) -> EngineeringTaskResponse:
        return EngineeringTaskResponse(
            agent="qwen3-coder",
            taskType=request.taskType,
            solution=f"[Mock Qwen3-Coder] Verified schema and test boundaries for: {request.prompt}",
            safeForExecution=False
        )

class ColabModelProvider(AgentProvider):
    """
    Live Transformers/PyTorch Provider meant to be initialized and executed INSIDE Google Colab.
    DO NOT initialize this class on local laptop if weights are not downloaded.
    """

    def __init__(self, load_primary: bool = True, load_coder: bool = False):
        self.primary_model = None
        self.primary_tokenizer = None
        self.coder_model = None
        self.coder_tokenizer = None

        if load_primary:
            self._init_primary_model()
        if load_coder:
            self._init_coder_model()

    def _init_primary_model(self):
        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer
            logger.info(f"Loading primary model: {PRIMARY_MODEL} into Colab GPU...")
            self.primary_tokenizer = AutoTokenizer.from_pretrained(PRIMARY_MODEL, trust_remote_code=True)
            self.primary_model = AutoModelForCausalLM.from_pretrained(
                PRIMARY_MODEL,
                device_map="auto",
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                trust_remote_code=True
            )
            logger.info("Qwen3.5-9B successfully initialized in Colab runtime.")
        except Exception as e:
            logger.error(f"Failed to load primary model in Colab: {e}")
            self.primary_model = None

    def _init_coder_model(self):
        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer
            logger.info(f"Loading coder model: {CODER_MODEL} into Colab GPU...")
            self.coder_tokenizer = AutoTokenizer.from_pretrained(CODER_MODEL, trust_remote_code=True)
            self.coder_model = AutoModelForCausalLM.from_pretrained(
                CODER_MODEL,
                device_map="auto",
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                trust_remote_code=True
            )
            logger.info("Qwen3-Coder successfully initialized in Colab runtime.")
        except Exception as e:
            logger.error(f"Failed to load coder model in Colab: {e}")
            self.coder_model = None

    def generate_layout_decision(
        self,
        summary: CompactGraphSummary
    ) -> LayoutDecisionResponse:
        if not self.primary_model or not self.primary_tokenizer:
            # Automatic fallback to deterministic heuristic mock
            logger.warning("Primary model not loaded in Colab. Falling back to deterministic simulation.")
            mock = MockAgentProvider()
            resp = mock.generate_layout_decision(summary)
            resp.status = "CLASSICAL_FALLBACK"
            return resp

        # Inference inside Colab
        import os
        import torch

        system_prompt = (
            "You are Boring's Graph Intelligence Agent.\n"
            "Your job is to analyze a sanitized social-graph topology and recommend a 3D visualization layout strategy.\n"
            "You are NOT the source of truth for social relationships.\n"
            "You MUST NOT create relationships, remove relationships, determine mutuality, or change topology.\n"
            "The classical layout engine generates the final coordinates.\n"
            "Return ONLY valid JSON matching the required layout recommendation schema."
        )
        try:
            prompt_file = os.path.join(os.path.dirname(__file__), "..", "prompts", "system_prompt.txt")
            if os.path.exists(prompt_file):
                with open(prompt_file, "r", encoding="utf-8") as f:
                    system_prompt = f.read().strip()
        except Exception:
            pass

        prompt_content = f"""Sanitized Graph Summary:
graphVersion: {summary.graphVersion}
nodes: {summary.nodes}
edges: {summary.edges}
density: {summary.density}
averageDegree: {summary.averageDegree}
maxDegree: {summary.maxDegree}
communities: {summary.communities}
connectedComponents: {summary.connectedComponents}
cycles: {summary.cycles}
hubCount: {summary.hubCount}

Analyze the topology and return strictly JSON:
{{
    "layout_strategy": "force_directed",
    "parameters": {{
        "repulsion": 0.8,
        "springLength": 1.1,
        "iterations": 120,
        "communitySeparation": 1.2
    }},
    "reason": "Topological structural explanation",
    "confidence": 0.85
}}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt_content}
        ]

        text = self.primary_tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = self.primary_tokenizer([text], return_tensors="pt").to(self.primary_model.device)

        with torch.no_grad():
            outputs = self.primary_model.generate(
                **inputs,
                max_new_tokens=256,
                temperature=0.2,
                do_sample=False
            )
        generated_ids = [out[len(inp):] for inp, out in zip(inputs.input_ids, outputs)]
        response_text = self.primary_tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]

        try:
            # Parse JSON
            start_idx = response_text.find("{")
            end_idx = response_text.rfind("}") + 1
            if start_idx != -1 and end_idx != -1:
                json_data = json.loads(response_text[start_idx:end_idx])
                strat = json_data.get("layoutStrategy") or json_data.get("layout_strategy") or "force_directed"
                raw_params = json_data.get("parameters", {})
                params = LayoutParameters(
                    repulsion=float(raw_params.get("repulsion", 0.8)),
                    springLength=float(raw_params.get("springLength", raw_params.get("edge_length", 1.1))),
                    iterations=int(raw_params.get("iterations", 120)),
                    communitySeparation=float(raw_params.get("communitySeparation", raw_params.get("cluster_strength", 1.2))),
                    damping=float(raw_params.get("damping", 0.85)),
                    centerAttraction=float(raw_params.get("centerAttraction", 0.1)),
                )
                reason = json_data.get("reason")
                reason_codes = json_data.get("reasonCodes") or ([reason] if reason else ["model_generated"])
                return LayoutDecisionResponse(
                    agent="Qwen/Qwen3.5-9B",
                    layoutStrategy=strat,
                    parameters=params,
                    reasonCodes=reason_codes,
                    confidence=float(json_data.get("confidence", 0.85)),
                    status="AI_AVAILABLE"
                )
        except Exception as err:
            logger.error(f"Failed to parse model JSON: {err}. Raw: {response_text}")

        # Fallback if generation failed
        mock = MockAgentProvider()
        fallback = mock.generate_layout_decision(summary)
        fallback.status = "AI_INVALID_OUTPUT"
        return fallback

    def assist_engineering_task(
        self,
        request: EngineeringTaskRequest
    ) -> EngineeringTaskResponse:
        if not self.coder_model or not self.coder_tokenizer:
            mock = MockAgentProvider()
            return mock.assist_engineering_task(request)

        import torch
        prompt_content = f"Task: {request.taskType}\nInquiry: {request.prompt}\nContext: {request.codeContext or 'None'}"
        messages = [
            {"role": "system", "content": "You are the Boring Engineering Agent. Return minimal, testable code reasoning."},
            {"role": "user", "content": prompt_content}
        ]
        text = self.coder_tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = self.coder_tokenizer([text], return_tensors="pt").to(self.coder_model.device)

        with torch.no_grad():
            outputs = self.coder_model.generate(**inputs, max_new_tokens=512, temperature=0.1)
        generated_ids = [out[len(inp):] for inp, out in zip(inputs.input_ids, outputs)]
        response_text = self.coder_tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]

        return EngineeringTaskResponse(
            agent="qwen3-coder",
            taskType=request.taskType,
            solution=response_text.strip(),
            safeForExecution=False
        )
