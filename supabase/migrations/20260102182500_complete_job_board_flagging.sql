-- ============================================================================
-- COMPLETE JOB BOARD FLAGGING
-- ============================================================================
-- Flags remaining Reed/Reed Recruitment jobs that were missed
--
-- Date: January 2, 2026
-- ============================================================================

BEGIN;

-- Flag remaining Reed jobs (even if they have other filtered reasons)
UPDATE jobs
SET 
  filtered_reason = CASE
    WHEN filtered_reason IS NULL THEN 'job_board_as_company'
    WHEN filtered_reason NOT LIKE '%job_board_as_company%' THEN filtered_reason || '; job_board_as_company'
    ELSE filtered_reason
  END,
  company_name = NULL,
  is_active = false,
  status = 'inactive',
  updated_at = NOW()
WHERE company IN ('Reed', 'Reed Recruitment')
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%job_board_as_company%');

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- SELECT 
--   company,
--   COUNT(*) as total,
--   COUNT(CASE WHEN filtered_reason LIKE '%job_board_as_company%' THEN 1 END) as flagged
-- FROM jobs
-- WHERE company IN ('Reed', 'Reed Recruitment')
-- GROUP BY company;

