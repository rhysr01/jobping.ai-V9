# 🔴 URGENT: API Key Still Invalid - Diagnostic Steps

## The Problem
You're still getting `"API key is invalid"` (401) even after updating. This means either:
1. The key wasn't updated correctly in Vercel
2. Vercel hasn't redeployed with the new key
3. The key itself is invalid/revoked in Resend
4. There's whitespace/formatting in the key

## ⚡ IMMEDIATE ACTION REQUIRED

### Step 1: Check What Key is Actually Being Used

**Visit this URL in your browser (replace with your domain):**
```
https://your-domain.com/api/test-resend?to=your@email.com
```

**Look at the `tests.environment.diagnostics` section:**

```json
{
  "tests": {
    "environment": {
      "diagnostics": {
        "hasLeadingSpace": false,    // Should be false
        "hasTrailingSpace": false,   // Should be false
        "hasQuotes": false,          // Should be false
        "looksValid": true            // Should be true
      },
      "apiKeyPrefix": "re_1234567"   // First 10 chars of key
    }
  }
}
```

**This will tell you:**
- What key prefix is actually being used
- If there are whitespace issues
- If the key format looks valid

### Step 2: Verify Key in Resend Dashboard

1. **Go to**: https://resend.com/api-keys
2. **Check ALL keys**:
   - Which ones are "Active"?
   - Which ones are "Revoked" or "Expired"?
   - Copy the first 10 characters of an ACTIVE key

3. **Compare**:
   - Resend active key prefix: `re_xxxxx...`
   - Vercel test endpoint shows: `re_xxxxx...`
   - **Do they match?**

### Step 3: Test Key Directly

**Test your API key directly against Resend:**

```bash
# Replace YOUR_API_KEY_HERE with your actual key from Resend
curl -X GET "https://api.resend.com/domains" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json"
```

**If this returns 401** → The key itself is invalid (revoked/expired/wrong account)
**If this returns domains** → The key is valid, issue is in Vercel

### Step 4: Nuclear Option - Fresh Start

If nothing works, start completely fresh:

1. **In Resend**:
   - Go to https://resend.com/api-keys
   - Create a BRAND NEW key
   - Name: "JobPing Production - Fresh Key"
   - Copy it immediately

2. **In Vercel**:
   - Go to Settings → Environment Variables
   - **DELETE** the old `RESEND_API_KEY`
   - **CREATE NEW** `RESEND_API_KEY`
   - Paste the fresh key (NO spaces, NO quotes)
   - Set for **Production** environment
   - Save

3. **Redeploy**:
   - Go to Deployments
   - Click **"Redeploy"** (NOT "Redeploy with existing build")
   - Wait for completion

4. **Test**:
   - Visit `/api/test-resend` endpoint
   - Should now show `"overallStatus": "SUCCESS"`

## 🔍 Most Common Issues

### Issue 1: Key Has Whitespace
**Check**: Test endpoint shows `hasWhitespace: true`
**Fix**: In Vercel, delete entire value, paste again (no spaces)

### Issue 2: Key Wasn't Redeployed
**Check**: Updated key but didn't redeploy
**Fix**: Must do FULL redeploy after updating env vars

### Issue 3: Key Belongs to Wrong Account
**Check**: Key works in curl but not in Vercel
**Fix**: Verify you're using the Resend account that has `getjobping.com` verified

### Issue 4: Key is Revoked/Expired
**Check**: Resend dashboard shows key as "Revoked" or "Expired"
**Fix**: Create new key in Resend, update Vercel

## 📋 Quick Checklist

- [ ] Test endpoint shows what key is being used
- [ ] Key prefix matches Resend dashboard
- [ ] No whitespace issues (`hasWhitespace: false`)
- [ ] Key is "Active" in Resend dashboard
- [ ] Key tested directly with curl (works?)
- [ ] Key updated in Vercel Production environment
- [ ] Full redeploy completed (not cached)
- [ ] Test endpoint now shows success

## 🎯 Next Steps

1. **First**: Visit `/api/test-resend` to see diagnostics
2. **Then**: Compare key prefix with Resend dashboard
3. **If mismatch**: Update Vercel key to match Resend
4. **If match but still fails**: Key is revoked - create new one
5. **After updating**: Full redeploy required

The test endpoint will show you EXACTLY what's wrong. Check it first!

