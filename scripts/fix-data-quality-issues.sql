-- ============================================================================
-- FIX DATA QUALITY ISSUES IDENTIFIED BY AUDIT
-- ============================================================================
-- Run this AFTER running audit-data-quality.sql to fix identified issues
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE MISSING CRITICAL INDEXES FOR MATCHING
-- ============================================================================

-- Index on city (CRITICAL for city-based filtering in matching)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_city 
ON jobs(city) 
WHERE is_active = true AND city IS NOT NULL;

-- GIN index on categories (CRITICAL for category filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_categories_gin 
ON jobs USING GIN(categories) 
WHERE is_active = true AND categories IS NOT NULL;

-- Composite index for active jobs with status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_is_active_status 
ON jobs(is_active, status) 
WHERE is_active = true AND status = 'active';

-- Index on created_at for recency sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_created_at_desc 
ON jobs(created_at DESC) 
WHERE is_active = true;

-- Index on posted_at for freshness sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_posted_at_desc 
ON jobs(posted_at DESC) 
WHERE is_active = true AND posted_at IS NOT NULL;

-- ============================================================================
-- 2. BACKFILL MISSING CITY DATA FROM LOCATION
-- ============================================================================

-- Use existing parse_and_update_location function if it exists
-- Otherwise, do simple extraction
UPDATE jobs
SET 
    city = INITCAP(SPLIT_PART(location, ',', 1)),
    updated_at = NOW()
WHERE is_active = true
  AND city IS NULL
  AND location IS NOT NULL
  AND location != ''
  AND SPLIT_PART(location, ',', 1) != ''
  AND NOT (location ILIKE '%remote%' OR location ILIKE '%work from home%')
  AND SPLIT_PART(location, ',', 1) IN (
    'Dublin', 'London', 'Paris', 'Amsterdam', 'Manchester', 'Birmingham',
    'Madrid', 'Barcelona', 'Berlin', 'Hamburg', 'Munich', 'Zurich',
    'Milan', 'Rome', 'Brussels', 'Stockholm', 'Copenhagen', 'Vienna',
    'Prague', 'Warsaw'
  );

-- ============================================================================
-- 3. FIX DATA INCONSISTENCIES
-- ============================================================================

-- Fix status inconsistency
UPDATE jobs
SET 
    status = 'active',
    updated_at = NOW()
WHERE is_active = true 
  AND status != 'active';

-- Fix conflicting flags (internship AND graduate - should be mutually exclusive)
UPDATE jobs
SET 
    is_graduate = false,
    updated_at = NOW()
WHERE is_active = true 
  AND is_internship = true 
  AND is_graduate = true;

-- Fix work_environment for remote jobs
UPDATE jobs
SET 
    work_environment = 'remote',
    updated_at = NOW()
WHERE is_active = true 
  AND (location ILIKE '%remote%' OR location ILIKE '%work from home%' OR location ILIKE '%wfh%')
  AND (work_environment IS NULL OR work_environment NOT IN ('remote', 'hybrid'));

-- Ensure categories array has at least 'early-career' for non-internship/graduate jobs
UPDATE jobs
SET 
    categories = CASE
        WHEN categories IS NULL THEN ARRAY['early-career']
        WHEN NOT ('early-career' = ANY(categories)) AND NOT ('internship' = ANY(categories)) AND NOT ('graduate' = ANY(categories))
        THEN array_append(categories, 'early-career')
        ELSE categories
    END,
    updated_at = NOW()
WHERE is_active = true
  AND (
    categories IS NULL 
    OR (
      NOT ('early-career' = ANY(categories))
      AND NOT ('internship' = ANY(categories))
      AND NOT ('graduate' = ANY(categories))
    )
  );

-- ============================================================================
-- 4. DEACTIVATE STALE JOBS
-- ============================================================================

-- Deactivate jobs older than 60 days (matching only uses jobs <60 days)
UPDATE jobs
SET 
    is_active = false,
    status = 'expired',
    updated_at = NOW()
WHERE is_active = true 
  AND (
    (posted_at IS NOT NULL AND posted_at < NOW() - INTERVAL '60 days')
    OR (original_posted_date IS NOT NULL AND original_posted_date < NOW() - INTERVAL '60 days')
  );

-- ============================================================================
-- 5. VALIDATE SCRAPER DATA
-- ============================================================================

-- Ensure jobspy-internships source has is_internship flag set
UPDATE jobs
SET 
    is_internship = true,
    is_graduate = false,
    categories = CASE
        WHEN categories IS NULL THEN ARRAY['internship', 'early-career']
        WHEN NOT ('internship' = ANY(categories)) THEN array_append(categories, 'internship')
        ELSE categories
    END,
    updated_at = NOW()
WHERE is_active = true 
  AND source LIKE '%jobspy%internship%'
  AND is_internship IS NOT TRUE;

-- ============================================================================
-- 6. FIX EMPTY STRINGS (should be NULL)
-- ============================================================================

UPDATE jobs
SET 
    city = NULL,
    updated_at = NOW()
WHERE is_active = true 
  AND city = '';

UPDATE jobs
SET 
    country = NULL,
    updated_at = NOW()
WHERE is_active = true 
  AND country = '';

UPDATE jobs
SET 
    description = NULL,
    updated_at = NOW()
WHERE is_active = true 
  AND description = '';

UPDATE jobs
SET 
    job_url = NULL,
    updated_at = NOW()
WHERE is_active = true 
  AND job_url = '';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check index creation
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'jobs'
  AND indexname IN (
    'idx_jobs_city',
    'idx_jobs_categories_gin',
    'idx_jobs_is_active_status',
    'idx_jobs_created_at_desc',
    'idx_jobs_posted_at_desc'
  );

-- Check data quality improvements
SELECT 
    'After Fix: Jobs with NULL city' as metric,
    COUNT(*)::text as count
FROM jobs
WHERE is_active = true AND city IS NULL

UNION ALL

SELECT 
    'After Fix: Jobs with NULL categories',
    COUNT(*)::text
FROM jobs
WHERE is_active = true AND (categories IS NULL OR array_length(categories, 1) IS NULL)

UNION ALL

SELECT 
    'After Fix: Status inconsistencies',
    COUNT(*)::text
FROM jobs
WHERE is_active = true AND status != 'active'

UNION ALL

SELECT 
    'After Fix: Conflicting flags',
    COUNT(*)::text
FROM jobs
WHERE is_active = true 
  AND is_internship = true 
  AND is_graduate = true;

