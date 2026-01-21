# Database Audit Report - January 2025

**Date:** 2025-01-XX  
**Audit Type:** Security & Performance Analysis  
**Tools Used:** Supabase MCP Advisors, Schema Comparison

## Executive Summary

This audit identified **critical security vulnerabilities** and **performance optimization opportunities** in the JobPing database schema. The primary concerns are:

1. **3 tables missing RLS protection** (CRITICAL)
2. **Users view exposing auth.users** (CRITICAL)
3. **RLS policy performance issues** (HIGH)
4. **Missing RLS policies** (MEDIUM)

---

## 🔴 CRITICAL SECURITY ISSUES

### 1. Tables Without Row Level Security (RLS)

**Severity:** ERROR  
**Impact:** Data exposure risk - tables accessible without proper access control

#### Affected Tables:
- `custom_scans` - Contains user email and search criteria
- `fallback_match_events` - Contains user email and preference relaxation data
- `scraping_priorities` - Contains demand tracking data

**Current State:**
- Tables exist in `public` schema
- RLS is **NOT enabled**
- Accessible via PostgREST API without restrictions
- Code uses service role client (`getDatabaseClient()`) which bypasses RLS, but this is not a proper security measure

**Risk:**
- If API keys are compromised, attackers could read/write these tables
- No protection against unauthorized access
- GDPR compliance risk (user email exposure)

**Recommendation:**
```sql
-- Enable RLS on all three tables
ALTER TABLE public.custom_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fallback_match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_priorities ENABLE ROW LEVEL SECURITY;

-- Add policies for custom_scans (service role only - internal use)
CREATE POLICY "Service role can manage custom_scans" ON public.custom_scans
  FOR ALL USING ((select auth.role()) = 'service_role');

-- Add policies for fallback_match_events (service role only)
CREATE POLICY "Service role can manage fallback_match_events" ON public.fallback_match_events
  FOR ALL USING ((select auth.role()) = 'service_role');

-- Add policies for scraping_priorities (service role only)
CREATE POLICY "Service role can manage scraping_priorities" ON public.scraping_priorities
  FOR ALL USING ((select auth.role()) = 'service_role');
```

**Code Impact:**
- ✅ No code changes needed - already using service role client
- ⚠️ Ensure all access goes through `getDatabaseClient()` (service role)

---

### 2. Users View Exposing auth.users

**Severity:** ERROR  
**Impact:** Potential exposure of sensitive user authentication data

**Current State:**
```sql
CREATE OR REPLACE VIEW public.users AS
SELECT id, email, created_at, updated_at, last_sign_in_at, ...
FROM auth.users;
```

**Issues:**
1. View exposes `auth.users` to `anon` and `authenticated` roles
2. View uses `SECURITY DEFINER` property (runs with creator's permissions)
3. No RLS policies on the view
4. View is accessible via PostgREST API

**Risk:**
- Users could potentially query other users' data
- Authentication metadata exposure
- Violates principle of least privilege

**Recommendation:**
```sql
-- Option 1: Add RLS policies to the view (if view must remain)
-- Note: Views don't support RLS directly, need to use security_barrier

-- Option 2: Remove view and use direct auth.users queries with proper RLS
-- This is the recommended approach for Supabase

-- Option 3: Create a function-based approach with proper security
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only return if requesting user matches or is service role
  IF (SELECT auth.uid()) = user_id OR (SELECT auth.role()) = 'service_role' THEN
    RETURN QUERY
    SELECT u.id, u.email, u.created_at
    FROM auth.users u
    WHERE u.id = user_id;
  END IF;
END;
$$;
```

**Code Impact:**
- Review all `from("users")` queries in codebase
- Update to use function-based approach or direct `auth.users` with RLS
- Files affected:
  - `app/api/signup/metadata/route.ts` (line 38-42)
  - `app/api/matches/free/route.ts` (line 45-49)
  - Other files using `users` view

---

### 3. Security Definer View

**Severity:** ERROR  
**Impact:** View executes with creator's permissions, not querying user's permissions

**Current State:**
- `public.users` view uses `SECURITY DEFINER`
- This means queries run with elevated permissions

**Recommendation:**
- Remove `SECURITY DEFINER` or replace view with function-based approach
- Use `SECURITY INVOKER` if view must remain

---

## 🟡 HIGH PRIORITY ISSUES

### 4. RLS Policy Performance Issues

**Severity:** WARN  
**Impact:** Suboptimal query performance at scale

**Issue:** RLS policies use `auth.uid()` and `auth.role()` directly, causing re-evaluation for each row.

**Affected Policies:**
- `jobs`: "Only authenticated users can insert jobs"
- `jobs`: "Only service role can update jobs"
- `user_matches`: "Users can read their own matches"
- `user_matches`: "Users can update their own matches"
- `user_matches`: "Service role can manage all matches"
- `user_job_preferences`: "Users can read their own preferences"
- `user_job_preferences`: "Users can manage their own preferences"

**Current Pattern (SLOW):**
```sql
USING (auth.uid() = user_id)  -- Evaluated for each row
```

**Recommended Pattern (FAST):**
```sql
USING ((select auth.uid()) = user_id)  -- Evaluated once per query
```

**Migration:**
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own matches" ON public.user_matches;
DROP POLICY IF EXISTS "Users can update their own matches" ON public.user_matches;
DROP POLICY IF EXISTS "Service role can manage all matches" ON public.user_matches;
DROP POLICY IF EXISTS "Only authenticated users can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Only service role can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can read their own preferences" ON public.user_job_preferences;
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_job_preferences;

-- Recreate with optimized pattern
CREATE POLICY "Users can read their own matches" ON public.user_matches
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own matches" ON public.user_matches
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Service role can manage all matches" ON public.user_matches
  FOR ALL USING ((select auth.role()) = 'service_role');

CREATE POLICY "Only authenticated users can insert jobs" ON public.jobs
  FOR INSERT WITH CHECK ((select auth.role()) = 'service_role');

CREATE POLICY "Only service role can update jobs" ON public.jobs
  FOR UPDATE USING ((select auth.role()) = 'service_role');

CREATE POLICY "Users can read their own preferences" ON public.user_job_preferences
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage their own preferences" ON public.user_job_preferences
  FOR ALL USING ((select auth.uid()) = user_id);
```

**Performance Impact:**
- Significant improvement for queries scanning many rows
- Reduces CPU usage on database server
- Better scalability

---

### 5. Multiple Permissive Policies

**Severity:** WARN  
**Impact:** Performance degradation - multiple policies must be evaluated

**Affected Tables:**
- `user_matches` - Multiple SELECT/UPDATE policies for same roles
- `user_job_preferences` - Multiple SELECT policies for same roles

**Issue:**
Multiple permissive policies for the same role/action combination cause all policies to be evaluated, reducing performance.

**Recommendation:**
Consolidate policies into single policy per role/action:

```sql
-- For user_matches: Combine user and service role policies
DROP POLICY IF EXISTS "Users can read their own matches" ON public.user_matches;
DROP POLICY IF EXISTS "Service role can manage all matches" ON public.user_matches;

CREATE POLICY "Users and service role can access matches" ON public.user_matches
  FOR SELECT USING (
    (select auth.uid()) = user_id OR 
    (select auth.role()) = 'service_role'
  );

-- Similar consolidation for UPDATE and other operations
```

---

## 🟢 MEDIUM PRIORITY ISSUES

### 6. Embedding Queue Missing RLS Policies

**Severity:** INFO  
**Impact:** RLS enabled but no policies defined

**Current State:**
- `embedding_queue` has RLS enabled
- No policies exist
- Effectively blocks all access (even service role)

**Recommendation:**
```sql
CREATE POLICY "Service role can manage embedding_queue" ON public.embedding_queue
  FOR ALL USING ((select auth.role()) = 'service_role');
```

---

### 7. Function Search Path Issues

**Severity:** WARN  
**Impact:** Potential security risk from search_path manipulation

**Affected Functions:**
- `normalize_city_name`
- `clean_company_name`
- `clean_job_data_before_insert`

**Recommendation:**
```sql
ALTER FUNCTION public.normalize_city_name SET search_path = public;
ALTER FUNCTION public.clean_company_name SET search_path = public;
ALTER FUNCTION public.clean_job_data_before_insert SET search_path = public;
```

---

### 8. Unused Indexes

**Severity:** INFO  
**Impact:** Wasted storage and slower writes

**Unused Indexes:**
- `idx_user_matches_user_id` on `user_matches`
- `idx_user_matches_status` on `user_matches`
- `jobs_embedding_idx` on `jobs`
- `idx_embedding_queue_status_priority` on `embedding_queue`
- `idx_custom_scans_user_email` on `custom_scans`
- `idx_custom_scans_status` on `custom_scans`
- `idx_fallback_events_user_email` on `fallback_match_events`
- `idx_fallback_events_relaxation_level` on `fallback_match_events`
- `idx_scraping_priorities_demand` on `scraping_priorities`

**Recommendation:**
- Review query patterns before removing
- May be needed for future queries
- Consider keeping if tables will grow significantly

---

## 📊 CODE vs DATABASE MISMATCHES

### Schema Alignment

✅ **TypeScript types match database schema** - `lib/database.types.ts` is in sync with actual database

### Access Patterns

**Current Pattern:**
- Code uses `getDatabaseClient()` which uses service role key
- This bypasses RLS entirely
- Works for internal APIs but not secure for user-facing endpoints

**Recommendation:**
- ✅ Keep service role for internal/cron operations
- ⚠️ Ensure user-facing endpoints use authenticated client with proper RLS
- Review all API routes to ensure correct client usage

**Files Using Service Role (OK for internal use):**
- `app/api/signup/metadata/route.ts` - Uses service role, but queries `users` view
- `app/api/cron/*` - All cron jobs correctly use service role
- `utils/core/database-pool.ts` - Centralized service role client

---

## 🔧 RECOMMENDED ACTION PLAN

### Phase 1: Critical Security Fixes (Immediate)

1. **Enable RLS on missing tables**
   - Create migration: `20250102_enable_rls_on_new_tables.sql`
   - Add RLS policies for service role access
   - Test with existing code paths

2. **Fix users view security**
   - Option A: Remove view, use function-based approach
   - Option B: Add proper RLS policies (if view must remain)
   - Update all code references

3. **Fix SECURITY DEFINER view**
   - Remove or replace with SECURITY INVOKER

### Phase 2: Performance Optimization (This Week)

1. **Optimize RLS policies**
   - Update all policies to use `(select auth.uid())` pattern
   - Consolidate multiple permissive policies
   - Test performance improvements

2. **Add missing RLS policy**
   - Add policy for `embedding_queue` table

### Phase 3: Code Quality (Next Sprint)

1. **Fix function search_path**
   - Set explicit search_path for all functions

2. **Review unused indexes**
   - Analyze query patterns
   - Remove truly unused indexes

---

## 📝 MIGRATION CHECKLIST

- [ ] Create migration file for RLS on new tables
- [ ] Create migration for RLS policy optimization
- [ ] Create migration for users view fix
- [ ] Create migration for function search_path
- [ ] Test migrations on staging environment
- [ ] Update code references if users view changes
- [ ] Deploy to production
- [ ] Monitor for performance improvements
- [ ] Verify RLS policies are working correctly

---

## 🔗 REFERENCES

- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [RLS Performance Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)
- [Security Definer Views](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)
- [Multiple Permissive Policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)

---

## 📅 NEXT AUDIT

**Recommended:** Quarterly database audits  
**Next Review:** April 2025
