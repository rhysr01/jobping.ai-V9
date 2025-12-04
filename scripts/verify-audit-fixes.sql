-- ============================================================================
-- VERIFY AUDIT FIXES WERE APPLIED SUCCESSFULLY
-- ============================================================================
-- Run this to check if all fixes from the audit were applied correctly
-- ============================================================================

-- ============================================================================
-- 1. CHECK INDEX WAS CREATED
-- ============================================================================
SELECT 
    '✅ Index Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'jobs' 
            AND indexname = 'idx_jobs_categories_gin'
        ) THEN '✅ idx_jobs_categories_gin EXISTS'
        ELSE '❌ idx_jobs_categories_gin MISSING - Run PART 1!'
    END as status

UNION ALL

-- ============================================================================
-- 2. CHECK CITY DATA BACKFILL
-- ============================================================================
SELECT 
    'City Data Check' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All jobs have city data (or no location to extract from)'
        ELSE '⚠️  ' || COUNT(*)::text || ' jobs still missing city (may be non-form cities)'
    END as status
FROM jobs
WHERE is_active = true 
  AND city IS NULL 
  AND location IS NOT NULL 
  AND location != ''
  AND NOT (location ILIKE '%remote%' OR location ILIKE '%work from home%')

UNION ALL

-- ============================================================================
-- 3. CHECK STATUS CONSISTENCY
-- ============================================================================
SELECT 
    'Status Consistency Check' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All active jobs have status = active'
        ELSE '❌ ' || COUNT(*)::text || ' jobs with status mismatch - Run PART 2!'
    END as status
FROM jobs
WHERE is_active = true 
  AND status != 'active'

UNION ALL

-- ============================================================================
-- 4. CHECK STALE JOBS DEACTIVATION
-- ============================================================================
SELECT 
    'Stale Jobs Check' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No stale jobs (>60 days) remain active'
        ELSE '⚠️  ' || COUNT(*)::text || ' stale jobs still active - May need to run PART 2 again'
    END as status
FROM jobs
WHERE is_active = true 
  AND (
    (posted_at IS NOT NULL AND posted_at < NOW() - INTERVAL '60 days')
    OR (original_posted_date IS NOT NULL AND original_posted_date::timestamptz < NOW() - INTERVAL '60 days')
  )

UNION ALL

-- ============================================================================
-- 5. SUMMARY STATS
-- ============================================================================
SELECT 
    'Summary Stats' as check_type,
    'Total active jobs: ' || COUNT(*)::text as status
FROM jobs
WHERE is_active = true

UNION ALL

SELECT 
    'Summary Stats' as check_type,
    'Jobs with city: ' || COUNT(*)::text || ' (' || 
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM jobs WHERE is_active = true), 0), 1)::text || '%)' as status
FROM jobs
WHERE is_active = true AND city IS NOT NULL

UNION ALL

SELECT 
    'Summary Stats' as check_type,
    'Jobs with categories: ' || COUNT(*)::text || ' (' || 
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM jobs WHERE is_active = true), 0), 1)::text || '%)' as status
FROM jobs
WHERE is_active = true 
  AND categories IS NOT NULL 
  AND array_length(categories, 1) > 0;

-- ============================================================================
-- DETAILED BREAKDOWN (Optional - shows more details)
-- ============================================================================

-- Show city distribution
SELECT 
    'City Distribution' as report_type,
    city,
    COUNT(*) as job_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM jobs WHERE is_active = true), 2) as percentage
FROM jobs
WHERE is_active = true 
  AND city IS NOT NULL
GROUP BY city
ORDER BY job_count DESC
LIMIT 25;

-- Show jobs missing city by source
SELECT 
    'Missing City by Source' as report_type,
    source,
    COUNT(*) as jobs_missing_city,
    ROUND(COUNT(*) * 100.0 / NULLIF((
        SELECT COUNT(*) FROM jobs j2 
        WHERE j2.source = jobs.source AND j2.is_active = true
    ), 0), 2) as percentage_of_source
FROM jobs
WHERE is_active = true 
  AND city IS NULL
  AND location IS NOT NULL
  AND location != ''
GROUP BY source
ORDER BY jobs_missing_city DESC;

