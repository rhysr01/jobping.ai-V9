-- ============================================================================
-- REMOVE LAW & TEACHING - FINAL PASS
-- ============================================================================
-- Removes law and teaching roles REGARDLESS of graduate/internship flags
-- These are not business school target roles even if entry-level
-- ============================================================================

BEGIN;

-- ============================================================================
-- REMOVE ALL LAW/LEGAL ROLES (Even if flagged as graduate/internship)
-- ============================================================================

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'law_not_business_school',
  updated_at = now()
WHERE status = 'active'
  AND (
    LOWER(title) LIKE '%solicitor%'
    OR LOWER(title) LIKE '%lawyer%'
    OR LOWER(title) LIKE '%legal%'
    OR LOWER(title) LIKE '%attorney%'
    OR LOWER(title) LIKE '%paralegal%'
    OR LOWER(title) LIKE '%avocat%'
    OR LOWER(title) LIKE '%rechtsanwalt%'
    OR LOWER(title) LIKE '%avvocato%'
    OR LOWER(title) LIKE '%abogado%'
    OR LOWER(title) LIKE '%juriste%'
    OR LOWER(title) LIKE '%jurist%'
    OR LOWER(title) LIKE '%law clerk%'
    OR LOWER(title) LIKE '%legal counsel%'
    OR LOWER(title) LIKE '%legal advisor%'
    OR LOWER(title) LIKE '%medien- und urheberrecht%'  -- Media & copyright law
  );

-- ============================================================================
-- REMOVE ALL TEACHING/EDUCATION ROLES (Even if flagged)
-- ============================================================================

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'teaching_not_business_school',
  updated_at = now()
WHERE status = 'active'
  AND (
    LOWER(title) LIKE '%teacher%'
    OR LOWER(title) LIKE '%tutor%'
    OR LOWER(title) LIKE '%professor%'
    OR LOWER(title) LIKE '%lecturer%'
    OR LOWER(title) LIKE '%instructor%'
    OR LOWER(title) LIKE '%teaching assistant%'
    OR LOWER(title) LIKE '%employability tutor%'
    OR LOWER(title) LIKE '%education%coordinator%'
  );

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

SELECT 
  'Law/Legal remaining' as check,
  COUNT(*) as count
FROM jobs
WHERE status = 'active'
  AND LOWER(title) ~ '(solicitor|lawyer|legal|attorney|avocat)'
UNION ALL
SELECT 
  'Teaching remaining' as check,
  COUNT(*) as count
FROM jobs
WHERE status = 'active'
  AND LOWER(title) ~ '(teacher|tutor|lecturer|professor)';

-- Overall stats
SELECT
  COUNT(*) as total_active_jobs,
  COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) as flagged_early_career,
  ROUND(100.0 * COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) / COUNT(*), 1) || '%' as pct_flagged
FROM jobs
WHERE status = 'active';

COMMIT;

-- ============================================================================
-- END - No law or teaching jobs should remain
-- ============================================================================

