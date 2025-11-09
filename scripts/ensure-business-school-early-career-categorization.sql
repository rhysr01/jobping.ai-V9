-- ============================================================================
-- ENSURE JOBS ARE PROPERLY CATEGORIZED FOR BUSINESS SCHOOL EARLY CAREER GRADS
-- ============================================================================
-- This migration ensures all business school relevant jobs are properly tagged
-- with early-career category, is_graduate flag, and entry-level experience
-- OPTIMIZED FOR MATCHING LOGIC:
-- - Ensures 'early-career' in categories (required by hasEligibility check)
-- - Sets is_graduate/is_internship flags (used in experience scoring)
-- - Sets status='active' AND is_active=true (both checked in queries)
-- - Sets experience_required='entry-level' (used in experience scoring)
-- ============================================================================
-- Run this script against your Supabase database to update job categorization
-- ============================================================================

BEGIN;

-- Step 1: Update jobs that should be tagged as early-career for business school grads
-- These are analyst, associate, consultant, graduate, trainee, intern, junior roles
-- in business-relevant functions (finance, marketing, strategy, operations, etc.)

UPDATE jobs
SET 
  categories = CASE 
    WHEN 'early-career' = ANY(categories) THEN categories
    ELSE array_append(COALESCE(categories, ARRAY[]::text[]), 'early-career')
  END,
  experience_required = COALESCE(NULLIF(experience_required, ''), 'entry-level'),
  status = 'active',  -- Ensure status is active (checked in matching queries)
  is_active = true,   -- Ensure is_active is true (checked in matching queries)
  updated_at = now()
WHERE is_active = true
  AND (
    -- Business school relevant job titles
    (title ILIKE '%analyst%' AND (
      title ILIKE '%finance%' OR title ILIKE '%business%' OR 
      title ILIKE '%financial%' OR title ILIKE '%investment%' OR
      title ILIKE '%credit%' OR title ILIKE '%equity%' OR title ILIKE '%portfolio%' OR
      title ILIKE '%data%' OR title ILIKE '%operations%' OR title ILIKE '%commercial%' OR
      title ILIKE '%marketing%' OR title ILIKE '%strategy%' OR title ILIKE '%risk%' OR
      title ILIKE '%M&A%' OR title ILIKE '%mergers%' OR title ILIKE '%acquisitions%' OR
      title ILIKE '%corporate%' OR title ILIKE '%development%' OR title ILIKE '%research%'
    ))
    OR title ILIKE '%associate%' AND (
      title ILIKE '%finance%' OR title ILIKE '%business%' OR title ILIKE '%investment%' OR
      title ILIKE '%consulting%' OR title ILIKE '%banking%' OR title ILIKE '%corporate%'
    )
    OR title ILIKE '%consultant%' AND (
      title ILIKE '%junior%' OR title ILIKE '%graduate%' OR title ILIKE '%strategy%' OR
      title ILIKE '%business%' OR title ILIKE '%management%'
    )
    OR title ILIKE '%graduate%' AND (
      title ILIKE '%program%' OR title ILIKE '%scheme%' OR title ILIKE '%trainee%' OR
      title ILIKE '%finance%' OR title ILIKE '%business%' OR title ILIKE '%marketing%' OR
      title ILIKE '%strategy%' OR title ILIKE '%analyst%' OR title ILIKE '%consultant%'
    )
    OR title ILIKE '%trainee%' AND (
      title ILIKE '%management%' OR title ILIKE '%business%' OR title ILIKE '%finance%' OR
      title ILIKE '%commercial%' OR title ILIKE '%operations%'
    )
    OR title ILIKE '%intern%' OR title ILIKE '%internship%'
    OR title ILIKE '%junior%' AND (
      title ILIKE '%finance%' OR title ILIKE '%business%' OR title ILIKE '%marketing%' OR
      title ILIKE '%analyst%' OR title ILIKE '%consultant%' OR title ILIKE '%banking%' OR
      title ILIKE '%investment%' OR title ILIKE '%strategy%' OR title ILIKE '%operations%'
    )
    OR title ILIKE '%entry%level%' OR title ILIKE '%entry-level%'
    OR title ILIKE '%rotational%program%' OR title ILIKE '%rotational program%'
    OR title ILIKE '%campus%hire%' OR title ILIKE '%campus hire%'
    OR title ILIKE '%business development%'
    OR title ILIKE '%corporate development%'
    OR title ILIKE '%product analyst%' OR title ILIKE '%product associate%'
    OR title ILIKE '%sales development%' OR title ILIKE '%SDR%' OR title ILIKE '%BDR%'
    OR title ILIKE '%account executive%' AND (title ILIKE '%junior%' OR title ILIKE '%graduate%')
    OR title ILIKE '%customer success%' AND (title ILIKE '%associate%' OR title ILIKE '%junior%')
    OR title ILIKE '%revenue operations%' OR title ILIKE '%sales operations%'
    OR title ILIKE '%growth marketing%' OR title ILIKE '%digital marketing%'
    OR title ILIKE '%supply chain%' AND (title ILIKE '%analyst%' OR title ILIKE '%trainee%')
    OR title ILIKE '%procurement%' AND (title ILIKE '%analyst%' OR title ILIKE '%trainee%')
    OR title ILIKE '%logistics%' AND (title ILIKE '%analyst%' OR title ILIKE '%trainee%')
    OR title ILIKE '%ESG%' AND (title ILIKE '%analyst%' OR title ILIKE '%intern%' OR title ILIKE '%associate%')
    OR title ILIKE '%sustainability%' AND (title ILIKE '%analyst%' OR title ILIKE '%intern%' OR title ILIKE '%associate%')
  )
  AND NOT ('early-career' = ANY(categories))
  AND NOT (
    -- Exclude clearly senior roles
    title ILIKE '%senior%' OR title ILIKE '%lead%' OR title ILIKE '%principal%' OR
    title ILIKE '%director%' OR title ILIKE '%head%' OR title ILIKE '%vp%' OR
    title ILIKE '%vice president%' OR title ILIKE '%chief%' OR title ILIKE '%executive%'
  );

-- Step 2: Set is_graduate = true for graduate programs, schemes, and rotational programs
UPDATE jobs
SET 
  is_graduate = true,  -- Critical for experience scoring in matching
  categories = CASE 
    WHEN 'early-career' = ANY(categories) THEN categories
    ELSE array_append(COALESCE(categories, ARRAY[]::text[]), 'early-career')
  END,
  experience_required = COALESCE(NULLIF(experience_required, ''), 'entry-level'),
  status = 'active',  -- Ensure status is active
  is_active = true,   -- Ensure is_active is true
  updated_at = now()
WHERE is_active = true
  AND is_graduate = false
  AND (
    title ILIKE '%graduate program%' OR title ILIKE '%graduate programme%' OR
    title ILIKE '%graduate scheme%' OR title ILIKE '%graduate trainee%' OR
    title ILIKE '%rotational program%' OR title ILIKE '%rotational programme%' OR
    title ILIKE '%campus hire%' OR title ILIKE '%campus recruitment%' OR
    title ILIKE '%university hire%' OR title ILIKE '%college hire%' OR
    title ILIKE '%future leaders%' OR title ILIKE '%emerging leaders%' OR
    title ILIKE '%early careers%' OR title ILIKE '%early career%program%' OR
    (title ILIKE '%graduate%' AND (title ILIKE '%analyst%' OR title ILIKE '%consultant%' OR title ILIKE '%trainee%'))
  )
  AND NOT (
    -- Exclude senior graduate roles (rare but possible)
    title ILIKE '%senior%graduate%' OR title ILIKE '%lead%graduate%'
  );

-- Step 3: Set is_internship = true for internship roles
UPDATE jobs
SET 
  is_internship = true,  -- Critical for experience scoring in matching
  categories = CASE 
    WHEN 'early-career' = ANY(categories) THEN categories
    ELSE array_append(COALESCE(categories, ARRAY[]::text[]), 'early-career')
  END,
  experience_required = COALESCE(NULLIF(experience_required, ''), 'entry-level'),
  status = 'active',  -- Ensure status is active
  is_active = true,   -- Ensure is_active is true
  updated_at = now()
WHERE is_active = true
  AND is_internship = false
  AND (
    title ILIKE '%intern%' OR title ILIKE '%internship%' OR
    title ILIKE '%praktikum%' OR title ILIKE '%praktikant%' OR
    title ILIKE '%stage%' OR title ILIKE '%stagiaire%' OR
    title ILIKE '%prácticas%' OR title ILIKE '%becario%' OR
    title ILIKE '%tirocinio%' OR title ILIKE '%stagista%' OR
    title ILIKE '%placement%' OR title ILIKE '%traineeship%'
  );

-- Step 4: Ensure experience_required is set for early-career jobs
-- This is critical for calculateExperienceScore() in matching logic
UPDATE jobs
SET 
  experience_required = 'entry-level',  -- Used in experience scoring
  status = 'active',  -- Ensure status is active
  is_active = true,   -- Ensure is_active is true
  updated_at = now()
WHERE is_active = true
  AND ('early-career' = ANY(categories))  -- Only update early-career jobs
  AND (
    experience_required IS NULL OR 
    experience_required = '' OR 
    experience_required NOT IN ('entry-level', 'junior', 'graduate', 'intern')
  )
  AND NOT (
    -- Don't override if it explicitly says experienced
    experience_required ILIKE '%experienced%' OR experience_required ILIKE '%senior%'
  );

-- Step 5: Remove 'experienced' category from jobs that should be early-career
-- This prevents conflicts in hasEligibility() check
UPDATE jobs
SET 
  categories = array_remove(categories, 'experienced'),  -- Remove conflicting category
  status = 'active',  -- Ensure status is active
  is_active = true,   -- Ensure is_active is true
  updated_at = now()
WHERE is_active = true
  AND ('experienced' = ANY(categories))
  AND ('early-career' = ANY(categories))  -- Has early-career (required for matching)
  AND (
    is_graduate = true OR   -- Graduate flag set (used in scoring)
    is_internship = true OR -- Internship flag set (used in scoring)
    experience_required IN ('entry-level', 'junior', 'graduate', 'intern')  -- Entry-level experience
  );

-- Step 6: Ensure status='active' for all early-career jobs
-- Matching queries check BOTH is_active AND status
UPDATE jobs
SET 
  status = 'active',
  updated_at = now()
WHERE is_active = true
  AND ('early-career' = ANY(categories))
  AND (status IS NULL OR status != 'active');

-- ============================================================================
-- STATISTICS
-- ============================================================================

SELECT 
  'Migration Complete' as status,
  COUNT(*) FILTER (WHERE is_active = true AND status = 'active' AND 'early-career' = ANY(categories)) as early_career_jobs,
  COUNT(*) FILTER (WHERE is_active = true AND status = 'active' AND is_graduate = true) as graduate_jobs,
  COUNT(*) FILTER (WHERE is_active = true AND status = 'active' AND is_internship = true) as internship_jobs,
  COUNT(*) FILTER (WHERE is_active = true AND status = 'active' AND experience_required = 'entry-level') as entry_level_jobs,
  COUNT(*) FILTER (WHERE is_active = true AND status = 'active' AND 'early-career' = ANY(categories) AND is_graduate = false AND is_internship = false) as early_career_but_no_flags
FROM jobs;

-- ============================================================================
-- PERFORMANCE OPTIMIZATION: Create indexes for matching queries
-- ============================================================================
-- These indexes optimize the most common matching query patterns

-- Index for early-career eligibility check (hasEligibility)
CREATE INDEX IF NOT EXISTS idx_jobs_categories_early_career 
ON jobs USING GIN (categories) 
WHERE is_active = true AND status = 'active' AND 'early-career' = ANY(categories);

-- Index for graduate flag (used in experience scoring)
CREATE INDEX IF NOT EXISTS idx_jobs_is_graduate 
ON jobs (is_graduate) 
WHERE is_active = true AND status = 'active' AND is_graduate = true;

-- Index for internship flag (used in experience scoring)
CREATE INDEX IF NOT EXISTS idx_jobs_is_internship 
ON jobs (is_internship) 
WHERE is_active = true AND status = 'active' AND is_internship = true;

-- Composite index for common matching query pattern
CREATE INDEX IF NOT EXISTS idx_jobs_matching_composite 
ON jobs (is_active, status, experience_required) 
WHERE is_active = true AND status = 'active' AND 'early-career' = ANY(categories);

COMMIT;

