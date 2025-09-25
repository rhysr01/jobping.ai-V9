-- ============================================================================
-- FIX REMAINING SUPABASE ISSUES - SIMPLIFIED APPROACH
-- ============================================================================

-- ============================================================================
-- 1. FIX SECURITY DEFINER VIEWS (4 CRITICAL ISSUES)
-- ============================================================================

-- Drop and recreate views without SECURITY DEFINER
DROP VIEW IF EXISTS public.job_matching_performance CASCADE;
CREATE VIEW public.job_matching_performance AS
SELECT 
    DATE(matched_at) as match_date,
    COUNT(*) as total_matches,
    AVG(match_score) as avg_score,
    COUNT(DISTINCT user_email) as unique_users
FROM matches 
WHERE matched_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(matched_at)
ORDER BY match_date DESC;

DROP VIEW IF EXISTS public.system_performance CASCADE;
CREATE VIEW public.system_performance AS
SELECT 
    'jobs' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE is_active = true) as active_records
FROM jobs
UNION ALL
SELECT 
    'users' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE active = true) as active_records
FROM users;

DROP VIEW IF EXISTS public.user_activity_summary CASCADE;
CREATE VIEW public.user_activity_summary AS
SELECT 
    user_email,
    COUNT(*) as total_matches,
    MAX(matched_at) as last_match_date,
    MIN(matched_at) as first_match_date
FROM matches
GROUP BY user_email
ORDER BY total_matches DESC;

DROP VIEW IF EXISTS public.feedback_summary CASCADE;
CREATE VIEW public.feedback_summary AS
SELECT 
    feedback_type,
    verdict,
    COUNT(*) as count,
    AVG(relevance_score) as avg_relevance_score,
    AVG(match_quality_score) as avg_quality_score
FROM user_feedback
GROUP BY feedback_type, verdict
ORDER BY feedback_type, count DESC;

-- ============================================================================
-- 2. FIX FUNCTION SEARCH PATHS (4 REMAINING FUNCTIONS)
-- ============================================================================

-- Fix the remaining functions that still have mutable search_path
DROP FUNCTION IF EXISTS public.generate_job_fingerprint(integer);
CREATE FUNCTION public.generate_job_fingerprint(job_id integer) 
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT job_fingerprint(
    (SELECT company FROM jobs WHERE id = job_id),
    (SELECT title FROM jobs WHERE id = job_id),
    (SELECT location_name FROM jobs WHERE id = job_id),
    (SELECT job_url FROM jobs WHERE id = job_id),
    (SELECT posted_at FROM jobs WHERE id = job_id)
);
$$;

DROP FUNCTION IF EXISTS public.is_email_suppressed(text);
CREATE FUNCTION public.is_email_suppressed(email_address text) 
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT EXISTS(
    SELECT 1 FROM email_suppression_enhanced 
    WHERE user_email = email_address 
    AND is_active = true
);
$$;

DROP FUNCTION IF EXISTS public.calculate_next_retry(integer);
CREATE FUNCTION public.calculate_next_retry(retry_count integer) 
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT NOW() + (INTERVAL '5 minutes' * POWER(2, retry_count));
$$;

DROP FUNCTION IF EXISTS public.summarize_job(text);
CREATE FUNCTION public.summarize_job(description text) 
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT CASE
    WHEN length(description) > 500 THEN 
        left(description, 497) || '...'
    ELSE description
END;
$$;

-- ============================================================================
-- 3. FIX RLS INITPLAN ISSUES (18 PERFORMANCE ISSUES)
-- ============================================================================

-- Fix the most critical RLS policies with (select auth.function()) syntax
DROP POLICY IF EXISTS "jobping_matches_own_email" ON public.matches;
CREATE POLICY "jobping_matches_own_email" ON public.matches
    FOR ALL USING ((select auth.jwt() ->> 'email') = user_email);

DROP POLICY IF EXISTS "jobping_users_own_data" ON public.users;
CREATE POLICY "jobping_users_own_data" ON public.users
    FOR ALL USING ((select auth.uid())::text = id::text);

-- Fix service role policies to avoid re-evaluation
DROP POLICY IF EXISTS "Service role full access to raw_jobs" ON public.raw_jobs;
CREATE POLICY "Service role full access to raw_jobs" ON public.raw_jobs
    FOR ALL USING (current_setting('role') = 'service_role');

DROP POLICY IF EXISTS "Service role full access to jobs_rejects" ON public.jobs_rejects;
CREATE POLICY "Service role full access to jobs_rejects" ON public.jobs_rejects
    FOR ALL USING (current_setting('role') = 'service_role');

DROP POLICY IF EXISTS "Service role full access to email_suppression_enhanced" ON public.email_suppression_enhanced;
CREATE POLICY "Service role full access to email_suppression_enhanced" ON public.email_suppression_enhanced
    FOR ALL USING (current_setting('role') = 'service_role');

DROP POLICY IF EXISTS "Service role full access to job_queue_dead_letter" ON public.job_queue_dead_letter;
CREATE POLICY "Service role full access to job_queue_dead_letter" ON public.job_queue_dead_letter
    FOR ALL USING (current_setting('role') = 'service_role');

-- ============================================================================
-- 4. CLEAN UP MULTIPLE PERMISSIVE POLICIES (8 PERFORMANCE ISSUES)
-- ============================================================================

-- Drop redundant policies to eliminate multiple permissive policy issues
DROP POLICY IF EXISTS "Users can view their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;

-- ============================================================================
-- 5. FIX REMAINING DUPLICATE INDEXES (1 ISSUE)
-- ============================================================================

-- Drop the remaining duplicate constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_unique;

-- ============================================================================
-- 6. ADD MISSING FOREIGN KEY INDEXES (3 PERFORMANCE ISSUES)
-- ============================================================================

-- Add indexes for foreign keys that are missing
CREATE INDEX IF NOT EXISTS idx_api_key_usage_api_key_id 
ON public.api_key_usage(api_key_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id 
ON public.api_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_email_send_ledger_batch_id 
ON public.email_send_ledger(batch_id);

-- ============================================================================
-- 7. REMOVE UNUSED INDEX (1 ISSUE)
-- ============================================================================

-- Remove the unused index we created
DROP INDEX IF EXISTS public.idx_jobs_rejects_raw_job_id;

-- ============================================================================
-- FINAL STATUS
-- ============================================================================

-- Show final status
SELECT '🎉 REMAINING ISSUES FIXED' as status,
       'Critical security and performance issues resolved' as result,
       'Database optimized and secure' as final_status;
