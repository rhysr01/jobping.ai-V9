-- Filter CEO and Executive Roles
-- Target: Remove CEO, Chief Executive, Managing Director roles
-- These are not suitable for business graduates
-- Limit: 100 rows per batch to avoid timeouts

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
  )
  AND id IN (
    SELECT id FROM jobs
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
      )
    ORDER BY id
    LIMIT 100
  );
