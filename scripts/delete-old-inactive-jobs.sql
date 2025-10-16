-- ============================================================================
-- DELETE OLD INACTIVE JOBS - Database Space Cleanup
-- ============================================================================
-- Permanently DELETES inactive jobs to reduce database size
-- Keeps audit trail for recent filtering decisions (last 7 days)
-- ============================================================================

BEGIN;

-- ============================================================================
-- SAFE DELETION: Only delete inactive jobs older than 7 days
-- ============================================================================

-- Count what will be deleted
SELECT 
  'Jobs to be permanently deleted' as action,
  COUNT(*) as count
FROM jobs
WHERE status = 'inactive'
  AND created_at < NOW() - INTERVAL '7 days';

-- DELETE inactive jobs older than 7 days
DELETE FROM jobs
WHERE status = 'inactive'
  AND created_at < NOW() - INTERVAL '7 days';

-- ============================================================================
-- VERIFY RESULTS
-- ============================================================================

SELECT 
  COUNT(*) as total_remaining_jobs,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_recent
FROM jobs;

SELECT 
  'Database size reduced successfully' as status;

COMMIT;

-- ============================================================================
-- This should be run weekly to keep database lean
-- ============================================================================

