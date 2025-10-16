-- ============================================================================
-- FINAL BUSINESS SCHOOL ONLY - Complete Cleanup
-- ============================================================================
-- Removes ALL non-business school roles
-- Keeps ONLY: Finance, Consulting, Marketing, Analytics, Tech, Operations, Sales, HR
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Remove ALL unflagged jobs WITHOUT business keywords
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'no_business_relevance', updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) !~ '(finance|financ|consult|marketing|analyst|operations|product|sales|commercial|hr|human resources|software|developer|engineer|tech|project|risk|compliance|audit|investment|bank|strategy|data|supply|procurement|talent|recruitment|business|account)';

-- ============================================================================
-- STEP 2: Remove Hospitality/Food Service (Even if flagged)
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'hospitality_food_service', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(ristorazione|mcdonalds|restaurant|hotel|concierge|ontbijtmedewerker|breakfast|food service|vendeur|sales associate|apprentice.*general assistant|front office trainee)';

-- ============================================================================
-- STEP 3: Remove Healthcare/Medical (Even if flagged)
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'healthcare_medical_all', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(medico|doctor|arzt|nurse|pflege|care|betreuung|educatore|educator apprentice|healthcare|medical)';

-- ============================================================================
-- STEP 4: Remove Examiner/Testing Roles
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'examiner_testing', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(examiner|literature)';

-- ============================================================================
-- STEP 5: Remove Architecture/Engineering (Non-Business)
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'architecture_engineering_nonbiz', updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(architektur|lüftung|klimaanlagen|lab test means|quantity surveying)'
  AND LOWER(title) !~ '(business|finance|consult)';

-- ============================================================================
-- STEP 6: Remove Generic Admin/Clerical (Non-Graduate)
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'admin_clerical_nongrad', updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(team administrator|junior administrator|billing specialist|contabile|impiegata|amministrativo|segretaria|ufficio acquisti)';

-- ============================================================================
-- STEP 7: Remove Customer Service (Non-Business)
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'customer_service_nonbiz', updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(kundenservice|customer care|costumer care)';

-- ============================================================================
-- STEP 8: Remove Non-Profit/Social Work
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'nonprofit_social', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(terzo settore|amnesty|social work|nonprofit)';

-- ============================================================================
-- STEP 9: Remove Generic Assistant Roles (If not at top firms)
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'generic_assistant', updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(assistant|assistent)'
  AND LOWER(title) !~ '(business|executive|personal to ceo|pa to)' 
  AND company NOT IN (
    'McKinsey & Company', 'BCG', 'Bain & Company', 'Goldman Sachs', 'Morgan Stanley',
    'JP Morgan', 'Citi', 'Barclays', 'UBS', 'Deutsche Bank', 'Amazon', 'Google', 'Microsoft'
  );

-- ============================================================================
-- STEP 10: FLAG missing business roles from Flagged Internships
-- ============================================================================

-- Flag alternance/dual study programs in business fields
UPDATE jobs
SET is_graduate = true
WHERE status = 'active'
  AND is_graduate = false
  AND (
    LOWER(title) LIKE '%alternance%'
    OR LOWER(title) LIKE '%duales studium%'
  )
  AND LOWER(title) ~ '(business|bwl|finance|marketing|communication|commerce|wirtschaft)';

-- ============================================================================
-- FINAL STATISTICS
-- ============================================================================

SELECT 'FINAL BUSINESS SCHOOL CLEANUP COMPLETE' as status;

SELECT
  COUNT(*) as total_active,
  COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) as flagged_early_career,
  ROUND(100.0 * COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) / COUNT(*), 1) || '%' as pct_flagged,
  COUNT(CASE WHEN LOWER(title) ~ '(finance|consult|marketing|analyst|operations|product|sales|commercial|hr|software|developer|engineer|strategy|data|investment|bank)' THEN 1 END) as with_business_keywords,
  ROUND(100.0 * COUNT(CASE WHEN LOWER(title) ~ '(finance|consult|marketing|analyst|operations|product|sales|commercial|hr|software|developer|engineer|strategy|data|investment|bank)' THEN 1 END) / COUNT(*), 1) || '%' as pct_business_keywords
FROM jobs
WHERE status = 'active';

-- City coverage
SELECT
  SPLIT_PART(location, ',', 1) as city,
  COUNT(*) as jobs
FROM jobs
WHERE status = 'active'
  AND location ~ '^(London|Paris|Milan|Berlin|Madrid|Amsterdam|Munich|Hamburg|Zurich|Rome|Dublin|Brussels)'
GROUP BY SPLIT_PART(location, ',', 1)
ORDER BY jobs DESC;

COMMIT;

-- ============================================================================
-- END - Only business school relevant roles remain
-- ============================================================================

