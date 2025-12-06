-- ============================================================================
-- ADD ENTRY LEVEL PREFERENCE CATEGORIES
-- ============================================================================
-- This migration ensures all jobs are categorized into at least one of the
-- entry level preference categories from the signup form:
-- - Internship
-- - Graduate Programmes (graduate-programme)
-- - Entry Level (entry-level)
-- - Working Student (working-student)
-- ============================================================================

-- Add 'internship' category to all jobs with is_internship = true
UPDATE jobs
SET categories = array_append(
  COALESCE(categories, ARRAY[]::text[]),
  'internship'
)
WHERE is_internship = true
  AND is_active = true
  AND ('internship' = ANY(categories)) IS NOT TRUE;

-- Add 'graduate-programme' category to all jobs with is_graduate = true
UPDATE jobs
SET categories = array_append(
  COALESCE(categories, ARRAY[]::text[]),
  'graduate-programme'
)
WHERE is_graduate = true
  AND is_active = true
  AND ('graduate-programme' = ANY(categories)) IS NOT TRUE;

-- Add 'working-student' category to jobs with working student terms
UPDATE jobs
SET categories = array_append(
  COALESCE(categories, ARRAY[]::text[]),
  'working-student'
)
WHERE is_active = true
  AND ('working-student' = ANY(categories)) IS NOT TRUE
  AND (
    LOWER(title) LIKE '%werkstudent%' OR
    LOWER(title) LIKE '%working student%' OR
    LOWER(title) LIKE '%part-time student%' OR
    LOWER(title) LIKE '%student worker%' OR
    LOWER(title) LIKE '%student job%' OR
    LOWER(description) LIKE '%werkstudent%' OR
    LOWER(description) LIKE '%working student%' OR
    LOWER(description) LIKE '%part-time student%' OR
    LOWER(description) LIKE '%student worker%' OR
    LOWER(description) LIKE '%student job%'
  );

-- Add 'entry-level' category to entry-level roles (not internships or graduate programmes)
UPDATE jobs
SET categories = array_append(
  COALESCE(categories, ARRAY[]::text[]),
  'entry-level'
)
WHERE is_active = true
  AND ('entry-level' = ANY(categories)) IS NOT TRUE
  AND is_internship != true
  AND is_graduate != true
  AND (
    is_early_career = true OR
    LOWER(title) LIKE '%entry level%' OR
    LOWER(title) LIKE '%entry-level%' OR
    LOWER(title) LIKE '%junior%' OR
    LOWER(title) LIKE '%associate%' OR
    LOWER(title) LIKE '%assistant%' OR
    LOWER(title) LIKE '%first full-time%' OR
    LOWER(description) LIKE '%entry level%' OR
    LOWER(description) LIKE '%entry-level%' OR
    LOWER(description) LIKE '%first full-time role%' OR
    LOWER(description) LIKE '%first full time role%'
  );

-- Ensure all active jobs have at least 'early-career' category
UPDATE jobs
SET categories = array_append(
  COALESCE(categories, ARRAY[]::text[]),
  'early-career'
)
WHERE is_active = true
  AND ('early-career' = ANY(categories)) IS NOT TRUE
  AND (
    is_internship = true OR
    is_graduate = true OR
    is_early_career = true OR
    LOWER(title) LIKE '%graduate%' OR
    LOWER(title) LIKE '%grad%' OR
    LOWER(title) LIKE '%intern%' OR
    LOWER(title) LIKE '%internship%' OR
    LOWER(title) LIKE '%entry level%' OR
    LOWER(title) LIKE '%entry-level%' OR
    LOWER(title) LIKE '%junior%' OR
    LOWER(title) LIKE '%trainee%' OR
    LOWER(title) LIKE '%associate%' OR
    LOWER(title) LIKE '%assistant%' OR
    LOWER(description) LIKE '%graduate%' OR
    LOWER(description) LIKE '%internship%' OR
    LOWER(description) LIKE '%entry level%'
  );

-- Report: Show distribution of entry level categories
SELECT 
  'Entry Level Category Distribution' as report_type,
  COUNT(*) FILTER (WHERE 'internship' = ANY(categories)) as internship_count,
  COUNT(*) FILTER (WHERE 'graduate-programme' = ANY(categories)) as graduate_programme_count,
  COUNT(*) FILTER (WHERE 'entry-level' = ANY(categories)) as entry_level_count,
  COUNT(*) FILTER (WHERE 'working-student' = ANY(categories)) as working_student_count,
  COUNT(*) FILTER (WHERE 'early-career' = ANY(categories)) as early_career_count,
  COUNT(*) as total_active_jobs
FROM jobs
WHERE is_active = true;

