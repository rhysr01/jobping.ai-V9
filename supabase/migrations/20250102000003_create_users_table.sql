-- Migration: Create public.users table
-- Date: 2025-01-02
-- Description: Creates the actual users table that the application code expects
-- This table stores user profile data separate from auth.users
--
-- IMPORTANT: After this migration runs, run 20250102000004_backfill_users_table.sql
-- to migrate existing auth.users records into public.users

-- Drop the view first (already done in previous migration, but ensure it's gone)
DROP VIEW IF EXISTS public.users CASCADE;

-- Create the actual users table with all fields the application expects
CREATE TABLE IF NOT EXISTS public.users (
  -- Primary identification (linked to auth.users)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,

  -- Account status
  active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  verification_token_expires TIMESTAMPTZ,

  -- Subscription management
  subscription_active BOOLEAN DEFAULT false,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'premium_pending')),
  stripe_customer_id TEXT,
  subscription_cancelled_at TIMESTAMPTZ,
  promo_code_used TEXT,
  promo_expires_at TIMESTAMPTZ,
  free_signup_at TIMESTAMPTZ,
  free_expires_at TIMESTAMPTZ,

  -- Email engagement tracking
  email_count INTEGER DEFAULT 0,
  last_email_sent TIMESTAMPTZ,
  last_email_opened TIMESTAMPTZ,
  last_email_clicked TIMESTAMPTZ,
  email_engagement_score DECIMAL(3,2) DEFAULT 0.0 CHECK (email_engagement_score >= 0 AND email_engagement_score <= 1),
  email_phase TEXT DEFAULT 'onboarding' CHECK (email_phase IN ('onboarding', 'welcome', 'active', 'inactive', 'churned')),
  delivery_paused BOOLEAN DEFAULT false,

  -- Basic preferences (legacy support)
  target_cities TEXT[] DEFAULT '{}',
  roles_selected TEXT[] DEFAULT '{}',
  languages_spoken TEXT[] DEFAULT '{}',
  career_path TEXT, -- Legacy single career path
  work_environment TEXT CHECK (work_environment IN ('remote', 'hybrid', 'office', 'on-site', 'flexible')),
  entry_level_preference TEXT,
  visa_status TEXT,
  start_date DATE,
  birth_year INTEGER,

  -- Enhanced preferences (premium features)
  skills TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  company_size_preference TEXT CHECK (company_size_preference IN ('startup', 'small', 'medium', 'large', 'enterprise', 'any')),
  career_keywords TEXT,
  company_types TEXT[] DEFAULT '{}',
  professional_expertise TEXT,
  remote_preference TEXT CHECK (remote_preference IN ('remote', 'hybrid', 'onsite', 'flexible')),

  -- System fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  onboarding_complete BOOLEAN DEFAULT false,
  re_engagement_sent BOOLEAN DEFAULT false,
  last_engagement_date TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON public.users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(active);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON public.users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email_phase ON public.users(email_phase);
CREATE INDEX IF NOT EXISTS idx_users_target_cities ON public.users USING GIN(target_cities);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Users can only read/update their own data
CREATE POLICY "Users can read their own data" ON public.users
  FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING ((select auth.uid()) = id);

-- Service role can manage all users (for internal operations)
CREATE POLICY "Service role can manage all users" ON public.users
  FOR ALL USING ((select auth.role()) = 'service_role');

-- Grant necessary permissions
GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- Create a function to sync email from auth.users when it changes
-- This ensures email stays in sync between auth.users and public.users
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update email in public.users when auth.users email changes
  UPDATE public.users
  SET email = NEW.email, updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync email changes (if trigger doesn't exist)
DROP TRIGGER IF EXISTS sync_user_email_trigger ON auth.users;
CREATE TRIGGER sync_user_email_trigger
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_user_email();

COMMENT ON TABLE public.users IS 
  'User profile data table. Stores application-specific user data separate from auth.users.';

COMMENT ON POLICY "Users can read their own data" ON public.users IS 
  'Users can only read their own profile data.';

COMMENT ON POLICY "Users can update their own data" ON public.users IS 
  'Users can update their own profile data.';

COMMENT ON POLICY "Service role can manage all users" ON public.users IS 
  'Service role has full access to all user data for internal operations.';
