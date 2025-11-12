-- ============================================================================
-- PATCH RLS TO ALLOW SERVICE ROLE SIGNUP INSERTS
-- ============================================================================
-- Production reported "new row violates row-level security policy" when the
-- signup API attempted to insert into public.users. This indicates the
-- service role connection was still being evaluated against RLS, likely
-- because an explicit service_role policy was dropped during consolidation.
--
-- This migration restores an explicit INSERT policy for the service_role and
-- keeps a permissive anon/public policy so the signup flow can continue to
-- work with either key.
-- ============================================================================

BEGIN;

-- Ensure there is always a service role policy that bypasses RLS checks.
DROP POLICY IF EXISTS users_insert_service_role ON public.users;
CREATE POLICY users_insert_service_role
ON public.users
FOR INSERT
TO service_role
WITH CHECK (true);

-- Keep a permissive policy for anon/public inserts used by legacy flows.
DROP POLICY IF EXISTS users_insert_consolidated ON public.users;
CREATE POLICY users_insert_consolidated
ON public.users
FOR INSERT
TO anon, public
WITH CHECK (true);

COMMIT;

-- Verification query (optional)
-- SELECT tablename, policyname, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename = 'users'
--   AND cmd = 'INSERT';

