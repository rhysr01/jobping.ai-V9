-- ============================================================================
-- CHECK JOBS BEFORE DELETION
-- ============================================================================
-- Run this BEFORE deleting to see what will be removed
-- ============================================================================

-- 1. Count jobs that will be deleted
SELECT 
    COUNT(*) as jobs_to_delete,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as jobs_with_embeddings_to_delete,
    pg_size_pretty(COUNT(*) * 6144::bigint) as estimated_embedding_storage_freed
FROM public.jobs
WHERE created_at IS NOT NULL
  AND created_at < NOW() - INTERVAL '26 days';

-- 2. Show breakdown by age
SELECT 
    CASE 
        WHEN created_at < NOW() - INTERVAL '30 days' THEN '30+ days'
        WHEN created_at < NOW() - INTERVAL '26 days' THEN '26-30 days'
        ELSE 'Recent'
    END as age_category,
    COUNT(*) as job_count,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings
FROM public.jobs
WHERE created_at IS NOT NULL
GROUP BY 
    CASE 
        WHEN created_at < NOW() - INTERVAL '30 days' THEN '30+ days'
        WHEN created_at < NOW() - INTERVAL '26 days' THEN '26-30 days'
        ELSE 'Recent'
    END
ORDER BY age_category;

-- 3. Current jobs table stats
SELECT 
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_jobs,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as jobs_with_embeddings,
    pg_size_pretty(pg_total_relation_size('public.jobs')) AS current_total_size,
    pg_size_pretty(pg_relation_size('public.jobs')) AS current_data_size,
    pg_size_pretty(pg_total_relation_size('public.jobs') - pg_relation_size('public.jobs')) AS current_indexes_size
FROM public.jobs;

