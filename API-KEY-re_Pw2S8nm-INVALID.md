# 🔴 API Key `re_Pw2S8nm...` is Invalid - Action Required

## Current Status
- **API Key Being Used**: `re_Pw2S8nm...`
- **Error**: "API key is invalid" (401)
- **Meaning**: This specific key is revoked, expired, or belongs to wrong account

## ✅ Fix Steps

### Step 1: Test Key Directly

Test if the key `re_Pw2S8nm...` is actually valid:

```bash
curl -X GET "https://api.resend.com/domains" \
  -H "Authorization: Bearer re_Pw2S8nm..." \
  -H "Content-Type: application/json"
```

**If this returns 401** → Key is invalid (revoked/expired/wrong account)
**If this returns domains** → Key is valid, issue is elsewhere

### Step 2: Check Resend Dashboard

1. **Go to**: https://resend.com/api-keys
2. **Find key starting with `re_Pw2S8nm`**:
   - Is it marked as "Active"?
   - Is it marked as "Revoked" or "Expired"?
   - What account is it in?

3. **Check domain**:
   - Go to https://resend.com/domains
   - Does `getjobping.com` show as "Verified"?
   - **Which Resend account** has this domain?

### Step 3: Get Correct API Key

**Option A: Use Existing Active Key**
- In the Resend account that has `getjobping.com` verified
- Find an "Active" API key
- Copy it

**Option B: Create New Key**
- In the Resend account that has `getjobping.com` verified
- Create new API key
- Copy it immediately

### Step 4: Update Vercel

1. **Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Find `RESEND_API_KEY`**
3. **Current value starts with**: `re_Pw2S8nm...`
4. **Replace with new key**:
   - Delete old value completely
   - Paste new key (no spaces, no quotes)
   - Ensure set for **Production**
   - Save

### Step 5: FULL REDEPLOY

**CRITICAL**: Must redeploy after updating env var!

1. Go to **Deployments**
2. Click **"Redeploy"** (full redeploy, not cached)
3. Wait for completion

### Step 6: Verify

After redeploy, check logs. Should see:
```
[EMAIL] API Key prefix: re_NEWKEY...
```

And emails should work!

## 🎯 Most Likely Scenarios

### Scenario 1: Key Was Revoked
- Key `re_Pw2S8nm...` was revoked in Resend
- **Fix**: Create new key, update Vercel, redeploy

### Scenario 2: Wrong Account
- Key belongs to account without `getjobping.com`
- **Fix**: Use key from account that has domain verified

### Scenario 3: Key Expired
- Key expired in Resend
- **Fix**: Create new key, update Vercel, redeploy

## 🔍 Quick Diagnostic

**Test your current key**:
```bash
curl -X GET "https://api.resend.com/domains" \
  -H "Authorization: Bearer re_Pw2S8nm..." \
  -H "Content-Type: application/json"
```

If 401 → Key is definitely invalid, get new one
If 200 → Key is valid, check domain verification

## ✅ Checklist

- [ ] Tested key `re_Pw2S8nm...` directly (works or fails?)
- [ ] Checked Resend dashboard for key status
- [ ] Verified `getjobping.com` is verified in Resend
- [ ] Got API key from account with verified domain
- [ ] Updated `RESEND_API_KEY` in Vercel
- [ ] Set for Production environment
- [ ] **FULL REDEPLOY completed**
- [ ] Tested signup - emails work?

The key `re_Pw2S8nm...` is definitely invalid. You need a new valid key from the Resend account that has `getjobping.com` verified.

