"""
Graph Schema Definitions for Boring Agent
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class CompactGraphSummary(BaseModel):
    """
    Compact graph summary sent to AI Agent.
    Strictly excludes sensitive user data, passwords, or personal profiles.
    """
    graphVersion: str = Field(..., description="Deterministic hash or version string of graph topology")
    nodes: int = Field(..., ge=0, description="Total node count in mutual graph")
    edges: int = Field(..., ge=0, description="Total mutual edge count")
    density: float = Field(..., ge=0.0, le=1.0, description="Graph edge density")
    averageDegree: float = Field(..., ge=0.0, description="Average node degree")
    maxDegree: int = Field(..., ge=0, description="Maximum degree among all nodes")
    communities: int = Field(1, ge=1, description="Detected community partition count")
    connectedComponents: int = Field(1, ge=0, description="Number of connected components")
    cycles: int = Field(0, ge=0, description="Number of fundamental chordless cycles")
    hubCount: int = Field(0, ge=0, description="Number of hub nodes (degree >= 2 * avg)")
    constraints: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Server layout constraints")

class GraphLayoutRequest(BaseModel):
    """
    Inbound request from Boring Backend to AI Orchestration layer.
    """
    requestId: Optional[str] = Field(None, description="Unique trace request ID")
    userId: str = Field(..., description="Authenticated user ID scope")
    graphVersion: str = Field(..., description="Version of the ego graph")
    graphSummary: CompactGraphSummary = Field(..., description="Compact graph metrics")
    constraints: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Physical and rendering constraints")
