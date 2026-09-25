"""
Boring AI Agent Orchestrator & Server
Coordinates Qwen3.5-9B and Qwen3-Coder models with deterministic fallback and caching.
"""
import os
import sys
import logging
from typing import Dict, Any, Optional
try:
    from fastapi import FastAPI, Header, HTTPException, Depends
    FASTAPI_AVAILABLE = True
except ImportError:
    FastAPI = None  # type: ignore
    Header = HTTPException = Depends = None  # type: ignore
    FASTAPI_AVAILABLE = False

try:
    from .config import (
        AUTH_TOKEN, AGENT_MODE, PRIMARY_MODEL, CODER_MODEL, PARAM_BOUNDS, REGISTERED_STRATEGIES,
        AGENT_HOST, AGENT_PORT,
    )
    from .schemas.graph_schema import CompactGraphSummary, GraphLayoutRequest
    from .schemas.layout_schema import (
        LayoutDecisionResponse, LayoutParameters, EngineeringTaskRequest, EngineeringTaskResponse,
    )
    from .providers.base import AgentProvider
    from .providers.colab_provider import MockAgentProvider, ColabModelProvider
    from .tools.cache_tools import get_cached_layout, save_layout
    from .tools.validation_tools import evaluate_layout
    from .tools.layout_tools import generate_layout_candidate
except ImportError:
    from agent.config import (
        AUTH_TOKEN, AGENT_MODE, PRIMARY_MODEL, CODER_MODEL, PARAM_BOUNDS, REGISTERED_STRATEGIES,
        AGENT_HOST, AGENT_PORT,
    )
    from agent.schemas.graph_schema import CompactGraphSummary, GraphLayoutRequest
    from agent.schemas.layout_schema import (
        LayoutDecisionResponse, LayoutParameters, EngineeringTaskRequest, EngineeringTaskResponse,
    )
    from agent.providers.base import AgentProvider
    from agent.providers.colab_provider import MockAgentProvider, ColabModelProvider
    from agent.tools.cache_tools import get_cached_layout, save_layout
    from agent.tools.validation_tools import evaluate_layout
    from agent.tools.layout_tools import generate_layout_candidate

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("BoringAgentOrchestrator")

class BoringAgentOrchestrator:
    """
    Two-Agent Orchestration Layer:
    - Primary: Qwen3.5-9B (Graph & Layout Intelligence)
    - Secondary: Qwen3-Coder (Technical Engineering Specialist)
    """

    def __init__(self, provider: Optional[AgentProvider] = None):
        if provider is not None:
            self.provider = provider
        elif AGENT_MODE == "standalone" and os.getenv("RUNNING_IN_COLAB") == "true":
            self.provider = ColabModelProvider(load_primary=True, load_coder=False)
        else:
            self.provider = MockAgentProvider()

    def orchestrate_layout(self, request: GraphLayoutRequest) -> LayoutDecisionResponse:
        """
        Orchestration Pipeline:
        1. Multi-User Isolation: Check cache with userId + graphVersion
        2. If cache hit -> return cached decision
        3. If cache miss -> Invoke Primary Agent (Qwen3.5-9B)
        4. Validate returned parameters against PARAM_BOUNDS
        5. Save in cache and return
        """
        user_id = request.userId
        version = request.graphVersion

        # 1. Cache Check
        cached = get_cached_layout(user_id, version)
        if cached:
            logger.info(f"Layout cache hit for user={user_id}, version={version}")
            return LayoutDecisionResponse(**cached)

        # 2. Invoke Qwen3.5-9B
        try:
            logger.info(f"Invoking Qwen3.5-9B for user={user_id}, version={version}...")
            decision = self.provider.generate_layout_decision(request.graphSummary)
        except Exception as e:
            logger.error(f"Error calling Qwen3.5-9B: {e}. Falling back to classical baseline.")
            mock = MockAgentProvider()
            decision = mock.generate_layout_decision(request.graphSummary)
            decision.status = "CLASSICAL_FALLBACK"

        # 3. Parameter Validation & Boundary Enforcement
        params = decision.parameters
        params.repulsion = max(PARAM_BOUNDS["repulsion"]["min"], min(PARAM_BOUNDS["repulsion"]["max"], params.repulsion))
        params.springLength = max(PARAM_BOUNDS["springLength"]["min"], min(PARAM_BOUNDS["springLength"]["max"], params.springLength))
        params.iterations = max(PARAM_BOUNDS["iterations"]["min"], min(PARAM_BOUNDS["iterations"]["max"], params.iterations))
        params.communitySeparation = max(PARAM_BOUNDS["communitySeparation"]["min"], min(PARAM_BOUNDS["communitySeparation"]["max"], params.communitySeparation))

        # 4. Strategy Whitelist Check
        if decision.layoutStrategy not in REGISTERED_STRATEGIES:
            decision.layoutStrategy = "force_directed"
            decision.status = "AI_VALIDATION_FAILED"

        # 5. Cache Validated Decision
        save_layout(user_id, version, decision.model_dump())
        return decision

    def orchestrate_engineering_task(self, request: EngineeringTaskRequest) -> EngineeringTaskResponse:
        """
        Routes explicit code/tool/engineering inquiries to Qwen3-Coder.
        """
        logger.info(f"Invoking Qwen3-Coder for task: {request.taskType}")
        return self.provider.assist_engineering_task(request)


# Global orchestrator instance
orchestrator = BoringAgentOrchestrator()

# ---------------------------------------------------------
# FastAPI Remote Service for Google Colab
# ---------------------------------------------------------
if FASTAPI_AVAILABLE:
    app = FastAPI(
        title="Boring AI Agent Remote Service",
        description="Remote inference service hosting Qwen3.5-9B and Qwen3-Coder for Boring Social Graph 3D Lab.",
        version="1.0.0"
    )

    def verify_token(authorization: Optional[str] = Header(None)):
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing Authorization header")
        token = authorization.replace("Bearer ", "").strip()
        if token != AUTH_TOKEN:
            raise HTTPException(status_code=403, detail="Invalid Boring Agent auth token")
        return token

    @app.get("/health")
    @app.get("/agent/health")
    def health():
        return {
            "status": "ok",
            "model": PRIMARY_MODEL,
            "primaryModel": PRIMARY_MODEL,
            "coderModel": CODER_MODEL,
            "gpu": False,
            "mode": AGENT_MODE,
        }

    @app.post("/agent/layout", response_model=LayoutDecisionResponse)
    def layout_endpoint(request: GraphLayoutRequest, token: str = Depends(verify_token)):
        return orchestrator.orchestrate_layout(request)

    @app.post("/agent/coder", response_model=EngineeringTaskResponse)
    def coder_endpoint(request: EngineeringTaskRequest, token: str = Depends(verify_token)):
        return orchestrator.orchestrate_engineering_task(request)
def run_fallback_server(host=AGENT_HOST, port=AGENT_PORT):
    import json
    from http.server import HTTPServer, BaseHTTPRequestHandler

    class AgentHandler(BaseHTTPRequestHandler):
        def log_message(self, format, *args):
            pass  # Suppress default noisy console logs

        def _send_json(self, status_code: int, data: dict):
            body = json.dumps(data).encode("utf-8")
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path in ("/health", "/agent/health"):
                self._send_json(200, {
                    "status": "ok",
                    "model": PRIMARY_MODEL,
                    "primaryModel": PRIMARY_MODEL,
                    "coderModel": CODER_MODEL,
                    "gpu": False,
                    "mode": AGENT_MODE,
                })
            else:
                self._send_json(404, {"error": "Not found"})

        def do_POST(self):
            auth = self.headers.get("Authorization", "")
            token = auth.replace("Bearer ", "").strip()
            if token != AUTH_TOKEN:
                self._send_json(403, {"error": "Invalid auth token"})
                return

            length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(length)
            try:
                payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
            except Exception:
                self._send_json(400, {"error": "Malformed JSON"})
                return

            if self.path == "/agent/layout":
                try:
                    req = GraphLayoutRequest(**payload)
                    decision = orchestrator.orchestrate_layout(req)
                    self._send_json(200, decision.model_dump())
                except Exception as e:
                    self._send_json(422, {"error": str(e)})
            elif self.path == "/agent/coder":
                try:
                    req = EngineeringTaskRequest(**payload)
                    resp = orchestrator.orchestrate_engineering_task(req)
                    self._send_json(200, resp.model_dump())
                except Exception as e:
                    self._send_json(422, {"error": str(e)})
            else:
                self._send_json(404, {"error": "Not found"})

    print(f"[Boring Agent] Server listening on http://{host}:{port}")
    server = HTTPServer((host, port), AgentHandler)
    server.serve_forever()

if __name__ == "__main__":
    from .config import AGENT_HOST, AGENT_PORT
    if FASTAPI_AVAILABLE:
        import uvicorn
        uvicorn.run("agent.agent:app", host=AGENT_HOST, port=AGENT_PORT, reload=False)
    else:
        run_fallback_server(AGENT_HOST, AGENT_PORT)
