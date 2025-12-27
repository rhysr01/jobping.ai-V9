-- ============================================================================
-- COMPREHENSIVE STORAGE BREAKDOWN
-- ============================================================================
-- Helps understand what Supabase counts as "Storage Size"
-- ============================================================================

-- 1. Database size (what we just checked - 473 MB)
SELECT 
    'Database Size' as metric,
    pg_size_pretty(pg_database_size(current_database())) AS size;

-- 2. All table sizes combined
SELECT 
    'All Tables Combined' as metric,
    pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))) AS size
FROM pg_tables
WHERE schemaname = 'public';

-- 3. Indexes size (can be significant)
SELECT 
    'Total Indexes Size' as metric,
    pg_size_pretty(SUM(pg_relation_size(indexrelid))) AS size
FROM pg_indexes
WHERE schemaname = 'public';

-- 4. Check for large indexes on jobs table specifically
SELECT 
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'jobs'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 5. Check WAL (Write-Ahead Log) size - this can be significant
-- Note: WAL files are temporary but count toward storage
SELECT 
    'WAL Size' as metric,
    pg_size_pretty(pg_current_wal_lsn()::bigint - '0/0'::pg_lsn) AS estimated_wal_size;

-- 6. Jobs table breakdown (data vs indexes)
SELECT 
    'Jobs Table Data' as metric,
    pg_size_pretty(pg_relation_size('public.jobs')) AS size
UNION ALL
SELECT 
    'Jobs Table Indexes' as metric,
    pg_size_pretty(pg_total_relation_size('public.jobs') - pg_relation_size('public.jobs')) AS size;

-- 7. Count jobs ready for deletion (26+ days old)
SELECT 
    COUNT(*) as jobs_to_delete,
    pg_size_pretty(COUNT(*) * 6144::bigint) as estimated_storage_freed_if_deleted
FROM public.jobs
WHERE created_at IS NOT NULL
  AND created_at < NOW() - INTERVAL '26 days';

