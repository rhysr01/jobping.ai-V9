-- ============================================================================
-- RLS POLICIES FOR DASHBOARD & SECURITY
-- ============================================================================
-- Created: 2025-01-29
-- Purpose: Enable RLS and create policies for dashboard access
--          - Users see only their own matches
--          - Authenticated role can read views for Lovable dashboard
--          - Service role has full access
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENABLE RLS ON TABLES (if not already enabled)
-- ============================================================================

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. MATCHES TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist (to allow re-running)
DROP POLICY IF EXISTS "users_view_own_matches" ON matches;
DROP POLICY IF EXISTS "authenticated_read_all_matches" ON matches;
DROP POLICY IF EXISTS "service_role_full_access_matches" ON matches;

-- Policy: Users can only view their own matches (by user_email)
-- Note: matches table uses user_email, not user_id
CREATE POLICY "users_view_own_matches" 
ON matches 
FOR SELECT 
TO public, authenticated
USING (
    user_email = (SELECT auth.jwt() ->> 'email') OR
    (SELECT auth.role()) = 'service_role'
);

-- Policy: Allow INSERT (for tracking)
CREATE POLICY "matches_insert_authenticated"
ON matches
FOR INSERT
TO authenticated, anon, public
WITH CHECK (true);

-- ============================================================================
-- 3. MATCH_LOG TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_view_own_match_logs" ON match_logs;
DROP POLICY IF EXISTS "match_logs_insert_authenticated" ON match_logs;

-- Policy: Users can only view their own match logs
CREATE POLICY "users_view_own_match_logs" 
ON match_logs 
FOR SELECT 
TO public, authenticated
USING (
    user_email = (SELECT auth.jwt() ->> 'email') OR
    (SELECT auth.role()) = 'service_role'
);

-- Policy: Allow INSERT (for tracking signals)
CREATE POLICY "match_logs_insert_authenticated"
ON match_logs
FOR INSERT
TO authenticated, anon, public
WITH CHECK (true);

-- ============================================================================
-- 4. GRANT PERMISSIONS FOR LOVABLE DASHBOARD
-- ============================================================================
-- Views inherit permissions from underlying tables, but we explicitly grant
-- SELECT on views to authenticated role for Lovable dashboard access

-- Note: Views are read-only, so SELECT permission is safe
-- The RLS policies above will filter data appropriately
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant on views (if they exist)
DO $$
DECLARE
    view_name TEXT;
BEGIN
    FOR view_name IN 
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public'
    LOOP
        EXECUTE format('GRANT SELECT ON %I TO authenticated', view_name);
        EXECUTE format('GRANT SELECT ON %I TO anon', view_name);
    END LOOP;
END $$;

-- ============================================================================
-- 5. VERIFY RLS STATUS
-- ============================================================================

DO $$
DECLARE
    matches_rls BOOLEAN;
    match_logs_rls BOOLEAN;
BEGIN
    SELECT rowsecurity INTO matches_rls 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'matches';
    
    SELECT rowsecurity INTO match_logs_rls 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'match_logs';
    
    IF NOT matches_rls THEN
        RAISE WARNING 'RLS not enabled on matches table';
    END IF;
    
    IF NOT match_logs_rls THEN
        RAISE WARNING 'RLS not enabled on match_logs table';
    END IF;
    
    RAISE NOTICE 'RLS policies created successfully';
END $$;

COMMIT;

