-- ============================================================================
-- COHESIVE CATEGORIZATION TRIGGER
-- ============================================================================
-- This trigger categorizes jobs using EXACTLY the same logic as the signup form
-- Career paths and roles match the form definitions for perfect cohesion
-- ============================================================================

CREATE OR REPLACE FUNCTION categorize_job()
RETURNS TRIGGER AS $$
DECLARE
  job_title TEXT;
  job_description TEXT;
  job_company TEXT;
  job_categories TEXT[];
BEGIN
  -- Get job fields (normalized to lowercase)
  job_title := LOWER(COALESCE(NEW.title, ''));
  job_description := LOWER(COALESCE(NEW.description, ''));
  job_company := LOWER(COALESCE(NEW.company, ''));
  job_categories := COALESCE(NEW.categories, ARRAY[]::TEXT[]);

  -- ============================================================================
  -- STEP 1: Ensure 'early-career' category (matches form entry_level_preference)
  -- ============================================================================
  IF NOT ('early-career' = ANY(job_categories)) THEN
    IF job_title LIKE '%graduate%' OR job_title LIKE '%grad%' OR
       job_title LIKE '%intern%' OR job_title LIKE '%internship%' OR
       job_title LIKE '%entry level%' OR job_title LIKE '%entry-level%' OR
       job_title LIKE '%junior%' OR job_title LIKE '%trainee%' OR
       job_title LIKE '%associate%' OR job_title LIKE '%assistant%' OR
       job_title LIKE '%stage%' OR job_title LIKE '%praktikum%' OR
       job_title LIKE '%prácticas%' OR job_title LIKE '%tirocinio%' OR
       job_title LIKE '%becario%' OR job_title LIKE '%werkstudent%' OR
       job_title LIKE '%placement%' OR job_title LIKE '%summer%' OR
       job_title LIKE '%winter%' OR job_description LIKE '%graduate%' OR
       job_description LIKE '%internship%' OR job_description LIKE '%entry level%' OR
       NEW.is_graduate = true OR NEW.is_internship = true THEN
      job_categories := array_append(job_categories, 'early-career');
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 1.5: Description-based categorization for generic titles
  -- Only apply if no career path assigned yet (for generic titles like "Graduate Associate", "Management Trainee", "Assistant")
  -- ============================================================================
  IF NOT (job_categories && ARRAY['strategy-business-design', 'finance-investment', 'sales-client-success', 'marketing-growth', 'data-analytics', 'operations-supply-chain', 'product-innovation', 'tech-transformation', 'sustainability-esg']) THEN
    -- Strategy keywords in description
    IF job_description LIKE '%strategy consulting%' OR
       job_description LIKE '%management consulting%' OR
       job_description LIKE '%business transformation%' OR
       job_description LIKE '%advisory%' OR
       job_description LIKE '%consulting%' OR
       job_description LIKE '%business analyst%' OR
       job_description LIKE '%strategy%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%consultant%') THEN
      job_categories := array_append(job_categories, 'strategy-business-design');
    -- Finance keywords in description
    ELSIF job_description LIKE '%investment banking%' OR
          job_description LIKE '%corporate finance%' OR
          job_description LIKE '%financial analyst%' OR
          job_description LIKE '%finance%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%banking%' OR job_description LIKE '%investment%') OR
          job_description LIKE '%accounting%' OR
          job_description LIKE '%audit%' OR
          job_description LIKE '%trading%' OR
          job_description LIKE '%equity research%' THEN
      job_categories := array_append(job_categories, 'finance-investment');
    -- Sales keywords in description
    ELSIF job_description LIKE '%sales development%' OR
          job_description LIKE '%business development%' OR
          job_description LIKE '%sdr%' OR
          job_description LIKE '%bdr%' OR
          job_description LIKE '%customer success%' OR
          job_description LIKE '%client success%' OR
          job_description LIKE '%account executive%' OR
          job_description LIKE '%inside sales%' THEN
      job_categories := array_append(job_categories, 'sales-client-success');
    -- Marketing keywords in description
    ELSIF job_description LIKE '%marketing%' AND (job_description LIKE '%intern%' OR job_description LIKE '%analyst%' OR job_description LIKE '%assistant%' OR job_description LIKE '%coordinator%') OR
          job_description LIKE '%digital marketing%' OR
          job_description LIKE '%social media%' OR
          job_description LIKE '%content marketing%' OR
          job_description LIKE '%brand%' AND (job_description LIKE '%marketing%' OR job_description LIKE '%assistant%') OR
          job_description LIKE '%growth marketing%' THEN
      job_categories := array_append(job_categories, 'marketing-growth');
    -- Data keywords in description
    ELSIF job_description LIKE '%data analyst%' OR
          job_description LIKE '%data analysis%' OR
          job_description LIKE '%business intelligence%' OR
          job_description LIKE '%data science%' OR
          job_description LIKE '%analytics%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%intern%') OR
          job_description LIKE '%sql%' OR
          job_description LIKE '%python%' AND (job_description LIKE '%data%' OR job_description LIKE '%analyst%') OR
          job_description LIKE '%tableau%' OR
          job_description LIKE '%power bi%' OR
          job_description LIKE '%powerbi%' THEN
      job_categories := array_append(job_categories, 'data-analytics');
    -- Operations keywords in description
    ELSIF job_description LIKE '%operations%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%intern%' OR job_description LIKE '%coordinator%') OR
          job_description LIKE '%supply chain%' OR
          job_description LIKE '%logistics%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%intern%') OR
          job_description LIKE '%procurement%' OR
          job_description LIKE '%hr%' OR
          job_description LIKE '%human resources%' OR
          job_description LIKE '%talent%' AND (job_description LIKE '%acquisition%' OR job_description LIKE '%recruitment%') OR
          job_description LIKE '%process improvement%' THEN
      job_categories := array_append(job_categories, 'operations-supply-chain');
    -- Product keywords in description
    ELSIF job_description LIKE '%product management%' OR
          job_description LIKE '%product analyst%' OR
          job_description LIKE '%associate product manager%' OR
          job_description LIKE '%apm%' OR
          job_description LIKE '%product development%' OR
          job_description LIKE '%user experience%' OR
          job_description LIKE '%ux%' OR
          job_description LIKE '%product owner%' OR
          job_description LIKE '%innovation%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%intern%') THEN
      job_categories := array_append(job_categories, 'product-innovation');
    -- Tech keywords in description
    ELSIF job_description LIKE '%software engineer%' OR
          job_description LIKE '%software development%' OR
          job_description LIKE '%programming%' OR
          job_description LIKE '%coding%' OR
          job_description LIKE '%cyber security%' OR
          job_description LIKE '%cybersecurity%' OR
          job_description LIKE '%it security%' OR
          job_description LIKE '%network admin%' OR
          job_description LIKE '%devops%' OR
          job_description LIKE '%cloud%' AND (job_description LIKE '%engineer%' OR job_description LIKE '%intern%') OR
          job_description LIKE '%backend%' OR
          job_description LIKE '%frontend%' OR
          job_description LIKE '%api%' AND (job_description LIKE '%developer%' OR job_description LIKE '%engineer%') THEN
      job_categories := array_append(job_categories, 'tech-transformation');
    -- Sustainability keywords in description
    ELSIF job_description LIKE '%esg%' OR
          job_description LIKE '%sustainability%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%intern%' OR job_description LIKE '%strategy%') OR
          job_description LIKE '%environmental%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%social%') OR
          job_description LIKE '%climate%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%change%') OR
          job_description LIKE '%green finance%' OR
          job_description LIKE '%carbon%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%reporting%') THEN
      job_categories := array_append(job_categories, 'sustainability-esg');
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 2: Strategy & Business Design (matches form: value='strategy')
  -- Roles: Business Analyst, Associate Consultant, Junior Consultant, Strategy Analyst,
  --        Consulting Intern, Junior Business Analyst, Transformation Analyst, etc.
  -- ============================================================================
  IF NOT ('strategy-business-design' = ANY(job_categories)) THEN
    IF job_title LIKE '%business analyst%' OR
       job_title LIKE '%associate consultant%' OR
       job_title LIKE '%junior consultant%' OR
       job_title LIKE '%strategy analyst%' OR
       job_title LIKE '%consulting intern%' OR
       job_title LIKE '%junior business analyst%' OR
       job_title LIKE '%transformation analyst%' OR
       job_title LIKE '%management consulting%' OR
       job_title LIKE '%growth consultant%' OR
       job_title LIKE '%business analyst trainee%' OR
       job_title LIKE '%junior associate%' OR
       job_title LIKE '%strategy consultant%' OR
       job_title LIKE '%digital transformation%' OR
       job_title LIKE '%operations excellence%' OR
       job_title LIKE '%business strategy%' OR
       -- Generic strategy/consulting keywords
       (job_title LIKE '%strategy%' AND (job_title LIKE '%analyst%' OR job_title LIKE '%consultant%' OR job_title LIKE '%associate%')) OR
       job_title LIKE '%consultant%' OR
       job_title LIKE '%consulting%' OR
       job_title LIKE '%advisory%' OR
       job_description LIKE '%strategy consulting%' OR
       job_description LIKE '%management consulting%' OR
       job_description LIKE '%advisory%' OR
       job_description LIKE '%business transformation%' OR
       job_company LIKE '%consulting%' OR
       job_company LIKE '%deloitte%' OR
       job_company LIKE '%pwc%' OR
       job_company LIKE '%mckinsey%' OR
       job_company LIKE '%bain%' OR
       job_company LIKE '%bcg%' OR
       job_company LIKE '%accenture%' OR
       job_company LIKE '%oliver wyman%' OR
       job_company LIKE '%kearney%' THEN
      job_categories := array_append(job_categories, 'strategy-business-design');
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 3: Finance & Investment (matches form: value='finance')
  -- Roles: Financial Analyst, Finance Intern, Investment Banking Analyst, Risk Analyst,
  --        Audit Associate, Finance Trainee, FP&A Analyst, Credit Analyst, etc.
  -- ============================================================================
  IF NOT ('finance-investment' = ANY(job_categories)) THEN
    IF job_title LIKE '%financial analyst%' OR
       job_title LIKE '%finance intern%' OR
       job_title LIKE '%investment banking analyst%' OR
       job_title LIKE '%risk analyst%' OR
       job_title LIKE '%audit associate%' OR
       job_title LIKE '%finance trainee%' OR
       job_title LIKE '%fp&a%' OR
       job_title LIKE '%fpa%' OR
       job_title LIKE '%credit analyst%' OR
       job_title LIKE '%investment analyst%' OR
       job_title LIKE '%junior accountant%' OR
       job_title LIKE '%corporate finance%' OR
       job_title LIKE '%m&a analyst%' OR
       job_title LIKE '%mergers acquisitions%' OR
       job_title LIKE '%treasury analyst%' OR
       job_title LIKE '%junior tax%' OR
       job_title LIKE '%finance graduate%' OR
       job_title LIKE '%impiegato amministrativo%' OR
       job_title LIKE '%contabile%' OR
       job_title LIKE '%accounting%' OR
       -- Generic finance keywords
       job_title LIKE '%finance%' OR
       job_title LIKE '%financial%' OR
       job_title LIKE '%investment%' OR
       job_title LIKE '%banking%' OR
       job_title LIKE '%equity research%' OR
       job_title LIKE '%portfolio%' OR
       (job_title LIKE '%analyst%' AND (job_description LIKE '%finance%' OR job_description LIKE '%banking%' OR job_description LIKE '%investment%')) OR
       job_description LIKE '%investment banking%' OR
       job_description LIKE '%corporate finance%' OR
       job_description LIKE '%trading%' OR
       job_description LIKE '%equity%' OR
       job_description LIKE '%m&a%' OR
       job_description LIKE '%mergers acquisitions%' OR
       job_company LIKE '%bank%' OR
       job_company LIKE '%finance%' OR
       job_company LIKE '%investment%' OR
       job_company LIKE '%goldman%' OR
       job_company LIKE '%morgan stanley%' OR
       job_company LIKE '%jpmorgan%' OR
       job_company LIKE '%barclays%' OR
       job_company LIKE '%deutsche bank%' OR
       job_company LIKE '%ubs%' OR
       job_company LIKE '%credit suisse%' THEN
      job_categories := array_append(job_categories, 'finance-investment');
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 4: Sales & Client Success (matches form: value='sales')
  -- Roles: SDR, BDR, Inside Sales Representative, Account Executive,
  --        Business Development Associate, Sales Trainee, Customer Success, etc.
  -- ============================================================================
  IF NOT ('sales-client-success' = ANY(job_categories)) THEN
    IF job_title LIKE '%sales development representative%' OR
       job_title LIKE '%sdr%' OR
       job_title LIKE '%business development representative%' OR
       job_title LIKE '%bdr%' OR
       job_title LIKE '%inside sales%' OR
       job_title LIKE '%account executive%' OR
       job_title LIKE '%business development associate%' OR
       job_title LIKE '%sales trainee%' OR
       job_title LIKE '%customer success%' OR
       job_title LIKE '%client success%' OR
       job_title LIKE '%revenue operations%' OR
       job_title LIKE '%sales operations%' OR
       job_title LIKE '%graduate sales%' OR
       job_title LIKE '%business development intern%' OR
       job_title LIKE '%channel sales%' OR
       job_title LIKE '%account development%' OR
       job_title LIKE '%junior sales%' OR
       -- Generic sales keywords
       job_title LIKE '%sales%' OR
       job_title LIKE '%business development%' OR
       job_title LIKE '%account manager%' OR
       job_title LIKE '%relationship manager%' OR
       job_description LIKE '%sales%' OR
       job_description LIKE '%business development%' OR
       job_description LIKE '%client acquisition%' OR
       job_description LIKE '%revenue generation%' OR
       job_company LIKE '%salesforce%' OR
       job_company LIKE '%hubspot%' OR
       job_company LIKE '%sales%' THEN
      job_categories := array_append(job_categories, 'sales-client-success');
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 5: Marketing & Growth (matches form: value='marketing')
  -- Roles: Marketing Intern, Social Media Intern, Digital Marketing Assistant,
  --        Marketing Coordinator, Growth Marketing Intern, Content Marketing, etc.
  -- ============================================================================
  IF NOT ('marketing-growth' = ANY(job_categories)) THEN
    IF job_title LIKE '%marketing intern%' OR
       job_title LIKE '%social media intern%' OR
       job_title LIKE '%digital marketing%' OR
       job_title LIKE '%marketing coordinator%' OR
       job_title LIKE '%growth marketing%' OR
       job_title LIKE '%content marketing%' OR
       job_title LIKE '%brand assistant%' OR
       job_title LIKE '%marketing assistant%' OR
       job_title LIKE '%junior marketing%' OR
       job_title LIKE '%email marketing%' OR
       job_title LIKE '%seo%' OR
       job_title LIKE '%sem%' OR
       job_title LIKE '%trade marketing%' OR
       job_title LIKE '%marketing graduate%' OR
       job_title LIKE '%marketing campaign%' OR
       -- Generic marketing keywords
       job_title LIKE '%marketing%' OR
       job_title LIKE '%growth%' OR
       job_title LIKE '%social media%' OR
       job_title LIKE '%content%' OR
       job_title LIKE '%brand%' OR
       job_title LIKE '%communications%' OR
       job_description LIKE '%marketing%' OR
       job_description LIKE '%brand%' OR
       job_description LIKE '%campaign%' OR
       job_description LIKE '%digital marketing%' OR
       job_description LIKE '%social media%' OR
       job_description LIKE '%content creation%' OR
       job_company LIKE '%marketing%' OR
       job_company LIKE '%advertising%' OR
       job_company LIKE '%media%' THEN
      job_categories := array_append(job_categories, 'marketing-growth');
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 6: Data & Analytics (matches form: value='data')
  -- Roles: Data Analyst, Junior Data Analyst, Analytics Intern, BI Intern,
  --        Data Analyst Trainee, Junior Data Scientist, Data Engineer, etc.
  -- ============================================================================
  IF NOT ('data-analytics' = ANY(job_categories)) THEN
    IF job_title LIKE '%data analyst%' OR
       job_title LIKE '%junior data analyst%' OR
       job_title LIKE '%analytics intern%' OR
       job_title LIKE '%business intelligence%' OR
       job_title LIKE '%bi intern%' OR
       job_title LIKE '%data analyst trainee%' OR
       job_title LIKE '%junior data scientist%' OR
       job_title LIKE '%data science trainee%' OR
       job_title LIKE '%junior data engineer%' OR
       job_title LIKE '%bi engineer%' OR
       job_title LIKE '%analytics associate%' OR
       job_title LIKE '%data analytics graduate%' OR
       job_title LIKE '%insights analyst%' OR
       job_title LIKE '%junior bi developer%' OR
       job_title LIKE '%data assistant%' OR
       job_title LIKE '%research analytics%' OR
       -- Generic data keywords
       (job_title LIKE '%data%' AND (job_title LIKE '%analyst%' OR job_title LIKE '%scientist%' OR job_title LIKE '%engineer%')) OR
       job_title LIKE '%analytics%' OR
       job_title LIKE '%business intelligence%' OR
       job_title LIKE '%data scientist%' OR
       job_title LIKE '%data engineer%' OR
       job_title LIKE '%pricing analyst%' OR
       job_title LIKE '%research analyst%' OR
       job_description LIKE '%data analysis%' OR
       job_description LIKE '%sql%' OR
       job_description LIKE '%python%' OR
       job_description LIKE '%r programming%' OR
       job_description LIKE '%tableau%' OR
       job_description LIKE '%powerbi%' OR
       job_description LIKE '%power bi%' OR
       job_description LIKE '%data visualization%' OR
       job_description LIKE '%machine learning%' THEN
      job_categories := array_append(job_categories, 'data-analytics');
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 7: Operations & Supply Chain (matches form: value='operations')
  -- Roles: Operations Analyst, Supply Chain Analyst, Logistics Analyst,
  --        Procurement Analyst, Operations Intern, Inventory Planner, etc.
  -- ============================================================================
  IF NOT ('operations-supply-chain' = ANY(job_categories)) THEN
    IF job_title LIKE '%operations analyst%' OR
       job_title LIKE '%supply chain analyst%' OR
       job_title LIKE '%logistics analyst%' OR
       job_title LIKE '%procurement analyst%' OR
       job_title LIKE '%operations intern%' OR
       job_title LIKE '%inventory planner%' OR
       job_title LIKE '%operations coordinator%' OR
       job_title LIKE '%supply chain trainee%' OR
       job_title LIKE '%logistics planning%' OR
       job_title LIKE '%demand planning%' OR
       job_title LIKE '%operations management%' OR
       job_title LIKE '%fulfilment specialist%' OR
       job_title LIKE '%sourcing analyst%' OR
       job_title LIKE '%process improvement%' OR
       job_title LIKE '%supply chain graduate%' OR
       -- Generic operations keywords
       job_title LIKE '%operations%' OR
       job_title LIKE '%supply chain%' OR
       job_title LIKE '%logistics%' OR
       job_title LIKE '%procurement%' OR
       job_title LIKE '%sourcing%' OR
       job_title LIKE '%inventory%' OR
       job_title LIKE '%demand planning%' OR
       job_title LIKE '%hr%' OR
       job_title LIKE '%human resources%' OR
       job_title LIKE '%talent%' OR
       job_title LIKE '%recruitment%' OR
       job_description LIKE '%operations%' OR
       job_description LIKE '%supply chain%' OR
       job_description LIKE '%logistics%' OR
       job_description LIKE '%procurement%' OR
       job_description LIKE '%process improvement%' OR
       job_description LIKE '%lean%' OR
       job_description LIKE '%six sigma%' THEN
      job_categories := array_append(job_categories, 'operations-supply-chain');
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 8: Product & Innovation (matches form: value='product')
  -- Roles: APM, Product Analyst, Product Management Intern, Junior Product Manager,
  --        Product Operations, Product Designer, UX Intern, Innovation Analyst, etc.
  -- ============================================================================
  IF NOT ('product-innovation' = ANY(job_categories)) THEN
    IF job_title LIKE '%associate product manager%' OR
       job_title LIKE '%apm%' OR
       job_title LIKE '%product analyst%' OR
       job_title LIKE '%product management intern%' OR
       job_title LIKE '%junior product manager%' OR
       job_title LIKE '%product operations%' OR
       job_title LIKE '%product designer%' OR
       job_title LIKE '%ux intern%' OR
       job_title LIKE '%product research%' OR
       job_title LIKE '%innovation analyst%' OR
       job_title LIKE '%product development%' OR
       job_title LIKE '%product marketing%' OR
       job_title LIKE '%product owner%' OR
       job_title LIKE '%assistant product manager%' OR
       job_title LIKE '%product strategy%' OR
       job_title LIKE '%technical product%' OR
       -- Generic product keywords
       (job_title LIKE '%product%' AND (job_title LIKE '%manager%' OR job_title LIKE '%analyst%' OR job_title LIKE '%designer%' OR job_title LIKE '%owner%')) OR
       job_title LIKE '%ux%' OR
       job_title LIKE '%ui%' OR
       job_title LIKE '%designer%' OR
       job_title LIKE '%user experience%' OR
       job_title LIKE '%user interface%' OR
       job_description LIKE '%product management%' OR
       job_description LIKE '%product development%' OR
       job_description LIKE '%user experience%' OR
       job_description LIKE '%innovation%' OR
       job_description LIKE '%user research%' OR
       job_description LIKE '%design thinking%' THEN
      job_categories := array_append(job_categories, 'product-innovation');
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 9: Tech & Engineering (matches form: value='tech')
  -- Roles: Software Engineer Intern, Cloud Engineer Intern, DevOps Engineer Intern,
  --        Data Engineer Intern, Systems Analyst, IT Support Analyst, etc.
  -- ============================================================================
  IF NOT ('tech-transformation' = ANY(job_categories)) THEN
    IF job_title LIKE '%software engineer intern%' OR
       job_title LIKE '%cloud engineer intern%' OR
       job_title LIKE '%devops engineer intern%' OR
       job_title LIKE '%data engineer intern%' OR
       job_title LIKE '%systems analyst%' OR
       job_title LIKE '%it support analyst%' OR
       job_title LIKE '%application support%' OR
       job_title LIKE '%technology analyst%' OR
       job_title LIKE '%qa%' OR
       job_title LIKE '%test analyst%' OR
       job_title LIKE '%platform engineer%' OR
       job_title LIKE '%cybersecurity analyst%' OR
       job_title LIKE '%cyber security%' OR
       job_title LIKE '%it security%' OR
       job_title LIKE '%network admin%' OR
       job_title LIKE '%network administrator%' OR
       job_title LIKE '%it operations%' OR
       job_title LIKE '%technical consultant%' OR
       job_title LIKE '%solutions engineer%' OR
       job_title LIKE '%it business analyst%' OR
       (job_title LIKE '%trainee%' AND (job_title LIKE '%cyber%' OR job_title LIKE '%security%' OR job_title LIKE '%network%' OR job_title LIKE '%it%')) OR
       -- Generic tech keywords
       job_title LIKE '%engineer%' OR
       job_title LIKE '%developer%' OR
       job_title LIKE '%software%' OR
       job_title LIKE '%devops%' OR
       job_title LIKE '%cloud%' OR
       job_title LIKE '%cybersecurity%' OR
       job_title LIKE '%cyber security%' OR
       job_title LIKE '%it support%' OR
       job_title LIKE '%technical%' OR
       job_title LIKE '%programming%' OR
       job_title LIKE '%coding%' OR
       job_description LIKE '%software engineering%' OR
       job_description LIKE '%programming%' OR
       job_description LIKE '%coding%' OR
       job_description LIKE '%backend%' OR
       job_description LIKE '%frontend%' OR
       job_description LIKE '%api%' OR
       job_description LIKE '%cloud computing%' OR
       job_description LIKE '%aws%' OR
       job_description LIKE '%azure%' OR
       job_description LIKE '%kubernetes%' OR
       job_description LIKE '%cyber security%' OR
       job_description LIKE '%network administration%' OR
       job_company LIKE '%tech%' OR
       job_company LIKE '%software%' OR
       job_company LIKE '%saas%' OR
       job_company LIKE '%technology%' THEN
      job_categories := array_append(job_categories, 'tech-transformation');
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 10: Sustainability & ESG (matches form: value='sustainability')
  -- Roles: ESG Intern, Sustainability Strategy Intern, Junior ESG Analyst,
  --        Sustainability Graduate Programme, ESG Data Analyst, etc.
  -- ============================================================================
  IF NOT ('sustainability-esg' = ANY(job_categories)) THEN
    IF job_title LIKE '%esg intern%' OR
       job_title LIKE '%sustainability strategy%' OR
       job_title LIKE '%junior esg analyst%' OR
       job_title LIKE '%sustainability graduate%' OR
       job_title LIKE '%esg data analyst%' OR
       job_title LIKE '%corporate responsibility%' OR
       job_title LIKE '%environmental analyst%' OR
       job_title LIKE '%sustainability reporting%' OR
       job_title LIKE '%climate analyst%' OR
       job_title LIKE '%sustainable finance%' OR
       job_title LIKE '%esg assurance%' OR
       job_title LIKE '%sustainability communications%' OR
       job_title LIKE '%junior impact analyst%' OR
       job_title LIKE '%sustainability operations%' OR
       job_title LIKE '%green finance%' OR
       -- Generic sustainability keywords
       job_title LIKE '%esg%' OR
       job_title LIKE '%sustainability%' OR
       job_title LIKE '%environmental%' OR
       job_title LIKE '%climate%' OR
       job_title LIKE '%green%' OR
       job_description LIKE '%esg%' OR
       job_description LIKE '%environmental social governance%' OR
       job_description LIKE '%sustainability%' OR
       job_description LIKE '%carbon%' OR
       job_description LIKE '%renewable%' OR
       job_description LIKE '%green finance%' OR
       job_description LIKE '%climate change%' OR
       job_description LIKE '%net zero%' THEN
      job_categories := array_append(job_categories, 'sustainability-esg');
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 11: Set is_internship flag and add 'internship' category (matches form entry_level_preference)
  -- ============================================================================
  IF NEW.is_internship IS NULL OR NEW.is_internship = false THEN
    IF job_title LIKE '%intern%' OR
       job_title LIKE '%internship%' OR
       job_title LIKE '%stage%' OR
       job_title LIKE '%praktikum%' OR
       job_title LIKE '%prácticas%' OR
       job_title LIKE '%tirocinio%' OR
       job_title LIKE '%becario%' OR
       job_title LIKE '%werkstudent%' OR
       job_title LIKE '%placement%' OR
       job_title LIKE '%summer%' OR
       job_title LIKE '%winter%' OR
       job_description LIKE '%internship%' OR
       NEW.experience_required = 'internship' THEN
      NEW.is_internship := true;
    END IF;
  END IF;
  
  -- Add 'internship' category if job is an internship
  IF NEW.is_internship = true AND NOT ('internship' = ANY(job_categories)) THEN
    job_categories := array_append(job_categories, 'internship');
  END IF;

  -- ============================================================================
  -- STEP 12: Set is_graduate flag and add 'graduate-programme' category (matches form entry_level_preference)
  -- ============================================================================
  IF NEW.is_graduate IS NULL OR NEW.is_graduate = false THEN
    IF job_title LIKE '%graduate%' OR
       job_title LIKE '%grad%' OR
       job_title LIKE '%graduate programme%' OR
       job_title LIKE '%graduate program%' OR
       job_title LIKE '%graduate scheme%' OR
       job_title LIKE '%graduate trainee%' OR
       job_title LIKE '%management trainee%' OR
       job_description LIKE '%graduate%' OR
       job_description LIKE '%graduate program%' OR
       job_description LIKE '%graduate scheme%' OR
       NEW.experience_required = 'graduate' THEN
      NEW.is_graduate := true;
    END IF;
  END IF;
  
  -- Add 'graduate-programme' category if job is a graduate programme
  IF NEW.is_graduate = true AND NOT ('graduate-programme' = ANY(job_categories)) THEN
    job_categories := array_append(job_categories, 'graduate-programme');
  END IF;

  -- ============================================================================
  -- STEP 12.5: Add 'working-student' category (matches form entry_level_preference)
  -- ============================================================================
  IF NOT ('working-student' = ANY(job_categories)) THEN
    IF job_title LIKE '%werkstudent%' OR
       job_title LIKE '%working student%' OR
       job_title LIKE '%part-time student%' OR
       job_title LIKE '%student worker%' OR
       job_title LIKE '%student job%' OR
       job_description LIKE '%werkstudent%' OR
       job_description LIKE '%working student%' OR
       job_description LIKE '%part-time student%' OR
       job_description LIKE '%student worker%' OR
       job_description LIKE '%student job%' THEN
      job_categories := array_append(job_categories, 'working-student');
    END IF;
  END IF;
  
  -- ============================================================================
  -- STEP 12.6: Add 'entry-level' category for entry-level roles (matches form entry_level_preference)
  -- Note: This is distinct from 'early-career' which is a broader category
  -- ============================================================================
  IF NOT ('entry-level' = ANY(job_categories)) THEN
    IF (NEW.is_early_career = true OR 
        (job_title LIKE '%entry level%' OR job_title LIKE '%entry-level%' OR
         job_title LIKE '%junior%' OR job_title LIKE '%associate%' OR
         job_title LIKE '%assistant%' OR job_title LIKE '%first full-time%' OR
         job_description LIKE '%entry level%' OR job_description LIKE '%entry-level%' OR
         job_description LIKE '%first full-time role%' OR job_description LIKE '%first full time role%')) AND
       NEW.is_internship != true AND NEW.is_graduate != true THEN
      job_categories := array_append(job_categories, 'entry-level');
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 13: Set experience_required if missing (matches form entry_level_preference)
  -- ============================================================================
  IF NEW.experience_required IS NULL OR NEW.experience_required = '' THEN
    IF NEW.is_internship = true THEN
      NEW.experience_required := 'internship';
    ELSIF NEW.is_graduate = true THEN
      NEW.experience_required := 'graduate';
    ELSIF job_title LIKE '%junior%' OR
          job_title LIKE '%entry level%' OR
          job_title LIKE '%entry-level%' OR
          job_title LIKE '%associate%' OR
          job_title LIKE '%assistant%' OR
          'early-career' = ANY(job_categories) THEN
      NEW.experience_required := 'entry-level';
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 14: Filter out non-business-school relevant jobs AFTER categorization attempts
  -- Only filter if no business-relevant category was assigned
  -- ============================================================================
  IF NOT (job_categories && ARRAY['strategy-business-design', 'finance-investment', 'sales-client-success', 'marketing-growth', 'data-analytics', 'operations-supply-chain', 'product-innovation', 'tech-transformation', 'sustainability-esg']) THEN
    IF (job_title LIKE '%dental%' OR job_title LIKE '%dentist%' OR
        job_title LIKE '%army%' OR job_title LIKE '%soldier%' OR
        job_title LIKE '%cameriere%' OR job_title LIKE '%waiter%' OR job_title LIKE '%waitress%' OR
        (job_title LIKE '%trainer%' AND (job_description LIKE '%sport%' OR job_description LIKE '%fitness%' OR job_description LIKE '%gym%')) OR
        job_title LIKE '%work from home%' OR job_title LIKE '%flexible hours%' OR
        job_description LIKE '%paid online tasks%' OR job_description LIKE '%cashback%' OR
        job_title LIKE '%teacher%' OR job_title LIKE '%teaching%' OR job_title LIKE '%educator%' OR
        (job_title LIKE '%nurse%' AND NOT job_title LIKE '%business%') OR
        (job_title LIKE '%engineer%' AND (job_description LIKE '%mechanical%' OR job_description LIKE '%civil%' OR job_description LIKE '%electrical%') AND NOT job_description LIKE '%software%' AND NOT job_description LIKE '%it%')) AND
        NOT (job_title LIKE '%business%' OR job_title LIKE '%strategy%' OR job_title LIKE '%finance%' OR job_title LIKE '%consulting%') THEN
      -- Mark as inactive
      NEW.status := 'inactive';
      NEW.is_active := false;
      NEW.filtered_reason := 'non_business_school_relevant';
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 15: Ensure status and is_active are set correctly
  -- ============================================================================
  IF NEW.status IS NULL OR NEW.status = '' THEN
    NEW.status := 'active';
  END IF;
  
  IF NEW.is_active IS NULL THEN
    NEW.is_active := true;
  END IF;

  -- ============================================================================
  -- STEP 16: Update categories and timestamp
  -- ============================================================================
  NEW.categories := job_categories;
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to ensure it's active
DROP TRIGGER IF EXISTS trigger_categorize_job ON jobs;
CREATE TRIGGER trigger_categorize_job
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION categorize_job();

-- Verify trigger was created
SELECT 
    'Trigger Status' as check_type,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'jobs'
  AND trigger_name = 'trigger_categorize_job';

