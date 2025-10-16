-- ============================================================================
-- COMPREHENSIVE JOB LABELING FOR OPTIMAL MATCHING
-- ============================================================================
-- Labels all jobs by business function and ensures clean location data
-- Primary matching dimensions: LOCATION + BUSINESS FUNCTION
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: ADD BUSINESS FUNCTION CATEGORIES TO ALL JOBS
-- ============================================================================

-- Investment Banking & Capital Markets
UPDATE jobs
SET categories = array_append(
    COALESCE(categories, '{}'), 
    'investment-banking'
  )
WHERE status = 'active'
  AND NOT ('investment-banking' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(investment bank|ibd|m&a|capital markets|equity|fixed income|trading|underwriting|capital advisory|global capital markets)';

-- Finance & Accounting
UPDATE jobs
SET categories = array_append(
    COALESCE(categories, '{}'), 
    'finance-accounting'
  )
WHERE status = 'active'
  AND NOT ('finance-accounting' = ANY(COALESCE(categories, '{}')))
  AND NOT ('investment-banking' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(finance|financial|treasury|fp&a|accounting|audit|tax|controller|controllo|contab|comptab)';

-- Consulting & Strategy
UPDATE jobs
SET categories = array_append(
    COALESCE(categories, '{}'), 
    'consulting-strategy'
  )
WHERE status = 'active'
  AND NOT ('consulting-strategy' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(consult|strategy|advisory|mbb|transformation)';

-- Marketing & Communications
UPDATE jobs
SET categories = array_append(
    COALESCE(categories, '{}'), 
    'marketing-comms'
  )
WHERE status = 'active'
  AND NOT ('marketing-comms' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(marketing|brand|communication|digital marketing|seo|content|social media|pr |public relations|media|earned media)';

-- Business & Data Analytics
UPDATE jobs
SET categories = array_append(
    COALESCE(categories, '{}'), 
    'analytics'
  )
WHERE status = 'active'
  AND NOT ('analytics' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(analyst|analys|analytics|business intelligence|bi |data)';

-- Operations & Supply Chain
UPDATE jobs
SET categories = array_append(
    COALESCE(categories, '{}'), 
    'operations'
  )
WHERE status = 'active'
  AND NOT ('operations' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(operations|supply chain|logistics|procurement|process|quality|service management)';

-- Product Management
UPDATE jobs
SET categories = array_append(
    COALESCE(categories, '{}'), 
    'product'
  )
WHERE status = 'active'
  AND NOT ('product' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(product manager|product owner|product)';

-- Sales & Business Development
UPDATE jobs
SET categories = array_append(
    COALESCE(categories, '{}'), 
    'sales-commercial'
  )
WHERE status = 'active'
  AND NOT ('sales-commercial' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(sales|commercial|business development|account executive|sdr|revenue|merchandis)';

-- HR & Talent
UPDATE jobs
SET categories = array_append(
    COALESCE(categories, '{}'), 
    'hr-talent'
  )
WHERE status = 'active'
  AND NOT ('hr-talent' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(hr|human resources|people|talent|recruitment|recruiter|campus recruit)';

-- Technology & Software
UPDATE jobs
SET categories = array_append(
    COALESCE(categories, '{}'), 
    'technology'
  )
WHERE status = 'active'
  AND NOT ('technology' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(software|developer|engineer|devops|tech|sre|programmer|coding|digital|automation)';

-- Risk & Compliance
UPDATE jobs
SET categories = array_append(
    COALESCE(categories, '{}'), 
    'risk-compliance'
  )
WHERE status = 'active'
  AND NOT ('risk-compliance' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(risk|compliance|regulatory|audit|kyc|aml)';

-- Real Estate & Property
UPDATE jobs
SET categories = array_append(
    COALESCE(categories, '{}'), 
    'real-estate'
  )
WHERE status = 'active'
  AND NOT ('real-estate' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(real estate|property|immobili|real-estate)';

-- Actuarial
UPDATE jobs
SET categories = array_append(
    COALESCE(categories, '{}'), 
    'actuarial'
  )
WHERE status = 'active'
  AND NOT ('actuarial' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(actuarial|actuary)';

-- Project Management
UPDATE jobs
SET categories = array_append(
    COALESCE(categories, '{}'), 
    'project-management'
  )
WHERE status = 'active'
  AND NOT ('project-management' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(project manager|program manager|pmo)';

-- ============================================================================
-- PART 2: NORMALIZE LOCATIONS (Critical for location-based matching)
-- ============================================================================

-- Normalize to standard format: "City, CountryCode"
UPDATE jobs SET location = 'London, GB' WHERE status = 'active' AND location ~ '^London' AND location != 'London, GB';
UPDATE jobs SET location = 'Paris, FR' WHERE status = 'active' AND location ~ '^Paris' AND location != 'Paris, FR';
UPDATE jobs SET location = 'Milan, IT' WHERE status = 'active' AND (location ~ '^Milan' OR location ~ '^Milano') AND location != 'Milan, IT';
UPDATE jobs SET location = 'Berlin, DE' WHERE status = 'active' AND location ~ '^Berlin' AND location != 'Berlin, DE';
UPDATE jobs SET location = 'Madrid, ES' WHERE status = 'active' AND location ~ '^Madrid' AND location != 'Madrid, ES';
UPDATE jobs SET location = 'Amsterdam, NL' WHERE status = 'active' AND location ~ '^Amsterdam' AND location != 'Amsterdam, NL';
UPDATE jobs SET location = 'Munich, DE' WHERE status = 'active' AND (location ~ '^Munich' OR location ~ '^München') AND location != 'Munich, DE';
UPDATE jobs SET location = 'Hamburg, DE' WHERE status = 'active' AND location ~ '^Hamburg' AND location != 'Hamburg, DE';
UPDATE jobs SET location = 'Zurich, CH' WHERE status = 'active' AND (location ~ '^Zurich' OR location ~ '^Zürich') AND location != 'Zurich, CH';
UPDATE jobs SET location = 'Rome, IT' WHERE status = 'active' AND (location ~ '^Rome' OR location ~ '^Roma') AND location != 'Rome, IT';
UPDATE jobs SET location = 'Dublin, IE' WHERE status = 'active' AND location ~ '^Dublin' AND location != 'Dublin, IE';
UPDATE jobs SET location = 'Brussels, BE' WHERE status = 'active' AND (location ~ '^Brussels' OR location ~ '^Bruxelles' OR location ~ '^Brussel') AND location != 'Brussels, BE';

-- ============================================================================
-- PART 3: FILTER OUT JOBS FROM NON-TARGET CITIES
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'non_target_city', updated_at = now()
WHERE status = 'active'
  AND location NOT IN ('London, GB', 'Paris, FR', 'Milan, IT', 'Berlin, DE', 'Madrid, ES', 
                       'Amsterdam, NL', 'Munich, DE', 'Hamburg, DE', 'Zurich, CH', 
                       'Rome, IT', 'Dublin, IE', 'Brussels, BE')
  AND location !~ '^(London|Paris|Milan|Berlin|Madrid|Amsterdam|Munich|Hamburg|Zurich|Rome|Dublin|Brussels)';

-- ============================================================================
-- PART 4: REMOVE REMAINING NON-BUSINESS SCHOOL ROLES
-- ============================================================================

-- Retail apprenticeships (Netto, Primark warehouse roles)
UPDATE jobs
SET status = 'inactive', filtered_reason = 'retail_apprentice_nonbiz', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(einzelhandel|retail apprentice)'
  AND company LIKE '%Netto%';

-- Architecture (unless at consulting firms)
UPDATE jobs
SET status = 'inactive', filtered_reason = 'architecture_nonbiz', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(architecture|architect|architektur)'
  AND company NOT IN ('Deloitte', 'PwC', 'EY', 'KPMG', 'McKinsey & Company', 'BCG', 'Bain & Company');

-- EIA/Environmental (unless business-focused)
UPDATE jobs
SET status = 'inactive', filtered_reason = 'environmental_nonbiz', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(eia|environmental|water consultant)'
  AND LOWER(title) !~ '(business|finance|strategy)';

-- Litigation/Legal
UPDATE jobs
SET status = 'inactive', filtered_reason = 'litigation_legal', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(litigation|linklaters|law firm)';

-- ============================================================================
-- PART 5: ENSURE ALL JOBS HAVE COMPLETE METADATA
-- ============================================================================

-- Ensure experience_required is set
UPDATE jobs
SET experience_required = 'entry-level'
WHERE status = 'active' AND experience_required IS NULL;

-- Ensure early-career category exists
UPDATE jobs
SET categories = COALESCE(categories, '{}') || ARRAY['early-career']
WHERE status = 'active' 
  AND NOT ('early-career' = ANY(COALESCE(categories, '{}')));

-- ============================================================================
-- FINAL STATISTICS & VERIFICATION
-- ============================================================================

SELECT '========================================' as divider;
SELECT 'COMPREHENSIVE JOB LABELING COMPLETE' as status;

-- Overall health
SELECT
  COUNT(*) as total_active_jobs,
  COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) as flagged_early_career,
  COUNT(CASE WHEN array_length(categories, 1) > 1 THEN 1 END) as has_business_function_label,
  COUNT(CASE WHEN location IN ('London, GB', 'Paris, FR', 'Milan, IT', 'Berlin, DE', 'Madrid, ES', 'Amsterdam, NL', 'Munich, DE', 'Hamburg, DE', 'Zurich, CH', 'Rome, IT', 'Dublin, IE', 'Brussels, BE') THEN 1 END) as normalized_location,
  ROUND(100.0 * COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) / COUNT(*), 1) || '%' as pct_flagged,
  ROUND(100.0 * COUNT(CASE WHEN array_length(categories, 1) > 1 THEN 1 END) / COUNT(*), 1) || '%' as pct_labeled
FROM jobs
WHERE status = 'active';

-- Business function distribution
SELECT 
  category,
  COUNT(*) as job_count
FROM (
  SELECT UNNEST(categories) as category
  FROM jobs
  WHERE status = 'active'
    AND categories IS NOT NULL
) sub
WHERE category != 'early-career'
GROUP BY category
ORDER BY job_count DESC;

-- City coverage with normalized locations
SELECT
  location as city,
  COUNT(*) as jobs,
  COUNT(CASE WHEN is_internship = true THEN 1 END) as internships,
  COUNT(CASE WHEN is_graduate = true THEN 1 END) as graduates
FROM jobs
WHERE status = 'active'
GROUP BY location
ORDER BY jobs DESC
LIMIT 15;

-- Verify no bad jobs remain
SELECT
  'Jobs without location normalization' as check_type,
  COUNT(*) as count
FROM jobs
WHERE status = 'active'
  AND location NOT IN ('London, GB', 'Paris, FR', 'Milan, IT', 'Berlin, DE', 'Madrid, ES', 
                       'Amsterdam, NL', 'Munich, DE', 'Hamburg, DE', 'Zurich, CH', 
                       'Rome, IT', 'Dublin, IE', 'Brussels, BE');

COMMIT;

-- ============================================================================
-- END - Database fully labeled and normalized for optimal AI matching
-- ============================================================================

