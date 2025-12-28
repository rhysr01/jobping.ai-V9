-- ============================================================================
-- FIX INCORRECTLY CATEGORIZED EARLY-CAREER JOBS
-- ============================================================================
-- This script removes 'early-career' and 'entry-level' categories from jobs
-- that shouldn't be categorized as early-career:
-- - Virtual Assistant, Executive Assistant, Personal Assistant roles
-- - Manager roles (unless they're specifically graduate/trainee managers)
-- - Compliance Manager, Tax Manager, Legal Manager, etc.
-- ============================================================================

-- Remove 'early-career' category from Virtual Assistant roles
UPDATE jobs
SET categories = array_remove(categories, 'early-career')
WHERE is_active = true
  AND ('early-career' = ANY(categories))
  AND (
    LOWER(title) LIKE '%virtual assistant%' OR 
    LOWER(title) LIKE '%executive assistant%' OR 
    LOWER(title) LIKE '%personal assistant%' OR
    LOWER(title) LIKE '%administrative assistant%'
  );

-- Remove 'entry-level' category from Virtual Assistant roles
UPDATE jobs
SET categories = array_remove(categories, 'entry-level')
WHERE is_active = true
  AND ('entry-level' = ANY(categories))
  AND (
    LOWER(title) LIKE '%virtual assistant%' OR 
    LOWER(title) LIKE '%executive assistant%' OR 
    LOWER(title) LIKE '%personal assistant%' OR
    LOWER(title) LIKE '%administrative assistant%'
  );

-- Remove 'early-career' category from Manager roles (unless graduate/trainee)
UPDATE jobs
SET categories = array_remove(categories, 'early-career')
WHERE is_active = true
  AND ('early-career' = ANY(categories))
  AND LOWER(title) LIKE '%manager%'
  AND NOT (LOWER(title) LIKE '%graduate%manager%' OR 
           LOWER(title) LIKE '%trainee%manager%' OR 
           LOWER(title) LIKE '%junior%manager%' OR 
           LOWER(title) LIKE '%entry%level%manager%' OR
           LOWER(title) LIKE '%associate%manager%');

-- Remove 'entry-level' category from Manager roles (unless graduate/trainee)
UPDATE jobs
SET categories = array_remove(categories, 'entry-level')
WHERE is_active = true
  AND ('entry-level' = ANY(categories))
  AND LOWER(title) LIKE '%manager%'
  AND NOT (LOWER(title) LIKE '%graduate%manager%' OR 
           LOWER(title) LIKE '%trainee%manager%' OR 
           LOWER(title) LIKE '%junior%manager%' OR 
           LOWER(title) LIKE '%entry%level%manager%' OR
           LOWER(title) LIKE '%associate%manager%');

-- Remove 'early-career' category from Compliance/Tax/Legal Manager roles
UPDATE jobs
SET categories = array_remove(categories, 'early-career')
WHERE is_active = true
  AND ('early-career' = ANY(categories))
  AND (
    LOWER(title) LIKE '%compliance%manager%' OR 
    LOWER(title) LIKE '%tax%manager%' OR 
    LOWER(title) LIKE '%legal%manager%' OR
    LOWER(title) LIKE '%regulatory%manager%' OR
    LOWER(title) LIKE '%risk%manager%' OR
    LOWER(title) LIKE '%audit%manager%' OR
    LOWER(title) LIKE '%accounting%manager%' OR
    LOWER(title) LIKE '%international tax%' OR
    LOWER(title) LIKE '%tax compliance%'
  );

-- Remove 'entry-level' category from Compliance/Tax/Legal Manager roles
UPDATE jobs
SET categories = array_remove(categories, 'entry-level')
WHERE is_active = true
  AND ('entry-level' = ANY(categories))
  AND (
    LOWER(title) LIKE '%compliance%manager%' OR 
    LOWER(title) LIKE '%tax%manager%' OR 
    LOWER(title) LIKE '%legal%manager%' OR
    LOWER(title) LIKE '%regulatory%manager%' OR
    LOWER(title) LIKE '%risk%manager%' OR
    LOWER(title) LIKE '%audit%manager%' OR
    LOWER(title) LIKE '%accounting%manager%' OR
    LOWER(title) LIKE '%international tax%' OR
    LOWER(title) LIKE '%tax compliance%'
  );

-- Also update is_early_career flag for these jobs
UPDATE jobs
SET is_early_career = false
WHERE is_active = true
  AND is_early_career = true
  AND (
    -- Virtual Assistant roles
    LOWER(title) LIKE '%virtual assistant%' OR 
    LOWER(title) LIKE '%executive assistant%' OR 
    LOWER(title) LIKE '%personal assistant%' OR
    LOWER(title) LIKE '%administrative assistant%' OR
    -- Manager roles (unless graduate/trainee)
    (LOWER(title) LIKE '%manager%' AND 
     NOT (LOWER(title) LIKE '%graduate%manager%' OR 
          LOWER(title) LIKE '%trainee%manager%' OR 
          LOWER(title) LIKE '%junior%manager%' OR 
          LOWER(title) LIKE '%entry%level%manager%' OR
          LOWER(title) LIKE '%associate%manager%')) OR
    -- Compliance/Tax/Legal Manager roles
    LOWER(title) LIKE '%compliance%manager%' OR 
    LOWER(title) LIKE '%tax%manager%' OR 
    LOWER(title) LIKE '%legal%manager%' OR
    LOWER(title) LIKE '%regulatory%manager%' OR
    LOWER(title) LIKE '%risk%manager%' OR
    LOWER(title) LIKE '%audit%manager%' OR
    LOWER(title) LIKE '%accounting%manager%' OR
    LOWER(title) LIKE '%international tax%' OR
    LOWER(title) LIKE '%tax compliance%'
  );

-- Report: Show how many jobs match the patterns (these are jobs that should NOT be early-career)
-- This shows jobs that were either fixed or already correct
SELECT 
  'Jobs Matching Patterns (Should NOT be early-career)' as report_type,
  COUNT(*) FILTER (WHERE LOWER(title) LIKE '%virtual assistant%' OR LOWER(title) LIKE '%executive assistant%' OR LOWER(title) LIKE '%personal assistant%' OR LOWER(title) LIKE '%administrative assistant%') as virtual_assistant_count,
  COUNT(*) FILTER (WHERE LOWER(title) LIKE '%manager%' AND NOT (LOWER(title) LIKE '%graduate%manager%' OR LOWER(title) LIKE '%trainee%manager%' OR LOWER(title) LIKE '%junior%manager%' OR LOWER(title) LIKE '%entry%level%manager%' OR LOWER(title) LIKE '%associate%manager%')) as manager_count,
  COUNT(*) FILTER (WHERE LOWER(title) LIKE '%compliance%manager%' OR LOWER(title) LIKE '%tax%manager%' OR LOWER(title) LIKE '%legal%manager%' OR LOWER(title) LIKE '%regulatory%manager%' OR LOWER(title) LIKE '%risk%manager%' OR LOWER(title) LIKE '%audit%manager%' OR LOWER(title) LIKE '%accounting%manager%' OR LOWER(title) LIKE '%international tax%' OR LOWER(title) LIKE '%tax compliance%') as compliance_tax_manager_count,
  COUNT(*) as total_matching_patterns
FROM jobs
WHERE is_active = true
  AND (
    LOWER(title) LIKE '%virtual assistant%' OR 
    LOWER(title) LIKE '%executive assistant%' OR 
    LOWER(title) LIKE '%personal assistant%' OR
    LOWER(title) LIKE '%administrative assistant%' OR
    (LOWER(title) LIKE '%manager%' AND NOT (LOWER(title) LIKE '%graduate%manager%' OR LOWER(title) LIKE '%trainee%manager%' OR LOWER(title) LIKE '%junior%manager%' OR LOWER(title) LIKE '%entry%level%manager%' OR LOWER(title) LIKE '%associate%manager%')) OR
    LOWER(title) LIKE '%compliance%manager%' OR 
    LOWER(title) LIKE '%tax%manager%' OR 
    LOWER(title) LIKE '%legal%manager%' OR
    LOWER(title) LIKE '%regulatory%manager%' OR
    LOWER(title) LIKE '%risk%manager%' OR
    LOWER(title) LIKE '%audit%manager%' OR
    LOWER(title) LIKE '%accounting%manager%' OR
    LOWER(title) LIKE '%international tax%' OR
    LOWER(title) LIKE '%tax compliance%'
  );

-- Report: Show jobs that STILL have early-career categories (these need manual review)
SELECT 
  'Jobs Still Incorrectly Categorized (Need Review)' as report_type,
  COUNT(*) FILTER (WHERE ('early-career' = ANY(categories) OR 'entry-level' = ANY(categories) OR is_early_career = true) AND (LOWER(title) LIKE '%virtual assistant%' OR LOWER(title) LIKE '%executive assistant%' OR LOWER(title) LIKE '%personal assistant%' OR LOWER(title) LIKE '%administrative assistant%')) as virtual_assistant_still_incorrect,
  COUNT(*) FILTER (WHERE ('early-career' = ANY(categories) OR 'entry-level' = ANY(categories) OR is_early_career = true) AND LOWER(title) LIKE '%manager%' AND NOT (LOWER(title) LIKE '%graduate%manager%' OR LOWER(title) LIKE '%trainee%manager%' OR LOWER(title) LIKE '%junior%manager%' OR LOWER(title) LIKE '%entry%level%manager%' OR LOWER(title) LIKE '%associate%manager%')) as manager_still_incorrect,
  COUNT(*) FILTER (WHERE ('early-career' = ANY(categories) OR 'entry-level' = ANY(categories) OR is_early_career = true) AND (LOWER(title) LIKE '%compliance%manager%' OR LOWER(title) LIKE '%tax%manager%' OR LOWER(title) LIKE '%legal%manager%' OR LOWER(title) LIKE '%regulatory%manager%' OR LOWER(title) LIKE '%risk%manager%' OR LOWER(title) LIKE '%audit%manager%' OR LOWER(title) LIKE '%accounting%manager%' OR LOWER(title) LIKE '%international tax%' OR LOWER(title) LIKE '%tax compliance%')) as compliance_tax_manager_still_incorrect,
  COUNT(*) FILTER (WHERE ('early-career' = ANY(categories) OR 'entry-level' = ANY(categories) OR is_early_career = true)) as total_still_incorrect
FROM jobs
WHERE is_active = true
  AND (
    LOWER(title) LIKE '%virtual assistant%' OR 
    LOWER(title) LIKE '%executive assistant%' OR 
    LOWER(title) LIKE '%personal assistant%' OR
    LOWER(title) LIKE '%administrative assistant%' OR
    (LOWER(title) LIKE '%manager%' AND NOT (LOWER(title) LIKE '%graduate%manager%' OR LOWER(title) LIKE '%trainee%manager%' OR LOWER(title) LIKE '%junior%manager%' OR LOWER(title) LIKE '%entry%level%manager%' OR LOWER(title) LIKE '%associate%manager%')) OR
    LOWER(title) LIKE '%compliance%manager%' OR 
    LOWER(title) LIKE '%tax%manager%' OR 
    LOWER(title) LIKE '%legal%manager%' OR
    LOWER(title) LIKE '%regulatory%manager%' OR
    LOWER(title) LIKE '%risk%manager%' OR
    LOWER(title) LIKE '%audit%manager%' OR
    LOWER(title) LIKE '%accounting%manager%' OR
    LOWER(title) LIKE '%international tax%' OR
    LOWER(title) LIKE '%tax compliance%'
  );

