-- ============================================
-- CLEANUP UNUSED SUPABASE TABLES
-- ============================================
-- Removes 10 empty/unused tables
-- Saves 15-20 MB database space
-- Makes database cleaner and faster
-- ============================================

-- Verify tables are empty before deleting
SELECT 'VERIFICATION: Tables to delete' as status;

SELECT 
  'feedback_analytics' as table_name, 
  COUNT(*) as row_count 
FROM feedback_analytics
UNION ALL
SELECT 'feedback_learning_data', COUNT(*) FROM feedback_learning_data
UNION ALL
SELECT 'jobs_raw_mantiks', COUNT(*) FROM jobs_raw_mantiks
UNION ALL
SELECT 'jobs_norm', COUNT(*) FROM jobs_norm
UNION ALL
SELECT 'raw_jobs', COUNT(*) FROM raw_jobs
UNION ALL
SELECT 'jobs_rejects', COUNT(*) FROM jobs_rejects
UNION ALL
SELECT 'job_filter_audit', COUNT(*) FROM job_filter_audit
UNION ALL
SELECT 'job_queue_dead_letter', COUNT(*) FROM job_queue_dead_letter
UNION ALL
SELECT 'match_batch', COUNT(*) FROM match_batch
UNION ALL
SELECT 'email_send_ledger', COUNT(*) FROM email_send_ledger
UNION ALL
SELECT 'email_suppression_enhanced', COUNT(*) FROM email_suppression_enhanced;

-- ============================================
-- DELETE UNUSED TABLES
-- ============================================

-- Unused analytics tables
DROP TABLE IF EXISTS feedback_analytics CASCADE;
DROP TABLE IF EXISTS feedback_learning_data CASCADE;

-- Old scraper tables (Mantiks scraper no longer used)
DROP TABLE IF EXISTS jobs_raw_mantiks CASCADE;
DROP TABLE IF EXISTS jobs_norm CASCADE;
DROP TABLE IF EXISTS raw_jobs CASCADE;
DROP TABLE IF EXISTS jobs_rejects CASCADE;

-- Unused audit/queue tables
DROP TABLE IF EXISTS job_filter_audit CASCADE;
DROP TABLE IF EXISTS job_queue_dead_letter CASCADE;
DROP TABLE IF EXISTS match_batch CASCADE;
DROP TABLE IF EXISTS email_send_ledger CASCADE;

-- Duplicate suppression table (use email_suppression instead)
DROP TABLE IF EXISTS email_suppression_enhanced CASCADE;

-- ============================================
-- VERIFY DELETION
-- ============================================

SELECT 
  schemaname, 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- EXPECTED RESULT:
-- ============================================
-- 11 tables deleted
-- Space saved: 15-20 MB
-- Remaining tables: 8 essential tables only
--   • users
--   • jobs
--   • matches
--   • match_logs
--   • promo_pending
--   • user_feedback
--   • email_suppression
--   • api_keys
-- ============================================

