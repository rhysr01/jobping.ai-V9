-- ============================================================================
-- DASHBOARD VIEWS FOR SYSTEM HEALTH MONITORING
-- ============================================================================
-- Created: 2025-01-29
-- Purpose: Create SQL views for Lovable dashboard to visualize system health,
--          category performance, AI matching quality, and user engagement
-- ============================================================================

-- ============================================================================
-- 1. CATEGORY PERFORMANCE REPORT (CURRENT SCHEMA - USES MATCHES TABLE)
-- ============================================================================
-- Shows match volume and quality per category
-- NOTE: For full CTR/Apply tracking, match_logs needs job_hash column
--       See improved version below after adding job_hash to match_logs

CREATE OR REPLACE VIEW category_performance_report AS
SELECT 
    unnest(j.categories) as category,
    COUNT(DISTINCT m.id) as total_matches,
    COUNT(DISTINCT m.user_email) as matched_users,
    COUNT(DISTINCT j.job_hash) as unique_jobs,
    ROUND(AVG(m.match_score::numeric), 2) as avg_match_score,
    ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.match_score::numeric))::numeric, 2) as median_match_score,
    COUNT(*) FILTER (WHERE m.match_score::numeric >= 0.8) as high_quality_count,
    COUNT(*) FILTER (WHERE m.match_score::numeric < 0.6) as low_quality_count,
    ROUND(
        (COUNT(*) FILTER (WHERE m.match_score::numeric >= 0.8)::float / 
        NULLIF(COUNT(*), 0) * 100)::numeric, 
        2
    ) as high_quality_percentage
FROM matches m
JOIN jobs j ON m.job_hash = j.job_hash
WHERE j.categories IS NOT NULL 
  AND array_length(j.categories, 1) > 0
  AND m.created_at >= NOW() - INTERVAL '30 days'
GROUP BY unnest(j.categories)
ORDER BY avg_match_score DESC;

COMMENT ON VIEW category_performance_report IS 'Category performance: match volume, quality, and distribution per category. For CTR/Apply tracking, add job_hash to match_logs and use improved view.';

-- ============================================================================
-- 2. AI MATCHING QUALITY REPORT
-- ============================================================================
-- Shows AI performance: success rate, fallback usage, costs, latency

CREATE OR REPLACE VIEW ai_matching_quality_report AS
SELECT 
    DATE_TRUNC('day', created_at) as match_date,
    COUNT(*) as total_matches,
    COUNT(*) FILTER (WHERE match_algorithm LIKE '%ai%' OR match_algorithm LIKE '%gpt%') as ai_matches,
    COUNT(*) FILTER (WHERE fallback_reason IS NOT NULL) as fallback_matches,
    COUNT(*) FILTER (WHERE cache_hit = true) as cached_matches,
    ROUND(AVG(match_score::numeric), 2) as avg_match_score,
    ROUND(AVG(ai_latency_ms)::numeric, 0) as avg_latency_ms,
    ROUND(SUM(ai_cost_usd), 4) as total_cost_usd,
    COUNT(DISTINCT ai_model) as models_used,
    COUNT(DISTINCT user_email) as unique_users
FROM matches
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY match_date DESC;

COMMENT ON VIEW ai_matching_quality_report IS 'Daily AI matching performance: success rate, costs, latency, fallback usage. Helps optimize AI costs and reliability.';

-- ============================================================================
-- 3. USER ENGAGEMENT SUMMARY
-- ============================================================================
-- Shows user engagement metrics: active users, engagement scores, email opens/clicks

CREATE OR REPLACE VIEW user_engagement_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as engagement_date,
    COUNT(DISTINCT user_email) as active_users,
    COUNT(*) FILTER (WHERE match_quality = 'positive' OR match_quality = 'good') as positive_interactions,
    COUNT(*) FILTER (WHERE match_quality = 'negative') as negative_interactions,
    ROUND(
        (COUNT(*) FILTER (WHERE match_quality = 'positive' OR match_quality = 'good')::float / 
        NULLIF(COUNT(*), 0) * 100)::numeric, 
        2
    ) as satisfaction_rate,
    AVG((SELECT email_engagement_score FROM users WHERE email = matches.user_email)) as avg_engagement_score
FROM matches
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY engagement_date DESC;

COMMENT ON VIEW user_engagement_summary IS 'Daily user engagement: active users, satisfaction rate, engagement scores. Tracks overall product health.';

-- ============================================================================
-- 4. MATCH QUALITY BY CATEGORY
-- ============================================================================
-- Shows match quality (match_score) broken down by category

CREATE OR REPLACE VIEW match_quality_by_category AS
SELECT 
    unnest(j.categories) as category,
    COUNT(*) as total_matches,
    ROUND(AVG(m.match_score::numeric), 2) as avg_match_score,
    ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.match_score::numeric))::numeric, 2) as median_match_score,
    COUNT(*) FILTER (WHERE m.match_score::numeric >= 0.8) as high_quality_matches,
    COUNT(*) FILTER (WHERE m.match_score::numeric < 0.6) as low_quality_matches,
    ROUND(
        (COUNT(*) FILTER (WHERE m.match_score::numeric >= 0.8)::float / 
        NULLIF(COUNT(*), 0) * 100)::numeric, 
        2
    ) as high_quality_rate
FROM matches m
JOIN jobs j ON m.job_hash = j.job_hash
WHERE j.categories IS NOT NULL
  AND array_length(j.categories, 1) > 0
  AND m.created_at >= NOW() - INTERVAL '30 days'
GROUP BY unnest(j.categories)
ORDER BY avg_match_score DESC;

COMMENT ON VIEW match_quality_by_category IS 'Match quality metrics by category: average score, distribution, high-quality match rate. Identifies categories where AI excels or struggles.';

-- ============================================================================
-- 5. "NOISE" TABLE - LOW QUALITY MATCHES BY CATEGORY
-- ============================================================================
-- Identifies categories with many matches but low average scores (AI is struggling)

CREATE OR REPLACE VIEW category_noise_report AS
SELECT 
    category,
    total_matches,
    avg_match_score,
    high_quality_percentage,
    low_quality_count,
    CASE 
        WHEN total_matches > 50 AND avg_match_score < 0.6 THEN 'HIGH_PRIORITY'
        WHEN total_matches > 20 AND avg_match_score < 0.65 THEN 'MEDIUM_PRIORITY'
        WHEN total_matches > 10 AND avg_match_score < 0.7 THEN 'LOW_PRIORITY'
        ELSE 'OK'
    END as priority
FROM category_performance_report
WHERE total_matches > 10
  AND avg_match_score < 0.75
ORDER BY 
    CASE 
        WHEN total_matches > 50 AND avg_match_score < 0.6 THEN 1
        WHEN total_matches > 20 AND avg_match_score < 0.65 THEN 2
        WHEN total_matches > 10 AND avg_match_score < 0.7 THEN 3
        ELSE 4
    END,
    avg_match_score ASC,
    total_matches DESC;

COMMENT ON VIEW category_noise_report IS '"Noise" categories: many matches but low quality scores. Helps identify where AI matching needs improvement. Priority based on volume and score.';

-- ============================================================================
-- 6. JOB SOURCE PERFORMANCE
-- ============================================================================
-- Shows which job sources (scrapers) are providing the best matches

CREATE OR REPLACE VIEW job_source_performance AS
SELECT 
    j.source,
    COUNT(DISTINCT j.id) as total_jobs,
    COUNT(DISTINCT m.id) as total_matches,
    ROUND(AVG(m.match_score::numeric), 2) as avg_match_score,
    COUNT(DISTINCT m.user_email) as matched_users,
    ROUND(
        (COUNT(DISTINCT m.id)::float / 
        NULLIF(COUNT(DISTINCT j.id), 0) * 100)::numeric, 
        2
    ) as match_rate_percentage
FROM jobs j
LEFT JOIN matches m ON j.job_hash = m.job_hash
WHERE j.created_at >= NOW() - INTERVAL '30 days'
GROUP BY j.source
ORDER BY avg_match_score DESC, total_matches DESC;

COMMENT ON VIEW job_source_performance IS 'Job source performance: which scrapers provide best matches. Helps optimize scraper priorities.';

-- ============================================================================
-- 7. DAILY SYSTEM HEALTH DASHBOARD
-- ============================================================================
-- Aggregated daily metrics for quick health check

CREATE OR REPLACE VIEW daily_system_health AS
SELECT 
    DATE_TRUNC('day', NOW()) as report_date,
    (SELECT COUNT(*) FROM matches WHERE created_at::date = CURRENT_DATE) as matches_today,
    (SELECT COUNT(DISTINCT user_email) FROM matches WHERE created_at::date = CURRENT_DATE) as active_users_today,
    (SELECT COUNT(*) FROM jobs WHERE is_active = true) as active_jobs_total,
    (SELECT COUNT(*) FROM jobs WHERE created_at::date = CURRENT_DATE) as jobs_added_today,
    (SELECT ROUND(AVG(match_score::numeric), 2) FROM matches WHERE created_at::date = CURRENT_DATE) as avg_match_score_today,
    (SELECT ROUND(SUM(ai_cost_usd), 4) FROM matches WHERE created_at::date = CURRENT_DATE) as ai_cost_today,
    (SELECT COUNT(*) FROM matches WHERE fallback_reason IS NOT NULL AND created_at::date = CURRENT_DATE) as fallbacks_today;

COMMENT ON VIEW daily_system_health IS 'Daily system health snapshot: matches, users, jobs, costs, quality. Quick health check for daily monitoring.';

-- ============================================================================
-- IMPROVED CATEGORY PERFORMANCE REPORT (AFTER ADDING job_hash TO match_logs)
-- ============================================================================
-- Run this after adding job_hash column to match_logs table
-- This version includes CTR and Apply Rate tracking

/*
CREATE OR REPLACE VIEW category_performance_report_full AS
WITH category_signals AS (
    SELECT 
        unnest(j.categories) as category,
        ml.match_tags->>'signal_type' as signal_type,
        ml.match_tags->>'action' as action,
        ml.job_hash
    FROM match_logs ml
    JOIN jobs j ON ml.job_hash = j.job_hash
    WHERE ml.match_tags IS NOT NULL
      AND j.categories IS NOT NULL 
      AND array_length(j.categories, 1) > 0
      AND ml.created_at >= NOW() - INTERVAL '30 days'
)
SELECT 
    category,
    COUNT(DISTINCT job_hash) FILTER (WHERE signal_type = 'shown') as total_impressions,
    COUNT(DISTINCT job_hash) FILTER (WHERE signal_type = 'click' OR signal_type = 'clicked') as total_clicks,
    COUNT(DISTINCT job_hash) FILTER (WHERE action = 'apply_clicked') as total_applies,
    ROUND(
        ((COUNT(DISTINCT job_hash) FILTER (WHERE signal_type = 'click' OR signal_type = 'clicked')::float / 
         NULLIF(COUNT(DISTINCT job_hash) FILTER (WHERE signal_type = 'shown'), 0)) * 100)::numeric, 
        2
    ) as ctr_percentage,
    ROUND(
        ((COUNT(DISTINCT job_hash) FILTER (WHERE action = 'apply_clicked')::float / 
         NULLIF(COUNT(DISTINCT job_hash) FILTER (WHERE signal_type = 'shown'), 0)) * 100)::numeric, 
        2
    ) as atr_percentage
FROM category_signals
GROUP BY category
HAVING COUNT(DISTINCT job_hash) FILTER (WHERE signal_type = 'shown') > 0
ORDER BY atr_percentage DESC;
*/

-- ============================================================================
-- MIGRATION: Add job_hash to match_logs for better dashboard queries
-- ============================================================================
-- Run this migration first to enable CTR/Apply tracking in views:
/*
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'match_logs' 
        AND column_name = 'job_hash'
    ) THEN
        ALTER TABLE match_logs ADD COLUMN job_hash TEXT;
        COMMENT ON COLUMN match_logs.job_hash IS 'Job hash for direct joins with jobs table. Enables efficient dashboard queries.';
        
        CREATE INDEX IF NOT EXISTS idx_match_logs_job_hash 
            ON match_logs(job_hash)
            WHERE job_hash IS NOT NULL;
        
        -- Backfill from job_context JSONB if possible
        UPDATE match_logs
        SET job_hash = job_context->>'job_hash'
        WHERE job_hash IS NULL 
          AND job_context IS NOT NULL 
          AND job_context->>'job_hash' IS NOT NULL;
    END IF;
END $$;
*/
-- ============================================================================

