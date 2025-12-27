-- ============================================================================
-- ESTIMATE DELETION IMPACT
-- ============================================================================
-- Shows exactly how much space will be freed by deleting jobs 26+ days old
-- ============================================================================

-- 1. Count jobs to be deleted
SELECT 
    COUNT(*) as jobs_to_delete,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as jobs_with_embeddings_to_delete,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_jobs_to_delete,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_jobs_to_delete
FROM public.jobs
WHERE created_at IS NOT NULL
  AND created_at < NOW() - INTERVAL '26 days';

-- 2. Estimate storage freed (rough calculation)
-- Note: This is an estimate - actual space freed depends on index structure
WITH deletion_stats AS (
    SELECT 
        COUNT(*) as total_to_delete,
        COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings
    FROM public.jobs
    WHERE created_at IS NOT NULL
      AND created_at < NOW() - INTERVAL '26 days'
)
SELECT 
    total_to_delete,
    with_embeddings,
    -- Rough estimate: each job row is ~6.3 KB (56 MB / 8871 jobs)
    -- Plus ~6 KB per embedding
    -- Plus index overhead (401 MB / 8871 jobs = ~46 KB per job in indexes)
    pg_size_pretty((total_to_delete * 6300::bigint) + (with_embeddings * 6144::bigint) + (total_to_delete * 46000::bigint)) as estimated_storage_freed
FROM deletion_stats;

-- 3. Show age distribution
SELECT 
    CASE 
        WHEN created_at < NOW() - INTERVAL '60 days' THEN '60+ days old'
        WHEN created_at < NOW() - INTERVAL '30 days' THEN '30-60 days old'
        WHEN created_at < NOW() - INTERVAL '26 days' THEN '26-30 days old'
        WHEN created_at < NOW() - INTERVAL '14 days' THEN '14-26 days old'
        WHEN created_at < NOW() - INTERVAL '7 days' THEN '7-14 days old'
        ELSE 'Less than 7 days old'
    END as age_category,
    COUNT(*) as job_count,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active
FROM public.jobs
WHERE created_at IS NOT NULL
GROUP BY 
    CASE 
        WHEN created_at < NOW() - INTERVAL '60 days' THEN '60+ days old'
        WHEN created_at < NOW() - INTERVAL '30 days' THEN '30-60 days old'
        WHEN created_at < NOW() - INTERVAL '26 days' THEN '26-30 days old'
        WHEN created_at < NOW() - INTERVAL '14 days' THEN '14-26 days old'
        WHEN created_at < NOW() - INTERVAL '7 days' THEN '7-14 days old'
        ELSE 'Less than 7 days old'
    END
ORDER BY 
    CASE 
        WHEN age_category = '60+ days old' THEN 1
        WHEN age_category = '30-60 days old' THEN 2
        WHEN age_category = '26-30 days old' THEN 3
        WHEN age_category = '14-26 days old' THEN 4
        WHEN age_category = '7-14 days old' THEN 5
        ELSE 6
    END;

