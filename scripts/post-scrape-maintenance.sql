-- ============================================================================
-- POST-SCRAPE MAINTENANCE SCRIPT
-- ============================================================================
-- Run this AFTER every scraping session to maintain database quality
-- Ensures new jobs meet the same standards as existing ones
-- ============================================================================

BEGIN;

SELECT '========================================' as divider;
SELECT 'POST-SCRAPE MAINTENANCE STARTING...' as status;
SELECT 'Jobs added in last 24 hours: ' || COUNT(*) as new_jobs 
FROM jobs 
WHERE created_at > now() - interval '24 hours';

-- ============================================================================
-- STEP 1: FIX MISSING DATA (City, Country, Location)
-- ============================================================================

-- Extract city from location for new jobs
UPDATE jobs
SET city = CASE
  WHEN location LIKE 'London%' THEN 'London'
  WHEN location LIKE 'Manchester%' THEN 'Manchester'
  WHEN location LIKE 'Birmingham%' THEN 'Birmingham'
  WHEN location LIKE 'Belfast%' THEN 'Belfast'
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
  ELSE SPLIT_PART(location, ',', 1)
END
WHERE status = 'active'
  AND city IS NULL
  AND created_at > now() - interval '7 days';

-- Normalize location format
UPDATE jobs SET location = 'London, GB' WHERE status = 'active' AND location LIKE 'London%' AND location != 'London, GB';
UPDATE jobs SET location = 'Manchester, GB' WHERE status = 'active' AND location LIKE 'Manchester%' AND location != 'Manchester, GB';
UPDATE jobs SET location = 'Birmingham, GB' WHERE status = 'active' AND location LIKE 'Birmingham%' AND location != 'Birmingham, GB';
UPDATE jobs SET location = 'Belfast, GB' WHERE status = 'active' AND location LIKE 'Belfast%' AND location != 'Belfast, GB';
UPDATE jobs SET location = 'Paris, FR' WHERE status = 'active' AND location LIKE 'Paris%' AND location != 'Paris, FR';
UPDATE jobs SET location = 'Milan, IT' WHERE status = 'active' AND (location LIKE 'Milan%' OR location LIKE 'Milano%') AND location != 'Milan, IT';
UPDATE jobs SET location = 'Berlin, DE' WHERE status = 'active' AND location LIKE 'Berlin%' AND location != 'Berlin, DE';
UPDATE jobs SET location = 'Madrid, ES' WHERE status = 'active' AND location LIKE 'Madrid%' AND location != 'Madrid, ES';
UPDATE jobs SET location = 'Amsterdam, NL' WHERE status = 'active' AND location LIKE 'Amsterdam%' AND location != 'Amsterdam, NL';
UPDATE jobs SET location = 'Munich, DE' WHERE status = 'active' AND (location LIKE 'Munich%' OR location LIKE 'München%') AND location != 'Munich, DE';
UPDATE jobs SET location = 'Hamburg, DE' WHERE status = 'active' AND location LIKE 'Hamburg%' AND location != 'Hamburg, DE';
UPDATE jobs SET location = 'Zurich, CH' WHERE status = 'active' AND (location LIKE 'Zurich%' OR location LIKE 'Zürich%') AND location != 'Zurich, CH';
UPDATE jobs SET location = 'Rome, IT' WHERE status = 'active' AND (location LIKE 'Rome%' OR location LIKE 'Roma%') AND location != 'Rome, IT';
UPDATE jobs SET location = 'Dublin, IE' WHERE status = 'active' AND location LIKE 'Dublin%' AND location != 'Dublin, IE';
UPDATE jobs SET location = 'Brussels, BE' WHERE status = 'active' AND (location LIKE 'Brussels%' OR location LIKE 'Bruxelles%') AND location != 'Brussels, BE';

-- Fix country codes
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
  AND created_at > now() - interval '7 days';

-- ============================================================================
-- STEP 2: FILTER OUT BAD JOBS
-- ============================================================================

-- Remove non-target cities
UPDATE jobs
SET status = 'inactive', filtered_reason = 'non_target_city', updated_at = now()
WHERE status = 'active'
  AND city NOT IN ('London', 'Manchester', 'Birmingham', 'Belfast', 'Dublin',
                   'Paris', 'Milan', 'Berlin', 'Madrid', 'Amsterdam',
                   'Munich', 'Hamburg', 'Zurich', 'Rome', 'Brussels')
  AND created_at > now() - interval '7 days';

-- Remove senior/manager roles
UPDATE jobs
SET status = 'inactive', filtered_reason = 'senior_level', updated_at = now()
WHERE status = 'active'
  AND (
    LOWER(title) LIKE '%senior %' OR LOWER(title) LIKE '% senior'
    OR LOWER(title) LIKE '%manager%' OR LOWER(title) LIKE '%director%'
    OR LOWER(title) LIKE '%head of%' OR LOWER(title) LIKE '% lead'
    OR LOWER(title) LIKE 'lead %'
  )
  AND created_at > now() - interval '7 days';

-- Remove non-business school jobs
UPDATE jobs
SET status = 'inactive', filtered_reason = 'non_business_school', updated_at = now()
WHERE status = 'active'
  AND (
    LOWER(title) LIKE ANY(ARRAY['%nurse%', '%doctor%', '%medical%', '%healthcare%', '%pflege%'])
    OR LOWER(title) LIKE ANY(ARRAY['%retail%', '%barista%', '%cashier%', '%warehouse%', '%driver%'])
    OR LOWER(title) LIKE ANY(ARRAY['%lawyer%', '%solicitor%', '%attorney%', '%legal counsel%'])
    OR LOWER(title) LIKE ANY(ARRAY['%teacher%', '%professor%', '%lecturer%', '%tutor%'])
    OR LOWER(title) LIKE ANY(ARRAY['%chef%', '%cook%', '%waiter%', '%bartender%'])
  )
  AND created_at > now() - interval '7 days';

-- ============================================================================
-- STEP 3: APPLY CAREER PATH CATEGORIES
-- ============================================================================

-- Reset categories for new jobs
UPDATE jobs
SET categories = ARRAY['early-career']
WHERE status = 'active'
  AND created_at > now() - interval '7 days';

-- Apply the 10 career path categories (IMPROVED PATTERNS)

-- 1. DATA & ANALYTICS (most specific first)
UPDATE jobs SET categories = categories || ARRAY['data-analytics']
WHERE status = 'active' AND created_at > now() - interval '7 days'
  AND LOWER(title) ~ '(business analyst|analyst|analyse|pricing|quantitative|quant|statistik|research assistant|daten|données|datos|reporting|data|analytics|business intelligence|bi |data science|data engineer|machine learning|ml |ai |artificial intelligence)';

-- 2. STRATEGY & BUSINESS DESIGN
UPDATE jobs SET categories = categories || ARRAY['strategy-business-design']
WHERE status = 'active' AND created_at > now() - interval '7 days'
  AND LOWER(title) ~ '(consultant|consulting|beratung|conseil|consulente|consultancy|strategy|strategie|stratégie|strategic|transformation|business development|biz dev|advisory|management consult|business design|change management|innovation consult)';

-- 3. FINANCE & INVESTMENT
UPDATE jobs SET categories = categories || ARRAY['finance-investment']
WHERE status = 'active' AND created_at > now() - interval '7 days'
  AND LOWER(title) ~ '(finance|financial|finanz|financier|finanziario|accountant|accounting|comptable|buchhalter|contabile|audit|treasury|tax|fiscal|steuer|trader|trading|portfolio|investment|banking|credit|credito|crédit|risk|compliance|m&a|capital markets|equity|underwriting|private equity|venture capital|asset management|wealth|actuarial)';

-- 4. TECH & TRANSFORMATION
UPDATE jobs SET categories = categories || ARRAY['tech-transformation']
WHERE status = 'active' AND created_at > now() - interval '7 days'
  AND LOWER(title) ~ '(developer|développeur|entwickler|sviluppatore|programador|software|tech|it|informatik|informatique|engineer|ingenieur|ingeniero|ingénieur|php|python|java|react|typescript|symfony|sap|dynamics|fullstack|backend|frontend|devops|sre|programmer|coding|digital transformation|cloud|cybersecurity|security|infrastructure|architect)';

-- 5. MARKETING & GROWTH
UPDATE jobs SET categories = categories || ARRAY['marketing-growth']
WHERE status = 'active' AND created_at > now() - interval '7 days'
  AND LOWER(title) ~ '(marketing|market|communication|kommunikation|comunicazione|brand|marke|marque|marca|growth|digital marketing|content|media|social|campaign|kampagne|campagne|campagna|influence|pr|public relations|pubblicità|seo|sem|performance marketing|demand gen)';

-- 6. SALES & CLIENT SUCCESS
UPDATE jobs SET categories = categories || ARRAY['sales-client-success']
WHERE status = 'active' AND created_at > now() - interval '7 days'
  AND LOWER(title) ~ '(sales|vente|verkauf|vendita|commercial|account|kunde|client|cliente|business development|customer success|relationship|account executive|bd |revenue|sdr|account manager)';

-- 7. OPERATIONS & SUPPLY CHAIN (includes HR/admin)
UPDATE jobs SET categories = categories || ARRAY['operations-supply-chain']
WHERE status = 'active' AND created_at > now() - interval '7 days'
  AND LOWER(title) ~ '(operations|betrieb|opérations|operazioni|supply chain|logistics|logistik|logistique|process|quality|qualität|qualité|back office|middle office|administration|admin|impiegato|employé|clerk|assistant|hr|human resources|people|talent|recruitment|recruiting|formation|training|ausbildung|formazione|personnel|personal|rh|risorse umane|procurement|sourcing|planning|inventory|warehouse|fulfillment|service management)';

-- 8. PRODUCT & INNOVATION
UPDATE jobs SET categories = categories || ARRAY['product-innovation']
WHERE status = 'active' AND created_at > now() - interval '7 days'
  AND LOWER(title) ~ '(product|produkt|produit|prodotto|innovation|r&d|research and development|product design|ux|ui|user experience|product manager|product owner|designer)';

-- 9. RETAIL & LUXURY
UPDATE jobs SET categories = categories || ARRAY['retail-luxury']
WHERE status = 'active' AND created_at > now() - interval '7 days'
  AND LOWER(title) ~ '(retail|luxury|fashion|beauty|merchandis|buyer|store|ecommerce|e-commerce)';

-- 10. SUSTAINABILITY & ESG
UPDATE jobs SET categories = categories || ARRAY['sustainability-esg']
WHERE status = 'active' AND created_at > now() - interval '7 days'
  AND LOWER(title) ~ '(sustainability|esg|environmental|social impact|green|climate|carbon|renewable|circular economy|csr|corporate social)';

-- Catch remaining generic graduate/trainee programs
UPDATE jobs SET categories = categories || ARRAY['strategy-business-design']
WHERE status = 'active' AND created_at > now() - interval '7 days'
  AND array_length(categories, 1) = 1
  AND LOWER(title) ~ '(graduate programme|grad program|traineeship|trainee|corporate|business|management programme|associate|junior|entry level)';

-- ============================================================================
-- STEP 4: ENRICH METADATA
-- ============================================================================

-- Set experience level
UPDATE jobs
SET experience_required = 'entry-level'
WHERE status = 'active'
  AND experience_required IS NULL
  AND created_at > now() - interval '7 days';

-- Infer languages from location
UPDATE jobs
SET language_requirements = CASE
  WHEN country = 'GB' AND (language_requirements IS NULL OR array_length(language_requirements, 1) = 0) THEN ARRAY['English']
  WHEN country = 'IE' AND (language_requirements IS NULL OR array_length(language_requirements, 1) = 0) THEN ARRAY['English']
  WHEN country = 'FR' AND (language_requirements IS NULL OR array_length(language_requirements, 1) = 0) THEN ARRAY['French', 'English']
  WHEN country = 'IT' AND (language_requirements IS NULL OR array_length(language_requirements, 1) = 0) THEN ARRAY['Italian', 'English']
  WHEN country = 'DE' AND (language_requirements IS NULL OR array_length(language_requirements, 1) = 0) THEN ARRAY['German', 'English']
  WHEN country = 'ES' AND (language_requirements IS NULL OR array_length(language_requirements, 1) = 0) THEN ARRAY['Spanish', 'English']
  WHEN country = 'NL' AND (language_requirements IS NULL OR array_length(language_requirements, 1) = 0) THEN ARRAY['English']
  WHEN country = 'CH' AND (language_requirements IS NULL OR array_length(language_requirements, 1) = 0) THEN ARRAY['English', 'German']
  WHEN country = 'BE' AND (language_requirements IS NULL OR array_length(language_requirements, 1) = 0) THEN ARRAY['English', 'French']
  ELSE language_requirements
END
WHERE status = 'active'
  AND created_at > now() - interval '7 days';

-- ============================================================================
-- STEP 5: STATISTICS & REPORT
-- ============================================================================

SELECT '========================================' as divider;
SELECT 'POST-SCRAPE MAINTENANCE COMPLETE!' as status;

-- New jobs summary
SELECT
  COUNT(*) as new_jobs_processed,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as kept_active,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as filtered_out,
  ROUND(100.0 * COUNT(CASE WHEN status = 'active' THEN 1 END) / NULLIF(COUNT(*), 0), 1) || '%' as keep_rate
FROM jobs
WHERE created_at > now() - interval '24 hours';

-- New jobs by city
SELECT
  city,
  COUNT(*) as new_jobs
FROM jobs
WHERE status = 'active'
  AND created_at > now() - interval '24 hours'
GROUP BY city
ORDER BY new_jobs DESC;

-- New jobs by career path
SELECT 
  category as career_path,
  COUNT(*) as new_jobs
FROM (
  SELECT UNNEST(categories) as category
  FROM jobs
  WHERE status = 'active'
    AND created_at > now() - interval '24 hours'
) sub
WHERE category != 'early-career'
GROUP BY category
ORDER BY new_jobs DESC;

-- Overall database health
SELECT
  COUNT(*) as total_active_jobs,
  COUNT(CASE WHEN array_length(categories, 1) >= 2 THEN 1 END) as categorized,
  COUNT(CASE WHEN city IS NOT NULL THEN 1 END) as has_city,
  COUNT(CASE WHEN country IS NOT NULL THEN 1 END) as has_country,
  ROUND(100.0 * COUNT(CASE WHEN array_length(categories, 1) >= 2 THEN 1 END) / COUNT(*), 1) || '%' as pct_categorized
FROM jobs
WHERE status = 'active';

COMMIT;

-- ============================================================================
-- END - Database maintained at production quality level
-- ============================================================================

