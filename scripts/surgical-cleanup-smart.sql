-- ============================================================================
-- SURGICAL CLEANUP - Smart Approach
-- ============================================================================
-- Step 1: FLAG missing legitimate early-career roles
-- Step 2: REMOVE only confirmed garbage
-- This preserves valuable analyst/consultant roles from top firms
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: FLAG MISSING LEGITIMATE EARLY-CAREER ROLES
-- ============================================================================

-- Flag analyst/consultant roles that have early-career indicators
UPDATE jobs
SET
  is_graduate = true,
  updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND (
    -- Has explicit entry-level keywords
    (LOWER(title) LIKE '%junior%' OR LOWER(title) LIKE '%jr.%')
    OR LOWER(title) LIKE '%entry level%'
    OR LOWER(title) LIKE '%entry-level%'
    OR LOWER(title) LIKE '%graduate%'
    OR LOWER(title) LIKE '%trainee%'
    OR LOWER(title) LIKE '%working student%'
    OR LOWER(title) LIKE '%werkstudent%'
    
    -- French work-study programs
    OR LOWER(title) LIKE '%alternance%'
    OR LOWER(title) LIKE '%débutant%'  -- means "beginner"
    OR LOWER(title) LIKE '%stage %'
    OR LOWER(title) LIKE '% stage'
    
    -- German dual study programs
    OR LOWER(title) LIKE '%duales studium%'
    OR LOWER(title) LIKE '%absolvent%'
    
    -- Summer/internship programs with year
    OR title ~ '202[56]'  -- 2025 or 2026
    OR LOWER(title) LIKE '%summer internship%'
    OR LOWER(title) LIKE '%summer analyst%'
    OR LOWER(title) LIKE '%summer program%'
    OR LOWER(title) LIKE '%summer programme%'
    
    -- Italian fresh graduates
    OR LOWER(title) LIKE '%neolaureato%'
    OR LOWER(title) LIKE '%laureati%'
    
    -- Spanish recent graduates
    OR LOWER(title) LIKE '%recién graduado%'
    
    -- Internship that slipped through
    OR LOWER(title) LIKE '%internship%'
    OR LOWER(title) LIKE '%intern %'
    OR LOWER(title) LIKE '% intern'
  );

-- Flag analyst/consultant roles from TOP business school recruiting firms
UPDATE jobs
SET
  is_graduate = true,
  updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND (LOWER(title) LIKE '%analyst%' OR LOWER(title) LIKE '%consultant%')
  AND LOWER(title) NOT LIKE '%senior%'
  AND LOWER(title) NOT LIKE '%lead%'
  AND LOWER(title) NOT LIKE '%manager%'
  AND LOWER(title) NOT LIKE '%director%'
  AND company IN (
    -- Consulting (MBB + Big 4)
    'McKinsey & Company', 'Boston Consulting Group', 'BCG', 'Bain & Company',
    'Deloitte', 'PwC', 'EY', 'KPMG', 'Accenture',
    
    -- Investment Banks
    'Goldman Sachs', 'Morgan Stanley', 'JP Morgan', 'JPMorgan Chase', 'Citi', 'Citigroup',
    'Deutsche Bank', 'Barclays', 'UBS', 'Credit Suisse', 'BNP Paribas',
    'Bank of America', 'Merrill Lynch',
    
    -- Tech (FAANG+)
    'Amazon', 'Google', 'Microsoft', 'Apple', 'Meta', 'Facebook',
    'Netflix', 'Tesla', 'Uber', 'Airbnb',
    
    -- Consulting/Strategy
    'Oliver Wyman', 'L.E.K. Consulting', 'Roland Berger', 'A.T. Kearney',
    'Alvarez & Marsal', 'FTI Consulting'
  );

-- ============================================================================
-- PART 2: REMOVE CONFIRMED GARBAGE (Non-Business School Roles)
-- ============================================================================

-- Healthcare & Medical (not business school)
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'healthcare_medical_not_business',
  updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(nurse|doctor|pharmacist|therapist|médecin|infirmier|kinésithérapeute|pfleger|krankenpfleger|clinical|medical|healthcare|paramedic)';

-- Childcare & Education (not business school)
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'childcare_education',
  updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(kinderpfleger|betreuungskraft|childcare|nanny|éducateur|erzieher|pedagog|kita)';

-- Manual Labor & Trades
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'manual_labor_trades',
  updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(commis de cuisine|chef|cook|kitchen|warehouse|driver|security|beveiliger|plumber|electrician|mechanic)';

-- Retail & Hospitality (non-management)
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'retail_hospitality_nongrad',
  updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(barista|waiter|waitress|nights team member|bar staff|cashier|planner outlet|shop|store assistant)';

-- Scam & Broken Jobs
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'scam_or_broken_data',
  updated_at = now()
WHERE status = 'active'
  AND (
    LOWER(title) LIKE '%paid emails%'
    OR LOWER(title) LIKE '%work from home%'
    OR LENGTH(title) > 200  -- Broken JobSpy titles (descriptions as titles)
    OR title LIKE '%**%'
    OR company LIKE '%,%'  -- Broken company parsing
    OR location LIKE '%,%,%'  -- Multiple commas indicate parsing errors
  );

-- Tax/Accounting Professionals (not entry-level)
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'qualified_professional',
  updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(steuerberater|tax advisor|accountant|buchhalter|comptable)';

-- ============================================================================
-- PART 3: REMOVE STALE JOBS (over 30 days old)
-- ============================================================================

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'stale_posting',
  updated_at = now()
WHERE status = 'active'
  AND created_at < NOW() - INTERVAL '30 days';

-- ============================================================================
-- PART 4: REMOVE DUPLICATES (keep newest)
-- ============================================================================

WITH ranked AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        LOWER(TRIM(title)), 
        LOWER(TRIM(company)), 
        SPLIT_PART(location, ',', 1) 
      ORDER BY created_at DESC
    ) as rn
  FROM jobs 
  WHERE status = 'active'
)
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'duplicate',
  updated_at = now()
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- ============================================================================
-- PART 5: ENSURE ALL ACTIVE JOBS HAVE COMPLETE METADATA
-- ============================================================================

-- Set experience level
UPDATE jobs
SET experience_required = 'entry-level'
WHERE status = 'active' AND experience_required IS NULL;

-- Ensure categories
UPDATE jobs
SET categories = COALESCE(categories, '{}') || ARRAY['early-career']
WHERE status = 'active' 
  AND NOT ('early-career' = ANY(COALESCE(categories, '{}')));

-- ============================================================================
-- FINAL STATISTICS
-- ============================================================================

SELECT '========================================' as divider;
SELECT 'SURGICAL CLEANUP COMPLETE' as status;

-- Overall health
SELECT
  COUNT(*) as total_active_jobs,
  COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) as early_career_flagged,
  COUNT(CASE WHEN is_internship = true THEN 1 END) as internships,
  COUNT(CASE WHEN is_graduate = true THEN 1 END) as graduates,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as fresh_under_30d,
  COUNT(CASE WHEN description IS NOT NULL AND LENGTH(description) > 100 THEN 1 END) as good_descriptions,
  ROUND(100.0 * COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) / COUNT(*), 1) || '%' as pct_flagged,
  ROUND(100.0 * COUNT(CASE WHEN description IS NOT NULL AND LENGTH(description) > 100 THEN 1 END) / COUNT(*), 1) || '%' as pct_good_desc
FROM jobs
WHERE status = 'active';

-- City coverage
SELECT
  SPLIT_PART(location, ',', 1) as city,
  COUNT(*) as jobs,
  COUNT(CASE WHEN is_internship = true THEN 1 END) as internships,
  COUNT(CASE WHEN is_graduate = true THEN 1 END) as graduates
FROM jobs
WHERE status = 'active'
  AND location ~ '^(London|Paris|Milan|Berlin|Madrid|Amsterdam|Munich|Hamburg|Zurich|Rome|Dublin|Brussels)'
GROUP BY SPLIT_PART(location, ',', 1)
ORDER BY jobs DESC;

-- Filtering summary
SELECT
  filtered_reason,
  COUNT(*) as count
FROM jobs
WHERE status = 'inactive'
GROUP BY filtered_reason
ORDER BY count DESC
LIMIT 15;

-- Quality verification: Are any obviously bad jobs still active?
SELECT
  COUNT(*) as potentially_problematic,
  COUNT(CASE WHEN is_graduate = false AND is_internship = false THEN 1 END) as still_unflagged
FROM jobs
WHERE status = 'active'
  AND (
    LOWER(title) ~ '(nurse|childcare|chef|kitchen|security|waiter)'
    OR company LIKE '%,%'
    OR LENGTH(title) > 150
  );

COMMIT;

-- ============================================================================
-- END - Database is now pristine with surgical precision
-- ============================================================================

