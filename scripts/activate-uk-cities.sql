-- ============================================================================
-- ACTIVATE UK CITIES - Manchester & Birmingham
-- ============================================================================
-- Reactivates 182 jobs from Manchester and Birmingham
-- Note: No Belfast jobs found in database
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Reactivate Manchester & Birmingham jobs
-- ============================================================================

UPDATE jobs
SET
  status = 'active',
  filtered_reason = NULL,
  updated_at = now()
WHERE status = 'inactive'
  AND (
    location LIKE 'Manchester%'
    OR location LIKE 'Birmingham%'
    OR location = 'Manchester'
    OR location = 'Birmingham'
  );

-- ============================================================================
-- STEP 2: Fix city and country fields
-- ============================================================================

UPDATE jobs
SET 
  city = 'Manchester',
  country = 'GB'
WHERE status = 'active'
  AND (location LIKE 'Manchester%' OR location = 'Manchester')
  AND (city IS NULL OR city != 'Manchester');

UPDATE jobs
SET 
  city = 'Birmingham',
  country = 'GB'
WHERE status = 'active'
  AND (location LIKE 'Birmingham%' OR location = 'Birmingham')
  AND (city IS NULL OR city != 'Birmingham');

-- ============================================================================
-- STEP 3: Apply career path categories to ALL active jobs (including new UK)
-- ============================================================================

-- Reset categories to just early-career for all active jobs
UPDATE jobs
SET categories = ARRAY['early-career']
WHERE status = 'active';

-- 1. STRATEGY & BUSINESS DESIGN
UPDATE jobs
SET categories = categories || ARRAY['strategy-business-design']
WHERE status = 'active'
  AND LOWER(title) ~ '(strategy|strategic|business design|transformation|management consult|advisory|business consult|change management|innovation consult)';

-- 2. DATA & ANALYTICS
UPDATE jobs
SET categories = categories || ARRAY['data-analytics']
WHERE status = 'active'
  AND LOWER(title) ~ '(data|analytics|business intelligence|bi |data science|data engineer|machine learning|ml |ai |artificial intelligence)';

-- 3. RETAIL & LUXURY
UPDATE jobs
SET categories = categories || ARRAY['retail-luxury']
WHERE status = 'active'
  AND LOWER(title) ~ '(retail|luxury|fashion|beauty|merchandis|buyer|store|ecommerce|e-commerce)';

-- 4. SALES & CLIENT SUCCESS
UPDATE jobs
SET categories = categories || ARRAY['sales-client-success']
WHERE status = 'active'
  AND LOWER(title) ~ '(sales|account executive|business development|bd |client success|customer success|revenue|sdr|account manager|commercial)';

-- 5. MARKETING & GROWTH
UPDATE jobs
SET categories = categories || ARRAY['marketing-growth']
WHERE status = 'active'
  AND LOWER(title) ~ '(marketing|brand|growth|digital marketing|content|social media|seo|sem|performance marketing|demand gen|communications|pr |public relations|media)';

-- 6. FINANCE & INVESTMENT
UPDATE jobs
SET categories = categories || ARRAY['finance-investment']
WHERE status = 'active'
  AND LOWER(title) ~ '(finance|financial|investment|banking|treasury|fp&a|accounting|audit|tax|m&a|capital markets|equity|trading|underwriting|private equity|venture capital|asset management|wealth|actuarial)';

-- 7. OPERATIONS & SUPPLY CHAIN
UPDATE jobs
SET categories = categories || ARRAY['operations-supply-chain']
WHERE status = 'active'
  AND LOWER(title) ~ '(operations|supply chain|logistics|procurement|sourcing|planning|inventory|warehouse|fulfillment|process|quality|service management)';

-- 8. PRODUCT & INNOVATION
UPDATE jobs
SET categories = categories || ARRAY['product-innovation']
WHERE status = 'active'
  AND LOWER(title) ~ '(product manager|product owner|product|innovation|r&d|research and development|product design|ux|ui|user experience)';

-- 9. TECH & TRANSFORMATION
UPDATE jobs
SET categories = categories || ARRAY['tech-transformation']
WHERE status = 'active'
  AND LOWER(title) ~ '(software|developer|engineer|devops|tech|sre|programmer|coding|it |digital transformation|cloud|cybersecurity|security|infrastructure|architect)';

-- 10. SUSTAINABILITY & ESG
UPDATE jobs
SET categories = categories || ARRAY['sustainability-esg']
WHERE status = 'active'
  AND LOWER(title) ~ '(sustainability|esg|environmental|social impact|green|climate|carbon|renewable|circular economy|csr|corporate social)';

-- ============================================================================
-- STATISTICS
-- ============================================================================

SELECT '========================================' as divider;
SELECT 'UK CITIES ACTIVATED + CAREER PATHS APPLIED' as status;

-- Total active jobs
SELECT COUNT(*) as total_active_jobs
FROM jobs
WHERE status = 'active';

-- UK cities breakdown
SELECT
  city,
  country,
  COUNT(*) as jobs,
  COUNT(CASE WHEN is_internship = true THEN 1 END) as internships,
  COUNT(CASE WHEN is_graduate = true THEN 1 END) as graduates
FROM jobs
WHERE status = 'active'
  AND city IN ('London', 'Manchester', 'Birmingham')
GROUP BY city, country
ORDER BY jobs DESC;

-- All 14 cities (12 original + 2 new UK)
SELECT
  city,
  country,
  COUNT(*) as jobs
FROM jobs
WHERE status = 'active'
GROUP BY city, country
ORDER BY jobs DESC;

-- Career path coverage
SELECT
  COUNT(*) as total_active,
  COUNT(CASE WHEN array_length(categories, 1) >= 2 THEN 1 END) as has_career_path,
  ROUND(100.0 * COUNT(CASE WHEN array_length(categories, 1) >= 2 THEN 1 END) / COUNT(*), 1) || '%' as pct_categorized
FROM jobs
WHERE status = 'active';

-- Career path distribution
SELECT 
  category as career_path,
  COUNT(*) as jobs,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM jobs WHERE status = 'active'), 1) || '%' as pct
FROM (
  SELECT UNNEST(categories) as category
  FROM jobs
  WHERE status = 'active'
) sub
WHERE category != 'early-career'
GROUP BY category
ORDER BY jobs DESC;

COMMIT;

-- ============================================================================
-- END - UK cities activated, all jobs categorized
-- ============================================================================

