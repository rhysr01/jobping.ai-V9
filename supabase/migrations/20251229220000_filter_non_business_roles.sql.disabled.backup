-- ============================================================================
-- FILTER NON-BUSINESS GRADUATE ROLES
-- ============================================================================
-- This migration filters out:
-- 1. Senior/Manager/Director roles (not suitable for business graduates)
--    Estimated: ~1,364 jobs
-- 2. Teaching/Education roles (not business school relevant)
--    Estimated: ~17 jobs
-- 3. Legal roles (lawyers, attorneys - not business legal/compliance)
--    Estimated: ~6 jobs
-- 4. Medical/Healthcare roles (doctors, nurses, therapists)
--    Estimated: ~16 jobs
-- 5. Other non-business roles
--
-- Total Estimated: ~1,403 jobs
-- Date: December 29, 2025
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FILTER SENIOR/MANAGER/DIRECTOR ROLES
-- ============================================================================
-- Exclude roles that require significant experience (not suitable for graduates)
-- BUT keep: Graduate Manager, Trainee Manager, Junior Manager, Management Trainee
UPDATE jobs
SET 
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'senior_manager_director_role',
  updated_at = NOW()
WHERE is_active = true
  AND (
    -- Senior roles (unless it's a graduate program)
    (LOWER(title) LIKE '%senior%' AND NOT (
      LOWER(title) LIKE '%graduate%senior%' OR
      LOWER(title) LIKE '%senior%graduate%' OR
      LOWER(title) LIKE '%graduate program%' OR
      LOWER(title) LIKE '%graduate scheme%'
    ))
    OR
    -- Manager roles (unless it's trainee/junior/graduate manager)
    (LOWER(title) LIKE '%manager%' AND NOT (
      LOWER(title) LIKE '%trainee%manager%' OR
      LOWER(title) LIKE '%junior%manager%' OR
      LOWER(title) LIKE '%graduate%manager%' OR
      LOWER(title) LIKE '%management trainee%' OR
      LOWER(title) LIKE '%entry level%manager%' OR
      LOWER(title) LIKE '%assistant%manager%' OR
      LOWER(title) LIKE '%account manager%' OR  -- Keep account managers (sales)
      LOWER(title) LIKE '%relationship manager%' OR  -- Keep relationship managers
      LOWER(title) LIKE '%product manager%' OR  -- Keep product managers (can be entry-level)
      LOWER(title) LIKE '%project manager%' AND (LOWER(title) LIKE '%junior%' OR LOWER(title) LIKE '%graduate%' OR LOWER(title) LIKE '%trainee%')
    ))
    OR
    -- Director roles (all directors are senior)
    LOWER(title) LIKE '%director%'
    OR
    -- Head of roles (all are senior)
    LOWER(title) LIKE '%head of%'
    OR
    -- VP/Vice President roles
    LOWER(title) LIKE '%vp%' OR
    LOWER(title) LIKE '%vice president%'
    OR
    -- Chief/Executive roles
    LOWER(title) LIKE '%chief%' OR
    LOWER(title) LIKE '%executive director%'
    OR
    -- Lead/Principal roles (unless junior/graduate)
    (LOWER(title) LIKE '%lead%' AND NOT (
      LOWER(title) LIKE '%junior%lead%' OR
      LOWER(title) LIKE '%graduate%lead%'
    ))
    OR
    (LOWER(title) LIKE '%principal%' AND NOT LOWER(title) LIKE '%graduate%')
  )
  -- Exclude if it's clearly a graduate/trainee program
  AND NOT (
    LOWER(title) LIKE '%graduate program%' OR
    LOWER(title) LIKE '%graduate scheme%' OR
    LOWER(title) LIKE '%trainee program%' OR
    LOWER(title) LIKE '%rotational program%' OR
    LOWER(title) LIKE '%leadership program%' OR
    LOWER(description) LIKE '%graduate program%' OR
    LOWER(description) LIKE '%graduate scheme%' OR
    is_graduate = true OR
    is_internship = true
  );

-- ============================================================================
-- 2. FILTER TEACHING/EDUCATION ROLES
-- ============================================================================
-- Exclude teaching roles (not business school relevant)
-- BUT keep: Business Teacher, Business Lecturer, Corporate Training
UPDATE jobs
SET 
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'teaching_education_role',
  updated_at = NOW()
WHERE is_active = true
  AND (
    LOWER(title) LIKE '%teacher%' OR
    LOWER(title) LIKE '%teaching%' OR
    LOWER(title) LIKE '%lecturer%' OR
    LOWER(title) LIKE '%educator%' OR
    LOWER(title) LIKE '%tutor%' OR
    LOWER(title) LIKE '%instructor%' OR
    LOWER(title) LIKE '%professor%' OR
    LOWER(title) LIKE '%academic%'
  )
  -- Keep business-related teaching roles
  AND NOT (
    LOWER(title) LIKE '%business%teacher%' OR
    LOWER(title) LIKE '%business%lecturer%' OR
    LOWER(title) LIKE '%business%professor%' OR
    LOWER(title) LIKE '%corporate%trainer%' OR
    LOWER(title) LIKE '%corporate%training%' OR
    LOWER(description) LIKE '%business school%' OR
    LOWER(description) LIKE '%business education%'
  );

-- ============================================================================
-- 3. FILTER LEGAL ROLES
-- ============================================================================
-- Exclude traditional legal roles (lawyers, attorneys)
-- BUT keep: Compliance, Regulatory, Business Legal, Legal Analyst (entry-level)
UPDATE jobs
SET 
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'legal_role',
  updated_at = NOW()
WHERE is_active = true
  AND (
    LOWER(title) LIKE '%lawyer%' OR
    LOWER(title) LIKE '%attorney%' OR
    LOWER(title) LIKE '%solicitor%' OR
    LOWER(title) LIKE '%barrister%' OR
    LOWER(title) LIKE '%counsel%' OR
    (LOWER(title) LIKE '%legal%' AND (
      LOWER(title) LIKE '%legal counsel%' OR
      LOWER(title) LIKE '%legal advisor%' OR
      LOWER(title) LIKE '%legal officer%'
    ))
  )
  -- Keep compliance, regulatory, and entry-level legal analyst roles
  AND NOT (
    LOWER(title) LIKE '%compliance%' OR
    LOWER(title) LIKE '%regulatory%' OR
    LOWER(title) LIKE '%legal analyst%' OR
    LOWER(title) LIKE '%junior legal%' OR
    LOWER(title) LIKE '%graduate legal%' OR
    LOWER(title) LIKE '%legal intern%' OR
    LOWER(title) LIKE '%business%legal%' OR
    LOWER(description) LIKE '%compliance%' OR
    LOWER(description) LIKE '%regulatory%'
  );

-- ============================================================================
-- 4. FILTER MEDICAL/HEALTHCARE ROLES
-- ============================================================================
-- Exclude medical roles (not business school relevant)
UPDATE jobs
SET 
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'medical_healthcare_role',
  updated_at = NOW()
WHERE is_active = true
  AND (
    LOWER(title) LIKE '%nurse%' OR
    LOWER(title) LIKE '%doctor%' OR
    LOWER(title) LIKE '%physician%' OR
    LOWER(title) LIKE '%dentist%' OR
    LOWER(title) LIKE '%therapist%' OR
    LOWER(title) LIKE '%counselor%' OR
    LOWER(title) LIKE '%psychologist%' OR
    LOWER(title) LIKE '%pharmacist%' OR
    LOWER(title) LIKE '%surgeon%' OR
    LOWER(title) LIKE '%veterinarian%' OR
    LOWER(title) LIKE '%vet%'
  )
  -- Keep business-related healthcare roles (healthcare management, etc.)
  AND NOT (
    LOWER(title) LIKE '%healthcare%manager%' OR
    LOWER(title) LIKE '%healthcare%analyst%' OR
    LOWER(title) LIKE '%healthcare%consultant%' OR
    LOWER(title) LIKE '%hospital%administrator%' OR
    LOWER(description) LIKE '%healthcare management%' OR
    LOWER(description) LIKE '%healthcare business%'
  );

-- ============================================================================
-- 5. FILTER OTHER NON-BUSINESS ROLES
-- ============================================================================
-- Exclude other roles not suitable for business graduates
UPDATE jobs
SET 
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'non_business_role',
  updated_at = NOW()
WHERE is_active = true
  AND (
    -- Engineering (unless software/IT/business-related)
    (LOWER(title) LIKE '%engineer%' AND (
      LOWER(title) LIKE '%mechanical%engineer%' OR
      LOWER(title) LIKE '%civil%engineer%' OR
      LOWER(title) LIKE '%electrical%engineer%' OR
      LOWER(title) LIKE '%chemical%engineer%'
    ) AND NOT (
      LOWER(title) LIKE '%software%' OR
      LOWER(title) LIKE '%it%' OR
      LOWER(title) LIKE '%business%' OR
      LOWER(description) LIKE '%software%' OR
      LOWER(description) LIKE '%it%' OR
      LOWER(description) LIKE '%business%'
    ))
    OR
    -- Hospitality/Service roles
    (LOWER(title) LIKE '%waiter%' OR
     LOWER(title) LIKE '%waitress%' OR
     LOWER(title) LIKE '%cameriere%' OR
     LOWER(title) LIKE '%bartender%' OR
     LOWER(title) LIKE '%chef%' OR
     LOWER(title) LIKE '%cook%')
    OR
    -- Retail (unless management/business)
    (LOWER(title) LIKE '%retail%' AND NOT (
      LOWER(title) LIKE '%retail%manager%' OR
      LOWER(title) LIKE '%retail%analyst%' OR
      LOWER(title) LIKE '%retail%consultant%'
    ))
    OR
    -- Military
    (LOWER(title) LIKE '%soldier%' OR
     LOWER(title) LIKE '%army%' OR
     LOWER(title) LIKE '%military%')
    OR
    -- Fitness/Sports (unless business-related)
    ((LOWER(title) LIKE '%trainer%' OR LOWER(title) LIKE '%coach%') AND (
      LOWER(description) LIKE '%fitness%' OR
      LOWER(description) LIKE '%gym%' OR
      LOWER(description) LIKE '%sport%'
    ) AND NOT LOWER(title) LIKE '%business%')
  )
  -- Exclude if it's business-related
  AND NOT (
    LOWER(title) LIKE '%business%' OR
    LOWER(title) LIKE '%strategy%' OR
    LOWER(title) LIKE '%finance%' OR
    LOWER(title) LIKE '%consulting%' OR
    LOWER(description) LIKE '%business%' OR
    LOWER(description) LIKE '%corporate%'
  );

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================
-- Check how many jobs were filtered:
-- SELECT 
--     filtered_reason,
--     COUNT(*) as job_count
-- FROM jobs
-- WHERE is_active = false
--   AND filtered_reason LIKE '%senior%' 
--      OR filtered_reason LIKE '%teaching%'
--      OR filtered_reason LIKE '%legal%'
--      OR filtered_reason LIKE '%medical%'
--      OR filtered_reason LIKE '%non_business%'
-- GROUP BY filtered_reason
-- ORDER BY job_count DESC;
--
-- Check remaining active jobs:
-- SELECT COUNT(*) as active_jobs FROM jobs WHERE is_active = true;

