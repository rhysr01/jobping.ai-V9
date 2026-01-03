-- ============================================================================
-- REMOVE UNUSED INDEXES
-- ============================================================================
-- Removes indexes that have never been used to improve write performance
-- Note: Review these before running - some may be needed for future queries
--
-- Date: January 2, 2026
-- ============================================================================

BEGIN;

-- Remove unused indexes (commented out for safety - uncomment after review)
-- Uncomment these after verifying they're truly unused

-- DROP INDEX IF EXISTS public.idx_pending_digests_scheduled;
-- DROP INDEX IF EXISTS public.idx_matches_user_quality_created;
-- DROP INDEX IF EXISTS public.idx_matches_match_tags_gin;
-- DROP INDEX IF EXISTS public.idx_user_feedback_job_context_gin;
-- DROP INDEX IF EXISTS public.idx_user_feedback_user_verdict_created;
-- DROP INDEX IF EXISTS public.idx_users_free_expires;
-- DROP INDEX IF EXISTS public.idx_match_logs_match_tags_gin;
-- DROP INDEX IF EXISTS public.idx_match_logs_user_email_created_at;
-- DROP INDEX IF EXISTS public.idx_match_logs_job_hash;
-- DROP INDEX IF EXISTS public.idx_match_logs_job_hash_created_at;
-- DROP INDEX IF EXISTS public.idx_matches_job_snapshot_gin;
-- DROP INDEX IF EXISTS public.idx_matches_link_health;
-- DROP INDEX IF EXISTS public.idx_fallback_events_relaxation_level;
-- DROP INDEX IF EXISTS public.idx_custom_scans_status;
-- DROP INDEX IF EXISTS public.idx_scraping_priorities_demand;

COMMIT;

-- ============================================================================
-- NOTE: These indexes are marked as unused but may be needed for:
-- - Future queries
-- - Reporting/analytics
-- - Backup/recovery scenarios
-- 
-- Review each index before removing. Consider:
-- 1. Are they used in scheduled reports?
-- 2. Are they needed for data integrity?
-- 3. Will they be needed for future features?
-- ============================================================================

