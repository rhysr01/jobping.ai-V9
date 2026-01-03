-- ============================================================================
-- FIX EXTRACTION ERRORS FROM EFINANCIAL MIGRATION
-- ============================================================================
-- This migration fixes extraction errors:
-- 1. "Unknown" -> "Unknown Company"
-- 2. "At" -> Extract company name after "At" (e.g., "At Broadridge" -> "Broadridge")
-- 3. "About" -> Try to extract real company from description
--
-- Date: January 2, 2026
-- ============================================================================

BEGIN;

-- Step 1: Fix "Unknown" -> "Unknown Company"
UPDATE jobs
SET 
  company = 'Unknown Company',
  company_name = 'Unknown Company',
  updated_at = NOW()
WHERE company = 'Unknown'
  AND updated_at > NOW() - INTERVAL '2 hours';

-- Step 2: Fix "At" -> Extract company after "At" (e.g., "At Broadridge" -> "Broadridge")
UPDATE jobs
SET 
  company = TRIM(REGEXP_REPLACE(
    SUBSTRING(description FROM '^At\s+([A-Z][A-Za-z0-9\s&\-\.]+?)[,\.]'),
    '^At\s+',
    '',
    'i'
  )),
  company_name = TRIM(REGEXP_REPLACE(
    SUBSTRING(description FROM '^At\s+([A-Z][A-Za-z0-9\s&\-\.]+?)[,\.]'),
    '^At\s+',
    '',
    'i'
  )),
  updated_at = NOW()
WHERE company = 'At'
  AND updated_at > NOW() - INTERVAL '2 hours'
  AND description ~* '^At\s+[A-Z]';

-- Step 3: Fix "About" -> Try to extract company from description or title
UPDATE jobs
SET 
  company = CASE
    -- First priority: Extract from title if it contains company name (e.g., "Title - CompanyName" or "Title- CompanyName")
    WHEN title LIKE '% - %' OR title LIKE '%- %' THEN
      TRIM(REGEXP_REPLACE(
        SPLIT_PART(COALESCE(NULLIF(SPLIT_PART(title, ' - ', -1), title), SPLIT_PART(title, '- ', -1)), ',', 1),
        '\s+(at|in|London|UK|United Kingdom).*',
        '',
        'i'
      ))
    -- Second priority: Look for company name in "The Team:" section (e.g., "The Team: The S&P Global...")
    WHEN description ~* 'The Team:\s+The\s+([A-Z][A-Za-z0-9\s&\-\.]+?)\s+(team|provides|is|works|marketing)' THEN
      TRIM(REGEXP_REPLACE(
        SUBSTRING(description FROM 'The Team:\s+The\s+([A-Z][A-Za-z0-9\s&\-\.]+?)\s+(team|provides|is|works|marketing)'),
        '\s+(team|provides|is|works|marketing).*',
        '',
        'i'
      ))
    -- Third priority: Look for company name after "The Team:" (e.g., "The Team: BigDough Solutions provides...")
    WHEN description ~* 'The Team:\s+([A-Z][A-Za-z0-9\s&\-\.]+?)\s+(provides|is|works)' THEN
      TRIM(REGEXP_REPLACE(
        SUBSTRING(description FROM 'The Team:\s+([A-Z][A-Za-z0-9\s&\-\.]+?)\s+(provides|is|works)'),
        '\s+(provides|is|works).*',
        '',
        'i'
      ))
    -- Fourth priority: Look for product/company mentions (e.g., "Capital IQ Solutions" -> "S&P Capital IQ")
    WHEN description ~* '(S&P|S & P)\s+([A-Z][A-Za-z0-9\s&\-\.]+?)(\s+team|\s+is|\s+provides|[,\.])' THEN
      TRIM(REGEXP_REPLACE(
        SUBSTRING(description FROM '(S&P|S & P)\s+([A-Z][A-Za-z0-9\s&\-\.]+?)(\s+team|\s+is|\s+provides|[,\.])'),
        '\s+(team|is|provides|[,\.]).*',
        '',
        'i'
      ))
    -- Fifth priority: Look for "Capital IQ" or similar product names that indicate company
    WHEN description ~* '(Capital IQ|BigDough Solutions)' THEN
      CASE
        WHEN description ~* 'Capital IQ' THEN 'S&P Capital IQ'
        WHEN description ~* 'BigDough Solutions' THEN 'BigDough Solutions'
        ELSE 'Unknown Company'
      END
    ELSE 'Unknown Company'
  END,
  company_name = CASE
    WHEN title LIKE '% - %' OR title LIKE '%- %' THEN
      TRIM(REGEXP_REPLACE(
        SPLIT_PART(COALESCE(NULLIF(SPLIT_PART(title, ' - ', -1), title), SPLIT_PART(title, '- ', -1)), ',', 1),
        '\s+(at|in|London|UK|United Kingdom).*',
        '',
        'i'
      ))
    WHEN description ~* 'The Team:\s+The\s+([A-Z][A-Za-z0-9\s&\-\.]+?)\s+(team|provides|is|works|marketing)' THEN
      TRIM(REGEXP_REPLACE(
        SUBSTRING(description FROM 'The Team:\s+The\s+([A-Z][A-Za-z0-9\s&\-\.]+?)\s+(team|provides|is|works|marketing)'),
        '\s+(team|provides|is|works|marketing).*',
        '',
        'i'
      ))
    WHEN description ~* 'The Team:\s+([A-Z][A-Za-z0-9\s&\-\.]+?)\s+(provides|is|works)' THEN
      TRIM(REGEXP_REPLACE(
        SUBSTRING(description FROM 'The Team:\s+([A-Z][A-Za-z0-9\s&\-\.]+?)\s+(provides|is|works)'),
        '\s+(provides|is|works).*',
        '',
        'i'
      ))
    WHEN description ~* '(S&P|S & P)\s+([A-Z][A-Za-z0-9\s&\-\.]+?)(\s+team|\s+is|\s+provides|[,\.])' THEN
      TRIM(REGEXP_REPLACE(
        SUBSTRING(description FROM '(S&P|S & P)\s+([A-Z][A-Za-z0-9\s&\-\.]+?)(\s+team|\s+is|\s+provides|[,\.])'),
        '\s+(team|is|provides|[,\.]).*',
        '',
        'i'
      ))
    WHEN description ~* '(Capital IQ|BigDough Solutions)' THEN
      CASE
        WHEN description ~* 'Capital IQ' THEN 'S&P Capital IQ'
        WHEN description ~* 'BigDough Solutions' THEN 'BigDough Solutions'
        ELSE 'Unknown Company'
      END
    ELSE 'Unknown Company'
  END,
  updated_at = NOW()
WHERE company = 'About'
  AND updated_at > NOW() - INTERVAL '2 hours';

-- Step 4: Clean up any remaining invalid company names
-- Set to "Unknown Company" if the extracted name is too short or invalid
UPDATE jobs
SET 
  company = 'Unknown Company',
  company_name = 'Unknown Company',
  updated_at = NOW()
WHERE updated_at > NOW() - INTERVAL '2 hours'
  AND (
    company IN ('About', 'At', 'Unknown') OR
    LENGTH(company) < 2 OR
    company ~ '^[a-z]' -- Starts with lowercase (likely not a company name)
  );

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================
-- Check fixed companies:
-- SELECT 
--   company,
--   COUNT(*) as count
-- FROM jobs
-- WHERE updated_at > NOW() - INTERVAL '2 hours'
--   AND company IN ('Unknown Company', 'Broadridge', 'S&P Global', 'Capital IQ')
-- GROUP BY company
-- ORDER BY count DESC;
--
-- Check if any bad extractions remain:
-- SELECT 
--   company,
--   COUNT(*) as count
-- FROM jobs
-- WHERE updated_at > NOW() - INTERVAL '2 hours'
--   AND company IN ('About', 'At', 'Unknown')
-- GROUP BY company;

