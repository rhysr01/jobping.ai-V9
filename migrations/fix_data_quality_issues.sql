-- Migration: Fix Data Quality Issues
-- Fixes: City normalization, job board companies, and data consistency

BEGIN;

-- ============================================================================
-- 1. CITY NORMALIZATION
-- ============================================================================
-- Normalize city names to canonical forms

-- Amsterdam variations -> Amsterdam
UPDATE jobs
SET city = 'Amsterdam'
WHERE city IN ('Amsterdam Centrum', 'Amsterdam Noord', 'Amsterdam Oost', 
               'Amsterdam Westpoort', 'Amsterdam Zuid', 'Amsterdam-zuidoost');

-- London variations -> London
UPDATE jobs
SET city = 'London'
WHERE city IN ('Central London', 'City Of London', 'East London', 
               'North London', 'North West London', 'South East London', 
               'South London', 'South West London', 'West London',
               'London Heathrow Airport');

-- Berlin variations -> Berlin
UPDATE jobs
SET city = 'Berlin'
WHERE city IN ('Berlin-friedrichshain', 'Berlin-kreuzberg', 'Berlin-mitte');

-- Munich variations -> Munich (using English name for consistency)
UPDATE jobs
SET city = 'Munich'
WHERE city IN ('München', 'Garching Bei München', 'Flughafen München');

-- Brussels variations -> Brussels (using English name)
UPDATE jobs
SET city = 'Brussels'
WHERE city IN ('Bruxelles', 'Bruxelles Ixelles', 'Bruxelles Saint-gilles', 
               'Bruxelles Schaarbeek');

-- Frankfurt variations -> Frankfurt
UPDATE jobs
SET city = 'Frankfurt'
WHERE city = 'Frankfurt am Main';

-- Praha variations -> Praha (normalize all districts to main city)
UPDATE jobs
SET city = 'Praha'
WHERE city LIKE 'Praha%';

-- Dublin variations -> Dublin (normalize all districts to main city)
UPDATE jobs
SET city = 'Dublin'
WHERE city LIKE 'Dublin%';

-- Paris variations -> Paris
UPDATE jobs
SET city = 'Paris'
WHERE city LIKE 'Paris%';

-- Remove country names used as cities (set to NULL - these should be in country field)
UPDATE jobs
SET city = NULL
WHERE city IN ('España', 'Deutschland', 'Österreich', 'Nederland', 'Belgique',
               'United Kingdom', 'UK', 'USA', 'US', 'France', 'Germany', 
               'Spain', 'Austria', 'Netherlands', 'Belgium', 'Ireland', 'Schweiz');

-- Remove generic codes (set to NULL)
UPDATE jobs
SET city = NULL
WHERE city IN ('W', 'Md', 'Ct');

-- ============================================================================
-- 2. JOB BOARD COMPANIES
-- ============================================================================
-- Mark jobs where company is a known job board
-- These should be filtered out or the actual company extracted

-- Create a flag for job board companies (we'll add this as a note)
-- For now, we'll set company_name to NULL and add a note in filtered_reason
UPDATE jobs
SET filtered_reason = COALESCE(filtered_reason || '; ', '') || 'job_board_as_company',
    company_name = NULL
WHERE company IN ('Reed', 'Indeed', 'LinkedIn', 'Adzuna', 'Totaljobs', 
                  'Monster', 'ZipRecruiter', 'Jobspy', 'Google')
   OR company ILIKE '%indeed%'
   OR company ILIKE '%reed%'
   OR company ILIKE '%adzuna%'
   OR company ILIKE '%jobspy%'
   OR company ILIKE '%linkedin%'
   OR company ILIKE '%totaljobs%'
   OR company ILIKE '%monster%'
   OR company ILIKE '%ziprecruiter%';

-- Note: The "Google" case might be legitimate Google jobs, so we should verify
-- For now, we're flagging it. You may want to manually review these.

-- ============================================================================
-- 3. COMPANY NAME FIELD SYNC
-- ============================================================================
-- Sync company_name from company field where company_name is NULL
UPDATE jobs
SET company_name = company
WHERE company_name IS NULL 
  AND company IS NOT NULL
  AND filtered_reason NOT LIKE '%job_board_as_company%';

-- ============================================================================
-- 4. ROLE FILTERING (Optional - uncomment if you want to filter these)
-- ============================================================================
-- Mark senior/manager roles that might not be appropriate for early-career
-- UPDATE jobs
-- SET filtered_reason = COALESCE(filtered_reason || '; ', '') || 'senior_role',
--     is_early_career = false
-- WHERE (title ILIKE '%senior%' OR title ILIKE '%snr%')
--   AND is_early_career = true;

-- UPDATE jobs
-- SET filtered_reason = COALESCE(filtered_reason || '; ', '') || 'manager_role',
--     is_early_career = false
-- WHERE (title ILIKE '%manager%' OR title ILIKE '%mgr%')
--   AND title NOT ILIKE '%junior%'
--   AND title NOT ILIKE '%trainee%'
--   AND title NOT ILIKE '%graduate%'
--   AND is_early_career = true;

-- ============================================================================
-- 5. STATISTICS AFTER CLEANUP
-- ============================================================================
-- Run these queries after migration to verify improvements:

-- SELECT COUNT(DISTINCT city) as unique_cities_after FROM jobs WHERE city IS NOT NULL;
-- SELECT city, COUNT(*) FROM jobs WHERE city IS NOT NULL GROUP BY city ORDER BY COUNT(*) DESC LIMIT 20;
-- SELECT COUNT(*) as job_board_companies FROM jobs WHERE filtered_reason LIKE '%job_board_as_company%';
-- SELECT COUNT(*) as null_company_name FROM jobs WHERE company_name IS NULL;

COMMIT;

