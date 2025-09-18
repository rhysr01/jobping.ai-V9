-- Database Optimization Script: Performance Indexes for Job Management
-- This script creates indexes to optimize job cleanup, matching, and general performance
-- Safe to run multiple times (uses IF NOT EXISTS)

-- =============================================
-- JOB CLEANUP OPTIMIZATION INDEXES
-- =============================================

-- Index for age-based cleanup queries (primary cleanup index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_created_at 
ON jobs(created_at DESC);

-- Index for lifecycle-based cleanup (last_seen_at tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_last_seen_at 
ON jobs(last_seen_at DESC);

-- Composite index for complex cleanup queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_cleanup_composite 
ON jobs(created_at, is_active, last_seen_at) 
WHERE is_active = true;

-- =============================================
-- JOB MATCHING OPTIMIZATION INDEXES
-- =============================================

-- Index for freshness tier queries (used in job matching)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_freshness_tier 
ON jobs(freshness_tier, created_at DESC) 
WHERE freshness_tier IS NOT NULL;

-- Index for location-based filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_location 
ON jobs(location);

-- Index for experience level filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_experience 
ON jobs(experience_required);

-- Index for source tracking and debugging
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_source 
ON jobs(source, created_at DESC);

-- =============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =============================================

-- Index for active job filtering (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_active_recent 
ON jobs(is_active, created_at DESC) 
WHERE is_active = true;

-- Index for job hash uniqueness checks (faster upserts)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_hash_unique 
ON jobs(job_hash);

-- Index for scraper run tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_scraper_run 
ON jobs(scraper_run_id, created_at DESC) 
WHERE scraper_run_id IS NOT NULL;

-- =============================================
-- ANALYTICS AND MONITORING INDEXES
-- =============================================

-- Index for date-range analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_created_date_only 
ON jobs(DATE(created_at));

-- Index for company analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_company_created 
ON jobs(company, created_at DESC);

-- =============================================
-- MAINTENANCE QUERIES
-- =============================================

-- Show index creation progress
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'jobs' 
ORDER BY indexname;

-- Show table statistics after index creation
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE relname = 'jobs';

-- Show index usage statistics (run after some time in production)
SELECT 
    indexrelname as index_name,
    idx_tup_read as index_reads,
    idx_tup_fetch as index_fetches,
    idx_scan as index_scans
FROM pg_stat_user_indexes 
WHERE relname = 'jobs'
ORDER BY idx_scan DESC;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON INDEX idx_jobs_created_at IS 'Primary index for job age calculations and cleanup queries';
COMMENT ON INDEX idx_jobs_last_seen_at IS 'Index for job lifecycle tracking and stale job identification';
COMMENT ON INDEX idx_jobs_cleanup_composite IS 'Composite index optimizing complex cleanup operations';
COMMENT ON INDEX idx_jobs_freshness_tier IS 'Index for job matching freshness tier queries';
COMMENT ON INDEX idx_jobs_active_recent IS 'Most frequently used index for active job queries';
COMMENT ON INDEX idx_jobs_hash_unique IS 'Ensures job hash uniqueness for efficient upserts';
