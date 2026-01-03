-- ============================================================================
-- DAILY MAINTENANCE & HEALTH CHECK SQL
-- ============================================================================
-- This file combines all security, performance, and data quality fixes
-- Safe to run daily - all operations are idempotent
--
-- Last Updated: January 2, 2026
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. DATA CONSISTENCY FIXES (Data Quality - All Sources)
-- ============================================================================

-- 1.1. SYNC COMPANY_NAME FROM COMPANY FIELD
-- Ensure company_name is always set from company field
UPDATE jobs
SET company_name = company
WHERE company_name IS NULL 
  AND company IS NOT NULL
  AND company != ''
  AND filtered_reason NOT LIKE '%job_board_as_company%';

-- 1.2. JOB BOARD FLAGGING
-- Flag any remaining job board companies
UPDATE jobs
SET 
  filtered_reason = CASE
    WHEN filtered_reason IS NULL THEN 'job_board_as_company'
    WHEN filtered_reason NOT LIKE '%job_board_as_company%' THEN filtered_reason || '; job_board_as_company'
    ELSE filtered_reason
  END,
  company_name = NULL,
  is_active = false,
  status = 'inactive',
  updated_at = NOW()
WHERE (
  company IN ('Reed', 'Reed Recruitment', 'Indeed', 'Google', 'StepStone Group', 'StepStone', 'eFinancialCareers', 'efinancial')
  OR company ILIKE '%indeed%'
  OR company ILIKE '%reed%'
  OR company ILIKE '%adzuna%'
  OR company ILIKE '%jobspy%'
  OR company ILIKE '%linkedin%'
  OR company ILIKE '%totaljobs%'
  OR company ILIKE '%monster%'
  OR company ILIKE '%ziprecruiter%'
  OR company ILIKE '%efinancial%'
  OR company ILIKE '%stepstone%'
)
AND company NOT ILIKE '%recruitment%'
AND company NOT ILIKE '%staffing%'
AND company NOT ILIKE '%placement%'
AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%job_board_as_company%');

-- 1.3. EXTRACT COUNTRY FROM LOCATION WHEN LOCATION IS A COUNTRY NAME
-- Many jobspy jobs have location="Ireland" or location="United Kingdom" (country only, no city)
-- Handle both NULL and empty string for country
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

-- 1.4. EXTRACT CITY FROM LOCATION FIELD (comma-separated format: "City, Country")
UPDATE jobs
SET city = TRIM(SPLIT_PART(location, ',', 1))
WHERE (city IS NULL OR city = '')
  AND location IS NOT NULL 
  AND location != ''
  AND location LIKE '%,%'
  AND TRIM(SPLIT_PART(location, ',', 1)) != ''
  -- Don't extract if it looks like a country name
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

-- 1.6. EXTRACT CITY FROM SINGLE-WORD LOCATION (if it's a known city)
-- Handle cases where location="London" or location="Dublin" (city only, no comma)
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
  -- German cities
  WHEN city ILIKE '%münchen%' OR city ILIKE '%munich%' THEN 'Munich'
  WHEN city ILIKE '%köln%' OR city ILIKE '%cologne%' THEN 'Cologne'
  WHEN city ILIKE '%hamburg%' THEN 'Hamburg'
  WHEN city ILIKE '%frankfurt%' THEN 'Frankfurt'
  WHEN city ILIKE '%berlin%' THEN 'Berlin'
  WHEN city ILIKE '%stuttgart%' THEN 'Stuttgart'
  WHEN city ILIKE '%düsseldorf%' THEN 'Düsseldorf'
  -- Austrian cities
  WHEN city ILIKE '%wien%' OR city ILIKE '%vienna%' OR city ILIKE '%wiener neudorf%' THEN 'Vienna'
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
-- Fix very old posted dates (older than 2 years)
UPDATE jobs
SET posted_at = created_at
WHERE posted_at < NOW() - INTERVAL '2 years'
  AND created_at IS NOT NULL;

-- Fix NULL posted dates
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

-- 1.14. FIX OLD CATEGORY NAMES (replace with new ones)
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

-- Remove old categories if they still exist (cleanup)
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

-- ============================================================================
-- 2. ENABLE RLS ON PUBLIC TABLES (Security)
-- ============================================================================

-- Enable RLS (idempotent - safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'free_signups_analytics' 
      AND rowsecurity = true
  ) THEN
    ALTER TABLE public.free_signups_analytics ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'analytics_events' 
      AND rowsecurity = true
  ) THEN
    ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'free_sessions' 
      AND rowsecurity = true
  ) THEN
    ALTER TABLE public.free_sessions ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'scraping_priorities' 
      AND rowsecurity = true
  ) THEN
    ALTER TABLE public.scraping_priorities ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'custom_scans' 
      AND rowsecurity = true
  ) THEN
    ALTER TABLE public.custom_scans ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'fallback_match_events' 
      AND rowsecurity = true
  ) THEN
    ALTER TABLE public.fallback_match_events ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS policies (idempotent - DROP IF EXISTS then CREATE)
DO $$
BEGIN
  -- free_signups_analytics policies
  DROP POLICY IF EXISTS "Service role full access" ON public.free_signups_analytics;
  CREATE POLICY "Service role full access" ON public.free_signups_analytics
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'free_signups_analytics' 
      AND policyname = 'Authenticated users can read'
  ) THEN
    CREATE POLICY "Authenticated users can read" ON public.free_signups_analytics
      FOR SELECT TO authenticated USING (true);
  END IF;

  -- analytics_events policies
  DROP POLICY IF EXISTS "Service role full access" ON public.analytics_events;
  CREATE POLICY "Service role full access" ON public.analytics_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'analytics_events' 
      AND policyname = 'Authenticated users can insert'
  ) THEN
    CREATE POLICY "Authenticated users can insert" ON public.analytics_events
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  -- free_sessions policies
  DROP POLICY IF EXISTS "Service role full access" ON public.free_sessions;
  CREATE POLICY "Service role full access" ON public.free_sessions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'free_sessions' 
      AND policyname = 'Authenticated users can manage own'
  ) THEN
    CREATE POLICY "Authenticated users can manage own" ON public.free_sessions
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  -- scraping_priorities policies
  DROP POLICY IF EXISTS "Service role full access" ON public.scraping_priorities;
  CREATE POLICY "Service role full access" ON public.scraping_priorities
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  -- custom_scans policies
  DROP POLICY IF EXISTS "Service role full access" ON public.custom_scans;
  CREATE POLICY "Service role full access" ON public.custom_scans
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Users can manage own scans" ON public.custom_scans;
  CREATE POLICY "Users can manage own scans" ON public.custom_scans
    FOR ALL TO authenticated
    USING (user_email = (select email from auth.users where id = (select auth.uid())))
    WITH CHECK (user_email = (select email from auth.users where id = (select auth.uid())));

  -- fallback_match_events policies
  DROP POLICY IF EXISTS "Service role full access" ON public.fallback_match_events;
  CREATE POLICY "Service role full access" ON public.fallback_match_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);
END $$;

-- ============================================================================
-- 3. FIX RLS PERFORMANCE (Performance)
-- ============================================================================

-- Fix RLS policies to use (select auth.uid()) instead of auth.uid()
DO $$
BEGIN
  -- pending_digests (uses user_email, not user_id)
  -- Use (select auth.jwt() ->> 'email') for performance (avoids re-evaluation per row)
  DROP POLICY IF EXISTS "pending_digests_user_read_policy" ON public.pending_digests;
  CREATE POLICY "pending_digests_user_read_policy" ON public.pending_digests
    FOR SELECT TO authenticated 
    USING (user_email = (select auth.jwt() ->> 'email'));

  -- matches (has both user_id and user_email - use user_email for consistency)
  DROP POLICY IF EXISTS "users_view_own_matches" ON public.matches;
  CREATE POLICY "users_view_own_matches" ON public.matches
    FOR SELECT TO authenticated 
    USING (user_email = (select auth.jwt() ->> 'email'));

  -- match_logs (uses user_email, not user_id)
  DROP POLICY IF EXISTS "users_view_own_match_logs" ON public.match_logs;
  CREATE POLICY "users_view_own_match_logs" ON public.match_logs
    FOR SELECT TO authenticated 
    USING (user_email = (select auth.jwt() ->> 'email'));

  -- stripe_connect_accounts
  DROP POLICY IF EXISTS "Users can read own accounts" ON public.stripe_connect_accounts;
  CREATE POLICY "Users can read own accounts" ON public.stripe_connect_accounts
    FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

  DROP POLICY IF EXISTS "Service role full access" ON public.stripe_connect_accounts;
  CREATE POLICY "Service role full access" ON public.stripe_connect_accounts
    FOR ALL TO service_role USING (true) WITH CHECK (true);
END $$;

-- ============================================================================
-- 4. ADD MISSING INDEXES (Performance)
-- ============================================================================

-- Add indexes for foreign keys (idempotent - CREATE IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_api_key_usage_api_key_id 
  ON public.api_key_usage(api_key_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id 
  ON public.api_keys(user_id);

-- ============================================================================
-- 5. FIX FUNCTION SEARCH PATH (Security)
-- ============================================================================

-- Set search_path for functions (idempotent - safe to run multiple times)
DO $$
DECLARE
  func_name text;
  func_list text[] := ARRAY[
    'prevent_old_categories()',
    'reset_user_recommendations()',
    'normalize_city_name(text)',
    'get_user_match_stats(uuid)',
    'clean_company_name(text)',
    'clean_job_data_before_insert()',
    'categorize_job()',
    'clear_user_feedback_cache()',
    'trigger_user_rematch()',
    'update_pending_digests_updated_at()'
  ];
BEGIN
  FOREACH func_name IN ARRAY func_list
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%s SET search_path = public', func_name);
    EXCEPTION WHEN OTHERS THEN
      -- Function doesn't exist or already has correct search_path - skip
      NULL;
    END;
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to check status)
-- ============================================================================

-- Data Quality Checks
SELECT 
  'Data Quality' as check_type,
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN company_name IS NULL AND company IS NOT NULL THEN 1 END) as missing_company_name,
  COUNT(CASE WHEN (city IS NULL OR city = '') AND (country IS NULL OR country = '') THEN 1 END) as missing_both_location,
  COUNT(CASE WHEN (city IS NULL OR city = '') AND (country IS NOT NULL AND country != '') THEN 1 END) as missing_city_has_country,
  COUNT(CASE WHEN (country IS NULL OR country = '') AND (city IS NOT NULL AND city != '') THEN 1 END) as missing_country_has_city,
  COUNT(CASE WHEN description IS NULL OR LENGTH(description) < 20 THEN 1 END) as short_descriptions,
  COUNT(CASE WHEN categories IS NULL OR array_length(categories, 1) IS NULL THEN 1 END) as empty_categories,
  COUNT(CASE WHEN posted_at IS NULL THEN 1 END) as missing_posted_at
FROM jobs
WHERE is_active = true;

-- Job Board Status
SELECT 
  'Job Board Status' as check_type,
  COUNT(*) as total_job_boards,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_job_boards,
  COUNT(CASE WHEN filtered_reason LIKE '%job_board_as_company%' THEN 1 END) as flagged
FROM jobs
WHERE company IN ('Reed', 'Reed Recruitment', 'Indeed', 'Google', 'StepStone Group', 'StepStone', 'eFinancialCareers', 'efinancial')
   OR company ILIKE '%indeed%' OR company ILIKE '%reed%' OR company ILIKE '%efinancial%';

-- Old Category Names Check
SELECT 
  'Old Categories' as check_type,
  unnest(categories) as category,
  COUNT(*) as job_count
FROM jobs
WHERE categories && ARRAY['marketing-advertising', 'finance-accounting', 'sales-business-development', 'product-management']::text[]
GROUP BY unnest(categories)
ORDER BY job_count DESC;

-- Check RLS status
SELECT 
  'RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('free_signups_analytics', 'analytics_events', 'free_sessions', 
                    'scraping_priorities', 'custom_scans', 'fallback_match_events')
ORDER BY tablename;

-- Check indexes
SELECT 
  'Index Status' as check_type,
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN ('idx_api_key_usage_api_key_id', 'idx_api_keys_user_id')
ORDER BY tablename, indexname;

-- Check function search_path
SELECT 
  'Function Security' as check_type,
  proname as function_name,
  proconfig as search_path_config
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'prevent_old_categories', 'reset_user_recommendations', 'normalize_city_name',
    'get_user_match_stats', 'clean_company_name', 'clean_job_data_before_insert',
    'categorize_job', 'clear_user_feedback_cache', 'trigger_user_rematch',
    'update_pending_digests_updated_at'
  )
ORDER BY proname;

-- Location Normalization Check
SELECT 
  'Location Quality' as check_type,
  COUNT(CASE WHEN city IN ('España', 'Deutschland', 'United Kingdom', 'UK', 'Germany', 'Spain') THEN 1 END) as country_names_in_city,
  COUNT(CASE WHEN country ILIKE '%deutschland%' OR country ILIKE '%españa%' THEN 1 END) as unnormalized_countries,
  COUNT(CASE WHEN city ILIKE '%münchen%' OR city ILIKE '%wien%' OR city ILIKE '%praha%' THEN 1 END) as unnormalized_cities
FROM jobs
WHERE is_active = true;

-- Company Name Quality Check
SELECT 
  'Company Quality' as check_type,
  COUNT(CASE WHEN company LIKE '%Ltd%' OR company LIKE '%Inc%' OR company LIKE '%GmbH%' THEN 1 END) as companies_with_suffixes,
  COUNT(CASE WHEN company_name LIKE '%Ltd%' OR company_name LIKE '%Inc%' OR company_name LIKE '%GmbH%' THEN 1 END) as company_names_with_suffixes
FROM jobs
WHERE is_active = true;

-- Overall Health Summary
SELECT 
  'Health Summary' as check_type,
  (SELECT COUNT(*) FROM jobs WHERE company IN ('Reed', 'Indeed', 'Google') AND is_active = true) as active_job_boards,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' 
    AND tablename IN ('free_signups_analytics', 'analytics_events', 'free_sessions', 
                      'scraping_priorities', 'custom_scans', 'fallback_match_events')
    AND rowsecurity = false) as tables_without_rls,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' 
    AND indexname IN ('idx_api_key_usage_api_key_id', 'idx_api_keys_user_id')) as indexes_created,
  (SELECT COUNT(*) FROM jobs WHERE is_active = true 
    AND (
      (company_name IS NULL OR company_name = '') AND company IS NOT NULL AND company != ''
      OR (city IS NULL OR city = '') AND (country IS NULL OR country = '')  -- Both missing is an issue
      OR description IS NULL OR LENGTH(description) < 20
      OR categories IS NULL OR array_length(categories, 1) IS NULL
      OR posted_at IS NULL
    )) as data_quality_issues;

