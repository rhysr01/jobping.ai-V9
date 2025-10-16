-- ============================================================================
-- IMPROVE CAREER PATH CATEGORIZATION
-- ============================================================================
-- Adds more comprehensive patterns to catch analyst, consultant, and other roles
-- Target: Get categorization from 59.5% to 85%+
-- ============================================================================

BEGIN;

SELECT 'IMPROVING CAREER PATH CATEGORIZATION...' as status;

-- ============================================================================
-- 1. DATA & ANALYTICS - Expanded
-- ============================================================================

UPDATE jobs
SET categories = array_cat(categories, ARRAY['data-analytics'])
WHERE status = 'active'
  AND NOT ('data-analytics' = ANY(categories))
  AND (
    LOWER(title) ~ '(business analyst|analyst|analyse|pricing|quantitative|quant|statistik|research assistant)'
    OR LOWER(title) ~ '(daten|données|datos|reporting)'
  );

-- ============================================================================
-- 2. STRATEGY & BUSINESS DESIGN - Expanded
-- ============================================================================

UPDATE jobs
SET categories = array_cat(categories, ARRAY['strategy-business-design'])
WHERE status = 'active'
  AND NOT ('strategy-business-design' = ANY(categories))
  AND (
    LOWER(title) ~ '(consultant|consulting|beratung|conseil|consulente|consultancy)'
    OR LOWER(title) ~ '(strategy|strategie|stratégie|strategic|transformation)'
    OR LOWER(title) ~ '(business development|biz dev|advisory)'
  );

-- ============================================================================
-- 3. FINANCE & INVESTMENT - Expanded
-- ============================================================================

UPDATE jobs
SET categories = array_cat(categories, ARRAY['finance-investment'])
WHERE status = 'active'
  AND NOT ('finance-investment' = ANY(categories))
  AND (
    LOWER(title) ~ '(finance|financial|finanz|financier|finanziario)'
    OR LOWER(title) ~ '(accountant|accounting|comptable|buchhalter|contabile)'
    OR LOWER(title) ~ '(audit|treasury|tax|fiscal|steuer)'
    OR LOWER(title) ~ '(trader|trading|portfolio|investment|banking)'
    OR LOWER(title) ~ '(credit|credito|crédit|risk|compliance)'
    OR LOWER(title) ~ '(m&a|capital markets|wealth|asset management)'
  );

-- ============================================================================
-- 4. TECH & TRANSFORMATION - Expanded
-- ============================================================================

UPDATE jobs
SET categories = array_cat(categories, ARRAY['tech-transformation'])
WHERE status = 'active'
  AND NOT ('tech-transformation' = ANY(categories))
  AND (
    LOWER(title) ~ '(developer|développeur|entwickler|sviluppatore|programador)'
    OR LOWER(title) ~ '(software|tech|it|informatik|informatique)'
    OR LOWER(title) ~ '(engineer|ingenieur|ingeniero|ingénieur)'
    OR LOWER(title) ~ '(php|python|java|react|typescript|symfony|sap|dynamics)'
    OR LOWER(title) ~ '(fullstack|backend|frontend|devops)'
    OR LOWER(title) ~ '(digital|cyber|cloud|infrastructure)'
  );

-- ============================================================================
-- 5. OPERATIONS & SUPPLY CHAIN - Expanded
-- ============================================================================

UPDATE jobs
SET categories = array_cat(categories, ARRAY['operations-supply-chain'])
WHERE status = 'active'
  AND NOT ('operations-supply-chain' = ANY(categories))
  AND (
    LOWER(title) ~ '(operations|betrieb|opérations|operazioni)'
    OR LOWER(title) ~ '(supply chain|logistics|logistik|logistique)'
    OR LOWER(title) ~ '(process|quality|qualität|qualité)'
    OR LOWER(title) ~ '(back office|middle office|administration|admin)'
    OR LOWER(title) ~ '(impiegato|employé|clerk|assistant)'
  );

-- ============================================================================
-- 6. SALES & CLIENT SUCCESS - Expanded
-- ============================================================================

UPDATE jobs
SET categories = array_cat(categories, ARRAY['sales-client-success'])
WHERE status = 'active'
  AND NOT ('sales-client-success' = ANY(categories))
  AND (
    LOWER(title) ~ '(sales|vente|verkauf|vendita|commercial)'
    OR LOWER(title) ~ '(account|kunde|client|cliente)'
    OR LOWER(title) ~ '(business development|customer success|relationship)'
  );

-- ============================================================================
-- 7. MARKETING & GROWTH - Expanded
-- ============================================================================

UPDATE jobs
SET categories = array_cat(categories, ARRAY['marketing-growth'])
WHERE status = 'active'
  AND NOT ('marketing-growth' = ANY(categories))
  AND (
    LOWER(title) ~ '(marketing|market|communication|kommunikation|comunicazione)'
    OR LOWER(title) ~ '(brand|marke|marque|marca)'
    OR LOWER(title) ~ '(digital marketing|content|media|social)'
    OR LOWER(title) ~ '(campaign|kampagne|campagne|campagna)'
    OR LOWER(title) ~ '(influence|pr|public relations|pubblicità)'
  );

-- ============================================================================
-- 8. PRODUCT & INNOVATION - Expanded
-- ============================================================================

UPDATE jobs
SET categories = array_cat(categories, ARRAY['product-innovation'])
WHERE status = 'active'
  AND NOT ('product-innovation' = ANY(categories))
  AND (
    LOWER(title) ~ '(product|produkt|produit|prodotto)'
    OR LOWER(title) ~ '(innovation|r&d|research|development)'
    OR LOWER(title) ~ '(ux|ui|design|designer)'
  );

-- ============================================================================
-- 9. HR & PEOPLE (maps to Operations & Supply Chain)
-- ============================================================================

UPDATE jobs
SET categories = array_cat(categories, ARRAY['operations-supply-chain'])
WHERE status = 'active'
  AND NOT ('operations-supply-chain' = ANY(categories))
  AND (
    LOWER(title) ~ '(hr|human resources|people|talent|recruitment|recruiting)'
    OR LOWER(title) ~ '(formation|training|ausbildung|formazione)'
    OR LOWER(title) ~ '(personnel|personal|rh|risorse umane)'
  );

-- ============================================================================
-- 10. GENERAL BUSINESS (catch internships/grads without specific function)
-- ============================================================================

-- For generic internship/stage/praktikum titles, try to infer from company or assign to strategy
UPDATE jobs
SET categories = array_cat(categories, ARRAY['strategy-business-design'])
WHERE status = 'active'
  AND array_length(categories, 1) = 1
  AND categories = ARRAY['early-career']
  AND (
    LOWER(title) ~ '(graduate programme|grad program|traineeship|trainee)'
    OR LOWER(title) ~ '(corporate|business|management programme)'
    OR LOWER(title) ~ '(associate|junior|entry level)'
  );

-- For remaining generic internships in specific departments, categorize by department
UPDATE jobs
SET categories = array_cat(categories, ARRAY['finance-investment'])
WHERE status = 'active'
  AND array_length(categories, 1) = 1
  AND (LOWER(title) ~ '(stage.*finanz|internship.*financ|praktikum.*finanz)');

UPDATE jobs
SET categories = array_cat(categories, ARRAY['marketing-growth'])
WHERE status = 'active'
  AND array_length(categories, 1) = 1
  AND (LOWER(title) ~ '(stage.*communication|internship.*marketing|praktikum.*marketing)');

-- ============================================================================
-- STATISTICS
-- ============================================================================

SELECT '========================================' as divider;
SELECT 'CATEGORIZATION IMPROVED!' as status;

-- Before/After comparison
SELECT
  COUNT(*) as total_active_jobs,
  COUNT(CASE WHEN array_length(categories, 1) >= 2 THEN 1 END) as has_career_path,
  COUNT(CASE WHEN array_length(categories, 1) = 1 THEN 1 END) as only_early_career,
  ROUND(100.0 * COUNT(CASE WHEN array_length(categories, 1) >= 2 THEN 1 END) / COUNT(*), 1) || '%' as pct_categorized
FROM jobs
WHERE status = 'active';

-- Updated career path distribution
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

-- Sample of remaining uncategorized jobs
SELECT 
  'Remaining uncategorized jobs:' as note,
  COUNT(*) as count
FROM jobs
WHERE status = 'active'
  AND array_length(categories, 1) = 1;

COMMIT;

-- ============================================================================
-- END - Career path categorization significantly improved
-- ============================================================================

