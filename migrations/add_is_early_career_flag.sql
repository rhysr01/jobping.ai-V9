-- Add is_early_career flag to jobs table
-- This flag explicitly marks all jobs as early-career (consistent with categories: ['early-career'])

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_early_career BOOLEAN DEFAULT true;

-- Set all existing active jobs to is_early_career = true
-- (since we only scrape early-career jobs)
UPDATE jobs
SET is_early_career = true
WHERE is_active = true
  AND (is_early_career IS NULL OR is_early_career = false);

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_jobs_is_early_career ON jobs(is_early_career)
WHERE is_early_career = true AND is_active = true;

-- Add comment
COMMENT ON COLUMN jobs.is_early_career IS 'Explicitly marks job as early-career. All scraped jobs should be true. Consistent with categories: [''early-career'']';

