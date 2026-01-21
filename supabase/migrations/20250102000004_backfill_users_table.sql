-- Migration: Backfill public.users table from auth.users
-- Date: 2025-01-02
-- Description: Migrates existing auth.users records to public.users table
-- This should run AFTER 20250102000003_create_users_table.sql

-- ============================================================================
-- IMPORTANT: This migration assumes public.users table already exists
-- Run 20250102000003_create_users_table.sql first!
-- ============================================================================

-- Check if public.users table exists (will fail if it doesn't)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    RAISE EXCEPTION 'public.users table does not exist. Run 20250102_create_users_table.sql first!';
  END IF;
END $$;

-- ============================================================================
-- Backfill: Insert auth.users records that don't have public.users entries
-- ============================================================================

-- Insert all auth.users that don't have a corresponding public.users record
-- Use defaults for all application-specific fields
INSERT INTO public.users (
  id,
  email,
  full_name,
  active,
  email_verified,
  subscription_active,
  subscription_tier,
  email_phase,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', NULL) as full_name,
  true as active,
  COALESCE(au.email_confirmed_at IS NOT NULL, false) as email_verified,
  false as subscription_active,
  'free' as subscription_tier,
  'onboarding' as email_phase,
  COALESCE(au.created_at, NOW()) as created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL  -- Only insert users that don't exist in public.users
ON CONFLICT (id) DO NOTHING;  -- Skip if somehow already exists

-- ============================================================================
-- Log migration results
-- ============================================================================

DO $$
DECLARE
  inserted_count INTEGER;
  total_auth_users INTEGER;
  total_public_users INTEGER;
BEGIN
  -- Count records
  SELECT COUNT(*) INTO total_auth_users FROM auth.users;
  SELECT COUNT(*) INTO total_public_users FROM public.users;
  inserted_count := total_public_users - (SELECT COUNT(*) FROM public.users WHERE created_at < NOW() - INTERVAL '1 minute');
  
  -- Log results (will appear in migration logs)
  RAISE NOTICE 'Backfill complete:';
  RAISE NOTICE '  - Total auth.users: %', total_auth_users;
  RAISE NOTICE '  - Total public.users: %', total_public_users;
  RAISE NOTICE '  - Records backfilled: %', inserted_count;
  
  -- Warn if counts don't match (some users might have been created after migration)
  IF total_auth_users > total_public_users THEN
    RAISE WARNING 'Some auth.users records do not have public.users entries. This may be expected if users were created after the table migration.';
  END IF;
END $$;

-- ============================================================================
-- Verification: Ensure all auth.users have corresponding public.users records
-- ============================================================================

-- Create a function to check for orphaned auth.users (for future use)
CREATE OR REPLACE FUNCTION public.check_orphaned_auth_users()
RETURNS TABLE(
  auth_user_id UUID,
  auth_user_email TEXT,
  missing_in_public BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    (pu.id IS NULL) as missing_in_public
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;
END;
$$;

COMMENT ON FUNCTION public.check_orphaned_auth_users() IS 
  'Returns auth.users records that do not have corresponding public.users entries. Useful for detecting data inconsistencies.';

-- ============================================================================
-- Optional: Create a trigger to auto-create public.users when auth.users is created
-- ============================================================================

-- Function to auto-create public.users when auth.users is created
CREATE OR REPLACE FUNCTION public.auto_create_public_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into public.users with defaults
  INSERT INTO public.users (
    id,
    email,
    full_name,
    active,
    email_verified,
    subscription_active,
    subscription_tier,
    email_phase,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL),
    true,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    false,
    'free',
    'onboarding',
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;  -- Don't error if somehow already exists
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users to auto-create public.users
DROP TRIGGER IF EXISTS auto_create_public_user_trigger ON auth.users;
CREATE TRIGGER auto_create_public_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_public_user();

COMMENT ON FUNCTION public.auto_create_public_user() IS 
  'Automatically creates a public.users record when a new auth.users record is created. Ensures data consistency.';

-- Note: Cannot add comment on auth.users trigger due to permissions, but trigger is created successfully
