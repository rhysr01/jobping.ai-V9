-- Migration: Fix RLS Security Issues
-- Date: 2025-01-02
-- Description: Enables RLS on tables missing it and optimizes RLS policy performance

-- ============================================================================
-- PART 1: Enable RLS on tables that are missing it
-- ============================================================================

-- Enable RLS on custom_scans
ALTER TABLE public.custom_scans ENABLE ROW LEVEL SECURITY;

-- Enable RLS on fallback_match_events
ALTER TABLE public.fallback_match_events ENABLE ROW LEVEL SECURITY;

-- Enable RLS on scraping_priorities
ALTER TABLE public.scraping_priorities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Add RLS policies for the new tables (service role only)
-- ============================================================================

-- Policy for custom_scans (internal use only - service role)
DROP POLICY IF EXISTS "Service role can manage custom_scans" ON public.custom_scans;
CREATE POLICY "Service role can manage custom_scans" ON public.custom_scans
  FOR ALL USING ((select auth.role()) = 'service_role');

-- Policy for fallback_match_events (internal use only - service role)
DROP POLICY IF EXISTS "Service role can manage fallback_match_events" ON public.fallback_match_events;
CREATE POLICY "Service role can manage fallback_match_events" ON public.fallback_match_events
  FOR ALL USING ((select auth.role()) = 'service_role');

-- Policy for scraping_priorities (internal use only - service role)
DROP POLICY IF EXISTS "Service role can manage scraping_priorities" ON public.scraping_priorities;
CREATE POLICY "Service role can manage scraping_priorities" ON public.scraping_priorities
  FOR ALL USING ((select auth.role()) = 'service_role');

-- ============================================================================
-- PART 3: Add missing RLS policy for embedding_queue
-- ============================================================================

-- Policy for embedding_queue (service role only)
DROP POLICY IF EXISTS "Service role can manage embedding_queue" ON public.embedding_queue;
CREATE POLICY "Service role can manage embedding_queue" ON public.embedding_queue
  FOR ALL USING ((select auth.role()) = 'service_role');

-- ============================================================================
-- PART 4: Optimize existing RLS policies for performance
-- ============================================================================

-- Drop existing policies that need optimization
DROP POLICY IF EXISTS "Users can read their own matches" ON public.user_matches;
DROP POLICY IF EXISTS "Users can update their own matches" ON public.user_matches;
DROP POLICY IF EXISTS "Service role can manage all matches" ON public.user_matches;
DROP POLICY IF EXISTS "Only authenticated users can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Only service role can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can read their own preferences" ON public.user_job_preferences;
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_job_preferences;

-- Recreate with optimized pattern using (select auth.uid()) and (select auth.role())
-- This evaluates auth functions once per query instead of once per row

-- Optimized policies for user_matches
CREATE POLICY "Users can read their own matches" ON public.user_matches
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own matches" ON public.user_matches
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Service role can manage all matches" ON public.user_matches
  FOR ALL USING ((select auth.role()) = 'service_role');

-- Optimized policies for jobs
DROP POLICY IF EXISTS "Only authenticated users can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Only service role can insert jobs" ON public.jobs;
CREATE POLICY "Only service role can insert jobs" ON public.jobs
  FOR INSERT WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Only service role can update jobs" ON public.jobs;
CREATE POLICY "Only service role can update jobs" ON public.jobs
  FOR UPDATE USING ((select auth.role()) = 'service_role');

-- Optimized policies for user_job_preferences
-- Consolidate multiple policies into one per operation
CREATE POLICY "Users can read their own preferences" ON public.user_job_preferences
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage their own preferences" ON public.user_job_preferences
  FOR ALL USING ((select auth.uid()) = user_id);

-- ============================================================================
-- PART 5: Fix function search_path security
-- ============================================================================

-- Set explicit search_path for functions to prevent search_path manipulation attacks
ALTER FUNCTION public.normalize_city_name SET search_path = public;
ALTER FUNCTION public.clean_company_name SET search_path = public;
ALTER FUNCTION public.clean_job_data_before_insert SET search_path = public;

-- ============================================================================
-- PART 6: Grant necessary permissions
-- ============================================================================

-- Grant service role access to new tables
GRANT ALL ON public.custom_scans TO service_role;
GRANT ALL ON public.fallback_match_events TO service_role;
GRANT ALL ON public.scraping_priorities TO service_role;
GRANT ALL ON public.embedding_queue TO service_role;

-- Note: No grants to anon/authenticated roles for these tables
-- They are internal-only tables accessed via service role

COMMENT ON POLICY "Service role can manage custom_scans" ON public.custom_scans IS 
  'Allows service role to manage custom scan requests. This is an internal table.';

COMMENT ON POLICY "Service role can manage fallback_match_events" ON public.fallback_match_events IS 
  'Allows service role to manage fallback match events. This is an internal table.';

COMMENT ON POLICY "Service role can manage scraping_priorities" ON public.scraping_priorities IS 
  'Allows service role to manage scraping priorities. This is an internal table.';

COMMENT ON POLICY "Service role can manage embedding_queue" ON public.embedding_queue IS 
  'Allows service role to manage embedding queue. This is an internal table.';
