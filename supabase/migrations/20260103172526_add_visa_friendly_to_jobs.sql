-- ============================================================================
-- ADD VISA_FRIENDLY FIELD TO JOBS TABLE
-- ============================================================================
-- This migration adds a visa_friendly field to track visa sponsorship availability
-- null = unknown (default), true = visa sponsorship available, false = no visa sponsorship
--
-- Date: January 3, 2026
-- ============================================================================

BEGIN;

-- Add visa_friendly column to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS visa_friendly BOOLEAN DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN jobs.visa_friendly IS 'Indicates visa sponsorship availability: true = available, false = not available, null = unknown. Used for filtering jobs that offer visa sponsorship.';

-- Add index for filtering visa-friendly jobs (only index true values for performance)
CREATE INDEX IF NOT EXISTS idx_jobs_visa_friendly ON jobs(visa_friendly) 
WHERE visa_friendly = true;

COMMIT;

