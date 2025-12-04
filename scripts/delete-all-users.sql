-- SQL Script to Delete All Users from JobPing
-- WARNING: This will permanently delete ALL users and their associated data
-- Run this script at your own risk. Consider backing up your database first.

BEGIN;

-- Step 1: Delete user-related data from matches table (by user_email)
DELETE FROM matches WHERE user_email IN (SELECT email FROM users);

-- Step 2: Delete API key usage records (via api_keys)
DELETE FROM api_key_usage 
WHERE api_key_id IN (
  SELECT id FROM api_keys WHERE user_id IN (SELECT id FROM users)
);

-- Step 3: Delete API keys (has foreign key to users.id)
DELETE FROM api_keys WHERE user_id IN (SELECT id FROM users);

-- Step 4: Finally, delete all users
DELETE FROM users;

-- Show summary
DO $$
DECLARE
  deleted_users_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_users_count = ROW_COUNT;
  RAISE NOTICE 'Successfully deleted % users and all associated data', deleted_users_count;
END $$;

COMMIT;

-- Verification queries (run separately after transaction)
-- SELECT COUNT(*) as remaining_users FROM users;
-- SELECT COUNT(*) as remaining_matches FROM matches;
-- SELECT COUNT(*) as remaining_api_keys FROM api_keys;

