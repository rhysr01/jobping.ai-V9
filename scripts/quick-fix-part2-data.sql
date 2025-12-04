-- ============================================================================
-- QUICK FIX - PART 2: DATA FIXES
-- ============================================================================
-- Run this AFTER PART 1 completes
-- ============================================================================

BEGIN;

-- 2. BACKFILL CITY DATA (ONLY cities from signup form - lib/config.ts targetCities)
-- Method 1: Extract from comma-separated format (standard)
UPDATE jobs
SET 
    city = INITCAP(TRIM(SPLIT_PART(location, ',', 1))),
    updated_at = NOW()
WHERE is_active = true
  AND city IS NULL
  AND location IS NOT NULL
  AND location != ''
  AND SPLIT_PART(location, ',', 1) != ''
  AND LOWER(TRIM(SPLIT_PART(location, ',', 1))) IN (
    -- ONLY cities from signup form (lib/config.ts targetCities)
    'london', 'manchester', 'birmingham',
    'dublin',
    'paris',
    'amsterdam',
    'brussels',
    'berlin', 'hamburg', 'munich',
    'zurich',
    'madrid', 'barcelona',
    'milan', 'rome',
    'stockholm',
    'copenhagen',
    'vienna',
    'prague',
    'warsaw'
  );

-- Method 2: Extract from location using regex word boundaries (handles "London, UK", "Greater London", etc.)
-- This is more precise and avoids false positives
UPDATE jobs
SET 
    city = CASE
        -- UK cities (Reed is UK-only, so prioritize these patterns)
        WHEN location ~* '\y(london)\y' THEN 'London'
        WHEN location ~* '\y(manchester)\y' THEN 'Manchester'
        WHEN location ~* '\y(birmingham)\y' THEN 'Birmingham'
        -- Other form cities
        WHEN location ~* '\y(dublin)\y' THEN 'Dublin'
        WHEN location ~* '\y(paris)\y' THEN 'Paris'
        WHEN location ~* '\y(amsterdam)\y' THEN 'Amsterdam'
        WHEN location ~* '\y(brussels)\y' THEN 'Brussels'
        WHEN location ~* '\y(berlin)\y' THEN 'Berlin'
        WHEN location ~* '\y(hamburg)\y' THEN 'Hamburg'
        WHEN location ~* '\y(munich)\y' THEN 'Munich'
        WHEN location ~* '\y(zurich)\y' THEN 'Zurich'
        WHEN location ~* '\y(madrid)\y' THEN 'Madrid'
        WHEN location ~* '\y(barcelona)\y' THEN 'Barcelona'
        WHEN location ~* '\y(milan)\y' THEN 'Milan'
        WHEN location ~* '\y(rome)\y' THEN 'Rome'
        WHEN location ~* '\y(stockholm)\y' THEN 'Stockholm'
        WHEN location ~* '\y(copenhagen)\y' THEN 'Copenhagen'
        WHEN location ~* '\y(vienna)\y' THEN 'Vienna'
        WHEN location ~* '\y(prague)\y' THEN 'Prague'
        WHEN location ~* '\y(warsaw)\y' THEN 'Warsaw'
        ELSE city
    END,
    updated_at = NOW()
WHERE is_active = true
  AND city IS NULL
  AND location IS NOT NULL
  AND location != ''
  AND (
    -- Use regex word boundaries to match city names precisely
    location ~* '\y(london|manchester|birmingham|dublin|paris|amsterdam|brussels|berlin|hamburg|munich|zurich|madrid|barcelona|milan|rome|stockholm|copenhagen|vienna|prague|warsaw)\y'
  )
  AND NOT (location ILIKE '%remote%' OR location ILIKE '%work from home%' OR location ILIKE '%wfh%');

-- 3. FIX STATUS INCONSISTENCY
UPDATE jobs
SET status = 'active', updated_at = NOW()
WHERE is_active = true AND status != 'active';

-- 4. DEACTIVATE STALE JOBS
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

COMMIT;

