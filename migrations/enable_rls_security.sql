-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON CRITICAL TABLES
-- ============================================================================
-- This migration enables RLS on jobs, users, and matches tables
-- Existing policies are preserved and will be enforced once RLS is enabled
-- ============================================================================

-- Enable RLS on jobs table
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on matches table
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
DO $$
DECLARE
    jobs_rls BOOLEAN;
    users_rls BOOLEAN;
    matches_rls BOOLEAN;
BEGIN
    SELECT rowsecurity INTO jobs_rls FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jobs';
    SELECT rowsecurity INTO users_rls FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users';
    SELECT rowsecurity INTO matches_rls FROM pg_tables WHERE schemaname = 'public' AND tablename = 'matches';
    
    IF NOT jobs_rls THEN
        RAISE EXCEPTION 'RLS not enabled on jobs table';
    END IF;
    
    IF NOT users_rls THEN
        RAISE EXCEPTION 'RLS not enabled on users table';
    END IF;
    
    IF NOT matches_rls THEN
        RAISE EXCEPTION 'RLS not enabled on matches table';
    END IF;
    
    RAISE NOTICE 'RLS successfully enabled on all critical tables';
END $$;

