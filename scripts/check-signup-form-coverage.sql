-- ============================================================================
-- JOB COVERAGE ANALYSIS FOR ACTUAL SIGNUP FORM CITIES & CAREER PATHS
-- ============================================================================
-- This query checks coverage for the ACTUAL cities and career paths in signup form
-- Cities: Dublin, London, Paris, Amsterdam, Manchester, Birmingham, Madrid, 
--         Barcelona, Berlin, Hamburg, Munich, Zurich, Milan, Rome
-- Career Paths: strategy, finance, sales, marketing, data, operations, 
--               product, tech, sustainability
-- ============================================================================

-- ============================================================================
-- 1. CITY COVERAGE ANALYSIS
-- ============================================================================
WITH signup_cities AS (
  SELECT unnest(ARRAY[
    'Dublin', 'London', 'Paris', 'Amsterdam', 'Manchester', 'Birmingham', 
    'Madrid', 'Barcelona', 'Berlin', 'Hamburg', 'Munich', 'Zurich', 'Milan', 'Rome'
  ]) as city
)
SELECT 
  sc.city,
  COALESCE(COUNT(j.id), 0) as total_jobs,
  COALESCE(COUNT(j.id) FILTER (WHERE j.is_graduate = true), 0) as graduate_jobs,
  COALESCE(COUNT(j.id) FILTER (WHERE j.is_internship = true), 0) as internship_jobs,
  COALESCE(COUNT(j.id) FILTER (WHERE 'early-career' = ANY(j.categories)), 0) as early_career_jobs,
  CASE 
    WHEN COALESCE(COUNT(j.id), 0) = 0 THEN '❌ NO JOBS'
    WHEN COALESCE(COUNT(j.id), 0) < 50 THEN '⚠️ LOW (<50)'
    WHEN COALESCE(COUNT(j.id), 0) < 200 THEN '🟡 MEDIUM (50-200)'
    ELSE '✅ GOOD (200+)'
  END as status
FROM signup_cities sc
LEFT JOIN jobs j ON LOWER(TRIM(j.city)) = LOWER(TRIM(sc.city)) 
  AND j.is_active = true 
  AND j.status = 'active'
GROUP BY sc.city
ORDER BY total_jobs ASC;

-- ============================================================================
-- 2. CAREER PATH COVERAGE ANALYSIS
-- ============================================================================
WITH signup_career_paths AS (
  SELECT unnest(ARRAY['strategy', 'finance', 'sales', 'marketing', 'data', 'operations', 'product', 'tech', 'sustainability']) as career_path
),
job_career_mapping AS (
  SELECT 
    id,
    city,
    title,
    categories,
    CASE 
      WHEN categories && ARRAY['strategy', 'strategy-business-design', 'strategy-consulting'] OR
           title ILIKE '%strategy%' OR (title ILIKE '%consultant%' AND title ILIKE '%strategy%') THEN 'strategy'
      WHEN categories && ARRAY['finance', 'finance-investment', 'finance-banking'] OR
           title ILIKE '%finance%' OR title ILIKE '%financial%' OR title ILIKE '%investment%' OR title ILIKE '%banking%' THEN 'finance'
      WHEN categories && ARRAY['sales', 'sales-development', 'sales-business-development'] OR
           title ILIKE '%sales%' OR title ILIKE '%SDR%' OR title ILIKE '%BDR%' OR title ILIKE '%business development%' THEN 'sales'
      WHEN categories && ARRAY['marketing', 'marketing-digital', 'marketing-growth'] OR
           title ILIKE '%marketing%' OR title ILIKE '%growth%' OR title ILIKE '%digital marketing%' THEN 'marketing'
      WHEN categories && ARRAY['data', 'data-analytics', 'data-science'] OR
           title ILIKE '%data%' AND (title ILIKE '%analyst%' OR title ILIKE '%scientist%' OR title ILIKE '%engineer%') THEN 'data'
      WHEN categories && ARRAY['operations', 'operations-supply-chain', 'operations-logistics'] OR
           title ILIKE '%operations%' OR title ILIKE '%supply chain%' OR title ILIKE '%logistics%' THEN 'operations'
      WHEN categories && ARRAY['product', 'product-management', 'product-design'] OR
           title ILIKE '%product%' AND (title ILIKE '%manager%' OR title ILIKE '%analyst%' OR title ILIKE '%designer%') THEN 'product'
      WHEN categories && ARRAY['tech', 'tech-software', 'tech-devops'] OR
           title ILIKE '%software%' OR title ILIKE '%developer%' OR (title ILIKE '%engineer%' AND title ILIKE '%software%') THEN 'tech'
      WHEN categories && ARRAY['esg', 'esg-sustainability', 'esg-impact'] OR
           title ILIKE '%ESG%' OR title ILIKE '%sustainability%' OR title ILIKE '%environmental%' THEN 'sustainability'
    END as inferred_career
  FROM jobs
  WHERE is_active = true 
    AND status = 'active' 
    AND 'early-career' = ANY(categories)
)
SELECT 
  scp.career_path,
  COALESCE(COUNT(jcm.id), 0) as job_count,
  COUNT(DISTINCT jcm.city) FILTER (
    WHERE jcm.city IN ('Dublin', 'London', 'Paris', 'Amsterdam', 'Manchester', 'Birmingham', 
                       'Madrid', 'Barcelona', 'Berlin', 'Hamburg', 'Munich', 'Zurich', 'Milan', 'Rome')
  ) as cities_with_jobs,
  CASE 
    WHEN COALESCE(COUNT(jcm.id), 0) = 0 THEN '❌ NO JOBS'
    WHEN COALESCE(COUNT(jcm.id), 0) < 100 THEN '⚠️ LOW (<100)'
    WHEN COALESCE(COUNT(jcm.id), 0) < 500 THEN '🟡 MEDIUM (100-500)'
    ELSE '✅ GOOD (500+)'
  END as status
FROM signup_career_paths scp
LEFT JOIN job_career_mapping jcm ON jcm.inferred_career = scp.career_path
GROUP BY scp.career_path
ORDER BY job_count ASC;

-- ============================================================================
-- 3. MISSING CITY + CAREER PATH COMBINATIONS
-- ============================================================================
WITH signup_cities AS (
  SELECT unnest(ARRAY['Dublin', 'London', 'Paris', 'Amsterdam', 'Manchester', 'Birmingham', 
                      'Madrid', 'Barcelona', 'Berlin', 'Hamburg', 'Munich', 'Zurich', 'Milan', 'Rome']) as city
),
signup_careers AS (
  SELECT unnest(ARRAY['strategy', 'finance', 'sales', 'marketing', 'data', 'operations', 'product', 'tech', 'sustainability']) as career_path
),
job_mapping AS (
  SELECT DISTINCT
    city,
    CASE 
      WHEN categories && ARRAY['strategy', 'strategy-business-design'] OR title ILIKE '%strategy%' THEN 'strategy'
      WHEN categories && ARRAY['finance', 'finance-investment'] OR title ILIKE '%finance%' OR title ILIKE '%financial%' OR title ILIKE '%investment%' THEN 'finance'
      WHEN categories && ARRAY['sales', 'sales-development'] OR title ILIKE '%sales%' OR title ILIKE '%SDR%' OR title ILIKE '%BDR%' THEN 'sales'
      WHEN categories && ARRAY['marketing', 'marketing-digital'] OR title ILIKE '%marketing%' OR title ILIKE '%growth%' THEN 'marketing'
      WHEN categories && ARRAY['data', 'data-analytics'] OR (title ILIKE '%data%' AND title ILIKE '%analyst%') THEN 'data'
      WHEN categories && ARRAY['operations', 'operations-supply-chain'] OR title ILIKE '%operations%' OR title ILIKE '%supply chain%' THEN 'operations'
      WHEN categories && ARRAY['product', 'product-management'] OR (title ILIKE '%product%' AND title ILIKE '%manager%') THEN 'product'
      WHEN categories && ARRAY['tech', 'tech-software'] OR title ILIKE '%software%' OR title ILIKE '%developer%' THEN 'tech'
      WHEN categories && ARRAY['esg', 'esg-sustainability'] OR title ILIKE '%ESG%' OR title ILIKE '%sustainability%' THEN 'sustainability'
    END as career
  FROM jobs
  WHERE is_active = true 
    AND status = 'active'
    AND 'early-career' = ANY(categories)
    AND city IS NOT NULL
    AND city IN ('Dublin', 'London', 'Paris', 'Amsterdam', 'Manchester', 'Birmingham', 
                 'Madrid', 'Barcelona', 'Berlin', 'Hamburg', 'Munich', 'Zurich', 'Milan', 'Rome')
)
SELECT 
  sc.city,
  scr.career_path,
  CASE WHEN jm.career IS NOT NULL THEN '✅ HAS JOBS' ELSE '❌ MISSING' END as status
FROM signup_cities sc
CROSS JOIN signup_careers scr
LEFT JOIN job_mapping jm ON LOWER(TRIM(jm.city)) = LOWER(TRIM(sc.city)) AND jm.career = scr.career_path
WHERE jm.career IS NULL
ORDER BY sc.city, scr.career_path;

-- ============================================================================
-- 4. SUMMARY: CRITICAL GAPS
-- ============================================================================
SELECT 
  'CRITICAL GAPS SUMMARY' as summary_type,
  COUNT(*) FILTER (WHERE city = 'Barcelona') as barcelona_missing_all_careers,
  COUNT(*) FILTER (WHERE career_path = 'product') as product_missing_all_cities,
  COUNT(*) FILTER (WHERE career_path = 'sustainability') as sustainability_missing_cities,
  COUNT(*) as total_missing_combinations
FROM (
  WITH signup_cities AS (
    SELECT unnest(ARRAY['Dublin', 'London', 'Paris', 'Amsterdam', 'Manchester', 'Birmingham', 
                        'Madrid', 'Barcelona', 'Berlin', 'Hamburg', 'Munich', 'Zurich', 'Milan', 'Rome']) as city
  ),
  signup_careers AS (
    SELECT unnest(ARRAY['strategy', 'finance', 'sales', 'marketing', 'data', 'operations', 'product', 'tech', 'sustainability']) as career_path
  ),
  job_mapping AS (
    SELECT DISTINCT
      city,
      CASE 
        WHEN categories && ARRAY['strategy', 'strategy-business-design'] OR title ILIKE '%strategy%' THEN 'strategy'
        WHEN categories && ARRAY['finance', 'finance-investment'] OR title ILIKE '%finance%' OR title ILIKE '%financial%' OR title ILIKE '%investment%' THEN 'finance'
        WHEN categories && ARRAY['sales', 'sales-development'] OR title ILIKE '%sales%' OR title ILIKE '%SDR%' OR title ILIKE '%BDR%' THEN 'sales'
        WHEN categories && ARRAY['marketing', 'marketing-digital'] OR title ILIKE '%marketing%' OR title ILIKE '%growth%' THEN 'marketing'
        WHEN categories && ARRAY['data', 'data-analytics'] OR (title ILIKE '%data%' AND title ILIKE '%analyst%') THEN 'data'
        WHEN categories && ARRAY['operations', 'operations-supply-chain'] OR title ILIKE '%operations%' OR title ILIKE '%supply chain%' THEN 'operations'
        WHEN categories && ARRAY['product', 'product-management'] OR (title ILIKE '%product%' AND title ILIKE '%manager%') THEN 'product'
        WHEN categories && ARRAY['tech', 'tech-software'] OR title ILIKE '%software%' OR title ILIKE '%developer%' THEN 'tech'
        WHEN categories && ARRAY['esg', 'esg-sustainability'] OR title ILIKE '%ESG%' OR title ILIKE '%sustainability%' THEN 'sustainability'
      END as career
    FROM jobs
    WHERE is_active = true 
      AND status = 'active'
      AND 'early-career' = ANY(categories)
      AND city IS NOT NULL
      AND city IN ('Dublin', 'London', 'Paris', 'Amsterdam', 'Manchester', 'Birmingham', 
                   'Madrid', 'Barcelona', 'Berlin', 'Hamburg', 'Munich', 'Zurich', 'Milan', 'Rome')
  )
  SELECT sc.city, scr.career_path
  FROM signup_cities sc
  CROSS JOIN signup_careers scr
  LEFT JOIN job_mapping jm ON LOWER(TRIM(jm.city)) = LOWER(TRIM(sc.city)) AND jm.career = scr.career_path
  WHERE jm.career IS NULL
) missing_combos;

