# Scraper Optimization Analysis

## Executive Summary

Your scrapers are **over-delivering** on the customer promise ("We search daily") by running **3x per day**, but there are several optimization opportunities to improve efficiency, reduce costs, and better align with your early-career focus.

## Current State vs Customer Promise

### Customer Promise
- **"We search daily"** (from `lib/copy.ts`)
- Weekly emails (Free: Thursday, Premium: Mon/Wed/Fri)
- 5 jobs per email
- Early-career roles across Europe

### Current Reality
- ✅ **Scrapers run 3x per day** (8am, 1pm, 6pm UTC) - **EXCEEDS promise**
- ✅ **GitHub Actions runs every 4 hours** - potentially redundant
- ✅ **6 core scrapers**: JobSpy, JobSpy Internships, Career Path Roles, Adzuna, Reed, Greenhouse
- ⚠️ **Sequential execution** with 1-second delays
- ⚠️ **Mixed filtering strategies** (pre-filter vs post-filter)

## Key Optimization Opportunities

### 1. ⚡ Frequency Optimization

**Issue**: Running 3x per day may be overkill for early-career jobs, which don't change as frequently as general job boards.

**Recommendation**:
- **Reduce to 2x per day** (morning + evening) or even **1x per day** (morning)
- Early-career jobs (internships, graduate schemes) are typically posted less frequently than senior roles
- This would still exceed the "daily" promise while reducing costs

**Impact**: 
- ~33-66% reduction in API calls
- Lower infrastructure costs
- Still exceeds customer promise

### 2. 🔍 Pre-filtering vs Post-filtering

**Current State**:
- ✅ **Reed**: Uses early-career search terms upfront (`EARLY_TERMS`)
- ✅ **Adzuna**: Uses early-career queries but still fetches then filters
- ⚠️ **JobSpy**: Uses early-career terms but fetches many results then filters

**Issue**: Some scrapers fetch all jobs then filter, wasting API quota on non-early-career jobs.

**Recommendation**:
- **Standardize all scrapers** to use early-career search terms upfront
- Ensure all scrapers use multilingual early-career terms (graduate, intern, junior, trainee, etc.)
- Move filtering logic earlier in the pipeline

**Example**: Adzuna already has good query sets (`QUERY_SETS`), but could be more aggressive:
```javascript
// Current: Fetches then filters
// Better: Use more specific queries upfront
'graduate programme', 'internship', 'junior analyst', 'entry level'
```

### 3. ⚙️ Parallelization

**Current State**: Scrapers run sequentially with 1-second delays between each.

**Issue**: 
- Total cycle time: ~10-15 minutes
- No parallelization means slower job discovery

**Recommendation**:
- Run independent scrapers in parallel (JobSpy, Adzuna, Reed can run simultaneously)
- Keep sequential only for dependent scrapers
- Use `Promise.all()` for parallel execution

**Impact**:
- Reduce cycle time from ~15min to ~5-7min
- Faster job discovery
- Better user experience (fresher jobs)

### 4. 🎯 Scraper Redundancy

**Current State**: Multiple JobSpy variants:
- `jobspy-save.cjs` (general)
- `jobspy-internships-only.cjs` (internships)
- `jobspy-career-path-roles.cjs` (career paths)

**Issue**: These may be fetching overlapping jobs, wasting API quota.

**Recommendation**:
- **Consolidate JobSpy scrapers** into one optimized scraper
- Use search term rotation instead of separate scrapers
- Track which search terms are most effective per city

**Impact**:
- Reduce API calls by ~30-40%
- Simpler maintenance
- Better coverage tracking

### 5. 📊 Stop Condition Optimization

**Current State**: 
- `SCRAPER_CYCLE_JOB_TARGET` defaults to 0 (unlimited) or can be set to 300
- Stop condition checks after each scraper

**Issue**: 
- May stop too early (missing good sources)
- May run too long (wasting quota on low-quality sources)

**Recommendation**:
- **Set smart targets per scraper** based on historical performance
- Prioritize high-performing scrapers (run first)
- Stop early if high-quality sources already delivered sufficient jobs

**Example**:
```javascript
const SCRAPER_TARGETS = {
  'jobspy': 100,        // High performer
  'adzuna': 150,        // High performer
  'reed': 50,           // Moderate performer
  'greenhouse': 30,     // Low volume but high quality
  'jobspy-internships': 40
};
```

### 6. 🌍 Geographic Optimization

**Current State**: Scrapers target all EU cities equally.

**Issue**: Some cities may have fewer early-career opportunities, wasting API calls.

**Recommendation**:
- **Prioritize high-performing cities** based on historical data
- Run full scrapes for top cities (London, Paris, Madrid, Milan)
- Run lighter scrapes for lower-performing cities
- Use signup-driven targeting (already implemented ✅)

**Impact**:
- Better ROI per API call
- Focus resources on cities with most opportunities

### 7. 🔄 GitHub Actions Redundancy

**Current State**: 
- Local automation runs 3x per day
- GitHub Actions runs every 4 hours

**Issue**: Potential overlap and redundancy.

**Recommendation**:
- **Choose one primary method** (recommend GitHub Actions for reliability)
- Disable local cron if using GitHub Actions
- Or use GitHub Actions as backup/fallback only

### 8. 💰 Cost Optimization

**Current State**: Multiple API calls per day across 6 scrapers.

**Optimization Opportunities**:
1. **Reduce frequency** (see #1)
2. **Better pre-filtering** (see #2)
3. **Consolidate scrapers** (see #4)
4. **Smart stop conditions** (see #5)

**Estimated Savings**: 40-50% reduction in API costs while maintaining or improving job quality.

## Recommended Action Plan

### Phase 1: Quick Wins (1-2 days)
1. ✅ Reduce frequency to 2x per day (morning + evening)
2. ✅ Enable parallelization for independent scrapers
3. ✅ Set smart stop conditions per scraper

### Phase 2: Medium-term (1 week)
4. ✅ Consolidate JobSpy scrapers
5. ✅ Optimize search terms (ensure all use early-career terms upfront)
6. ✅ Implement geographic prioritization

### Phase 3: Long-term (2-4 weeks)
7. ✅ Build scraper performance dashboard
8. ✅ Implement adaptive scraping (more frequent for high-performing sources)
9. ✅ A/B test different frequencies

## Metrics to Track

1. **Jobs per API call** (efficiency)
2. **Early-career job percentage** (quality)
3. **Time to discover new jobs** (freshness)
4. **Cost per job** (economics)
5. **Source diversity** (redundancy)

## Conclusion

Your scrapers are **functionally good** but can be **more efficient**. The main opportunities are:

1. **Reduce frequency** (still exceeds promise)
2. **Better pre-filtering** (use early-career terms upfront)
3. **Parallelization** (faster cycles)
4. **Consolidation** (reduce redundancy)

These optimizations will reduce costs by ~40-50% while maintaining or improving job quality and freshness.

---

## 🚨 CRITICAL UPDATE

**After analyzing production data, critical issues were discovered:**

1. **Adzuna scraper**: Hasn't run in 23 days (represents 52% of total jobs!)
2. **Reed scraper**: Hasn't run in 23 days
3. **Missing cities**: Stockholm, Copenhagen, Prague, Warsaw not being scraped at all

**See `SCRAPING_STRATEGY.md` for comprehensive analysis and fix plan.**

