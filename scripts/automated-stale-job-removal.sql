-- ============================================================================
-- AUTOMATED STALE JOB REMOVAL
-- ============================================================================
-- Marks jobs as inactive when they become too old
-- Should run daily via cron/automation
-- ============================================================================

BEGIN;

-- ============================================================================
-- MARK STALE JOBS AS INACTIVE (Over 45 days old)
-- ============================================================================
-- Graduate jobs fill quickly - after 45 days they're likely closed

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'stale_over_45_days',
  updated_at = now()
WHERE status = 'active'
  AND created_at < NOW() - INTERVAL '45 days';

-- ============================================================================
-- STATISTICS
-- ============================================================================

SELECT 
  COUNT(*) as total_active,
  COUNT(CASE WHEN freshness_tier = 'hot' THEN 1 END) as hot,
  COUNT(CASE WHEN freshness_tier = 'warm' THEN 1 END) as warm,
  COUNT(CASE WHEN freshness_tier = 'fresh' THEN 1 END) as fresh,
  COUNT(CASE WHEN freshness_tier = 'standard' THEN 1 END) as standard,
  MAX(created_at) as newest_job,
  MIN(created_at) as oldest_job
FROM jobs
WHERE status = 'active';

COMMIT;

-- ============================================================================
-- Run this daily to keep job pool fresh
-- ============================================================================

