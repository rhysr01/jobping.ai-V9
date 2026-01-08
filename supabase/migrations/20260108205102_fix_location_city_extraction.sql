-- Fix Location: City Extraction from Comma-separated Format
-- Target: Extract city from "City, Country" format
-- Limit: 500 rows per batch

UPDATE jobs
SET city = TRIM(SPLIT_PART(location, ',', 1))
WHERE (city IS NULL OR city = '')
  AND location IS NOT NULL
  AND location != ''
  AND location LIKE '%,%'
  AND TRIM(SPLIT_PART(location, ',', 1)) != ''
  AND TRIM(SPLIT_PART(location, ',', 1)) NOT IN (
    'España', 'Deutschland', 'Österreich', 'Nederland', 'Belgique',
    'United Kingdom', 'UK', 'USA', 'US', 'France', 'Germany',
    'Spain', 'Austria', 'Netherlands', 'Belgium', 'Ireland',
    'Schweiz', 'Switzerland', 'Italia', 'Italy', 'Poland', 'Polska',
    'Denmark', 'Danmark', 'Sweden', 'Sverige', 'Czech Republic', 'Czechia'
  )
  AND id IN (
    SELECT id FROM jobs
    WHERE (city IS NULL OR city = '')
      AND location IS NOT NULL
      AND location != ''
      AND location LIKE '%,%'
      AND TRIM(SPLIT_PART(location, ',', 1)) != ''
      AND TRIM(SPLIT_PART(location, ',', 1)) NOT IN (
        'España', 'Deutschland', 'Österreich', 'Nederland', 'Belgique',
        'United Kingdom', 'UK', 'USA', 'US', 'France', 'Germany',
        'Spain', 'Austria', 'Netherlands', 'Belgium', 'Ireland',
        'Schweiz', 'Switzerland', 'Italia', 'Italy', 'Poland', 'Polska',
        'Denmark', 'Danmark', 'Sweden', 'Sverige', 'Czech Republic', 'Czechia'
      )
    ORDER BY id
    LIMIT 500
  );
