-- ============================================================================
-- APPLY DATA QUALITY AUDIT FIXES
-- ============================================================================
-- This script applies all recommendations from the data quality audit
-- Run this after audit-data-quality.sql to fix identified issues
-- ============================================================================
-- NOTE: CREATE INDEX CONCURRENTLY must run OUTSIDE a transaction block
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE MISSING INDEX (run this FIRST, outside transaction)
-- ============================================================================
-- CRITICAL for category/career path filtering in matching queries
-- GIN index is required for efficient array overlap queries (categories && ARRAY[...])
-- This must run OUTSIDE a transaction block

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_categories_gin 
ON jobs USING GIN(categories) 
WHERE is_active = true AND categories IS NOT NULL;

-- ============================================================================
-- STEP 2: DATA FIXES (run these in transaction below)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 2. BACKFILL MISSING CITY DATA FROM LOCATION (inside transaction)
-- ============================================================================
-- Use the existing parse_and_update_location function to extract city/country
-- from location text for jobs missing this data

-- First, check if function exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'parse_and_update_location' 
        AND pronamespace = 'public'::regnamespace
    ) THEN
        -- Function doesn't exist, create it
        EXECUTE '
        CREATE OR REPLACE FUNCTION public.parse_and_update_location()
        RETURNS TABLE (
            updated_count INTEGER,
            city_filled INTEGER,
            country_filled INTEGER
        ) 
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = ''''
        AS $func$
        DECLARE
            job_record RECORD;
            parsed_city TEXT;
            parsed_country TEXT;
            loc_lower TEXT;
            is_remote BOOLEAN;
            parts TEXT[];
            temp_parts TEXT[];
            part TEXT;
            city_count INTEGER := 0;
            country_count INTEGER := 0;
            total_updated INTEGER := 0;
            
            -- ONLY cities from signup form (lib/config.ts targetCities)
            -- These are the ONLY cities users can select, so we should only extract these
            form_cities TEXT[] := ARRAY[
                ''london'', ''manchester'', ''birmingham'',
                ''dublin'',
                ''paris'',
                ''amsterdam'',
                ''brussels'',
                ''berlin'', ''hamburg'', ''munich'',
                ''zurich'',
                ''madrid'', ''barcelona'',
                ''milan'', ''rome'',
                ''stockholm'',
                ''copenhagen'',
                ''vienna'',
                ''prague'',
                ''warsaw''
            ];
        BEGIN
            FOR job_record IN 
                SELECT id, location, city, country
                FROM public.jobs
                WHERE is_active = true
                  AND (city IS NULL OR city = '''')
                  AND location IS NOT NULL
                  AND location != ''''
            LOOP
                loc_lower := LOWER(TRIM(job_record.location));
                
                -- Check for remote indicators
                is_remote := loc_lower ~ ''remote|work\s+from\s+home|wfh|anywhere'';
                
                -- Skip remote jobs
                IF is_remote THEN
                    CONTINUE;
                END IF;
                
                -- Extract city and country using comma separation
                temp_parts := string_to_array(loc_lower, '','');
                parts := ARRAY[]::TEXT[];
                
                FOREACH part IN ARRAY temp_parts
                LOOP
                    part := TRIM(part);
                    IF part != '''' THEN
                        parts := array_append(parts, part);
                    END IF;
                END LOOP;
                
                IF array_length(parts, 1) > 0 THEN
                    parsed_city := parts[1];
                ELSE
                    parsed_city := loc_lower;
                END IF;
                
                -- Only update if city is from signup form
                IF parsed_city = ANY(form_cities) THEN
                    UPDATE public.jobs
                    SET city = INITCAP(parsed_city), updated_at = NOW()
                    WHERE id = job_record.id;
                    city_count := city_count + 1;
                    total_updated := total_updated + 1;
                END IF;
            END LOOP;
            
            RETURN QUERY SELECT total_updated, city_count, country_count;
        END;
        $func$;
        ';
    END IF;
END $$;

-- Execute the location parsing function
DO $$
DECLARE
    result RECORD;
BEGIN
    SELECT * INTO result FROM public.parse_and_update_location();
    RAISE NOTICE 'Location parsing completed: Updated % jobs, filled % cities', 
        result.updated_count, result.city_filled;
END $$;

-- ============================================================================
-- 3. FIX STATUS INCONSISTENCY
-- ============================================================================
-- Jobs with is_active = true should have status = 'active'

UPDATE jobs
SET 
    status = 'active',
    updated_at = NOW()
WHERE is_active = true 
  AND status != 'active';

-- Report how many were fixed
DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    RAISE NOTICE 'Fixed % jobs with status inconsistency', fixed_count;
END $$;

-- ============================================================================
-- 4. DEACTIVATE STALE JOBS (>60 DAYS)
-- ============================================================================
-- Jobs older than 60 days should be deactivated for matching
-- Matching system only uses jobs <60 days old

UPDATE jobs
SET 
    is_active = false,
    status = 'expired',
    updated_at = NOW()
WHERE is_active = true 
  AND (
    (posted_at IS NOT NULL AND posted_at < NOW() - INTERVAL '60 days')
    OR (original_posted_date IS NOT NULL AND original_posted_date::timestamptz < NOW() - INTERVAL '60 days')
  );

-- Report how many were deactivated
DO $$
DECLARE
    deactivated_count INTEGER;
BEGIN
    GET DIAGNOSTICS deactivated_count = ROW_COUNT;
    RAISE NOTICE 'Deactivated % stale jobs (>60 days old)', deactivated_count;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after the transaction to verify fixes were applied

-- Verify index was created
SELECT 
    'Index Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'jobs' 
            AND indexname = 'idx_jobs_categories_gin'
        ) THEN '✅ idx_jobs_categories_gin EXISTS'
        ELSE '❌ idx_jobs_categories_gin MISSING'
    END as status

UNION ALL

-- Verify city data backfill
SELECT 
    'City Data Check',
    'Jobs with NULL city: ' || COUNT(*)::text
FROM jobs
WHERE is_active = true 
  AND city IS NULL 
  AND location IS NOT NULL 
  AND location != ''

UNION ALL

-- Verify status consistency
SELECT 
    'Status Consistency Check',
    'Jobs with status mismatch: ' || COUNT(*)::text
FROM jobs
WHERE is_active = true 
  AND status != 'active'

UNION ALL

-- Verify stale jobs deactivation
SELECT 
    'Stale Jobs Check',
    'Active jobs >60 days old: ' || COUNT(*)::text
FROM jobs
WHERE is_active = true 
  AND (
    (posted_at IS NOT NULL AND posted_at < NOW() - INTERVAL '60 days')
    OR (original_posted_date IS NOT NULL AND original_posted_date::timestamptz < NOW() - INTERVAL '60 days')
  );

