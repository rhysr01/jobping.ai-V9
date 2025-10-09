-- Fix RLS policies on jobs table to allow API access
-- The match-users API needs to read jobs but RLS is blocking it

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.jobs;
DROP POLICY IF EXISTS "jobs_select_policy" ON public.jobs;
DROP POLICY IF EXISTS "authenticated_read_jobs" ON public.jobs;

-- Create permissive SELECT policy for authenticated and service_role
CREATE POLICY "allow_all_select_jobs"
ON public.jobs
FOR SELECT
TO authenticated, anon, service_role
USING (true);

-- Verify RLS is enabled
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
-- Test the policy
SELECT COUNT(*) as accessible_jobs 
FROM public.jobs 
WHERE status = 'active';

