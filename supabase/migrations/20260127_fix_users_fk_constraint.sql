-- Migration: Fix users table foreign key constraint for free signups
-- Date: 2026-01-27
-- Description: Remove foreign key constraint requirement for auth.users(id)
-- This allows free users to sign up without creating an auth account first

-- Step 1: Drop the existing constraint
ALTER TABLE public.users DROP CONSTRAINT "users_id_fkey";

-- Step 2: Drop the old primary key that referenced auth.users
ALTER TABLE public.users DROP CONSTRAINT "users_pkey";

-- Step 3: Recreate primary key WITHOUT foreign key reference
ALTER TABLE public.users ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);

-- Step 4: The id column remains UUID, but is now independent from auth.users
-- Existing records will keep their IDs, and new free signups can generate UUIDs

COMMENT ON TABLE public.users IS 
  'User profile data table. Stores application-specific user data separate from auth.users. Free users may have no corresponding auth.users entry.';

