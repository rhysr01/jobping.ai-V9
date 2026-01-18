-- Setup pgvector extension for semantic search
-- This enables vector similarity search capabilities

-- Enable pgvector extension (requires superuser privileges)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to jobs table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'jobs' AND column_name = 'embedding') THEN
        ALTER TABLE public.jobs ADD COLUMN embedding vector(1536);
        CREATE INDEX IF NOT EXISTS jobs_embedding_idx ON public.jobs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    END IF;
END $$;

-- Note: User preference embeddings are stored in user_job_preferences table
-- No need to add preference_embedding to users view

-- Fix function search_path security vulnerability
-- Adds SET search_path = '' to prevent SQL injection via search_path manipulation
--
-- Affected functions:
-- 1. parse_and_update_location
-- 2. find_similar_users
-- 3. fix_work_environment
-- 4. categorize_job
-- 5. match_jobs_by_embedding

-- Fix 1: parse_and_update_location
CREATE OR REPLACE FUNCTION public.parse_and_update_location()
RETURNS TABLE(updated_count integer, city_filled integer, country_filled integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    job_record RECORD;
    parsed_city TEXT;
    parsed_country TEXT;
    loc_lower TEXT;
    is_remote BOOLEAN;
    is_eu BOOLEAN;
    parts TEXT[];
    temp_parts TEXT[];
    part TEXT;
    city_count INTEGER := 0;
    country_count INTEGER := 0;
    total_updated INTEGER := 0;
    
    -- EU countries list
    eu_countries TEXT[] := ARRAY[
        'austria', 'belgium', 'bulgaria', 'croatia', 'cyprus', 'czech republic',
        'denmark', 'estonia', 'finland', 'france', 'germany', 'greece', 'hungary',
        'ireland', 'italy', 'latvia', 'lithuania', 'luxembourg', 'malta',
        'netherlands', 'poland', 'portugal', 'romania', 'slovakia', 'slovenia',
        'spain', 'sweden', 'united kingdom', 'uk', 'gb', 'great britain', 
        'england', 'scotland', 'wales', 'northern ireland',
        'switzerland', 'ch', 'norway', 'no'
    ];
    
    -- Known EU cities
    eu_cities TEXT[] := ARRAY[
        'london', 'manchester', 'birmingham', 'edinburgh', 'glasgow', 'leeds', 'liverpool',
        'dublin', 'cork', 'galway',
        'berlin', 'munich', 'hamburg', 'cologne', 'frankfurt', 'stuttgart', 'düsseldorf', 'duesseldorf',
        'paris', 'marseille', 'lyon', 'toulouse', 'nice', 'nantes', 'strasbourg',
        'madrid', 'barcelona', 'valencia', 'seville', 'bilbao', 'málaga', 'malaga',
        'rome', 'milan', 'naples', 'turin', 'florence', 'bologna',
        'amsterdam', 'rotterdam', 'the hague', 'den haag', 'utrecht', 'eindhoven',
        'brussels', 'antwerp', 'ghent', 'bruges',
        'vienna', 'salzburg', 'graz', 'innsbruck',
        'zurich', 'geneva', 'basel', 'bern', 'lausanne',
        'stockholm', 'gothenburg', 'goteborg', 'malmö', 'malmo', 'uppsala',
        'copenhagen', 'aarhus', 'odense', 'aalborg',
        'oslo', 'bergen', 'trondheim', 'stavanger',
        'helsinki', 'espoo', 'tampere', 'vantaa',
        'warsaw', 'krakow', 'gdansk', 'wroclaw', 'poznan', 'wrocław', 'poznań',
        'prague', 'brno', 'ostrava', 'plzen', 'plzeň',
        'budapest', 'debrecen', 'szeged', 'miskolc',
        'lisbon', 'porto', 'coimbra',
        'athens', 'thessaloniki', 'patras', 'heraklion'
    ];
BEGIN
    -- Process jobs missing city or country
    FOR job_record IN 
        SELECT id, location, city, country
        FROM public.jobs
        WHERE is_active = true
          AND (
              city IS NULL OR city = '' OR
              country IS NULL OR country = ''
          )
          AND location IS NOT NULL
          AND location != ''
    LOOP
        loc_lower := LOWER(TRIM(job_record.location));
        
        -- Check for remote indicators
        is_remote := loc_lower ~ 'remote|work\s+from\s+home|wfh|anywhere';
        
        -- Skip remote jobs for city/country parsing
        IF is_remote THEN
            CONTINUE;
        END IF;
        
        -- Check if location contains EU country
        is_eu := FALSE;
        FOREACH parsed_country IN ARRAY eu_countries
        LOOP
            IF loc_lower LIKE '%' || parsed_country || '%' THEN
                is_eu := TRUE;
                EXIT;
            END IF;
        END LOOP;
        
        -- Extract city and country using comma separation
        temp_parts := string_to_array(loc_lower, ',');
        parts := ARRAY[]::TEXT[];
        
        -- Trim and filter out empty strings
        FOREACH part IN ARRAY temp_parts
        LOOP
            part := TRIM(part);
            IF part != '' THEN
                parts := array_append(parts, part);
            END IF;
        END LOOP;
        
        IF array_length(parts, 1) > 0 THEN
            parsed_city := parts[1];
        ELSE
            parsed_city := loc_lower;
        END IF;
        
        IF array_length(parts, 1) > 1 THEN
            parsed_country := parts[array_length(parts, 1)];
        ELSE
            parsed_country := '';
        END IF;
        
        -- If single part and it's a known EU city, leave country empty
        IF array_length(parts, 1) = 1 THEN
            IF parsed_city = ANY(eu_cities) THEN
                parsed_country := '';
            END IF;
        END IF;
        
        -- If country not detected but city is known EU city, infer EU
        IF NOT is_eu AND parsed_country = '' THEN
            IF parsed_city = ANY(eu_cities) THEN
                is_eu := TRUE;
            END IF;
        END IF;
        
        -- Update job if city or country is missing
        IF (job_record.city IS NULL OR job_record.city = '') AND parsed_city != '' THEN
            UPDATE public.jobs
            SET city = INITCAP(parsed_city), updated_at = NOW()
            WHERE id = job_record.id;
            city_count := city_count + 1;
            total_updated := total_updated + 1;
        END IF;
        
        IF (job_record.country IS NULL OR job_record.country = '') AND parsed_country != '' THEN
            UPDATE public.jobs
            SET country = INITCAP(parsed_country), updated_at = NOW()
            WHERE id = job_record.id;
            country_count := country_count + 1;
            IF (job_record.city IS NOT NULL AND job_record.city != '') THEN
                -- Don't double count if city was also updated
                total_updated := total_updated + 1;
            ELSE
                total_updated := total_updated + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT total_updated, city_count, country_count;
END;
$$;

-- Fix 2: find_similar_users
CREATE OR REPLACE FUNCTION public.find_similar_users(query_embedding vector, match_threshold double precision DEFAULT 0.85, match_count integer DEFAULT 50)
RETURNS TABLE(id uuid, email text, similarity_score double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    1 - (u.preference_embedding <=> query_embedding) as similarity_score
  FROM public.users u
  WHERE 
    u.preference_embedding IS NOT NULL
    AND u.active = true
    AND (1 - (u.preference_embedding <=> query_embedding)) >= match_threshold
  ORDER BY u.preference_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Fix 3: fix_work_environment
CREATE OR REPLACE FUNCTION public.fix_work_environment()
RETURNS TABLE(updated_count integer, remote_set integer, hybrid_set integer, onsite_set integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    job_record RECORD;
    loc_lower TEXT;
    desc_lower TEXT;
    detected_env TEXT;
    remote_count INTEGER := 0;
    hybrid_count INTEGER := 0;
    onsite_count INTEGER := 0;
    total_updated INTEGER := 0;
BEGIN
    -- Process jobs with NULL or potentially incorrect work_environment
    FOR job_record IN 
        SELECT id, location, description, work_environment
        FROM public.jobs
        WHERE is_active = true
          AND (
              work_environment IS NULL OR
              -- If marked as on-site but has remote indicators, likely wrong
              (work_environment = 'on-site' AND (
                  LOWER(COALESCE(location, '')) ~ 'remote|work\s+from\s+home|wfh|anywhere|flexible' OR
                  LOWER(COALESCE(description, '')) ~ 'remote|work\s+from\s+home|wfh|anywhere|flexible'
              ))
          )
    LOOP
        loc_lower := LOWER(COALESCE(job_record.location, ''));
        desc_lower := LOWER(COALESCE(job_record.description, ''));
        detected_env := NULL;
        
        -- Check for remote indicators (strongest signal)
        IF loc_lower ~ 'remote|work\s+from\s+home|wfh|anywhere' OR
           desc_lower ~ 'remote|work\s+from\s+home|wfh|anywhere|fully\s+remote|100%\s+remote' THEN
            detected_env := 'remote';
        -- Check for hybrid indicators
        ELSIF loc_lower ~ 'hybrid|flexible|partially\s+remote|2-3\s+days|3\s+days\s+remote' OR
              desc_lower ~ 'hybrid|flexible|partially\s+remote|2-3\s+days|3\s+days\s+remote|mix\s+of\s+remote' THEN
            detected_env := 'hybrid';
        -- Default to on-site if no remote indicators
        ELSE
            detected_env := 'on-site';
        END IF;
        
        -- Only update if different from current value or if NULL
        IF job_record.work_environment IS NULL OR job_record.work_environment != detected_env THEN
            UPDATE public.jobs
            SET work_environment = detected_env, updated_at = NOW()
            WHERE id = job_record.id;
            
            total_updated := total_updated + 1;
            
            IF detected_env = 'remote' THEN
                remote_count := remote_count + 1;
            ELSIF detected_env = 'hybrid' THEN
                hybrid_count := hybrid_count + 1;
            ELSE
                onsite_count := onsite_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT total_updated, remote_count, hybrid_count, onsite_count;
END;
$$;

-- Fix 4: categorize_job (trigger function)
-- This is a very long function with extensive categorization logic
-- We're preserving all existing logic but adding search_path security
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
       job_title LIKE '%corporate finance%' OR
       job_title LIKE '%m&a analyst%' OR
       job_title LIKE '%mergers acquisitions%' OR
       job_title LIKE '%treasury analyst%' OR
       job_title LIKE '%junior tax%' OR
       job_title LIKE '%finance graduate%' OR
       job_title LIKE '%impiegato amministrativo%' OR
       job_title LIKE '%contabile%' OR
       job_title LIKE '%accounting%' OR
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

  -- Sales & Client Success
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

  -- Marketing & Growth
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

  -- Data & Analytics
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

  -- Operations & Supply Chain
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

  -- Product & Innovation
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

  -- Tech & Engineering
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
  -- STEP 11: Set is_internship flag (matches form entry_level_preference)
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

  -- ============================================================================
  -- STEP 12: Set is_graduate flag (matches form entry_level_preference)
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
$$;

-- Fix 5: match_jobs_by_embedding
CREATE OR REPLACE FUNCTION public.match_jobs_by_embedding(query_embedding vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 200, city_filter text[] DEFAULT NULL::text[], career_path_filter text[] DEFAULT NULL::text[])
RETURNS TABLE(id integer, job_hash text, title text, company text, location text, description text, semantic_score double precision, embedding_distance double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.job_hash,
    j.title,
    j.company,
    j.location,
    j.description,
    -- Cosine similarity (1 - distance)
    1 - (j.embedding <=> query_embedding) as semantic_score,
    j.embedding <=> query_embedding as embedding_distance
  FROM public.jobs j
  WHERE 
    j.embedding IS NOT NULL
    AND j.is_active = true
    AND (1 - (j.embedding <=> query_embedding)) >= match_threshold
    AND (city_filter IS NULL OR j.city = ANY(city_filter))
    AND (career_path_filter IS NULL OR j.categories && career_path_filter)
  ORDER BY j.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

