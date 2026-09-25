"""
Abstract Base Provider Interface for Boring AI Agents
Decouples application logic from specific model architectures or execution hosts.
"""
from abc import ABC, abstractmethod
from ..schemas.graph_schema import CompactGraphSummary
from ..schemas.layout_schema import (
    LayoutDecisionResponse,
    EngineeringTaskRequest,
    EngineeringTaskResponse,
)

class AgentProvider(ABC):
    """
    Interface for Graph Intelligence and Engineering agent providers.
    """

    @abstractmethod
    def generate_layout_decision(
        self,
        summary: CompactGraphSummary
    ) -> LayoutDecisionResponse:
        """
        Invokes Qwen3.5-9B to reason about compact graph summary and return structured layout recommendation.
        """
        pass

    @abstractmethod
    def assist_engineering_task(
        self,
        request: EngineeringTaskRequest
    ) -> EngineeringTaskResponse:
        """
        Invokes Qwen3-Coder specialist on controlled technical inquiries.
        """
        pass
