-- ============================================================================
-- FIX WORK ENVIRONMENT DETECTION
-- ============================================================================
-- Improves work_environment detection from location and description fields
-- Updates jobs where work_environment is NULL or incorrectly set
-- ============================================================================

-- Create function to detect and update work environment
CREATE OR REPLACE FUNCTION fix_work_environment()
RETURNS TABLE (
    updated_count INTEGER,
    remote_set INTEGER,
    hybrid_set INTEGER,
    onsite_set INTEGER
) AS $$
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
        FROM jobs
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
            UPDATE jobs
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
$$ LANGUAGE plpgsql;

-- Execute the function to fix work environments
SELECT * FROM fix_work_environment();

-- Verify distribution
SELECT 
    work_environment,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM jobs
WHERE is_active = true
GROUP BY work_environment
ORDER BY count DESC;

-- Drop the function after use (or keep it for future use)
-- DROP FUNCTION IF EXISTS fix_work_environment();

