-- Data Consistency Fixes Migration
-- Safe to run multiple times - all operations are idempotent

-- 1.1. SYNC COMPANY_NAME FROM COMPANY FIELD
UPDATE jobs
SET company_name = company
WHERE company_name IS NULL
  AND company IS NOT NULL
  AND company != ''
  AND filtered_reason NOT LIKE '%job_board_as_company%';

-- 1.3. EXTRACT COUNTRY FROM LOCATION WHEN LOCATION IS A COUNTRY NAME
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
  );

-- 1.4. EXTRACT CITY FROM LOCATION FIELD (comma-separated format)
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
  );

-- 1.5. EXTRACT COUNTRY FROM LOCATION FIELD (comma-separated format)
UPDATE jobs
SET country = TRIM(SPLIT_PART(location, ',', 2))
WHERE (country IS NULL OR country = '')
  AND location IS NOT NULL
  AND location != ''
  AND location LIKE '%,%'
  AND TRIM(SPLIT_PART(location, ',', 2)) != '';

-- 1.6. EXTRACT CITY FROM SINGLE-WORD LOCATION (known cities)
UPDATE jobs
SET city = CASE
  WHEN LOWER(location) = 'london' THEN 'London'
  WHEN LOWER(location) = 'dublin' THEN 'Dublin'
  WHEN LOWER(location) = 'paris' THEN 'Paris'
  WHEN LOWER(location) = 'berlin' THEN 'Berlin'
  WHEN LOWER(location) = 'amsterdam' THEN 'Amsterdam'
  WHEN LOWER(location) = 'brussels' THEN 'Brussels'
  WHEN LOWER(location) = 'madrid' THEN 'Madrid'
  WHEN LOWER(location) = 'barcelona' THEN 'Barcelona'
  WHEN LOWER(location) = 'milan' THEN 'Milan'
  WHEN LOWER(location) = 'rome' THEN 'Rome'
  WHEN LOWER(location) = 'vienna' THEN 'Vienna'
  WHEN LOWER(location) = 'zurich' THEN 'Zurich'
  WHEN LOWER(location) = 'copenhagen' THEN 'Copenhagen'
  WHEN LOWER(location) = 'stockholm' THEN 'Stockholm'
  WHEN LOWER(location) = 'warsaw' THEN 'Warsaw'
  WHEN LOWER(location) = 'prague' THEN 'Prague'
  WHEN LOWER(location) = 'munich' THEN 'Munich'
  WHEN LOWER(location) = 'frankfurt' THEN 'Frankfurt'
  WHEN LOWER(location) = 'hamburg' THEN 'Hamburg'
  WHEN LOWER(location) = 'cologne' THEN 'Cologne'
  WHEN LOWER(location) = 'stuttgart' THEN 'Stuttgart'
  WHEN LOWER(location) = 'düsseldorf' THEN 'Düsseldorf'
  WHEN LOWER(location) = 'manchester' THEN 'Manchester'
  WHEN LOWER(location) = 'birmingham' THEN 'Birmingham'
  ELSE city
END
WHERE (city IS NULL OR city = '')
  AND location IS NOT NULL
  AND location != ''
  AND location NOT LIKE '%,%'
  AND LOWER(location) IN (
    'london', 'dublin', 'paris', 'berlin', 'amsterdam', 'brussels',
    'madrid', 'barcelona', 'milan', 'rome', 'vienna', 'zurich',
    'copenhagen', 'stockholm', 'warsaw', 'prague', 'munich', 'frankfurt',
    'hamburg', 'cologne', 'stuttgart', 'düsseldorf', 'manchester', 'birmingham'
  );

-- 1.7. INFER COUNTRY FROM CITY (when city is known but country is missing)
UPDATE jobs
SET country = CASE
  WHEN city = 'London' OR city = 'Manchester' OR city = 'Birmingham' OR city = 'Belfast'
       OR city = 'Edinburgh' OR city = 'Glasgow' OR city = 'Leeds' OR city = 'Liverpool' THEN 'United Kingdom'
  WHEN city = 'Dublin' THEN 'Ireland'
  WHEN city = 'Paris' OR city = 'Lyon' OR city = 'Marseille' OR city = 'Toulouse'
       OR city = 'Nice' OR city = 'Lille' THEN 'France'
  WHEN city = 'Berlin' OR city = 'Munich' OR city = 'Frankfurt' OR city = 'Hamburg'
       OR city = 'Cologne' OR city = 'Stuttgart' OR city = 'Düsseldorf' THEN 'Germany'
  WHEN city = 'Amsterdam' OR city = 'Rotterdam' OR city = 'The Hague'
       OR city = 'Utrecht' OR city = 'Eindhoven' THEN 'Netherlands'
  WHEN city = 'Brussels' OR city = 'Antwerp' OR city = 'Ghent' OR city = 'Bruges' THEN 'Belgium'
  WHEN city = 'Madrid' OR city = 'Barcelona' OR city = 'Valencia'
       OR city = 'Seville' OR city = 'Bilbao' THEN 'Spain'
  WHEN city = 'Milan' OR city = 'Rome' OR city = 'Naples' OR city = 'Turin'
       OR city = 'Florence' OR city = 'Venice' THEN 'Italy'
  WHEN city = 'Vienna' OR city = 'Graz' OR city = 'Linz' OR city = 'Salzburg' THEN 'Austria'
  WHEN city = 'Zurich' OR city = 'Geneva' OR city = 'Basel'
       OR city = 'Bern' OR city = 'Lausanne' THEN 'Switzerland'
  WHEN city = 'Copenhagen' OR city = 'Aarhus' OR city = 'Odense' THEN 'Denmark'
  WHEN city = 'Stockholm' OR city = 'Gothenburg' OR city = 'Malmö'
       OR city = 'Uppsala' THEN 'Sweden'
  WHEN city = 'Warsaw' OR city = 'Krakow' OR city = 'Wroclaw'
       OR city = 'Gdansk' OR city = 'Poznan' THEN 'Poland'
  WHEN city = 'Prague' OR city = 'Brno' OR city = 'Ostrava' THEN 'Czech Republic'
  ELSE country
END
WHERE (country IS NULL OR country = '')
  AND city IS NOT NULL
  AND city != '';

-- 1.8. NORMALIZE CITY NAMES (standardize variations)
UPDATE jobs
SET city = CASE
  WHEN city ILIKE '%münchen%' OR city ILIKE '%munich%' THEN 'Munich'
  WHEN city ILIKE '%köln%' OR city ILIKE '%cologne%' THEN 'Cologne'
  WHEN city ILIKE '%hamburg%' THEN 'Hamburg'
  WHEN city ILIKE '%frankfurt%' THEN 'Frankfurt'
  WHEN city ILIKE '%berlin%' THEN 'Berlin'
  WHEN city ILIKE '%stuttgart%' THEN 'Stuttgart'
  WHEN city ILIKE '%düsseldorf%' THEN 'Düsseldorf'
  WHEN city ILIKE '%wien%' OR city ILIKE '%vienna%' OR city ILIKE '%wiener neudorf%' THEN 'Vienna'
  WHEN city ILIKE '%praha%' OR city ILIKE '%prague%' THEN 'Prague'
  WHEN city ILIKE '%milano%' OR city ILIKE '%milan%' THEN 'Milan'
  WHEN city ILIKE '%roma%' OR city ILIKE '%rome%' THEN 'Rome'
  WHEN city ILIKE '%barcelona%' THEN 'Barcelona'
  WHEN city ILIKE '%madrid%' THEN 'Madrid'
  WHEN city ILIKE '%paris%' OR city ILIKE '%levallois%' OR city ILIKE '%boulogne%'
       OR city ILIKE '%saint-cloud%' OR city ILIKE '%nanterre%' OR city ILIKE '%courbevoie%' THEN 'Paris'
  WHEN city ILIKE '%bruxelles%' OR city ILIKE '%brussels%' OR city ILIKE '%elsene%'
       OR city ILIKE '%diegem%' OR city ILIKE '%zaventem%' THEN 'Brussels'
  WHEN city ILIKE '%amsterdam%' OR city ILIKE '%amstelveen%' OR city ILIKE '%haarlem%' THEN 'Amsterdam'
  WHEN city ILIKE '%københavn%' OR city ILIKE '%copenhagen%' OR city ILIKE '%frederiksberg%' THEN 'Copenhagen'
  WHEN city ILIKE '%stockholm%' OR city ILIKE '%solna%' THEN 'Stockholm'
  WHEN city ILIKE '%zürich%' OR city ILIKE '%zurich%' OR city ILIKE '%opfikon%'
       OR city ILIKE '%wallisellen%' THEN 'Zurich'
  WHEN city ILIKE '%warszawa%' OR city ILIKE '%warsaw%' THEN 'Warsaw'
  WHEN city ILIKE '%dublin%' OR city ILIKE '%blackrock%' OR city ILIKE '%sandyford%' THEN 'Dublin'
  WHEN city ILIKE '%london%' OR city ILIKE '%croydon%' OR city ILIKE '%islington%'
       OR city ILIKE '%walthamstow%' OR city ILIKE '%watford%' THEN 'London'
  WHEN city ILIKE '%manchester%' OR city ILIKE '%salford%' OR city ILIKE '%stockport%' THEN 'Manchester'
  WHEN city ILIKE '%birmingham%' OR city ILIKE '%solihull%' OR city ILIKE '%coventry%' THEN 'Birmingham'
  ELSE city
END
WHERE city IS NOT NULL;

-- 1.9. REMOVE COUNTRY NAMES FROM CITY FIELD
UPDATE jobs
SET city = NULL
WHERE city IN (
  'España', 'Deutschland', 'Österreich', 'Nederland', 'Belgique',
  'United Kingdom', 'UK', 'USA', 'US', 'France', 'Germany',
  'Spain', 'Austria', 'Netherlands', 'Belgium', 'Ireland',
  'Schweiz', 'Switzerland', 'Italia', 'Italy', 'Poland', 'Polska',
  'Denmark', 'Danmark', 'Sweden', 'Sverige', 'Czech Republic', 'Czechia'
);

-- 1.10. NORMALIZE COUNTRY NAMES
UPDATE jobs
SET country = CASE
  WHEN country ILIKE '%deutschland%' OR country = 'DE' THEN 'Germany'
  WHEN country ILIKE '%españa%' OR country = 'ES' THEN 'Spain'
  WHEN country ILIKE '%österreich%' OR country = 'AT' THEN 'Austria'
  WHEN country ILIKE '%nederland%' OR country = 'NL' THEN 'Netherlands'
  WHEN country ILIKE '%belgique%' OR country = 'BE' THEN 'Belgium'
  WHEN country ILIKE '%ireland%' OR country IN ('IE', 'IRL') THEN 'Ireland'
  WHEN country ILIKE '%united kingdom%' OR country IN ('UK', 'GB') THEN 'United Kingdom'
  WHEN country ILIKE '%france%' OR country = 'FR' THEN 'France'
  WHEN country ILIKE '%italia%' OR country = 'IT' THEN 'Italy'
  WHEN country ILIKE '%schweiz%' OR country = 'CH' THEN 'Switzerland'
  WHEN country ILIKE '%sverige%' OR country = 'SE' THEN 'Sweden'
  WHEN country ILIKE '%danmark%' OR country = 'DK' THEN 'Denmark'
  WHEN country ILIKE '%polska%' OR country = 'PL' THEN 'Poland'
  WHEN country ILIKE '%czech%' OR country = 'CZ' THEN 'Czech Republic'
  ELSE country
END
WHERE country IS NOT NULL;

-- 1.11. CLEAN COMPANY NAMES (remove legal suffixes)
UPDATE jobs
SET company = REGEXP_REPLACE(
  TRIM(company),
  '\s+(Ltd\.?|Limited|Inc\.?|Incorporated|GmbH|S\.A\.?|S\.L\.?|S\.R\.L\.?|LLC|LLP|PLC|Corp\.?|Corporation|Co\.?|Company|AG|BV|NV|AB|Oy|AS)$',
  '',
  'i'
)
WHERE company IS NOT NULL;

UPDATE jobs
SET company_name = REGEXP_REPLACE(
  TRIM(company_name),
  '\s+(Ltd\.?|Limited|Inc\.?|Incorporated|GmbH|S\.A\.?|S\.L\.?|S\.R\.L\.?|LLC|LLP|PLC|Corp\.?|Corporation|Co\.?|Company|AG|BV|NV|AB|Oy|AS)$',
  '',
  'i'
)
WHERE company_name IS NOT NULL;

-- 1.12. FIX POSTED DATES
UPDATE jobs
SET posted_at = created_at
WHERE posted_at < NOW() - INTERVAL '2 years'
  AND created_at IS NOT NULL;

UPDATE jobs
SET posted_at = created_at
WHERE posted_at IS NULL
  AND created_at IS NOT NULL;

-- 1.13. FIX EMPTY CATEGORIES
UPDATE jobs
SET categories = ARRAY['early-career']
WHERE categories IS NULL
   OR array_length(categories, 1) IS NULL
   OR array_length(categories, 1) = 0;

-- 1.14. FIX OLD CATEGORY NAMES
UPDATE jobs
SET categories = array_replace(categories, 'marketing-advertising', 'marketing-growth')
WHERE 'marketing-advertising' = ANY(categories);

UPDATE jobs
SET categories = array_replace(categories, 'finance-accounting', 'finance-investment')
WHERE 'finance-accounting' = ANY(categories);

UPDATE jobs
SET categories = array_replace(categories, 'sales-business-development', 'sales-client-success')
WHERE 'sales-business-development' = ANY(categories);

UPDATE jobs
SET categories = array_replace(categories, 'product-management', 'product-innovation')
WHERE 'product-management' = ANY(categories);

UPDATE jobs
SET categories = array_remove(categories, 'marketing-advertising')
WHERE 'marketing-advertising' = ANY(categories);

UPDATE jobs
SET categories = array_remove(categories, 'finance-accounting')
WHERE 'finance-accounting' = ANY(categories);

UPDATE jobs
SET categories = array_remove(categories, 'sales-business-development')
WHERE 'sales-business-development' = ANY(categories);

UPDATE jobs
SET categories = array_remove(categories, 'product-management')
WHERE 'product-management' = ANY(categories);

-- 1.15. FIX VERY SHORT DESCRIPTIONS
UPDATE jobs
SET description = COALESCE(
  title || ' at ' || COALESCE(company_name, company, 'Company'),
  title || ' position',
  'Job opportunity'
)
WHERE (description IS NULL OR description = '' OR LENGTH(description) < 20)
  AND title IS NOT NULL;

-- 1.16. CLEAN UP INVALID LOCATION CODES
UPDATE jobs
SET location = NULL, city = NULL, country = NULL
WHERE location IN ('W', 'Md', 'Ct')
   OR (LENGTH(TRIM(location)) <= 2 AND location !~ '^[A-Z]{2}$');
