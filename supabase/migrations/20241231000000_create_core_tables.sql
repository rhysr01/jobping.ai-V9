-- Migration: Create core tables for JobPing
-- Date: 2024-12-31
-- Description: Creates the essential tables (users, jobs, user_matches) that other migrations depend on

-- Create users table (if not exists - should be created by Supabase auth)
-- Note: In Supabase, auth.users is created automatically, but we may need a public.users view

-- Create a public view of auth.users for easier querying
CREATE OR REPLACE VIEW public.users AS
SELECT
  id,
  email,
  created_at,
  updated_at,
  last_sign_in_at,
  email_confirmed_at,
  phone_confirmed_at,
  confirmed_at,
  recovery_sent_at,
  email_change_sent_at,
  email_change_confirm_status,
  banned_until,
  reauthentication_sent_at
FROM auth.users;

-- Enable RLS on the view
ALTER VIEW public.users SET (security_barrier = true);

-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_name TEXT,
  location TEXT,
  city TEXT,
  country TEXT,
  description TEXT,
  job_type TEXT DEFAULT 'full-time',
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'EUR',
  remote_possible BOOLEAN DEFAULT false,
  visa_sponsored BOOLEAN DEFAULT false,
  experience_required TEXT DEFAULT 'entry-level',
  categories TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  job_url TEXT,
  source TEXT,
  source_id TEXT,
  posted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  CONSTRAINT jobs_source_id_unique UNIQUE (source, source_id)
);

-- Create index on job_hash for deduplication (will be added later if needed)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS jobs_hash_idx ON public.jobs USING hash (job_hash);

-- Create user_matches table
CREATE TABLE IF NOT EXISTS public.user_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  match_score DECIMAL(3,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
  match_reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'applied', 'rejected', 'expired')),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one match per user-job combination
  CONSTRAINT user_matches_unique UNIQUE (user_id, job_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_matches_user_id ON public.user_matches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_matches_job_id ON public.user_matches(job_id);
CREATE INDEX IF NOT EXISTS idx_user_matches_status ON public.user_matches(status, created_at DESC);

-- Create user_job_preferences table
CREATE TABLE IF NOT EXISTS public.user_job_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location TEXT[],
  job_types TEXT[],
  experience_level TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  remote_preference TEXT DEFAULT 'flexible' CHECK (remote_preference IN ('remote', 'onsite', 'flexible')),
  visa_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One preference per user
  CONSTRAINT user_job_preferences_user_unique UNIQUE (user_id)
);

-- Enable Row Level Security
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_job_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jobs table (public read, admin write)
CREATE POLICY "Jobs are publicly readable" ON public.jobs
  FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can insert jobs" ON public.jobs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can update jobs" ON public.jobs
  FOR UPDATE USING (auth.role() = 'service_role');

-- RLS Policies for user_matches table
CREATE POLICY "Users can read their own matches" ON public.user_matches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own matches" ON public.user_matches
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all matches" ON public.user_matches
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for user_job_preferences table
CREATE POLICY "Users can read their own preferences" ON public.user_job_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences" ON public.user_job_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.jobs TO anon, authenticated;
GRANT ALL ON public.user_matches TO authenticated;
GRANT ALL ON public.user_job_preferences TO authenticated;
GRANT ALL ON public.jobs TO service_role;
GRANT ALL ON public.user_matches TO service_role;
GRANT ALL ON public.user_job_preferences TO service_role;