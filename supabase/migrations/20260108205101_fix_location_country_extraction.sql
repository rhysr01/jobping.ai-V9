-- Fix Location: Country Extraction from Country Names
-- Target: Extract country when location is a country name
-- Limit: 500 rows per batch

UPDATE jobs
SET country = CASE
  WHEN location = 'Sweden' OR location = 'Sverige' THEN 'Sweden'
  WHEN location = 'Germany' OR location = 'Deutschland' THEN 'Germany'
  WHEN location = 'Spain' OR location = 'España' THEN 'Spain'
  WHEN location = 'Austria' OR location = 'Österreich' THEN 'Austria'
  WHEN location = 'Netherlands' OR location = 'Nederland' THEN 'Netherlands'
  WHEN location = 'Belgium' OR location = 'Belgique' THEN 'Belgium'
  WHEN location = 'Ireland' THEN 'Ireland'
  WHEN location = 'United Kingdom' OR location = 'UK' THEN 'United Kingdom'
  WHEN location = 'France' THEN 'France'
  WHEN location = 'Italy' OR location = 'Italia' THEN 'Italy'
  WHEN location = 'Switzerland' OR location = 'Schweiz' THEN 'Switzerland'
  WHEN location = 'Denmark' OR location = 'Danmark' THEN 'Denmark'
  WHEN location = 'Poland' OR location = 'Polska' THEN 'Poland'
  WHEN location = 'Czech Republic' OR location = 'Czechia' THEN 'Czech Republic'
  ELSE country
END,
city = NULL
WHERE (country IS NULL OR country = '')
  AND (city IS NULL OR city = '')
  AND location IS NOT NULL
  AND location != ''
  AND location NOT LIKE '%,%'
  AND location IN (
    'Sweden', 'Sverige', 'Germany', 'Deutschland', 'Spain', 'España',
    'Austria', 'Österreich', 'Netherlands', 'Nederland', 'Belgium', 'Belgique',
    'Ireland', 'United Kingdom', 'UK', 'France', 'Italy', 'Italia',
    'Switzerland', 'Schweiz', 'Denmark', 'Danmark', 'Poland', 'Polska',
    'Czech Republic', 'Czechia'
  )
  AND id IN (
    SELECT id FROM jobs
    WHERE (country IS NULL OR country = '')
      AND (city IS NULL OR city = '')
      AND location IS NOT NULL
      AND location != ''
      AND location NOT LIKE '%,%'
      AND location IN (
        'Sweden', 'Sverige', 'Germany', 'Deutschland', 'Spain', 'España',
        'Austria', 'Österreich', 'Netherlands', 'Nederland', 'Belgium', 'Belgique',
        'Ireland', 'United Kingdom', 'UK', 'France', 'Italy', 'Italia',
        'Switzerland', 'Schweiz', 'Denmark', 'Danmark', 'Poland', 'Polska',
        'Czech Republic', 'Czechia'
      )
    ORDER BY id
    LIMIT 500
  );
