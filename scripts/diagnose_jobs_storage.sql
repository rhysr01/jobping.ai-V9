-- ============================================================================
-- JOBS TABLE STORAGE DIAGNOSTIC REPORT
-- ============================================================================
-- Generated: 2025-12-28
-- Purpose: Diagnose storage usage and identify jobs to delete to reach 8,000 limit
-- ============================================================================

-- 1. TABLE STRUCTURE
-- Shows all columns in the jobs table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. TOTAL JOBS COUNT
SELECT COUNT(*) as total_jobs FROM jobs;

-- 3. TABLE SIZE ANALYSIS
SELECT 
    COUNT(*) as total_jobs,
    pg_size_pretty(pg_total_relation_size('jobs')) as total_size,
    pg_size_pretty(pg_total_relation_size('jobs') / NULLIF(COUNT(*), 0)) as avg_size_per_job
FROM jobs;

-- 4. ACTIVE VS INACTIVE BREAKDOWN
SELECT 
    is_active,
    status,
    COUNT(*) as count,
    pg_size_pretty(SUM(pg_column_size(description))) as total_description_size
FROM jobs
GROUP BY is_active, status
ORDER BY is_active DESC, status;

-- 5. ACTIVE JOBS COUNT (TARGET: 8,000)
SELECT 
    COUNT(*) FILTER (WHERE is_active = true AND status = 'active') as active_jobs,
    COUNT(*) FILTER (WHERE is_active = false OR status != 'active') as inactive_jobs,
    COUNT(*) as total_jobs
FROM jobs;

-- 6. JOBS BY CREATION DATE (last 30 days)
SELECT 
    DATE(created_at) as date,
    COUNT(*) as jobs_added
FROM jobs
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;

-- 7. DESCRIPTION SIZE ANALYSIS
SELECT 
    pg_size_pretty(AVG(LENGTH(description))::bigint) as avg_description_size,
    pg_size_pretty(MAX(LENGTH(description))::bigint) as max_description_size
FROM jobs;

-- 8. SIZE BREAKDOWN BY FIELD TYPE
SELECT 
    pg_size_pretty(SUM(pg_column_size(description))) as description_total,
    pg_size_pretty(SUM(pg_column_size(title))) as title_total,
    pg_size_pretty(SUM(pg_column_size(company))) as company_total,
    pg_size_pretty(SUM(pg_column_size(location))) as location_total,
    pg_size_pretty(SUM(pg_column_size(embedding))) as embedding_total
FROM jobs;

-- 9. OLDEST ACTIVE JOBS (candidates for deletion)
-- These are the jobs that would be deleted to reach 8,000 limit
SELECT 
    id,
    title,
    company,
    last_seen_at,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - last_seen_at))/86400::int as days_since_seen
FROM jobs
WHERE is_active = true AND status = 'active'
ORDER BY last_seen_at ASC NULLS FIRST
LIMIT 20;

-- 10. DELETION IMPACT ANALYSIS
-- How many foreign key references would be affected?
SELECT 
    'matches' as table_name,
    COUNT(*) as affected_rows
FROM matches m
WHERE m.job_hash IN (
    SELECT j.job_hash
    FROM jobs j
    WHERE j.is_active = true AND j.status = 'active'
    ORDER BY j.last_seen_at ASC NULLS FIRST
    LIMIT 610
)
UNION ALL
SELECT 
    'embedding_queue' as table_name,
    COUNT(*) as affected_rows
FROM embedding_queue eq
WHERE eq.job_id IN (
    SELECT j.id
    FROM jobs j
    WHERE j.is_active = true AND j.status = 'active'
    ORDER BY j.last_seen_at ASC NULLS FIRST
    LIMIT 610
);

-- 11. SUMMARY STATISTICS
SELECT 
    'Total active jobs' as metric,
    COUNT(*)::text as value
FROM jobs
WHERE is_active = true AND status = 'active'
UNION ALL
SELECT 
    'Jobs to delete (oldest)' as metric,
    '610' as value
UNION ALL
SELECT 
    'Jobs remaining after deletion' as metric,
    (COUNT(*) - 610)::text as value
FROM jobs
WHERE is_active = true AND status = 'active'
UNION ALL
SELECT 
    'Oldest job last_seen_at' as metric,
    MIN(last_seen_at)::text as value
FROM jobs
WHERE is_active = true AND status = 'active'
ORDER BY metric;

