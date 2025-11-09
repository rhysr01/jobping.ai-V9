# 🔍 Troubleshooting: New API Key Still Not Working

## Most Common Issues After Creating New Key

### Issue 1: Vercel Not Redeployed ⚠️ MOST COMMON

**Problem**: Updated the key in Vercel but didn't redeploy

**Check**:
- Did you click "Redeploy" after updating the environment variable?
- Or did you just save and assume it would work?

**Fix**:
1. Go to Vercel → Deployments
2. Click **"Redeploy"** on the latest deployment
3. **DO NOT** use "Redeploy with existing build" - use full redeploy
4. Wait for deployment to complete (can take 2-5 minutes)

**Why**: Vercel only picks up new environment variables on new deployments!

### Issue 2: Wrong Environment ⚠️ VERY COMMON

**Problem**: Key set for Preview/Development, but Production is using old key

**Check**:
- In Vercel → Settings → Environment Variables
- Look at `RESEND_API_KEY`
- Which environments is it set for?
  - ✅ Production
  - ✅ Preview  
  - ✅ Development

**Fix**:
- Make sure `RESEND_API_KEY` is set for **Production** environment
- If it's only set for Preview/Development, add it for Production too

### Issue 3: Whitespace/Formatting Issues

**Problem**: Key has spaces or quotes around it

**Check**:
Visit: `https://your-domain.com/api/test-resend?to=test@example.com`

Look for:
```json
{
  "tests": {
    "environment": {
      "diagnostics": {
        "hasLeadingSpace": false,   // Should be false
        "hasTrailingSpace": false,  // Should be false
        "hasQuotes": false,         // Should be false
        "looksValid": true          // Should be true
      }
    }
  }
}
```

**Fix**:
- In Vercel, edit `RESEND_API_KEY`
- Select ALL the text
- Delete it completely
- Paste the key again (make sure no spaces before/after)
- Save

### Issue 4: Wrong Resend Account

**Problem**: New key belongs to different Resend account than the one with verified domain

**Check**:
1. Which Resend account did you create the key in?
2. Does that account have `getjobping.com` verified?
   - Go to https://resend.com/domains
   - Check if `getjobping.com` shows as "Verified"

**Fix**:
- Create key in the account that has `getjobping.com` verified
- Or verify the domain in the account you're using

### Issue 5: Key Copied Incorrectly

**Problem**: Key was truncated or copied with extra characters

**Check**:
- Key should start with `re_`
- Key should be ~40+ characters long
- No extra characters at the end

**Fix**:
- Copy the key again from Resend dashboard
- Make sure you copied the ENTIRE key
- Paste into Vercel

## 🔍 Diagnostic Steps

### Step 1: Check What Key is Actually Being Used

Visit: `https://your-domain.com/api/test-resend?to=test@example.com`

Look at:
- `tests.environment.apiKeyPrefix` - First 10 chars
- `tests.environment.diagnostics` - Any issues?

### Step 2: Compare with Resend

1. Go to https://resend.com/api-keys
2. Find your new key
3. Copy first 10 characters
4. Compare with what test endpoint shows

**If they don't match** → Vercel is using old key (needs redeploy)

**If they match but still fails** → Key is invalid (wrong account or revoked)

### Step 3: Test Key Directly

```bash
# Replace with your actual new key
curl -X GET "https://api.resend.com/domains" \
  -H "Authorization: Bearer re_YOUR_NEW_KEY_HERE" \
  -H "Content-Type: application/json"
```

**If 401** → Key itself is invalid (wrong account or not active)
**If returns domains** → Key is valid, issue is Vercel config

## ✅ Quick Fix Checklist

Run through this:

- [ ] Created new key in Resend ✅ (you did this)
- [ ] Copied entire key (starts with `re_`, ~40+ chars)
- [ ] Updated `RESEND_API_KEY` in Vercel
- [ ] Set for **Production** environment (not just Preview)
- [ ] No spaces before/after key
- [ ] No quotes around key
- [ ] **FULL REDEPLOY completed** (not cached)
- [ ] Tested `/api/test-resend` endpoint
- [ ] Key belongs to account with verified domain

## 🎯 Most Likely Issue

**90% chance**: You updated the key but didn't redeploy Vercel.

**Fix**: Go to Vercel → Deployments → Redeploy (full redeploy)

After redeploy, test the endpoint again. If it still fails, check the diagnostics to see what key is actually being used.

