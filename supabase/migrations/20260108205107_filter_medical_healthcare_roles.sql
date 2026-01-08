-- Filter Medical and Healthcare Roles
-- Target: Remove medical, healthcare clinical roles
-- BUT keep: Healthcare Management, Healthcare Analyst, Healthcare Consultant (business roles)
-- Limit: 100 rows per batch

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
  -- Keep business-related healthcare roles
  AND NOT (
    LOWER(title) LIKE '%healthcare%manager%' OR
    LOWER(title) LIKE '%healthcare%analyst%' OR
    LOWER(title) LIKE '%healthcare%consultant%' OR
    LOWER(title) LIKE '%hospital%administrator%' OR
    LOWER(title) LIKE '%healthcare%business%' OR
    LOWER(description) LIKE '%healthcare management%' OR
    LOWER(description) LIKE '%healthcare business%' OR
    LOWER(description) LIKE '%healthcare administration%'
  )
  AND id IN (
    SELECT id FROM jobs
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
      -- Keep business-related healthcare roles
      AND NOT (
        LOWER(title) LIKE '%healthcare%manager%' OR
        LOWER(title) LIKE '%healthcare%analyst%' OR
        LOWER(title) LIKE '%healthcare%consultant%' OR
        LOWER(title) LIKE '%hospital%administrator%' OR
        LOWER(title) LIKE '%healthcare%business%' OR
        LOWER(description) LIKE '%healthcare management%' OR
        LOWER(description) LIKE '%healthcare business%' OR
        LOWER(description) LIKE '%healthcare administration%'
      )
    ORDER BY id
    LIMIT 100
  );
