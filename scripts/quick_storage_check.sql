-- ============================================================================
-- QUICK STORAGE CHECK - Run this first to see what's using space
-- ============================================================================
-- This single query shows table sizes and helps identify the storage culprit
-- ============================================================================

-- 1. TABLE SIZES (most important - shows which tables are largest)
SELECT 
    schemaname || '.' || tablename AS full_table_name,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_data_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
    pg_total_relation_size(schemaname||'.'||tablename) AS total_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 2. JOBS TABLE DETAILS (likely the biggest consumer)
SELECT 
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_jobs,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as jobs_with_embeddings,
    pg_size_pretty(pg_total_relation_size('public.jobs')) AS jobs_table_total_size,
    -- Estimate embedding storage: 1536 dimensions * 4 bytes = 6144 bytes per embedding
    pg_size_pretty(COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) * 6144::bigint) AS estimated_embeddings_storage,
    -- Count old jobs (26+ days)
    COUNT(CASE WHEN created_at < NOW() - INTERVAL '26 days' THEN 1 END) as jobs_26_days_older
FROM public.jobs;

-- 3. TOTAL DATABASE SIZE
SELECT 
    pg_size_pretty(pg_database_size(current_database())) AS total_database_size;

