-- ==============================================================================
-- BORING PRODUCTION DATABASE MIGRATION (PostgreSQL / Supabase)
-- Source of Truth: Social Relationships
-- Derived State: Mutual Relationships, Graph Versions, Layout Cache
-- Invariant: ACCEPTED_ONE_WAY != MUTUAL. Only MUTUAL creates molecular bonds.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  gender TEXT DEFAULT '',
  molecule_identity TEXT DEFAULT 'default',
  molecule_smoky INTEGER DEFAULT 0,
  molecule_twinkling INTEGER DEFAULT 0,
  showcase_suggestions TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 3. PRIVACY SETTINGS
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  profile_visibility TEXT DEFAULT 'PUBLIC' CHECK (profile_visibility IN ('PUBLIC', 'CONNECTIONS_ONLY', 'PRIVATE')),
  email_visibility TEXT DEFAULT 'CONNECTIONS_ONLY' CHECK (email_visibility IN ('PUBLIC', 'CONNECTIONS_ONLY', 'PRIVATE')),
  social_links_visibility TEXT DEFAULT 'PUBLIC' CHECK (social_links_visibility IN ('PUBLIC', 'CONNECTIONS_ONLY', 'PRIVATE'))
);

-- 4. SMART SOCIAL PROFILES
CREATE TABLE IF NOT EXISTS public.social_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  display_username TEXT NOT NULL,
  normalized_url TEXT,
  hostname TEXT,
  icon_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_social_profiles_user ON public.social_profiles(user_id);

-- 5. EXTERNAL AUTH IDENTITIES (Supabase Auth Mapping)
CREATE TABLE IF NOT EXISTS public.external_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_provider_user UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ext_identities_lookup ON public.external_identities(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_ext_identities_user ON public.external_identities(user_id);

-- 6. USER MOLECULE IDENTITIES
CREATE TABLE IF NOT EXISTS public.user_molecule_identities (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  identity_type TEXT NOT NULL DEFAULT 'default',
  model_version TEXT NOT NULL DEFAULT 'v1',
  parameters TEXT DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. DIRECTED RELATIONSHIPS (FROZEN STATE MACHINE)
CREATE TABLE IF NOT EXISTS public.relationships (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('REQUESTED', 'ACCEPTED_ONE_WAY', 'REJECTED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  accepted_at TIMESTAMPTZ,
  mutual_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1,
  CONSTRAINT unique_directed_pair UNIQUE (requester_id, receiver_id),
  CONSTRAINT no_self_relation CHECK (requester_id != receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_rel_requester ON public.relationships(requester_id);
CREATE INDEX IF NOT EXISTS idx_rel_receiver ON public.relationships(receiver_id);
CREATE INDEX IF NOT EXISTS idx_rel_status ON public.relationships(status);
CREATE INDEX IF NOT EXISTS idx_rel_lookup ON public.relationships(requester_id, receiver_id, status);

-- 8. MUTUAL RELATIONSHIPS (CANONICAL ORDERED RECIPROCAL BONDS)
CREATE TABLE IF NOT EXISTS public.mutual_relationships (
  id TEXT PRIMARY KEY,
  user_a_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_b_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT canonical_order CHECK (user_a_id < user_b_id),
  CONSTRAINT unique_mutual_pair UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_mutual_a ON public.mutual_relationships(user_a_id);
CREATE INDEX IF NOT EXISTS idx_mutual_b ON public.mutual_relationships(user_b_id);

-- 9. USER GRAPH VERSIONS
CREATE TABLE IF NOT EXISTS public.user_graph_versions (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  graph_version INTEGER DEFAULT 1,
  graph_hash TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. LAYOUT CACHE (ISOLATED USER 3D GEOMETRY CACHE)
CREATE TABLE IF NOT EXISTS public.layout_cache (
  id TEXT PRIMARY KEY,
  host_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  graph_version INTEGER NOT NULL,
  algorithm_version TEXT NOT NULL,
  structure_class TEXT NOT NULL,
  layout_data TEXT NOT NULL,
  quality_metrics TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_layout_cache UNIQUE (host_user_id, graph_version, algorithm_version)
);

CREATE INDEX IF NOT EXISTS idx_cache_lookup ON public.layout_cache(host_user_id, graph_version, algorithm_version);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_molecule_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutual_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_graph_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layout_cache ENABLE ROW LEVEL SECURITY;

-- 1. Users policies:
-- Any authenticated user can view public user profiles
CREATE POLICY "Users are viewable by everyone" 
  ON public.users FOR SELECT 
  USING (true);

-- Users can only update their own record
CREATE POLICY "Users can update their own profile" 
  ON public.users FOR UPDATE 
  USING (auth.uid()::text = id);

-- 2. Privacy settings policies:
CREATE POLICY "Privacy settings viewable by everyone" 
  ON public.privacy_settings FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own privacy settings" 
  ON public.privacy_settings FOR ALL 
  USING (auth.uid()::text = user_id);

-- 3. Social profiles policies:
CREATE POLICY "Social profiles viewable by authenticated users" 
  ON public.social_profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can manage own social profiles" 
  ON public.social_profiles FOR ALL 
  USING (auth.uid()::text = user_id);

-- 4. Relationships policies:
-- Only requester or receiver can view their relationships
CREATE POLICY "Users can view their own relationships" 
  ON public.relationships FOR SELECT 
  USING (auth.uid()::text = requester_id OR auth.uid()::text = receiver_id);

CREATE POLICY "Users can insert relationships they initiate" 
  ON public.relationships FOR INSERT 
  WITH CHECK (auth.uid()::text = requester_id);

CREATE POLICY "Users can update relationships they participate in" 
  ON public.relationships FOR UPDATE 
  USING (auth.uid()::text = requester_id OR auth.uid()::text = receiver_id);

-- 5. Mutual relationships policies:
CREATE POLICY "Users can view mutual bonds they belong to" 
  ON public.mutual_relationships FOR SELECT 
  USING (auth.uid()::text = user_a_id OR auth.uid()::text = user_b_id);

-- 6. Layout cache policies:
CREATE POLICY "Users can view and manage their own layout cache" 
  ON public.layout_cache FOR ALL 
  USING (auth.uid()::text = host_user_id);

-- 7. Graph version policies:
CREATE POLICY "Users can view own graph version" 
  ON public.user_graph_versions FOR ALL 
  USING (auth.uid()::text = user_id);

-- 8. User molecule identities policies:
CREATE POLICY "Users can view any molecule identity" 
  ON public.user_molecule_identities FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own molecule identity" 
  ON public.user_molecule_identities FOR ALL 
  USING (auth.uid()::text = user_id);

-- ==============================================================================
-- AUTOMATIC AUTH SYNC TRIGGER
-- Synchronizes new Supabase Auth users directly into the Boring database
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
DECLARE
  extracted_username TEXT;
  extracted_name TEXT;
BEGIN
  -- Extract name and username from user metadata or generate safe defaults
  extracted_username := COALESCE(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 4)
  );
  extracted_name := COALESCE(
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- Insert public user
  INSERT INTO public.users (
    id,
    name,
    username,
    email,
    password_hash,
    avatar_url,
    bio,
    gender,
    molecule_identity,
    molecule_smoky,
    molecule_twinkling,
    showcase_suggestions,
    created_at,
    updated_at
  ) VALUES (
    new.id::text,
    extracted_name,
    lower(extracted_username),
    lower(new.email),
    '',
    '',
    '',
    '',
    'default',
    0,
    0,
    '[]',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert default privacy settings
  INSERT INTO public.privacy_settings (
    user_id,
    profile_visibility,
    email_visibility,
    social_links_visibility
  ) VALUES (
    new.id::text,
    'PUBLIC',
    'CONNECTIONS_ONLY',
    'PUBLIC'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert default user graph version
  INSERT INTO public.user_graph_versions (
    user_id,
    graph_version,
    graph_hash,
    updated_at
  ) VALUES (
    new.id::text,
    1,
    '',
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
