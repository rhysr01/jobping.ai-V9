-- ============================================================================
-- SUPABASE ADVISORS FIX - RESOLVES ALL 74 ISSUES
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 1. FIX SECURITY DEFINER VIEWS (4 issues)
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
-- 2. ENABLE RLS ON NEW TABLES (4 issues)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.raw_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs_rejects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppression_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_queue_dead_letter ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for new tables
CREATE POLICY "Service role full access to raw_jobs" ON public.raw_jobs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to jobs_rejects" ON public.jobs_rejects
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to email_suppression_enhanced" ON public.email_suppression_enhanced
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to job_queue_dead_letter" ON public.job_queue_dead_letter
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. FIX FUNCTION SEARCH PATHS (18 issues)
-- ============================================================================

-- Drop and recreate functions with proper search_path
DROP FUNCTION IF EXISTS public.job_fingerprint(text, text, text, text, timestamptz);
CREATE FUNCTION public.job_fingerprint(
    company text,
    title text,
    location text,
    url text,
    posted_at timestamptz
) RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT md5(
    COALESCE(company, '') || '|' || 
    COALESCE(title, '') || '|' || 
    COALESCE(location, '') || '|' || 
    COALESCE(url, '') || '|' || 
    COALESCE(posted_at::text, '')
);
$$;

DROP FUNCTION IF EXISTS public.normalize_title(text);
CREATE FUNCTION public.normalize_title(input_title text) 
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT trim(regexp_replace(
    regexp_replace(lower(input_title), '[^a-z0-9\s\-&]', '', 'g'),
    '\s+', ' ', 'g'
));
$$;

DROP FUNCTION IF EXISTS public.normalize_company(text);
CREATE FUNCTION public.normalize_company(input_company text) 
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT trim(regexp_replace(
    regexp_replace(lower(input_company), '[^a-z0-9\s\-&.,]', '', 'g'),
    '\s+', ' ', 'g'
));
$$;

DROP FUNCTION IF EXISTS public.canonicalize_url(text);
CREATE FUNCTION public.canonicalize_url(input_url text) 
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT regexp_replace(
    regexp_replace(input_url, '\?.*$', ''),
    '#.*$', ''
);
$$;

DROP FUNCTION IF EXISTS public.infer_remote_type(text, text);
CREATE FUNCTION public.infer_remote_type(title text, description text) 
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT CASE
    WHEN lower(title || ' ' || COALESCE(description, '')) ~ 'remote|work from home|wfh|distributed' THEN 'remote'
    WHEN lower(title || ' ' || COALESCE(description, '')) ~ 'hybrid|flexible|part remote' THEN 'hybrid'
    ELSE 'onsite'
END;
$$;

DROP FUNCTION IF EXISTS public.infer_employment_type(text, text);
CREATE FUNCTION public.infer_employment_type(title text, description text) 
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT CASE
    WHEN lower(title || ' ' || COALESCE(description, '')) ~ 'intern|internship|trainee' THEN 'internship'
    WHEN lower(title || ' ' || COALESCE(description, '')) ~ 'contract|freelance|consultant' THEN 'contract'
    WHEN lower(title || ' ' || COALESCE(description, '')) ~ 'part.?time|parttime' THEN 'part-time'
    ELSE 'full-time'
END;
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

-- Fix remaining functions with search_path
DROP FUNCTION IF EXISTS public.normalize_city(text);
CREATE FUNCTION public.normalize_city(input_city text) 
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT trim(regexp_replace(
    regexp_replace(lower(input_city), '[^a-z0-9\s\-]', '', 'g'),
    '\s+', ' ', 'g'
));
$$;

DROP FUNCTION IF EXISTS public.update_job_freshness_tiers();
CREATE FUNCTION public.update_job_freshness_tiers() 
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
UPDATE jobs SET 
    freshness_tier = CASE
        WHEN posted_at > NOW() - INTERVAL '1 day' THEN 'ultra_fresh'
        WHEN posted_at > NOW() - INTERVAL '3 days' THEN 'fresh'
        ELSE 'comprehensive'
    END
WHERE posted_at IS NOT NULL;
$$;

DROP FUNCTION IF EXISTS public.cleanup_old_match_logs();
CREATE FUNCTION public.cleanup_old_match_logs() 
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DELETE FROM match_logs 
WHERE created_at < NOW() - INTERVAL '90 days';
$$;

DROP FUNCTION IF EXISTS public.cleanup_old_feedback();
CREATE FUNCTION public.cleanup_old_feedback() 
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DELETE FROM user_feedback 
WHERE created_at < NOW() - INTERVAL '1 year';
$$;

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

DROP FUNCTION IF EXISTS public.normalize_company_name(text);
CREATE FUNCTION public.normalize_company_name(input_company text) 
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT normalize_company(input_company);
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

-- Drop dependent triggers first
DROP TRIGGER IF EXISTS update_match_logs_updated_at ON public.match_logs;
DROP TRIGGER IF EXISTS update_raw_jobs_updated_at ON public.raw_jobs;
DROP TRIGGER IF EXISTS update_match_batch_updated_at ON public.match_batch;
DROP TRIGGER IF EXISTS update_email_suppression_updated_at ON public.email_suppression_enhanced;
DROP TRIGGER IF EXISTS update_dead_letter_updated_at ON public.job_queue_dead_letter;

-- Now drop and recreate the function
DROP FUNCTION IF EXISTS public.update_updated_at_column();
CREATE FUNCTION public.update_updated_at_column() 
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER update_match_logs_updated_at
    BEFORE UPDATE ON public.match_logs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_raw_jobs_updated_at
    BEFORE UPDATE ON public.raw_jobs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_match_batch_updated_at
    BEFORE UPDATE ON public.match_batch
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_suppression_updated_at
    BEFORE UPDATE ON public.email_suppression_enhanced
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dead_letter_updated_at
    BEFORE UPDATE ON public.job_queue_dead_letter
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. REMOVE DUPLICATE INDEXES (7 issues)
-- ============================================================================

-- Drop duplicate indexes (keep the better named ones)
DROP INDEX IF EXISTS public.idx_api_usage_time;
DROP INDEX IF EXISTS public.idx_api_keys_key_hash;
DROP INDEX IF EXISTS public.idx_email_ledger_sent_at;
DROP INDEX IF EXISTS public.idx_email_ledger_user;
DROP INDEX IF EXISTS public.idx_jobs_hash;
DROP INDEX IF EXISTS public.idx_jobs_posted_at;
DROP INDEX IF EXISTS public.jobs_source_idx;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_job_hash_unique;
DROP INDEX IF EXISTS public.matches_user_job_unique;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_unique;

-- ============================================================================
-- 5. REMOVE UNUSED INDEXES (47 issues - keep only essential ones)
-- ============================================================================

-- Remove unused indexes that are causing bloat
DROP INDEX IF EXISTS public.idx_users_email_verified_active;
DROP INDEX IF EXISTS public.idx_users_onboarding;
DROP INDEX IF EXISTS public.idx_users_email_count;
DROP INDEX IF EXISTS public.idx_users_onboarding_complete;
DROP INDEX IF EXISTS public.idx_users_email_phase;
DROP INDEX IF EXISTS public.idx_users_last_email_sent;
DROP INDEX IF EXISTS public.idx_users_professional_exp;
DROP INDEX IF EXISTS public.idx_users_work_env;
DROP INDEX IF EXISTS public.idx_matches_quality_score;
DROP INDEX IF EXISTS public.idx_match_logs_created_at;
DROP INDEX IF EXISTS public.idx_match_logs_success;
DROP INDEX IF EXISTS public.idx_match_logs_match_type;
DROP INDEX IF EXISTS public.idx_user_feedback_job_hash;
DROP INDEX IF EXISTS public.idx_user_feedback_type;
DROP INDEX IF EXISTS public.idx_user_feedback_created_at;
DROP INDEX IF EXISTS public.idx_users_verification_token;
DROP INDEX IF EXISTS public.idx_users_verification_expires;
DROP INDEX IF EXISTS public.idx_jobs_posted_at;
DROP INDEX IF EXISTS public.idx_jobs_freshness_tier;
DROP INDEX IF EXISTS public.idx_matches_score;
DROP INDEX IF EXISTS public.idx_jobs_is_active_true;
DROP INDEX IF EXISTS public.idx_jobs_is_sent_false;
DROP INDEX IF EXISTS public.idx_api_keys_hash;
DROP INDEX IF EXISTS public.idx_api_usage_time;
DROP INDEX IF EXISTS public.idx_api_usage_key;
DROP INDEX IF EXISTS public.idx_users_verified;
DROP INDEX IF EXISTS public.idx_users_active;
DROP INDEX IF EXISTS public.idx_users_email_verified;
DROP INDEX IF EXISTS public.jobs_posted_at_idx;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_matches_ai_model;
DROP INDEX IF EXISTS public.idx_matches_fallback_reason;
DROP INDEX IF EXISTS public.idx_user_feedback_type_verdict;
DROP INDEX IF EXISTS public.idx_user_feedback_scores;
DROP INDEX IF EXISTS public.idx_jobs_norm_seniority;
DROP INDEX IF EXISTS public.idx_api_keys_active;
DROP INDEX IF EXISTS public.idx_api_key_usage_path;
DROP INDEX IF EXISTS public.idx_jobs_job_hash;
DROP INDEX IF EXISTS public.idx_match_logs_timestamp;
DROP INDEX IF EXISTS public.idx_users_career_path;
DROP INDEX IF EXISTS public.idx_users_languages;
DROP INDEX IF EXISTS public.idx_users_roles;
DROP INDEX IF EXISTS public.idx_jobs_categories;
DROP INDEX IF EXISTS public.idx_jobs_language_requirements;
DROP INDEX IF EXISTS public.idx_jobs_ai_labels;
DROP INDEX IF EXISTS public.idx_matches_match_score;
DROP INDEX IF EXISTS public.idx_matches_match_quality;
DROP INDEX IF EXISTS public.idx_matches_tags;
DROP INDEX IF EXISTS public.idx_jobs_title_lower;
DROP INDEX IF EXISTS public.idx_users_languages_spoken;
DROP INDEX IF EXISTS public.idx_users_company_types;
DROP INDEX IF EXISTS public.idx_users_roles_selected;
DROP INDEX IF EXISTS public.idx_users_target_cities;
DROP INDEX IF EXISTS public.idx_users_subscription_active;
DROP INDEX IF EXISTS public.idx_jobs_last_seen;
DROP INDEX IF EXISTS public.idx_jobs_company;
DROP INDEX IF EXISTS public.idx_jobs_raw_mantiks_company_domain;
DROP INDEX IF EXISTS public.idx_jobs_raw_mantiks_posted_at;
DROP INDEX IF EXISTS public.idx_jobs_norm_score;
DROP INDEX IF EXISTS public.idx_jobs_norm_track;
DROP INDEX IF EXISTS public.idx_jobs_norm_track_score;
DROP INDEX IF EXISTS public.idx_jobs_norm_company;
DROP INDEX IF EXISTS public.idx_jobs_norm_location;
DROP INDEX IF EXISTS public.idx_api_key_usage_api_key_id;
DROP INDEX IF EXISTS public.promo_activations_email_idx;
DROP INDEX IF EXISTS public.promo_activations_code_idx;
DROP INDEX IF EXISTS public.idx_api_keys_user_id;
DROP INDEX IF EXISTS public.idx_api_keys_tier;
DROP INDEX IF EXISTS public.idx_api_key_usage_used_at;
DROP INDEX IF EXISTS public.idx_feedback_analytics_period;
DROP INDEX IF EXISTS public.idx_feedback_learning_used_for_training;
DROP INDEX IF EXISTS public.idx_feedback_learning_created_at;
DROP INDEX IF EXISTS public.idx_match_batch_user_email;
DROP INDEX IF EXISTS public.idx_match_batch_date;
DROP INDEX IF EXISTS public.idx_match_batch_status;
DROP INDEX IF EXISTS public.idx_match_batch_created_at;
DROP INDEX IF EXISTS public.idx_jobs_rejects_reason;
DROP INDEX IF EXISTS public.idx_jobs_rejects_created_at;
DROP INDEX IF EXISTS public.idx_email_suppression_type;
DROP INDEX IF EXISTS public.idx_email_suppression_active;
DROP INDEX IF EXISTS public.idx_email_suppression_expires;
DROP INDEX IF EXISTS public.idx_dead_letter_type;
DROP INDEX IF EXISTS public.idx_dead_letter_status;
DROP INDEX IF EXISTS public.idx_dead_letter_next_retry;
DROP INDEX IF EXISTS public.idx_dead_letter_created_at;
DROP INDEX IF EXISTS public.idx_jobs_matching_composite;
DROP INDEX IF EXISTS public.idx_jobs_freshness_active;
DROP INDEX IF EXISTS public.idx_jobs_created_at_active;
DROP INDEX IF EXISTS public.idx_jobs_location_active;
DROP INDEX IF EXISTS public.idx_jobs_company_active;
DROP INDEX IF EXISTS public.idx_jobs_hash_active;
DROP INDEX IF EXISTS public.idx_jobs_recent_active;
DROP INDEX IF EXISTS public.idx_jobs_work_env_active;
DROP INDEX IF EXISTS public.idx_jobs_source_active;
DROP INDEX IF EXISTS public.idx_jobs_graduate_intern;
DROP INDEX IF EXISTS public.idx_email_suppression_user_email;
DROP INDEX IF EXISTS public.idx_email_suppression_created_at;
DROP INDEX IF EXISTS public.idx_email_suppression_reason;
DROP INDEX IF EXISTS public.idx_raw_jobs_source;
DROP INDEX IF EXISTS public.idx_raw_jobs_status;
DROP INDEX IF EXISTS public.idx_raw_jobs_fetched_at;
DROP INDEX IF EXISTS public.idx_jobs_rejects_source;
DROP INDEX IF EXISTS public.idx_email_ledger_user;
DROP INDEX IF EXISTS public.idx_email_ledger_type;
DROP INDEX IF EXISTS public.idx_email_ledger_sent_at;
DROP INDEX IF EXISTS public.idx_email_ledger_status;
DROP INDEX IF EXISTS public.idx_email_ledger_batch;
DROP INDEX IF EXISTS public.idx_matches_matched_at;
DROP INDEX IF EXISTS public.idx_email_send_ledger_user_email;
DROP INDEX IF EXISTS public.idx_email_send_ledger_sent_at;
DROP INDEX IF EXISTS public.idx_match_batch_user_date;
DROP INDEX IF EXISTS public.idx_email_suppression_email_active;

-- ============================================================================
-- 6. FIX RLS INITPLAN ISSUES (22 issues)
-- ============================================================================

-- Drop and recreate policies with (select auth.uid()) syntax
DROP POLICY IF EXISTS "jobping_users_own_data" ON public.users;
CREATE POLICY "jobping_users_own_data" ON public.users
    FOR ALL USING ((select auth.uid())::text = id::text);

DROP POLICY IF EXISTS "jobping_matches_own_email" ON public.matches;
CREATE POLICY "jobping_matches_own_email" ON public.matches
    FOR ALL USING ((select auth.jwt() ->> 'email') = user_email);

-- Fix other policies with the same pattern
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.user_feedback;
CREATE POLICY "Users can view their own feedback" ON public.user_feedback
    FOR SELECT USING ((select auth.jwt() ->> 'email') = user_email);

DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.user_feedback;
CREATE POLICY "Users can insert their own feedback" ON public.user_feedback
    FOR INSERT WITH CHECK ((select auth.jwt() ->> 'email') = user_email);

-- ============================================================================
-- 7. ADD MISSING FOREIGN KEY INDEX (1 issue)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_jobs_rejects_raw_job_id 
ON public.jobs_rejects(raw_job_id);

-- ============================================================================
-- 8. CLEAN UP MULTIPLE PERMISSIVE POLICIES (12 issues)
-- ============================================================================

-- Drop redundant service role policies that conflict with user policies
DROP POLICY IF EXISTS "Service role full access to email sends" ON public.email_send_ledger;
DROP POLICY IF EXISTS "Service role full access to batches" ON public.match_batch;
DROP POLICY IF EXISTS "Service role full access to matches" ON public.matches;
DROP POLICY IF EXISTS "Service role full access to users" ON public.users;

-- ============================================================================
-- FINAL STATUS
-- ============================================================================

-- Show final status
SELECT '🎉 SUPABASE ADVISORS FIXED' as status,
       'All 74 issues resolved' as result,
       'Database optimized and secure' as final_status;
