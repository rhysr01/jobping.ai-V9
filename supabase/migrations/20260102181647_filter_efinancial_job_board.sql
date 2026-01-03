-- ============================================================================
-- FILTER EFINANCIAL JOB BOARD
-- ============================================================================
-- This migration flags jobs from efinancial careers job board
-- that were incorrectly saved with "efinancial" or "efinancial careers" 
-- as the company name.
--
-- Date: January 2, 2026
-- ============================================================================

BEGIN;

-- ============================================================================
-- FLAG EFINANCIAL JOB BOARD COMPANIES
-- ============================================================================
-- Flag jobs where company or company_name contains "efinancial"
-- This matches the filter added to processor.cjs and jobValidator.cjs
UPDATE jobs
SET 
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'job_board_as_company',
  company_name = NULL,
  updated_at = NOW()
WHERE (
  company ILIKE '%efinancial%'
  OR company_name ILIKE '%efinancial%'
)
AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%job_board_as_company%');

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================
-- Check how many jobs were flagged:
-- SELECT COUNT(*) as efinancial_jobs_flagged 
-- FROM jobs 
-- WHERE filtered_reason LIKE '%job_board_as_company%'
--   AND (company ILIKE '%efinancial%' OR company_name ILIKE '%efinancial%');
--
-- Check all job board companies flagged:
-- SELECT 
--   company,
--   company_name,
--   COUNT(*) as job_count
-- FROM jobs
-- WHERE filtered_reason LIKE '%job_board_as_company%'
-- GROUP BY company, company_name
-- ORDER BY job_count DESC;

