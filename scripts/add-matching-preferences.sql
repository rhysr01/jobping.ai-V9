-- Add new matching preference fields to users table
-- These fields will help improve AI matching accuracy

-- Remote work preference
ALTER TABLE users ADD COLUMN IF NOT EXISTS remote_preference VARCHAR(20) DEFAULT 'flexible';

-- Industry preferences (array of industries)
ALTER TABLE users ADD COLUMN IF NOT EXISTS industries TEXT[] DEFAULT '{}';

-- Company size preference
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_size_preference VARCHAR(20) DEFAULT 'any';

-- Skills and technologies (array of skills)
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_remote_preference ON users(remote_preference);
CREATE INDEX IF NOT EXISTS idx_users_company_size ON users(company_size_preference);
CREATE INDEX IF NOT EXISTS idx_users_industries ON users USING GIN(industries);
CREATE INDEX IF NOT EXISTS idx_users_skills ON users USING GIN(skills);

-- Update existing users with default values
UPDATE users 
SET 
  remote_preference = COALESCE(remote_preference, 'flexible'),
  company_size_preference = COALESCE(company_size_preference, 'any'),
  industries = COALESCE(industries, '{}'),
  skills = COALESCE(skills, '{}')
WHERE 
  remote_preference IS NULL 
  OR company_size_preference IS NULL 
  OR industries IS NULL 
  OR skills IS NULL;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('remote_preference', 'industries', 'company_size_preference', 'skills')
ORDER BY column_name;
