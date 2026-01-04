# Database Analysis - Job Ingestion & Filtering
**Date**: January 4, 2026
**Analysis Method**: Supabase MCP Tools

---

## 🎯 Executive Summary

### ✅ **Overall Health: GOOD**
- **12,574 total jobs** in database
- **9,775 active jobs** (77.7%)
- **Data quality** is excellent (minimal missing fields)
- **No duplicate job_hash issues** (unique constraint working)
- **Embeddings queue backlog**: 10,979 jobs pending (needs attention)

### ⚠️ **Critical Issues Found:**
1. **JOOBLE: Missing work_environment** - 149 jobs have NULL work_environment
2. **EMBEDDING BACKLOG**: 10,979 jobs waiting for embeddings (oldest from Nov 28)
3. **Some jobs missing work-type categories** (requires investigation)

---

## 📊 Job Ingestion Analysis

### Source Performance (Last 7 Days)

| Source | Total Jobs | Active | Inactive | Last 24h | Last 7d | Avg Age | Status |
|--------|-----------|---------|----------|----------|---------|---------|--------|
| jobspy-indeed | 5,196 | 4,790 | 406 | 1,540 | 5,077 | 4.2 days | ✅ HEALTHY |
| jobspy-career-roles | 3,702 | 3,036 | 666 | 0 | 3,683 | 6.2 days | ⚠️ STALE (no jobs since Dec 29) |
| adzuna | 1,688 | 719 | 969 | 0 | 386 | 10.5 days | ⚠️ STALE (no jobs since Dec 29) |
| arbeitnow | 705 | 236 | 469 | 205 | 211 | 11.1 days | ✅ HEALTHY |
| jobspy-internships | 570 | 522 | 48 | 120 | 568 | 5.2 days | ✅ HEALTHY |
| reed | 558 | 323 | 235 | 23 | 338 | 5.8 days | ✅ HEALTHY |
| jooble | 155 | 149 | 6 | 0 | 155 | 6.2 days | ⚠️ ALL from Dec 29 |

### Key Insights:
- **JobSpy (Indeed)** is the dominant source (41% of all jobs)
- **Adzuna & Jooble** haven't run since Dec 29 (now fixed in recent updates)
- **Career-roles scraper** is intentionally disabled (file missing)
- **Good deactivation rate**: Only 22.3% inactive (healthy turnover)

---

## 🧹 Data Quality Analysis

### Field Completeness: ✅ EXCELLENT

| Issue | Count | Status |
|-------|-------|--------|
| Missing Title | 0 | ✅ Perfect |
| Missing Company | 3 | ✅ Minimal |
| Missing Location | 36 | ✅ Good (0.3%) |
| Missing Description | 1 | ✅ Perfect |
| Missing Job URL | 0 | ✅ Perfect |
| Empty Categories | 0 | ✅ Perfect |
| Missing Company Name | 0 | ✅ Perfect |

**Overall**: 99.7% data completeness!

---

## 🏷️ Category Distribution

### Top Categories (Active Jobs):

| Category | Job Count | % of Total |
|----------|-----------|-----------|
| early-career | 9,774 | 100% ✅ |
| entry-level | 6,347 | 64.9% |
| tech-transformation | 3,380 | 34.6% |
| internship | 2,690 | 27.5% |
| strategy-business-design | 2,026 | 20.7% |
| operations-supply-chain | 1,408 | 14.4% |
| finance-investment | 1,364 | 14.0% |
| marketing-growth | 1,153 | 11.8% |
| data-analytics | 1,098 | 11.2% |
| sales-client-success | 885 | 9.1% |
| product-innovation | 782 | 8.0% |
| creative-design | 634 | 6.5% |
| people-hr | 609 | 6.2% |
| graduate-programme | 384 | 3.9% |
| general | 368 | 3.8% |
| working-student | 265 | 2.7% |
| sustainability-esg | 228 | 2.3% |

### Analysis:
- ✅ All active jobs have `early-career` category (100% coverage)
- ✅ Good distribution across career paths
- ✅ Tech-transformation is the dominant career path (35%)
- ✅ 65% have specific work-type labels (entry-level, internship, graduate)

---

## 🔍 Filtering Analysis

### 1. Job Board Filtering: ✅ WORKING WELL

**Jobs with job board company names**: Only 6 jobs found
- 3 from "Indeed" (sources: jobspy-career-roles, jobspy-indeed)
- 3 from "Reed" (source: adzuna)

**Verdict**: Excellent! The processor is successfully filtering out job board companies.

---

### 2. Remote Jobs Filtering (Last 7 Days)

| Source | Total | Remote | Hybrid | On-Site | Missing | Remote % |
|--------|-------|--------|--------|---------|---------|----------|
| arbeitnow | 207 | 33 | 80 | 94 | 0 | 15.9% |
| reed | 239 | 17 | 27 | 195 | 0 | 7.1% |
| adzuna | 363 | 20 | 66 | 277 | 0 | 5.5% |
| jobspy-indeed | 4,699 | 14 | 18 | 4,667 | 0 | 0.3% |
| jobspy-career-roles | 3,036 | 5 | 12 | 3,019 | 0 | 0.2% |
| **jooble** | **149** | **0** | **0** | **0** | **149** | **N/A** |
| jobspy-internships | 522 | 0 | 2 | 520 | 0 | 0.0% |

### 🚨 **ISSUE FOUND: Jooble Missing Work Environment**
- **149 Jooble jobs** have NULL `work_environment`
- This prevents proper filtering and matching
- **Action Required**: Fix Jooble scraper to set work_environment

---

### 3. Years of Experience (YoE) Filtering

| Source | Total | With YoE | 3+ Years | 5+ Years | Avg YoE |
|--------|-------|----------|----------|----------|---------|
| adzuna | 363 | 5 | 3 | 3 | 5.6 years |
| jobspy-career-roles | 3,036 | 2 | 2 | 2 | **35.0 years** ⚠️ |
| reed | 239 | 1 | 0 | 0 | 1.0 years |
| Others | - | 0 | 0 | 0 | N/A |

### 🚨 **ISSUE FOUND: Career-Roles YoE Extraction Error**
- 2 jobs have `avg_min_yoe` of **35 years** (max 50!)
- This is clearly a regex extraction error
- Jobs should be filtered if min_yoe > 3
- **Action Required**: Fix YoE extraction in career-roles scraper

---

### 4. Visa Friendliness (Last 7 Days)

| Source | Total | Visa Friendly | Not Friendly | Unknown | % Friendly |
|--------|-------|---------------|--------------|---------|-----------|
| jobspy-career-roles | 3,036 | 238 | 0 | 2,798 | 7.8% |
| jobspy-indeed | 4,699 | 165 | 0 | 4,534 | 3.5% |
| jobspy-internships | 522 | 15 | 0 | 507 | 2.9% |
| reed | 239 | 11 | 0 | 228 | 4.6% |
| adzuna | 363 | 6 | 0 | 357 | 1.7% |
| jooble | 149 | 0 | 0 | 149 | 0.0% |
| arbeitnow | 207 | 0 | 0 | 207 | 0.0% |

### Analysis:
- ✅ Visa detection is working (435 jobs marked as friendly)
- ⚠️ High percentage of "unknown" (87.8%)
- This is acceptable - conservative approach
- No jobs incorrectly marked as "not visa friendly"

---

## 🚨 Critical Issues Requiring Action

### 1. **Embedding Queue Backlog - URGENT**
```
Total Pending: 10,979 jobs
Unprocessed: 10,979
Failed: 0
Oldest: November 28, 2025 (38 days old!)
```

**Impact**: 
- Jobs without embeddings can't be matched using vector similarity
- Affects matching quality for users
- Growing backlog indicates embedding generation is not keeping up

**Recommended Actions**:
1. Check if embedding generation cron job is running
2. Increase batch size for embedding generation
3. Consider adding more OpenAI API quota
4. Run manual embedding refresh: `npx tsx scripts/generate_all_embeddings.ts`

---

### 2. **Jooble Missing Work Environment - HIGH PRIORITY**
```
149 jobs have NULL work_environment
```

**Impact**:
- These jobs can't be properly filtered by work preference
- May cause matching errors
- Users can't filter by remote/hybrid/on-site

**Fix Location**: `/Users/rhysrowlands/jobping/scrapers/jooble.cjs`

**Recommended Fix**:
```javascript
// In Jooble scraper, ensure work_environment is set via processor
const processed = processIncomingJob({
  title: job.title,
  company: job.company,
  location: job.location,
  description: job.description,
  url: job.url,
  posted_at: job.posted_at
}, {
  source: 'jooble'
});

// The processor should set work_environment automatically
// If it's still NULL, add explicit detection in Jooble scraper
```

---

### 3. **Years of Experience Extraction Error - MEDIUM PRIORITY**

**Issue**: Career-roles scraper extracting absurd YoE values (35-50 years)

**Fix Location**: Check YoE extraction regex in processor or scraper

**Impact**: 
- These jobs should be filtered (min_yoe > 3)
- But only affects 2 jobs out of 3,036
- Low priority but should be fixed

---

## 📋 Database Security & Performance Advisories

### Security Issues (from Supabase):

1. **7 Views with SECURITY DEFINER** ⚠️
   - `user_engagement_summary`
   - `job_source_performance`
   - `ai_matching_quality_report`
   - `daily_system_health`
   - `category_performance_report`
   - `match_quality_by_category`
   - `category_noise_report`
   - **Action**: Review if SECURITY DEFINER is necessary

2. **7 Functions with Mutable Search Path** ⚠️
   - Various functions need `SET search_path = public`
   - **Action**: Add search_path to function definitions

3. **Extension in Public Schema** ⚠️
   - `vector` extension in public schema
   - **Action**: Move to separate schema (low priority)

4. **Postgres Version** ⚠️
   - Version 17.4.1.064 has security patches available
   - **Action**: Schedule database upgrade

### Performance Issues:

1. **RLS Policies Re-evaluating Auth Functions** ⚠️
   - `pending_digests`, `matches`, `match_logs` tables
   - **Fix**: Replace `auth.<function>()` with `(select auth.<function>())`
   - **Impact**: Improves query performance at scale

2. **18 Unused Indexes** ℹ️
   - Various indexes that have never been used
   - **Action**: Consider removing to save space (low priority)

3. **Multiple Permissive RLS Policies** ⚠️
   - `match_logs` and `matches` tables have duplicate policies
   - **Action**: Consolidate policies for better performance

---

## ✅ What's Working Well

1. **Job Deduplication**: No duplicate job_hash issues
2. **Data Quality**: 99.7% field completeness
3. **Category Tagging**: All jobs have proper categories
4. **Job Board Filtering**: Only 6 job board companies leaked through
5. **Early Career Classification**: 100% of jobs tagged as early-career
6. **Source Diversity**: 7 active sources providing jobs
7. **Database Indexes**: 38 indexes properly configured

---

## 📝 Recommended Next Steps

### Immediate (This Week):
1. ✅ **Fix Jooble work_environment** - Add to processor or scraper
2. ✅ **Run embedding generation** - Clear the 10,979 job backlog
3. ✅ **Fix YoE extraction** - Handle edge cases in regex

### Short Term (This Month):
4. **Fix RLS performance issues** - Update auth function calls
5. **Consolidate duplicate RLS policies** - Improve query performance
6. **Review unused indexes** - Remove if truly unnecessary

### Long Term (This Quarter):
7. **Upgrade Postgres version** - Apply security patches
8. **Move vector extension** - Out of public schema
9. **Add search_path to functions** - Security best practice

---

## 📊 Summary Statistics

- **Total Jobs**: 12,574
- **Active Jobs**: 9,775 (77.7%)
- **Data Quality**: 99.7% complete
- **Duplicate Rate**: 0.0% (perfect deduplication)
- **Category Coverage**: 100% (all jobs tagged)
- **Embedding Coverage**: 12.7% (10,979 pending)
- **Sources Active**: 7 scrapers
- **Job Board Leakage**: 0.05% (6 jobs)

---

**Analysis completed**: January 4, 2026
**Tools used**: Supabase MCP (execute_sql, get_advisors)
**Next review**: After implementing fixes

