-- ============================================================================
-- COMPREHENSIVE DATA QUALITY AUDIT
-- ============================================================================
-- Checks for:
-- 1. Missing indexes critical for matching performance
-- 2. Data quality issues (nulls, duplicates, invalid data)
-- 3. Scraper data validation issues
-- 4. Query optimization opportunities
-- ============================================================================

-- ============================================================================
-- 1. INDEX AUDIT - Check if critical indexes exist for matching
-- ============================================================================

SELECT 
    'INDEX AUDIT' as audit_section,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'jobs'
  AND (
    indexname LIKE '%city%' OR
    indexname LIKE '%location%' OR
    indexname LIKE '%categories%' OR
    indexname LIKE '%is_active%' OR
    indexname LIKE '%status%' OR
    indexname LIKE '%created_at%' OR
    indexname LIKE '%posted_at%'
  )
ORDER BY tablename, indexname;

-- Check for MISSING critical indexes
SELECT 
    'MISSING INDEXES' as audit_section,
    'idx_jobs_city' as missing_index,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'jobs' 
        AND indexname = 'idx_jobs_city'
    ) THEN 'EXISTS' ELSE 'MISSING - CRITICAL FOR MATCHING!' END as status
UNION ALL
SELECT 
    'MISSING INDEXES',
    'idx_jobs_categories_gin',
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'jobs' 
        AND indexname = 'idx_jobs_categories_gin'
    ) THEN 'EXISTS' ELSE 'MISSING - CRITICAL FOR CATEGORY FILTERING!' END
UNION ALL
SELECT 
    'MISSING INDEXES',
    'idx_jobs_is_active_status',
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'jobs' 
        AND indexname LIKE '%is_active%status%'
    ) THEN 'EXISTS' ELSE 'MISSING - CRITICAL FOR ACTIVE JOB FILTERING!' END
UNION ALL
SELECT 
    'MISSING INDEXES',
    'idx_jobs_created_at_desc',
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'jobs' 
        AND indexname LIKE '%created_at%'
    ) THEN 'EXISTS' ELSE 'MISSING - HELPS WITH RECENCY SORTING!' END;

-- ============================================================================
-- 2. DATA QUALITY AUDIT - Check for common data issues
-- ============================================================================

-- 2.1 Missing critical fields
SELECT 
    'DATA QUALITY - MISSING FIELDS' as audit_section,
    'Jobs with NULL city' as issue,
    COUNT(*)::text as count,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM jobs WHERE is_active = true), 0), 2)::text || '%' as percentage
FROM jobs
WHERE is_active = true AND city IS NULL

UNION ALL

SELECT 
    'DATA QUALITY - MISSING FIELDS',
    'Jobs with NULL location',
    COUNT(*)::text,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM jobs WHERE is_active = true), 0), 2)::text || '%'
FROM jobs
WHERE is_active = true AND location IS NULL

UNION ALL

SELECT 
    'DATA QUALITY - MISSING FIELDS',
    'Jobs with NULL description',
    COUNT(*)::text,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM jobs WHERE is_active = true), 0), 2)::text || '%'
FROM jobs
WHERE is_active = true AND (description IS NULL OR description = '')

UNION ALL

SELECT 
    'DATA QUALITY - MISSING FIELDS',
    'Jobs with NULL job_url',
    COUNT(*)::text,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM jobs WHERE is_active = true), 0), 2)::text || '%'
FROM jobs
WHERE is_active = true AND (job_url IS NULL OR job_url = '')

UNION ALL

SELECT 
    'DATA QUALITY - MISSING FIELDS',
    'Jobs with NULL categories',
    COUNT(*)::text,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM jobs WHERE is_active = true), 0), 2)::text || '%'
FROM jobs
WHERE is_active = true AND (categories IS NULL OR array_length(categories, 1) IS NULL)

UNION ALL

SELECT 
    'DATA QUALITY - MISSING FIELDS',
    'Jobs with NULL work_environment',
    COUNT(*)::text,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM jobs WHERE is_active = true), 0), 2)::text || '%'
FROM jobs
WHERE is_active = true AND work_environment IS NULL;

-- 2.2 Invalid data patterns
SELECT 
    'DATA QUALITY - INVALID DATA' as audit_section,
    'Jobs with empty title' as issue,
    COUNT(*)::text as count
FROM jobs
WHERE is_active = true AND (title IS NULL OR title = '' OR LENGTH(TRIM(title)) = 0)

UNION ALL

SELECT 
    'DATA QUALITY - INVALID DATA',
    'Jobs with empty company',
    COUNT(*)::text
FROM jobs
WHERE is_active = true AND (company IS NULL OR company = '' OR LENGTH(TRIM(company)) = 0)

UNION ALL

SELECT 
    'DATA QUALITY - INVALID DATA',
    'Jobs with invalid job_hash (empty)',
    COUNT(*)::text
FROM jobs
WHERE is_active = true AND (job_hash IS NULL OR job_hash = '')

UNION ALL

SELECT 
    'DATA QUALITY - INVALID DATA',
    'Jobs with location but no city extracted',
    COUNT(*)::text
FROM jobs
WHERE is_active = true 
  AND location IS NOT NULL 
  AND location != ''
  AND (city IS NULL OR city = '')
  AND NOT (location ILIKE '%remote%' OR location ILIKE '%work from home%')

UNION ALL

SELECT 
    'DATA QUALITY - INVALID DATA',
    'Jobs with conflicting flags (internship AND graduate)',
    COUNT(*)::text
FROM jobs
WHERE is_active = true 
  AND is_internship = true 
  AND is_graduate = true;

-- 2.3 Duplicate detection
SELECT 
    'DATA QUALITY - DUPLICATES' as audit_section,
    'Duplicate job_hashes' as issue,
    COUNT(*)::text as count
FROM (
    SELECT job_hash, COUNT(*) as cnt
    FROM jobs
    WHERE is_active = true
    GROUP BY job_hash
    HAVING COUNT(*) > 1
) duplicates

UNION ALL

SELECT 
    'DATA QUALITY - DUPLICATES',
    'Jobs with same title+company+location but different hash',
    COUNT(*)::text
FROM (
    SELECT LOWER(TRIM(title)) || '|' || LOWER(TRIM(company)) || '|' || LOWER(TRIM(location)) as key
    FROM jobs
    WHERE is_active = true
    GROUP BY key
    HAVING COUNT(DISTINCT job_hash) > 1
) potential_dupes;

-- 2.4 Scraper data validation issues
SELECT 
    'DATA QUALITY - SCRAPER ISSUES' as audit_section,
    'Jobs from jobspy without is_internship OR is_graduate flag' as issue,
    COUNT(*)::text as count
FROM jobs
WHERE is_active = true 
  AND source LIKE '%jobspy%'
  AND is_internship IS NOT TRUE
  AND is_graduate IS NOT TRUE

UNION ALL

SELECT 
    'DATA QUALITY - SCRAPER ISSUES',
    'Jobs with remote in location but work_environment not set',
    COUNT(*)::text
FROM jobs
WHERE is_active = true 
  AND (location ILIKE '%remote%' OR location ILIKE '%work from home%')
  AND (work_environment IS NULL OR work_environment NOT IN ('remote', 'hybrid'))

UNION ALL

SELECT 
    'DATA QUALITY - SCRAPER ISSUES',
    'Jobs with categories but no early-career category',
    COUNT(*)::text
FROM jobs
WHERE is_active = true 
  AND categories IS NOT NULL
  AND array_length(categories, 1) > 0
  AND NOT ('early-career' = ANY(categories))
  AND NOT ('internship' = ANY(categories))
  AND NOT ('graduate' = ANY(categories));

-- ============================================================================
-- 3. MATCHING OPTIMIZATION AUDIT
-- ============================================================================

-- 3.1 Check query performance indicators
SELECT 
    'MATCHING OPTIMIZATION' as audit_section,
    'Jobs with NULL city (hurts city filtering)' as issue,
    COUNT(*)::text as count,
    'These jobs cannot be efficiently filtered by city in matching queries' as impact
FROM jobs
WHERE is_active = true 
  AND city IS NULL
  AND location IS NOT NULL
  AND location != ''

UNION ALL

SELECT 
    'MATCHING OPTIMIZATION',
    'Jobs with NULL categories (hurts category filtering)',
    COUNT(*)::text,
    'These jobs cannot be efficiently filtered by career path in matching queries'
FROM jobs
WHERE is_active = true 
  AND (categories IS NULL OR array_length(categories, 1) IS NULL)

UNION ALL

SELECT 
    'MATCHING OPTIMIZATION',
    'Jobs with status != active but is_active = true',
    COUNT(*)::text,
    'Data inconsistency - should be fixed'
FROM jobs
WHERE is_active = true 
  AND status != 'active'

UNION ALL

SELECT 
    'MATCHING OPTIMIZATION',
    'Jobs older than 60 days (should be filtered)',
    COUNT(*)::text,
    'These jobs may be stale and should be deactivated'
FROM jobs
WHERE is_active = true 
  AND (
    (posted_at IS NOT NULL AND posted_at < NOW() - INTERVAL '60 days')
    OR (original_posted_date IS NOT NULL AND original_posted_date < NOW() - INTERVAL '60 days')
  );

-- ============================================================================
-- 4. SCRAPER DATA VALIDATION
-- ============================================================================

-- 4.1 Check scraper-specific data quality
SELECT 
    'SCRAPER VALIDATION' as audit_section,
    source,
    COUNT(*) as total_jobs,
    COUNT(*) FILTER (WHERE city IS NULL) as missing_city,
    COUNT(*) FILTER (WHERE categories IS NULL OR array_length(categories, 1) IS NULL) as missing_categories,
    COUNT(*) FILTER (WHERE work_environment IS NULL) as missing_work_env,
    COUNT(*) FILTER (WHERE description IS NULL OR description = '') as missing_description,
    COUNT(*) FILTER (WHERE is_internship IS TRUE) as internships,
    COUNT(*) FILTER (WHERE is_graduate IS TRUE) as graduates,
    ROUND(
        COUNT(*) FILTER (WHERE city IS NOT NULL AND categories IS NOT NULL AND work_environment IS NOT NULL) * 100.0 / COUNT(*),
        2
    ) as data_completeness_pct
FROM jobs
WHERE is_active = true
GROUP BY source
ORDER BY total_jobs DESC;

-- 4.2 Check for jobs that should have been filtered by scraper
SELECT 
    'SCRAPER VALIDATION' as audit_section,
    'Jobs with remote in location (should be filtered)' as issue,
    COUNT(*)::text as count
FROM jobs
WHERE is_active = true 
  AND (location ILIKE '%remote%' OR location ILIKE '%work from home%' OR location ILIKE '%wfh%')

UNION ALL

SELECT 
    'SCRAPER VALIDATION',
    'Jobs with senior keywords (should be filtered)',
    COUNT(*)::text
FROM jobs
WHERE is_active = true 
  AND (
    title ILIKE '%senior%' OR
    title ILIKE '%lead%' OR
    title ILIKE '%principal%' OR
    title ILIKE '%director%' OR
    title ILIKE '%head of%' OR
    title ILIKE '%vp%' OR
    title ILIKE '%chief%'
  )
  AND NOT (is_internship = true OR is_graduate = true);

-- ============================================================================
-- 5. RECOMMENDATIONS SUMMARY
-- ============================================================================

SELECT 
    'RECOMMENDATIONS' as audit_section,
    'Create missing index: idx_jobs_city' as recommendation,
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_city ON jobs(city) WHERE is_active = true AND city IS NOT NULL;' as sql_command
WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'jobs' 
    AND indexname = 'idx_jobs_city'
)

UNION ALL

SELECT 
    'RECOMMENDATIONS',
    'Create missing index: idx_jobs_categories_gin',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_categories_gin ON jobs USING GIN(categories) WHERE is_active = true AND categories IS NOT NULL;'
WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'jobs' 
    AND indexname = 'idx_jobs_categories_gin'
)

UNION ALL

SELECT 
    'RECOMMENDATIONS',
    'Backfill missing city data from location',
    'Run: SELECT * FROM public.parse_and_update_location();'
WHERE EXISTS (
    SELECT 1 FROM jobs 
    WHERE is_active = true 
    AND city IS NULL 
    AND location IS NOT NULL 
    AND location != ''
    LIMIT 1
)

UNION ALL

SELECT 
    'RECOMMENDATIONS',
    'Fix status inconsistency',
    'UPDATE jobs SET status = ''active'' WHERE is_active = true AND status != ''active'';'
WHERE EXISTS (
    SELECT 1 FROM jobs 
    WHERE is_active = true 
    AND status != 'active'
    LIMIT 1
)

UNION ALL

SELECT 
    'RECOMMENDATIONS',
    'Deactivate stale jobs (>60 days)',
    'UPDATE jobs SET is_active = false, status = ''expired'' WHERE is_active = true AND posted_at < NOW() - INTERVAL ''60 days'';'
WHERE EXISTS (
    SELECT 1 FROM jobs 
    WHERE is_active = true 
    AND posted_at < NOW() - INTERVAL '60 days'
    LIMIT 1
);

