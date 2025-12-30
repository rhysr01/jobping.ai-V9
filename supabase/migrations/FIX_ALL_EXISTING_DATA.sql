-- ============================================================================
-- COMPREHENSIVE FIX FOR ALL EXISTING DATA
-- Normalizes ALL existing jobs (all 7,855+ jobs across all pages)
-- Fixes: city field, location field, country names in city field
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FIX CITY FIELD - Normalize all variations (applies to ALL existing data)
-- ============================================================================

UPDATE jobs
SET city = CASE
    -- German cities
    WHEN city ILIKE '%münchen%' OR city ILIKE '%munich%' THEN 'Munich'
    WHEN city ILIKE '%köln%' OR city ILIKE '%cologne%' THEN 'Cologne'
    WHEN city ILIKE '%hamburg%' THEN 'Hamburg'
    WHEN city ILIKE '%frankfurt%' THEN 'Frankfurt'
    WHEN city ILIKE '%berlin%' THEN 'Berlin'
    WHEN city ILIKE '%stuttgart%' THEN 'Stuttgart'
    WHEN city ILIKE '%düsseldorf%' THEN 'Düsseldorf'
    
    -- Austrian cities
    WHEN city ILIKE '%wien%' OR city ILIKE '%vienna%' THEN 'Vienna'
    WHEN city ILIKE '%wiener neudorf%' THEN 'Vienna'
    
    -- Czech cities
    WHEN city ILIKE '%praha%' OR city ILIKE '%prague%' THEN 'Prague'
    
    -- Italian cities
    WHEN city ILIKE '%milano%' OR city ILIKE '%milan%' THEN 'Milan'
    WHEN city ILIKE '%roma%' OR city ILIKE '%rome%' THEN 'Rome'
    
    -- Spanish cities
    WHEN city ILIKE '%barcelona%' THEN 'Barcelona'
    WHEN city ILIKE '%madrid%' THEN 'Madrid'
    
    -- French cities (Paris suburbs)
    WHEN city ILIKE '%paris%' OR city ILIKE '%levallois%' OR city ILIKE '%boulogne%' 
         OR city ILIKE '%saint-cloud%' OR city ILIKE '%nanterre%' OR city ILIKE '%courbevoie%' THEN 'Paris'
    
    -- Belgian cities (Brussels area)
    WHEN city ILIKE '%bruxelles%' OR city ILIKE '%brussels%' OR city ILIKE '%elsene%' 
         OR city ILIKE '%diegem%' OR city ILIKE '%zaventem%' THEN 'Brussels'
    
    -- Dutch cities (Amsterdam area)
    WHEN city ILIKE '%amsterdam%' OR city ILIKE '%amstelveen%' OR city ILIKE '%haarlem%' THEN 'Amsterdam'
    
    -- Danish cities
    WHEN city ILIKE '%københavn%' OR city ILIKE '%copenhagen%' OR city ILIKE '%frederiksberg%' THEN 'Copenhagen'
    
    -- Swedish cities
    WHEN city ILIKE '%stockholm%' OR city ILIKE '%solna%' THEN 'Stockholm'
    
    -- Swiss cities (Zurich area)
    WHEN city ILIKE '%zürich%' OR city ILIKE '%zurich%' OR city ILIKE '%opfikon%' 
         OR city ILIKE '%wallisellen%' THEN 'Zurich'
    
    -- Polish cities
    WHEN city ILIKE '%warszawa%' OR city ILIKE '%warsaw%' THEN 'Warsaw'
    
    -- Irish cities (Dublin area)
    WHEN city ILIKE '%dublin%' OR city ILIKE '%blackrock%' OR city ILIKE '%sandyford%' THEN 'Dublin'
    
    -- UK cities (London area)
    WHEN city ILIKE '%london%' OR city ILIKE '%croydon%' OR city ILIKE '%islington%' 
         OR city ILIKE '%walthamstow%' OR city ILIKE '%watford%' THEN 'London'
    WHEN city ILIKE '%manchester%' OR city ILIKE '%salford%' OR city ILIKE '%stockport%' THEN 'Manchester'
    WHEN city ILIKE '%birmingham%' OR city ILIKE '%solihull%' OR city ILIKE '%coventry%' THEN 'Birmingham'
    
    ELSE city -- Keep original if no match
END
WHERE city IS NOT NULL;

-- ============================================================================
-- 2. REMOVE COUNTRY NAMES FROM CITY FIELD (CRITICAL)
-- ============================================================================

UPDATE jobs
SET city = NULL
WHERE city IN (
    'España', 'Deutschland', 'Österreich', 'Nederland', 'Belgique',
    'United Kingdom', 'UK', 'USA', 'US', 'France', 'Germany',
    'Spain', 'Austria', 'Netherlands', 'Belgium', 'Ireland',
    'Schweiz', 'Switzerland', 'Italia', 'Italy', 'Poland', 'Polska',
    'Denmark', 'Danmark', 'Sweden', 'Sverige', 'Czech Republic', 'Czechia'
);

-- ============================================================================
-- 3. NORMALIZE LOCATION FIELD (This is what you're seeing!)
-- Extract and normalize city from location field
-- ============================================================================

-- First, update city from location if city is NULL or a country name
UPDATE jobs
SET city = CASE
    WHEN location ILIKE '%wien%' OR location ILIKE '%vienna%' THEN 'Vienna'
    WHEN location ILIKE '%münchen%' OR location ILIKE '%munich%' THEN 'Munich'
    WHEN location ILIKE '%praha%' OR location ILIKE '%prague%' THEN 'Prague'
    WHEN location ILIKE '%milano%' OR location ILIKE '%milan%' THEN 'Milan'
    WHEN location ILIKE '%roma%' OR location ILIKE '%rome%' THEN 'Rome'
    WHEN location ILIKE '%københavn%' OR location ILIKE '%copenhagen%' THEN 'Copenhagen'
    WHEN location ILIKE '%warszawa%' OR location ILIKE '%warsaw%' THEN 'Warsaw'
    WHEN location ILIKE '%zürich%' OR location ILIKE '%zurich%' THEN 'Zurich'
    WHEN location ILIKE '%köln%' OR location ILIKE '%cologne%' THEN 'Cologne'
    WHEN location ILIKE '%hamburg%' THEN 'Hamburg'
    WHEN location ILIKE '%frankfurt%' THEN 'Frankfurt'
    WHEN location ILIKE '%berlin%' THEN 'Berlin'
    WHEN location ILIKE '%barcelona%' THEN 'Barcelona'
    WHEN location ILIKE '%madrid%' THEN 'Madrid'
    WHEN location ILIKE '%paris%' THEN 'Paris'
    WHEN location ILIKE '%brussels%' OR location ILIKE '%bruxelles%' THEN 'Brussels'
    WHEN location ILIKE '%amsterdam%' THEN 'Amsterdam'
    WHEN location ILIKE '%stockholm%' THEN 'Stockholm'
    WHEN location ILIKE '%london%' THEN 'London'
    WHEN location ILIKE '%dublin%' THEN 'Dublin'
    WHEN location ILIKE '%manchester%' THEN 'Manchester'
    WHEN location ILIKE '%birmingham%' THEN 'Birmingham'
    ELSE city
END
WHERE (city IS NULL OR city = '')
  AND location IS NOT NULL;

-- Now normalize the location field itself to standard format
-- This fixes what you're seeing in the database (location field still has "Wien", etc.)
UPDATE jobs
SET location = CASE
    WHEN location ILIKE '%wien%' THEN COALESCE(city, 'Vienna') || ', ' || COALESCE(country, 'Austria')
    WHEN location ILIKE '%münchen%' THEN COALESCE(city, 'Munich') || ', ' || COALESCE(country, 'Germany')
    WHEN location ILIKE '%praha%' THEN COALESCE(city, 'Prague') || ', ' || COALESCE(country, 'Czech Republic')
    WHEN location ILIKE '%milano%' THEN COALESCE(city, 'Milan') || ', ' || COALESCE(country, 'Italy')
    WHEN location ILIKE '%roma%' THEN COALESCE(city, 'Rome') || ', ' || COALESCE(country, 'Italy')
    WHEN location ILIKE '%københavn%' THEN COALESCE(city, 'Copenhagen') || ', ' || COALESCE(country, 'Denmark')
    WHEN location ILIKE '%warszawa%' THEN COALESCE(city, 'Warsaw') || ', ' || COALESCE(country, 'Poland')
    WHEN location ILIKE '%zürich%' THEN COALESCE(city, 'Zurich') || ', ' || COALESCE(country, 'Switzerland')
    WHEN location ILIKE '%köln%' THEN COALESCE(city, 'Cologne') || ', ' || COALESCE(country, 'Germany')
    WHEN location ILIKE '%hamburg%' AND city = 'Hamburg' THEN 'Hamburg, ' || COALESCE(country, 'Germany')
    WHEN location ILIKE '%frankfurt%' AND city = 'Frankfurt' THEN 'Frankfurt, ' || COALESCE(country, 'Germany')
    WHEN location ILIKE '%berlin%' AND city = 'Berlin' THEN 'Berlin, ' || COALESCE(country, 'Germany')
    WHEN location ILIKE '%barcelona%' AND city = 'Barcelona' THEN 'Barcelona, ' || COALESCE(country, 'Spain')
    WHEN location ILIKE '%madrid%' AND city = 'Madrid' THEN 'Madrid, ' || COALESCE(country, 'Spain')
    WHEN location ILIKE '%paris%' AND city = 'Paris' THEN 'Paris, ' || COALESCE(country, 'France')
    WHEN (location ILIKE '%brussels%' OR location ILIKE '%bruxelles%') AND city = 'Brussels' THEN 'Brussels, ' || COALESCE(country, 'Belgium')
    WHEN location ILIKE '%amsterdam%' AND city = 'Amsterdam' THEN 'Amsterdam, ' || COALESCE(country, 'Netherlands')
    WHEN location ILIKE '%stockholm%' AND city = 'Stockholm' THEN 'Stockholm, ' || COALESCE(country, 'Sweden')
    WHEN location ILIKE '%london%' AND city = 'London' THEN 'London, ' || COALESCE(country, 'United Kingdom')
    WHEN location ILIKE '%dublin%' AND city = 'Dublin' THEN 'Dublin, ' || COALESCE(country, 'Ireland')
    WHEN location ILIKE '%manchester%' AND city = 'Manchester' THEN 'Manchester, ' || COALESCE(country, 'United Kingdom')
    WHEN location ILIKE '%birmingham%' AND city = 'Birmingham' THEN 'Birmingham, ' || COALESCE(country, 'United Kingdom')
    ELSE location
END
WHERE location IS NOT NULL
  AND (
    location ILIKE '%wien%' OR location ILIKE '%münchen%' OR location ILIKE '%praha%'
    OR location ILIKE '%milano%' OR location ILIKE '%roma%' OR location ILIKE '%københavn%'
    OR location ILIKE '%warszawa%' OR location ILIKE '%zürich%' OR location ILIKE '%köln%'
  );

-- ============================================================================
-- 4. FIX COUNTRY CODES (de → Germany, etc.)
-- ============================================================================

UPDATE jobs
SET country = CASE
    WHEN country = 'de' THEN 'Germany'
    WHEN country = 'es' THEN 'Spain'
    WHEN country = 'fr' THEN 'France'
    WHEN country = 'it' THEN 'Italy'
    WHEN country = 'nl' THEN 'Netherlands'
    WHEN country = 'be' THEN 'Belgium'
    WHEN country = 'ie' THEN 'Ireland'
    WHEN country IN ('gb', 'uk') THEN 'United Kingdom'
    WHEN country = 'at' THEN 'Austria'
    WHEN country = 'ch' THEN 'Switzerland'
    WHEN country = 'se' THEN 'Sweden'
    WHEN country = 'dk' THEN 'Denmark'
    WHEN country = 'pl' THEN 'Poland'
    WHEN country = 'cz' THEN 'Czech Republic'
    ELSE country
END
WHERE country IS NOT NULL;

-- ============================================================================
-- 5. INFER COUNTRY FROM CITY (for Vienna and others missing country)
-- ============================================================================

UPDATE jobs
SET country = CASE
    WHEN city = 'Vienna' AND (country IS NULL OR country = '') THEN 'Austria'
    WHEN city = 'Munich' AND (country IS NULL OR country = '') THEN 'Germany'
    WHEN city = 'Prague' AND (country IS NULL OR country = '') THEN 'Czech Republic'
    WHEN city = 'Milan' AND (country IS NULL OR country = '') THEN 'Italy'
    WHEN city = 'Rome' AND (country IS NULL OR country = '') THEN 'Italy'
    WHEN city = 'Copenhagen' AND (country IS NULL OR country = '') THEN 'Denmark'
    WHEN city = 'Warsaw' AND (country IS NULL OR country = '') THEN 'Poland'
    WHEN city = 'Zurich' AND (country IS NULL OR country = '') THEN 'Switzerland'
    WHEN city = 'Cologne' AND (country IS NULL OR country = '') THEN 'Germany'
    WHEN city = 'Hamburg' AND (country IS NULL OR country = '') THEN 'Germany'
    WHEN city = 'Frankfurt' AND (country IS NULL OR country = '') THEN 'Germany'
    WHEN city = 'Berlin' AND (country IS NULL OR country = '') THEN 'Germany'
    WHEN city = 'Barcelona' AND (country IS NULL OR country = '') THEN 'Spain'
    WHEN city = 'Madrid' AND (country IS NULL OR country = '') THEN 'Spain'
    WHEN city = 'Paris' AND (country IS NULL OR country = '') THEN 'France'
    WHEN city = 'Brussels' AND (country IS NULL OR country = '') THEN 'Belgium'
    WHEN city = 'Amsterdam' AND (country IS NULL OR country = '') THEN 'Netherlands'
    WHEN city = 'Stockholm' AND (country IS NULL OR country = '') THEN 'Sweden'
    WHEN city = 'London' AND (country IS NULL OR country = '') THEN 'United Kingdom'
    WHEN city = 'Dublin' AND (country IS NULL OR country = '') THEN 'Ireland'
    WHEN city = 'Manchester' AND (country IS NULL OR country = '') THEN 'United Kingdom'
    WHEN city = 'Birmingham' AND (country IS NULL OR country = '') THEN 'United Kingdom'
    ELSE country
END
WHERE city IS NOT NULL;

COMMIT;

-- ============================================================================
-- VERIFICATION (Run after migration)
-- ============================================================================
-- Check for remaining variations
-- SELECT city, COUNT(*) FROM jobs WHERE city ILIKE '%wien%' OR city ILIKE '%münchen%' OR city ILIKE '%praha%' GROUP BY city;
-- SELECT location, COUNT(*) FROM jobs WHERE location ILIKE '%wien%' OR location ILIKE '%münchen%' OR location ILIKE '%praha%' GROUP BY location LIMIT 20;
-- SELECT COUNT(*) as total, COUNT(DISTINCT city) as unique_cities FROM jobs WHERE city IS NOT NULL;

