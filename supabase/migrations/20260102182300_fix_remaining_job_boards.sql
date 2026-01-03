-- ============================================================================
-- FIX REMAINING JOB BOARD COMPANIES
-- ============================================================================
-- This migration flags remaining job board companies that were missed:
-- - Indeed (3 jobs)
-- - Reed / Reed Recruitment (6 jobs)
-- - StepStone Group (1 job)
-- - Google (1 job)
--
-- Note: Recruitment agencies (e.g., "Hays Recruitment", "Veritas Education Recruitment")
-- are legitimate companies and should NOT be filtered - they place candidates at companies.
--
-- Date: January 2, 2026
-- ============================================================================

BEGIN;

-- Flag remaining job board companies
UPDATE jobs
SET 
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'job_board_as_company',
  company_name = NULL,
  is_active = false,
  status = 'inactive',
  updated_at = NOW()
WHERE (
  -- Exact matches
  company IN ('Indeed', 'Reed', 'Google', 'StepStone Group', 'StepStone')
  OR company = 'Reed Recruitment'
  -- Pattern matches (but exclude legitimate recruitment agencies)
  OR (company ILIKE '%reed.co.uk%' AND company NOT ILIKE '%recruitment%')
  OR (company ILIKE '%indeed.com%' AND company NOT ILIKE '%recruitment%')
  OR (company ILIKE '%linkedin.com%' AND company NOT ILIKE '%recruitment%')
  OR (company ILIKE '%stepstone%' AND company NOT ILIKE '%recruitment%')
)
AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%job_board_as_company%');

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================
-- Check how many jobs were flagged:
-- SELECT 
--   company,
--   COUNT(*) as job_count,
--   COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_count
-- FROM jobs
-- WHERE filtered_reason LIKE '%job_board_as_company%'
--   AND company IN ('Indeed', 'Reed', 'Reed Recruitment', 'Google', 'StepStone Group')
-- GROUP BY company
-- ORDER BY job_count DESC;
--
-- Verify no active job board companies remain:
-- SELECT COUNT(*) as remaining_active_job_boards
-- FROM jobs
-- WHERE is_active = true
--   AND (
--     company IN ('Indeed', 'Reed', 'Google', 'StepStone Group', 'StepStone', 'Reed Recruitment')
--     OR (company ILIKE '%reed.co.uk%' AND company NOT ILIKE '%recruitment%')
--     OR (company ILIKE '%indeed.com%' AND company NOT ILIKE '%recruitment%')
--     OR (company ILIKE '%stepstone%' AND company NOT ILIKE '%recruitment%')
--   );

