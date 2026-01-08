-- Fix Company Names (Batch 1/2)
-- Target: Sync company_name from company field
-- Limit: 1000 rows per batch to avoid timeouts

UPDATE jobs
SET company_name = company
WHERE company_name IS NULL
  AND company IS NOT NULL
  AND company != ''
  AND filtered_reason NOT LIKE '%job_board_as_company%'
  AND id IN (
    SELECT id FROM jobs
    WHERE company_name IS NULL
      AND company IS NOT NULL
      AND company != ''
      AND filtered_reason NOT LIKE '%job_board_as_company%'
    ORDER BY id
    LIMIT 1000
  );
