# 🧬 Boring AI Agent Architecture & Colab Orchestration Layer

This directory contains the AI Agent orchestration layer for the **Boring** molecular social network visualization platform.

---

## 1. System Invariants & Storage Principles

1. **Zero Local Weights**:
   - The user's Windows laptop must **never** store model weights, checkpoint files, or Ollama image blobs for Qwen3.5-9B or Qwen3-Coder.
   - All AI model inference runs **remotely inside Google Colab**.
2. **Two Models Maximum**:
   - **Primary (Graph Intelligence)**: `Qwen/Qwen3.5-9B` — reasons over compact graph summaries, selects registered layout strategies, and recommends bounded physical parameters.
   - **Secondary (Engineering Specialist)**: `Qwen3-Coder` — assists with controlled code analysis, schema review, and layout debugging.
3. **Deterministic Social Graph Truth**:
   - The backend database is the sole authority on relationship states (`NO_RELATIONSHIP` → `REQUESTED` → `ACCEPTED_ONE_WAY` → `CONNECT BACK` → `MUTUAL`).
   - `ACCEPTED` != `MUTUAL`. Only reciprocal `MUTUAL` connections form 3D molecular bonds.
   - AI **never** creates, accepts, modifies, or deletes relationships.
   - AI **never** generates raw 3D coordinates. The deterministic Boring backend engine generates and physically validates all coordinate geometry.

---

## 2. Directory Structure

```text
agent/
├── README.md                  # This specification and runtime guide
├── config.py                  # Agent settings, model IDs, token bounds, and strategy whitelist
├── agent.py                   # BoringAgentOrchestrator & FastAPI remote endpoint
├── prompts/
│   ├── system_prompt.txt      # Qwen3.5-9B Graph Intelligence Agent system prompt
│   └── coder_prompt.txt       # Qwen3-Coder Engineering Agent system prompt
├── schemas/
│   ├── graph_schema.py        # CompactGraphSummary & GraphLayoutRequest Pydantic schemas
│   └── layout_schema.py       # LayoutParameters, LayoutDecisionResponse, & Coder schemas
├── tools/
│   ├── graph_tools.py         # Deterministic degree, density, community, and cycle calculators
│   ├── layout_tools.py        # Classical 3D force-directed layout solver
│   ├── validation_tools.py    # Zero-overlap collision checker and spatial evaluator
│   └── cache_tools.py         # Multi-user isolated cache (userId + graphVersion + layoutProfile)
├── providers/
│   ├── base.py                # Abstract Base Provider interface
│   └── colab_provider.py      # Live Colab Transformers provider + deterministic test mock
├── tests/
│   └── test_agent.py          # Unit & integration tests for schemas, routing, cache, and validation
└── notebooks/
    └── Boring_Agent_Lab.ipynb # 20-section self-contained Google Colab notebook
```

---

## 3. How to Run in Google Colab

1. **Open Colab**: Navigate to [Google Colab](https://colab.research.google.com/) and upload `agent/notebooks/Boring_Agent_Lab.ipynb`.
2. **Enable GPU**: Click **Runtime → Change runtime type → T4 GPU (or A100)**.
3. **Execute All Cells**:
   - Section 1–3 checks hardware diagnostics and installs dependencies.
   - Section 4–7 loads `Qwen/Qwen3.5-9B` and `Qwen3-Coder` directly into Colab VRAM.
   - Section 8–19 executes the end-to-end graph reasoning, classical layout solver, validation, cache, and fallback.
   - Section 20 spins up the authenticated FastAPI server and provides an ngrok tunnel URL (e.g. `https://xxxx.ngrok-free.app`).

---

## 4. Connecting Boring Backend to Remote Colab Agent

In your local `.env` file (or environment variables) on Windows:

```env
# URL provided by Colab ngrok tunnel in Section 20
REMOTE_AGENT_URL=https://xxxx.ngrok-free.app
BORING_AGENT_AUTH_TOKEN=boring-dev-agent-token-2026
```

When `REMOTE_AGENT_URL` is set:

- The Boring backend transmits a **compact graph summary** (node count, edges, density, cycles, communities) to Colab.
- Qwen3.5-9B returns a structured JSON layout recommendation.
- Boring's classical layout engine generates coordinates and validates zero atom overlaps.
- The layout is cached in SQLite (`layout_cache`).

If Colab is offline or times out:

- Boring immediately falls back to the classical topological heuristic (`CLASSICAL_FALLBACK`) without crashing or blocking the user experience.

---

## 5. Operational Status Definitions

To maintain absolute architectural transparency, the system recognizes four distinct execution states:

1. **LOCAL TEST**:
   - Schema validation, Pydantic bounds checking, deterministic classical solver execution, and cache isolation tests.
   - Run via: `python -m unittest agent/tests/test_agent.py` and `npm run test:backend`.
   - Requires zero remote network or external GPU.

2. **MOCK AGENT**:
   - Local mock server process running on `http://127.0.0.1:8000` (`AGENT_MODE=mock`).
   - Simulates Qwen3.5-9B response structure, Bearer token authentication, timeout handling, and malformed JSON rejection.
   - Run via: `npm run test:agent`.

3. **COLAB READY**:
   - The Colab notebook `agent/notebooks/Boring_Agent_Lab.ipynb` is generated, fully formatted with 41 cells, and ready to execute in a Colab GPU runtime.
   - Model identifier `Qwen/Qwen3.5-9B`, PyTorch float16 CUDA loading, FastAPI service, and ngrok tunnel are fully wired.
   - Windows backend `remoteAgentClient.ts` is configured to connect immediately once `REMOTE_AGENT_URL` is set.

4. **LIVE COLAB VERIFIED**:
   - Live external round trip verified through an active Google Colab GPU session executing real Transformers inference with `Qwen/Qwen3.5-9B`.
   - Marked as `EXTERNAL RUNTIME REQUIRED` whenever an active external Colab session is not currently running.
