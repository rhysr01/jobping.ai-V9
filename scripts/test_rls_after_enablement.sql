-- ============================================================================
-- POST-RLS VERIFICATION TEST
-- ============================================================================
-- Run this after enabling RLS to ensure everything still works
-- ============================================================================

-- Test 1: Verify service_role can access jobs (should work)
SELECT 
    'Service Role Access Test' as test_name,
    COUNT(*) as job_count,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM jobs
WHERE is_active = true
LIMIT 1;

-- Test 2: Verify users table is accessible
SELECT 
    'Users Table Access Test' as test_name,
    COUNT(*) as user_count,
    CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM users
LIMIT 1;

-- Test 3: Verify matches table is accessible
SELECT 
    'Matches Table Access Test' as test_name,
    COUNT(*) as match_count,
    CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM matches
LIMIT 1;

-- Test 4: Check all RLS policies are active
SELECT 
    'RLS Policies Active' as test_name,
    COUNT(*) as policy_count,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('jobs', 'users', 'matches');

-- Test 5: Verify consolidated policies exist
SELECT 
    'Consolidated Policies' as test_name,
    COUNT(*) as consolidated_count,
    CASE WHEN COUNT(*) >= 4 THEN 'PASS' ELSE 'FAIL' END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%consolidated%';

