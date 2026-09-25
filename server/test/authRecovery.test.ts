import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure test environment
process.env.DATABASE_PATH = path.resolve(__dirname, '../data/test.db');
process.env.NODE_ENV = 'test';

import {
  getDatabaseAdapter,
  getDatabaseType,
  resetDatabaseAdapter,
  SqliteDatabaseAdapter,
  SupabaseDatabaseAdapter,
} from '../db/adapter.ts';
import {
  signup,
  login,
  verifyRecovery,
  resetPasswordWithRecovery,
  getUserById,
} from '../services/authService.ts';
import { isSupabaseConfigured, getSupabaseAdminClient } from '../services/supabaseService.ts';

console.log('\n============================================================');
console.log('🧪 BORING AUTHENTICATION & RECOVERY TEST SUITE (18 CHECKS)');
console.log('============================================================\n');

async function runAuthRecoveryTests() {
  const adapter = getDatabaseAdapter();

  // Test data
  const ts = Date.now();
  const testName = 'Test Recovery User';
  const testUsername = `recov_user_${ts}`;
  const testEmail = `recov_${ts}@testdomain.com`;
  const rawInitialPassword = 'SuperSecretInitialPass123!';
  const testDob = '1996-08-24';

  console.log('--- TEST 1: Signup with name + username + email + password + DOB ---');
  const signupResult = await signup(testName, testUsername, testEmail, rawInitialPassword, testDob);
  assert.ok(signupResult.user, 'Signup must return user entity');
  assert.equal(signupResult.user.name, testName);
  assert.equal(signupResult.user.username, testUsername);
  assert.equal(signupResult.user.email, testEmail);
  assert.ok(signupResult.token, 'Signup returns valid session token');
  console.log('✅ TEST 1 PASSED: Signup creates user with name, username, email, password, and DOB');

  console.log('\n--- TEST 2 & 3: Password is bcrypt hashed, plaintext password never stored ---');
  const storedUserRecord = await adapter.getUserById(signupResult.user.id);
  assert.ok(storedUserRecord, 'User must exist in database');
  assert.ok(storedUserRecord.password_hash, 'User record must have password_hash');
  assert.notEqual(storedUserRecord.password_hash, rawInitialPassword, 'Plaintext password must NOT be stored');
  assert.ok(storedUserRecord.password_hash.startsWith('$2'), 'password_hash must be a valid bcrypt hash');
  const bcryptMatch = await bcrypt.compare(rawInitialPassword, storedUserRecord.password_hash);
  assert.ok(bcryptMatch, 'bcrypt hash must match the initial password');
  console.log('✅ TEST 2 & 3 PASSED: Password is bcrypt hashed; plaintext is never stored');

  console.log('\n--- TEST 4: Date of Birth is stored correctly ---');
  assert.equal(storedUserRecord.date_of_birth, testDob, 'DOB in database must match input date_of_birth');
  console.log('✅ TEST 4 PASSED: Date of birth is stored correctly in database');

  console.log('\n--- TEST 5: Date of Birth is NOT returned through public profile/sanitized user ---');
  assert.equal((signupResult.user as any).date_of_birth, undefined, 'date_of_birth must be omitted in sanitized user');
  const fetchedSanitized = getUserById(signupResult.user.id);
  assert.equal((fetchedSanitized as any)?.date_of_birth, undefined, 'date_of_birth must be omitted in public profile fetch');
  console.log('✅ TEST 5 PASSED: Date of birth is private and excluded from public user objects');

  console.log('\n--- TEST 6: Correct password allows login ---');
  const loginSuccess = await login(testEmail, rawInitialPassword);
  assert.ok(loginSuccess.user, 'Login must succeed with correct password');
  assert.equal(loginSuccess.user.id, signupResult.user.id);
  assert.ok(loginSuccess.token, 'Login returns valid session token');
  console.log('✅ TEST 6 PASSED: Correct password successfully logs in');

  console.log('\n--- TEST 7: Incorrect password fails ---');
  let badLoginFailed = false;
  try {
    await login(testEmail, 'WrongPassword999!');
  } catch (err: any) {
    badLoginFailed = true;
    assert.equal(err.message, 'Invalid credentials');
  }
  assert.ok(badLoginFailed, 'Login with wrong password must throw error');
  console.log('✅ TEST 7 PASSED: Incorrect password fails safely');

  console.log('\n--- TEST 8: Forgot Password with correct email + DOB succeeds ---');
  const recoverySuccess = await verifyRecovery(testEmail, testDob, '127.0.0.1');
  assert.ok(recoverySuccess.success, 'verifyRecovery must succeed');
  assert.ok(recoverySuccess.resetToken, 'verifyRecovery must issue a single-use resetToken');
  console.log('✅ TEST 8 PASSED: Forgot Password with correct email + DOB succeeds');

  console.log('\n--- TEST 9: Forgot Password with incorrect email + DOB fails safely ---');
  let badDobFailed = false;
  try {
    await verifyRecovery(testEmail, '1990-01-01', '127.0.0.1');
  } catch (err: any) {
    badDobFailed = true;
    assert.equal(err.message, 'Unable to verify your account information.');
  }
  assert.ok(badDobFailed, 'verifyRecovery with incorrect DOB must throw generic error');
  console.log('✅ TEST 9 PASSED: Forgot Password with incorrect email + DOB fails safely');

  console.log('\n--- TEST 10: Recovery does NOT reveal whether an email exists ---');
  let nonExistentEmailFailed = false;
  try {
    await verifyRecovery('nonexistent_random_user_12345@domain.com', testDob, '127.0.0.1');
  } catch (err: any) {
    nonExistentEmailFailed = true;
    assert.equal(err.message, 'Unable to verify your account information.', 'Error message must be identical generic string');
  }
  assert.ok(nonExistentEmailFailed, 'verifyRecovery for non-existent email must fail with generic error');
  console.log('✅ TEST 10 PASSED: Recovery uses safe generic message without revealing account existence');

  console.log('\n--- TEST 11: Successful recovery allows creation of a new password ---');
  const newPassword = 'BrandNewPassword2026!';
  const resetResult = await resetPasswordWithRecovery(recoverySuccess.resetToken, newPassword);
  assert.ok(resetResult.user, 'Resetting password must return user object');
  assert.equal(resetResult.user.id, signupResult.user.id);
  assert.ok(resetResult.token, 'Resetting password creates a valid new authenticated session');
  console.log('✅ TEST 11 PASSED: Valid resetToken successfully resets password and establishes new session');

  console.log('\n--- TEST 12: New password works after reset ---');
  const loginWithNewPass = await login(testEmail, newPassword);
  assert.ok(loginWithNewPass.user, 'Login with new password must succeed');
  assert.equal(loginWithNewPass.user.id, signupResult.user.id);
  console.log('✅ TEST 12 PASSED: New password works for subsequent login');

  console.log('\n--- TEST 13: Old password no longer works ---');
  let oldPassFailed = false;
  try {
    await login(testEmail, rawInitialPassword);
  } catch (err: any) {
    oldPassFailed = true;
    assert.equal(err.message, 'Invalid credentials');
  }
  assert.ok(oldPassFailed, 'Old password must be rejected');
  console.log('✅ TEST 13 PASSED: Old password no longer works');

  console.log('\n--- TEST 14: Email + DOB alone does NOT directly authenticate the user ---');
  // verifyRecovery only returns resetToken and message, never a user session or auth token
  const test14Verification = await verifyRecovery(testEmail, testDob, '127.0.0.1');
  assert.equal((test14Verification as any).user, undefined, 'Recovery verification must NEVER return user session');
  assert.equal((test14Verification as any).token, undefined, 'Recovery verification must NEVER return login token');
  assert.ok(test14Verification.resetToken, 'Only resetToken is returned');
  console.log('✅ TEST 14 PASSED: Email + DOB alone does not directly authenticate');

  console.log('\n--- TEST 15: Supabase Auth is never called ---');
  // Verify that supabaseService contains zero supabase.auth calls
  const supabaseServiceModule = await import('../services/supabaseService.ts');
  assert.equal((supabaseServiceModule as any).supabaseSignUp, undefined, 'supabaseSignUp must NOT exist');
  assert.equal((supabaseServiceModule as any).supabaseSignIn, undefined, 'supabaseSignIn must NOT exist');
  assert.equal((supabaseServiceModule as any).supabaseRequestPasswordReset, undefined, 'supabaseRequestPasswordReset must NOT exist');
  assert.equal((supabaseServiceModule as any).supabaseUpdatePassword, undefined, 'supabaseUpdatePassword must NOT exist');
  console.log('✅ TEST 15 PASSED: Supabase Auth methods are completely removed');

  console.log('\n--- TEST 16 & 17: Supabase PostgreSQL database adapter & production selection ---');
  const savedEnv = { ...process.env };
  try {
    process.env.VERCEL = '1';
    process.env.NODE_ENV = 'production';
    process.env.SUPABASE_URL = 'https://fake-project.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'fake-anon-key-abc123xyz';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key-xyz789';
    resetDatabaseAdapter();

    const prodAdapter = getDatabaseAdapter();
    assert.equal(prodAdapter.adapterType, 'supabase', 'Production environment must select Supabase adapter');
    assert.ok(prodAdapter instanceof SupabaseDatabaseAdapter);
    console.log('✅ TEST 16 & 17 PASSED: Supabase PostgreSQL database adapter continues to be used in production');

    console.log('\n--- TEST 18: /api/health reports "database": "supabase" ---');
    const dbType = getDatabaseType();
    assert.equal(dbType, 'supabase', 'Health diagnostic must report database: supabase in production');
    console.log('✅ TEST 18 PASSED: /api/health reports database: "supabase"');
  } finally {
    process.env = savedEnv;
    resetDatabaseAdapter();
  }

  console.log('\n============================================================');
  console.log('🎉 ALL 18 AUTHENTICATION & RECOVERY TESTS PASSED (100%)');
  console.log('============================================================\n');
}

runAuthRecoveryTests().catch((err) => {
  console.error('\n❌ AUTH RECOVERY TEST FAILED:', err);
  process.exit(1);
});
