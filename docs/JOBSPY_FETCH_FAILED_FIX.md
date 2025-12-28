# JobSpy "Fetch Failed" Fix - Monitoring Guide

**Date**: December 28, 2025  
**Status**: ✅ Fix Applied - Monitoring Required

---

## 🔍 Problem Identified

From GitHub Actions logs (Dec 28, 2025):
- **JobSpy scraped**: 4,600+ jobs (2,981 general + 1,061 internships + 558 career path roles)
- **Jobs saved**: 0 (all failed with "TypeError: fetch failed")
- **Error**: Network/connection failures when upserting to Supabase

### Root Cause
Network timeouts and transient connection failures when saving large batches of jobs to Supabase. No retry logic existed, so any network hiccup caused complete failure.

---

## ✅ Fix Applied

### Changes Made to 3 Scripts:
1. `scripts/jobspy-save.cjs` - General JobSpy scraper
2. `scripts/jobspy-internships-only.cjs` - Internships scraper  
3. `scripts/jobspy-career-path-roles.cjs` - Career path roles scraper

### Improvements:
1. **Retry Logic**: 3 retries with exponential backoff (1s, 2s, 4s delays)
2. **Network Error Detection**: Only retries on network/timeout errors, not auth errors
3. **Better Error Logging**: Shows batch numbers, distinguishes error types
4. **Save Summary**: Reports saved vs. failed counts at end
5. **Timeout Protection**: 30-second timeout on fetch requests

---

## 📊 What to Monitor

### Success Indicators:
✅ **JobSpy saves jobs successfully**
- Look for: `✅ Saved X jobs (batch Y)` messages
- Look for: `📊 Save summary: X saved, 0 failed` at end

✅ **Retry logic working**
- Look for: `⚠️ Network error (attempt X/3), retrying in Yms...` messages
- Then: `✅ Saved X jobs` after retry

### Failure Indicators:
❌ **Still failing**
- Look for: `❌ Fatal upsert error after retries`
- Look for: `📊 Save summary: 0 saved, X failed`

❌ **Different error**
- Look for: Auth errors (should NOT retry)
- Look for: Database schema errors (should NOT retry)

---

## 🔍 How to Check Next Run

### Option 1: GitHub Actions UI
1. Go to: https://github.com/YOUR_REPO/actions
2. Click on latest "Automated Job Scraping" run
3. Expand "Run scraping" step
4. Look for:
   - `✅ Saved X jobs` messages (success)
   - `📊 Save summary` at end (should show saved > 0)
   - `⚠️ Network error` messages (retries happening)

### Option 2: Database Query
After next run, check if JobSpy jobs were saved:

```sql
-- Check recent JobSpy jobs
SELECT 
  source,
  COUNT(*) as jobs_created,
  MIN(created_at) as earliest,
  MAX(created_at) as latest
FROM jobs
WHERE source IN ('jobspy-indeed', 'jobspy-internships', 'jobspy-career-roles')
  AND created_at >= NOW() - INTERVAL '2 hours'
GROUP BY source
ORDER BY jobs_created DESC;
```

### Option 3: Use Monitoring Script
```bash
# Check GitHub Actions runs
GITHUB_TOKEN=your_token node scripts/check-github-actions-logs.js

# Check database for recent jobs
node scripts/check_yesterday_scrapers.sql
```

---

## 📈 Expected Results

### Before Fix:
- JobSpy processed: 4,600+ jobs
- JobSpy saved: 0 jobs
- Error: "TypeError: fetch failed" on every batch

### After Fix (Expected):
- JobSpy processed: 4,600+ jobs
- JobSpy saved: 4,000+ jobs (some may still fail, but most should succeed)
- Retries: Should see retry messages if network issues occur
- Final summary: `📊 Save summary: X saved, Y failed` where X >> Y

---

## 🚨 If Still Failing

### Check These:
1. **Supabase Connection**: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
2. **Rate Limiting**: Supabase may be rate-limiting - check Supabase dashboard
3. **Network Issues**: GitHub Actions may have network restrictions
4. **Database Schema**: Verify `jobs` table schema matches expected format

### Debug Steps:
1. Check GitHub Actions logs for specific error messages
2. Run JobSpy locally to see if same errors occur
3. Check Supabase logs for API errors
4. Verify environment variables are set correctly

---

## 📝 Next Steps

1. ✅ **Fix Applied** - Retry logic added to all 3 scripts
2. ⏳ **Monitor Next Run** - Check GitHub Actions after next scheduled run
3. ⏳ **Verify Results** - Confirm jobs are being saved successfully
4. ⏳ **Optimize if Needed** - Adjust retry count/delays if still having issues

---

## 🔗 Related Files

- `scripts/jobspy-save.cjs` - General JobSpy scraper (FIXED)
- `scripts/jobspy-internships-only.cjs` - Internships scraper (FIXED)
- `scripts/jobspy-career-path-roles.cjs` - Career path roles scraper (FIXED)
- `scripts/check-github-actions-logs.js` - Monitoring script
- `scripts/check_yesterday_scrapers.sql` - Database check script

---

**Last Updated**: December 28, 2025  
**Next Review**: After next GitHub Actions run

