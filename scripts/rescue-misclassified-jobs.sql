-- ============================================================================
-- RESCUE MISCLASSIFIED JOBS
-- ============================================================================
-- Reactivates jobs that were incorrectly marked as "experienced"
-- but are actually graduate/internship roles
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Rescue jobs marked experienced BUT flagged as graduate/internship
-- ============================================================================

UPDATE jobs
SET
  status = 'active',
  experience_required = 'entry-level',  -- Fix the incorrect flag
  filtered_reason = NULL,
  updated_at = now()
WHERE status = 'inactive'
  AND filtered_reason = 'experienced_level'
  AND (is_graduate = true OR is_internship = true);

-- ============================================================================
-- PART 2: Rescue VIE programs (French international volunteer - always graduate)
-- ============================================================================

UPDATE jobs
SET
  status = 'active',
  experience_required = 'entry-level',
  is_graduate = true,
  filtered_reason = NULL,
  updated_at = now()
WHERE status = 'inactive'
  AND filtered_reason = 'experienced_level'
  AND LOWER(title) LIKE '%vie %';

-- ============================================================================
-- PART 3: Rescue work-study programs (alternance, duales studium)
-- ============================================================================

UPDATE jobs
SET
  status = 'active',
  experience_required = 'entry-level',
  is_graduate = true,
  filtered_reason = NULL,
  updated_at = now()
WHERE status = 'inactive'
  AND filtered_reason = 'experienced_level'
  AND LOWER(title) ~ '(alternance|duales studium|dual study)';

-- ============================================================================
-- PART 4: Rescue roles from top firms if they're business-relevant
-- ============================================================================

UPDATE jobs
SET
  status = 'active',
  experience_required = 'entry-level',
  is_graduate = true,
  filtered_reason = NULL,
  updated_at = now()
WHERE status = 'inactive'
  AND filtered_reason = 'experienced_level'
  AND company IN (
    'McKinsey & Company', 'BCG', 'Boston Consulting Group', 'Bain & Company',
    'Goldman Sachs', 'Morgan Stanley', 'JP Morgan', 'Citi', 'Barclays', 'UBS', 'BNP Paribas',
    'Deloitte', 'PwC', 'EY', 'KPMG',
    'Amazon', 'Google', 'Microsoft'
  )
  AND LOWER(title) ~ '(analyst|associate|intern|graduate|trainee|junior)';

-- ============================================================================
-- STATISTICS
-- ============================================================================

SELECT 'RESCUE OPERATION COMPLETE' as status;

SELECT
  COUNT(*) as jobs_rescued,
  COUNT(CASE WHEN is_graduate = true THEN 1 END) as flagged_graduate,
  COUNT(CASE WHEN is_internship = true THEN 1 END) as flagged_internship
FROM jobs
WHERE status = 'active'
  AND updated_at > NOW() - INTERVAL '1 minute';

-- Total active now
SELECT
  COUNT(*) as total_active_jobs
FROM jobs
WHERE status = 'active';

COMMIT;

-- ============================================================================
-- END
-- ============================================================================

