-- ============================================================================
-- REMOVE UNUSED AND REDUNDANT INDEXES
-- ============================================================================
-- This script identifies and removes:
-- 1. Indexes that have never been used (idx_scan = 0)
-- 2. Duplicate/redundant indexes on the same columns
-- 3. Indexes that are no longer needed based on codebase analysis
-- ============================================================================
-- WARNING: Review usage statistics before running!
-- Run the verification queries at the bottom first to see what will be removed
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. REMOVE DUPLICATE/REDUNDANT INDEXES ON JOBS TABLE
-- ============================================================================

-- Remove idx_jobs_created_at (duplicate of idx_jobs_created_at_desc)
-- idx_jobs_created_at_desc is used more frequently (1174 vs 219 uses)
-- Both have the same definition: created_at DESC WHERE is_active = true
DROP INDEX IF EXISTS public.idx_jobs_created_at;

-- Remove idx_jobs_categories (redundant - idx_jobs_categories_gin is more specific)
-- idx_jobs_categories_gin has a more restrictive WHERE clause and is smaller
-- Both serve the same purpose for category filtering
DROP INDEX IF EXISTS public.idx_jobs_categories;

-- ============================================================================
-- 2. REMOVE UNUSED INDEXES ON PUBLIC SCHEMA TABLES (0 scans)
-- ============================================================================

-- Jobs table unused indexes
-- jobs_fingerprint_unique: Has 0 scans but is UNIQUE constraint - KEEP for data integrity
-- (fingerprint is used for deduplication, even if index isn't scanned)

-- Analytics events - all indexes have 0 scans (table may be unused)
DROP INDEX IF EXISTS public.analytics_events_created_at_idx;
DROP INDEX IF EXISTS public.analytics_events_event_created_idx;
DROP INDEX IF EXISTS public.analytics_events_event_name_idx;
DROP INDEX IF EXISTS public.analytics_events_properties_gin_idx;
-- Note: Keeping analytics_events_pkey as it's a PRIMARY KEY constraint

-- Users table unused indexes
-- idx_users_free_expires: Has 0 scans but might be useful for cleanup queries
-- Keeping it for now as it's only 16 kB and could help with free user cleanup

-- Free signups analytics - unused indexes (table is only inserted into, not queried)
DROP INDEX IF EXISTS public.idx_free_signups_email;  -- 0 scans, 16 kB
DROP INDEX IF EXISTS public.idx_free_signups_created;  -- 0 scans, 16 kB
-- Note: Keeping free_signups_analytics_pkey as it's a PRIMARY KEY constraint

-- User feedback - unused unique constraint index
-- unique_user_job_feedback has 0 scans, but is a UNIQUE constraint - KEEP for data integrity

-- API keys - keeping pkey and key_hash_key as they're constraints
-- (These have 0 scans but are needed for data integrity)

-- ============================================================================
-- 3. REMOVE UNUSED INDEXES ON FREE_SESSIONS (potential duplicates)
-- ============================================================================

-- idx_free_sessions_session_id is redundant with free_sessions_session_id_key (UNIQUE)
-- Both index the same column, but the unique constraint is sufficient
DROP INDEX IF EXISTS public.idx_free_sessions_session_id;

-- Free sessions other unused indexes (all have 0 scans)
DROP INDEX IF EXISTS public.idx_free_sessions_user_email;  -- 0 scans, 8 kB
DROP INDEX IF EXISTS public.idx_free_sessions_expires_at;  -- 0 scans, 8 kB

-- ============================================================================
-- 4. REMOVE UNUSED INDEXES ON STRIPE_CONNECT_ACCOUNTS
-- ============================================================================

-- These indexes have 0 scans - account_id already has UNIQUE constraint index
-- user_id index might be useful, but since it's unused, remove it
-- (Can be recreated if needed for future queries)
DROP INDEX IF EXISTS public.idx_stripe_connect_accounts_user_id;  -- 0 scans, 8 kB
DROP INDEX IF EXISTS public.idx_stripe_connect_accounts_account_id;  -- 0 scans, 8 kB
-- Note: Keeping stripe_connect_accounts_account_id_key as it's a UNIQUE constraint

-- ============================================================================
-- 5. NOTES ON INDEXES KEPT
-- ============================================================================
-- The following indexes are kept because they serve unique purposes:
-- - All PRIMARY KEY indexes (needed for constraints)
-- - All UNIQUE constraint indexes (needed for data integrity)
-- - jobs_fingerprint_unique: UNIQUE constraint needed for deduplication
-- - idx_jobs_categories_gin: More specific than idx_jobs_categories (smaller, more restrictive WHERE)
-- - idx_jobs_created_at_desc: More frequently used than idx_jobs_created_at (1174 vs 219 uses)
-- - idx_users_free_expires: Kept as it might be useful for cleanup queries (only 16 kB)
-- - unique_user_job_feedback: UNIQUE constraint needed for data integrity

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these BEFORE and AFTER to verify the changes:

-- 1. Check which indexes were removed (should return empty after running)
-- SELECT 
--     schemaname,
--     tablename,
--     indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname IN (
--       'idx_jobs_created_at',
--       'idx_jobs_categories',
--       'analytics_events_created_at_idx',
--       'analytics_events_event_created_idx',
--       'analytics_events_event_name_idx',
--       'analytics_events_properties_gin_idx',
--       'idx_free_signups_email',
--       'idx_free_signups_created',
--       'idx_free_sessions_session_id',
--       'idx_free_sessions_user_email',
--       'idx_free_sessions_expires_at',
--       'idx_stripe_connect_accounts_user_id',
--       'idx_stripe_connect_accounts_account_id'
--   );

-- 2. Check remaining indexes on jobs table (sorted by usage)
-- SELECT 
--     s.indexrelname as indexname,
--     s.idx_scan as times_used,
--     pg_size_pretty(pg_relation_size(s.indexrelid)) as index_size,
--     i.indexdef
-- FROM pg_stat_user_indexes s
-- JOIN pg_indexes i ON i.indexname = s.indexrelname AND i.tablename = s.relname
-- WHERE s.schemaname = 'public' 
--   AND s.relname = 'jobs'
-- ORDER BY s.idx_scan DESC;

-- 3. Check for any other unused indexes (0 scans) that might be candidates for removal
-- SELECT 
--     s.schemaname,
--     s.relname as tablename,
--     s.indexrelname as indexname,
--     s.idx_scan as times_used,
--     pg_size_pretty(pg_relation_size(s.indexrelid)) as index_size
-- FROM pg_stat_user_indexes s
-- WHERE s.schemaname = 'public'
--   AND s.idx_scan = 0
--   AND NOT s.indexrelname LIKE '%_pkey'
--   AND NOT s.indexrelname LIKE '%_key'
--   AND NOT s.indexrelname LIKE '%_unique%'
-- ORDER BY pg_relation_size(s.indexrelid) DESC;

-- 4. Verify duplicate indexes are removed
-- SELECT 
--     indexname,
--     indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'jobs'
--   AND (
--       indexname LIKE '%created_at%' OR
--       indexname LIKE '%categories%'
--   )
-- ORDER BY indexname;

