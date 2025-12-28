-- ============================================================================
-- FIX NON-BUSINESS SCHOOL JOBS
-- ============================================================================
-- Mark teaching, legal, and other non-business jobs as inactive
-- ============================================================================

-- Mark teaching/education jobs as inactive (unless business-related)
UPDATE jobs
SET 
  is_active = false,
  status = 'inactive',
  filtered_reason = 'non_business_school_relevant',
  updated_at = NOW()
WHERE is_active = true
  AND (
    LOWER(title) LIKE '%teacher%' OR
    LOWER(title) LIKE '%teaching%' OR
    LOWER(title) LIKE '%educator%' OR
    LOWER(title) LIKE '%tutor%' OR
    LOWER(title) LIKE '%instructor%' OR
    LOWER(title) LIKE '%lecturer%'
  )
  AND NOT (LOWER(title) LIKE '%business%' OR LOWER(description) LIKE '%business%');

-- Mark legal jobs as inactive (unless compliance/regulatory/business legal)
UPDATE jobs
SET 
  is_active = false,
  status = 'inactive',
  filtered_reason = 'non_business_school_relevant',
  updated_at = NOW()
WHERE is_active = true
  AND (
    LOWER(title) LIKE '%lawyer%' OR
    LOWER(title) LIKE '%attorney%' OR
    LOWER(title) LIKE '%solicitor%' OR
    LOWER(title) LIKE '%barrister%' OR
    (LOWER(title) LIKE '%legal%' AND (LOWER(title) LIKE '%counsel%' OR LOWER(title) LIKE '%advisor%'))
  )
  AND NOT (
    LOWER(title) LIKE '%compliance%' OR 
    LOWER(title) LIKE '%regulatory%' OR 
    LOWER(description) LIKE '%business%' OR 
    LOWER(description) LIKE '%corporate%' OR
    LOWER(title) LIKE '%business%legal%'
  );

-- Report: Show how many jobs were fixed
SELECT 
  'Jobs Fixed' as report_type,
  COUNT(*) FILTER (WHERE LOWER(title) LIKE '%teacher%' OR LOWER(title) LIKE '%teaching%' OR LOWER(title) LIKE '%educator%') as teaching_jobs_fixed,
  COUNT(*) FILTER (WHERE LOWER(title) LIKE '%lawyer%' OR LOWER(title) LIKE '%attorney%' OR LOWER(title) LIKE '%solicitor%') as legal_jobs_fixed,
  COUNT(*) as total_fixed
FROM jobs
WHERE is_active = false
  AND filtered_reason = 'non_business_school_relevant'
  AND (
    LOWER(title) LIKE '%teacher%' OR
    LOWER(title) LIKE '%teaching%' OR
    LOWER(title) LIKE '%educator%' OR
    LOWER(title) LIKE '%lawyer%' OR
    LOWER(title) LIKE '%attorney%' OR
    LOWER(title) LIKE '%solicitor%'
  );

