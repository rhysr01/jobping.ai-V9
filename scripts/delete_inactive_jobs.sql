-- ============================================================================
-- DELETE INACTIVE JOBS
-- ============================================================================
-- Alternative: Delete inactive jobs instead of old jobs
-- Run check first: SELECT COUNT(*) FROM public.jobs WHERE is_active = false;
-- ============================================================================

BEGIN;

-- Delete inactive jobs (these are likely expired/stale)
DELETE FROM public.jobs
WHERE is_active = false;

-- Note: This will automatically cascade to:
-- - embedding_queue entries (via foreign key)
-- - Index entries (automatically cleaned up)

COMMIT;

-- After deletion, run VACUUM to reclaim space:
-- VACUUM ANALYZE public.jobs;

