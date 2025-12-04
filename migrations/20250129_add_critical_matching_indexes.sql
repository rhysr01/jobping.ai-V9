-- ============================================================================
-- ADD CRITICAL INDEXES FOR MATCHING PERFORMANCE
-- ============================================================================
-- These indexes were removed but are CRITICAL for matching query performance
-- Matching queries filter by city, categories, and is_active/status
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CITY INDEX (CRITICAL for city-based filtering)
-- ============================================================================
-- Matching queries filter by city: WHERE city IN (...)
-- Without this index, queries scan all active jobs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_city 
ON jobs(city) 
WHERE is_active = true AND city IS NOT NULL;

-- ============================================================================
-- 2. CATEGORIES GIN INDEX (CRITICAL for career path filtering)
-- ============================================================================
-- Matching queries filter by categories: WHERE categories && ARRAY[...]
-- GIN index is required for efficient array overlap queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_categories_gin 
ON jobs USING GIN(categories) 
WHERE is_active = true AND categories IS NOT NULL;

-- ============================================================================
-- 3. COMPOSITE INDEX FOR ACTIVE JOBS WITH STATUS
-- ============================================================================
-- Matching queries filter: WHERE is_active = true AND status = 'active'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_is_active_status 
ON jobs(is_active, status) 
WHERE is_active = true AND status = 'active';

-- ============================================================================
-- 4. CREATED_AT DESC INDEX (for recency sorting)
-- ============================================================================
-- Matching queries order by: ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_created_at_desc 
ON jobs(created_at DESC) 
WHERE is_active = true;

-- ============================================================================
-- 5. POSTED_AT DESC INDEX (for freshness sorting)
-- ============================================================================
-- Some queries order by posted_at for freshness
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_posted_at_desc 
ON jobs(posted_at DESC) 
WHERE is_active = true AND posted_at IS NOT NULL;

-- ============================================================================
-- 6. COMPOSITE INDEX FOR CITY + CATEGORIES (common query pattern)
-- ============================================================================
-- Many matching queries filter by both city and categories
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_city_categories 
ON jobs(city, categories) 
WHERE is_active = true AND city IS NOT NULL AND categories IS NOT NULL;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify indexes were created:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
--   AND tablename = 'jobs' 
--   AND indexname IN (
--     'idx_jobs_city',
--     'idx_jobs_categories_gin',
--     'idx_jobs_is_active_status',
--     'idx_jobs_created_at_desc',
--     'idx_jobs_posted_at_desc',
--     'idx_jobs_city_categories'
--   );

