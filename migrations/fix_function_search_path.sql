-- ============================================================================
-- FIX FUNCTION SEARCH PATH VULNERABILITIES
-- ============================================================================
-- Sets search_path = 'public' for all functions to prevent SQL injection
-- ============================================================================

-- ============================================================================
-- Fix all functions by using their full signatures (handles overloaded functions)
-- ============================================================================

-- Fix all versions of each function using DO block to handle overloads
DO $$
DECLARE
    func_record RECORD;
    sql_stmt TEXT;
BEGIN
    -- Fix summarize_job (all versions)
    FOR func_record IN 
        SELECT oid::regprocedure as func_sig
        FROM pg_proc
        WHERE proname = 'summarize_job'
        AND pronamespace = 'public'::regnamespace
    LOOP
        sql_stmt := 'ALTER FUNCTION ' || func_record.func_sig || ' SET search_path = ''public''';
        EXECUTE sql_stmt;
        RAISE NOTICE 'Fixed: %', func_record.func_sig;
    END LOOP;
    
    -- Fix generate_send_token (all versions)
    FOR func_record IN 
        SELECT oid::regprocedure as func_sig
        FROM pg_proc
        WHERE proname = 'generate_send_token'
        AND pronamespace = 'public'::regnamespace
    LOOP
        sql_stmt := 'ALTER FUNCTION ' || func_record.func_sig || ' SET search_path = ''public''';
        EXECUTE sql_stmt;
        RAISE NOTICE 'Fixed: %', func_record.func_sig;
    END LOOP;
    
    -- Fix get_users_for_re_engagement (all versions)
    FOR func_record IN 
        SELECT oid::regprocedure as func_sig
        FROM pg_proc
        WHERE proname = 'get_users_for_re_engagement'
        AND pronamespace = 'public'::regnamespace
    LOOP
        sql_stmt := 'ALTER FUNCTION ' || func_record.func_sig || ' SET search_path = ''public''';
        EXECUTE sql_stmt;
        RAISE NOTICE 'Fixed: %', func_record.func_sig;
    END LOOP;
    
    -- Fix calculate_next_retry (all versions)
    FOR func_record IN 
        SELECT oid::regprocedure as func_sig
        FROM pg_proc
        WHERE proname = 'calculate_next_retry'
        AND pronamespace = 'public'::regnamespace
    LOOP
        sql_stmt := 'ALTER FUNCTION ' || func_record.func_sig || ' SET search_path = ''public''';
        EXECUTE sql_stmt;
        RAISE NOTICE 'Fixed: %', func_record.func_sig;
    END LOOP;
    
    -- Fix is_email_suppressed (all versions)
    FOR func_record IN 
        SELECT oid::regprocedure as func_sig
        FROM pg_proc
        WHERE proname = 'is_email_suppressed'
        AND pronamespace = 'public'::regnamespace
    LOOP
        sql_stmt := 'ALTER FUNCTION ' || func_record.func_sig || ' SET search_path = ''public''';
        EXECUTE sql_stmt;
        RAISE NOTICE 'Fixed: %', func_record.func_sig;
    END LOOP;
    
    -- Fix generate_job_fingerprint (all versions)
    FOR func_record IN 
        SELECT oid::regprocedure as func_sig
        FROM pg_proc
        WHERE proname = 'generate_job_fingerprint'
        AND pronamespace = 'public'::regnamespace
    LOOP
        sql_stmt := 'ALTER FUNCTION ' || func_record.func_sig || ' SET search_path = ''public''';
        EXECUTE sql_stmt;
        RAISE NOTICE 'Fixed: %', func_record.func_sig;
    END LOOP;
    
    -- Fix update_user_engagement (all versions)
    FOR func_record IN 
        SELECT oid::regprocedure as func_sig
        FROM pg_proc
        WHERE proname = 'update_user_engagement'
        AND pronamespace = 'public'::regnamespace
    LOOP
        sql_stmt := 'ALTER FUNCTION ' || func_record.func_sig || ' SET search_path = ''public''';
        EXECUTE sql_stmt;
        RAISE NOTICE 'Fixed: %', func_record.func_sig;
    END LOOP;
    
    -- Fix find_similar_users (all versions)
    FOR func_record IN 
        SELECT oid::regprocedure as func_sig
        FROM pg_proc
        WHERE proname = 'find_similar_users'
        AND pronamespace = 'public'::regnamespace
    LOOP
        sql_stmt := 'ALTER FUNCTION ' || func_record.func_sig || ' SET search_path = ''public''';
        EXECUTE sql_stmt;
        RAISE NOTICE 'Fixed: %', func_record.func_sig;
    END LOOP;
    
    -- Fix match_jobs_by_embedding (all versions)
    FOR func_record IN 
        SELECT oid::regprocedure as func_sig
        FROM pg_proc
        WHERE proname = 'match_jobs_by_embedding'
        AND pronamespace = 'public'::regnamespace
    LOOP
        sql_stmt := 'ALTER FUNCTION ' || func_record.func_sig || ' SET search_path = ''public''';
        EXECUTE sql_stmt;
        RAISE NOTICE 'Fixed: %', func_record.func_sig;
    END LOOP;
    
    RAISE NOTICE 'All functions fixed successfully';
END $$;

-- Verify all functions have search_path set
SELECT 
    proname as function_name,
    proconfig as config_settings
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'summarize_job',
    'generate_send_token',
    'get_users_for_re_engagement',
    'calculate_next_retry',
    'is_email_suppressed',
    'generate_job_fingerprint',
    'update_user_engagement',
    'find_similar_users',
    'match_jobs_by_embedding'
  )
ORDER BY proname;

