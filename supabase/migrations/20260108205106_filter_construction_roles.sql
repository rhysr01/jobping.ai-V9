-- Filter Construction Roles
-- Target: Remove construction, building, trade jobs
-- These are not business-relevant
-- BUT keep: Construction Project Manager, Construction Consultant, Construction Analyst
-- Limit: 100 rows per batch

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
  )
  AND id IN (
    SELECT id FROM jobs
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
      )
    ORDER BY id
    LIMIT 100
  );
