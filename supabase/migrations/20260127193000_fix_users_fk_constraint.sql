-- Migration: Fix users table foreign key constraint for free signups
-- Date: 2026-01-27
-- Description: Make users table independent from auth.users
-- This allows free tier users to sign up without creating auth accounts
--
-- APPLIED MANUALLY via supabase MCP on 2026-01-27
-- Timestamp conflict prevented auto-deployment

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS "users_id_fkey";

-- Step 2: Drop the old primary key that referenced auth.users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS "users_pkey";

-- Step 3: Recreate primary key WITHOUT foreign key reference to auth.users
-- The id column is now independent and can be UUIDs generated in the application
ALTER TABLE public.users ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);

-- Step 4: Ensure uuid-ossp extension exists for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 5: Set the default for id column to generate UUIDs automatically
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMENT ON TABLE public.users IS 
  'User profile data table. Stores application-specific user data separate from auth.users.  
   Free tier users may have no corresponding auth.users entry.';

-- VERIFICATION QUERIES:
-- SELECT constraint_name, constraint_type FROM information_schema.table_constraints 
-- WHERE table_schema = 'public' AND table_name = 'users' AND constraint_type = 'FOREIGN KEY';
-- -- Should return empty result (no FK constraints)
--
-- SELECT column_default FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id';
-- -- Should return: gen_random_uuid()



