-- Migration: Fix postal jobs being incorrectly categorized as tech
-- Description: Update the categorize_job function to exclude postal and manual labor jobs from tech categorization

-- This migration updates the existing categorize_job() function to prevent
-- postal, retail, and manual labor jobs from being miscategorized as tech roles

CREATE OR REPLACE FUNCTION public.categorize_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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

  -- ============================================================================
  -- STEP 1: Ensure 'early-career' category (matches form entry_level_preference)
  -- ============================================================================
  job_categories := COALESCE(NEW.categories, ARRAY[]::TEXT[]);

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
  -- Only apply if no career path assigned yet
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
  -- STEP 2-10: All the existing categorization logic for each career path
  -- (Keeping all existing logic - this is a summary, full logic preserved)
  -- ============================================================================

  -- Strategy & Business Design
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

  -- Finance & Investment
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
       job_title LIKE '%junior auditor%' OR
       job_title LIKE '%accounting intern%' OR
       job_title LIKE '%audit intern%' OR
       job_title LIKE '%corporate finance%' OR
       job_title LIKE '%equity research%' OR
       job_title LIKE '%financial planning%' OR
       job_title LIKE '%investment analyst%' OR
       job_title LIKE '%junior accountant%' OR
       job_title LIKE '%junior auditor%' OR
       job_title LIKE '%accounting intern%' OR
       job_title LIKE '%audit intern%' OR
       job_title LIKE '%corporate finance%' OR
       job_title LIKE '%equity research%' OR
       job_title LIKE '%financial planning%' OR
       job_title LIKE '%investment analyst%' OR
       job_description LIKE '%investment banking%' OR
       job_description LIKE '%corporate finance%' OR
       job_description LIKE '%financial analyst%' OR
       job_description LIKE '%accounting%' OR
       job_description LIKE '%audit%' OR
       job_description LIKE '%trading%' OR
       job_description LIKE '%equity research%' THEN
      job_categories := array_append(job_categories, 'finance-investment');
    END IF;
  END IF;

  -- Sales & Client Success
  IF NOT ('sales-client-success' = ANY(job_categories)) THEN
    IF job_title LIKE '%sales development representative%' OR
       job_title LIKE '%sdr%' OR
       job_title LIKE '%business development representative%' OR
       job_title LIKE '%bdr%' OR
       job_title LIKE '%account executive%' OR
       job_title LIKE '%sales associate%' OR
       job_title LIKE '%sales intern%' OR
       job_title LIKE '%customer success%' OR
       job_title LIKE '%client success%' OR
       job_title LIKE '%account management%' OR
       job_title LIKE '%inside sales%' OR
       job_title LIKE '%sales trainee%' OR
       job_title LIKE '%business development%' OR
       job_description LIKE '%sales development%' OR
       job_description LIKE '%business development%' OR
       job_description LIKE '%sdr%' OR
       job_description LIKE '%bdr%' OR
       job_description LIKE '%customer success%' OR
       job_description LIKE '%client success%' OR
       job_description LIKE '%account executive%' OR
       job_description LIKE '%inside sales%' THEN
      job_categories := array_append(job_categories, 'sales-client-success');
    END IF;
  END IF;

  -- Marketing & Growth
  IF NOT ('marketing-growth' = ANY(job_categories)) THEN
    IF job_title LIKE '%marketing intern%' OR
       job_title LIKE '%growth marketing%' OR
       job_title LIKE '%digital marketing%' OR
       job_title LIKE '%content marketing%' OR
       job_title LIKE '%social media%' OR
       job_title LIKE '%brand management%' OR
       job_title LIKE '%marketing coordinator%' OR
       job_title LIKE '%marketing assistant%' OR
       job_title LIKE '%marketing analyst%' OR
       job_title LIKE '%growth hacker%' OR
       job_title LIKE '%performance marketing%' OR
       job_description LIKE '%marketing%' AND (job_description LIKE '%intern%' OR job_description LIKE '%analyst%' OR job_description LIKE '%assistant%' OR job_description LIKE '%coordinator%') OR
       job_description LIKE '%digital marketing%' OR
       job_description LIKE '%social media%' OR
       job_description LIKE '%content marketing%' OR
       job_description LIKE '%brand%' AND (job_description LIKE '%marketing%' OR job_description LIKE '%assistant%') OR
       job_description LIKE '%growth marketing%' THEN
      job_categories := array_append(job_categories, 'marketing-growth');
    END IF;
  END IF;

  -- Data & Analytics
  IF NOT ('data-analytics' = ANY(job_categories)) THEN
    IF job_title LIKE '%data analyst%' OR
       job_title LIKE '%data scientist%' OR
       job_title LIKE '%business intelligence%' OR
       job_title LIKE '%data engineer%' OR
       job_title LIKE '%analytics intern%' OR
       job_title LIKE '%data intern%' OR
       job_title LIKE '%bi analyst%' OR
       job_title LIKE '%data analyst trainee%' OR
       job_title LIKE '%junior data analyst%' OR
       job_description LIKE '%data analyst%' OR
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
    END IF;
  END IF;

  -- Operations & Supply Chain
  IF NOT ('operations-supply-chain' = ANY(job_categories)) THEN
    IF job_title LIKE '%operations analyst%' OR
       job_title LIKE '%supply chain%' OR
       job_title LIKE '%logistics analyst%' OR
       job_title LIKE '%procurement%' OR
       job_title LIKE '%operations intern%' OR
       job_title LIKE '%process improvement%' OR
       job_title LIKE '%operations excellence%' OR
       job_title LIKE '%hr business partner%' OR
       job_title LIKE '%talent acquisition%' OR
       job_title LIKE '%human resources%' OR
       job_description LIKE '%operations%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%intern%' OR job_description LIKE '%coordinator%') OR
       job_description LIKE '%supply chain%' OR
       job_description LIKE '%logistics%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%intern%') OR
       job_description LIKE '%procurement%' OR
       job_description LIKE '%hr%' OR
       job_description LIKE '%human resources%' OR
       job_description LIKE '%talent%' AND (job_description LIKE '%acquisition%' OR job_description LIKE '%recruitment%') OR
       job_description LIKE '%process improvement%' THEN
      job_categories := array_append(job_categories, 'operations-supply-chain');
    END IF;
  END IF;

  -- Product & Innovation
  IF NOT ('product-innovation' = ANY(job_categories)) THEN
    IF job_title LIKE '%associate product manager%' OR
       job_title LIKE '%apm%' OR
       job_title LIKE '%product analyst%' OR
       job_title LIKE '%junior product manager%' OR
       job_title LIKE '%product intern%' OR
       job_title LIKE '%product management%' OR
       job_title LIKE '%user experience%' OR
       job_title LIKE '%ux designer%' OR
       job_title LIKE '%ui designer%' OR
       job_title LIKE '%product designer%' OR
       job_title LIKE '%design intern%' OR
       job_title LIKE '%innovation analyst%' OR
       job_title LIKE '%product development%' OR
       job_description LIKE '%product management%' OR
       job_description LIKE '%product analyst%' OR
       job_description LIKE '%associate product manager%' OR
       job_description LIKE '%apm%' OR
       job_description LIKE '%product development%' OR
       job_description LIKE '%user experience%' OR
       job_description LIKE '%ux%' OR
       job_description LIKE '%product owner%' OR
       job_description LIKE '%innovation%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%intern%') THEN
      job_categories := array_append(job_categories, 'product-innovation');
    END IF;
  END IF;

  -- Tech & Engineering
  -- Exclude postal, retail, and manual labor jobs that might have misleading keywords
  IF NOT ('tech-transformation' = ANY(job_categories)) AND
     NOT (job_title LIKE '%postal%' OR job_title LIKE '%mail%' OR job_title LIKE '%clerk%' OR
          job_title LIKE '%retail%' OR job_title LIKE '%cashier%' OR job_title LIKE '%warehouse%' OR
          job_title LIKE '%driver%' OR job_title LIKE '%delivery%' OR job_title LIKE '%manual%' OR
          job_company LIKE '%postal%' OR job_company LIKE '%royal mail%' OR job_company LIKE '%usps%') THEN
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

  -- Sustainability & ESG
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
       job_title LIKE '%esg%' OR
       job_title LIKE '%sustainability%' OR
       job_description LIKE '%esg%' OR
       job_description LIKE '%sustainability%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%intern%' OR job_description LIKE '%strategy%') OR
       job_description LIKE '%environmental%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%social%') OR
       job_description LIKE '%climate%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%change%') OR
       job_description LIKE '%green finance%' OR
       job_description LIKE '%carbon%' AND (job_description LIKE '%analyst%' OR job_description LIKE '%reporting%') THEN
      job_categories := array_append(job_categories, 'sustainability-esg');
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 14: Filter out non-business-school relevant jobs AFTER categorization attempts
  -- ============================================================================
  IF NOT (job_categories && ARRAY['strategy-business-design', 'finance-investment', 'sales-client-success', 'marketing-growth', 'data-analytics', 'operations-supply-chain', 'product-innovation', 'tech-transformation', 'sustainability-esg']) THEN
    -- If no business category assigned, add general-management as fallback
    IF NOT ('general-management' = ANY(job_categories)) THEN
      job_categories := array_append(job_categories, 'general-management');
    END IF;
  END IF;

  -- Update the job record with the computed categories
  NEW.categories := job_categories;

  RETURN NEW;
END;
$$;