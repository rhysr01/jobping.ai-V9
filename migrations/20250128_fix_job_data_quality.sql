-- ============================================================================
-- FIX JOB DATA QUALITY ISSUES
-- ============================================================================
-- Addresses critical data quality problems:
-- 1. Missing job_age_days (69% of jobs)
-- 2. Missing location parsing (city/country from location text)
-- 3. Very old jobs that should be deactivated
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. BACKFILL MISSING job_age_days
-- ============================================================================
-- Calculate job age from posted_at or original_posted_date
-- Priority: posted_at > original_posted_date > scrape_timestamp

UPDATE public.jobs
SET 
    job_age_days = CASE
        -- Use posted_at if available
        WHEN posted_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (NOW() - posted_at)) / 86400
        -- Fall back to original_posted_date
        WHEN original_posted_date IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (NOW() - original_posted_date::timestamptz)) / 86400
        -- Last resort: use scrape_timestamp (but this is less accurate)
        WHEN scrape_timestamp IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (NOW() - scrape_timestamp)) / 86400
        ELSE NULL
    END::INTEGER,
    updated_at = NOW()
WHERE 
    is_active = true
    AND job_age_days IS NULL
    AND (
        posted_at IS NOT NULL 
        OR original_posted_date IS NOT NULL 
        OR scrape_timestamp IS NOT NULL
    );

-- ============================================================================
-- 2. BACKFILL MISSING LOCATION DATA (city/country)
-- ============================================================================
-- Use the existing parse_and_update_location function to extract city/country
-- from location text for jobs missing this data
-- Note: If function doesn't exist, it will be created. If it exists, it will be replaced.

-- Create or replace the function (idempotent)
CREATE OR REPLACE FUNCTION public.parse_and_update_location()
RETURNS TABLE (
    updated_count INTEGER,
    city_filled INTEGER,
    country_filled INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    job_record RECORD;
    parsed_city TEXT;
    parsed_country TEXT;
    loc_lower TEXT;
    is_remote BOOLEAN;
    is_eu BOOLEAN;
    parts TEXT[];
    temp_parts TEXT[];
    part TEXT;
    city_count INTEGER := 0;
    country_count INTEGER := 0;
    total_updated INTEGER := 0;
    
    -- EU countries list
    eu_countries TEXT[] := ARRAY[
        'austria', 'belgium', 'bulgaria', 'croatia', 'cyprus', 'czech republic',
        'denmark', 'estonia', 'finland', 'france', 'germany', 'greece', 'hungary',
        'ireland', 'italy', 'latvia', 'lithuania', 'luxembourg', 'malta',
        'netherlands', 'poland', 'portugal', 'romania', 'slovakia', 'slovenia',
        'spain', 'sweden', 'united kingdom', 'uk', 'gb', 'great britain', 
        'england', 'scotland', 'wales', 'northern ireland',
        'switzerland', 'ch', 'norway', 'no'
    ];
    
    -- Known EU cities
    eu_cities TEXT[] := ARRAY[
        'london', 'manchester', 'birmingham', 'edinburgh', 'glasgow', 'leeds', 'liverpool',
        'dublin', 'cork', 'galway',
        'berlin', 'munich', 'hamburg', 'cologne', 'frankfurt', 'stuttgart', 'düsseldorf', 'duesseldorf',
        'paris', 'marseille', 'lyon', 'toulouse', 'nice', 'nantes', 'strasbourg',
        'madrid', 'barcelona', 'valencia', 'seville', 'bilbao', 'málaga', 'malaga',
        'rome', 'milan', 'naples', 'turin', 'florence', 'bologna',
        'amsterdam', 'rotterdam', 'the hague', 'den haag', 'utrecht', 'eindhoven',
        'brussels', 'antwerp', 'ghent', 'bruges',
        'vienna', 'salzburg', 'graz', 'innsbruck',
        'zurich', 'geneva', 'basel', 'bern', 'lausanne',
        'stockholm', 'gothenburg', 'goteborg', 'malmö', 'malmo', 'uppsala',
        'copenhagen', 'aarhus', 'odense', 'aalborg',
        'oslo', 'bergen', 'trondheim', 'stavanger',
        'helsinki', 'espoo', 'tampere', 'vantaa',
        'warsaw', 'krakow', 'gdansk', 'wroclaw', 'poznan', 'wrocław', 'poznań',
        'prague', 'brno', 'ostrava', 'plzen', 'plzeň',
        'budapest', 'debrecen', 'szeged', 'miskolc',
        'lisbon', 'porto', 'coimbra',
        'athens', 'thessaloniki', 'patras', 'heraklion'
    ];
BEGIN
    -- Process jobs missing city or country
    FOR job_record IN 
        SELECT id, location, city, country
        FROM public.jobs
        WHERE is_active = true
          AND (
              city IS NULL OR city = '' OR
              country IS NULL OR country = ''
          )
          AND location IS NOT NULL
          AND location != ''
    LOOP
        loc_lower := LOWER(TRIM(job_record.location));
        
        -- Check for remote indicators
        is_remote := loc_lower ~ 'remote|work\s+from\s+home|wfh|anywhere';
        
        -- Skip remote jobs for city/country parsing
        IF is_remote THEN
            CONTINUE;
        END IF;
        
        -- Check if location contains EU country
        is_eu := FALSE;
        FOREACH parsed_country IN ARRAY eu_countries
        LOOP
            IF loc_lower LIKE '%' || parsed_country || '%' THEN
                is_eu := TRUE;
                EXIT;
            END IF;
        END LOOP;
        
        -- Extract city and country using comma separation
        temp_parts := string_to_array(loc_lower, ',');
        parts := ARRAY[]::TEXT[];
        
        -- Trim and filter out empty strings
        FOREACH part IN ARRAY temp_parts
        LOOP
            part := TRIM(part);
            IF part != '' THEN
                parts := array_append(parts, part);
            END IF;
        END LOOP;
        
        IF array_length(parts, 1) > 0 THEN
            parsed_city := parts[1];
        ELSE
            parsed_city := loc_lower;
        END IF;
        
        IF array_length(parts, 1) > 1 THEN
            parsed_country := parts[array_length(parts, 1)];
        ELSE
            parsed_country := '';
        END IF;
        
        -- If single part and it's a known EU city, leave country empty
        IF array_length(parts, 1) = 1 THEN
            IF parsed_city = ANY(eu_cities) THEN
                parsed_country := '';
            END IF;
        END IF;
        
        -- Update job if city or country is missing
        IF (job_record.city IS NULL OR job_record.city = '') AND parsed_city != '' THEN
            UPDATE public.jobs
            SET city = INITCAP(parsed_city), updated_at = NOW()
            WHERE id = job_record.id;
            city_count := city_count + 1;
            total_updated := total_updated + 1;
        END IF;
        
        IF (job_record.country IS NULL OR job_record.country = '') AND parsed_country != '' THEN
            UPDATE public.jobs
            SET country = INITCAP(parsed_country), updated_at = NOW()
            WHERE id = job_record.id;
            country_count := country_count + 1;
            IF (job_record.city IS NOT NULL AND job_record.city != '') THEN
                -- Don't double count if city was also updated
                total_updated := total_updated + 1;
            ELSE
                total_updated := total_updated + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT total_updated, city_count, country_count;
END;
$$;

-- Execute the location parsing function
SELECT * FROM public.parse_and_update_location();

-- ============================================================================
-- 3. DEACTIVATE VERY OLD JOBS (>1 year)
-- ============================================================================
-- Jobs posted more than 1 year ago are likely stale and should be deactivated

UPDATE public.jobs
SET 
    is_active = false,
    status = 'expired',
    updated_at = NOW()
WHERE 
    is_active = true
    AND (
        (posted_at IS NOT NULL AND posted_at < NOW() - INTERVAL '1 year')
        OR (original_posted_date IS NOT NULL AND original_posted_date < NOW() - INTERVAL '1 year')
    );

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the fixes:

-- Check job_age_days backfill
-- SELECT 
--     COUNT(*) as total_active,
--     COUNT(job_age_days) as with_age,
--     COUNT(*) - COUNT(job_age_days) as still_missing_age,
--     ROUND(COUNT(job_age_days) * 100.0 / COUNT(*), 2) as percentage_with_age
-- FROM jobs
-- WHERE is_active = true;

-- Check location parsing
-- SELECT 
--     COUNT(*) as total_active,
--     COUNT(CASE WHEN city IS NOT NULL AND city != '' THEN 1 END) as with_city,
--     COUNT(CASE WHEN country IS NOT NULL AND country != '' THEN 1 END) as with_country,
--     COUNT(CASE WHEN (city IS NULL OR city = '') AND location IS NOT NULL AND location != '' THEN 1 END) as still_missing_city,
--     COUNT(CASE WHEN (country IS NULL OR country = '') AND location IS NOT NULL AND location != '' THEN 1 END) as still_missing_country
-- FROM jobs
-- WHERE is_active = true;

-- Check old jobs deactivation
-- SELECT 
--     COUNT(*) as deactivated_old_jobs
-- FROM jobs
-- WHERE is_active = false
--   AND status = 'expired'
--   AND updated_at > NOW() - INTERVAL '1 hour';

