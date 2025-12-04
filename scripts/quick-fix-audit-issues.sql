-- ============================================================================
-- QUICK FIX: Apply All Audit Recommendations
-- ============================================================================
-- This is a simplified version that applies fixes without transaction overhead
-- Use this if you want to run fixes individually or see progress
-- ============================================================================
-- IMPORTANT: Run PART 1 FIRST, then PART 2 separately
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE INDEX (run this FIRST - must be outside transaction)
-- ============================================================================
-- CRITICAL: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
-- Copy and run ONLY this part first, wait for it to complete

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_categories_gin 
ON jobs USING GIN(categories) 
WHERE is_active = true AND categories IS NOT NULL;

-- ============================================================================
-- PART 2: DATA FIXES (run this AFTER PART 1 completes)
-- ============================================================================
-- Copy and run this part after PART 1 finishes

BEGIN;

-- 2. BACKFILL CITY DATA (ONLY cities from signup form - lib/config.ts targetCities)
UPDATE jobs
SET 
    city = INITCAP(SPLIT_PART(location, ',', 1)),
    updated_at = NOW()
WHERE is_active = true
  AND city IS NULL
  AND location IS NOT NULL
  AND location != ''
  AND SPLIT_PART(location, ',', 1) != ''
  AND LOWER(SPLIT_PART(location, ',', 1)) IN (
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
