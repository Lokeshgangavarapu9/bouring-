import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import { spawn, ChildProcess } from 'node:child_process';
import http from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// STRICT DATABASE ISOLATION
process.env.DATABASE_PATH = path.resolve(__dirname, '../data/test.db');

console.log('\n=============================================');
console.log('🤖 BORING REAL DATABASE + QWEN3.5-9B TEST SUITE');
console.log('=============================================');

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  const { seedDatabase } = await import('../db/seed.ts');
  const { db } = await import('../db/database.ts');
  const {
    buildCompactGraphSummary,
    requestRemoteAgentLayout,
    checkRemoteAgentHealth,
  } = await import('../services/remoteAgentClient.ts');
  const { getOrComputeLayoutAsync } = await import('../services/layoutService.ts');
  const { constructEgoGraph } = await import('../services/graphConstructionService.ts');
  const { buildEgoGraph } = await import('../services/graphAnalysisService.ts');
  const { classifyStructure } = await import('../services/structureClassificationService.ts');
  const { invalidateUserLayoutCache } = await import('../services/cacheService.ts');
  const {
    sendRequest,
    acceptRequest,
    connectBack,
    getMutualPartnerIds,
  } = await import('../services/relationshipService.ts');
  const {
    executeGraphPipeline,
    createAiSafeGraphSummary,
    computeDeterministicGraphVersion,
  } = await import('../services/graphPipelineService.ts');

  // Seed test database
  seedDatabase();

  // ----------------------------------------------------
  // TEST 1: Privacy Boundary Verification (Zero PII)
  // ----------------------------------------------------
  console.log('--- [Test 1] Privacy Boundary Verification ---');
  const hostUserId = 'user-1';
  const aiSummary = createAiSafeGraphSummary(hostUserId);
  assert.ok(aiSummary.graphVersion, 'Summary must include graphVersion');
  assert.strictEqual(typeof aiSummary.nodes, 'number');
  assert.strictEqual(typeof aiSummary.edges, 'number');
  assert.strictEqual(typeof aiSummary.density, 'number');
  assert.ok(aiSummary.density >= 0 && aiSummary.density <= 1);

  const summaryKeys = Object.keys(aiSummary);
  const forbiddenKeys = ['password', 'email', 'name', 'avatar', 'social', 'bio', 'gender', 'token', 'jwt'];
  for (const forbidden of forbiddenKeys) {
    assert.ok(!summaryKeys.includes(forbidden), `Forbidden key "${forbidden}" must not reach AI boundary`);
  }
  console.log('✅ AI boundary strictly sanitized: 0 PII keys detected');

  // ----------------------------------------------------
  // TEST 2: Real Database Relationship State Machine -> Mutual Graph
  // ----------------------------------------------------
  console.log('\n--- [Test 2] Real Database State Machine -> Graph Pipeline ---');
  // Create two distinct users in SQLite
  const testUserA = `test-user-a-${Date.now()}`;
  const testUserB = `test-user-b-${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, name, username, email, password_hash, avatar_url, created_at, updated_at)
    VALUES (?, 'Test User A', ?, ?, 'hash', 'https://avatar.test/a.png', ?, ?)
  `).run(testUserA, `test_a_${Date.now()}`, `test_a_${Date.now()}@boring.test`, now, now);

  db.prepare(`
    INSERT INTO users (id, name, username, email, password_hash, avatar_url, created_at, updated_at)
    VALUES (?, 'Test User B', ?, ?, 'hash', 'https://avatar.test/b.png', ?, ?)
  `).run(testUserB, `test_b_${Date.now()}`, `test_b_${Date.now()}@boring.test`, now, now);

  // 1. Request: A -> B
  const reqAB = sendRequest(testUserA, testUserB);
  let mutualsA = getMutualPartnerIds(testUserA);
  assert.strictEqual(mutualsA.includes(testUserB), false, 'Requested status must not create mutual edge');

  // 2. Accept: B accepts A (One-way)
  acceptRequest(reqAB.id, testUserB);
  mutualsA = getMutualPartnerIds(testUserA);
  assert.strictEqual(mutualsA.includes(testUserB), false, 'ACCEPTED_ONE_WAY must NOT create mutual bond');

  // 3. Connect Back: B -> A -> MUTUAL
  connectBack(testUserB, testUserA);
  mutualsA = getMutualPartnerIds(testUserA);
  assert.ok(mutualsA.includes(testUserB), 'MUTUAL status must create mutual graph edge');

  // Verify Graph Pipeline
  const pipelineOutput = executeGraphPipeline(testUserA);
  assert.ok(pipelineOutput.graphVersionHash.startsWith('gv_'), 'Graph version hash must be generated');
  assert.strictEqual(pipelineOutput.aiSafeSummary.nodes, 2, 'Ego graph must have 2 nodes (Host + Mutual)');
  assert.strictEqual(pipelineOutput.aiSafeSummary.edges, 1, 'Ego graph must have 1 mutual bond');
  console.log('✅ Real Database state machine -> Mutual Graph -> AI-safe Summary verified');

  // ----------------------------------------------------
  // TEST 3: GraphVersion Propagation
  // ----------------------------------------------------
  console.log('\n--- [Test 3] GraphVersion Propagation & Topology Sensitivity ---');
  const v1 = computeDeterministicGraphVersion(testUserA);
  // Profile update must NOT change graphVersion
  db.prepare('UPDATE users SET bio = ? WHERE id = ?').run('Updated Bio for test user', testUserA);
  const v2 = computeDeterministicGraphVersion(testUserA);
  assert.strictEqual(v1.hash, v2.hash, 'Profile bio change must NOT change graphVersion');

  // Add mutual partner C -> MUST change graphVersion
  const testUserC = `test-user-c-${Date.now()}`;
  db.prepare(`
    INSERT INTO users (id, name, username, email, password_hash, avatar_url, created_at, updated_at)
    VALUES (?, 'Test User C', ?, ?, 'hash', 'https://avatar.test/c.png', ?, ?)
  `).run(testUserC, `test_c_${Date.now()}`, `test_c_${Date.now()}@boring.test`, now, now);
  const reqAC = sendRequest(testUserA, testUserC);
  acceptRequest(reqAC.id, testUserC);
  connectBack(testUserC, testUserA);

  const v3 = computeDeterministicGraphVersion(testUserA);
  assert.notStrictEqual(v1.hash, v3.hash, 'Topology change MUST update graphVersion');
  console.log('✅ graphVersion sensitivity & propagation verified');

  // ----------------------------------------------------
  // TEST 4: Spin up Mock Colab Agent Server & Test Health & Auth
  // ----------------------------------------------------
  console.log('\n--- [Test 4] Colab Agent Server Health & Authentication ---');
  let agentProcess: ChildProcess | null = null;
  try {
    let isAlreadyRunning = false;
    try {
      const probe = await fetch('http://127.0.0.1:8000/health');
      if (probe.ok) isAlreadyRunning = true;
    } catch {}

    if (!isAlreadyRunning) {
      agentProcess = spawn('python', ['-m', 'agent.agent'], {
        cwd: path.resolve(__dirname, '../..'),
        stdio: 'pipe',
        env: { ...process.env, AGENT_PORT: '8000', AGENT_MODE: 'mock' },
      });
      await sleep(2000);
    }

    process.env.REMOTE_AGENT_URL = 'http://127.0.0.1:8000';
    process.env.BORING_AGENT_AUTH_TOKEN = 'boring-dev-agent-token-2026';

    const health = await checkRemoteAgentHealth();
    assert.strictEqual(health.reachable, true, 'Colab agent must be reachable');
    assert.strictEqual(health.data?.status, 'ok');
    assert.strictEqual(health.data?.model, 'Qwen/Qwen3.5-9B');
    console.log('✅ Colab Agent health endpoint verified: Qwen/Qwen3.5-9B active');

    // Test Auth Rejection with Invalid Token
    const authFailRes = await fetch('http://127.0.0.1:8000/agent/layout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer INVALID_TOKEN_123',
      },
      body: JSON.stringify({
        userId: testUserA,
        graphVersion: v3.hash,
        graphSummary: pipelineOutput.aiSafeSummary,
      }),
    });
    assert.strictEqual(authFailRes.status, 403, 'Invalid token must return 403 Forbidden');
    console.log('✅ Colab Agent authentication strictly enforced (403 on invalid token)');

    // ----------------------------------------------------
    // TEST 5: Real AI Layout Round Trip
    // ----------------------------------------------------
    console.log('\n--- [Test 5] Real AI Layout Round Trip & Validation ---');
    invalidateUserLayoutCache(testUserA);
    const summaryA = createAiSafeGraphSummary(testUserA);
    const candidate = await requestRemoteAgentLayout(testUserA, summaryA);

    assert.ok(candidate, 'Candidate must be returned by remote Qwen agent');
    assert.strictEqual(candidate.source, 'AI_PROVIDER');
    assert.ok(candidate.name.includes('Qwen3.5'));
    assert.ok(candidate.parameters.repulsion >= 0.1 && candidate.parameters.repulsion <= 5.0);
    assert.ok(candidate.parameters.springLength >= 0.5 && candidate.parameters.springLength <= 10.0);
    console.log(`✅ Qwen3.5 recommendation validated: strategy=${candidate.name}, repulsion=${candidate.parameters.repulsion}`);

    // End-to-End Layout with AI recommendation -> Classical 3D Layout Engine
    const fullLayout = await getOrComputeLayoutAsync(testUserA);
    assert.strictEqual(fullLayout.strategyUsed.source, 'AI_PROVIDER');
    assert.strictEqual(fullLayout.qualityMetrics.overlapCount, 0, 'Must have zero overlap');
    assert.strictEqual(fullLayout.nodes.length, 3, 'Must position all 3 nodes in 3D');
    console.log('✅ Classical engine executed Qwen layout candidate with 0 collisions');

    // ----------------------------------------------------
    // TEST 6: Multi-User Isolation & Cache Behavior
    // ----------------------------------------------------
    console.log('\n--- [Test 6] Multi-User Isolation & Cache Consistency ---');
    assert.strictEqual(fullLayout.fromCache, false, 'First layout computed fresh');

    // Second call for testUserA -> Cache HIT (preventing second AI call)
    const cachedLayoutA = await getOrComputeLayoutAsync(testUserA);
    assert.strictEqual(cachedLayoutA.fromCache, true, 'Second call must hit cache (no AI re-call)');

    // Call for testUserB -> Cache MISS (Multi-user isolation)
    invalidateUserLayoutCache(testUserB);
    const layoutB = await getOrComputeLayoutAsync(testUserB);
    assert.strictEqual(layoutB.hostUserId, testUserB, 'Layout must be scoped to User B');
    assert.strictEqual(layoutB.fromCache, false, 'User B must not use User A cache entry');
    console.log('✅ Cache prevents unnecessary AI calls; multi-user isolation strictly verified');

  } finally {
    if (agentProcess) {
      agentProcess.kill();
    }
  }

  // ----------------------------------------------------
  // TEST 7: Validation Boundary & Fallback Scenarios
  // ----------------------------------------------------
  console.log('\n--- [Test 7] Validation Robustness & Fallback Suite ---');

  // Helper HTTP mock server to test malicious/invalid Colab responses
  let mockServerPort = 9055;
  let mockResponseBody: any = {};
  let mockStatusCode = 200;
  let mockDelayMs = 0;

  const mockServer = http.createServer((req, res) => {
    if (mockDelayMs > 0) {
      setTimeout(() => {
        res.writeHead(mockStatusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockResponseBody));
      }, mockDelayMs);
    } else {
      res.writeHead(mockStatusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockResponseBody));
    }
  });

  await new Promise<void>(resolve => mockServer.listen(mockServerPort, resolve));
  process.env.REMOTE_AGENT_URL = `http://127.0.0.1:${mockServerPort}`;

  try {
    const testSummary = createAiSafeGraphSummary(testUserA);

    // 7A: Unsupported strategy
    mockResponseBody = {
      layoutStrategy: 'unsupported_hallucinated_strategy',
      parameters: { repulsion: 1.0, springLength: 1.0 },
    };
    const resUnsupported = await requestRemoteAgentLayout(testUserA, testSummary);
    assert.strictEqual(resUnsupported, null, 'Unsupported strategy must be rejected');
    console.log('✅ Unsupported strategy rejected -> Returns null for fallback');

    // 7B: Invalid numeric parameters (NaN / Infinity / Non-numeric)
    mockResponseBody = {
      layoutStrategy: 'force_directed',
      parameters: { repulsion: 'invalid_string', springLength: NaN },
    };
    const resInvalidNum = await requestRemoteAgentLayout(testUserA, testSummary);
    assert.strictEqual(resInvalidNum, null, 'NaN/String parameter must be rejected');
    console.log('✅ Invalid numeric parameters rejected -> Returns null for fallback');

    // 7C: Malformed JSON or AI error response
    mockResponseBody = { success: false, error: 'Model out of memory' };
    const resAiError = await requestRemoteAgentLayout(testUserA, testSummary);
    assert.strictEqual(resAiError, null, 'AI error response must return null');
    console.log('✅ AI error payload handled safely -> Returns null for fallback');

    // 7D: Timeout enforcement
    mockDelayMs = 400;
    process.env.REMOTE_AGENT_TIMEOUT_MS = '50'; // 50ms timeout
    const resTimeout = await requestRemoteAgentLayout(testUserA, testSummary);
    assert.strictEqual(resTimeout, null, 'Timeout must cleanly return null');
    console.log('✅ Timeout enforcement verified -> Returns null for fallback');

    // 7E: End-to-end Classical Fallback Execution
    invalidateUserLayoutCache(testUserA);
    delete process.env.REMOTE_AGENT_URL;
    const fallbackLayout = await getOrComputeLayoutAsync(testUserA);
    assert.ok(fallbackLayout);
    assert.strictEqual(fallbackLayout.strategyUsed.source, 'DETERMINISTIC_HEURISTIC');
    assert.strictEqual(fallbackLayout.qualityMetrics.overlapCount, 0);
    console.log('✅ End-to-end classical fallback successfully executed with 0 collisions');

  } finally {
    mockServer.close();
  }

  console.log('\n=============================================');
  console.log('🎉 ALL INTEGRATION & VERIFICATION TESTS PASSED!');
  console.log('=============================================\n');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
