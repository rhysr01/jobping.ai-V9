-- ============================================
-- DELETE jobs_backup TABLE (BLOAT)
-- ============================================
-- This table has 10,651 old job rows
-- RLS is disabled (security risk)
-- Takes up significant space
-- Not used by any code
-- ============================================

-- SAFETY CHECK: Verify jobs_backup is truly a backup
-- Compare row counts
SELECT 'jobs_backup' as table_name, COUNT(*) as rows FROM jobs_backup
UNION ALL
SELECT 'jobs (main)', COUNT(*) FROM jobs;

-- Check if any foreign keys depend on jobs_backup
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'jobs_backup';

-- ============================================
-- DELETE BACKUP TABLE
-- ============================================

-- If verification shows no dependencies, delete:
DROP TABLE IF EXISTS jobs_backup CASCADE;

-- Verify deletion
SELECT COUNT(*) as tables_named_jobs_backup
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'jobs_backup';

-- Should return 0

-- ============================================
-- SPACE SAVED:
-- ============================================
-- ~10-15 MB freed
-- No security risk from RLS-disabled table
-- Cleaner database
-- ============================================

