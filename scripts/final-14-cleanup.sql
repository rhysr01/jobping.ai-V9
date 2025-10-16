-- ============================================================================
-- FINAL 14 JOB CLEANUP
-- ============================================================================
-- Removes remaining unflagged jobs (teachers, technicians from non-target cities)
-- ============================================================================

BEGIN;

-- Remove teaching/education roles (not business school)
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'teaching_education_not_business',
  updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(teacher|teaching assistant|tutor|employability)';

-- Remove technical/trades (not business school)
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'technical_trades_not_business',
  updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(technician|commissioning|electrician)';

-- Remove qualified professionals (solicitor, etc)
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'qualified_professional_not_entry',
  updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(solicitor|lawyer|bookkeeper)';

-- Remove admin assistants from non-target cities
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'admin_assistant_non_target_city',
  updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) LIKE '%admin%assistant%'
  AND location !~ '^(London|Paris|Milan|Berlin|Madrid|Amsterdam|Munich|Hamburg|Zurich|Rome|Dublin|Brussels)';

-- FINAL CHECK
SELECT
  COUNT(*) as total_active,
  COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) as flagged,
  COUNT(CASE WHEN is_graduate = false AND is_internship = false THEN 1 END) as still_unflagged,
  ROUND(100.0 * COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) / COUNT(*), 2) as pct_flagged
FROM jobs
WHERE status = 'active';

COMMIT;

