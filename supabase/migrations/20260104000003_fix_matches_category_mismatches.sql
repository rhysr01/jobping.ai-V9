-- ============================================================================
-- FIX CATEGORY MISMATCHES IN MATCHES TABLE
-- ============================================================================
-- This migration identifies matches where job categories don't align with
-- user career paths and either:
-- 1. Removes the match if it's clearly wrong
-- 2. Updates match_quality to 'low' if it's borderline
-- ============================================================================
-- Date: January 4, 2026
-- Affected: 13 matches
-- ============================================================================

BEGIN;

-- Step 1: Create a function to check if job categories match user career path
CREATE OR REPLACE FUNCTION job_matches_user_career_path(
    job_categories text[],
    user_career_path text
) RETURNS boolean AS $$
BEGIN
    -- If user has no career path preference, allow all matches
    IF user_career_path IS NULL OR user_career_path = '' THEN
        RETURN true;
    END IF;
    
    -- If job has no categories, don't match
    IF job_categories IS NULL OR array_length(job_categories, 1) IS NULL THEN
        RETURN false;
    END IF;
    
    -- Map user career path to expected database categories
    CASE user_career_path
        WHEN 'strategy' THEN
            RETURN job_categories && ARRAY['strategy-business-design']::text[];
        WHEN 'data' THEN
            RETURN job_categories && ARRAY['data-analytics']::text[];
        WHEN 'sales' THEN
            RETURN job_categories && ARRAY['sales-client-success']::text[];
        WHEN 'marketing' THEN
            RETURN job_categories && ARRAY['marketing-growth']::text[];
        WHEN 'finance' THEN
            RETURN job_categories && ARRAY['finance-investment']::text[];
        WHEN 'operations' THEN
            RETURN job_categories && ARRAY['operations-supply-chain']::text[];
        WHEN 'product' THEN
            RETURN job_categories && ARRAY['product-innovation']::text[];
        WHEN 'tech' THEN
            RETURN job_categories && ARRAY['tech-transformation']::text[];
        WHEN 'sustainability' THEN
            RETURN job_categories && ARRAY['sustainability-esg']::text[];
        ELSE
            -- Unknown career path - allow match (user might be flexible)
            RETURN true;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Identify mismatched matches
CREATE TEMP TABLE mismatched_matches AS
SELECT 
    m.id,
    m.user_email,
    m.job_hash,
    m.match_score,
    m.match_quality,
    u.career_path as user_career_path,
    j.categories as job_categories,
    job_matches_user_career_path(j.categories, u.career_path) as should_match
FROM matches m
JOIN users u ON m.user_email = u.email
JOIN jobs j ON m.job_hash = j.job_hash
WHERE NOT job_matches_user_career_path(j.categories, u.career_path);

-- Step 3: Delete matches that clearly don't match user preferences
-- Only delete if match_score is low (< 0.7) to be conservative
DELETE FROM matches
WHERE id IN (
    SELECT id FROM mismatched_matches
    WHERE match_score < 0.7
    OR match_quality = 'low'
);

-- Step 4: Update match_quality to 'low' for borderline cases
UPDATE matches
SET 
    match_quality = 'low',
    match_reason = COALESCE(match_reason, '') || ' [Category mismatch detected - job categories do not align with user career path]',
    updated_at = NOW()
WHERE id IN (
    SELECT id FROM mismatched_matches
    WHERE match_score >= 0.7
    AND match_quality != 'low'
);

-- Step 5: Log the results
DO $$
DECLARE
    deleted_count INTEGER;
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO deleted_count
    FROM mismatched_matches
    WHERE match_score < 0.7 OR match_quality = 'low';
    
    SELECT COUNT(*) INTO updated_count
    FROM mismatched_matches
    WHERE match_score >= 0.7 AND match_quality != 'low';
    
    RAISE NOTICE 'Mismatched matches deleted: %', deleted_count;
    RAISE NOTICE 'Mismatched matches marked as low quality: %', updated_count;
END $$;

-- Clean up temp table
DROP TABLE IF EXISTS mismatched_matches;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify)
-- ============================================================================
-- Check remaining mismatched matches:
-- SELECT m.id, m.user_email, u.career_path, j.title, j.categories, m.match_score, m.match_quality
-- FROM matches m
-- JOIN users u ON m.user_email = u.email
-- JOIN jobs j ON m.job_hash = j.job_hash
-- WHERE NOT job_matches_user_career_path(j.categories, u.career_path);
--
-- Check matches with low quality:
-- SELECT COUNT(*) FROM matches WHERE match_quality = 'low';
--
-- Verify function works:
-- SELECT job_matches_user_career_path(ARRAY['marketing-growth'], 'marketing'); -- Should return true
-- SELECT job_matches_user_career_path(ARRAY['marketing-growth'], 'strategy'); -- Should return false

