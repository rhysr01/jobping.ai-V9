-- Migration: Add digest batching and enhanced tracking features
-- Created: 2025-01-28
-- Purpose: Support digest email batching, MATCH_SHOWN tracking, and pending digests queue

-- ============================================
-- 1. UPDATE signal_type ENUM (for implicit_signals table)
-- ============================================
-- Note: PostgreSQL doesn't support ALTER TYPE ADD VALUE in transaction blocks
-- This must be run outside a transaction

-- Check if enum exists and add 'shown' value if not present
DO $$
DECLARE
    enum_type_name TEXT;
    enum_type_oid OID;
BEGIN
    -- First, try to find the enum type from the implicit_signals table
    -- This handles cases where the enum might have a different name
    SELECT t.typname, t.oid INTO enum_type_name, enum_type_oid
    FROM pg_type t
    JOIN pg_attribute a ON a.atttypid = t.oid
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'implicit_signals'
    AND n.nspname = 'public'
    AND a.attname = 'signal_type'
    AND t.typtype = 'e'
    LIMIT 1;

    -- If not found from table, try common enum names
    IF enum_type_oid IS NULL THEN
        SELECT typname, oid INTO enum_type_name, enum_type_oid
        FROM pg_type
        WHERE typname IN ('signal_type', 'signal_type_enum')
        AND typtype = 'e'
        LIMIT 1;
    END IF;

    -- If enum exists, check if 'shown' value already exists and add it if needed
    IF enum_type_oid IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_enum 
            WHERE enumlabel = 'shown' 
            AND enumtypid = enum_type_oid
        ) THEN
            -- Add 'shown' to the enum (ALTER TYPE doesn't support IF NOT EXISTS, so we check first)
            EXECUTE format('ALTER TYPE %I ADD VALUE %L', enum_type_name, 'shown');
        END IF;
    ELSE
        -- Enum doesn't exist - log a warning but don't fail
        RAISE NOTICE 'signal_type enum not found. If implicit_signals table uses a different type, you may need to add ''shown'' manually.';
    END IF;
END $$;

-- ============================================
-- 2. CREATE pending_digests TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS pending_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    job_hashes JSONB NOT NULL, -- Array of job hashes with match data
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    cancelled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key to users table (optional, for cascade delete)
    CONSTRAINT fk_pending_digests_user 
        FOREIGN KEY (user_email) 
        REFERENCES users(email) 
        ON DELETE CASCADE
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_pending_digests_user_sent 
    ON pending_digests(user_email, sent);

CREATE INDEX IF NOT EXISTS idx_pending_digests_scheduled 
    ON pending_digests(scheduled_for) 
    WHERE sent = FALSE;

-- Index for scheduled digests query (most common query)
CREATE INDEX IF NOT EXISTS idx_pending_digests_ready 
    ON pending_digests(scheduled_for, sent) 
    WHERE sent = FALSE AND cancelled = FALSE;

-- ============================================
-- 3. ADD RLS POLICIES (if RLS is enabled)
-- ============================================
-- Note: Adjust based on your RLS setup

-- Allow service role to manage pending digests
ALTER TABLE pending_digests ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS pending_digests_service_role_policy ON pending_digests;
DROP POLICY IF EXISTS pending_digests_user_read_policy ON pending_digests;

-- Policy for service role (full access)
CREATE POLICY pending_digests_service_role_policy
    ON pending_digests
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy for authenticated users (read-only their own digests)
CREATE POLICY pending_digests_user_read_policy
    ON pending_digests
    FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'email' = user_email);

-- ============================================
-- 4. ADD HELPER FUNCTION FOR UPDATING updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_pending_digests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (to allow re-running migration)
DROP TRIGGER IF EXISTS pending_digests_updated_at_trigger ON pending_digests;

CREATE TRIGGER pending_digests_updated_at_trigger
    BEFORE UPDATE ON pending_digests
    FOR EACH ROW
    EXECUTE FUNCTION update_pending_digests_updated_at();

-- ============================================
-- 5. PERFORMANCE INDEXES: GIN indexes for penalty calculations
-- ============================================
-- These indexes are critical for penalty calculation queries
-- Based on actual schema: matches table has match_quality, match_tags, match_reason
-- user_feedback table has job_context (jsonb)

-- Index on matches table for penalty queries (this is where match_quality lives)
CREATE INDEX IF NOT EXISTS idx_matches_user_quality_created 
    ON matches(user_email, match_quality, created_at);

-- Index on matches.match_tags (array) for filtering
CREATE INDEX IF NOT EXISTS idx_matches_match_tags_gin 
    ON matches USING GIN(match_tags)
    WHERE match_tags IS NOT NULL;

-- Index on user_feedback.job_context (jsonb) for penalty calculations
CREATE INDEX IF NOT EXISTS idx_user_feedback_job_context_gin 
    ON user_feedback USING GIN(job_context)
    WHERE job_context IS NOT NULL;

-- Index on user_feedback for user + verdict queries
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_verdict_created 
    ON user_feedback(user_email, verdict, created_at);

-- ============================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE pending_digests IS 'Queue for scheduled digest emails. Jobs are batched and sent over time to avoid email spam.';
COMMENT ON COLUMN pending_digests.job_hashes IS 'JSONB array containing job hashes and match metadata: [{"job_hash": "...", "match_score": 85, "match_reason": "..."}]';
COMMENT ON COLUMN pending_digests.scheduled_for IS 'When this digest should be sent. Must be >= created_at + 24 hours to respect rate limits.';
COMMENT ON COLUMN pending_digests.sent IS 'Whether this digest has been sent. Used to prevent duplicate sends.';
COMMENT ON COLUMN pending_digests.cancelled IS 'Whether this digest was cancelled (e.g., user unsubscribed, all jobs became inactive).';
-- Comments for documentation
COMMENT ON INDEX idx_matches_user_quality_created IS 'Index for penalty calculation queries filtering by user_email, match_quality, and created_at.';
COMMENT ON INDEX idx_matches_match_tags_gin IS 'GIN index for fast array queries on match_tags in matches table.';
COMMENT ON INDEX idx_user_feedback_job_context_gin IS 'GIN index for fast JSONB queries on job_context in user_feedback table. Critical for penalty calculation performance.';
COMMENT ON INDEX idx_user_feedback_user_verdict_created IS 'Index for user feedback queries filtering by user_email, verdict, and created_at.';

