-- ============================================================================
-- FIX DUPLICATE JOBS
-- ============================================================================
-- This migration identifies and removes duplicate jobs based on:
-- - Same title + company + location
-- - Keeps the most recent job (highest id or latest scrape_timestamp)
-- - Preserves job_hash relationships in matches table
-- ============================================================================
-- Date: January 4, 2026
-- Affected: ~2,718 duplicate jobs
-- ============================================================================

BEGIN;

-- Step 1: Identify duplicate groups
-- We'll keep the job with the highest ID (most recent) from each duplicate group
CREATE TEMP TABLE duplicate_groups AS
SELECT 
    title,
    company,
    COALESCE(location, city, 'unknown') as location_key,
    array_agg(id ORDER BY id DESC) as job_ids,
    array_agg(job_hash ORDER BY id DESC) as job_hashes,
    COUNT(*) as duplicate_count
FROM jobs
WHERE is_active = true
GROUP BY title, company, COALESCE(location, city, 'unknown')
HAVING COUNT(*) > 1;

-- Step 2: Create a table of jobs to keep (first job in each group)
CREATE TEMP TABLE jobs_to_keep AS
SELECT DISTINCT ON (dg.title, dg.company, dg.location_key)
    dg.title,
    dg.company,
    dg.location_key,
    (dg.job_ids)[1] as keep_job_id,
    (dg.job_hashes)[1] as keep_job_hash
FROM duplicate_groups dg;

-- Step 3: Create a table of jobs to remove (all except the first)
CREATE TEMP TABLE jobs_to_remove AS
SELECT 
    j.id,
    j.job_hash,
    jkt.keep_job_id,
    jkt.keep_job_hash
FROM jobs j
JOIN duplicate_groups dg ON 
    j.title = dg.title 
    AND j.company = dg.company 
    AND COALESCE(j.location, j.city, 'unknown') = dg.location_key
JOIN jobs_to_keep jkt ON 
    jkt.title = dg.title 
    AND jkt.company = dg.company 
    AND jkt.location_key = dg.location_key
WHERE j.id != jkt.keep_job_id;

-- Step 4: Update matches table to point to kept jobs
-- This preserves the relationship even if we delete duplicate jobs
UPDATE matches m
SET job_hash = jtr.keep_job_hash
FROM jobs_to_remove jtr
WHERE m.job_hash = jtr.job_hash;

-- Step 5: Handle embedding_queue entries for duplicate jobs
-- Strategy: Keep only one entry per duplicate group (for the kept job)
-- If kept job already has an entry, delete all duplicates
-- If kept job doesn't have an entry, transfer ONE entry from duplicates (pick the first one)

-- Create temp table to track which kept jobs need entries transferred
CREATE TEMP TABLE embedding_transfers AS
SELECT DISTINCT ON (jtr.keep_job_hash)
    eq.id as eq_id,
    jtr.keep_job_hash,
    jtr.keep_job_id
FROM embedding_queue eq
JOIN jobs_to_remove jtr ON eq.job_hash = jtr.job_hash
WHERE NOT EXISTS (
    SELECT 1 FROM embedding_queue eq2 
    WHERE eq2.job_hash = jtr.keep_job_hash
)
ORDER BY jtr.keep_job_hash, eq.id;

-- Transfer one entry per kept job (if needed)
UPDATE embedding_queue eq
SET job_hash = et.keep_job_hash,
    job_id = et.keep_job_id
FROM embedding_transfers et
WHERE eq.id = et.eq_id;

-- Delete all remaining entries for duplicate jobs
-- (These are either duplicates where kept job already had an entry, or extra duplicates)
DELETE FROM embedding_queue
WHERE job_hash IN (SELECT job_hash FROM jobs_to_remove);

-- Step 6: Mark duplicate jobs as inactive instead of deleting
-- This preserves data integrity and allows for recovery if needed
UPDATE jobs
SET 
    is_active = false,
    status = 'duplicate',
    updated_at = NOW()
WHERE id IN (SELECT id FROM jobs_to_remove);

-- Step 7: Add a comment explaining the change
COMMENT ON COLUMN jobs.status IS 'Job status: active, duplicate, expired, etc.';

-- Log the results
DO $$
DECLARE
    duplicate_count INTEGER;
    kept_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count FROM jobs_to_remove;
    SELECT COUNT(*) INTO kept_count FROM jobs_to_keep;
    
    RAISE NOTICE 'Duplicate jobs processed: %', duplicate_count;
    RAISE NOTICE 'Unique jobs kept: %', kept_count;
    RAISE NOTICE 'Matches updated: %', (SELECT COUNT(*) FROM matches WHERE job_hash IN (SELECT keep_job_hash FROM jobs_to_remove));
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify)
-- ============================================================================
-- Check remaining duplicates:
-- SELECT title, company, COALESCE(location, city, 'unknown') as location_key, COUNT(*) 
-- FROM jobs WHERE is_active = true 
-- GROUP BY title, company, COALESCE(location, city, 'unknown') 
-- HAVING COUNT(*) > 1;
--
-- Check matches still point to valid jobs:
-- SELECT COUNT(*) FROM matches m LEFT JOIN jobs j ON m.job_hash = j.job_hash WHERE j.job_hash IS NULL;
--
-- Check jobs marked as duplicate:
-- SELECT COUNT(*) FROM jobs WHERE status = 'duplicate';

