-- ============================================================================
-- CHECK DATABASE SIZE BREAKDOWN
-- ============================================================================
-- Helps identify what's consuming database storage space
-- Run this to see table sizes and identify large text fields
-- ============================================================================

-- Get table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
    pg_total_relation_size(schemaname||'.'||tablename) AS total_size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- CHECK JOBS TABLE SIZE BREAKDOWN
-- ============================================================================
-- See how much space jobs table is using

SELECT 
    'jobs' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('public.jobs')) AS total_size,
    pg_size_pretty(pg_relation_size('public.jobs')) AS table_size,
    pg_size_pretty(pg_total_relation_size('public.jobs') - pg_relation_size('public.jobs')) AS indexes_size
FROM public.jobs;

-- ============================================================================
-- CHECK LARGE TEXT FIELDS IN JOBS TABLE
-- ============================================================================
-- Identify jobs with very large descriptions (these consume storage)

SELECT 
    id,
    title,
    company,
    LENGTH(description) as description_length,
    LENGTH(COALESCE(description, '')) as description_size_bytes,
    pg_size_pretty(LENGTH(COALESCE(description, ''))::bigint) as description_size_pretty,
    created_at
FROM public.jobs
WHERE description IS NOT NULL
ORDER BY LENGTH(description) DESC
LIMIT 20;

-- ============================================================================
-- CHECK VECTOR EMBEDDINGS SIZE
-- ============================================================================
-- Check if embeddings column exists and its size
-- Note: Vector embeddings can be large (1536 dimensions * 4 bytes = ~6KB per job)

SELECT 
    COUNT(*) as total_jobs,
    COUNT(embedding) as jobs_with_embeddings,
    COUNT(*) - COUNT(embedding) as jobs_without_embeddings,
    -- Estimate embedding size: 1536 dimensions * 4 bytes = 6144 bytes per embedding
    pg_size_pretty(COUNT(embedding) * 6144::bigint) as estimated_embeddings_size
FROM public.jobs
WHERE is_active = true;

-- ============================================================================
-- SUMMARY OF STORAGE CONSUMPTION
-- ============================================================================
-- Get a summary of what's using space

SELECT 
    'Total Database Size' as metric,
    pg_size_pretty(pg_database_size(current_database())) as size
UNION ALL
SELECT 
    'Jobs Table' as metric,
    pg_size_pretty(pg_total_relation_size('public.jobs')) as size
UNION ALL
SELECT 
    'Users Table' as metric,
    pg_size_pretty(pg_total_relation_size('public.users')) as size
UNION ALL
SELECT 
    'Matches Table' as metric,
    pg_size_pretty(pg_total_relation_size('public.matches')) as size
UNION ALL
SELECT 
    'API Keys Table' as metric,
    pg_size_pretty(pg_total_relation_size('public.api_keys')) as size
ORDER BY metric;

-- ============================================================================
-- CHECK FOR JOBS WITH VERY LARGE DESCRIPTIONS
-- ============================================================================
-- Find jobs that might be consuming excessive storage

SELECT 
    COUNT(*) as jobs_with_large_descriptions,
    pg_size_pretty(SUM(LENGTH(COALESCE(description, '')))::bigint) as total_description_size
FROM public.jobs
WHERE LENGTH(COALESCE(description, '')) > 10000; -- Descriptions over 10KB

