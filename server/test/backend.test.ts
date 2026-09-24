import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// STRICT DATABASE ISOLATION:
// Set test database path before loading any database-dependent modules
process.env.DATABASE_PATH = path.resolve(__dirname, '../data/test.db');

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
  const { user: createdUser, token } = signup('Test Subject', testUsername, testEmail, 'securePass123');
  assert(createdUser.username === testUsername, 'User signup creates valid account');
  assert(Boolean(token && token.length > 20), 'Signup returns signed JWT');

  const { user: loggedInUser } = login(testUsername, 'securePass123');
  assert(loggedInUser.id === createdUser.id, 'User login succeeds with correct credentials');

  let failedAuth = false;
  try {
    login(testUsername, 'wrongPassword');
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

  console.log('\n=============================================');
  console.log('🎉 ALL BACKEND VERIFICATION TESTS PASSED!');
  console.log('=============================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
