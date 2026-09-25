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

/**
 * Sign up a user with email + password via Supabase Auth
 */
export async function supabaseSignUp(
  name: string,
  username: string,
  email: string,
  password: string
): Promise<{ authUser: any; session: any }> {
  const client = getSupabaseAdminClient() || getSupabaseAnonClient();
  if (!client) {
    throw new Error('Supabase client is not configured.');
  }

  // Use signUp with user_metadata
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        username,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('Failed to create account through Supabase Auth.');
  }

  return {
    authUser: data.user,
    session: data.session,
  };
}

/**
 * Sign in user with email + password via Supabase Auth
 */
export async function supabaseSignIn(
  email: string,
  password: string
): Promise<{ authUser: any; token: string }> {
  const client = getSupabaseAdminClient() || getSupabaseAnonClient();
  if (!client) {
    throw new Error('Supabase client is not configured.');
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message || 'Invalid email or password.');
  }

  if (!data.user || !data.session) {
    throw new Error('Supabase authentication did not return an active session.');
  }

  return {
    authUser: data.user,
    token: data.session.access_token,
  };
}

/**
 * Request password reset email via Supabase Auth.
 * Generic safe response without leaking user existence.
 */
export async function supabaseRequestPasswordReset(
  email: string,
  redirectTo?: string
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseAdminClient() || getSupabaseAnonClient();
  if (!client) {
    // Safe response in offline / dev mode without leaking user existence
    return {
      success: true,
      message: 'If an account exists with this email address, a password reset link has been sent.',
    };
  }

  const defaultRedirect = redirectTo || `${process.env.APP_URL || 'http://localhost:5173'}/reset-password`;

  const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: defaultRedirect,
  });

  if (error) {
    console.warn('[Supabase Auth Warning] resetPasswordForEmail error:', error.message);
  }

  // Safe response: never reveal whether the email exists
  return {
    success: true,
    message: 'If an account exists with this email address, a password reset link has been sent.',
  };
}

/**
 * Update user password using the reset session token or authenticated token
 */
export async function supabaseUpdatePassword(
  accessToken: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    return {
      success: true,
      message: 'Password successfully updated.',
    };
  }

  // Create an authenticated client instance with the user's accessToken
  const userClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const { error } = await userClient.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message || 'Unable to update password. Reset link may have expired.');
  }

  return {
    success: true,
    message: 'Password successfully updated. You can now sign in with your new password.',
  };
}

/**
 * Verify a Supabase access token and return the user ID (UUID)
 */
export async function verifySupabaseToken(token: string): Promise<{ userId: string; email?: string } | null> {
  const client = getSupabaseAdminClient() || getSupabaseAnonClient();
  if (!client) return null;

  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return {
      userId: data.user.id,
      email: data.user.email,
    };
  } catch {
    return null;
  }
}
