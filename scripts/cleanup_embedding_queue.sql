-- ============================================================================
-- CLEANUP EMBEDDING QUEUE
-- ============================================================================
-- Clean up old processed entries from embedding_queue table
-- This table is 1768 kB and might have stale entries
-- ============================================================================

BEGIN;

-- Delete old processed entries (older than 7 days)
DELETE FROM public.embedding_queue
WHERE processed_at IS NOT NULL
  AND processed_at < NOW() - INTERVAL '7 days';

-- Delete entries with errors older than 7 days
DELETE FROM public.embedding_queue
WHERE error_message IS NOT NULL
  AND created_at < NOW() - INTERVAL '7 days';

COMMIT;

-- Check results
SELECT 
    COUNT(*) as remaining_queue_entries,
    COUNT(CASE WHEN processed_at IS NULL THEN 1 END) as unprocessed
FROM public.embedding_queue;

