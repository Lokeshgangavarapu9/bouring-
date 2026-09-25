/**
 * Remote AI Agent Client
 * Communicates with Google Colab or remote agent runtime hosting Qwen3.5-9B.
 * Enforces strict timeouts and zero-dependency classical fallback.
 */

import { LayoutStrategyCandidate, LayoutParameters, LayoutFamily } from './aiLayoutStrategyService.ts';
import { ConstructedGraph } from './graphConstructionService.ts';
import { GraphMetrics } from './graphAnalysisService.ts';
import { GraphSummaryForAI } from './graphPipelineService.ts';

function getRemoteAgentUrl(): string {
  return process.env.REMOTE_AGENT_URL || '';
}
function getAuthToken(): string {
  return process.env.BORING_AGENT_AUTH_TOKEN || 'boring-dev-agent-token-2026';
}
function getTimeoutMs(): number {
  return Number(process.env.REMOTE_AGENT_TIMEOUT_MS) || 15000;
}

export type CompactGraphSummary = GraphSummaryForAI;

export interface RemoteAgentLayoutResponse {
  agent?: string;
  model?: string;
  layoutStrategy?: string;
  parameters?: {
    repulsion?: number;
    springLength?: number;
    edge_length?: number;
    iterations?: number;
    communitySeparation?: number;
    cluster_strength?: number;
    damping?: number;
    centerAttraction?: number;
  };
  reasonCodes?: string[];
  reason?: string;
  confidence?: number;
  status?: string;
  success?: boolean;
  recommendation?: {
    layout_strategy?: string;
    layoutStrategy?: string;
    parameters?: any;
    reason?: string;
    confidence?: number;
  };
}

export interface RemoteAgentHealthResponse {
  status: string;
  model?: string;
  primaryModel?: string;
  coderModel?: string;
  gpu?: boolean;
  gpuAvailable?: boolean;
  mode?: string;
}

/**
 * Checks health and connectivity of the remote Google Colab agent.
 */
export async function checkRemoteAgentHealth(): Promise<{ reachable: boolean; data?: RemoteAgentHealthResponse; error?: string }> {
  const remoteUrl = getRemoteAgentUrl();
  if (!remoteUrl) {
    return { reachable: false, error: 'REMOTE_AGENT_URL not configured' };
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const baseUrl = remoteUrl.replace(/\/$/, '');
    let res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      signal: controller.signal,
    });
    if (res.status === 404) {
      res = await fetch(`${baseUrl}/agent/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        signal: controller.signal,
      });
    }
    clearTimeout(timeoutId);
    if (!res.ok) {
      return { reachable: false, error: `Health check failed with status ${res.status}` };
    }
    const data = (await res.json()) as RemoteAgentHealthResponse;
    console.log('[Agent] Colab reachable');
    return { reachable: true, data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return { reachable: false, error: err.message };
  }
}

/**
 * Builds compact graph summary without any sensitive or private user profile details.
 */
export function buildCompactGraphSummary(
  graph: ConstructedGraph,
  metrics: GraphMetrics,
  graphVersion: number
): CompactGraphSummary {
  const n = graph.vertices.length;
  const m = graph.edges.length;

  return {
    graphVersion: `v${graphVersion}`,
    nodes: n,
    edges: m,
    density: Number(metrics.density.toFixed(4)),
    averageDegree: n > 0 ? Number(((2 * m) / n).toFixed(2)) : 0,
    maxDegree: metrics.degree,
    communities: metrics.communities ? metrics.communities.length : 1,
    connectedComponents: metrics.componentCount || 1,
    cycles: metrics.cycleCount || 0,
    hubCount: metrics.degree >= 3 ? 1 : 0,
  };
}

/**
 * Calls remote Colab agent endpoint for Qwen3.5-9B layout recommendation.
 * Returns null if remote agent is unconfigured, unreachable, or times out.
 */
export async function requestRemoteAgentLayout(
  userId: string,
  summary: CompactGraphSummary
): Promise<LayoutStrategyCandidate | null> {
  const remoteUrl = getRemoteAgentUrl();
  if (!remoteUrl) {
    // Remote agent URL not set -> normal classical execution
    return null;
  }

  const timeoutMs = getTimeoutMs();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = `${remoteUrl.replace(/\/$/, '')}/agent/layout`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        graphVersion: summary.graphVersion,
        graphSummary: summary,
        task: 'layout_recommendation',
        algorithm_version: 'boring-pipeline-v1',
        constraints: {
          maxOverlap: 0,
          maxIterations: 200,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Remote Agent] Returned status ${res.status}. Using classical fallback.`);
      return null;
    }

    console.log('[Agent] Colab reachable');
    const rawData = (await res.json()) as RemoteAgentLayoutResponse;

    if (rawData && rawData.success === false) {
      console.warn(`[Remote Agent] AI reported error. Using classical fallback.`);
      return null;
    }

    let strategyName = '';
    let paramsRaw: any = {};
    let reasonText = '';
    let agentName = 'Qwen/Qwen3.5-9B';

    if (rawData.recommendation) {
      const rec = rawData.recommendation;
      strategyName = rec.layout_strategy || rec.layoutStrategy || '';
      paramsRaw = rec.parameters || {};
      reasonText = rec.reason || '';
      agentName = rawData.model || agentName;
    } else {
      strategyName = rawData.layoutStrategy || '';
      paramsRaw = rawData.parameters || {};
      reasonText = (rawData.reasonCodes || []).join(', ') || rawData.reason || '';
      agentName = rawData.agent || agentName;
    }

    // Supported layout strategy verification
    const supportedStrategies = [
      'force_directed',
      'spherical_shell',
      'spectral_cluster',
      'hierarchical_layered',
      'community_clustered',
      'radial',
      'hierarchical',
      'hub_centered',
    ];

    if (!strategyName || !supportedStrategies.includes(strategyName)) {
      console.warn(`[Remote Agent] Unsupported layout strategy '${strategyName}'. Using classical fallback.`);
      return null;
    }

    // Numeric & finiteness validation (no NaN, no Infinity)
    const isNum = (v: any) => typeof v === 'number' && Number.isFinite(v) && !Number.isNaN(v);
    if (paramsRaw.repulsion !== undefined && !isNum(paramsRaw.repulsion)) return null;
    if (paramsRaw.springLength !== undefined && !isNum(paramsRaw.springLength)) return null;
    if (paramsRaw.edge_length !== undefined && !isNum(paramsRaw.edge_length)) return null;
    if (paramsRaw.iterations !== undefined && !isNum(paramsRaw.iterations)) return null;
    if (paramsRaw.damping !== undefined && !isNum(paramsRaw.damping)) return null;
    if (paramsRaw.centerAttraction !== undefined && !isNum(paramsRaw.centerAttraction)) return null;

    const repulsionVal = paramsRaw.repulsion ?? 0.8;
    const springLengthVal = paramsRaw.springLength ?? paramsRaw.edge_length ?? 1.1;
    const iterationsVal = paramsRaw.iterations ?? 120;
    const dampingVal = paramsRaw.damping ?? 0.85;
    const centerAttractionVal = paramsRaw.centerAttraction ?? 0.1;

    // Validate parameters into safe bounded ranges
    const boundedParams: LayoutParameters = {
      repulsion: Math.max(0.1, Math.min(5.0, Number(repulsionVal) || 0.8)),
      springLength: Math.max(0.5, Math.min(10.0, Number(springLengthVal) || 1.1)),
      iterations: Math.max(20, Math.min(300, Number(iterationsVal) || 120)),
      damping: Math.max(0.5, Math.min(0.99, Number(dampingVal) || 0.85)),
      centerAttraction: Math.max(0.01, Math.min(0.5, Number(centerAttractionVal) || 0.1)),
      baseRadius: 3.5,
    };

    let family: LayoutFamily = 'COMMUNITY_FORCE_RELAXATION';
    if (strategyName === 'spherical_shell' || strategyName === 'radial') {
      family = 'SPHERICAL_GOLDEN_SPIRAL';
    } else if (strategyName === 'spectral_cluster' || strategyName === 'community_clustered' || strategyName === 'hub_centered') {
      family = 'STAR_CLUSTER';
    }

    return {
      strategyId: `ai-${agentName}-${strategyName}`,
      family,
      name: `Qwen3.5: ${strategyName.replace(/_/g, ' ')}`,
      description: `Remote AI layout decision from ${agentName}`,
      rationale: reasonText || 'Optimized layout via topological analysis',
      parameters: boundedParams,
      source: 'AI_PROVIDER',
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.warn(`[Remote Agent] Timed out after ${timeoutMs}ms. Using classical fallback.`);
    } else {
      console.warn(`[Remote Agent] Connection failed (${err.message}). Using classical fallback.`);
    }
    return null;
  }
}
