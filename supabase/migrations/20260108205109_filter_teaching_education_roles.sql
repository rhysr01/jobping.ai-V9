-- Filter Teaching and Education Roles
-- Target: Remove teaching, education, academic roles
-- BUT keep: Business Teacher, Business Lecturer, Corporate Training
-- Limit: 100 rows per batch

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
    -- Keep business-related teaching roles
    AND NOT (
      LOWER(title) LIKE '%business%teacher%' OR
      LOWER(title) LIKE '%business%lecturer%' OR
      LOWER(title) LIKE '%business%professor%' OR
      LOWER(title) LIKE '%corporate%trainer%' OR
      LOWER(title) LIKE '%corporate%training%' OR
      LOWER(description) LIKE '%business school%' OR
      LOWER(description) LIKE '%business education%'
    )
  )
  AND id IN (
    SELECT id FROM jobs
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
        -- Keep business-related teaching roles
        AND NOT (
          LOWER(title) LIKE '%business%teacher%' OR
          LOWER(title) LIKE '%business%lecturer%' OR
          LOWER(title) LIKE '%business%professor%' OR
          LOWER(title) LIKE '%corporate%trainer%' OR
          LOWER(title) LIKE '%corporate%training%' OR
          LOWER(description) LIKE '%business school%' OR
          LOWER(description) LIKE '%business education%'
        )
      )
    ORDER BY id
    LIMIT 100
  );
