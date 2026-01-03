-- ============================================================================
-- FIX FUNCTION SEARCH PATH SECURITY
-- ============================================================================
-- Sets search_path for functions to prevent security issues
-- This prevents search_path injection attacks
--
-- Date: January 2, 2026
-- ============================================================================

BEGIN;

-- Fix prevent_old_categories function
ALTER FUNCTION public.prevent_old_categories()
  SET search_path = public;

-- Fix reset_user_recommendations function
ALTER FUNCTION public.reset_user_recommendations()
  SET search_path = public;

-- Fix normalize_city_name function
ALTER FUNCTION public.normalize_city_name(text)
  SET search_path = public;

-- Fix get_user_match_stats function
ALTER FUNCTION public.get_user_match_stats(uuid)
  SET search_path = public;

-- Fix clean_company_name function
ALTER FUNCTION public.clean_company_name(text)
  SET search_path = public;

-- Fix clean_job_data_before_insert function
ALTER FUNCTION public.clean_job_data_before_insert()
  SET search_path = public;

-- Fix categorize_job function
ALTER FUNCTION public.categorize_job()
  SET search_path = public;

-- Fix clear_user_feedback_cache function
ALTER FUNCTION public.clear_user_feedback_cache()
  SET search_path = public;

-- Fix trigger_user_rematch function
ALTER FUNCTION public.trigger_user_rematch()
  SET search_path = public;

-- Fix update_pending_digests_updated_at function
ALTER FUNCTION public.update_pending_digests_updated_at()
  SET search_path = public;

COMMIT;

