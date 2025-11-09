-- ============================================================================
-- ACTIVATE CATEGORIZATION TRIGGER (Quick Version)
-- ============================================================================
-- Creates the categorize_job function and trigger if they don't exist
-- This ensures all new jobs are automatically categorized
-- ============================================================================

-- First, create the function (from create-auto-categorization-trigger.sql)
-- We'll create a simplified version that handles the key categories

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

  -- Finance & Investment
  IF NOT ('finance-investment' = ANY(job_categories)) THEN
    IF job_title LIKE '%finance%' OR job_title LIKE '%financial%' OR
       job_title LIKE '%investment%' OR job_title LIKE '%banking%' OR
       job_title LIKE '%analyst%' AND (job_description LIKE '%finance%' OR job_description LIKE '%banking%') OR
       job_description LIKE '%investment%' OR job_description LIKE '%trading%' OR
       job_description LIKE '%equity%' OR job_description LIKE '%m&a%' OR
       job_company LIKE '%bank%' OR job_company LIKE '%finance%' OR
       job_company LIKE '%investment%' THEN
      job_categories := array_append(job_categories, 'finance-investment');
    END IF;
  END IF;

  -- Sales & Client Success (CRITICAL - was missing!)
  IF NOT ('sales-client-success' = ANY(job_categories)) THEN
    IF job_title LIKE '%sales%' OR job_title LIKE '%sdr%' OR job_title LIKE '%bdr%' OR
       job_title LIKE '%account executive%' OR job_title LIKE '%business development%' OR
       job_title LIKE '%client success%' OR job_title LIKE '%customer success%' OR
       job_title LIKE '%revenue operations%' OR job_description LIKE '%sales%' OR
       job_description LIKE '%business development%' OR job_description LIKE '%client acquisition%' OR
       job_company LIKE '%salesforce%' OR job_company LIKE '%hubspot%' THEN
      job_categories := array_append(job_categories, 'sales-client-success');
    END IF;
  END IF;

  -- Marketing & Growth
  IF NOT ('marketing-growth' = ANY(job_categories)) THEN
    IF job_title LIKE '%marketing%' OR job_title LIKE '%growth%' OR
       job_title LIKE '%social media%' OR job_title LIKE '%content%' OR
       job_title LIKE '%digital marketing%' OR job_description LIKE '%marketing%' OR
       job_description LIKE '%brand%' OR job_description LIKE '%campaign%' OR
       job_company LIKE '%marketing%' OR job_company LIKE '%advertising%' THEN
      job_categories := array_append(job_categories, 'marketing-growth');
    END IF;
  END IF;

  -- Data & Analytics
  IF NOT ('data-analytics' = ANY(job_categories)) THEN
    IF job_title LIKE '%data%' OR job_title LIKE '%analyst%' OR
       job_title LIKE '%analytics%' OR job_title LIKE '%business intelligence%' OR
       job_title LIKE '%data scientist%' OR job_title LIKE '%data engineer%' OR
       job_description LIKE '%data analysis%' OR job_description LIKE '%sql%' OR
       job_description LIKE '%python%' OR job_description LIKE '%tableau%' OR
       job_description LIKE '%powerbi%' THEN
      job_categories := array_append(job_categories, 'data-analytics');
    END IF;
  END IF;

  -- Operations & Supply Chain
  IF NOT ('operations-supply-chain' = ANY(job_categories)) THEN
    IF job_title LIKE '%operations%' OR job_title LIKE '%supply chain%' OR
       job_title LIKE '%logistics%' OR job_title LIKE '%procurement%' OR
       job_description LIKE '%operations%' OR job_description LIKE '%supply chain%' OR
       job_description LIKE '%logistics%' OR job_description LIKE '%procurement%' THEN
      job_categories := array_append(job_categories, 'operations-supply-chain');
    END IF;
  END IF;

  -- Product & Innovation
  IF NOT ('product-innovation' = ANY(job_categories)) THEN
    IF job_title LIKE '%product%' OR job_title LIKE '%apm%' OR
       job_title LIKE '%product manager%' OR job_title LIKE '%product owner%' OR
       job_title LIKE '%ux%' OR job_title LIKE '%ui%' OR job_title LIKE '%designer%' OR
       job_description LIKE '%product management%' OR job_description LIKE '%product development%' OR
       job_description LIKE '%user experience%' OR job_description LIKE '%innovation%' THEN
      job_categories := array_append(job_categories, 'product-innovation');
    END IF;
  END IF;

  -- Tech & Engineering
  IF NOT ('tech-transformation' = ANY(job_categories)) THEN
    IF job_title LIKE '%engineer%' OR job_title LIKE '%developer%' OR
       job_title LIKE '%software%' OR job_title LIKE '%devops%' OR
       job_title LIKE '%cloud%' OR job_title LIKE '%cybersecurity%' OR
       job_title LIKE '%it support%' OR job_title LIKE '%technical%' OR
       job_description LIKE '%software engineering%' OR job_description LIKE '%programming%' OR
       job_description LIKE '%coding%' OR job_description LIKE '%backend%' OR
       job_description LIKE '%frontend%' OR job_description LIKE '%api%' OR
       job_company LIKE '%tech%' OR job_company LIKE '%software%' OR
       job_company LIKE '%saas%' THEN
      job_categories := array_append(job_categories, 'tech-transformation');
    END IF;
  END IF;

  -- Sustainability & ESG
  IF NOT ('sustainability-esg' = ANY(job_categories)) THEN
    IF job_title LIKE '%esg%' OR job_title LIKE '%sustainability%' OR
       job_title LIKE '%environmental%' OR job_title LIKE '%climate%' OR
       job_title LIKE '%green%' OR job_description LIKE '%esg%' OR
       job_description LIKE '%environmental social governance%' OR
       job_description LIKE '%sustainability%' OR job_description LIKE '%carbon%' OR
       job_description LIKE '%renewable%' OR job_description LIKE '%green finance%' THEN
      job_categories := array_append(job_categories, 'sustainability-esg');
    END IF;
  END IF;

  -- Set is_internship flag
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

  -- Set is_graduate flag
  IF NEW.is_graduate IS NULL OR NEW.is_graduate = false THEN
    IF job_title LIKE '%graduate%' OR job_title LIKE '%grad%' OR
       job_description LIKE '%graduate%' OR job_description LIKE '%graduate program%' OR
       NEW.experience_required = 'graduate' THEN
      NEW.is_graduate := true;
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

-- Create trigger if it doesn't exist
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

