-- ============================================================================
-- DASHBOARD PERFORMANCE INDEXES & COLUMNS
-- ============================================================================
-- Created: 2025-01-29
-- Purpose: Add critical indexes and columns for dashboard performance
--          - job_hash column for fast joins
--          - GIN index on match_tags for JSONB searches
--          - Backfill existing data
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD job_hash COLUMN TO match_logs
-- ============================================================================
-- CRITICAL: This is NOT optional - dashboard views need this for performance
-- Without this, joins between match_logs and jobs will be slow at scale

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'match_logs' 
        AND column_name = 'job_hash'
    ) THEN
        ALTER TABLE match_logs ADD COLUMN job_hash TEXT;
        COMMENT ON COLUMN match_logs.job_hash IS 'Job hash for direct joins with jobs table. CRITICAL for dashboard performance. Enables fast CTR/Apply tracking queries.';
        
        -- Backfill from job_context JSONB if possible
        UPDATE match_logs
        SET job_hash = job_context->>'job_hash'
        WHERE job_hash IS NULL 
          AND job_context IS NOT NULL 
          AND job_context->>'job_hash' IS NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- 2. CREATE INDEX ON job_hash
-- ============================================================================
-- Critical for dashboard query performance - enables fast joins
CREATE INDEX IF NOT EXISTS idx_match_logs_job_hash 
    ON match_logs(job_hash)
    WHERE job_hash IS NOT NULL;

COMMENT ON INDEX idx_match_logs_job_hash IS 'Index on match_logs.job_hash for fast joins with jobs table. Critical for dashboard performance.';

-- ============================================================================
-- 3. VERIFY/CREATE GIN INDEX ON match_tags
-- ============================================================================
-- GIN index enables fast JSONB searches for feedback reasons, signal types, etc.
-- This is already created in add_match_logs_indexes_and_yoe_columns.sql
-- But we verify it exists here for completeness

CREATE INDEX IF NOT EXISTS idx_match_logs_match_tags_gin 
    ON match_logs USING GIN(match_tags)
    WHERE match_tags IS NOT NULL;

COMMENT ON INDEX idx_match_logs_match_tags_gin IS 'GIN index on match_logs.match_tags JSONB column. Critical for fast searches on feedback_type, action, signal_type, etc.';

-- ============================================================================
-- 4. COMPOSITE INDEX FOR DASHBOARD QUERIES
-- ============================================================================
-- Optimizes common dashboard query pattern: filter by date range + job_hash
CREATE INDEX IF NOT EXISTS idx_match_logs_job_hash_created_at 
    ON match_logs(job_hash, created_at DESC)
    WHERE job_hash IS NOT NULL AND match_tags IS NOT NULL;

COMMENT ON INDEX idx_match_logs_job_hash_created_at IS 'Composite index for dashboard queries filtering by job_hash and created_at. Optimizes time-range queries.';

COMMIT;

