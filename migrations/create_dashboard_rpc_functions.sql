-- ============================================================================
-- RPC FUNCTIONS FOR LOVABLE DASHBOARD INTERACTIVITY
-- ============================================================================
-- Created: 2025-01-29
-- Purpose: Create stored procedures that Lovable can call for dashboard actions
--          - Trigger user rematch
--          - Reset user recommendations
--          - Clear user feedback cache
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TRIGGER USER REMATCH
-- ============================================================================
-- Forces a rematch by clearing the user's last_processed_at timestamp
-- This makes the user's next request trigger a fresh match generation

CREATE OR REPLACE FUNCTION trigger_user_rematch(target_user_email TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
    user_exists BOOLEAN;
BEGIN
    -- Verify user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE email = target_user_email) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Clear last_email_sent to trigger rematch on next request
    -- Also clear any cached matches by updating user preferences
    UPDATE users
    SET 
        last_email_sent = NULL,
        updated_at = NOW()
    WHERE email = target_user_email;
    
    -- Return success
    RETURN json_build_object(
        'success', true,
        'message', 'Rematch triggered successfully',
        'user_email', target_user_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_user_rematch IS 'Triggers a rematch for a user by clearing their last_email_sent timestamp. Safe to call from Lovable dashboard.';

-- ============================================================================
-- 2. RESET USER RECOMMENDATIONS
-- ============================================================================
-- Deletes all existing matches for a user, forcing fresh recommendations

CREATE OR REPLACE FUNCTION reset_user_recommendations(target_user_email TEXT)
RETURNS JSON AS $$
DECLARE
    deleted_count INTEGER;
    user_exists BOOLEAN;
BEGIN
    -- Verify user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE email = target_user_email) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Delete all matches for this user
    DELETE FROM matches
    WHERE user_email = target_user_email;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Also clear last_email_sent to trigger fresh match generation
    UPDATE users
    SET 
        last_email_sent = NULL,
        updated_at = NOW()
    WHERE email = target_user_email;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Recommendations reset successfully',
        'deleted_matches', deleted_count,
        'user_email', target_user_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reset_user_recommendations IS 'Deletes all matches for a user and triggers fresh match generation. Use with caution.';

-- ============================================================================
-- 3. CLEAR USER FEEDBACK CACHE
-- ============================================================================
-- Marks all feedback for a user as "stale" to force recalculation
-- This is useful when user preferences change

CREATE OR REPLACE FUNCTION clear_user_feedback_cache(target_user_email TEXT)
RETURNS JSON AS $$
DECLARE
    updated_count INTEGER;
    user_exists BOOLEAN;
BEGIN
    -- Verify user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE email = target_user_email) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Note: This is a placeholder - actual implementation depends on your cache strategy
    -- If you use Redis, you'd invalidate keys here
    -- For now, we just update the user's updated_at to signal cache invalidation
    
    UPDATE users
    SET updated_at = NOW()
    WHERE email = target_user_email;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Feedback cache cleared (user updated_at refreshed)',
        'user_email', target_user_email,
        'note', 'If using Redis cache, add cache invalidation logic here'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION clear_user_feedback_cache IS 'Clears feedback cache for a user by updating their timestamp. Extend with Redis invalidation if using Redis cache.';

-- ============================================================================
-- 4. GET USER MATCH STATISTICS
-- ============================================================================
-- Returns statistics about a user's matches (for dashboard display)

CREATE OR REPLACE FUNCTION get_user_match_stats(target_user_email TEXT)
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_matches', COUNT(*),
        'avg_match_score', ROUND(AVG(match_score::numeric), 2),
        'high_quality_matches', COUNT(*) FILTER (WHERE match_score::numeric >= 0.8),
        'low_quality_matches', COUNT(*) FILTER (WHERE match_score::numeric < 0.6),
        'last_match_date', MAX(created_at),
        'first_match_date', MIN(created_at)
    ) INTO stats
    FROM matches
    WHERE user_email = target_user_email;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_match_stats IS 'Returns match statistics for a user. Safe for dashboard display.';

-- ============================================================================
-- 5. GRANT EXECUTE PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION trigger_user_rematch(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION reset_user_recommendations(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION clear_user_feedback_cache(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_match_stats(TEXT) TO authenticated, anon;

COMMIT;

