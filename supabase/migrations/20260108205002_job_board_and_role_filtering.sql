-- Job Board and Role Filtering Migration
-- Filters out job boards and non-business graduate roles

-- 1.2. JOB BOARD FLAGGING
UPDATE jobs
SET
  filtered_reason = CASE
    WHEN filtered_reason IS NULL THEN 'job_board_as_company'
    WHEN filtered_reason NOT LIKE '%job_board_as_company%' THEN filtered_reason || '; job_board_as_company'
    ELSE filtered_reason
  END,
  company_name = NULL,
  is_active = false,
  status = 'inactive',
  updated_at = NOW()
WHERE (
  company IN ('Reed', 'Reed Recruitment', 'Indeed', 'Google', 'StepStone Group', 'StepStone', 'eFinancialCareers', 'efinancial')
  OR company ILIKE '%indeed%'
  OR company ILIKE '%reed%'
  OR company ILIKE '%adzuna%'
  OR company ILIKE '%jobspy%'
  OR company ILIKE '%linkedin%'
  OR company ILIKE '%totaljobs%'
  OR company ILIKE '%monster%'
  OR company ILIKE '%ziprecruiter%'
  OR company ILIKE '%efinancial%'
  OR company ILIKE '%stepstone%'
)
AND company NOT ILIKE '%recruitment%'
AND company NOT ILIKE '%staffing%'
AND company NOT ILIKE '%placement%'
AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%job_board_as_company%');

-- 1.17.1. FILTER CEO/EXECUTIVE ROLES
UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(
    CASE
      WHEN filtered_reason IS NULL THEN 'ceo_executive_role'
      WHEN filtered_reason NOT LIKE '%ceo_executive_role%' THEN filtered_reason || '; ceo_executive_role'
      ELSE filtered_reason
    END,
    'ceo_executive_role'
  ),
  updated_at = NOW()
WHERE is_active = true
  AND status = 'active'
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%ceo_executive_role%')
  AND (
    LOWER(title) LIKE '%ceo%' OR
    LOWER(title) LIKE '%chief executive%' OR
    LOWER(title) LIKE '%managing director%' OR
    LOWER(title) LIKE '%md %' OR
    (LOWER(title) LIKE '%chief%' AND (
      LOWER(title) LIKE '%chief officer%' OR
      LOWER(title) LIKE '%cfo%' OR
      LOWER(title) LIKE '%cto%' OR
      LOWER(title) LIKE '%coo%' OR
      LOWER(title) LIKE '%cmo%'
    )) OR
    LOWER(title) LIKE '%ceo office%' OR
    LOWER(title) LIKE '%ceo associate%' OR
    LOWER(title) LIKE '%ceo assistant%' OR
    LOWER(title) LIKE '%executive assistant%ceo%' OR
    LOWER(title) LIKE '%ceo%executive%'
  );

-- 1.17.2. FILTER CONSTRUCTION ROLES
UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(
    CASE
      WHEN filtered_reason IS NULL THEN 'construction_role'
      WHEN filtered_reason NOT LIKE '%construction_role%' THEN filtered_reason || '; construction_role'
      ELSE filtered_reason
    END,
    'construction_role'
  ),
  updated_at = NOW()
WHERE is_active = true
  AND status = 'active'
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%construction_role%')
  AND (
    (LOWER(title) LIKE '%construction%' AND NOT (
      LOWER(title) LIKE '%construction project manager%' OR
      LOWER(title) LIKE '%construction consultant%' OR
      LOWER(title) LIKE '%construction analyst%' OR
      LOWER(description) LIKE '%construction management%' OR
      LOWER(description) LIKE '%construction consultancy%'
    )) OR
    LOWER(title) LIKE '%builder%' OR
    LOWER(title) LIKE '%carpenter%' OR
    LOWER(title) LIKE '%plumber%' OR
    LOWER(title) LIKE '%electrician%' OR
    LOWER(title) LIKE '%welder%' OR
    LOWER(title) LIKE '%roofer%' OR
    LOWER(title) LIKE '%mason%' OR
    LOWER(title) LIKE '%painter%' OR
    LOWER(title) LIKE '%tiler%' OR
    LOWER(title) LIKE '%glazier%' OR
    LOWER(title) LIKE '%bricklayer%' OR
    LOWER(title) LIKE '%plasterer%'
  );

-- 1.17.3. FILTER MEDICAL/HEALTHCARE ROLES
UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(
    CASE
      WHEN filtered_reason IS NULL THEN 'medical_healthcare_role'
      WHEN filtered_reason NOT LIKE '%medical_healthcare_role%' THEN filtered_reason || '; medical_healthcare_role'
      ELSE filtered_reason
    END,
    'medical_healthcare_role'
  ),
  updated_at = NOW()
WHERE is_active = true
  AND status = 'active'
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%medical_healthcare_role%')
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
    LOWER(title) LIKE '%vet %' OR
    (LOWER(title) LIKE '%medical%' AND (
      LOWER(title) LIKE '%medical doctor%' OR
      LOWER(title) LIKE '%medical practitioner%' OR
      LOWER(title) LIKE '%medical officer%' OR
      LOWER(description) LIKE '%clinical%' OR
      LOWER(description) LIKE '%patient care%'
    ))
  )
  AND NOT (
    LOWER(title) LIKE '%healthcare%manager%' OR
    LOWER(title) LIKE '%healthcare%analyst%' OR
    LOWER(title) LIKE '%healthcare%consultant%' OR
    LOWER(title) LIKE '%hospital%administrator%' OR
    LOWER(title) LIKE '%healthcare%business%' OR
    LOWER(description) LIKE '%healthcare management%' OR
    LOWER(description) LIKE '%healthcare business%' OR
    LOWER(description) LIKE '%healthcare administration%'
  );

-- 1.17.4. FILTER LEGAL ROLES
UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(
    CASE
      WHEN filtered_reason IS NULL THEN 'legal_role'
      WHEN filtered_reason NOT LIKE '%legal_role%' THEN filtered_reason || '; legal_role'
      ELSE filtered_reason
    END,
    'legal_role'
  ),
  updated_at = NOW()
WHERE is_active = true
  AND status = 'active'
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%legal_role%')
  AND (
    LOWER(title) LIKE '%lawyer%' OR
    LOWER(title) LIKE '%attorney%' OR
    LOWER(title) LIKE '%solicitor%' OR
    LOWER(title) LIKE '%barrister%' OR
    (LOWER(title) LIKE '%legal%' AND (
      LOWER(title) LIKE '%legal counsel%' OR
      LOWER(title) LIKE '%legal advisor%' OR
      LOWER(title) LIKE '%legal officer%' OR
      LOWER(title) LIKE '%lawyer in%'
    ))
  )
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

-- 1.17.5. FILTER TEACHING/EDUCATION ROLES
UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(
    CASE
      WHEN filtered_reason IS NULL THEN 'teaching_education_role'
      WHEN filtered_reason NOT LIKE '%teaching_education_role%' THEN filtered_reason || '; teaching_education_role'
      ELSE filtered_reason
    END,
    'teaching_education_role'
  ),
  updated_at = NOW()
WHERE is_active = true
  AND status = 'active'
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%teaching_education_role%')
  AND (
    (LOWER(title) LIKE '%teacher%' OR
     LOWER(title) LIKE '%teaching%' OR
     LOWER(title) LIKE '%lecturer%' OR
     LOWER(title) LIKE '%educator%' OR
     LOWER(title) LIKE '%tutor%' OR
     LOWER(title) LIKE '%instructor%' OR
     (LOWER(title) LIKE '%professor%' AND NOT LOWER(title) LIKE '%assistant professor%business%') OR
     LOWER(title) LIKE '%academic%')
    AND NOT (
      LOWER(title) LIKE '%business%teacher%' OR
      LOWER(title) LIKE '%business%lecturer%' OR
      LOWER(title) LIKE '%business%professor%' OR
      LOWER(title) LIKE '%corporate%trainer%' OR
      LOWER(title) LIKE '%corporate%training%' OR
      LOWER(description) LIKE '%business school%' OR
      LOWER(description) LIKE '%business education%'
    )
  );

-- 1.18.1. FLAG JOBS WITH MISMATCHED CATEGORIES (Senior roles with early-career tag)
UPDATE jobs
SET
  filtered_reason = COALESCE(
    CASE
      WHEN filtered_reason IS NULL THEN 'categorization_review_needed'
      WHEN filtered_reason NOT LIKE '%categorization_review_needed%' THEN filtered_reason || '; categorization_review_needed'
      ELSE filtered_reason
    END,
    'categorization_review_needed'
  )
WHERE is_active = true
  AND status = 'active'
  AND 'early-career' = ANY(categories)
  AND (
    LOWER(title) LIKE '%senior%' OR
    LOWER(title) LIKE '%director%' OR
    LOWER(title) LIKE '%head of%' OR
    LOWER(title) LIKE '%vp%' OR
    LOWER(title) LIKE '%vice president%' OR
    LOWER(title) LIKE '%chief%' OR
    LOWER(title) LIKE '%managing director%'
  )
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%categorization_review_needed%');

-- 1.18.2. FLAG CONSTRUCTION JOBS WITH BUSINESS CATEGORIES
UPDATE jobs
SET
  filtered_reason = COALESCE(
    CASE
      WHEN filtered_reason IS NULL THEN 'categorization_review_needed'
      WHEN filtered_reason NOT LIKE '%categorization_review_needed%' THEN filtered_reason || '; categorization_review_needed'
      ELSE filtered_reason
    END,
    'categorization_review_needed'
  )
WHERE is_active = true
  AND status = 'active'
  AND (
    LOWER(title) LIKE '%construction%' OR
    LOWER(title) LIKE '%builder%' OR
    LOWER(title) LIKE '%carpenter%' OR
    LOWER(title) LIKE '%plumber%' OR
    LOWER(title) LIKE '%electrician%'
  )
  AND (
    'finance-investment' = ANY(categories) OR
    'marketing-growth' = ANY(categories) OR
    'sales-client-success' = ANY(categories) OR
    'strategy-business-design' = ANY(categories)
  )
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%categorization_review_needed%');
