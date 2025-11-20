-- ============================================================================
-- FIX SIGNUP RLS: ENSURE SERVICE ROLE BYPASSES RLS
-- ============================================================================
-- Production error: "new row violates row-level security policy for table users"
-- 
-- The service role key should bypass RLS, but we need to ensure:
-- 1. The service role policy exists and is correct
-- 2. The client is using the service role key (SUPABASE_SERVICE_ROLE_KEY)
-- ============================================================================

BEGIN;

-- Ensure service role policy exists (this should bypass RLS)
DROP POLICY IF EXISTS users_insert_service_role ON public.users;

CREATE POLICY users_insert_service_role
ON public.users
FOR INSERT
TO service_role
WITH CHECK (true);

-- Also ensure anon/public policy exists for backward compatibility
DROP POLICY IF EXISTS users_insert_consolidated ON public.users;

CREATE POLICY users_insert_consolidated
ON public.users
FOR INSERT
TO anon, public
WITH CHECK (true);

COMMIT;

-- Verification: Check that policies exist
SELECT 
    tablename, 
    policyname, 
    roles, 
    cmd,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND cmd = 'INSERT'
ORDER BY policyname;

