-- ============================================================================
-- VERIFY DATABASE FIXES
-- ============================================================================
-- Comprehensive verification script to check all fixes are applied correctly
-- ============================================================================

-- ============================================================================
-- 1. SECURITY VERIFICATION
-- ============================================================================

-- Check RLS is enabled
SELECT 
    'RLS Status' as check_type,
    tablename,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('jobs', 'users', 'matches')
ORDER BY tablename;

-- Check function search_path is set
SELECT 
    'Function Security' as check_type,
    proname as function_name,
    CASE 
        WHEN proconfig IS NULL THEN 'NOT SET'
        WHEN 'search_path=public' = ANY(proconfig) THEN 'SET'
        ELSE 'PARTIAL'
    END as search_path_status
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'summarize_job',
    'generate_send_token',
    'get_users_for_re_engagement',
    'calculate_next_retry',
    'is_email_suppressed',
    'generate_job_fingerprint',
    'update_user_engagement',
    'find_similar_users',
    'match_jobs_by_embedding'
  )
ORDER BY proname;

-- Check RLS policies are consolidated
SELECT 
    'RLS Policies' as check_type,
    tablename,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ') as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('match_logs', 'matches', 'promo_pending', 'users')
  AND cmd = 'INSERT'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- 2. DATA QUALITY VERIFICATION
-- ============================================================================

-- Check city/country data
SELECT 
    'Location Data' as check_type,
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN city IS NOT NULL AND city != '' THEN 1 END) as jobs_with_city,
    COUNT(CASE WHEN country IS NOT NULL AND country != '' THEN 1 END) as jobs_with_country,
    COUNT(CASE WHEN (city IS NULL OR city = '') AND location IS NOT NULL THEN 1 END) as missing_city,
    COUNT(CASE WHEN (country IS NULL OR country = '') AND location IS NOT NULL THEN 1 END) as missing_country,
    ROUND(100.0 * COUNT(CASE WHEN city IS NOT NULL AND city != '' THEN 1 END) / COUNT(*), 2) as city_coverage_pct,
    ROUND(100.0 * COUNT(CASE WHEN country IS NOT NULL AND country != '' THEN 1 END) / COUNT(*), 2) as country_coverage_pct
FROM jobs
WHERE is_active = true;

-- Check work environment distribution
SELECT 
    'Work Environment' as check_type,
    work_environment,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM jobs
WHERE is_active = true
GROUP BY work_environment
ORDER BY count DESC;

-- Check descriptions
SELECT 
    'Descriptions' as check_type,
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN description IS NULL OR description = '' THEN 1 END) as missing_description,
    COUNT(CASE WHEN LENGTH(description) < 100 THEN 1 END) as short_description,
    COUNT(CASE WHEN LENGTH(description) >= 100 THEN 1 END) as good_description,
    ROUND(100.0 * COUNT(CASE WHEN description IS NOT NULL AND description != '' THEN 1 END) / COUNT(*), 2) as description_coverage_pct,
    ROUND(AVG(LENGTH(description)), 2) as avg_description_length
FROM jobs
WHERE is_active = true;

-- Check embeddings
SELECT 
    'Embeddings' as check_type,
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as jobs_with_embeddings,
    COUNT(CASE WHEN embedding IS NULL THEN 1 END) as jobs_without_embeddings,
    ROUND(100.0 * COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) / COUNT(*), 2) as embedding_coverage_pct
FROM jobs
WHERE is_active = true;

-- ============================================================================
-- 3. CATEGORIZATION VERIFICATION
-- ============================================================================

-- Check category distribution
SELECT 
    'Categories' as check_type,
    category,
    COUNT(*) as job_count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM jobs WHERE is_active = true), 2) as percentage
FROM (
    SELECT unnest(categories) as category
    FROM jobs
    WHERE is_active = true 
      AND categories IS NOT NULL 
      AND array_length(categories, 1) > 0
) sub
GROUP BY category
ORDER BY job_count DESC
LIMIT 20;

-- Check specific categories (Sales, Tech, Product, ESG)
SELECT 
    'Specific Categories' as check_type,
    'sales-client-success' as category,
    COUNT(*) as job_count
FROM jobs
WHERE is_active = true
  AND 'sales-client-success' = ANY(categories)

UNION ALL

SELECT 
    'Specific Categories',
    'tech-transformation',
    COUNT(*)
FROM jobs
WHERE is_active = true
  AND 'tech-transformation' = ANY(categories)

UNION ALL

SELECT 
    'Specific Categories',
    'product-innovation',
    COUNT(*)
FROM jobs
WHERE is_active = true
  AND 'product-innovation' = ANY(categories)

UNION ALL

SELECT 
    'Specific Categories',
    'sustainability-esg',
    COUNT(*)
FROM jobs
WHERE is_active = true
  AND 'sustainability-esg' = ANY(categories);

-- ============================================================================
-- 4. SUMMARY REPORT
-- ============================================================================

SELECT 
    'SUMMARY' as report_section,
    'Total Active Jobs' as metric,
    COUNT(*)::TEXT as value
FROM jobs
WHERE is_active = true

UNION ALL

SELECT 
    'SUMMARY',
    'Jobs with City Data',
    COUNT(*)::TEXT
FROM jobs
WHERE is_active = true
  AND city IS NOT NULL
  AND city != ''

UNION ALL

SELECT 
    'SUMMARY',
    'Jobs with Embeddings',
    COUNT(*)::TEXT
FROM jobs
WHERE is_active = true
  AND embedding IS NOT NULL

UNION ALL

SELECT 
    'SUMMARY',
    'Jobs with Descriptions',
    COUNT(*)::TEXT
FROM jobs
WHERE is_active = true
  AND description IS NOT NULL
  AND description != ''

UNION ALL

SELECT 
    'SUMMARY',
    'RLS Enabled Tables',
    COUNT(*)::TEXT
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('jobs', 'users', 'matches')
  AND rowsecurity = true;

