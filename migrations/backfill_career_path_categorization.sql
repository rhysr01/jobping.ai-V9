-- ============================================================================
-- BACKFILL CATEGORIZATION FOR JOBS MISSING CAREER PATHS
-- ============================================================================
-- This script runs the categorization logic on existing jobs that are missing
-- career path categories. Uses the same logic as the cohesive trigger.
-- ============================================================================

-- Step 1: Update jobs missing career paths using trigger logic
UPDATE jobs
SET
  categories = CASE
    -- Strategy & Business Design
    WHEN LOWER(title) LIKE '%business analyst%' OR
         LOWER(title) LIKE '%associate consultant%' OR
         LOWER(title) LIKE '%junior consultant%' OR
         LOWER(title) LIKE '%strategy analyst%' OR
         LOWER(title) LIKE '%consulting intern%' OR
         LOWER(title) LIKE '%junior business analyst%' OR
         LOWER(title) LIKE '%transformation analyst%' OR
         LOWER(title) LIKE '%management consulting%' OR
         LOWER(title) LIKE '%growth consultant%' OR
         LOWER(title) LIKE '%business analyst trainee%' OR
         LOWER(title) LIKE '%junior associate%' OR
         LOWER(title) LIKE '%strategy consultant%' OR
         LOWER(title) LIKE '%digital transformation%' OR
         LOWER(title) LIKE '%operations excellence%' OR
         LOWER(title) LIKE '%business strategy%' OR
         (LOWER(title) LIKE '%strategy%' AND (LOWER(title) LIKE '%analyst%' OR LOWER(title) LIKE '%consultant%' OR LOWER(title) LIKE '%associate%')) OR
         LOWER(title) LIKE '%consultant%' OR
         LOWER(title) LIKE '%consulting%' OR
         LOWER(title) LIKE '%advisory%' OR
         LOWER(description) LIKE '%strategy consulting%' OR
         LOWER(description) LIKE '%management consulting%' OR
         LOWER(description) LIKE '%advisory%' OR
         LOWER(description) LIKE '%business transformation%' OR
         LOWER(company) LIKE '%consulting%' OR
         LOWER(company) LIKE '%deloitte%' OR
         LOWER(company) LIKE '%pwc%' OR
         LOWER(company) LIKE '%mckinsey%' OR
         LOWER(company) LIKE '%bain%' OR
         LOWER(company) LIKE '%bcg%' OR
         LOWER(company) LIKE '%accenture%' OR
         LOWER(company) LIKE '%oliver wyman%' OR
         LOWER(company) LIKE '%kearney%' THEN
      array_append(COALESCE(categories, ARRAY[]::TEXT[]), 'strategy-business-design')
    
    -- Finance & Investment
    WHEN LOWER(title) LIKE '%financial analyst%' OR
         LOWER(title) LIKE '%finance intern%' OR
         LOWER(title) LIKE '%investment banking analyst%' OR
         LOWER(title) LIKE '%risk analyst%' OR
         LOWER(title) LIKE '%audit associate%' OR
         LOWER(title) LIKE '%finance trainee%' OR
         LOWER(title) LIKE '%fp&a%' OR
         LOWER(title) LIKE '%fpa%' OR
         LOWER(title) LIKE '%credit analyst%' OR
         LOWER(title) LIKE '%investment analyst%' OR
         LOWER(title) LIKE '%junior accountant%' OR
         LOWER(title) LIKE '%corporate finance%' OR
         LOWER(title) LIKE '%m&a analyst%' OR
         LOWER(title) LIKE '%mergers acquisitions%' OR
         LOWER(title) LIKE '%treasury analyst%' OR
         LOWER(title) LIKE '%junior tax%' OR
         LOWER(title) LIKE '%finance graduate%' OR
         LOWER(title) LIKE '%finance%' OR
         LOWER(title) LIKE '%financial%' OR
         LOWER(title) LIKE '%investment%' OR
         LOWER(title) LIKE '%banking%' OR
         LOWER(title) LIKE '%equity research%' OR
         LOWER(title) LIKE '%portfolio%' OR
         (LOWER(title) LIKE '%analyst%' AND (LOWER(description) LIKE '%finance%' OR LOWER(description) LIKE '%banking%' OR LOWER(description) LIKE '%investment%')) OR
         LOWER(description) LIKE '%investment banking%' OR
         LOWER(description) LIKE '%corporate finance%' OR
         LOWER(description) LIKE '%trading%' OR
         LOWER(description) LIKE '%equity%' OR
         LOWER(description) LIKE '%m&a%' OR
         LOWER(description) LIKE '%mergers acquisitions%' OR
         LOWER(company) LIKE '%bank%' OR
         LOWER(company) LIKE '%finance%' OR
         LOWER(company) LIKE '%investment%' OR
         LOWER(company) LIKE '%goldman%' OR
         LOWER(company) LIKE '%morgan stanley%' OR
         LOWER(company) LIKE '%jpmorgan%' OR
         LOWER(company) LIKE '%barclays%' OR
         LOWER(company) LIKE '%deutsche bank%' OR
         LOWER(company) LIKE '%ubs%' OR
         LOWER(company) LIKE '%credit suisse%' OR
         LOWER(title) LIKE '%claims handler%' OR
         LOWER(title) LIKE '%cashier%' OR
         LOWER(title) LIKE '%underwriter%' THEN
      array_append(COALESCE(categories, ARRAY[]::TEXT[]), 'finance-investment')
    
    -- Sales & Client Success
    WHEN LOWER(title) LIKE '%sales development representative%' OR
         LOWER(title) LIKE '%sdr%' OR
         LOWER(title) LIKE '%business development representative%' OR
         LOWER(title) LIKE '%bdr%' OR
         LOWER(title) LIKE '%inside sales%' OR
         LOWER(title) LIKE '%account executive%' OR
         LOWER(title) LIKE '%business development associate%' OR
         LOWER(title) LIKE '%sales trainee%' OR
         LOWER(title) LIKE '%customer success%' OR
         LOWER(title) LIKE '%client success%' OR
         LOWER(title) LIKE '%revenue operations%' OR
         LOWER(title) LIKE '%sales operations%' OR
         LOWER(title) LIKE '%graduate sales%' OR
         LOWER(title) LIKE '%business development intern%' OR
         LOWER(title) LIKE '%channel sales%' OR
         LOWER(title) LIKE '%account development%' OR
         LOWER(title) LIKE '%junior sales%' OR
         LOWER(title) LIKE '%sales%' OR
         LOWER(title) LIKE '%business development%' OR
         LOWER(title) LIKE '%account manager%' OR
         LOWER(title) LIKE '%relationship manager%' OR
         LOWER(description) LIKE '%sales%' OR
         LOWER(description) LIKE '%business development%' OR
         LOWER(description) LIKE '%client acquisition%' OR
         LOWER(description) LIKE '%revenue generation%' OR
         LOWER(company) LIKE '%salesforce%' OR
         LOWER(company) LIKE '%hubspot%' OR
         LOWER(company) LIKE '%sales%' THEN
      array_append(COALESCE(categories, ARRAY[]::TEXT[]), 'sales-client-success')
    
    -- Marketing & Growth
    WHEN LOWER(title) LIKE '%marketing intern%' OR
         LOWER(title) LIKE '%social media intern%' OR
         LOWER(title) LIKE '%digital marketing%' OR
         LOWER(title) LIKE '%marketing coordinator%' OR
         LOWER(title) LIKE '%growth marketing%' OR
         LOWER(title) LIKE '%content marketing%' OR
         LOWER(title) LIKE '%brand assistant%' OR
         LOWER(title) LIKE '%marketing assistant%' OR
         LOWER(title) LIKE '%junior marketing%' OR
         LOWER(title) LIKE '%email marketing%' OR
         LOWER(title) LIKE '%seo%' OR
         LOWER(title) LIKE '%sem%' OR
         LOWER(title) LIKE '%trade marketing%' OR
         LOWER(title) LIKE '%marketing graduate%' OR
         LOWER(title) LIKE '%marketing campaign%' OR
         LOWER(title) LIKE '%marketing%' OR
         LOWER(title) LIKE '%growth%' OR
         LOWER(title) LIKE '%social media%' OR
         LOWER(title) LIKE '%content%' OR
         LOWER(title) LIKE '%brand%' OR
         LOWER(title) LIKE '%communications%' OR
         LOWER(description) LIKE '%marketing%' OR
         LOWER(description) LIKE '%brand%' OR
         LOWER(description) LIKE '%campaign%' OR
         LOWER(description) LIKE '%digital marketing%' OR
         LOWER(description) LIKE '%social media%' OR
         LOWER(description) LIKE '%content creation%' OR
         LOWER(company) LIKE '%marketing%' OR
         LOWER(company) LIKE '%advertising%' OR
         LOWER(company) LIKE '%media%' THEN
      array_append(COALESCE(categories, ARRAY[]::TEXT[]), 'marketing-growth')
    
    -- Data & Analytics
    WHEN LOWER(title) LIKE '%data analyst%' OR
         LOWER(title) LIKE '%junior data analyst%' OR
         LOWER(title) LIKE '%analytics intern%' OR
         LOWER(title) LIKE '%business intelligence%' OR
         LOWER(title) LIKE '%bi intern%' OR
         LOWER(title) LIKE '%data analyst trainee%' OR
         LOWER(title) LIKE '%junior data scientist%' OR
         LOWER(title) LIKE '%data science trainee%' OR
         LOWER(title) LIKE '%junior data engineer%' OR
         LOWER(title) LIKE '%bi engineer%' OR
         LOWER(title) LIKE '%analytics associate%' OR
         LOWER(title) LIKE '%data analytics graduate%' OR
         LOWER(title) LIKE '%insights analyst%' OR
         LOWER(title) LIKE '%junior bi developer%' OR
         LOWER(title) LIKE '%data assistant%' OR
         LOWER(title) LIKE '%research analytics%' OR
         (LOWER(title) LIKE '%data%' AND (LOWER(title) LIKE '%analyst%' OR LOWER(title) LIKE '%scientist%' OR LOWER(title) LIKE '%engineer%')) OR
         LOWER(title) LIKE '%analytics%' OR
         LOWER(title) LIKE '%business intelligence%' OR
         LOWER(title) LIKE '%data scientist%' OR
         LOWER(title) LIKE '%data engineer%' OR
         LOWER(title) LIKE '%pricing analyst%' OR
         LOWER(title) LIKE '%research analyst%' OR
         LOWER(description) LIKE '%data analysis%' OR
         LOWER(description) LIKE '%sql%' OR
         LOWER(description) LIKE '%python%' OR
         LOWER(description) LIKE '%r programming%' OR
         LOWER(description) LIKE '%tableau%' OR
         LOWER(description) LIKE '%powerbi%' OR
         LOWER(description) LIKE '%power bi%' OR
         LOWER(description) LIKE '%data visualization%' OR
         LOWER(description) LIKE '%machine learning%' THEN
      array_append(COALESCE(categories, ARRAY[]::TEXT[]), 'data-analytics')
    
    -- Operations & Supply Chain
    WHEN LOWER(title) LIKE '%operations analyst%' OR
         LOWER(title) LIKE '%supply chain analyst%' OR
         LOWER(title) LIKE '%logistics analyst%' OR
         LOWER(title) LIKE '%procurement analyst%' OR
         LOWER(title) LIKE '%operations intern%' OR
         LOWER(title) LIKE '%inventory planner%' OR
         LOWER(title) LIKE '%operations coordinator%' OR
         LOWER(title) LIKE '%supply chain trainee%' OR
         LOWER(title) LIKE '%logistics planning%' OR
         LOWER(title) LIKE '%demand planning%' OR
         LOWER(title) LIKE '%operations management%' OR
         LOWER(title) LIKE '%fulfilment specialist%' OR
         LOWER(title) LIKE '%sourcing analyst%' OR
         LOWER(title) LIKE '%process improvement%' OR
         LOWER(title) LIKE '%supply chain graduate%' OR
         LOWER(title) LIKE '%operations%' OR
         LOWER(title) LIKE '%supply chain%' OR
         LOWER(title) LIKE '%logistics%' OR
         LOWER(title) LIKE '%procurement%' OR
         LOWER(title) LIKE '%sourcing%' OR
         LOWER(title) LIKE '%inventory%' OR
         LOWER(title) LIKE '%demand planning%' OR
         LOWER(title) LIKE '%hr%' OR
         LOWER(title) LIKE '%human resources%' OR
         LOWER(title) LIKE '%talent%' OR
         LOWER(title) LIKE '%recruitment%' OR
         LOWER(title) LIKE '%cost manager%' OR
         LOWER(title) LIKE '%property manager%' OR
         LOWER(description) LIKE '%operations%' OR
         LOWER(description) LIKE '%supply chain%' OR
         LOWER(description) LIKE '%logistics%' OR
         LOWER(description) LIKE '%procurement%' OR
         LOWER(description) LIKE '%process improvement%' OR
         LOWER(description) LIKE '%lean%' OR
         LOWER(description) LIKE '%six sigma%' THEN
      array_append(COALESCE(categories, ARRAY[]::TEXT[]), 'operations-supply-chain')
    
    -- Product & Innovation
    WHEN LOWER(title) LIKE '%associate product manager%' OR
         LOWER(title) LIKE '%apm%' OR
         LOWER(title) LIKE '%product analyst%' OR
         LOWER(title) LIKE '%product management intern%' OR
         LOWER(title) LIKE '%junior product manager%' OR
         LOWER(title) LIKE '%product operations%' OR
         LOWER(title) LIKE '%product designer%' OR
         LOWER(title) LIKE '%ux intern%' OR
         LOWER(title) LIKE '%product research%' OR
         LOWER(title) LIKE '%innovation analyst%' OR
         LOWER(title) LIKE '%product development%' OR
         LOWER(title) LIKE '%product marketing%' OR
         LOWER(title) LIKE '%product owner%' OR
         LOWER(title) LIKE '%assistant product manager%' OR
         LOWER(title) LIKE '%product strategy%' OR
         LOWER(title) LIKE '%technical product%' OR
         (LOWER(title) LIKE '%product%' AND (LOWER(title) LIKE '%manager%' OR LOWER(title) LIKE '%analyst%' OR LOWER(title) LIKE '%designer%' OR LOWER(title) LIKE '%owner%')) OR
         LOWER(title) LIKE '%ux%' OR
         LOWER(title) LIKE '%ui%' OR
         LOWER(title) LIKE '%designer%' OR
         LOWER(title) LIKE '%user experience%' OR
         LOWER(title) LIKE '%user interface%' OR
         LOWER(description) LIKE '%product management%' OR
         LOWER(description) LIKE '%product development%' OR
         LOWER(description) LIKE '%user experience%' OR
         LOWER(description) LIKE '%innovation%' OR
         LOWER(description) LIKE '%user research%' OR
         LOWER(description) LIKE '%design thinking%' THEN
      array_append(COALESCE(categories, ARRAY[]::TEXT[]), 'product-innovation')
    
    -- Tech & Engineering
    WHEN LOWER(title) LIKE '%software engineer intern%' OR
         LOWER(title) LIKE '%cloud engineer intern%' OR
         LOWER(title) LIKE '%devops engineer intern%' OR
         LOWER(title) LIKE '%data engineer intern%' OR
         LOWER(title) LIKE '%systems analyst%' OR
         LOWER(title) LIKE '%it support analyst%' OR
         LOWER(title) LIKE '%application support%' OR
         LOWER(title) LIKE '%technology analyst%' OR
         LOWER(title) LIKE '%qa%' OR
         LOWER(title) LIKE '%test analyst%' OR
         LOWER(title) LIKE '%platform engineer%' OR
         LOWER(title) LIKE '%cybersecurity analyst%' OR
         LOWER(title) LIKE '%it operations%' OR
         LOWER(title) LIKE '%technical consultant%' OR
         LOWER(title) LIKE '%solutions engineer%' OR
         LOWER(title) LIKE '%it business analyst%' OR
         LOWER(title) LIKE '%engineer%' OR
         LOWER(title) LIKE '%developer%' OR
         LOWER(title) LIKE '%software%' OR
         LOWER(title) LIKE '%devops%' OR
         LOWER(title) LIKE '%cloud%' OR
         LOWER(title) LIKE '%cybersecurity%' OR
         LOWER(title) LIKE '%it support%' OR
         LOWER(title) LIKE '%technical%' OR
         LOWER(title) LIKE '%programming%' OR
         LOWER(title) LIKE '%coding%' OR
         LOWER(title) LIKE '%computer science%' OR
         LOWER(description) LIKE '%software engineering%' OR
         LOWER(description) LIKE '%programming%' OR
         LOWER(description) LIKE '%coding%' OR
         LOWER(description) LIKE '%backend%' OR
         LOWER(description) LIKE '%frontend%' OR
         LOWER(description) LIKE '%api%' OR
         LOWER(description) LIKE '%cloud computing%' OR
         LOWER(description) LIKE '%aws%' OR
         LOWER(description) LIKE '%azure%' OR
         LOWER(description) LIKE '%kubernetes%' OR
         LOWER(company) LIKE '%tech%' OR
         LOWER(company) LIKE '%software%' OR
         LOWER(company) LIKE '%saas%' OR
         LOWER(company) LIKE '%technology%' THEN
      array_append(COALESCE(categories, ARRAY[]::TEXT[]), 'tech-transformation')
    
    -- Sustainability & ESG
    WHEN LOWER(title) LIKE '%esg intern%' OR
         LOWER(title) LIKE '%sustainability strategy%' OR
         LOWER(title) LIKE '%junior esg analyst%' OR
         LOWER(title) LIKE '%sustainability graduate%' OR
         LOWER(title) LIKE '%esg data analyst%' OR
         LOWER(title) LIKE '%corporate responsibility%' OR
         LOWER(title) LIKE '%environmental analyst%' OR
         LOWER(title) LIKE '%sustainability reporting%' OR
         LOWER(title) LIKE '%climate analyst%' OR
         LOWER(title) LIKE '%sustainable finance%' OR
         LOWER(title) LIKE '%esg assurance%' OR
         LOWER(title) LIKE '%sustainability communications%' OR
         LOWER(title) LIKE '%junior impact analyst%' OR
         LOWER(title) LIKE '%sustainability operations%' OR
         LOWER(title) LIKE '%green finance%' OR
         LOWER(title) LIKE '%esg%' OR
         LOWER(title) LIKE '%sustainability%' OR
         LOWER(title) LIKE '%environmental%' OR
         LOWER(title) LIKE '%climate%' OR
         LOWER(title) LIKE '%green%' OR
         LOWER(description) LIKE '%esg%' OR
         LOWER(description) LIKE '%environmental social governance%' OR
         LOWER(description) LIKE '%sustainability%' OR
         LOWER(description) LIKE '%carbon%' OR
         LOWER(description) LIKE '%renewable%' OR
         LOWER(description) LIKE '%green finance%' OR
         LOWER(description) LIKE '%climate change%' OR
         LOWER(description) LIKE '%net zero%' THEN
      array_append(COALESCE(categories, ARRAY[]::TEXT[]), 'sustainability-esg')
    
    ELSE categories
  END,
  updated_at = NOW()
WHERE is_active = true
  AND 'early-career' = ANY(categories)
  AND NOT (categories && ARRAY['strategy-business-design', 'finance-investment', 'sales-client-success', 'marketing-growth', 'data-analytics', 'operations-supply-chain', 'product-innovation', 'tech-transformation', 'sustainability-esg']);

-- Step 2: Mark non-business-school relevant jobs as inactive
-- (Education, Healthcare coaching, etc. - not relevant for business school grads)
UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = 'not_business_school_relevant',
  updated_at = NOW()
WHERE is_active = true
  AND 'early-career' = ANY(categories)
  AND (
    -- Education roles (not business school relevant)
    LOWER(title) LIKE '%teacher%' OR
    LOWER(title) LIKE '%teaching%' OR
    LOWER(title) LIKE '%tutor%' OR
    LOWER(title) LIKE '%instructor%' OR
    LOWER(title) LIKE '%lecturer%' OR
    LOWER(title) LIKE '%educator%' OR
    LOWER(title) LIKE '%careers manager%' AND LOWER(description) LIKE '%education%' OR
    LOWER(title) LIKE '%mathematics graduate%' AND LOWER(description) LIKE '%teaching%' OR
    LOWER(title) LIKE '%sessional tutor%' OR
    -- Healthcare/Wellbeing coaching (not business school relevant)
    LOWER(title) LIKE '%health%' AND LOWER(title) LIKE '%wellbeing%' OR
    LOWER(title) LIKE '%wellbeing coach%' OR
    LOWER(title) LIKE '%health coach%' OR
    LOWER(description) LIKE '%health and wellbeing%' AND LOWER(description) LIKE '%coach%'
  )
  AND NOT (categories && ARRAY['strategy-business-design', 'finance-investment', 'sales-client-success', 'marketing-growth', 'data-analytics', 'operations-supply-chain', 'product-innovation', 'tech-transformation', 'sustainability-esg']);

-- Step 3: Report results
SELECT 
  'Backfill Complete' as status,
  COUNT(*) FILTER (WHERE categories && ARRAY['strategy-business-design', 'finance-investment', 'sales-client-success', 'marketing-growth', 'data-analytics', 'operations-supply-chain', 'product-innovation', 'tech-transformation', 'sustainability-esg']) as jobs_with_career_paths,
  COUNT(*) FILTER (WHERE 'early-career' = ANY(categories) AND NOT (categories && ARRAY['strategy-business-design', 'finance-investment', 'sales-client-success', 'marketing-growth', 'data-analytics', 'operations-supply-chain', 'product-innovation', 'tech-transformation', 'sustainability-esg'])) as still_missing_career_paths,
  COUNT(*) FILTER (WHERE is_active = false AND filtered_reason = 'not_business_school_relevant') as filtered_out_non_business_jobs
FROM jobs
WHERE 'early-career' = ANY(categories);

