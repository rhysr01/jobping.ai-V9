-- ============================================================================
-- REMOVE UNUSED INDEXES AND FIX RLS POLICY PERFORMANCE
-- ============================================================================
-- Removes indexes that are never used to improve write performance
-- Fixes RLS policy performance issues
-- ============================================================================

-- ============================================================================
-- WARNING: Verify indexes are actually unused before dropping!
-- ============================================================================
-- Check index usage with:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan;

-- ============================================================================
-- 1. REMOVE UNUSED INDEXES
-- ============================================================================

-- Drop unused indexes (verify they're unused first!)
-- These indexes have been reported as unused by Supabase advisors

-- City/Country indexes (if not being used in queries)
-- DROP INDEX IF EXISTS idx_jobs_city;
-- DROP INDEX IF EXISTS idx_jobs_country;

-- Location text index (if not being used)
-- DROP INDEX IF EXISTS idx_jobs_location_text;

-- Company name index (if not being used)
-- DROP INDEX IF EXISTS idx_jobs_company_name;

-- Job age index (if not being used)
-- DROP INDEX IF EXISTS idx_jobs_job_age;

-- Posted at index (if not being used)
-- DROP INDEX IF EXISTS idx_jobs_posted_at;

-- Text search indexes (if not being used)
-- DROP INDEX IF EXISTS idx_jobs_title_search;
-- DROP INDEX IF EXISTS idx_jobs_description_search;
-- DROP INDEX IF EXISTS idx_jobs_combined_search;

-- Composite indexes (if not being used)
-- DROP INDEX IF EXISTS idx_jobs_country_work_early;
-- DROP INDEX IF EXISTS idx_jobs_work_type_categories;
-- DROP INDEX IF EXISTS idx_jobs_early_career_work_type;

-- Embedding index (only drop if embeddings are not being used)
-- DROP INDEX IF EXISTS idx_jobs_embedding;

-- User preference indexes (if not being used)
-- DROP INDEX IF EXISTS idx_users_preference_embedding;
-- DROP INDEX IF EXISTS idx_users_career_keywords;
-- DROP INDEX IF EXISTS idx_users_remote_preference;
-- DROP INDEX IF EXISTS idx_users_company_size;
-- DROP INDEX IF EXISTS idx_users_industries;
-- DROP INDEX IF EXISTS idx_users_skills;

-- Match indexes (if not being used)
-- DROP INDEX IF EXISTS idx_matches_score;
-- DROP INDEX IF EXISTS idx_matches_user_score;

-- API key indexes (if not being used)
-- DROP INDEX IF EXISTS idx_api_key_usage_api_key_id;
-- DROP INDEX IF EXISTS idx_api_keys_user_id;

-- Category indexes (keep these - they're likely used!)
-- KEEP: idx_jobs_categories (GIN index for category filtering)
-- KEEP: idx_jobs_category_location (composite index for common queries)
-- KEEP: idx_jobs_active_recent (for active job queries)

-- ============================================================================
-- 2. VERIFY INDEX USAGE BEFORE DROPPING
-- ============================================================================

-- Run this query first to see which indexes are actually unused
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND (
      tablename IN ('jobs', 'users', 'matches', 'api_keys', 'api_key_usage') OR
      indexname LIKE 'idx_%'
  )
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

-- Only drop indexes with idx_scan = 0 (never used)
-- And verify they're not needed for foreign keys or unique constraints

-- ============================================================================
-- 3. SAFE INDEX REMOVAL (Only after verification)
-- ============================================================================

-- Example: Remove only confirmed unused indexes
-- Uncomment after verifying they're unused:

/*
-- Remove unused job indexes
DROP INDEX IF EXISTS public.idx_jobs_city;
DROP INDEX IF EXISTS public.idx_jobs_country;
DROP INDEX IF EXISTS public.idx_jobs_location_text;
DROP INDEX IF EXISTS public.idx_jobs_company_name;
DROP INDEX IF EXISTS public.idx_jobs_job_age;
DROP INDEX IF EXISTS public.idx_jobs_posted_at;
DROP INDEX IF EXISTS public.idx_jobs_title_search;
DROP INDEX IF EXISTS public.idx_jobs_description_search;
DROP INDEX IF EXISTS public.idx_jobs_combined_search;
DROP INDEX IF EXISTS public.idx_jobs_country_work_early;
DROP INDEX IF EXISTS public.idx_jobs_work_type_categories;
DROP INDEX IF EXISTS public.idx_jobs_early_career_work_type;

-- Remove unused user indexes
DROP INDEX IF EXISTS public.idx_users_career_keywords;
DROP INDEX IF EXISTS public.idx_users_remote_preference;
DROP INDEX IF EXISTS public.idx_users_company_size;
DROP INDEX IF EXISTS public.idx_users_industries;
DROP INDEX IF EXISTS public.idx_users_skills;

-- Remove unused match indexes
DROP INDEX IF EXISTS public.idx_matches_score;
DROP INDEX IF EXISTS public.idx_matches_user_score;

-- Remove unused API indexes
DROP INDEX IF EXISTS public.idx_api_key_usage_api_key_id;
DROP INDEX IF EXISTS public.idx_api_keys_user_id;
*/

-- ============================================================================
-- 4. RLS POLICY PERFORMANCE FIXES
-- ============================================================================

-- The promo_pending_select policy was already fixed in consolidate_rls_policies.sql
-- Verify it's using (SELECT auth.jwt()) instead of auth.jwt()

SELECT 
    'RLS Policy Performance' as check_type,
    tablename,
    policyname,
    qual as policy_condition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'promo_pending'
  AND policyname = 'promo_pending_select';

-- Should show: (email = (SELECT auth.jwt() ->> 'email')) OR (auth.role() = 'service_role')
-- If it shows auth.jwt() without SELECT, it needs to be fixed

-- ============================================================================
-- 5. VERIFY INDEX REMOVAL
-- ============================================================================

-- After removing indexes, verify they're gone
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('jobs', 'users', 'matches')
ORDER BY tablename, indexname;

