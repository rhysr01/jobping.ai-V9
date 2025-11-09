-- ============================================================================
-- CONSOLIDATE MULTIPLE RLS POLICIES
-- ============================================================================
-- Merges duplicate INSERT policies on match_logs, matches, promo_pending, users
-- Keeps one policy per role/action combination for better performance
-- ============================================================================

-- ============================================================================
-- 1. MATCH_LOGS TABLE
-- ============================================================================
-- Current: match_logs_insert_anon, match_logs_insert_public, match_logs_insert_service_role
-- Strategy: Keep service_role policy, merge anon/public into one policy

-- Drop duplicate policies
DROP POLICY IF EXISTS match_logs_insert_anon ON public.match_logs;
DROP POLICY IF EXISTS match_logs_insert_public ON public.match_logs;

-- Create consolidated policy for anon/public
CREATE POLICY match_logs_insert_consolidated
ON public.match_logs
FOR INSERT
TO anon, public
WITH CHECK (true);

-- ============================================================================
-- 2. MATCHES TABLE
-- ============================================================================
-- Current: matches_insert_anon, matches_insert_public, matches_insert_service_role
-- Strategy: Keep service_role policy, merge anon/public into one policy

-- Drop duplicate policies
DROP POLICY IF EXISTS matches_insert_anon ON public.matches;
DROP POLICY IF EXISTS matches_insert_public ON public.matches;

-- Create consolidated policy for anon/public
CREATE POLICY matches_insert_consolidated
ON public.matches
FOR INSERT
TO anon, public
WITH CHECK (true);

-- ============================================================================
-- 3. PROMO_PENDING TABLE
-- ============================================================================
-- Current: promo_pending_insert, promo_pending_insert_anon
-- Strategy: Merge into one policy

-- Drop duplicate policies
DROP POLICY IF EXISTS promo_pending_insert ON public.promo_pending;
DROP POLICY IF EXISTS promo_pending_insert_anon ON public.promo_pending;

-- Create consolidated policy
CREATE POLICY promo_pending_insert_consolidated
ON public.promo_pending
FOR INSERT
TO anon, public
WITH CHECK (true);

-- Fix promo_pending_select policy performance (use SELECT subquery)
DROP POLICY IF EXISTS promo_pending_select ON public.promo_pending;
CREATE POLICY promo_pending_select
ON public.promo_pending
FOR SELECT
TO public
USING (
    (email = (SELECT auth.jwt() ->> 'email')) OR 
    (auth.role() = 'service_role')
);

-- ============================================================================
-- 4. USERS TABLE
-- ============================================================================
-- Current: users_insert_anon, users_insert_policy
-- Strategy: Merge into one policy

-- Drop duplicate policies
DROP POLICY IF EXISTS users_insert_anon ON public.users;
DROP POLICY IF EXISTS users_insert_policy ON public.users;

-- Create consolidated policy
CREATE POLICY users_insert_consolidated
ON public.users
FOR INSERT
TO anon, public
WITH CHECK (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify policies are consolidated
SELECT 
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('match_logs', 'matches', 'promo_pending', 'users')
  AND cmd = 'INSERT'
ORDER BY tablename, policyname;

