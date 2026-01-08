-- Filter Legal Roles
-- Target: Remove traditional legal roles (lawyers, solicitors, barristers)
-- BUT keep: Compliance, Regulatory, Business Legal, Legal Analyst (entry-level)
-- Limit: 100 rows per batch

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
  )
  AND id IN (
    SELECT id FROM jobs
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
      )
    ORDER BY id
    LIMIT 100
  );
