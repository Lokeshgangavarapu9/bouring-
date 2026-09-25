"""
Boring AI Agent Architecture - Configuration Module
"""

import os
from typing import Literal

# AI Runtime & Environment
AI_PROVIDER: str = os.getenv("AI_PROVIDER", "colab")
AGENT_MODE: Literal["remote", "standalone", "mock"] = os.getenv("AGENT_MODE", "remote")  # type: ignore

# Model Identifiers
PRIMARY_MODEL: str = os.getenv("PRIMARY_MODEL", "Qwen/Qwen3.5-9B")
# Primary architecture: qwen3-coder. (Colab Hugging Face fallback if Ollama runtime unavailable: Qwen/Qwen2.5-Coder-7B-Instruct)
CODER_MODEL: str = os.getenv("CODER_MODEL", "qwen3-coder")

# Network & Server
AGENT_HOST: str = os.getenv("AGENT_HOST", "0.0.0.0")
AGENT_PORT: int = int(os.getenv("AGENT_PORT", "8000"))
AUTH_TOKEN: str = os.getenv("BORING_AGENT_AUTH_TOKEN", "boring-dev-agent-token-2026")
REQUEST_TIMEOUT_SECONDS: int = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))

# Classical Algorithm Limits
PARAM_BOUNDS = {
    "repulsion": {"min": 0.1, "max": 5.0, "default": 0.8},
    "springLength": {"min": 0.5, "max": 10.0, "default": 1.1},
    "iterations": {"min": 20, "max": 300, "default": 120},
    "communitySeparation": {"min": 0.5, "max": 3.0, "default": 1.2},
    "damping": {"min": 0.5, "max": 0.99, "default": 0.85},
    "centerAttraction": {"min": 0.01, "max": 0.5, "default": 0.1},
}

REGISTERED_STRATEGIES = [
    "force_directed",
    "spherical_shell",
    "spectral_cluster",
    "hierarchical_layered",
]
