-- ============================================================================
-- QUICK VERIFICATION CHECKLIST
-- ============================================================================
-- Run these queries to quickly verify all fixes are applied
-- ============================================================================

-- 1. RLS Enabled?
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('jobs', 'users', 'matches');
-- Expected: All should show rowsecurity = true

-- 2. Functions have search_path?
SELECT proname, proconfig FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
AND proname IN ('summarize_job', 'match_jobs_by_embedding')
LIMIT 2;
-- Expected: proconfig should contain 'search_path=public'

-- 3. City data coverage?
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN city IS NOT NULL AND city != '' THEN 1 END) as with_city,
    ROUND(100.0 * COUNT(CASE WHEN city IS NOT NULL AND city != '' THEN 1 END) / COUNT(*), 1) as pct
FROM jobs WHERE is_active = true;
-- Expected: pct should be > 90%

-- 4. Work environment distribution?
SELECT work_environment, COUNT(*) 
FROM jobs WHERE is_active = true 
GROUP BY work_environment;
-- Expected: More balanced distribution (not 88% on-site)

-- 5. Embeddings coverage?
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embedding,
    ROUND(100.0 * COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) / COUNT(*), 1) as pct
FROM jobs WHERE is_active = true;
-- Expected: pct should be 100% after running generate_all_embeddings.ts

-- 6. Categories exist?
SELECT category, COUNT(*) 
FROM (SELECT unnest(categories) as category FROM jobs WHERE is_active = true) sub
WHERE category IN ('sales-client-success', 'tech-transformation', 'product-innovation', 'sustainability-esg')
GROUP BY category;
-- Expected: All 4 categories should have job counts > 0

-- 7. Descriptions coverage?
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN description IS NOT NULL AND description != '' THEN 1 END) as with_desc,
    ROUND(100.0 * COUNT(CASE WHEN description IS NOT NULL AND description != '' THEN 1 END) / COUNT(*), 1) as pct
FROM jobs WHERE is_active = true;
-- Expected: pct should be > 95%

