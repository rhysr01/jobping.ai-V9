-- ============================================================================
-- DELETE OLDEST JOBS TO REACH 8,000 ACTIVE JOBS LIMIT
-- ============================================================================
-- Purpose: Delete the 610 oldest active jobs to reduce total from 8,610 to 8,000
-- Strategy: Delete in order: matches -> embedding_queue -> jobs
-- ============================================================================

BEGIN;

-- Step 1: Identify the job_hashes and job_ids to delete
-- These are the 610 oldest active jobs (by last_seen_at)
CREATE TEMP TABLE jobs_to_delete AS
SELECT 
    id,
    job_hash,
    title,
    company,
    last_seen_at
FROM jobs
WHERE is_active = true AND status = 'active'
ORDER BY last_seen_at ASC NULLS FIRST
LIMIT 610;

-- Step 2: Show what we're about to delete (for verification)
SELECT 
    COUNT(*) as jobs_to_delete_count,
    MIN(last_seen_at) as oldest_job_date,
    MAX(last_seen_at) as newest_job_date
FROM jobs_to_delete;

-- Step 3: Delete matches that reference these jobs
-- This will delete approximately 1 match record
DELETE FROM matches
WHERE job_hash IN (SELECT job_hash FROM jobs_to_delete);

-- Step 4: Delete embedding_queue items that reference these jobs
-- This will delete approximately 585 queue items
DELETE FROM embedding_queue
WHERE job_id IN (SELECT id FROM jobs_to_delete)
   OR job_hash IN (SELECT job_hash FROM jobs_to_delete);

-- Step 5: Delete the jobs themselves
DELETE FROM jobs
WHERE id IN (SELECT id FROM jobs_to_delete);

-- Step 6: Verify final count
SELECT 
    COUNT(*) as remaining_active_jobs,
    CASE 
        WHEN COUNT(*) <= 8000 THEN 'SUCCESS: Under 8,000 limit'
        ELSE 'WARNING: Still over 8,000 limit'
    END as status
FROM jobs
WHERE is_active = true AND status = 'active';

-- Step 7: Show cleanup summary
SELECT 
    'Jobs deleted' as action,
    COUNT(*)::text as count
FROM jobs_to_delete
UNION ALL
SELECT 
    'Remaining active jobs' as action,
    (SELECT COUNT(*)::text FROM jobs WHERE is_active = true AND status = 'active') as count;

-- Cleanup temp table
DROP TABLE jobs_to_delete;

-- ROLLBACK; -- Uncomment to test without actually deleting
COMMIT;

