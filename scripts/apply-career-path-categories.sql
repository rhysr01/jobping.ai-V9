-- ============================================================================
-- APPLY CAREER PATH CATEGORIES - JobPing Specific
-- ============================================================================
-- Labels jobs with the exact career paths used in your onboarding form
-- Also reactivates UK cities: London, Manchester, Belfast, Birmingham + Dublin
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: REACTIVATE UK CITIES (Manchester, Belfast, Birmingham) + Ensure Dublin
-- ============================================================================

UPDATE jobs
SET
  status = 'active',
  filtered_reason = NULL,
  updated_at = now()
WHERE status = 'inactive'
  AND filtered_reason = 'non_target_city_final'
  AND (
    location LIKE 'Manchester%'
    OR location LIKE 'Belfast%'
    OR location LIKE 'Birmingham%'
  );

-- Fix city field for all UK cities + Dublin
UPDATE jobs
SET city = CASE
  WHEN location LIKE 'Manchester%' THEN 'Manchester'
  WHEN location LIKE 'Belfast%' THEN 'Belfast'
  WHEN location LIKE 'Birmingham%' THEN 'Birmingham'
  WHEN location LIKE 'London%' THEN 'London'
  WHEN location LIKE 'Dublin%' THEN 'Dublin'
  WHEN location LIKE 'Paris%' THEN 'Paris'
  WHEN location LIKE 'Milan%' OR location LIKE 'Milano%' THEN 'Milan'
  WHEN location LIKE 'Berlin%' THEN 'Berlin'
  WHEN location LIKE 'Madrid%' THEN 'Madrid'
  WHEN location LIKE 'Amsterdam%' THEN 'Amsterdam'
  WHEN location LIKE 'Munich%' OR location LIKE 'München%' THEN 'Munich'
  WHEN location LIKE 'Hamburg%' THEN 'Hamburg'
  WHEN location LIKE 'Zurich%' OR location LIKE 'Zürich%' THEN 'Zurich'
  WHEN location LIKE 'Rome%' OR location LIKE 'Roma%' THEN 'Rome'
  WHEN location LIKE 'Brussels%' OR location LIKE 'Bruxelles%' THEN 'Brussels'
  ELSE city
END
WHERE status = 'active'
  AND (city IS NULL OR city != SPLIT_PART(location, ',', 1));

-- Fix country for all cities
UPDATE jobs
SET country = CASE
  WHEN city IN ('London', 'Manchester', 'Belfast', 'Birmingham') THEN 'GB'
  WHEN city = 'Dublin' THEN 'IE'
  WHEN city = 'Paris' THEN 'FR'
  WHEN city = 'Milan' THEN 'IT'
  WHEN city = 'Berlin' THEN 'DE'
  WHEN city = 'Madrid' THEN 'ES'
  WHEN city = 'Amsterdam' THEN 'NL'
  WHEN city IN ('Munich', 'Hamburg') THEN 'DE'
  WHEN city = 'Zurich' THEN 'CH'
  WHEN city = 'Rome' THEN 'IT'
  WHEN city = 'Brussels' THEN 'BE'
  ELSE country
END
WHERE status = 'active'
  AND (country IS NULL OR country NOT IN ('GB', 'IE', 'FR', 'IT', 'DE', 'ES', 'NL', 'CH', 'BE'));

-- ============================================================================
-- PART 2: REMOVE OLD CATEGORIES & ADD CAREER PATH CATEGORIES
-- ============================================================================

-- Remove all old business function categories (keep only early-career for now)
UPDATE jobs
SET categories = ARRAY['early-career']
WHERE status = 'active';

-- ============================================================================
-- 1. STRATEGY & BUSINESS DESIGN
-- ============================================================================

UPDATE jobs
SET categories = categories || ARRAY['strategy-business-design']
WHERE status = 'active'
  AND LOWER(title) ~ '(strategy|strategic|business design|transformation|management consult|advisory|business consult|change management|innovation consult)';

-- ============================================================================
-- 2. DATA & ANALYTICS
-- ============================================================================

UPDATE jobs
SET categories = categories || ARRAY['data-analytics']
WHERE status = 'active'
  AND LOWER(title) ~ '(data|analytics|business intelligence|bi |data science|data engineer|machine learning|ml |ai |artificial intelligence)';

-- ============================================================================
-- 3. RETAIL & LUXURY
-- ============================================================================

UPDATE jobs
SET categories = categories || ARRAY['retail-luxury']
WHERE status = 'active'
  AND LOWER(title) ~ '(retail|luxury|fashion|beauty|merchandis|buyer|store|ecommerce|e-commerce)';

-- ============================================================================
-- 4. SALES & CLIENT SUCCESS
-- ============================================================================

UPDATE jobs
SET categories = categories || ARRAY['sales-client-success']
WHERE status = 'active'
  AND LOWER(title) ~ '(sales|account executive|business development|bd |client success|customer success|revenue|sdr|account manager|commercial)';

-- ============================================================================
-- 5. MARKETING & GROWTH
-- ============================================================================

UPDATE jobs
SET categories = categories || ARRAY['marketing-growth']
WHERE status = 'active'
  AND LOWER(title) ~ '(marketing|brand|growth|digital marketing|content|social media|seo|sem|performance marketing|demand gen|communications|pr |public relations|media)';

-- ============================================================================
-- 6. FINANCE & INVESTMENT
-- ============================================================================

UPDATE jobs
SET categories = categories || ARRAY['finance-investment']
WHERE status = 'active'
  AND LOWER(title) ~ '(finance|financial|investment|banking|treasury|fp&a|accounting|audit|tax|m&a|capital markets|equity|trading|underwriting|private equity|venture capital|asset management|wealth|actuarial)';

-- ============================================================================
-- 7. OPERATIONS & SUPPLY CHAIN
-- ============================================================================

UPDATE jobs
SET categories = categories || ARRAY['operations-supply-chain']
WHERE status = 'active'
  AND LOWER(title) ~ '(operations|supply chain|logistics|procurement|sourcing|planning|inventory|warehouse|fulfillment|process|quality|service management)';

-- ============================================================================
-- 8. PRODUCT & INNOVATION
-- ============================================================================

UPDATE jobs
SET categories = categories || ARRAY['product-innovation']
WHERE status = 'active'
  AND LOWER(title) ~ '(product manager|product owner|product|innovation|r&d|research and development|product design|ux|ui|user experience)';

-- ============================================================================
-- 9. TECH & TRANSFORMATION
-- ============================================================================

UPDATE jobs
SET categories = categories || ARRAY['tech-transformation']
WHERE status = 'active'
  AND LOWER(title) ~ '(software|developer|engineer|devops|tech|sre|programmer|coding|it |digital transformation|cloud|cybersecurity|security|infrastructure|architect)';

-- ============================================================================
-- 10. SUSTAINABILITY & ESG
-- ============================================================================

UPDATE jobs
SET categories = categories || ARRAY['sustainability-esg']
WHERE status = 'active'
  AND LOWER(title) ~ '(sustainability|esg|environmental|social impact|green|climate|carbon|renewable|circular economy|csr|corporate social)';

-- ============================================================================
-- STATISTICS & VERIFICATION
-- ============================================================================

SELECT '========================================' as divider;
SELECT 'CAREER PATH CATEGORIES APPLIED' as status;

-- Overall stats
SELECT
  COUNT(*) as total_active_jobs,
  COUNT(CASE WHEN array_length(categories, 1) >= 2 THEN 1 END) as has_career_path,
  ROUND(100.0 * COUNT(CASE WHEN array_length(categories, 1) >= 2 THEN 1 END) / COUNT(*), 1) || '%' as pct_with_career_path
FROM jobs
WHERE status = 'active';

-- Career path distribution
SELECT 
  category,
  COUNT(*) as job_count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM jobs WHERE status = 'active'), 1) || '%' as percentage
FROM (
  SELECT UNNEST(categories) as category
  FROM jobs
  WHERE status = 'active'
) sub
WHERE category != 'early-career'
GROUP BY category
ORDER BY job_count DESC;

-- UK + Ireland coverage
SELECT
  city,
  COUNT(*) as jobs
FROM jobs
WHERE status = 'active'
  AND city IN ('London', 'Manchester', 'Belfast', 'Birmingham', 'Dublin')
GROUP BY city
ORDER BY jobs DESC;

-- All target cities coverage (15 cities total: 12 EU + 3 additional UK cities)
SELECT
  city,
  country,
  COUNT(*) as jobs,
  COUNT(CASE WHEN is_internship = true THEN 1 END) as internships,
  COUNT(CASE WHEN is_graduate = true THEN 1 END) as graduates
FROM jobs
WHERE status = 'active'
  AND city IN ('London', 'Manchester', 'Belfast', 'Birmingham', 'Dublin',
               'Paris', 'Milan', 'Berlin', 'Madrid', 'Amsterdam', 
               'Munich', 'Hamburg', 'Zurich', 'Rome', 'Brussels')
GROUP BY city, country
ORDER BY jobs DESC;

COMMIT;

-- ============================================================================
-- END - Jobs now labeled with JobPing career path categories
-- ============================================================================

