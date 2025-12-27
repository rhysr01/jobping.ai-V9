-- ============================================================================
-- DELETE JOBS 26 DAYS OR OLDER
-- ============================================================================
-- Deletes jobs that were created 26 days or more ago
-- Uses created_at as the reference date
--
-- NOTE: Supabase "Storage Size" includes BOTH:
--   1. File storage buckets (files you upload)
--   2. Database storage (large text fields, TOAST data, embeddings)
--
-- Your 1.019 GB storage usage is likely from:
-- - Large job descriptions (text fields)
-- - Vector embeddings (if enabled)
-- - Other large text/blob data in the database
--
-- Deleting old jobs WILL help reduce storage size since it removes:
-- - Job description text
-- - Associated embeddings
-- - Index data
--
-- To check what's consuming space, run: scripts/check_database_size.sql
-- ============================================================================

-- ============================================================================
-- SAFE DELETION: Delete in batches to avoid long locks
-- ============================================================================
-- This will free up significant space since indexes are 7x larger than data
-- Estimated: ~402 MB of indexes + ~56 MB of data = ~458 MB total per jobs table
-- ============================================================================

BEGIN;

-- Delete jobs where created_at is 26 days or older
-- This will automatically cascade to:
-- - embedding_queue entries (via foreign key)
-- - matches table entries (if foreign key exists)
-- - Index entries (automatically cleaned up)
DELETE FROM public.jobs
WHERE created_at IS NOT NULL
  AND created_at < NOW() - INTERVAL '26 days';

-- Note: After deletion, you may want to run VACUUM to reclaim space
-- VACUUM ANALYZE public.jobs;

-- Alternative: If you want to use last_seen_at instead of created_at:
-- DELETE FROM public.jobs
-- WHERE last_seen_at < NOW() - INTERVAL '26 days';

-- Alternative: If you want to use posted_at instead:
-- DELETE FROM public.jobs
-- WHERE posted_at IS NOT NULL
--   AND posted_at < NOW() - INTERVAL '26 days';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this before executing to see how many jobs will be deleted:
-- SELECT COUNT(*) as jobs_to_delete
-- FROM public.jobs
-- WHERE created_at IS NOT NULL
--   AND created_at < NOW() - INTERVAL '26 days';

