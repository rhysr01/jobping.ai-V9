# Job Collection Maximization Recommendations

**Date**: December 27, 2025  
**Status**: 🔴 Critical Issues Identified

---

## 📊 Current Status

### Active Scrapers (Last 7 Days)
- ✅ **Adzuna**: 587 jobs (avg ~84/day) - **MOST RELIABLE**
- ✅ **Arbeitnow**: 240 jobs (avg ~34/day) - **CONSISTENT**
- ✅ **Reed**: 215 jobs (avg ~31/day) - **VARIABLE** (0-190/day)

### Inactive/Broken Scrapers
- ❌ **JobSpy (General)**: 0 jobs in last 7 days (last ran Nov 28)
- ❌ **JobSpy (Internships)**: 0 jobs in last 7 days (last ran Dec 8)
- ❌ **JobSpy (Career Path Roles)**: 0 jobs in last 7 days (last ran Dec 8)
- ❌ **CareerJet**: 0 jobs EVER (never worked)

### Current Collection Rate
- **Daily Average**: ~250-350 jobs/day
- **Weekly Total**: ~1,042 jobs/week
- **Monthly Potential**: ~10,500 jobs/month (if all scrapers worked)

---

## 🚨 Critical Issues

### 1. JobSpy Scrapers Not Running (HIGH PRIORITY)
**Problem**: JobSpy scrapers are configured in orchestrator but haven't executed in weeks.

**Impact**: 
- Missing ~1,000-2,000 jobs/week from Indeed/Glassdoor/Google Jobs
- JobSpy was historically producing 1,866+ jobs total

**Root Cause**: Need to investigate:
- Are the script files present? (`scripts/jobspy-save.cjs`, `scripts/jobspy-internships-only.cjs`, `scripts/jobspy-career-path-roles.cjs`)
- Are they failing silently?
- Python dependencies installed correctly?
- Timeout issues?

**Action Items**:
1. ✅ Verify script files exist
2. ✅ Check GitHub Actions logs for JobSpy errors
3. ✅ Test JobSpy scrapers manually
4. ✅ Fix any Python/dependency issues
5. ✅ Add better error logging

### 2. CareerJet Never Produced Jobs (MEDIUM PRIORITY)
**Problem**: CareerJet scraper has 0 jobs ever despite being integrated.

**Impact**: Missing EU job board coverage (CareerJet aggregates multiple EU sources)

**Root Cause**: Likely API key issue or API endpoint problem

**Action Items**:
1. ✅ Verify `CAREERJET_API_KEY` is set in GitHub Secrets
2. ✅ Test CareerJet API manually
3. ✅ Check API response/errors
4. ✅ Verify API quota/limits
5. ✅ Add better error handling/logging

---

## 🎯 Maximization Recommendations

### Immediate Actions (This Week)

#### 1. Fix JobSpy Scrapers ⚡
**Priority**: CRITICAL  
**Expected Impact**: +1,000-2,000 jobs/week

```bash
# Test JobSpy scrapers manually
node scrapers/wrappers/jobspy-wrapper.cjs
node scripts/jobspy-internships-only.cjs
node scripts/jobspy-career-path-roles.cjs
```

**Check**:
- Python 3.11 installed
- `jobspy` package installed (`pip install jobspy`)
- Scripts execute without errors
- Jobs are being saved to database

#### 2. Fix CareerJet Scraper ⚡
**Priority**: HIGH  
**Expected Impact**: +200-500 jobs/week

```bash
# Test CareerJet manually
node scrapers/careerjet.cjs
```

**Check**:
- `CAREERJET_API_KEY` environment variable set
- API returns valid responses
- Error messages in logs

#### 3. Increase Scraping Frequency
**Current**: Every 4 hours  
**Recommended**: Every 2-3 hours during peak hours

**GitHub Actions Change**:
```yaml
schedule:
  # Run every 2 hours during business hours (6am-10pm UTC)
  - cron: '0 6-22/2 * * *'  # Every 2 hours, 6am-10pm UTC
  # Run every 4 hours overnight
  - cron: '0 0,4 * * *'      # Midnight and 4am UTC
```

**Expected Impact**: +20-30% more jobs (faster job discovery)

### Short-Term Optimizations (Next 2 Weeks)

#### 4. Optimize Query Strategies
**Current**: Fixed query sets  
**Recommended**: Dynamic query rotation based on:
- User signup preferences
- Job market trends
- Seasonal patterns

**Action**: Review and expand query sets in:
- `scrapers/careerjet.cjs` (QUERY_SETS)
- `scripts/jobspy-save.cjs` (query rotation)

#### 5. Expand City Coverage
**Current**: 17 cities in CareerJet, variable in others  
**Recommended**: Ensure all scrapers cover same cities

**Cities to Verify**:
- London, Dublin, Paris, Berlin, Munich, Amsterdam
- Madrid, Barcelona, Milan, Rome, Lisbon, Brussels
- Manchester, Edinburgh, Belfast, Cork, Hamburg, Zurich

#### 6. Increase Scraper Targets
**Current Targets**:
- Adzuna: 500
- Reed: 200
- CareerJet: 450
- Arbeitnow: 80

**Recommended** (if API limits allow):
- Adzuna: 800-1000 (currently producing ~84/day)
- Reed: 300-400 (variable, can handle more)
- CareerJet: 600-800 (if fixed)
- Arbeitnow: 150-200 (currently producing ~34/day)

### Long-Term Improvements (Next Month)

#### 7. Add New Job Sources
**Potential Sources**:
- **LinkedIn Jobs API** (if available)
- **Monster API** (EU coverage)
- **StepStone** (DACH region)
- **TotalJobs** (UK)
- **CV-Library** (UK)

#### 8. Implement Smart Deduplication
**Current**: Basic hash-based deduplication  
**Recommended**: 
- Fuzzy matching for similar jobs
- Company name normalization
- Location normalization improvements

**Expected Impact**: Reduce false duplicates, increase unique job count

#### 9. Add Job Quality Scoring
**Current**: All jobs treated equally  
**Recommended**:
- Score jobs by description completeness
- Prioritize jobs with salary information
- Boost jobs from verified companies

#### 10. Implement Retry Logic
**Current**: Single attempt per scraper  
**Recommended**:
- Retry failed scrapers with exponential backoff
- Mark scrapers as "degraded" if consistently failing
- Alert on scraper failures

---

## 📈 Expected Impact Summary

### If All Issues Fixed:
- **Current**: ~1,042 jobs/week (~150/day)
- **With JobSpy Fixed**: ~2,500-3,500 jobs/week (~350-500/day)
- **With CareerJet Fixed**: +200-500 jobs/week
- **With Frequency Increase**: +20-30% overall
- **Total Potential**: ~3,500-4,500 jobs/week (~500-650/day)

### ROI by Priority:
1. **Fix JobSpy**: +1,500 jobs/week (HIGHEST ROI)
2. **Fix CareerJet**: +300 jobs/week
3. **Increase Frequency**: +200-300 jobs/week
4. **Optimize Queries**: +100-200 jobs/week

---

## 🔧 Implementation Checklist

### Week 1: Critical Fixes
- [ ] Test and fix JobSpy scrapers
- [ ] Test and fix CareerJet scraper
- [ ] Verify all API keys in GitHub Secrets
- [ ] Add better error logging
- [ ] Test scrapers manually

### Week 2: Optimizations
- [ ] Increase scraping frequency
- [ ] Expand query sets
- [ ] Verify city coverage
- [ ] Increase scraper targets (if API limits allow)

### Week 3-4: Monitoring & Improvements
- [ ] Monitor job collection rates
- [ ] Analyze which queries produce most jobs
- [ ] Optimize based on data
- [ ] Plan new job sources

---

## 📊 Monitoring Metrics

Track these metrics weekly:
1. **Jobs per source per day**
2. **Scraper success rate** (jobs found / attempts)
3. **Scraper failure rate** (errors / total runs)
4. **Time to discover new jobs** (job age when first scraped)
5. **Duplicate rate** (duplicates / total jobs)

---

## 🚀 Quick Wins

1. **Fix JobSpy** → +1,500 jobs/week (2-3 hours work)
2. **Fix CareerJet** → +300 jobs/week (1-2 hours work)
3. **Increase frequency** → +200 jobs/week (5 minutes config change)

**Total Quick Win Potential**: +2,000 jobs/week with ~4 hours of work

---

## 📝 Notes

- GitHub Actions runs every 4 hours
- Orchestrator includes 7 scrapers (JobSpy x3, Adzuna, Reed, CareerJet, Arbeitnow)
- Only 3 scrapers currently active (Adzuna, Reed, Arbeitnow)
- JobSpy scrapers were historically producing 1,866+ jobs
- CareerJet has never worked (0 jobs ever)

---

**Next Steps**: Start with fixing JobSpy scrapers - highest ROI and quickest win.

