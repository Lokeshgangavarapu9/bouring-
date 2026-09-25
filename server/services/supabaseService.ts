import { createClient, SupabaseClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile();
} catch {}

// Server-side environment variables
function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}

function getSupabaseAnonKey(): string {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
}

function getSupabaseServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

let adminClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && (getSupabaseServiceRoleKey() || getSupabaseAnonKey()));
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!adminClient) {
    const key = getSupabaseServiceRoleKey() || getSupabaseAnonKey();
    adminClient = createClient(getSupabaseUrl(), key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClient;
}

export function getSupabaseAnonClient(): SupabaseClient | null {
  const anonKey = getSupabaseAnonKey();
  if (!isSupabaseConfigured() || !anonKey) {
    return null;
  }
  if (!anonClient) {
    anonClient = createClient(getSupabaseUrl(), anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });
  }
  return anonClient;
}

export function getPublicSupabaseConfig() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  return {
    configured: isSupabaseConfigured(),
    supabaseUrl: isSupabaseConfigured() ? url : null,
    anonKey: isSupabaseConfigured() ? (anonKey || null) : null,
  };
}

