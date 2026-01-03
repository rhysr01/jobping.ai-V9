-- ============================================================================
-- FIX RLS PERFORMANCE ISSUES
-- ============================================================================
-- Fixes RLS policies that re-evaluate auth.uid() for each row
-- Replaces auth.uid() with (select auth.uid()) for better performance
--
-- Date: January 2, 2026
-- ============================================================================

BEGIN;

-- Fix pending_digests RLS policy (uses user_email, not user_id)
DROP POLICY IF EXISTS "pending_digests_user_read_policy" ON public.pending_digests;
CREATE POLICY "pending_digests_user_read_policy" ON public.pending_digests
  FOR SELECT
  TO authenticated
  USING (user_email = (select auth.jwt() ->> 'email'));

-- Fix matches RLS policy (uses user_email for consistency)
DROP POLICY IF EXISTS "users_view_own_matches" ON public.matches;
CREATE POLICY "users_view_own_matches" ON public.matches
  FOR SELECT
  TO authenticated
  USING (user_email = (select auth.jwt() ->> 'email'));

-- Fix match_logs RLS policy (uses user_email, not user_id)
DROP POLICY IF EXISTS "users_view_own_match_logs" ON public.match_logs;
CREATE POLICY "users_view_own_match_logs" ON public.match_logs
  FOR SELECT
  TO authenticated
  USING (user_email = (select auth.jwt() ->> 'email'));

-- Fix stripe_connect_accounts RLS policies
DROP POLICY IF EXISTS "Users can read own accounts" ON public.stripe_connect_accounts;
CREATE POLICY "Users can read own accounts" ON public.stripe_connect_accounts
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Service role full access" ON public.stripe_connect_accounts;
CREATE POLICY "Service role full access" ON public.stripe_connect_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;

