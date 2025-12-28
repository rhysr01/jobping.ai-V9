-- Migration: Add GIN index on match_logs.match_tags and ensure YoE columns exist
-- Created: 2025-01-29
-- Purpose: 
--   1. Add GIN index on match_logs.match_tags for penalty query performance (<100ms)
--   2. Add min_yoe and max_yoe columns to jobs table if they don't exist

BEGIN;

-- ============================================
-- 1. ADD YoE COLUMNS TO jobs TABLE (if they don't exist)
-- ============================================
-- These columns are extracted by processor.cjs and used for hard gates
DO $$
BEGIN
    -- Add min_yoe column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'min_yoe'
    ) THEN
        ALTER TABLE jobs ADD COLUMN min_yoe INTEGER;
        COMMENT ON COLUMN jobs.min_yoe IS 'Minimum years of experience required (extracted via regex, null if extraction failed)';
    END IF;

    -- Add max_yoe column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'max_yoe'
    ) THEN
        ALTER TABLE jobs ADD COLUMN max_yoe INTEGER;
        COMMENT ON COLUMN jobs.max_yoe IS 'Maximum years of experience required (extracted via regex, null if extraction failed)';
    END IF;
END $$;

-- ============================================
-- 2. ADD match_tags COLUMN TO match_logs TABLE (if it doesn't exist)
-- ============================================
-- This column stores JSONB metadata including feedback_type, action (apply_clicked), etc.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'match_logs' 
        AND column_name = 'match_tags'
    ) THEN
        ALTER TABLE match_logs ADD COLUMN match_tags JSONB;
        COMMENT ON COLUMN match_logs.match_tags IS 'JSONB metadata including feedback_type, action (apply_clicked), source, session_id, etc.';
    END IF;

    -- Also add match_quality if it doesn't exist (needed for penalty calculation)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'match_logs' 
        AND column_name = 'match_quality'
    ) THEN
        ALTER TABLE match_logs ADD COLUMN match_quality TEXT;
        COMMENT ON COLUMN match_logs.match_quality IS 'Match quality: positive, negative, neutral, click, hide';
    END IF;

    -- Also add job_context if it doesn't exist (needed for penalty calculation)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'match_logs' 
        AND column_name = 'job_context'
    ) THEN
        ALTER TABLE match_logs ADD COLUMN job_context JSONB;
        COMMENT ON COLUMN match_logs.job_context IS 'JSONB containing job metadata (category, career_path, etc.) for penalty calculation';
    END IF;
END $$;

-- ============================================
-- 3. ADD GIN INDEX ON match_logs.match_tags
-- ============================================
-- Critical for penalty calculation performance - keeps queries under 100ms
-- GIN index enables fast JSONB queries like: match_tags->>'action' = 'apply_clicked'
CREATE INDEX IF NOT EXISTS idx_match_logs_match_tags_gin 
    ON match_logs USING GIN(match_tags)
    WHERE match_tags IS NOT NULL;

COMMENT ON INDEX idx_match_logs_match_tags_gin IS 'GIN index on match_logs.match_tags JSONB column. Critical for penalty calculation performance. Enables fast queries filtering by action (apply_clicked), feedback_type, etc.';

-- ============================================
-- 4. ADD COMPOSITE INDEX FOR PENALTY QUERIES
-- ============================================
-- Optimizes the penalty calculation query pattern:
-- SELECT ... FROM match_logs 
-- WHERE user_email = ? AND created_at >= ? 
-- ORDER BY created_at DESC LIMIT 100
CREATE INDEX IF NOT EXISTS idx_match_logs_user_email_created_at 
    ON match_logs(user_email, created_at DESC)
    WHERE match_tags IS NOT NULL;

COMMENT ON INDEX idx_match_logs_user_email_created_at IS 'Composite index for penalty calculation queries filtering by user_email and created_at. Optimizes 30-day feedback window queries.';

COMMIT;

