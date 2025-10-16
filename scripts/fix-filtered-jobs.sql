-- Fix jobs that are flagged as filtered but still active
-- These should be is_active = false

UPDATE jobs
SET is_active = false,
    updated_at = NOW()
WHERE is_active = true
  AND filtered_reason IS NOT NULL
  AND filtered_reason IN (
    'experienced_level',
    'non_target_city',
    'no_business_relevance',
    'senior_manager',
    'mid_level_title',
    'ambiguous_level',
    'senior_level_role',
    'mid_senior_title',
    'retail_final',
    'law_legal_not_business_school'
  );

-- Check results
SELECT 
  COUNT(*) FILTER (WHERE is_active = true) as active_clean,
  COUNT(*) FILTER (WHERE is_active = true AND filtered_reason IS NOT NULL) as active_flagged,
  COUNT(*) FILTER (WHERE is_active = false AND filtered_reason IS NOT NULL) as inactive_filtered
FROM jobs;

