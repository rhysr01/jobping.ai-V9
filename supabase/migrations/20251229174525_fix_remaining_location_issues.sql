-- FIX REMAINING LOCATION ISSUES
-- Fixes 310 jobs missing city and 326 jobs missing country
-- Run this in Supabase SQL Editor

BEGIN;

-- ============================================================================
-- 1. FIX REED JOBS: Infer country from city (168 jobs)
-- ============================================================================
-- Reed jobs have city but no country (location="London" format)
UPDATE jobs
SET country = CASE
  WHEN city = 'London' THEN 'United Kingdom'
  WHEN city = 'Dublin' THEN 'Ireland'
  WHEN city = 'Paris' THEN 'France'
  WHEN city = 'Berlin' THEN 'Germany'
  WHEN city = 'Amsterdam' THEN 'Netherlands'
  WHEN city = 'Brussels' THEN 'Belgium'
  WHEN city = 'Madrid' THEN 'Spain'
  WHEN city = 'Barcelona' THEN 'Spain'
  WHEN city = 'Milan' THEN 'Italy'
  WHEN city = 'Rome' THEN 'Italy'
  WHEN city = 'Vienna' THEN 'Austria'
  WHEN city = 'Zurich' THEN 'Switzerland'
  WHEN city = 'Copenhagen' THEN 'Denmark'
  WHEN city = 'Stockholm' THEN 'Sweden'
  WHEN city = 'Warsaw' THEN 'Poland'
  WHEN city = 'Prague' THEN 'Czech Republic'
  WHEN city = 'Munich' THEN 'Germany'
  WHEN city = 'Frankfurt' THEN 'Germany'
  WHEN city = 'Hamburg' THEN 'Germany'
  WHEN city = 'Cologne' THEN 'Germany'
  WHEN city = 'Stuttgart' THEN 'Germany'
  WHEN city = 'Düsseldorf' THEN 'Germany'
  WHEN city = 'Manchester' THEN 'United Kingdom'
  WHEN city = 'Birmingham' THEN 'United Kingdom'
  WHEN city = 'Belfast' THEN 'United Kingdom'
  WHEN city = 'Edinburgh' THEN 'United Kingdom'
  WHEN city = 'Glasgow' THEN 'United Kingdom'
  WHEN city = 'Leeds' THEN 'United Kingdom'
  WHEN city = 'Liverpool' THEN 'United Kingdom'
  WHEN city = 'Lyon' THEN 'France'
  WHEN city = 'Marseille' THEN 'France'
  WHEN city = 'Toulouse' THEN 'France'
  WHEN city = 'Nice' THEN 'France'
  WHEN city = 'Lille' THEN 'France'
  WHEN city = 'Rotterdam' THEN 'Netherlands'
  WHEN city = 'The Hague' THEN 'Netherlands'
  WHEN city = 'Utrecht' THEN 'Netherlands'
  WHEN city = 'Eindhoven' THEN 'Netherlands'
  WHEN city = 'Antwerp' THEN 'Belgium'
  WHEN city = 'Ghent' THEN 'Belgium'
  WHEN city = 'Bruges' THEN 'Belgium'
  WHEN city = 'Valencia' THEN 'Spain'
  WHEN city = 'Seville' THEN 'Spain'
  WHEN city = 'Bilbao' THEN 'Spain'
  WHEN city = 'Naples' THEN 'Italy'
  WHEN city = 'Turin' THEN 'Italy'
  WHEN city = 'Florence' THEN 'Italy'
  WHEN city = 'Venice' THEN 'Italy'
  WHEN city = 'Geneva' THEN 'Switzerland'
  WHEN city = 'Basel' THEN 'Switzerland'
  WHEN city = 'Bern' THEN 'Switzerland'
  WHEN city = 'Lausanne' THEN 'Switzerland'
  WHEN city = 'Gothenburg' THEN 'Sweden'
  WHEN city = 'Malmö' THEN 'Sweden'
  WHEN city = 'Uppsala' THEN 'Sweden'
  WHEN city = 'Aarhus' THEN 'Denmark'
  WHEN city = 'Odense' THEN 'Denmark'
  WHEN city = 'Graz' THEN 'Austria'
  WHEN city = 'Linz' THEN 'Austria'
  WHEN city = 'Salzburg' THEN 'Austria'
  WHEN city = 'Brno' THEN 'Czech Republic'
  WHEN city = 'Ostrava' THEN 'Czech Republic'
  WHEN city = 'Krakow' THEN 'Poland'
  WHEN city = 'Wroclaw' THEN 'Poland'
  WHEN city = 'Gdansk' THEN 'Poland'
  WHEN city = 'Poznan' THEN 'Poland'
  ELSE country
END
WHERE country IS NULL 
  AND city IS NOT NULL
  AND source = 'reed';

-- ============================================================================
-- 2. EXTRACT COUNTRY FROM LOCATION WHEN LOCATION IS A COUNTRY NAME
-- ============================================================================
-- Many jobs have country names in location field (e.g., "Sweden", "Germany")
-- Extract to country field and set city=NULL
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
WHERE country IS NULL
  AND city IS NULL
  AND location IN (
    'Sweden', 'Sverige', 'Germany', 'Deutschland', 'Spain', 'España',
    'Austria', 'Österreich', 'Netherlands', 'Nederland', 'Belgium', 'Belgique',
    'Ireland', 'United Kingdom', 'UK', 'France', 'Italy', 'Italia',
    'Switzerland', 'Schweiz', 'Denmark', 'Danmark', 'Poland', 'Polska',
    'Czech Republic', 'Czechia'
  );

-- ============================================================================
-- 3. CLEAN UP INVALID LOCATION CODES
-- ============================================================================
-- Remove invalid codes like "W", "Md", "Ct" that slipped through
UPDATE jobs
SET location = NULL, city = NULL, country = NULL
WHERE location IN ('W', 'Md', 'Ct') 
   OR (LENGTH(TRIM(location)) <= 2 AND location !~ '^[A-Z]{2}$'); -- Keep valid 2-letter country codes

-- ============================================================================
-- 4. FIX OTHER SOURCES: Infer country from city for non-Reed jobs too
-- ============================================================================
UPDATE jobs
SET country = CASE
  WHEN city = 'London' THEN 'United Kingdom'
  WHEN city = 'Dublin' THEN 'Ireland'
  WHEN city = 'Paris' THEN 'France'
  WHEN city = 'Berlin' THEN 'Germany'
  WHEN city = 'Amsterdam' THEN 'Netherlands'
  WHEN city = 'Brussels' THEN 'Belgium'
  WHEN city = 'Madrid' THEN 'Spain'
  WHEN city = 'Barcelona' THEN 'Spain'
  WHEN city = 'Milan' THEN 'Italy'
  WHEN city = 'Rome' THEN 'Italy'
  WHEN city = 'Vienna' THEN 'Austria'
  WHEN city = 'Zurich' THEN 'Switzerland'
  WHEN city = 'Copenhagen' THEN 'Denmark'
  WHEN city = 'Stockholm' THEN 'Sweden'
  WHEN city = 'Warsaw' THEN 'Poland'
  WHEN city = 'Prague' THEN 'Czech Republic'
  WHEN city = 'Munich' THEN 'Germany'
  WHEN city = 'Frankfurt' THEN 'Germany'
  WHEN city = 'Hamburg' THEN 'Germany'
  WHEN city = 'Cologne' THEN 'Germany'
  WHEN city = 'Stuttgart' THEN 'Germany'
  WHEN city = 'Düsseldorf' THEN 'Germany'
  WHEN city = 'Manchester' THEN 'United Kingdom'
  WHEN city = 'Birmingham' THEN 'United Kingdom'
  ELSE country
END
WHERE country IS NULL 
  AND city IS NOT NULL
  AND source != 'reed';

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================
-- SELECT COUNT(*) as total_jobs FROM jobs;
-- SELECT COUNT(*) as jobs_with_city FROM jobs WHERE city IS NOT NULL;
-- SELECT COUNT(*) as jobs_with_country FROM jobs WHERE country IS NOT NULL;
-- SELECT COUNT(*) as jobs_missing_city FROM jobs WHERE city IS NULL;
-- SELECT COUNT(*) as jobs_missing_country FROM jobs WHERE country IS NULL;
-- SELECT source, COUNT(*) as missing_city FROM jobs WHERE city IS NULL GROUP BY source;
-- SELECT source, COUNT(*) as missing_country FROM jobs WHERE country IS NULL GROUP BY source;

COMMIT;

