-- Migration: Add dedupe_key column and unique index for robust deduplication
-- This migration adds the new dedupe_key column and creates a unique index
-- to prevent duplicate jobs across different sources

-- Add dedupe_key column if it doesn't exist
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

-- Create unique index on dedupe_key for fast lookups and constraint enforcement
CREATE UNIQUE INDEX IF NOT EXISTS jobs_dedupe_key_uidx ON jobs(dedupe_key);

-- Add comment for documentation
COMMENT ON COLUMN jobs.dedupe_key IS 'Unique key for deduplication across sources. Format: source|company|id_or_url|hash';

-- Optional: Add index on source for faster queries by source
CREATE INDEX IF NOT EXISTS jobs_source_idx ON jobs(source);

-- Optional: Add index on posted_at for freshness filtering
CREATE INDEX IF NOT EXISTS jobs_posted_at_idx ON jobs(posted_at);

-- Show the updated table structure
\d jobs;
