-- ============================================================================
-- QUICK FIX - PART 1: CREATE INDEX
-- ============================================================================
-- Run this FIRST, wait for it to complete, then run PART 2
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_categories_gin 
ON jobs USING GIN(categories) 
WHERE is_active = true AND categories IS NOT NULL;

