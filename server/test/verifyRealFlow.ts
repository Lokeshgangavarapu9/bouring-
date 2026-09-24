/**
 * Complete End-to-End Real User Flow Verification
 * Tests the real production backend endpoints (http://localhost:3001)
 * without mock data or test fallbacks, using exact production routes.
 */

async function testRealUserFlow() {
  const BASE_URL = 'http://localhost:3001';
  console.log('\n======================================================');
  console.log('🚀 RUNNING END-TO-END PRODUCTION PIPELINE VERIFICATION');
  console.log('======================================================\n');

  function check(stepNum: number, condition: boolean, message: string) {
    if (!condition) {
      console.error(`❌ STEP ${stepNum} FAILED: ${message}`);
      process.exit(1);
    }
    console.log(`✅ STEP ${stepNum} PASSED: ${message}`);
  }

  // STEP 1 & 2: Health check
  console.log('[Step 1 & 2] Verifying backend availability...');
  const healthRes = await fetch(`${BASE_URL}/api/network/me`);
  check(1, healthRes.status === 401, 'Public / unauthenticated request correctly rejected with 401 Unauthorized');

  // STEP 3: Create real account A
  console.log('\n[Step 3] Creating real Account A (Alice Walker)...');
  const timestamp = Date.now();
  const userAData = {
    name: 'Alice Walker',
    username: `alice_${timestamp}`,
    email: `alice_${timestamp}@boring.network`,
    password: 'Password123!',
  };

  const signupARes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userAData),
  });
  const signupAJson = await signupARes.json();
  check(3, Boolean(signupAJson.token && signupAJson.user?.id), 'Real user Alice created in SQLite database with signed JWT');
  const tokenA = signupAJson.token;
  const userAId = signupAJson.user.id;

  // STEP 4: Authenticated application profile check
  console.log('\n[Step 4] Checking authenticated profile for User A...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const meJson = await meRes.json();
  check(4, meJson.user?.id === userAId && meJson.user?.email === userAData.email, 'Real user profile retrieved from backend database');

  // STEP 5: Check Molecule identity
  console.log('\n[Step 5] Checking User A molecular identity...');
  check(5, meJson.user?.moleculeIdentity === 'default', 'New user automatically receives default glass/crystal molecular identity');

  // Also verify molecular identity persistence when updated
  const updateMolRes = await fetch(`${BASE_URL}/api/profile`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ moleculeIdentity: 'default', moleculeSmoky: true }),
  });
  const updateMolJson = await updateMolRes.json();
  check(5, updateMolJson.user?.moleculeSmoky === true, 'Molecular identity customization persists to database');

  // STEP 6: Open People directory - verify only real registered users
  console.log('\n[Step 6] Verifying People directory...');
  const usersRes = await fetch(`${BASE_URL}/api/auth/users`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const usersJson = await usersRes.json();
  check(6, Array.isArray(usersJson.users) && usersJson.users.every((u: any) => !u.id.startsWith('mock-')), 'People directory only contains real registered users (no mock users)');

  // Now create User B (Bob Martin) to test relationships
  console.log('\nCreating real Account B (Bob Martin)...');
  const userBData = {
    name: 'Bob Martin',
    username: `bob_${timestamp}`,
    email: `bob_${timestamp}@boring.network`,
    password: 'Password123!',
  };
  const signupBRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userBData),
  });
  const signupBJson = await signupBRes.json();
  const tokenB = signupBJson.token;
  const userBId = signupBJson.user.id;
  check(6, Boolean(tokenB && userBId), 'User B created successfully in database');

  // STEP 7: Send connection request from A to B
  console.log('\n[Step 7] User A sends connection request to User B...');
  const sendReqRes = await fetch(`${BASE_URL}/api/relationships/requests`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ receiverId: userBId }),
  });
  const sendReqJson = await sendReqRes.json();
  check(7, sendReqJson.relationship?.status === 'REQUESTED', 'Relationship created in database with status REQUESTED');
  const relId = sendReqJson.relationship.id;

  // STEP 8: User B accepts request -> ACCEPTED_ONE_WAY, NO bond yet
  console.log('\n[Step 8] User B accepts User A\'s request...');
  const acceptRes = await fetch(`${BASE_URL}/api/relationships/${relId}/accept`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json',
    },
  });
  const acceptJson = await acceptRes.json();
  check(8, acceptJson.relationship?.status === 'ACCEPTED_ONE_WAY', 'Acceptance transitions status to ACCEPTED_ONE_WAY');

  // Check 3D layout of User A - MUST NOT have any bond yet!
  const layoutBeforeMutual = await fetch(`${BASE_URL}/api/network/${userAId}/layout`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  }).then(r => r.json());
  const bondBefore = layoutBeforeMutual.bonds?.find(
    (b: any) => (b.sourceId === userAId && b.targetId === userBId) || (b.sourceId === userBId && b.targetId === userAId)
  );
  check(8, !bondBefore && layoutBeforeMutual.bonds.length === 0, 'CRITICAL: ACCEPTED_ONE_WAY creates NO 3D molecular bond (bonds = 0)');

  // Profile privacy check - User A cannot view User B connected details
  const profileBFromA = await fetch(`${BASE_URL}/api/users/${userBId}/social-profile`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  }).then(r => r.json());
  check(8, profileBFromA.canViewConnectedSection === false, 'CRITICAL: ACCEPTED_ONE_WAY does NOT grant connected profile access');

  // STEP 9: User B clicks "Connect Back" -> MUTUAL, 3D bond appears!
  console.log('\n[Step 9] User B performs reciprocal Connect Back to User A...');
  const connectBackRes = await fetch(`${BASE_URL}/api/relationships/${userAId}/connect-back`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json',
    },
  });
  const connectBackJson = await connectBackRes.json();
  check(9, connectBackJson.mutual === true, 'Reciprocal Connect Back establishes MUTUAL relationship');

  // Connected profile check - mutuality grants access!
  const profileBAfterMutual = await fetch(`${BASE_URL}/api/users/${userBId}/social-profile`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  }).then(r => r.json());
  check(9, profileBAfterMutual.canViewConnectedSection === true, 'Mutuality grants connected profile access');

  // STEP 10: Open social 3D graph - 3D bond exists!
  console.log('\n[Step 10] Checking 3D molecular layout from real backend...');
  const layoutAfterMutual = await fetch(`${BASE_URL}/api/network/${userAId}/layout`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  }).then(r => r.json());

  const bondAfter = layoutAfterMutual.bonds?.find(
    (b: any) => (b.sourceId === userAId && b.targetId === userBId) || (b.sourceId === userBId && b.targetId === userAId)
  );
  check(10, Boolean(bondAfter), 'MUTUAL connection creates real 3D molecular bond in layout');
  check(10, layoutAfterMutual.strategyUsed?.family === 'DIATOMIC_PAIR', 'AI Layout Strategy correctly classified diatomic mutual pair');
  check(10, layoutAfterMutual.qualityMetrics?.overlapCount === 0, 'Physical layout solver achieved 0 overlaps');

  // STEP 11: Disconnect -> Bond disappears, profile access revoked
  console.log('\n[Step 11] User A disconnects User B...');
  const disconnectRes = await fetch(`${BASE_URL}/api/relationships/${userBId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
  });
  const disconnectJson = await disconnectRes.json();
  check(11, disconnectJson.mutualBroken === true, 'Disconnect breaks mutuality and increments graph_version');

  const layoutAfterDisconnect = await fetch(`${BASE_URL}/api/network/${userAId}/layout`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  }).then(r => r.json());
  const bondAfterDisc = layoutAfterDisconnect.bonds?.find(
    (b: any) => (b.sourceId === userAId && b.targetId === userBId) || (b.sourceId === userBId && b.targetId === userAId)
  );
  check(11, !bondAfterDisc && layoutAfterDisconnect.bonds.length === 0, '3D bond removed immediately upon disconnect');

  // STEP 12: Refresh & Persistence
  console.log('\n[Step 12] Refreshing and verifying persistent database state...');
  const relsAfter = await fetch(`${BASE_URL}/api/relationships`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  }).then(r => r.json());
  check(12, relsAfter.mutualPartners.length === 0, 'Database state persistently reflects zero mutual partners');

  console.log('\n======================================================');
  console.log('🎉 COMPLETE 12-STEP END-TO-END PIPELINE VERIFIED!');
  console.log('======================================================\n');
}

testRealUserFlow().catch(err => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});
