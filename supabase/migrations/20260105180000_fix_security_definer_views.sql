-- ============================================================================
-- FIX SECURITY DEFINER VIEWS - SUPABASE MIGRATION
-- ============================================================================
-- Migration: 20260105180000_fix_security_definer_views
-- Addresses Supabase database linter ERROR: security_definer_view
-- Adds security_barrier to prevent RLS bypass
--
-- Date: January 5, 2026
-- Risk: LOW - Only adds security barriers, maintains functionality
-- ============================================================================

BEGIN;

-- Add security barriers to all SECURITY DEFINER views
-- This prevents function inlining and ensures RLS policies are respected

ALTER VIEW public.user_engagement_summary SET (security_barrier = true);
ALTER VIEW public.job_source_performance SET (security_barrier = true);
ALTER VIEW public.ai_matching_quality_report SET (security_barrier = true);
ALTER VIEW public.daily_system_health SET (security_barrier = true);
ALTER VIEW public.category_performance_report SET (security_barrier = true);
ALTER VIEW public.match_quality_by_category SET (security_barrier = true);
ALTER VIEW public.category_noise_report SET (security_barrier = true);

-- Log the changes for audit purposes
DO $$
BEGIN
    RAISE NOTICE 'Security barriers added to 7 SECURITY DEFINER views to prevent RLS bypass';
    RAISE NOTICE 'Views affected: user_engagement_summary, job_source_performance, ai_matching_quality_report, daily_system_health, category_performance_report, match_quality_by_category, category_noise_report';
END $$;

COMMIT;
