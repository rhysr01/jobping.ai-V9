-- Clear all test users and their data for fresh testing
-- Run this in Supabase SQL Editor

-- Step 1: Delete all matches (has foreign key to users)
DELETE FROM matches;

-- Step 2: Delete all users
DELETE FROM users;

-- Step 3: Verify cleanup
SELECT 
  (SELECT COUNT(*) FROM users) as remaining_users,
  (SELECT COUNT(*) FROM matches) as remaining_matches,
  (SELECT COUNT(*) FROM match_logs) as remaining_logs;

-- Optional: Also clear match logs if you want completely fresh start
-- DELETE FROM match_logs;

