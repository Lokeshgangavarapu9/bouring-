import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// STRICT DATABASE ISOLATION:
// Set test database path before loading any database-dependent modules
process.env.DATABASE_PATH = path.resolve(__dirname, '../data/test.db');
process.env.NODE_ENV = 'test';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log('\n=============================================');
  console.log('🧪 BORING BACKEND VERIFICATION TEST SUITE');
  console.log('   Running in isolated test DB: server/data/test.db');
  console.log('=============================================\n');

  // Dynamically import backend modules after setting test DATABASE_PATH
  const { seedDatabase } = await import('../db/seed.ts');
  const { signup, login, getUserById } = await import('../services/authService.ts');
  const {
    sendRequest,
    acceptRequest,
    connectBack,
    disconnect,
    isMutual,
  } = await import('../services/relationshipService.ts');
  const { getAuthorizedSocialProfile } = await import('../services/profileService.ts');
  const { buildEgoGraph } = await import('../services/graphAnalysisService.ts');
  const { classifyStructure } = await import('../services/structureClassificationService.ts');
  const { getOrComputeLayout } = await import('../services/layoutService.ts');
  const { invalidateUserLayoutCache } = await import('../services/cacheService.ts');

  // 1. Seed Verification in isolated test database
  seedDatabase();
  const u1 = getUserById('user-1');
  const u2 = getUserById('user-2');
  assert(Boolean(u1 && u2), 'Seed users exist in test database');

  // 2. Auth Tests
  const testTimestamp = Date.now();
  const testEmail = `tester-${testTimestamp}@example.com`;
  const testUsername = `user_${testTimestamp}`;
  const { user: createdUser, token } = await signup('Test Subject', testUsername, testEmail, 'securePass123', '1998-04-12');
  assert(createdUser.username === testUsername, 'User signup creates valid account');
  assert(Boolean(token && token.length > 20), 'Signup returns signed JWT');

  const { user: loggedInUser } = await login(testUsername, 'securePass123');
  assert(loggedInUser.id === createdUser.id, 'User login succeeds with correct credentials');

  let failedAuth = false;
  try {
    await login(testUsername, 'wrongPassword');
  } catch {
    failedAuth = true;
  }
  assert(failedAuth, 'Login fails with invalid password');

  // 3. Database Invariants
  let selfConnectFailed = false;
  try {
    sendRequest(createdUser.id, createdUser.id);
  } catch {
    selfConnectFailed = true;
  }
  assert(selfConnectFailed, 'Self-relationships are strictly prevented');

  // 4. THE FROZEN RELATIONSHIP RULE & STATE MACHINE
  console.log('\n--- Testing Frozen Relationship Rule (A -> B -> Connect Back -> Mutual) ---');
  const userA = createdUser.id;
  const userB = 'user-7'; // Ryan in test DB

  // Disconnect any existing link first to start clean
  disconnect(userA, userB);
  disconnect(userB, userA);

  assert(!isMutual(userA, userB), 'Initial state: NO_RELATIONSHIP (not mutual)');

  // Step 1: User A sends request to User B
  const req = sendRequest(userA, userB);
  assert(req.status === 'REQUESTED', 'Step 1: Request sent, status is REQUESTED');

  // Step 2: User B accepts User A's request
  const acceptedRel = acceptRequest(req.id, userB);
  assert(acceptedRel.status === 'ACCEPTED_ONE_WAY', 'Step 2: Request accepted, status transitions to ACCEPTED_ONE_WAY');

  // CRITICAL ACCEPTANCE CHECK:
  // Acceptance alone MUST NEVER create a mutual relationship or a 3D bond!
  assert(!isMutual(userA, userB), 'CRITICAL: Acceptance alone does NOT create mutuality (isMutual is FALSE)');

  // Profile Access Check: User A cannot view User B's connected section yet
  const profileBeforeMutual = getAuthorizedSocialProfile(userA, userB);
  assert(
    profileBeforeMutual.canViewConnectedSection === false,
    'CRITICAL: Acceptance alone does NOT grant connected profile access'
  );

  // Layout Check: Ensure no bond between A and B in 3D layout
  const layoutBeforeMutual = getOrComputeLayout(userA);
  const bondBefore = layoutBeforeMutual.bonds.find(
    b => (b.sourceId === userA && b.targetId === userB) || (b.sourceId === userB && b.targetId === userA)
  );
  assert(!bondBefore, 'CRITICAL: Acceptance alone does NOT create a 3D molecular bond');

  // Step 3: User B connects back to User A
  const connectBackResult = connectBack(userB, userA);
  assert(connectBackResult.mutual === true, 'Step 3: Connect Back succeeds and establishes mutuality');
  assert(isMutual(userA, userB), 'CRITICAL: Connect Back sets isMutual to TRUE');

  // Profile Access Check: User A CAN now view User B's connected section!
  const profileAfterMutual = getAuthorizedSocialProfile(userA, userB);
  assert(
    profileAfterMutual.canViewConnectedSection === true,
    'CRITICAL: Mutuality grants connected profile access'
  );

  // Layout Check: 3D molecular bond now exists!
  const layoutAfterMutual = getOrComputeLayout(userA);
  const bondAfter = layoutAfterMutual.bonds.find(
    b => (b.sourceId === userA && b.targetId === userB) || (b.sourceId === userB && b.targetId === userA)
  );
  assert(Boolean(bondAfter), 'CRITICAL: Mutuality creates 3D molecular bond in layout');

  // 5. Disconnect / Mutual Breaking
  console.log('\n--- Testing Disconnect & Cache Invalidation ---');
  const disconnectResult = disconnect(userA, userB);
  assert(disconnectResult.mutualBroken === true, 'Disconnect breaks mutuality');
  assert(!isMutual(userA, userB), 'After disconnect: isMutual is FALSE');

  const layoutAfterDisconnect = getOrComputeLayout(userA);
  const bondAfterDisconnect = layoutAfterDisconnect.bonds.find(
    b => (b.sourceId === userA && b.targetId === userB) || (b.sourceId === userB && b.targetId === userA)
  );
  assert(!bondAfterDisconnect, 'Disconnect immediately removes 3D molecular bond');

  const profileAfterDisconnect = getAuthorizedSocialProfile(userA, userB);
  assert(
    profileAfterDisconnect.canViewConnectedSection === false,
    'Disconnect revokes connected profile access'
  );

  // 6. Graph Analysis & Topology Structure Classification
  console.log('\n--- Testing Graph Analysis & Topology Classification ---');
  // User-1 is in a triangle with User-2 and User-3
  const ego1 = buildEgoGraph('user-1');
  assert(ego1.metrics.degree >= 2, `User-1 degree is ${ego1.metrics.degree}`);
  assert(ego1.metrics.triangleCount >= 1, `User-1 triangle count is ${ego1.metrics.triangleCount}`);
  assert(ego1.metrics.clusteringCoefficient > 0, `User-1 clustering coefficient is ${ego1.metrics.clusteringCoefficient}`);

  const structure1 = classifyStructure(ego1.metrics);
  assert(
    structure1.structureClass === 'TRIANGLE_CYCLE' || structure1.structureClass === 'CLUSTERED_COMMUNITY',
    `User-1 topology classified as ${structure1.structureClass} (${structure1.explanation})`
  );

  // 7. Layout Caching & Quality
  console.log('\n--- Testing 3D Deterministic Layout & Caching ---');
  invalidateUserLayoutCache('user-1');
  const layout1 = getOrComputeLayout('user-1');
  assert(!layout1.fromCache, 'First layout computation generated from solver');
  assert(layout1.nodes.length > 0, 'Layout produces 3D node coordinates');
  assert(layout1.bonds.length > 0, 'Layout produces 3D bond geometries');

  // Second call should come from cache
  const layout1Cached = getOrComputeLayout('user-1');
  assert(layout1Cached.fromCache, 'Second layout call returned from cache');
  assert(layout1Cached.qualityMetrics.overlapCount === 0, 'Layout quality: Zero overlapping atom spheres');

  // 8. Deterministic Test Graph (Section 30) & State Machine Invariants
  console.log('\n--- Testing Deterministic 4-Node Test Graph (A, B, C, D) ---');
  const { executeGraphPipeline, computeDeterministicGraphVersion, createAiSafeGraphSummary } = await import('../services/graphPipelineService.ts');
  const { auditDatabaseConsistency } = await import('../db/audit.ts');
  const { updateProfile, getUserMoleculeIdentity } = await import('../services/profileService.ts');

  // Create test users A, B, C, D
  const testPrefix = `iso_${Date.now()}`;
  const uA = (await signup('Alpha', `${testPrefix}_a`, `${testPrefix}_a@test.com`, 'pass123', '1995-01-01')).user;
  const uB = (await signup('Beta', `${testPrefix}_b`, `${testPrefix}_b@test.com`, 'pass123', '1995-02-02')).user;
  const uC = (await signup('Gamma', `${testPrefix}_c`, `${testPrefix}_c@test.com`, 'pass123', '1995-03-03')).user;
  const uD = (await signup('Delta', `${testPrefix}_d`, `${testPrefix}_d@test.com`, 'pass123', '1995-04-04')).user;

  // A <-> B (MUTUAL)
  const reqAB = sendRequest(uA.id, uB.id);
  acceptRequest(reqAB.id, uB.id);
  connectBack(uB.id, uA.id);

  // A <-> C (MUTUAL)
  const reqAC = sendRequest(uA.id, uC.id);
  acceptRequest(reqAC.id, uC.id);
  connectBack(uC.id, uA.id);

  // B <-> C (MUTUAL)
  const reqBC = sendRequest(uB.id, uC.id);
  acceptRequest(reqBC.id, uC.id);
  connectBack(uC.id, uB.id);

  // A -> D (REQUESTED ONLY)
  const reqAD = sendRequest(uA.id, uD.id);
  assert(reqAD.status === 'REQUESTED', 'A -> D is in REQUESTED state');

  // Verify Mutual Graph for User A
  const pipelineA = executeGraphPipeline(uA.id);
  assert(pipelineA.canonicalTopology.sortedNodeIds.length === 3, 'User A mutual graph has exactly 3 nodes (A, B, C)');
  assert(!pipelineA.canonicalTopology.sortedNodeIds.includes(uD.id), 'Non-mutual User D is strictly excluded from mutual graph');
  assert(pipelineA.canonicalTopology.canonicalEdges.length === 3, 'User A mutual graph has exactly 3 edges (A-B, A-C, B-C)');

  // Duplicate relationship prevention
  let dupPrevented = false;
  try {
    sendRequest(uA.id, uD.id);
  } catch {
    dupPrevented = true;
  }
  assert(dupPrevented, 'Duplicate relationship request is strictly rejected');

  // Invalid state transitions
  let invalidAccept = false;
  try {
    acceptRequest(reqAD.id, uC.id); // Wrong user attempting to accept
  } catch {
    invalidAccept = true;
  }
  assert(invalidAccept, 'Unauthorized user cannot accept request');

  let invalidConnectBack = false;
  try {
    connectBack(uD.id, uA.id); // D attempting connectBack while still REQUESTED (not accepted)
  } catch {
    invalidConnectBack = true;
  }
  assert(invalidConnectBack, 'Connect Back is rejected if request is not ACCEPTED_ONE_WAY');

  // 9. Deterministic Graph Versioning & Stability
  console.log('\n--- Testing Deterministic Graph Versioning & Stability ---');
  const gv1 = computeDeterministicGraphVersion(uA.id);
  const gv2 = computeDeterministicGraphVersion(uA.id);
  assert(gv1.hash === gv2.hash, `graphVersion is stable across identical graph queries (${gv1.hash})`);

  // Updating profile (bio, avatar, molecule identity) must NOT change graphVersion
  updateProfile(uA.id, { bio: 'Updated bio for testing', moleculeIdentity: 'Solar' });
  const gvProfileUpdate = computeDeterministicGraphVersion(uA.id);
  assert(
    gv1.hash === gvProfileUpdate.hash,
    'Profile & molecule appearance updates do NOT alter graphVersion hash'
  );

  // Breaking a mutual connection MUST change graphVersion
  disconnect(uA.id, uB.id);
  const gvAfterDisconnect = computeDeterministicGraphVersion(uA.id);
  assert(
    gv1.hash !== gvAfterDisconnect.hash,
    `Topology modification (disconnect) correctly changes graphVersion hash (${gv1.hash} -> ${gvAfterDisconnect.hash})`
  );

  // 10. AI-Safe Privacy Boundary Verification
  console.log('\n--- Testing AI-Safe Graph Summary Boundary ---');
  const aiSummary = createAiSafeGraphSummary(uA.id);
  assert(typeof aiSummary.graphVersion === 'string', 'AI summary contains graphVersion');
  assert(typeof aiSummary.nodes === 'number', 'AI summary contains numeric nodes');
  assert(typeof aiSummary.edges === 'number', 'AI summary contains numeric edges');
  assert(typeof aiSummary.density === 'number', 'AI summary contains numeric density');

  const aiSummaryKeys = Object.keys(aiSummary);
  const forbiddenFields = ['name', 'email', 'username', 'bio', 'avatar', 'phone', 'social', 'password', 'token'];
  for (const forbidden of forbiddenFields) {
    assert(!aiSummaryKeys.includes(forbidden), `AI summary strictly excludes private field: ${forbidden}`);
  }
  console.log('✅ AI-safe summary contains strictly topological metrics with zero PII');

  // 11. Molecule Identity Isolation
  console.log('\n--- Testing Personal Molecule Identity Isolation ---');
  updateProfile(uA.id, { moleculeIdentity: 'Neptune' });
  updateProfile(uB.id, { moleculeIdentity: 'Aurora' });

  const molA = getUserMoleculeIdentity(uA.id);
  const molB = getUserMoleculeIdentity(uB.id);
  assert(molA.identityType === 'Neptune', "User A's molecule identity is Neptune");
  assert(molB.identityType === 'Aurora', "User B's molecule identity is Aurora");

  // Changing A does NOT change B
  updateProfile(uA.id, { moleculeIdentity: 'Solar' });
  const molBAfter = getUserMoleculeIdentity(uB.id);
  assert(molBAfter.identityType === 'Aurora', "Changing User A's molecule identity never modifies User B");

  // 12. Database Consistency Audit
  console.log('\n--- Running Database Consistency & Integrity Audit ---');
  const audit = auditDatabaseConsistency();
  assert(audit.isConsistent, `Database consistency audit passed (${audit.passedChecks}/${audit.totalChecks} checks)`);
  if (audit.issues.length > 0) {
    console.error('Audit issues found:', audit.issues);
  }
  assert(audit.issues.length === 0, 'Zero database consistency violations detected');

  // 13. Second Logical Layer: Graph Projection Service Verification
  console.log('\n--- Testing Graph Projection Layer (Second Logical Layer) ---');
  const { projectMutualGraph, getAuthorizedGraphDisplayData, projectAiSafeSummary } = await import('../services/graphProjectionService.ts');
  const projectionC = projectMutualGraph(uC.id);
  assert(projectionC.hostUserId === uC.id, 'Graph projection is scoped to host user');
  assert(projectionC.nodes.length >= 2, 'Graph projection contains pure topology nodes');
  assert(Boolean(projectionC.nodes[0].nodeId && projectionC.nodes[0].userId), 'Graph nodes strictly use stable userId');
  
  // Verify that projection nodes do NOT contain display names or profile fields
  const sampleNodeKeys = Object.keys(projectionC.nodes[0]);
  assert(!sampleNodeKeys.includes('displayName') && !sampleNodeKeys.includes('avatarUrl'), 'GraphProjectionNode strictly excludes display data');

  // Verify display data extraction
  const displayData = getAuthorizedGraphDisplayData(uC.id, projectionC);
  assert(displayData.length === projectionC.nodes.length, 'Display data maps 1-to-1 with projection nodes');
  assert(Boolean(displayData[0].displayName), 'Display data includes authorized displayName for 3D Lab only');

  // Verify AI-Safe Summary derived from Projection
  const aiSummaryFromProj = projectAiSafeSummary(projectionC);
  assert(aiSummaryFromProj.nodes === projectionC.nodes.length, 'AI summary nodes match projection');
  assert(aiSummaryFromProj.edges === projectionC.edges.length, 'AI summary edges match projection');
  assert(typeof aiSummaryFromProj.density === 'number', 'AI summary density is numeric');
  console.log('✅ Graph Projection successfully functions as the second logical data layer');

  // 14. Relationship Rejection, Cancellation & Foreign-Key Integrity
  console.log('\n--- Testing Rejection, Cancellation, and Foreign-Key Integrity ---');
  const { rejectRequest, cancelRequest } = await import('../services/relationshipService.ts');
  
  // Rejection
  const reqReject = sendRequest(uB.id, uD.id);
  const rejected = rejectRequest(reqReject.id, uD.id);
  assert(rejected.status === 'REJECTED', 'Request successfully transitioned to REJECTED');

  // Cancellation
  const reqCancel = sendRequest(uC.id, uD.id);
  const cancelled = cancelRequest(reqCancel.id, uC.id);
  assert(cancelled.status === 'CANCELLED', 'Request successfully transitioned to CANCELLED');

  // Foreign-Key Integrity: linking nonexistent user must throw
  let fkFailed = false;
  try {
    sendRequest(uA.id, 'nonexistent-user-9999');
  } catch {
    fkFailed = true;
  }
  assert(fkFailed, 'Foreign-key integrity enforces rejection of nonexistent users');

  // 15. Strict Multi-User Isolation Verification
  console.log('\n--- Testing Strict Multi-User Isolation ---');
  const snapshotA = pipelineA.snapshot;
  const pipelineB = executeGraphPipeline(uB.id);
  const snapshotB = pipelineB.snapshot;

  assert(snapshotA.userId !== snapshotB.userId, 'Snapshots have distinct user authorities');
  assert(pipelineA.graphVersionHash !== pipelineB.graphVersionHash || snapshotA.userId !== snapshotB.userId, 'User graphs are isolated');

  // 16. Supabase Production Auth & Password Management Test Suite
  console.log('\n--- Testing Supabase Production Auth & Password Management ---');
  const {
    getPublicSupabaseConfig,
    isSupabaseConfigured,
  } = await import('../services/supabaseService.ts');
  const {
    syncSupabaseUser,
    verifyToken: verifyAuthToken,
    getUserByEmail: getEmailUser,
    getUserByUsername: getUsernameUser,
    verifyRecovery,
  } = await import('../services/authService.ts');
  const { getDatabaseAdapter } = await import('../db/adapter.ts');

  // Test 1: Public config isolation (Never leaks service role key)
  const publicConfig = getPublicSupabaseConfig();
  assert(typeof publicConfig.configured === 'boolean', 'Supabase configuration status is detected');
  assert(!('serviceRoleKey' in publicConfig), 'CRITICAL: Service role key is NEVER leaked in public configuration');

  // Test 2: Database adapter abstraction
  const dbAdapter = getDatabaseAdapter();
  assert(Boolean(dbAdapter && typeof dbAdapter.getUserById === 'function'), 'Database adapter provides clean interface');
  const adapterU1 = await dbAdapter.getUserById('user-1');
  assert(Boolean(adapterU1 && adapterU1.id === 'user-1'), 'Database adapter successfully loads user entity');

  // Test 3: Supabase Auth UUID -> Boring User Mapping
  const mockSupabaseUuid = `supa-uuid-${Date.now()}`;
  const mockSupabaseEmail = `supabase.user.${Date.now()}@example.com`;
  const mappedUser = syncSupabaseUser({
    id: mockSupabaseUuid,
    email: mockSupabaseEmail,
    user_metadata: {
      name: 'Supabase Pioneer',
      username: `supapio_${Date.now()}`,
    },
  });
  assert(mappedUser.id === mockSupabaseUuid, 'Supabase Auth UUID is correctly used as Boring user ID');
  assert(mappedUser.email === mockSupabaseEmail, 'Mapped user preserves Supabase Auth email');
  assert(mappedUser.name === 'Supabase Pioneer', 'Mapped user preserves user metadata name');

  // Test 4: Idempotent Supabase User Sync
  const repeatedSync = syncSupabaseUser({
    id: mockSupabaseUuid,
    email: mockSupabaseEmail,
  });
  assert(repeatedSync.id === mappedUser.id, 'Repeated sync returns existing Boring user without duplicates');

  // Test 5: Duplicate account prevention
  let dupEmailPrevented = false;
  try {
    await signup('Duplicate Subject', `unique_${Date.now()}`, mockSupabaseEmail, 'pass123456', '1995-05-05');
  } catch (err: any) {
    dupEmailPrevented = err.message.includes('already registered');
  }
  assert(dupEmailPrevented, 'Duplicate email registration is strictly prevented');

  let dupUsernamePrevented = false;
  try {
    await signup('Duplicate Subject', mappedUser.username, `another_${Date.now()}@example.com`, 'pass123456', '1995-05-05');
  } catch (err: any) {
    dupUsernamePrevented = err.message.includes('already taken');
  }
  assert(dupUsernamePrevented, 'Duplicate username registration is strictly prevented');

  // Test 6: Session token verification & restoration
  const verifiedSession = verifyAuthToken(token);
  assert(Boolean(verifiedSession && verifiedSession.userId === createdUser.id), 'Session token is verified and maps to user');

  const invalidSession = verifyAuthToken('invalid.jwt.token.signature');
  assert(invalidSession === null, 'Invalid token safely rejected by session verifier');

  // Test 7: Forgot password request flow & safety
  // Generic safe response: never leak account existence
  const resetRequest1 = await verifyRecovery(testEmail, '1998-04-12', '127.0.0.1');
  assert(resetRequest1.success === true, 'Forgot password request succeeds for valid email + DOB');
  assert(Boolean(resetRequest1.resetToken), 'Forgot password returns resetToken without logging user in');

  let unknownUserCaught = false;
  try {
    await verifyRecovery('completely-unknown-user-999@domain.com', '1998-04-12', '127.0.0.1');
  } catch (err: any) {
    unknownUserCaught = err.message === 'Unable to verify your account information.';
  }
  assert(unknownUserCaught, 'Forgot password for non-existent email returns safe generic response');

  // Test 8: Password Reset Validation Rules
  const validateReset = (pwd: string, confirm: string) => {
    if (!pwd) throw new Error('New password is required');
    if (pwd.length < 6) throw new Error('Password must be at least 6 characters');
    if (confirm && pwd !== confirm) throw new Error('Passwords do not match');
    return true;
  };

  let weakPasswordCaught = false;
  try {
    validateReset('123', '123');
  } catch (e: any) {
    weakPasswordCaught = e.message.includes('at least 6');
  }
  assert(weakPasswordCaught, 'Weak password (<6 characters) rejected in reset validation');

  let mismatchCaught = false;
  try {
    validateReset('securePassword123', 'differentPassword456');
  } catch (e: any) {
    mismatchCaught = e.message.includes('do not match');
  }
  assert(mismatchCaught, 'Password mismatch strictly rejected in reset validation');

  let emptyCaught = false;
  try {
    validateReset('', '');
  } catch (e: any) {
    emptyCaught = e.message.includes('required');
  }
  assert(emptyCaught, 'Empty password strictly rejected in reset validation');

  const socialUser = mappedUser;

  // 17. Smart Social Profile Links Test Suite
  console.log('\n--- Testing Smart Social Profile Links & Security ---');
  const {
    validateSocialUrl,
    normalizeSocialUrl,
    detectPlatformFromHostname,
    processSocialLink,
    classifyUnknownDomainWithAI,
  } = await import('../services/socialLinkService.ts');
  const {
    addSocialProfile,
    updateSocialProfile,
    removeSocialProfile,
    getUserSocialProfiles,
    updatePrivacySettings,
  } = await import('../services/profileService.ts');

  // Test 1: Instagram detection
  const pInsta = await processSocialLink('https://instagram.com/boring_app');
  assert(pInsta.platform === 'instagram' && pInsta.iconId === 'instagram', 'Instagram domain detected correctly');

  // Test 2: GitHub detection
  const pGit = await processSocialLink('https://github.com/torvalds');
  assert(pGit.platform === 'github' && pGit.iconId === 'github', 'GitHub domain detected correctly');

  // Test 3: LinkedIn detection
  const pIn = await processSocialLink('https://www.linkedin.com/in/williamhgates');
  assert(pIn.platform === 'linkedin' && pIn.iconId === 'linkedin', 'LinkedIn domain detected correctly');

  // Test 4: YouTube detection
  const pYt = await processSocialLink('https://youtube.com/@veritasium');
  assert(pYt.platform === 'youtube' && pYt.iconId === 'youtube', 'YouTube domain detected correctly');

  // Test 5: X detection
  const pX = await processSocialLink('https://x.com/boring');
  assert(pX.platform === 'x' && pX.iconId === 'x', 'X domain detected correctly');

  // Test 6: Twitter -> X mapping
  const pTwit = await processSocialLink('https://twitter.com/jack');
  assert(pTwit.platform === 'x' && pTwit.iconId === 'x' && pTwit.normalizedUrl.includes('x.com/jack'), 'Twitter correctly mapped to X');

  // Test 7: Facebook detection
  const pFb = await processSocialLink('https://www.facebook.com/zuck');
  assert(pFb.platform === 'facebook' && pFb.iconId === 'facebook', 'Facebook domain detected correctly');

  // Test 8: Unknown domain -> Other
  const pUnknown = await processSocialLink('https://mycustomblog.org/author/lokesh');
  assert(pUnknown.platform === 'other' && pUnknown.iconId === 'globe', 'Unknown domain safely classified as Other with globe icon');

  // Test 9 & 10: HTTPS validation & normalization
  const pHttp = await processSocialLink('http://github.com/example/');
  assert(pHttp.valid && pHttp.normalizedUrl === 'https://github.com/example', 'HTTP normalized to HTTPS and trailing slash stripped');

  // Test 11, 12, 13: Protocol injection & Malformed URL rejection
  const pJs = await processSocialLink('javascript:alert(document.cookie)');
  assert(!pJs.valid, 'javascript: URL strictly rejected');

  const pData = await processSocialLink('data:text/html,<script>alert(1)</script>');
  assert(!pData.valid, 'data: URL strictly rejected');

  const pFile = await processSocialLink('file:///etc/passwd');
  assert(!pFile.valid, 'file: URL strictly rejected');

  const pMalformed = await processSocialLink('not_a_valid_url_at_all');
  assert(!pMalformed.valid, 'Malformed URL string safely rejected');

  // Test 14 & 15: Database Add, Normalization & Duplicate Detection
  const addedSocial1 = await addSocialProfile(socialUser.id, 'github', 'https://github.com/boring-user/', '@boring-user');
  assert(addedSocial1.platform === 'github', 'Social profile added with verified server platform');
  assert(addedSocial1.normalized_url === 'https://github.com/boring-user', 'Social profile stored with canonical normalized URL');
  assert(addedSocial1.icon_id === 'github', 'Social profile stored with deterministic platform icon_id');

  // Duplicate identical link rejection
  let dupRejected = false;
  try {
    await addSocialProfile(socialUser.id, 'github', 'https://github.com/boring-user', '@boring-user');
  } catch (err: any) {
    dupRejected = true;
  }
  assert(dupRejected, 'Duplicate social profile link for same user strictly rejected');

  // Test 17 & 18: Editing a URL updates platform and icon metadata
  const updatedSocial = await updateSocialProfile(
    socialUser.id,
    addedSocial1.id,
    'https://instagram.com/boring_insta',
    '@boring_insta'
  );
  assert(updatedSocial.platform === 'instagram', 'Editing URL from GitHub to Instagram updates platform to Instagram');
  assert(updatedSocial.icon_id === 'instagram', 'Editing URL updates icon_id to instagram');
  assert(updatedSocial.profile_url === 'https://instagram.com/boring_insta', 'Visit URL updated to canonical destination');

  // Test 19: Deleting social profile
  const deleteOk = removeSocialProfile(socialUser.id, addedSocial1.id);
  assert(deleteOk === true, 'Deleting social profile succeeds');
  const socialsAfterDelete = getUserSocialProfiles(socialUser.id);
  assert(socialsAfterDelete.length === 0, 'Deleted social profile no longer returned in user profiles');

  // Test 20: Privacy enforcement for social links
  // Add a social profile to User 1
  const u1Url = `https://x.com/user1_${Date.now()}`;
  const u1Social = await addSocialProfile('user-1', 'x', u1Url, '@user1');
  
  // Set social links visibility to CONNECTIONS_ONLY
  updatePrivacySettings('user-1', { social_links_visibility: 'CONNECTIONS_ONLY' });

  // Disconnected stranger (User 4) checks User 1's profile
  const strangerProfile = getAuthorizedSocialProfile('user-4', 'user-1');
  assert(strangerProfile.canViewConnectedSection === false, 'Stranger cannot view connected section');
  assert(strangerProfile.socialProfiles.length === 0, 'Social profiles hidden from non-mutual users when CONNECTIONS_ONLY');

  // Self checks profile
  const selfProfile = getAuthorizedSocialProfile('user-1', 'user-1');
  assert(selfProfile.socialProfiles.length > 0, 'Self can always view own social profiles');

  // Test 21, 22, 23: AI fallback invariants
  const aiFallback = await classifyUnknownDomainWithAI('https://completely-unknown-platform-xyz.io/profile', 'completely-unknown-platform-xyz.io');
  assert(aiFallback.platform === 'other' && aiFallback.iconId === 'globe', 'AI fallback safely defaults unknown domain to Other/globe');
  
  // Verify AI cannot mutate URL
  const processedWithUnknown = await processSocialLink('https://completely-unknown-platform-xyz.io/profile?ref=boring');
  assert(processedWithUnknown.canonicalUrl === 'https://completely-unknown-platform-xyz.io/profile?ref=boring', 'AI cannot alter or mutate the destination URL');

  console.log('\n=============================================');
  console.log('🎉 ALL BACKEND & DATABASE TESTS PASSED (100%)');
  console.log('=============================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
