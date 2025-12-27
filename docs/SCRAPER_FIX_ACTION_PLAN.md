# Scraper Fix Action Plan

**Date**: December 27, 2025  
**Status**: 🔴 Execution Required

---

## ✅ Diagnostic Results

All configuration checks passed:
- ✅ Python 3.11 installed
- ✅ JobSpy package installed
- ✅ All script files exist
- ✅ All API keys configured
- ✅ Database connection working
- ✅ Active scrapers working (Adzuna, Reed, Arbeitnow)

---

## 🔍 Root Cause Analysis

### JobSpy Scrapers Not Producing Jobs

**Symptoms**:
- Last JobSpy jobs: Nov 28 (General), Dec 8 (Internships, Career Path Roles)
- 0 jobs in last 7 days from any JobSpy source
- Scripts exist and are configured correctly

**Likely Causes**:
1. **GitHub Actions timeout** - JobSpy scrapers may be timing out (10 min limit)
2. **Silent failures** - Scripts may be failing but errors not logged
3. **Over-filtering** - Scripts may be filtering out all jobs as non-early-career
4. **Python path issues** - GitHub Actions may not find Python correctly

### CareerJet Never Produced Jobs

**Symptoms**:
- 0 jobs ever from CareerJet
- API key is configured
- Script exists

**Likely Causes**:
1. **API endpoint issue** - CareerJet API may have changed
2. **API key invalid** - Key may not be active/valid
3. **Rate limiting** - May be hitting API limits immediately
4. **Response parsing** - May be failing to parse API responses

---

## 🎯 Action Plan

### Phase 1: Immediate Testing (Today)

#### 1. Test JobSpy Scrapers Locally
```bash
# Test each scraper individually with timeout
timeout 600 node scrapers/wrappers/jobspy-wrapper.cjs
timeout 600 node scripts/jobspy-internships-only.cjs  
timeout 600 node scripts/jobspy-career-path-roles.cjs
```

**Check for**:
- Script execution time
- Error messages
- Jobs actually saved to database
- Filtering logic removing all jobs

#### 2. Test CareerJet Scraper Locally
```bash
timeout 600 node scrapers/careerjet.cjs
```

**Check for**:
- API response
- Error messages
- Jobs saved to database

#### 3. Check GitHub Actions Logs
- Review last 5 workflow runs
- Look for JobSpy/CareerJet errors
- Check execution times
- Verify Python is found

### Phase 2: Fixes (This Week)

#### Fix 1: Add Better Error Logging
**File**: `automation/real-job-runner.cjs`

Add detailed error logging:
```javascript
catch (error) {
  console.error('❌ JobSpy scraper failed:', error.message);
  console.error('❌ Stack:', error.stack);
  console.error('❌ Full error:', JSON.stringify(error, null, 2));
  return 0;
}
```

#### Fix 2: Increase Timeout for JobSpy
**File**: `automation/real-job-runner.cjs`

JobSpy scrapers may need more time:
```javascript
timeout: 1200000, // 20 minutes (up from 10)
```

#### Fix 3: Add Pre-flight Checks
**File**: `automation/real-job-runner.cjs`

Before running scrapers, verify:
- Python is available
- JobSpy is installed
- Scripts exist
- API keys are set

#### Fix 4: Fix CareerJet API Issues
**File**: `scrapers/careerjet.cjs`

Add:
- Better error handling
- API response validation
- Detailed logging
- Fallback mechanisms

### Phase 3: Monitoring (Ongoing)

#### Add Scraper Health Checks
- Track scraper success rate
- Alert on consecutive failures
- Monitor execution times
- Track jobs per scraper per run

---

## 📋 Implementation Checklist

### Today
- [ ] Test JobSpy scrapers locally
- [ ] Test CareerJet scraper locally
- [ ] Review GitHub Actions logs
- [ ] Identify specific failure points

### This Week
- [ ] Add better error logging
- [ ] Increase timeouts if needed
- [ ] Fix CareerJet API issues
- [ ] Add pre-flight checks
- [ ] Test fixes in GitHub Actions

### Next Week
- [ ] Monitor scraper performance
- [ ] Optimize based on results
- [ ] Document fixes
- [ ] Plan further improvements

---

## 🚀 Quick Test Commands

```bash
# Full diagnostic
node scripts/test-scrapers-diagnostic.cjs

# Test individual scrapers
node scrapers/wrappers/jobspy-wrapper.cjs
node scripts/jobspy-internships-only.cjs
node scripts/jobspy-career-path-roles.cjs
node scrapers/careerjet.cjs

# Check recent jobs
# (Use Supabase dashboard or SQL query)
```

---

## 📊 Success Metrics

After fixes, expect:
- **JobSpy General**: 200-500 jobs/week
- **JobSpy Internships**: 100-300 jobs/week
- **JobSpy Career Path**: 300-600 jobs/week
- **CareerJet**: 200-500 jobs/week

**Total Expected Increase**: +800-1,900 jobs/week

---

## 🔗 Related Files

- `automation/real-job-runner.cjs` - Main orchestrator
- `scripts/jobspy-save.cjs` - JobSpy general scraper
- `scripts/jobspy-internships-only.cjs` - JobSpy internships
- `scripts/jobspy-career-path-roles.cjs` - JobSpy career paths
- `scrapers/careerjet.cjs` - CareerJet scraper
- `.github/workflows/scrape-jobs.yml` - GitHub Actions workflow

---

**Next Step**: Run local tests to identify specific failure points.

