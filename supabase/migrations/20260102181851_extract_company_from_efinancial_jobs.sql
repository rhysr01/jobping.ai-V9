-- ============================================================================
-- EXTRACT COMPANY NAMES FROM EFINANCIAL JOBS AND REACTIVATE
-- ============================================================================
-- This migration extracts actual company names from efinancial job descriptions
-- and titles, then reactivates the jobs with the correct company names.
--
-- Extraction strategies:
-- 1. Extract from title (pattern: "Title - CompanyName" or "Title, Location - CompanyName")
-- 2. Extract from description (patterns: "CompanyName is...", "CompanyName, Inc.", etc.)
-- 3. Fallback to "Unknown Company" if no company can be extracted
--
-- Date: January 2, 2026
-- ============================================================================

BEGIN;

-- Create a temporary function to extract company name from title
-- Pattern: "Title - CompanyName" or "Title, Location - CompanyName"
CREATE OR REPLACE FUNCTION extract_company_from_title(job_title TEXT)
RETURNS TEXT AS $$
DECLARE
  extracted_company TEXT;
BEGIN
  -- Try pattern: "Title - CompanyName"
  IF job_title LIKE '% - %' THEN
    extracted_company := TRIM(SPLIT_PART(job_title, ' - ', -1));
    -- Remove location if present (e.g., "CompanyName, London")
    IF extracted_company LIKE '%,%' THEN
      extracted_company := TRIM(SPLIT_PART(extracted_company, ',', 1));
    END IF;
    -- Validate it's not too long (likely not a company name if > 50 chars)
    IF LENGTH(extracted_company) > 50 OR LENGTH(extracted_company) < 2 THEN
      extracted_company := NULL;
    END IF;
  END IF;
  
  RETURN extracted_company;
END;
$$ LANGUAGE plpgsql;

-- Create a temporary function to extract company name from description
-- Patterns: "CompanyName is...", "CompanyName, Inc.", "CompanyName Inc.", etc.
CREATE OR REPLACE FUNCTION extract_company_from_description(job_description TEXT)
RETURNS TEXT AS $$
DECLARE
  extracted_company TEXT;
  first_sentence TEXT;
  words TEXT[];
  i INTEGER;
  potential_company TEXT;
BEGIN
  IF job_description IS NULL OR LENGTH(job_description) < 20 THEN
    RETURN NULL;
  END IF;
  
  -- Get first sentence (up to first period or 200 chars)
  first_sentence := SUBSTRING(job_description FROM 1 FOR LEAST(
    COALESCE(NULLIF(POSITION('.' IN job_description), 0), 200),
    200
  ));
  
  -- Try pattern: "CompanyName is" or "CompanyName, Inc. is" or "CompanyName Inc. is"
  IF first_sentence ~* '^([A-Z][A-Za-z0-9\s&\-\.]+?)\s+(is|,?\s+Inc\.?\s+is|,?\s+Ltd\.?\s+is|,?\s+LLC\s+is)' THEN
    extracted_company := TRIM(REGEXP_REPLACE(
      first_sentence,
      '^([A-Z][A-Za-z0-9\s&\-\.]+?)\s+(is|,?\s+Inc\.?\s+is|,?\s+Ltd\.?\s+is|,?\s+LLC\s+is).*',
      '\1',
      'i'
    ));
    
    -- Clean up common suffixes
    extracted_company := REGEXP_REPLACE(extracted_company, ',\s*(Inc\.?|Ltd\.?|LLC|Corp\.?)$', '', 'i');
    extracted_company := REGEXP_REPLACE(extracted_company, '\s+(Inc\.?|Ltd\.?|LLC|Corp\.?)$', '', 'i');
    extracted_company := TRIM(extracted_company);
    
    -- Validate length
    IF LENGTH(extracted_company) > 100 OR LENGTH(extracted_company) < 2 THEN
      extracted_company := NULL;
    END IF;
  END IF;
  
  -- If no match, try to find company name in first 3 words (common pattern)
  IF extracted_company IS NULL THEN
    words := STRING_TO_ARRAY(first_sentence, ' ');
    IF ARRAY_LENGTH(words, 1) >= 1 THEN
      potential_company := words[1];
      -- If first word is capitalized and reasonable length, use it
      IF potential_company ~ '^[A-Z][a-z]+$' 
         AND LENGTH(potential_company) BETWEEN 2 AND 50 THEN
        extracted_company := potential_company;
      END IF;
    END IF;
  END IF;
  
  RETURN extracted_company;
END;
$$ LANGUAGE plpgsql;

-- Step 1: Extract company from title (highest priority)
UPDATE jobs
SET 
  company = COALESCE(
    extract_company_from_title(title),
    company
  ),
  company_name = COALESCE(
    extract_company_from_title(title),
    company_name
  )
WHERE (company ILIKE '%efinancial%' OR company_name ILIKE '%efinancial%')
  AND filtered_reason LIKE '%job_board_as_company%'
  AND extract_company_from_title(title) IS NOT NULL
  AND extract_company_from_title(title) NOT ILIKE '%efinancial%';

-- Step 2: Extract company from description (only if still has efinancial, i.e., Step 1 didn't update it)
UPDATE jobs
SET 
  company = extract_company_from_description(description),
  company_name = extract_company_from_description(description)
WHERE (company ILIKE '%efinancial%' OR company_name ILIKE '%efinancial%')
  AND filtered_reason LIKE '%job_board_as_company%'
  AND extract_company_from_description(description) IS NOT NULL
  AND extract_company_from_description(description) NOT ILIKE '%efinancial%'
  AND extract_company_from_description(description) != ''
  AND extract_company_from_title(title) IS NULL; -- Only if title extraction didn't work

-- Step 3: For jobs where we couldn't extract a company, set to "Unknown Company"
-- (but only if we still have efinancial in the name)
UPDATE jobs
SET 
  company = 'Unknown Company',
  company_name = 'Unknown Company'
WHERE (company ILIKE '%efinancial%' OR company_name ILIKE '%efinancial%')
  AND filtered_reason LIKE '%job_board_as_company%'
  AND company ILIKE '%efinancial%';

-- Step 4: Remove job_board_as_company flag and reactivate jobs with extracted companies
UPDATE jobs
SET 
  filtered_reason = CASE 
    WHEN filtered_reason = 'job_board_as_company' THEN NULL
    WHEN filtered_reason LIKE 'job_board_as_company;%' THEN TRIM(LEADING 'job_board_as_company; ' FROM filtered_reason)
    WHEN filtered_reason LIKE '%; job_board_as_company' THEN TRIM(TRAILING '; job_board_as_company' FROM filtered_reason)
    WHEN filtered_reason LIKE '%; job_board_as_company;%' THEN REPLACE(filtered_reason, '; job_board_as_company;', ';')
    ELSE filtered_reason
  END,
  is_active = true,
  status = 'active',
  updated_at = NOW()
WHERE filtered_reason LIKE '%job_board_as_company%'
  AND company NOT ILIKE '%efinancial%'
  AND company_name NOT ILIKE '%efinancial%'
  AND company != 'Unknown Company'; -- Exclude Unknown Company (handled in Step 5)

-- Also reactivate jobs that still have efinancial but we set to "Unknown Company"
UPDATE jobs
SET 
  filtered_reason = CASE 
    WHEN filtered_reason = 'job_board_as_company' THEN NULL
    WHEN filtered_reason LIKE 'job_board_as_company;%' THEN TRIM(LEADING 'job_board_as_company; ' FROM filtered_reason)
    WHEN filtered_reason LIKE '%; job_board_as_company' THEN TRIM(TRAILING '; job_board_as_company' FROM filtered_reason)
    WHEN filtered_reason LIKE '%; job_board_as_company;%' THEN REPLACE(filtered_reason, '; job_board_as_company;', ';')
    ELSE filtered_reason
  END,
  is_active = true,
  status = 'active',
  updated_at = NOW()
WHERE company = 'Unknown Company'
  AND company_name = 'Unknown Company'
  AND filtered_reason LIKE '%job_board_as_company%';

-- Clean up temporary functions
DROP FUNCTION IF EXISTS extract_company_from_title(TEXT);
DROP FUNCTION IF EXISTS extract_company_from_description(TEXT);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================
-- Check how many jobs were updated:
-- SELECT 
--   COUNT(*) as total_updated,
--   COUNT(CASE WHEN company != 'Unknown Company' THEN 1 END) as with_extracted_company,
--   COUNT(CASE WHEN company = 'Unknown Company' THEN 1 END) as unknown_company,
--   COUNT(CASE WHEN is_active = true THEN 1 END) as reactivated
-- FROM jobs
-- WHERE (company ILIKE '%efinancial%' OR company_name ILIKE '%efinancial%')
--    OR (company = 'Unknown Company' AND company_name = 'Unknown Company');
--
-- Check sample of extracted companies:
-- SELECT 
--   title,
--   company,
--   company_name,
--   LEFT(description, 200) as description_sample
-- FROM jobs
-- WHERE company != 'Unknown Company'
--   AND (company ILIKE '%efinancial%' = false)
--   AND updated_at > NOW() - INTERVAL '1 hour'
-- ORDER BY updated_at DESC
-- LIMIT 20;
--
-- Check if any efinancial jobs remain:
-- SELECT COUNT(*) as remaining_efinancial
-- FROM jobs
-- WHERE (company ILIKE '%efinancial%' OR company_name ILIKE '%efinancial%')
--   AND is_active = true;

