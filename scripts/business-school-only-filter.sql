-- ============================================================================
-- BUSINESS SCHOOL ONLY FILTER
-- ============================================================================
-- Removes all non-business school relevant roles
-- Keeps: Finance, Consulting, Marketing, Strategy, Analytics, Operations, HR, Sales
-- Removes: Law, Teaching, Healthcare, Trades, Research, Creative (non-grad), etc.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: REMOVE LAW & LEGAL ROLES
-- ============================================================================

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'law_legal_not_business_school',
  updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(solicitor|lawyer|legal counsel|attorney|paralegal|avocat|rechtsanwalt|avvocato|abogado|juriste|jurist|law clerk|legal advisor)';

-- ============================================================================
-- PART 2: REMOVE EDUCATION & TEACHING ROLES
-- ============================================================================

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'education_teaching',
  updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(teacher|tutor|professor|lecturer|instructor|employability|teaching assistant|education coordinator)';

-- ============================================================================
-- PART 3: REMOVE SCIENCE/RESEARCH (Non-Business)
-- ============================================================================

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'science_research_non_business',
  updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(scientist|researcher|laboratory|lab technician|research assistant|biologist|chemist|physicist)';

-- ============================================================================
-- PART 4: REMOVE CREATIVE/DESIGN (Non-Graduate Level)
-- ============================================================================

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'creative_design_non_grad',
  updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(graphic designer|graphics designer|art director|creative director|illustrator|photographer|video editor)';

-- ============================================================================
-- PART 5: REMOVE FOOD SERVICE & HOSPITALITY
-- ============================================================================

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'food_hospitality',
  updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(versmedewerker|supermarket|grocery|food service|hospitality|hotel receptionist)';

-- ============================================================================
-- PART 6: REMOVE PRODUCTION & MANUFACTURING WORKERS
-- ============================================================================

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'production_manufacturing',
  updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(operaio|production worker|assembly|manufacturing|warehouse|supply worker|production supervisor)';

-- ============================================================================
-- PART 7: REMOVE ADMIN ASSISTANTS FROM NON-TARGET CITIES
-- ============================================================================

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'admin_non_target_city',
  updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(admin assistant|team admin|administrative assistant)'
  AND location !~ '^(London|Paris|Milan|Berlin|Madrid|Amsterdam|Munich|Hamburg|Zurich|Rome|Dublin|Brussels)';

-- ============================================================================
-- PART 8: REMOVE JOBS FROM NON-TARGET CITIES ENTIRELY
-- ============================================================================

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'non_target_city',
  updated_at = now()
WHERE status = 'active'
  AND location IS NOT NULL
  AND location !~ '^(London|Paris|Milan|Berlin|Madrid|Amsterdam|Munich|Hamburg|Zurich|Rome|Dublin|Brussels|Milano|München|Zürich|Bruxelles|Bru(xelles|ssels))'
  AND location NOT LIKE '%London%'
  AND location NOT LIKE '%Paris%'
  AND location NOT LIKE '%Milan%'
  AND location NOT LIKE '%Berlin%'
  AND location NOT LIKE '%Madrid%'
  AND location NOT LIKE '%Amsterdam%'
  AND location NOT LIKE '%Munich%'
  AND location NOT LIKE '%Hamburg%'
  AND location NOT LIKE '%Zurich%'
  AND location NOT LIKE '%Rome%'
  AND location NOT LIKE '%Dublin%'
  AND location NOT LIKE '%Brussels%';

-- ============================================================================
-- PART 9: REMOVE CLEARLY BROKEN JOBSPY TITLES
-- ============================================================================

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'broken_title_jobspy',
  updated_at = now()
WHERE status = 'active'
  AND source LIKE 'jobspy%'
  AND (
    title LIKE 'Actuellement%'  -- French description fragment
    OR title LIKE 'We aim%'
    OR title LIKE 'We value%'
    OR title LIKE 'Wir glauben%'  -- German description fragment
    OR title LIKE 'Capacité à%'
    OR title ~ '^[A-Z][a-z]+ [a-z]+ [a-z]+ [a-z]+ [a-z]+ [a-z]+ [a-z]+$'  -- Long sentences
    OR LENGTH(title) > 150
  );

-- ============================================================================
-- PART 10: FLAG ANY REMAINING LEGITIMATE ROLES WE MISSED
-- ============================================================================

-- Flag corporate/business roles at target companies even if not explicitly "analyst/consultant"
UPDATE jobs
SET
  is_graduate = true,
  updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND company IN ('Amazon', 'Google', 'Microsoft', 'Apple', 'Meta', 
                  'McKinsey & Company', 'BCG', 'Bain & Company',
                  'Goldman Sachs', 'JP Morgan', 'Morgan Stanley', 'Citi', 
                  'Deloitte', 'PwC', 'EY', 'KPMG',
                  'Barclays', 'UBS', 'Deutsche Bank', 'BNP Paribas')
  AND LOWER(title) ~ '(business|strategy|operations|finance|marketing|sales|data|analytics|product|commercial)';

-- ============================================================================
-- FINAL STATISTICS & QUALITY CHECK
-- ============================================================================

SELECT '========================================' as divider;
SELECT 'BUSINESS SCHOOL FILTER COMPLETE' as status;

-- Overall health
SELECT
  COUNT(*) as total_active_jobs,
  COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) as early_career_flagged,
  COUNT(CASE WHEN is_graduate = false AND is_internship = false THEN 1 END) as still_unflagged,
  ROUND(100.0 * COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) / COUNT(*), 1) || '%' as pct_flagged
FROM jobs
WHERE status = 'active';

-- City coverage
SELECT
  SPLIT_PART(location, ',', 1) as city,
  COUNT(*) as jobs
FROM jobs
WHERE status = 'active'
GROUP BY SPLIT_PART(location, ',', 1)
ORDER BY jobs DESC
LIMIT 15;

-- Verify no bad jobs remain
SELECT
  'Law/Legal' as category,
  COUNT(*) as remaining
FROM jobs
WHERE status = 'active'
  AND LOWER(title) ~ '(solicitor|lawyer|legal|attorney|avocat)'
UNION ALL
SELECT
  'Teaching' as category,
  COUNT(*) as remaining
FROM jobs
WHERE status = 'active'
  AND LOWER(title) ~ '(teacher|tutor|lecturer)'
UNION ALL
SELECT
  'Healthcare' as category,
  COUNT(*) as remaining
FROM jobs
WHERE status = 'active'
  AND LOWER(title) ~ '(nurse|doctor|medical|therapist|healthcare)'
UNION ALL
SELECT
  'Broken JobSpy' as category,
  COUNT(*) as remaining
FROM jobs
WHERE status = 'active'
  AND source LIKE 'jobspy%'
  AND (LENGTH(title) > 150 OR title LIKE 'We %' OR title LIKE 'Actuellement%');

COMMIT;

-- ============================================================================
-- END - Only business school relevant roles remain
-- ============================================================================

