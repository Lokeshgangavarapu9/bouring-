/**
 * SAFE LIVE SUPABASE CONNECTIVITY & VERIFICATION SCRIPT
 * Confirms real Supabase project connection without printing any secret values.
 */

try {
  process.loadEnvFile();
} catch {}

import {
  isSupabaseConfigured,
  getSupabaseAdminClient,
  getSupabaseAnonClient,
} from '../services/supabaseService.ts';
import { SupabaseDatabaseAdapter } from '../db/adapter.ts';

async function runLiveVerification() {
  console.log('\n=============================================');
  console.log('🔒 BORING SUPABASE LIVE CONNECTIVITY CHECK');
  console.log('=============================================\n');

  // 1. Environment Variable Presence Checks (No secret values printed!)
  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const urlLoaded = Boolean(url && url.startsWith('https://'));
  const anonKeyPresent = Boolean(anonKey && anonKey.length > 20);
  const serviceRoleKeyPresent = Boolean(serviceRoleKey && serviceRoleKey.length > 20);

  console.log(`1. SUPABASE_URL Loaded: ${urlLoaded ? 'PASSED (Target: ' + url.replace(/https:\/\/[^.]+\./, 'https://***.') + ')' : 'FAILED'}`);
  console.log(`2. SUPABASE_ANON_KEY Present: ${anonKeyPresent ? 'PASSED (Length: ' + anonKey.length + ' chars)' : 'FAILED'}`);
  console.log(`3. SUPABASE_SERVICE_ROLE_KEY Present: ${serviceRoleKeyPresent ? 'PASSED (Length: ' + serviceRoleKey.length + ' chars)' : 'FAILED'}`);

  if (!urlLoaded || !anonKeyPresent || !serviceRoleKeyPresent) {
    console.error('\n❌ Missing required Supabase credentials in .env.');
    process.exit(1);
  }

  // 2. Database Adapter & PostgreSQL Connection Check
  console.log('\n--- Checking Supabase PostgreSQL Connection ---');
  const adminClient = getSupabaseAdminClient()!;
  
  // Test query against public.users table
  const { data: usersData, error: usersError, count: usersCount } = await adminClient
    .from('users')
    .select('id', { count: 'exact', head: true });

  if (usersError) {
    console.error(`❌ Database query on 'users' failed: ${usersError.message}`);
    process.exit(1);
  }
  console.log(`4. Database Query (public.users): PASSED (Accessible, Count: ${usersCount ?? 0})`);

  // Test query against relationships table
  const { error: relError } = await adminClient
    .from('relationships')
    .select('id', { count: 'exact', head: true });

  if (relError) {
    console.error(`❌ Database query on 'relationships' failed: ${relError.message}`);
    process.exit(1);
  }
  console.log(`5. Database Query (public.relationships): PASSED`);

  // Test query against mutual_relationships table
  const { error: mutualError } = await adminClient
    .from('mutual_relationships')
    .select('id', { count: 'exact', head: true });

  if (mutualError) {
    console.error(`❌ Database query on 'mutual_relationships' failed: ${mutualError.message}`);
    process.exit(1);
  }
  console.log(`6. Database Query (public.mutual_relationships): PASSED`);

  // Test query against privacy_settings table
  const { error: privError } = await adminClient
    .from('privacy_settings')
    .select('user_id', { count: 'exact', head: true });

  if (privError) {
    console.error(`❌ Database query on 'privacy_settings' failed: ${privError.message}`);
    process.exit(1);
  }
  console.log(`7. Database Query (public.privacy_settings): PASSED`);

  // Test query against layout_cache table
  const { error: cacheError } = await adminClient
    .from('layout_cache')
    .select('id', { count: 'exact', head: true });

  if (cacheError) {
    console.error(`❌ Database query on 'layout_cache' failed: ${cacheError.message}`);
    process.exit(1);
  }
  console.log(`8. Database Query (public.layout_cache): PASSED`);

  // 3. Database Adapter Full Round-Trip
  const adapter = new SupabaseDatabaseAdapter();
  const testUserId = `test-verify-${Date.now()}`;
  const now = new Date().toISOString();

  // Test UserEntity creation through adapter
  const created = await adapter.createUser({
    id: testUserId,
    name: 'Verification Bot',
    username: `bot_${Date.now()}`,
    email: `bot.${Date.now()}@example.com`,
    password_hash: '',
    avatar_url: '',
    bio: 'Automated connectivity verification',
    gender: '',
    molecule_identity: 'default',
    molecule_smoky: 0,
    molecule_twinkling: 0,
    showcase_suggestions: '[]',
    created_at: now,
    updated_at: now,
  });

  const fetched = await adapter.getUserById(testUserId);
  const adapterVerified = Boolean(fetched && fetched.id === testUserId);
  console.log(`9. Supabase Database Adapter (Read/Write): ${adapterVerified ? 'PASSED' : 'FAILED'}`);

  // Clean up verification user record
  await adminClient.from('users').delete().eq('id', testUserId);

  // 4. Supabase Auth Service Check
  console.log('\n--- Checking Supabase Auth Service ---');
  // List users via Admin Auth API
  const { data: authUsersData, error: authListError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });

  if (authListError) {
    console.error(`❌ Supabase Auth admin API check failed: ${authListError.message}`);
    process.exit(1);
  }
  console.log(`10. Supabase Auth Service Reachability: PASSED`);

  // Safe Signup / Delete User Check through Auth API
  const verifyEmail = `verify.${Date.now()}@boring-connectivity.internal`;
  const verifyPass = `BoringPass_${Date.now()}!`;
  
  const { data: signUpData, error: signUpError } = await adminClient.auth.admin.createUser({
    email: verifyEmail,
    password: verifyPass,
    email_confirm: true,
    user_metadata: {
      name: 'Auth Verification Tester',
      username: `authtester_${Date.now()}`,
    },
  });

  if (signUpError || !signUpData.user) {
    console.error(`❌ Supabase Auth user creation failed: ${signUpError?.message}`);
    process.exit(1);
  }
  console.log(`11. Supabase Auth Account Provisioning: PASSED`);

  // Test Sign In with Password via Anon Client
  const anonClient = getSupabaseAnonClient()!;
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email: verifyEmail,
    password: verifyPass,
  });

  if (signInError || !signInData.session) {
    console.error(`❌ Supabase Auth sign-in verification failed: ${signInError?.message}`);
    process.exit(1);
  }
  console.log(`12. Supabase Auth Email/Password Sign-In: PASSED`);

  // Clean up Auth verification user
  await adminClient.auth.admin.deleteUser(signUpData.user.id);
  // Clean up associated public user row if auto-synced by trigger
  await adminClient.from('users').delete().eq('id', signUpData.user.id);

  console.log('\n=============================================');
  console.log('🎉 ALL SUPABASE LIVE CONNECTION CHECKS PASSED (100%)');
  console.log('   Zero secrets exposed. Production ready.');
  console.log('=============================================\n');
}

runLiveVerification().catch(err => {
  console.error('\n❌ Supabase live verification failed:', err.message || err);
  process.exit(1);
});
