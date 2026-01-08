-- Filter Job Boards
-- Target: Flag and deactivate job board companies
-- Limit: 200 rows per batch

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
AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%job_board_as_company%')
AND id IN (
  SELECT id FROM jobs
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
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%job_board_as_company%')
  ORDER BY id
  LIMIT 200
);
