-- Migration: Fix Users View Security Issues
-- Date: 2025-01-02
-- Description: Addresses security concerns with public.users view exposing auth.users
-- NOTE: This migration drops the view. The actual public.users TABLE is created
-- in migration 20250102_create_users_table.sql

-- ============================================================================
-- ISSUE: The public.users view exposes auth.users to anon/authenticated roles
-- and uses SECURITY DEFINER, which is a security risk.
-- ============================================================================

-- Remove the insecure view - the actual table will be created in next migration
-- Drop the existing view
DROP VIEW IF EXISTS public.users CASCADE;

-- Note: Code that references public.users will need to be updated to:
-- 1. Use auth.users directly with proper RLS
-- 2. Or use a function-based approach (see below)

-- ============================================================================
-- Option 2: Create a secure function-based approach (if view is needed)
-- ============================================================================

-- Create a secure function to get user profile
-- This function respects RLS and only returns data for the requesting user
CREATE OR REPLACE FUNCTION public.get_user_profile(requested_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_user_id UUID;
  current_user_role TEXT;
BEGIN
  -- Get current user context
  current_user_id := auth.uid();
  current_user_role := auth.role();
  
  -- Service role can access any user
  IF current_user_role = 'service_role' THEN
    RETURN QUERY
    SELECT 
      u.id,
      u.email,
      u.created_at,
      u.updated_at,
      u.last_sign_in_at,
      u.email_confirmed_at
    FROM auth.users u
    WHERE u.id = COALESCE(requested_user_id, current_user_id);
  
  -- Authenticated users can only access their own data
  ELSIF current_user_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      u.id,
      u.email,
      u.created_at,
      u.updated_at,
      u.last_sign_in_at,
      u.email_confirmed_at
    FROM auth.users u
    WHERE u.id = COALESCE(requested_user_id, current_user_id)
      AND u.id = current_user_id; -- Ensure user can only see their own data
  
  -- Unauthenticated users cannot access any data
  ELSE
    RETURN;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO service_role;

COMMENT ON FUNCTION public.get_user_profile(UUID) IS 
  'Securely retrieves user profile data. Users can only access their own data. Service role can access any user.';

-- ============================================================================
-- MIGRATION NOTES FOR CODE UPDATES
-- ============================================================================

-- Code that currently does:
--   supabase.from('users').select('*').eq('email', email).single()
--
-- Should be updated to one of:
--
-- Option A: Use auth.users directly (if using service role client)
--   supabase.from('auth.users').select('*').eq('email', email).single()
--
-- Option B: Use the function (for authenticated users)
--   supabase.rpc('get_user_profile', { requested_user_id: userId })
--
-- Option C: Use Supabase Auth client methods
--   supabase.auth.admin.getUserById(userId)  // For service role
--   supabase.auth.getUser()  // For current user

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify view is removed
-- SELECT * FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'users';
-- Should return 0 rows

-- Verify function exists
-- SELECT proname FROM pg_proc WHERE proname = 'get_user_profile';
-- Should return 1 row
