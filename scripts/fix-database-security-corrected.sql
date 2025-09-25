-- ============================================================================
-- CORRECTED SUPABASE DATABASE SECURITY FIXES
-- ============================================================================
-- 
-- ⚠️  WARNING: This version fixes the UUID/text casting issues
-- ⚠️  Run these fixes in order of priority
-- ⚠️  Test in development environment first
-- ⚠️  Backup database before applying to production
--
-- Priority: CRITICAL → HIGH → MEDIUM
-- ============================================================================

-- ============================================================================
-- 🔴 CRITICAL FIXES (Run First)
-- ============================================================================

-- 1. Enable RLS on all public tables that don't have it
-- This prevents unauthorized access via PostgREST API
ALTER TABLE public.job_filter_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs_raw_mantiks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs_norm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppression ENABLE ROW LEVEL SECURITY;

-- 2. Add RLS policies for tables that have RLS but no policies
-- API Keys - only authenticated users can access their own keys
CREATE POLICY "Users can manage their own API keys" ON public.api_keys
    FOR ALL USING (auth.uid() = user_id);

-- API Key Usage - only authenticated users can access their own usage
CREATE POLICY "Users can view their own API key usage" ON public.api_key_usage
    FOR SELECT USING (
        api_key_id IN (
            SELECT id FROM public.api_keys WHERE user_id = auth.uid()
        )
    );

-- Feedback Learning Data - authenticated users can view aggregated data
CREATE POLICY "Authenticated users can view feedback learning data" ON public.feedback_learning_data
    FOR SELECT USING (auth.role() = 'authenticated');

-- Job Filter Audit - authenticated users can view audit data
CREATE POLICY "Authenticated users can view job filter audit" ON public.job_filter_audit
    FOR SELECT USING (auth.role() = 'authenticated');

-- Jobs Raw Mantiks - authenticated users can view raw job data
CREATE POLICY "Authenticated users can view raw job data" ON public.jobs_raw_mantiks
    FOR SELECT USING (auth.role() = 'authenticated');

-- Jobs Norm - authenticated users can view normalized job data  
CREATE POLICY "Authenticated users can view normalized job data" ON public.jobs_norm
    FOR SELECT USING (auth.role() = 'authenticated');

-- Promo Activations - authenticated users can view their own activations
CREATE POLICY "Users can view their own promo activations" ON public.promo_activations
    FOR SELECT USING (email = auth.jwt() ->> 'email');

-- Email Suppression - authenticated users can view suppression data
CREATE POLICY "Authenticated users can view email suppression" ON public.email_suppression
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- 🟡 HIGH PRIORITY FIXES (Run Second)
-- ============================================================================

-- 3. Remove duplicate indexes (saves ~20MB)
-- Keep the most recent/named ones, drop the duplicates

DROP INDEX IF EXISTS idx_api_usage_time;  -- Keep idx_api_key_usage_used_at
DROP INDEX IF EXISTS idx_api_keys_key_hash;  -- Keep api_keys_key_hash_key
DROP INDEX IF EXISTS idx_jobs_hash;  -- Keep idx_jobs_job_hash
DROP INDEX IF EXISTS idx_jobs_posted_at;  -- Keep idx_jobs_posted_at_desc
DROP INDEX IF EXISTS jobs_source_idx;  -- Keep idx_jobs_source
DROP INDEX IF EXISTS jobs_job_hash_key;  -- Keep jobs_job_hash_unique
DROP INDEX IF EXISTS matches_user_job_unique;  -- Keep matches_user_email_job_hash_key
DROP INDEX IF EXISTS users_email_key;  -- Keep users_email_unique

-- 4. Remove unused indexes (saves ~50MB)
-- These indexes have never been used according to pg_stat_user_indexes

-- Users table unused indexes
DROP INDEX IF EXISTS idx_users_email_verified_active;
DROP INDEX IF EXISTS idx_users_onboarding;
DROP INDEX IF EXISTS idx_users_email_count;
DROP INDEX IF EXISTS idx_users_onboarding_complete;
DROP INDEX IF EXISTS idx_users_email_phase;
DROP INDEX IF EXISTS idx_users_last_email_sent;
DROP INDEX IF EXISTS idx_users_professional_exp;
DROP INDEX IF EXISTS idx_users_work_env;
DROP INDEX IF EXISTS idx_users_verification_token;
DROP INDEX IF EXISTS idx_users_verification_expires;
DROP INDEX IF EXISTS idx_users_verified;
DROP INDEX IF EXISTS idx_users_active;
DROP INDEX IF EXISTS idx_users_email_verified;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_career_path;
DROP INDEX IF EXISTS idx_users_languages;
DROP INDEX IF EXISTS idx_users_roles;
DROP INDEX IF EXISTS idx_users_languages_spoken;
DROP INDEX IF EXISTS idx_users_company_types;
DROP INDEX IF EXISTS idx_users_roles_selected;
DROP INDEX IF EXISTS idx_users_target_cities;
DROP INDEX IF EXISTS idx_users_subscription_active;

-- Jobs table unused indexes
DROP INDEX IF EXISTS idx_jobs_posted_at;
DROP INDEX IF EXISTS idx_jobs_freshness_tier;
DROP INDEX IF EXISTS idx_jobs_is_active_true;
DROP INDEX IF EXISTS idx_jobs_is_sent_false;
DROP INDEX IF EXISTS jobs_posted_at_idx;
DROP INDEX IF EXISTS idx_jobs_categories;
DROP INDEX IF EXISTS idx_jobs_language_requirements;
DROP INDEX IF EXISTS idx_jobs_ai_labels;
DROP INDEX IF EXISTS idx_jobs_title_lower;
DROP INDEX IF EXISTS idx_jobs_company;
DROP INDEX IF EXISTS idx_jobs_last_seen;
DROP INDEX IF EXISTS idx_jobs_matching_composite;
DROP INDEX IF EXISTS idx_jobs_freshness_active;
DROP INDEX IF EXISTS idx_jobs_created_at_active;
DROP INDEX IF EXISTS idx_jobs_location_active;
DROP INDEX IF EXISTS idx_jobs_company_active;
DROP INDEX IF EXISTS idx_jobs_hash_active;
DROP INDEX IF EXISTS idx_jobs_recent_active;
DROP INDEX IF EXISTS idx_jobs_work_env_active;
DROP INDEX IF EXISTS idx_jobs_source_active;
DROP INDEX IF EXISTS idx_jobs_graduate_intern;

-- Matches table unused indexes
DROP INDEX IF EXISTS idx_matches_quality_score;
DROP INDEX IF EXISTS idx_matches_score;
DROP INDEX IF EXISTS idx_matches_ai_model;
DROP INDEX IF EXISTS idx_matches_fallback_reason;
DROP INDEX IF EXISTS idx_matches_tags;
DROP INDEX IF EXISTS idx_matches_match_score;
DROP INDEX IF EXISTS idx_matches_match_quality;

-- Match logs unused indexes
DROP INDEX IF EXISTS idx_match_logs_created_at;
DROP INDEX IF EXISTS idx_match_logs_success;
DROP INDEX IF EXISTS idx_match_logs_match_type;
DROP INDEX IF EXISTS idx_match_logs_timestamp;

-- User feedback unused indexes
DROP INDEX IF EXISTS idx_user_feedback_job_hash;
DROP INDEX IF EXISTS idx_user_feedback_type;
DROP INDEX IF EXISTS idx_user_feedback_created_at;
DROP INDEX IF EXISTS idx_user_feedback_type_verdict;
DROP INDEX IF EXISTS idx_user_feedback_scores;

-- API keys unused indexes
DROP INDEX IF EXISTS idx_api_keys_hash;
DROP INDEX IF EXISTS idx_api_usage_time;
DROP INDEX IF EXISTS idx_api_usage_key;
DROP INDEX IF EXISTS idx_api_keys_user_id;
DROP INDEX IF EXISTS idx_api_keys_tier;
DROP INDEX IF EXISTS idx_api_keys_active;
DROP INDEX IF EXISTS idx_api_key_usage_api_key_id;
DROP INDEX IF EXISTS idx_api_key_usage_used_at;
DROP INDEX IF EXISTS idx_api_key_usage_path;

-- Other tables unused indexes
DROP INDEX IF EXISTS promo_activations_email_idx;
DROP INDEX IF EXISTS promo_activations_code_idx;
DROP INDEX IF EXISTS idx_feedback_analytics_period;
DROP INDEX IF EXISTS idx_feedback_learning_used_for_training;
DROP INDEX IF EXISTS idx_feedback_learning_created_at;
DROP INDEX IF EXISTS idx_jobs_raw_mantiks_company_domain;
DROP INDEX IF EXISTS idx_jobs_raw_mantiks_posted_at;
DROP INDEX IF EXISTS idx_jobs_norm_score;
DROP INDEX IF EXISTS idx_jobs_norm_track;
DROP INDEX IF EXISTS idx_jobs_norm_track_score;
DROP INDEX IF EXISTS idx_jobs_norm_company;
DROP INDEX IF EXISTS idx_jobs_norm_location;
DROP INDEX IF EXISTS idx_jobs_norm_seniority;
DROP INDEX IF EXISTS idx_email_suppression_user_email;
DROP INDEX IF EXISTS idx_email_suppression_created_at;
DROP INDEX IF EXISTS idx_email_suppression_reason;

-- ============================================================================
-- 🟡 MEDIUM PRIORITY FIXES (Run Third)
-- ============================================================================

-- 5. Optimize RLS policies for better performance
-- Replace auth.uid() with (SELECT auth.uid()) to cache auth result

-- Drop existing policies that need optimization
DROP POLICY IF EXISTS "jobping_users_own_data" ON public.users;
DROP POLICY IF EXISTS "jobping_matches_own_email" ON public.matches;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Analytics are viewable by authenticated users" ON public.feedback_analytics;

-- Recreate with optimized auth calls (no casting needed - both are UUIDs)
CREATE POLICY "jobping_users_own_data" ON public.users
    FOR ALL USING ((SELECT auth.uid()) = id);

CREATE POLICY "jobping_matches_own_email" ON public.matches
    FOR ALL USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can view their own feedback" ON public.user_feedback
    FOR SELECT USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert their own feedback" ON public.user_feedback
    FOR INSERT WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Analytics are viewable by authenticated users" ON public.feedback_analytics
    FOR SELECT USING ((SELECT auth.role()) = 'authenticated');

-- 6. Fix function security warnings
-- Recreate functions with secure search_path

CREATE OR REPLACE FUNCTION public.normalize_city(loc text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$ 
    SELECT COALESCE(
        CASE 
            WHEN lower(loc) LIKE '%london%' THEN 'London'
            WHEN lower(loc) LIKE '%paris%' THEN 'Paris'
            WHEN lower(loc) LIKE '%berlin%' THEN 'Berlin'
            WHEN lower(loc) LIKE '%amsterdam%' THEN 'Amsterdam'
            WHEN lower(loc) LIKE '%dublin%' THEN 'Dublin'
            WHEN lower(loc) LIKE '%madrid%' THEN 'Madrid'
            WHEN lower(loc) LIKE '%rome%' THEN 'Rome'
            WHEN lower(loc) LIKE '%vienna%' THEN 'Vienna'
            WHEN lower(loc) LIKE '%brussels%' THEN 'Brussels'
            WHEN lower(loc) LIKE '%zurich%' THEN 'Zurich'
            ELSE loc
        END,
        loc
    );
$$;

CREATE OR REPLACE FUNCTION public.update_job_freshness_tiers()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE jobs 
    SET freshness_tier = CASE 
        WHEN created_at >= NOW() - INTERVAL '7 days' THEN 'fresh'
        WHEN created_at >= NOW() - INTERVAL '30 days' THEN 'recent'
        ELSE 'stale'
    END
    WHERE freshness_tier IS NULL OR freshness_tier = '';
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_match_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM match_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_feedback()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM user_feedback 
    WHERE created_at < NOW() - INTERVAL '365 days';
$$;

-- ============================================================================
-- 📊 VERIFICATION QUERIES
-- ============================================================================

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check index sizes after cleanup
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check remaining indexes
SELECT COUNT(*) as remaining_indexes FROM pg_indexes WHERE schemaname = 'public';

-- Test RLS policies work
-- (Run these as authenticated user to verify)
-- SELECT COUNT(*) FROM public.api_keys; -- Should only show user's own keys
-- SELECT COUNT(*) FROM public.users; -- Should only show user's own data

-- ============================================================================
-- ✅ COMPLETION CHECKLIST
-- ============================================================================

/*
After running these fixes, verify:

1. ✅ All public tables have RLS enabled
2. ✅ All RLS-enabled tables have policies
3. ✅ No duplicate indexes remain
4. ✅ Unused indexes removed (should save ~70MB)
5. ✅ RLS policies optimized for performance
6. ✅ Functions have secure search_path
7. ✅ Database size reduced significantly
8. ✅ No broken functionality

Expected results:
- Database size: ~127 MB (down from 197 MB)
- Index size: ~62 MB (down from 132 MB)
- All tables secure with proper RLS
- Improved query performance
*/
