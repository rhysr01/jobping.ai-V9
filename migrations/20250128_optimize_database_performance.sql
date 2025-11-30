-- ============================================================================
-- DATABASE OPTIMIZATION MIGRATION
-- ============================================================================
-- Fixes performance and security issues identified by Supabase advisors:
-- 1. RLS policies with inefficient auth function calls
-- 2. Missing index on foreign key
-- 3. Unused indexes removal
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FIX RLS POLICIES - Wrap auth functions in SELECT subqueries
-- ============================================================================
-- This prevents re-evaluation of auth functions for each row, improving
-- query performance at scale. See:
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- USERS TABLE POLICIES
-- Fix users_select_policy
DROP POLICY IF EXISTS users_select_policy ON public.users;
CREATE POLICY users_select_policy
ON public.users
FOR SELECT
TO public
USING (
    ((SELECT auth.role()) = 'service_role') OR 
    (id = (SELECT auth.uid()))
);

-- Fix users_update_policy
DROP POLICY IF EXISTS users_update_policy ON public.users;
CREATE POLICY users_update_policy
ON public.users
FOR UPDATE
TO public
USING (
    ((SELECT auth.role()) = 'service_role') OR 
    (id = (SELECT auth.uid()))
)
WITH CHECK (
    ((SELECT auth.role()) = 'service_role') OR 
    (id = (SELECT auth.uid()))
);

-- Fix users_delete_policy
DROP POLICY IF EXISTS users_delete_policy ON public.users;
CREATE POLICY users_delete_policy
ON public.users
FOR DELETE
TO public
USING (
    ((SELECT auth.role()) = 'service_role') OR 
    (id = (SELECT auth.uid()))
);

-- MATCHES TABLE POLICIES
-- Fix matches_select_own
DROP POLICY IF EXISTS matches_select_own ON public.matches;
CREATE POLICY matches_select_own
ON public.matches
FOR SELECT
TO public
USING (
    (user_email = ((SELECT auth.jwt()) ->> 'email')) OR 
    ((SELECT auth.role()) = 'service_role')
);

-- PROMO_PENDING TABLE POLICIES
-- Fix promo_pending_select (auth.role() still needs SELECT wrapper)
DROP POLICY IF EXISTS promo_pending_select ON public.promo_pending;
CREATE POLICY promo_pending_select
ON public.promo_pending
FOR SELECT
TO public
USING (
    (email = ((SELECT auth.jwt()) ->> 'email')) OR 
    ((SELECT auth.role()) = 'service_role')
);

-- ============================================================================
-- 2. ADD MISSING INDEX ON FOREIGN KEY
-- ============================================================================
-- Foreign key embedding_queue.job_id_fkey needs a covering index for
-- optimal query performance

CREATE INDEX IF NOT EXISTS idx_embedding_queue_job_id 
ON public.embedding_queue(job_id);

-- ============================================================================
-- 3. REMOVE UNUSED INDEXES
-- ============================================================================
-- These indexes have never been used and consume storage/write performance
-- Remove them to improve database performance

-- Users table unused indexes
DROP INDEX IF EXISTS idx_users_career_keywords;
DROP INDEX IF EXISTS idx_users_preference_embedding;
DROP INDEX IF EXISTS idx_users_remote_preference;
DROP INDEX IF EXISTS idx_users_company_size;
DROP INDEX IF EXISTS idx_users_industries;
DROP INDEX IF EXISTS idx_users_skills;

-- Jobs table unused indexes
DROP INDEX IF EXISTS idx_jobs_categories_early_career;
DROP INDEX IF EXISTS idx_jobs_location_text;
DROP INDEX IF EXISTS idx_jobs_company_name;
DROP INDEX IF EXISTS idx_jobs_job_age;
DROP INDEX IF EXISTS idx_jobs_posted_at;
DROP INDEX IF EXISTS idx_jobs_title_search;
DROP INDEX IF EXISTS idx_jobs_description_search;
DROP INDEX IF EXISTS idx_jobs_combined_search;
DROP INDEX IF EXISTS idx_jobs_is_early_career;
DROP INDEX IF EXISTS idx_jobs_work_type_categories;
DROP INDEX IF EXISTS idx_jobs_early_career_work_type;

-- Matches table unused indexes
DROP INDEX IF EXISTS idx_matches_score;
DROP INDEX IF EXISTS idx_matches_user_score;

-- API keys table unused indexes
DROP INDEX IF EXISTS idx_api_key_usage_api_key_id;
DROP INDEX IF EXISTS idx_api_keys_user_id;

-- Email verification unused indexes
DROP INDEX IF EXISTS email_verification_requests_expires_idx;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the changes:

-- Check RLS policies are fixed
-- SELECT 
--     tablename,
--     policyname,
--     cmd,
--     qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('users', 'matches', 'promo_pending')
--   AND cmd IN ('SELECT', 'UPDATE', 'DELETE')
-- ORDER BY tablename, policyname;

-- Check index was created
-- SELECT 
--     schemaname,
--     tablename,
--     indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'embedding_queue'
--   AND indexname = 'idx_embedding_queue_job_id';

-- Check unused indexes are removed
-- SELECT 
--     schemaname,
--     tablename,
--     indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname IN (
--       'idx_users_career_keywords',
--       'idx_jobs_categories_early_career',
--       'idx_matches_score'
--   );

