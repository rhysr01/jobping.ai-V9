-- ============================================================================
-- ENSURE ALL JOBS HAVE ONE OF: INTERNSHIP, GRADUATE, OR EARLY-CAREER
-- ============================================================================
-- This migration ensures that ALL active jobs are categorized as one of:
-- 1. Internship (is_internship = true)
-- 2. Graduate (is_graduate = true)
-- 3. Early Career (is_early_career = true OR 'early-career' in categories)
--
-- Jobs that don't have any of these will be categorized as 'early-career'
-- since all jobs in the database should be entry-level/early-career roles.
-- ============================================================================

-- Step 1: Add 'early-career' category to jobs that don't have it
-- and don't have is_internship or is_graduate set
UPDATE jobs
SET 
  categories = array_append(
    COALESCE(categories, ARRAY[]::TEXT[]),
    'early-career'
  ),
  is_early_career = COALESCE(is_early_career, true)
WHERE is_active = true
  AND is_internship = false
  AND is_graduate = false
  AND (
    is_early_career = false OR 
    is_early_career IS NULL OR
    NOT ('early-career' = ANY(COALESCE(categories, ARRAY[]::TEXT[])))
  );

-- Step 2: Ensure is_early_career flag is set for jobs with 'early-career' category
-- that are not internships or graduate programs
UPDATE jobs
SET is_early_career = true
WHERE is_active = true
  AND is_internship = false
  AND is_graduate = false
  AND ('early-career' = ANY(COALESCE(categories, ARRAY[]::TEXT[])))
  AND (is_early_career = false OR is_early_career IS NULL);

-- Step 3: Ensure 'early-career' category is present for jobs with is_early_career = true
-- that are not internships or graduate programs
UPDATE jobs
SET categories = array_append(
  COALESCE(categories, ARRAY[]::TEXT[]),
  'early-career'
)
WHERE is_active = true
  AND is_internship = false
  AND is_graduate = false
  AND is_early_career = true
  AND NOT ('early-career' = ANY(COALESCE(categories, ARRAY[]::TEXT[])));

-- Verification query: Check that all active jobs have one of the three categories
-- Run this to verify the migration worked:
-- SELECT 
--   COUNT(*) FILTER (WHERE is_internship = true) as internship_count,
--   COUNT(*) FILTER (WHERE is_graduate = true) as graduate_count,
--   COUNT(*) FILTER (WHERE ('early-career' = ANY(categories) AND is_internship = false AND is_graduate = false) OR (is_early_career = true AND is_internship = false AND is_graduate = false)) as early_career_count,
--   COUNT(*) FILTER (WHERE is_internship = false AND is_graduate = false AND is_early_career = false AND NOT ('early-career' = ANY(categories))) as uncategorized_count,
--   COUNT(*) as total_active_jobs
-- FROM jobs
-- WHERE is_active = true;

-- Report: Show distribution after migration
SELECT 
  'Job Categorization Report' as report_type,
  COUNT(*) FILTER (WHERE is_internship = true) as internship_count,
  COUNT(*) FILTER (WHERE is_graduate = true) as graduate_count,
  COUNT(*) FILTER (WHERE ('early-career' = ANY(categories) AND is_internship = false AND is_graduate = false) OR (is_early_career = true AND is_internship = false AND is_graduate = false)) as early_career_count,
  COUNT(*) FILTER (WHERE is_internship = false AND is_graduate = false AND is_early_career = false AND NOT ('early-career' = ANY(categories))) as uncategorized_count,
  COUNT(*) as total_active_jobs
FROM jobs
WHERE is_active = true;

