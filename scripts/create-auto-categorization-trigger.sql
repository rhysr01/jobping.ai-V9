-- ============================================================================
-- AUTOMATIC JOB CATEGORIZATION TRIGGER
-- ============================================================================
-- This trigger automatically categorizes jobs whenever they are inserted or updated
-- Runs the same categorization logic as optimize-all-jobs-categorization.sql
-- ============================================================================

-- ============================================================================
-- FUNCTION: Categorize a single job
-- ============================================================================
CREATE OR REPLACE FUNCTION categorize_job()
RETURNS TRIGGER AS $$
DECLARE
  job_title TEXT;
  job_description TEXT;
  job_company TEXT;
  job_categories TEXT[];
BEGIN
  -- Get job fields
  job_title := LOWER(COALESCE(NEW.title, ''));
  job_description := LOWER(COALESCE(NEW.description, ''));
  job_company := LOWER(COALESCE(NEW.company, ''));
  job_categories := COALESCE(NEW.categories, ARRAY[]::TEXT[]);

  -- Ensure 'early-career' category exists
  IF NOT ('early-career' = ANY(job_categories)) THEN
    IF job_title LIKE '%graduate%' OR job_title LIKE '%intern%' OR 
       job_title LIKE '%entry level%' OR job_title LIKE '%junior%' OR
       NEW.is_graduate = true OR NEW.is_internship = true THEN
      job_categories := array_append(job_categories, 'early-career');
    END IF;
  END IF;

  -- Strategy & Business Design
  IF NOT ('strategy-business-design' = ANY(job_categories)) THEN
    IF job_title LIKE '%strategy%' OR job_title LIKE '%consulting%' OR 
       job_title LIKE '%consultant%' OR job_title LIKE '%advisory%' OR
       job_description LIKE '%consulting%' OR job_description LIKE '%advisory%' OR
       job_description LIKE '%strategy%' OR job_company LIKE '%consulting%' OR
       job_company LIKE '%deloitte%' OR job_company LIKE '%pwc%' OR
       job_company LIKE '%mckinsey%' OR job_company LIKE '%bain%' OR
       job_company LIKE '%bcg%' OR job_company LIKE '%accenture%' THEN
      job_categories := array_append(job_categories, 'strategy-business-design');
    END IF;
  END IF;

  -- Finance & Investment (ENHANCED for internships - eFX, trading, etc.)
  IF NOT ('finance-investment' = ANY(job_categories)) THEN
    IF job_title LIKE '%finance%' OR job_title LIKE '%financial%' OR
       job_title LIKE '%investment%' OR job_title LIKE '%banking%' OR
       job_title LIKE '%audit%' OR job_title LIKE '%accounting%' OR
       job_title LIKE '%private equity%' OR job_title LIKE '%eFX%' OR
       job_title LIKE '%trading%' OR job_title LIKE '%actuarial%' OR
       job_title LIKE '%actuary%' OR job_title LIKE '%accounts receivable%' OR
       job_title LIKE '%accounts payable%' OR job_description LIKE '%finance%' OR
       job_description LIKE '%banking%' OR job_description LIKE '%investment%' OR
       job_description LIKE '%capital markets%' OR job_description LIKE '%audit%' OR
       job_description LIKE '%trading%' OR job_description LIKE '%FX%' OR
       job_description LIKE '%foreign exchange%' OR job_description LIKE '%real estate%' OR
       job_company LIKE '%bank%' OR job_company LIKE '%bnp%' OR
       job_company LIKE '%ubs%' OR job_company LIKE '%goldman%' OR
       job_company LIKE '%morgan%' OR job_company LIKE '%barclays%' OR
       job_company LIKE '%hsbc%' OR job_company LIKE '%credit%' OR
       job_company LIKE '%state street%' OR job_company LIKE '%cushman%' OR
       job_company LIKE '%wakefield%' OR job_company LIKE '%swiss life%' THEN
      job_categories := array_append(job_categories, 'finance-investment');
    END IF;
  END IF;

  -- Marketing & Growth (ENHANCED for internships - Copywriter, Content, Entertainment)
  IF NOT ('marketing-growth' = ANY(job_categories)) THEN
    IF job_title LIKE '%marketing%' OR job_title LIKE '%PR%' OR
       job_title LIKE '%public relations%' OR job_title LIKE '%communications%' OR
       job_title LIKE '%communication%' OR job_title LIKE '%brand%' OR
       job_title LIKE '%content%' OR job_title LIKE '%social media%' OR
       job_title LIKE '%copywriter%' OR job_title LIKE '%copy%' OR
       job_title LIKE '%entertainment%' OR job_title LIKE '%media%' OR
       job_title LIKE '%press%' OR job_title LIKE '%editorial%' OR
       job_description LIKE '%marketing%' OR job_description LIKE '%PR%' OR
       job_description LIKE '%public relations%' OR job_description LIKE '%brand%' OR
       job_description LIKE '%social media%' OR job_description LIKE '%content%' OR
       job_description LIKE '%copywriting%' OR job_description LIKE '%SEO%' OR
       job_description LIKE '%entertainment%' OR job_description LIKE '%media%' OR
       job_description LIKE '%editorial%' OR job_description LIKE '%press office%' THEN
      job_categories := array_append(job_categories, 'marketing-growth');
    END IF;
  END IF;

  -- Data & Analytics
  IF NOT ('data-analytics' = ANY(job_categories)) THEN
    IF job_title LIKE '%data%' OR job_title LIKE '%analytics%' OR
       job_title LIKE '%analyst%' OR job_title LIKE '%business analyst%' OR
       job_title LIKE '%business intelligence%' OR job_title LIKE '%BI%' OR
       job_description LIKE '%data analysis%' OR job_description LIKE '%data analytics%' OR
       job_description LIKE '%business analysis%' OR job_description LIKE '%business intelligence%' OR
       job_description LIKE '%analytics%' OR job_description LIKE '%analytical%' OR
       (job_title LIKE '%analyst%' AND LENGTH(job_description) > 50) THEN
      job_categories := array_append(job_categories, 'data-analytics');
    END IF;
  END IF;

  -- Operations & Supply Chain (ENHANCED for internships)
  IF NOT ('operations-supply-chain' = ANY(job_categories)) THEN
    IF job_title LIKE '%operations%' OR job_title LIKE '%supply chain%' OR
       job_title LIKE '%logistics%' OR job_title LIKE '%project management%' OR
       job_title LIKE '%project manager%' OR job_title LIKE '%management trainee%' OR
       job_title LIKE '%quality%' OR job_title LIKE '%process%' OR
       job_title LIKE '%prozess%' OR job_title LIKE '%process management%' OR
       job_title LIKE '%HR%' OR job_title LIKE '%human resources%' OR
       job_title LIKE '%talent%' OR job_title LIKE '%recruitment%' OR
       job_title LIKE '%werkstudent%' OR
       job_description LIKE '%operations%' OR job_description LIKE '%operational%' OR
       job_description LIKE '%project management%' OR job_description LIKE '%process%' OR
       job_description LIKE '%supply chain%' OR job_description LIKE '%logistics%' OR
       job_description LIKE '%management trainee%' OR job_description LIKE '%quality management%' OR
       job_description LIKE '%process management%' OR job_description LIKE '%HR%' OR
       job_description LIKE '%human resources%' OR job_description LIKE '%talent acquisition%' OR
       job_description LIKE '%recruitment%' OR job_description LIKE '%people operations%' THEN
      job_categories := array_append(job_categories, 'operations-supply-chain');
    END IF;
  END IF;

  -- Product & Innovation
  IF NOT ('product-innovation' = ANY(job_categories)) THEN
    IF job_title LIKE '%product%' OR job_title LIKE '%product management%' OR
       job_title LIKE '%product manager%' OR job_title LIKE '%UX%' OR
       job_title LIKE '%user experience%' OR job_title LIKE '%UX research%' OR
       job_description LIKE '%product%' OR job_description LIKE '%UX%' OR
       job_description LIKE '%user experience%' OR job_description LIKE '%product management%' OR
       job_description LIKE '%innovation%' THEN
      job_categories := array_append(job_categories, 'product-innovation');
    END IF;
  END IF;

  -- Tech & Engineering (ENHANCED for internships - System Integrator, IT, etc.)
  IF NOT ('tech-transformation' = ANY(job_categories)) THEN
    IF job_title LIKE '%software%' OR job_title LIKE '%developer%' OR
       job_title LIKE '%engineer%' OR job_title LIKE '%programmer%' OR
       job_title LIKE '%IT%' OR job_title LIKE '%tech%' OR
       job_title LIKE '%technology%' OR job_title LIKE '%system%' OR
       job_title LIKE '%integrator%' OR job_title LIKE '%cybersecurity%' OR
       job_title LIKE '%vulnerability%' OR job_title LIKE '%digital%' OR
       job_description LIKE '%software%' OR job_description LIKE '%development%' OR
       job_description LIKE '%programming%' OR job_description LIKE '%coding%' OR
       job_description LIKE '%IT%' OR job_description LIKE '%information technology%' OR
       job_description LIKE '%machine learning%' OR job_description LIKE '%AI%' OR
       job_description LIKE '%artificial intelligence%' OR job_description LIKE '%digital%' OR
       job_description LIKE '%system%' OR job_description LIKE '%technical%' OR
       job_description LIKE '%cybersecurity%' OR job_description LIKE '%vulnerability%' OR
       job_company LIKE '%apple%' OR job_company LIKE '%google%' OR
       job_company LIKE '%microsoft%' OR job_company LIKE '%amazon%' OR
       job_company LIKE '%meta%' OR job_company LIKE '%facebook%' OR
       job_company LIKE '%tech%' OR job_company LIKE '%technology%' OR
       job_company LIKE '%siemens%' OR job_company LIKE '%airbus%' OR
       job_company LIKE '%rohde%' OR job_company LIKE '%schwarz%' THEN
      job_categories := array_append(job_categories, 'tech-transformation');
    END IF;
  END IF;

  -- Sustainability & ESG
  IF NOT ('sustainability-esg' = ANY(job_categories)) THEN
    IF job_title LIKE '%ESG%' OR job_title LIKE '%sustainability%' OR
       job_title LIKE '%environmental%' OR job_description LIKE '%ESG%' OR
       job_description LIKE '%sustainability%' OR job_description LIKE '%environmental impact%' THEN
      job_categories := array_append(job_categories, 'sustainability-esg');
    END IF;
  END IF;

  -- Sales & Client Success (ENHANCED for internships)
  IF NOT ('sales-client-success' = ANY(job_categories)) THEN
    IF job_title LIKE '%sales%' OR job_title LIKE '%SDR%' OR
       job_title LIKE '%BDR%' OR job_title LIKE '%business development%' OR
       job_title LIKE '%account executive%' OR job_title LIKE '%client success%' OR
       job_title LIKE '%customer success%' OR job_title LIKE '%account manager%' OR
       job_title LIKE '%partnerships%' OR job_title LIKE '%commercial%' OR
       job_title LIKE '%guest experience%' OR job_title LIKE '%guest relations%' OR
       job_title LIKE '%store%' OR job_title LIKE '%vendedor%' OR
       job_description LIKE '%sales%' OR job_description LIKE '%sales development%' OR
       job_description LIKE '%lead generation%' OR job_description LIKE '%business development%' OR
       job_description LIKE '%client relationship%' OR job_description LIKE '%customer experience%' THEN
      job_categories := array_append(job_categories, 'sales-client-success');
    END IF;
  END IF;

  -- Multiple career paths: Finance + Strategy (M&A)
  IF 'finance-investment' = ANY(job_categories) AND NOT ('strategy-business-design' = ANY(job_categories)) THEN
    IF job_description LIKE '%M&A%' OR job_description LIKE '%mergers%' OR
       job_description LIKE '%acquisitions%' OR job_description LIKE '%corporate finance%' OR
       job_description LIKE '%investment banking%' OR job_title LIKE '%M&A%' THEN
      job_categories := array_append(job_categories, 'strategy-business-design');
    END IF;
  END IF;

  -- Multiple career paths: Data + Operations
  IF 'data-analytics' = ANY(job_categories) AND NOT ('operations-supply-chain' = ANY(job_categories)) THEN
    IF job_description LIKE '%operations%' OR job_description LIKE '%process%' OR
       job_description LIKE '%supply chain%' OR job_title LIKE '%operations%' THEN
      job_categories := array_append(job_categories, 'operations-supply-chain');
    END IF;
  END IF;

  -- Multiple career paths: Product + Tech
  IF 'product-innovation' = ANY(job_categories) AND NOT ('tech-transformation' = ANY(job_categories)) THEN
    IF job_description LIKE '%software%' OR job_description LIKE '%technical%' OR
       job_description LIKE '%digital%' OR job_company LIKE '%tech%' OR
       job_company LIKE '%technology%' THEN
      job_categories := array_append(job_categories, 'tech-transformation');
    END IF;
  END IF;

  -- Multiple career paths: Product + Tech
  IF 'product-innovation' = ANY(job_categories) AND NOT ('tech-transformation' = ANY(job_categories)) THEN
    IF job_description LIKE '%software%' OR job_description LIKE '%technical%' OR
       job_description LIKE '%digital%' OR job_company LIKE '%tech%' OR
       job_company LIKE '%technology%' THEN
      job_categories := array_append(job_categories, 'tech-transformation');
    END IF;
  END IF;

  -- Generic internship fallback: Use company context when title is very generic
  -- Only apply if no career path assigned yet and it's clearly an internship
  IF NEW.is_internship = true AND 
     NOT (job_categories && ARRAY[
       'strategy-business-design', 'finance-investment', 'sales-client-success',
       'marketing-growth', 'data-analytics', 'operations-supply-chain',
       'product-innovation', 'tech-transformation', 'sustainability-esg'
     ]) THEN
    -- Try to infer from company name
    IF job_company LIKE '%bank%' OR job_company LIKE '%finance%' OR
       job_company LIKE '%investment%' OR job_company LIKE '%state street%' OR
       job_company LIKE '%swiss life%' OR job_company LIKE '%schroders%' OR
       job_company LIKE '%lazard%' OR job_company LIKE '%natixis%' OR
       job_company LIKE '%credit%' OR job_company LIKE '%citco%' OR
       job_company LIKE '%vontobel%' OR job_company LIKE '%wellington%' THEN
      job_categories := array_append(job_categories, 'finance-investment');
    ELSIF job_company LIKE '%consulting%' OR job_company LIKE '%advisory%' OR
          job_company LIKE '%deloitte%' OR job_company LIKE '%pwc%' OR
          job_company LIKE '%ey%' OR job_company LIKE '%kpmg%' OR
          job_company LIKE '%accenture%' OR job_company LIKE '%mckinsey%' OR
          job_company LIKE '%bain%' OR job_company LIKE '%bcg%' OR
          job_company LIKE '%dr. wieselhuber%' OR job_company LIKE '%arup%' OR
          job_company LIKE '%io-consultants%' OR job_company LIKE '%io-consult%' THEN
      job_categories := array_append(job_categories, 'strategy-business-design');
    ELSIF job_company LIKE '%tech%' OR job_company LIKE '%technology%' OR
          job_company LIKE '%apple%' OR job_company LIKE '%google%' OR
          job_company LIKE '%microsoft%' OR job_company LIKE '%amazon%' OR
          job_company LIKE '%siemens%' OR job_company LIKE '%airbus%' OR
          job_company LIKE '%rohde%' OR job_company LIKE '%schwarz%' OR
          job_company LIKE '%mongodb%' OR job_company LIKE '%codec%' OR
          job_company LIKE '%exeon%' OR job_company LIKE '%axians%' OR
          job_company LIKE '%expedia%' OR job_company LIKE '%tiktok%' OR
          job_company LIKE '%meta%' OR job_company LIKE '%facebook%' THEN
      job_categories := array_append(job_categories, 'tech-transformation');
    ELSIF job_description LIKE '%real estate%' OR job_company LIKE '%cushman%' OR
          job_company LIKE '%wakefield%' OR job_company LIKE '%oxford properties%' OR
          job_company LIKE '%knight frank%' OR job_company LIKE '%caron real estate%' THEN
      job_categories := array_append(job_categories, 'operations-supply-chain');
    ELSIF job_company LIKE '%hotel%' OR job_company LIKE '%hospitality%' OR
          job_company LIKE '%radisson%' OR job_company LIKE '%marriott%' OR
          job_company LIKE '%hyatt%' OR job_company LIKE '%melia%' OR
          job_company LIKE '%social hub%' THEN
      job_categories := array_append(job_categories, 'sales-client-success');
    ELSIF job_company LIKE '%retail%' OR job_company LIKE '%mango%' OR
          job_company LIKE '%zara%' OR job_company LIKE '%levi%' OR
          job_company LIKE '%edeka%' OR job_company LIKE '%lidl%' OR
          job_company LIKE '%aldi%' OR job_company LIKE '%hema%' OR
          job_company LIKE '%primark%' OR job_company LIKE '%foot locker%' THEN
      job_categories := array_append(job_categories, 'sales-client-success');
    ELSIF job_company LIKE '%media%' OR job_company LIKE '%entertainment%' OR
          job_company LIKE '%prosieben%' OR job_company LIKE '%burdaf%' OR
          job_company LIKE '%hearst%' OR job_company LIKE '%nbc%' OR
          job_company LIKE '%sky%' OR job_company LIKE '%universal music%' THEN
      job_categories := array_append(job_categories, 'marketing-growth');
    ELSIF job_company LIKE '%danone%' OR job_company LIKE '%nestle%' OR
          job_company LIKE '%unilever%' OR job_company LIKE '%p&g%' OR
          job_company LIKE '%loreal%' OR job_company LIKE '%beiersdorf%' OR
          job_company LIKE '%bayer%' OR job_company LIKE '%johnson%' THEN
      job_categories := array_append(job_categories, 'operations-supply-chain');
    END IF;
    
    -- Title-based matching for internships (even without descriptions)
    -- Operations keywords
    IF NOT ('operations-supply-chain' = ANY(job_categories)) AND (
      job_title LIKE '%HR%' OR job_title LIKE '%human resources%' OR
      job_title LIKE '%talent%' OR job_title LIKE '%recruitment%' OR
      job_title LIKE '%einkauf%' OR job_title LIKE '%procurement%' OR
      job_title LIKE '%kundenservice%' OR job_title LIKE '%customer service%' OR
      job_title LIKE '%PMO%' OR job_title LIKE '%project management%' OR
      job_title LIKE '%coordination%' OR job_title LIKE '%coordination%' OR
      job_title LIKE '%placement coordinator%' OR job_title LIKE '%work placement%'
    ) THEN
      job_categories := array_append(job_categories, 'operations-supply-chain');
    END IF;
    
    -- Sales keywords
    IF NOT ('sales-client-success' = ANY(job_categories)) AND (
      job_title LIKE '%kundenservice%' OR job_title LIKE '%customer service%' OR
      job_title LIKE '%client%' OR job_title LIKE '%customer%' OR
      job_title LIKE '%guest%' OR job_title LIKE '%store%' OR
      job_title LIKE '%retail%' OR job_title LIKE '%vendedor%' OR
      job_title LIKE '%commercial%' OR job_title LIKE '%administrativo comercial%'
    ) THEN
      job_categories := array_append(job_categories, 'sales-client-success');
    END IF;
    
    -- Marketing keywords
    IF NOT ('marketing-growth' = ANY(job_categories)) AND (
      job_title LIKE '%PR%' OR job_title LIKE '%public relations%' OR
      job_title LIKE '%public affairs%' OR job_title LIKE '%communications%' OR
      job_title LIKE '%content%' OR job_title LIKE '%social media%' OR
      job_title LIKE '%events%' OR job_title LIKE '%community%' OR
      job_title LIKE '%loyalty%' OR job_title LIKE '%engagement%'
    ) THEN
      job_categories := array_append(job_categories, 'marketing-growth');
    END IF;
    
    -- Finance keywords
    IF NOT ('finance-investment' = ANY(job_categories)) AND (
      job_title LIKE '%tax%' OR job_title LIKE '%real estate%' OR
      job_title LIKE '%accounting%' OR job_title LIKE '%finance%' OR
      job_title LIKE '%financial%' OR job_title LIKE '%audit%'
    ) THEN
      job_categories := array_append(job_categories, 'finance-investment');
    END IF;
    
    -- Tech keywords
    IF NOT ('tech-transformation' = ANY(job_categories)) AND (
      job_title LIKE '%IT%' OR job_title LIKE '%software%' OR
      job_title LIKE '%developer%' OR job_title LIKE '%machine learning%' OR
      job_title LIKE '%AI%' OR job_title LIKE '%UX%' OR
      job_title LIKE '%cybersecurity%' OR job_title LIKE '%system%' OR
      job_title LIKE '%automatisation%' OR job_title LIKE '%robotic%' OR
      job_title LIKE '%copilot%' OR job_title LIKE '%business central%'
    ) THEN
      job_categories := array_append(job_categories, 'tech-transformation');
    END IF;
    
    -- Sustainability keywords
    IF NOT ('sustainability-esg' = ANY(job_categories)) AND (
      job_title LIKE '%nachhaltigkeit%' OR job_title LIKE '%sustainability%' OR
      job_title LIKE '%ESG%' OR job_title LIKE '%CSR%' OR
      job_title LIKE '%environmental%' OR job_title LIKE '%social%'
    ) THEN
      job_categories := array_append(job_categories, 'sustainability-esg');
    END IF;
  END IF;

  -- Set experience flags if not already set
  IF NEW.is_graduate IS NULL OR NEW.is_graduate = false THEN
    IF job_title LIKE '%graduate%' OR job_title LIKE '%grad scheme%' OR
       job_title LIKE '%graduate programme%' OR job_title LIKE '%trainee program%' OR
       job_description LIKE '%graduate scheme%' OR job_description LIKE '%graduate programme%' OR
       NEW.experience_required = 'graduate' THEN
      NEW.is_graduate := true;
    END IF;
  END IF;

  IF NEW.is_internship IS NULL OR NEW.is_internship = false THEN
    IF job_title LIKE '%intern%' OR job_title LIKE '%internship%' OR
       job_title LIKE '%stage%' OR job_title LIKE '%praktikum%' OR
       job_title LIKE '%prácticas%' OR job_title LIKE '%tirocinio%' OR
       job_title LIKE '%becario%' OR job_title LIKE '%werkstudent%' OR
       job_title LIKE '%placement%' OR job_title LIKE '%summer%' OR
       job_title LIKE '%winter%' OR job_description LIKE '%internship%' OR
       NEW.experience_required = 'internship' THEN
      NEW.is_internship := true;
    END IF;
  END IF;

  -- Set experience_required if missing
  IF NEW.experience_required IS NULL OR NEW.experience_required = '' THEN
    IF NEW.is_internship = true THEN
      NEW.experience_required := 'internship';
    ELSIF NEW.is_graduate = true THEN
      NEW.experience_required := 'graduate';
    ELSIF job_title LIKE '%junior%' OR job_title LIKE '%entry level%' THEN
      NEW.experience_required := 'entry-level';
    ELSIF 'early-career' = ANY(job_categories) THEN
      NEW.experience_required := 'entry-level';
    END IF;
  END IF;

  -- Update categories
  NEW.categories := job_categories;
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Run categorization on INSERT or UPDATE
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_categorize_job ON jobs;
CREATE TRIGGER trigger_categorize_job
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION categorize_job();

-- ============================================================================
-- VERIFICATION: Test the trigger
-- ============================================================================
-- You can test with:
-- INSERT INTO jobs (title, company, description, job_hash, job_url, source, is_active, status)
-- VALUES ('Business Analyst', 'Test Company', 'We are looking for a business analyst to analyze data and provide insights', 'test-hash-123', 'https://test.com', 'test', true, 'active');
-- 
-- Then check: SELECT categories FROM jobs WHERE job_hash = 'test-hash-123';
-- Should include 'data-analytics' and 'early-career'

