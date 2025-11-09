-- ============================================================================
-- BACKFILL MISSING CITY/COUNTRY DATA
-- ============================================================================
-- Parses location field to extract city and country for jobs missing this data
-- Uses logic from scrapers/utils.ts parseLocation function
-- ============================================================================

-- Create function to parse location into city/country
CREATE OR REPLACE FUNCTION parse_and_update_location()
RETURNS TABLE (
    updated_count INTEGER,
    city_filled INTEGER,
    country_filled INTEGER
) AS $$
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
        FROM jobs
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
        -- Split by comma and trim each part, filter out empty strings
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
        
        -- If country not detected but city is known EU city, infer EU
        IF NOT is_eu AND parsed_country = '' THEN
            IF parsed_city = ANY(eu_cities) THEN
                is_eu := TRUE;
            END IF;
        END IF;
        
        -- Update job if city or country is missing
        IF (job_record.city IS NULL OR job_record.city = '') AND parsed_city != '' THEN
            UPDATE jobs
            SET city = INITCAP(parsed_city), updated_at = NOW()
            WHERE id = job_record.id;
            city_count := city_count + 1;
            total_updated := total_updated + 1;
        END IF;
        
        IF (job_record.country IS NULL OR job_record.country = '') AND parsed_country != '' THEN
            UPDATE jobs
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
$$ LANGUAGE plpgsql;

-- Execute the function to backfill data
SELECT * FROM parse_and_update_location();

-- Drop the function after use (or keep it for future use)
-- DROP FUNCTION IF EXISTS parse_and_update_location();

