-- ============================================================================
-- SAFE DATA QUALITY FIXES - PHASE 1
-- Conservative data quality improvements with verification safeguards
-- Date: January 27, 2026
-- ============================================================================
-- This migration safely improves data quality without deleting jobs.
-- SAFEGUARDS:
-- 1. Only filters jobs with CRITICAL missing data (not data that can be enhanced)
-- 2. Tracks all changes with filtered_reason
-- 3. Verifies count before and after
-- 4. Conservative thresholds to avoid false positives
-- ============================================================================

BEGIN;

-- ============================================================================
-- VERIFY SAFETY THRESHOLD
-- ============================================================================
DO $$ 
BEGIN
  IF (SELECT COUNT(*) FROM jobs WHERE is_active = true) < 10000 THEN
    RAISE EXCEPTION 'ERROR: Active job count is below 10000. Migration blocked to prevent data loss.';
  END IF;
END $$;

-- ============================================================================
-- 1. FILTER JOBS WITH COMPLETELY EMPTY/NULL CRITICAL FIELDS
-- ============================================================================
-- IMPORTANT: Only filter if field is truly NULL or completely empty
-- This will NOT filter jobs with short descriptions (those can be improved)

-- Filter jobs with NULL/empty title (completely unusable)
UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'missing_title',
  updated_at = NOW()
WHERE is_active = true
  AND (title IS NULL OR title = '' OR TRIM(title) = '')
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%missing_title%');

-- Filter jobs with NULL/empty company (can't identify employer)
UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'missing_company',
  updated_at = NOW()
WHERE is_active = true
  AND (company IS NULL OR company = '' OR TRIM(company) = '')
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%missing_company%');

-- ============================================================================
-- 2. FILTER OBVIOUS TEST/FAKE JOBS (Clearly not real)
-- ============================================================================
-- Only filter if title EXPLICITLY says "test", "fake", "dummy", etc.
-- NOT if description contains these words in normal context

UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'test_or_fake_job',
  updated_at = NOW()
WHERE is_active = true
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%test_or_fake_job%')
  AND (
    LOWER(title) = 'test job' OR
    LOWER(title) = 'fake job' OR
    LOWER(title) = 'dummy job' OR
    LOWER(title) LIKE 'sample job%' OR
    LOWER(title) = 'test' OR
    LOWER(title) = 'fake'
  );

-- ============================================================================
-- 3. DATA CONSISTENCY IMPROVEMENTS (Don't delete, just clean)
-- ============================================================================

-- Trim whitespace from all text fields
UPDATE jobs
SET
  title = TRIM(title),
  company = TRIM(company),
  location = TRIM(location),
  description = TRIM(description),
  updated_at = NOW()
WHERE is_active = true AND (
  title LIKE ' %' OR title LIKE '% ' OR
  company LIKE ' %' OR company LIKE '% ' OR
  location LIKE ' %' OR location LIKE '% ' OR
  description LIKE ' %' OR description LIKE '% '
);

-- Normalize empty strings to NULL for optional fields
UPDATE jobs
SET
  company_name = NULL,
  location = NULL,
  work_location = NULL,
  updated_at = NOW()
WHERE is_active = true AND (
  (company_name = '' OR TRIM(company_name) = '') OR
  (location = '' OR TRIM(location) = '') OR
  (work_location = '' OR TRIM(work_location) = '')
);

-- ============================================================================
-- 4. ENSURE STATUS CONSISTENCY (No orphaned states)
-- ============================================================================

-- Make sure filtered jobs have inactive status
UPDATE jobs
SET status = 'inactive'
WHERE is_active = false AND status != 'inactive';

-- Make sure active jobs have active status
UPDATE jobs
SET status = 'active'
WHERE is_active = true AND status != 'active';

-- ============================================================================
-- 5. VERIFY NO CATASTROPHIC FILTERING
-- ============================================================================

DO $$ 
DECLARE
  v_active_count INTEGER;
  v_before_count INTEGER := 27285; -- Approximate count from before migration
  v_percent_remaining NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_active_count FROM jobs WHERE is_active = true;
  v_percent_remaining := ROUND(100.0 * v_active_count / v_before_count, 1);
  
  -- Check if we've lost more than 5% of jobs (likely an error)
  IF v_percent_remaining < 95 THEN
    RAISE WARNING 'WARNING: Only %.1% of jobs remain (filtered more than 5%)', v_percent_remaining;
  END IF;
  
  -- Log summary
  RAISE NOTICE 'Data Quality Phase 1 Complete:';
  RAISE NOTICE 'Active jobs remaining: % (%.1% of original)', v_active_count, v_percent_remaining;
  RAISE NOTICE 'Jobs filtered for missing title: %', (SELECT COUNT(*) FROM jobs WHERE filtered_reason LIKE '%missing_title%');
  RAISE NOTICE 'Jobs filtered for missing company: %', (SELECT COUNT(*) FROM jobs WHERE filtered_reason LIKE '%missing_company%');
  RAISE NOTICE 'Jobs filtered for being test/fake: %', (SELECT COUNT(*) FROM jobs WHERE filtered_reason LIKE '%test_or_fake_job%');
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to check results)
-- ============================================================================

-- Check data quality improvements:
-- SELECT
--     CASE
--         WHEN title IS NULL OR title = '' THEN 'empty_title'
--         WHEN company IS NULL OR company = '' THEN 'empty_company'
--         WHEN location IS NULL OR location = '' THEN 'empty_location'
--         ELSE 'valid'
--     END as data_quality,
--     COUNT(*) as job_count
-- FROM jobs
-- WHERE is_active = true
-- GROUP BY 1
-- ORDER BY 2 DESC;

-- Check filtered reason breakdown:
-- SELECT
--     filtered_reason,
--     COUNT(*) as job_count
-- FROM jobs
-- WHERE filtered_reason IS NOT NULL AND is_active = false
-- GROUP BY filtered_reason
-- ORDER BY job_count DESC;

-- Sample of remaining jobs (spot check):
-- SELECT id, title, company, location, city FROM jobs WHERE is_active = true LIMIT 20;

-- Check overall active count:
-- SELECT COUNT(*) as active_jobs FROM jobs WHERE is_active = true;
