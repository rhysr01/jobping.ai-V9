# JobSpy "Fetch Failed" - CRITICAL ISSUE

**Date**: December 28, 2025  
**Status**: ❌ **CRITICAL - Jobs Not Saving**

## 🔴 Problem Summary

**JobSpy is successfully scraping jobs** (2,981 jobs processed), but **ZERO jobs are being saved** due to persistent "TypeError: fetch failed" errors when upserting to Supabase.

### Evidence from Latest Run:
```
✅ JobSpy: 1370 jobs processed
✅ JobSpy Internships: 1053 jobs processed  
✅ Career Path Roles: 558 jobs processed
📈 JobSpy pipelines: 0 unique job hashes ingested this cycle ❌
🚨 ALERT: Source 'jobspy-indeed' has no recent jobs
🚨 ALERT: Source 'jobspy-internships' has no recent jobs
```

### Error Pattern:
```
⚠️  Network error (attempt 1/3), retrying in 1000ms... TypeError: fetch failed
⚠️  Network error (attempt 2/3), retrying in 2000ms... TypeError: fetch failed
❌ Fatal upsert error after retries (batch 1): TypeError: fetch failed
```

## 🔍 Root Cause Analysis

### What's Working:
✅ Retry logic is executing (3 attempts with exponential backoff)  
✅ Error detection is working (correctly identifying network errors)  
✅ JobSpy scraping is successful (finding 2,981 jobs)

### What's Failing:
❌ **ALL retry attempts are failing** - This indicates a persistent network issue, not transient  
❌ **No jobs are being saved** despite successful scraping  
❌ **Error details are minimal** - "TypeError: fetch failed" doesn't show underlying cause

## 🎯 Possible Causes

### 1. **GitHub Actions Network Restrictions**
- GitHub Actions runners may have network restrictions
- Supabase API might be blocking requests from GitHub IPs
- DNS resolution issues from GitHub Actions

### 2. **Supabase Rate Liming / Throttling**
- Too many concurrent requests
- Batch size (150 jobs) might be too large
- Rate limits being hit immediately

### 3. **Connection Pool Exhaustion**
- Multiple scrapers running in parallel
- All trying to save simultaneously
- Exhausting available connections

### 4. **Supabase Client Configuration**
- Fetch wrapper might not be working in GitHub Actions
- Timeout settings might be too aggressive
- Authentication/authorization issues

### 5. **Node.js Fetch Implementation**
- Native fetch in Node.js 18+ might behave differently
- Missing error details in GitHub Actions environment
- AbortController might not work as expected

## 🔧 Immediate Fixes Needed

### Fix 1: Increase Retry Count & Delays
**Current**: 3 retries, 1s/2s/4s delays  
**Recommended**: 5 retries, 2s/4s/8s/16s/32s delays

### Fix 2: Reduce Batch Size
**Current**: 150 jobs per batch  
**Recommended**: 50 jobs per batch (less load per request)

### Fix 3: Add Sequential Saving (Not Parallel)
**Current**: All scrapers save in parallel  
**Recommended**: Save sequentially to avoid connection exhaustion

### Fix 4: Better Error Logging
**Current**: Only shows "TypeError: fetch failed"  
**Recommended**: Log full error object, stack trace, URL, status codes

### Fix 5: Add Connection Testing
**Recommended**: Test Supabase connection before starting saves
- Verify URL is reachable
- Test authentication
- Check rate limits

## 📋 Implementation Plan

### Step 1: Enhanced Error Logging
Add detailed error logging to see the actual failure:
```javascript
catch (error) {
  console.error('Full error details:', {
    message: error.message,
    name: error.name,
    stack: error.stack,
    cause: error.cause,
    code: error.code,
    errno: error.errno,
    syscall: error.syscall,
    hostname: error.hostname
  });
}
```

### Step 2: Reduce Batch Size
Change from 150 to 50 jobs per batch:
```javascript
for (let i=0; i<unique.length; i+=50) { // Changed from 150
```

### Step 3: Increase Retries
Change retry logic:
```javascript
await retryWithBackoff(async () => {
  // upsert logic
}, 5, 2000); // 5 retries, 2s base delay
```

### Step 4: Add Connection Test
Before saving, test connection:
```javascript
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('id')
      .limit(1);
    if (error) throw error;
    console.log('✅ Supabase connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    return false;
  }
}
```

### Step 5: Sequential Saving
Instead of parallel saves, save sequentially:
```javascript
// Don't run all scrapers in parallel
// Save jobs from each scraper sequentially
```

## 🚨 Immediate Action Required

1. **Check Supabase Dashboard**:
   - Look for rate limit errors
   - Check API usage/quotas
   - Verify service is operational

2. **Test Connection Locally**:
   - Run scraper locally with same credentials
   - See if it works outside GitHub Actions

3. **Check GitHub Actions Network**:
   - Verify GitHub Actions can reach Supabase
   - Check for IP restrictions
   - Test DNS resolution

4. **Review Supabase Logs**:
   - Check if requests are reaching Supabase
   - Look for authentication errors
   - Check for rate limit responses

## 📊 Success Criteria

After fixes, we should see:
- ✅ `✅ Saved X jobs (batch Y)` messages
- ✅ `📊 Save summary: X saved, 0 failed`
- ✅ Jobs appearing in database within minutes
- ✅ No "fetch failed" errors

## 🔗 Related Files

- `scripts/jobspy-save.cjs` - Main JobSpy scraper
- `scripts/jobspy-internships-only.cjs` - Internships scraper
- `scripts/jobspy-career-path-roles.cjs` - Career path roles scraper
- `automation/real-job-runner.cjs` - Orchestrator

## 📝 Next Steps

1. Implement enhanced error logging
2. Reduce batch size to 50
3. Increase retry count to 5 with longer delays
4. Add connection testing
5. Test locally first, then deploy
6. Monitor next GitHub Actions run

