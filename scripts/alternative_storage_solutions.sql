-- ============================================================================
-- ALTERNATIVE STORAGE SOLUTIONS
-- ============================================================================
-- Since there are no jobs 26+ days old, here are other ways to reduce storage
-- ============================================================================

-- 1. Check inactive jobs (these might be safe to delete)
SELECT 
    COUNT(*) as inactive_jobs,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as inactive_with_embeddings,
    pg_size_pretty(COUNT(*) * 46000::bigint) as estimated_index_space_freed
FROM public.jobs
WHERE is_active = false;

-- 2. Check for duplicate jobs (same job_hash but multiple entries)
SELECT 
    job_hash,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at) as job_ids
FROM public.jobs
GROUP BY job_hash
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 20;

-- 3. Check jobs without embeddings (if you don't need them)
SELECT 
    COUNT(*) as jobs_without_embeddings,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_without_embeddings
FROM public.jobs
WHERE embedding IS NULL;

-- 4. Check embedding_queue size (might have stale entries)
SELECT 
    COUNT(*) as total_queue_entries,
    COUNT(CASE WHEN processed_at IS NULL THEN 1 END) as unprocessed,
    COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) as processed,
    COUNT(CASE WHEN processed_at < NOW() - INTERVAL '7 days' THEN 1 END) as old_processed
FROM public.embedding_queue;

-- 5. Check matches table (might have old matches)
SELECT 
    COUNT(*) as total_matches,
    COUNT(CASE WHEN matched_at < NOW() - INTERVAL '30 days' THEN 1 END) as matches_30_days_old,
    pg_size_pretty(pg_total_relation_size('public.matches')) AS matches_table_size
FROM public.matches;

-- 6. Check if VACUUM would help (shows dead tuples)
SELECT 
    schemaname,
    tablename,
    n_dead_tup as dead_tuples,
    n_live_tup as live_tuples,
    CASE 
        WHEN n_live_tup > 0 THEN ROUND((n_dead_tup::numeric / n_live_tup::numeric) * 100, 2)
        ELSE 0
    END as dead_tuple_percentage
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;

