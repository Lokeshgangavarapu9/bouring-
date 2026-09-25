"""
Layout Schema Definitions for Boring Agent
"""
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

class LayoutParameters(BaseModel):
    """
    Validated bounded parameters for classical layout engine.
    """
    repulsion: float = Field(0.8, ge=0.1, le=5.0, description="Repulsion coefficient between nodes")
    springLength: float = Field(1.1, ge=0.5, le=10.0, description="Equilibrium spring length for mutual bonds")
    iterations: int = Field(120, ge=20, le=300, description="Force-relaxation solver passes")
    communitySeparation: float = Field(1.2, ge=0.5, le=3.0, description="Repulsion multiplier across different communities")
    damping: Optional[float] = Field(0.85, ge=0.5, le=0.99, description="Velocity damping factor")
    centerAttraction: Optional[float] = Field(0.1, ge=0.01, le=0.5, description="Gravity pull towards origin")

class LayoutDecisionResponse(BaseModel):
    """
    Structured output returned by Qwen3.5-9B Graph Intelligence Agent.
    """
    agent: str = Field("qwen3.5-9b", description="Identifier of the executing model")
    layoutStrategy: Literal[
        "force_directed",
        "spherical_shell",
        "spectral_cluster",
        "hierarchical_layered"
    ] = Field("force_directed", description="Selected registered layout strategy")
    parameters: LayoutParameters = Field(default_factory=LayoutParameters, description="Bounded parameters")
    reasonCodes: List[str] = Field(default_factory=list, description="Topological rationale codes")
    confidence: float = Field(0.85, ge=0.0, le=1.0, description="Model decision confidence")
    status: Literal[
        "AI_AVAILABLE",
        "AI_UNAVAILABLE",
        "AI_TIMEOUT",
        "AI_INVALID_OUTPUT",
        "AI_VALIDATION_FAILED",
        "CLASSICAL_FALLBACK"
    ] = Field("AI_AVAILABLE", description="Operational execution status")

class EngineeringTaskRequest(BaseModel):
    """
    Request for Qwen3-Coder specialist on controlled technical/engineering tasks.
    """
    taskType: Literal["inspect_code", "tool_schema", "layout_debug", "test_assist"]
    prompt: str = Field(..., description="Technical engineering inquiry")
    codeContext: Optional[str] = Field(None, description="Optional code snippet or schema context")

class EngineeringTaskResponse(BaseModel):
    """
    Response from Qwen3-Coder engineering agent.
    """
    agent: str = Field("qwen3-coder", description="Identifier of the coding model")
    taskType: str
    solution: str = Field(..., description="Technical analysis, patch proposal, or schema validation")
    safeForExecution: bool = Field(False, description="Whether code can be automatically executed (strictly False)")
