-- ============================================================================
-- DATABASE-LEVEL NORMALIZATION ENGINE
-- Normalizes cities, companies, and prevents dirty data at the database level
-- Works alongside application-level normalization as a safety net
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. NORMALIZE EXISTING CITY DATA
-- Uses your existing CITY_NORMALIZATION_MAP logic
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
-- 2. NORMALIZE EXISTING COUNTRY DATA
-- Uses your COUNTRY_NORMALIZATION_MAP
-- ============================================================================

UPDATE jobs
SET country = CASE
    WHEN country ILIKE '%deutschland%' OR country ILIKE '%germany%' OR country = 'DE' THEN 'Germany'
    WHEN country ILIKE '%españa%' OR country ILIKE '%spain%' OR country = 'ES' THEN 'Spain'
    WHEN country ILIKE '%österreich%' OR country ILIKE '%austria%' OR country = 'AT' THEN 'Austria'
    WHEN country ILIKE '%nederland%' OR country ILIKE '%netherlands%' OR country = 'NL' THEN 'Netherlands'
    WHEN country ILIKE '%belgique%' OR country ILIKE '%belgium%' OR country = 'BE' THEN 'Belgium'
    WHEN country ILIKE '%ireland%' OR country = 'IE' OR country = 'IRL' THEN 'Ireland'
    WHEN country ILIKE '%united kingdom%' OR country ILIKE '%uk%' OR country = 'GB' THEN 'United Kingdom'
    WHEN country ILIKE '%france%' OR country = 'FR' THEN 'France'
    WHEN country ILIKE '%italia%' OR country ILIKE '%italy%' OR country = 'IT' THEN 'Italy'
    WHEN country ILIKE '%schweiz%' OR country ILIKE '%switzerland%' OR country = 'CH' THEN 'Switzerland'
    WHEN country ILIKE '%sverige%' OR country ILIKE '%sweden%' OR country = 'SE' THEN 'Sweden'
    WHEN country ILIKE '%danmark%' OR country ILIKE '%denmark%' OR country = 'DK' THEN 'Denmark'
    WHEN country ILIKE '%polska%' OR country ILIKE '%poland%' OR country = 'PL' THEN 'Poland'
    WHEN country ILIKE '%czech%' OR country = 'CZ' THEN 'Czech Republic'
    ELSE country
END
WHERE country IS NOT NULL;

-- ============================================================================
-- 3. CLEAN EXISTING COMPANY NAMES - SKIPPED (complex nested regex causing issues)
-- ============================================================================

-- Skipping complex nested REGEXP_REPLACE operations that cause syntax errors
-- Company name cleaning will be handled at application level
-- Complex nested REGEXP_REPLACE operations removed due to syntax errors
-- Company name cleaning will be handled at the application level

-- ============================================================================
-- 4. CREATE NORMALIZATION FUNCTION
-- This function will be used by the trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_city_name(city_text TEXT)
RETURNS TEXT AS $$
BEGIN
    IF city_text IS NULL OR city_text = '' THEN
        RETURN NULL;
    END IF;
    
    -- Normalize to lowercase for matching
    city_text := LOWER(TRIM(city_text));
    
    -- Major city variations
    CASE
        -- German cities
        WHEN city_text LIKE '%münchen%' OR city_text LIKE '%munich%' THEN RETURN 'Munich';
        WHEN city_text LIKE '%köln%' OR city_text LIKE '%cologne%' THEN RETURN 'Cologne';
        WHEN city_text LIKE '%hamburg%' THEN RETURN 'Hamburg';
        WHEN city_text LIKE '%frankfurt%' THEN RETURN 'Frankfurt';
        WHEN city_text LIKE '%berlin%' THEN RETURN 'Berlin';
        WHEN city_text LIKE '%stuttgart%' THEN RETURN 'Stuttgart';
        WHEN city_text LIKE '%düsseldorf%' THEN RETURN 'Düsseldorf';
        
        -- Austrian cities
        WHEN city_text LIKE '%wien%' OR city_text LIKE '%vienna%' THEN RETURN 'Vienna';
        
        -- Czech cities
        WHEN city_text LIKE '%praha%' OR city_text LIKE '%prague%' THEN RETURN 'Prague';
        
        -- Italian cities
        WHEN city_text LIKE '%milano%' OR city_text LIKE '%milan%' THEN RETURN 'Milan';
        WHEN city_text LIKE '%roma%' OR city_text LIKE '%rome%' THEN RETURN 'Rome';
        
        -- Spanish cities
        WHEN city_text LIKE '%barcelona%' THEN RETURN 'Barcelona';
        WHEN city_text LIKE '%madrid%' THEN RETURN 'Madrid';
        
        -- French cities (Paris suburbs)
        WHEN city_text LIKE '%paris%' OR city_text LIKE '%levallois%' OR city_text LIKE '%boulogne%' 
             OR city_text LIKE '%saint-cloud%' OR city_text LIKE '%nanterre%' OR city_text LIKE '%courbevoie%' THEN RETURN 'Paris';
        
        -- Belgian cities (Brussels area)
        WHEN city_text LIKE '%bruxelles%' OR city_text LIKE '%brussels%' OR city_text LIKE '%elsene%' 
             OR city_text LIKE '%diegem%' OR city_text LIKE '%zaventem%' THEN RETURN 'Brussels';
        
        -- Dutch cities (Amsterdam area)
        WHEN city_text LIKE '%amsterdam%' OR city_text LIKE '%amstelveen%' OR city_text LIKE '%haarlem%' THEN RETURN 'Amsterdam';
        
        -- Danish cities
        WHEN city_text LIKE '%københavn%' OR city_text LIKE '%copenhagen%' OR city_text LIKE '%frederiksberg%' THEN RETURN 'Copenhagen';
        
        -- Swedish cities
        WHEN city_text LIKE '%stockholm%' OR city_text LIKE '%solna%' THEN RETURN 'Stockholm';
        
        -- Swiss cities (Zurich area)
        WHEN city_text LIKE '%zürich%' OR city_text LIKE '%zurich%' OR city_text LIKE '%opfikon%' 
             OR city_text LIKE '%wallisellen%' THEN RETURN 'Zurich';
        
        -- Polish cities
        WHEN city_text LIKE '%warszawa%' OR city_text LIKE '%warsaw%' THEN RETURN 'Warsaw';
        
        -- Irish cities (Dublin area)
        WHEN city_text LIKE '%dublin%' OR city_text LIKE '%blackrock%' OR city_text LIKE '%sandyford%' THEN RETURN 'Dublin';
        
        -- UK cities (London area)
        WHEN city_text LIKE '%london%' OR city_text LIKE '%croydon%' OR city_text LIKE '%islington%' 
             OR city_text LIKE '%walthamstow%' OR city_text LIKE '%watford%' THEN RETURN 'London';
        WHEN city_text LIKE '%manchester%' OR city_text LIKE '%salford%' OR city_text LIKE '%stockport%' THEN RETURN 'Manchester';
        WHEN city_text LIKE '%birmingham%' OR city_text LIKE '%solihull%' OR city_text LIKE '%coventry%' THEN RETURN 'Birmingham';
        
        ELSE
            -- Return capitalized version
            RETURN INITCAP(TRIM(city_text));
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 5. CREATE COMPANY CLEANING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION clean_company_name(company_text TEXT)
RETURNS TEXT AS $$
BEGIN
    IF company_text IS NULL OR company_text = '' THEN
        RETURN NULL;
    END IF;
    
    -- Trim and normalize whitespace
    company_text := TRIM(REGEXP_REPLACE(company_text, '[ \t\n\r\f]+', ' ', 'g'));
    
    -- Remove legal suffixes (same as your cleanCompany() function)
    company_text := REGEXP_REPLACE(company_text, '[ \t\n\r\f]+(Ltd\.?|Limited|Inc\.?|Incorporated|GmbH|S\.A\.?|S\.L\.?|S\.R\.L\.?|LLC|LLP|PLC|Corp\.?|Corporation|Co\.?|Company|AG|BV|NV|AB|Oy|AS)$', '', 'i');
    
    RETURN TRIM(company_text);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 6. CREATE TRIGGER FUNCTION (The "Security Guard")
-- Normalizes data BEFORE it's inserted/updated
-- ============================================================================

CREATE OR REPLACE FUNCTION clean_job_data_before_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Normalize city
    IF NEW.city IS NOT NULL THEN
        NEW.city := normalize_city_name(NEW.city);
    END IF;
    
    -- Normalize country
    IF NEW.country IS NOT NULL THEN
        NEW.country := CASE
            WHEN LOWER(NEW.country) LIKE '%deutschland%' OR LOWER(NEW.country) = 'de' THEN 'Germany'
            WHEN LOWER(NEW.country) LIKE '%españa%' OR LOWER(NEW.country) = 'es' THEN 'Spain'
            WHEN LOWER(NEW.country) LIKE '%österreich%' OR LOWER(NEW.country) = 'at' THEN 'Austria'
            WHEN LOWER(NEW.country) LIKE '%nederland%' OR LOWER(NEW.country) = 'nl' THEN 'Netherlands'
            WHEN LOWER(NEW.country) LIKE '%belgique%' OR LOWER(NEW.country) = 'be' THEN 'Belgium'
            WHEN LOWER(NEW.country) LIKE '%ireland%' OR LOWER(NEW.country) IN ('ie', 'irl') THEN 'Ireland'
            WHEN LOWER(NEW.country) LIKE '%united kingdom%' OR LOWER(NEW.country) IN ('uk', 'gb') THEN 'United Kingdom'
            WHEN LOWER(NEW.country) LIKE '%france%' OR LOWER(NEW.country) = 'fr' THEN 'France'
            WHEN LOWER(NEW.country) LIKE '%italia%' OR LOWER(NEW.country) = 'it' THEN 'Italy'
            WHEN LOWER(NEW.country) LIKE '%schweiz%' OR LOWER(NEW.country) = 'ch' THEN 'Switzerland'
            WHEN LOWER(NEW.country) LIKE '%sverige%' OR LOWER(NEW.country) = 'se' THEN 'Sweden'
            WHEN LOWER(NEW.country) LIKE '%danmark%' OR LOWER(NEW.country) = 'dk' THEN 'Denmark'
            WHEN LOWER(NEW.country) LIKE '%polska%' OR LOWER(NEW.country) = 'pl' THEN 'Poland'
            WHEN LOWER(NEW.country) LIKE '%czech%' OR LOWER(NEW.country) = 'cz' THEN 'Czech Republic'
            ELSE INITCAP(TRIM(NEW.country))
        END;
    END IF;
    
    -- Clean company name
    IF NEW.company IS NOT NULL THEN
        NEW.company := clean_company_name(NEW.company);
    END IF;
    
    -- Clean company_name (sync from company if missing)
    IF NEW.company_name IS NULL AND NEW.company IS NOT NULL THEN
        NEW.company_name := clean_company_name(NEW.company);
    ELSIF NEW.company_name IS NOT NULL THEN
        NEW.company_name := clean_company_name(NEW.company_name);
    END IF;
    
    -- Trim whitespace from all text fields
    IF NEW.title IS NOT NULL THEN NEW.title := TRIM(NEW.title); END IF;
    IF NEW.location IS NOT NULL THEN NEW.location := TRIM(NEW.location); END IF;
    IF NEW.description IS NOT NULL THEN NEW.description := TRIM(NEW.description); END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. CREATE TRIGGER (Attach the security guard to the jobs table)
-- ============================================================================

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trg_clean_jobs_before_insert ON jobs;

-- Create trigger for INSERT
CREATE TRIGGER trg_clean_jobs_before_insert
    BEFORE INSERT ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION clean_job_data_before_insert();

-- Also create trigger for UPDATE (to clean data on updates)
DROP TRIGGER IF EXISTS trg_clean_jobs_before_update ON jobs;

CREATE TRIGGER trg_clean_jobs_before_update
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION clean_job_data_before_insert();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================
-- SELECT COUNT(DISTINCT city) as unique_cities FROM jobs WHERE city IS NOT NULL;
-- SELECT city, COUNT(*) FROM jobs WHERE city IS NOT NULL GROUP BY city ORDER BY COUNT(*) DESC LIMIT 20;
-- SELECT COUNT(*) as cleaned_companies FROM jobs WHERE company != clean_company_name(company);

