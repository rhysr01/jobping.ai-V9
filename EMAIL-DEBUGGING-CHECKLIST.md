# 📧 Email Not Sending - Debugging Checklist

## ✅ Step 1: Verify Domain in Resend

**CRITICAL:** Your email domain MUST be verified in Resend or emails will fail silently.

1. Go to: https://resend.com/domains
2. Click "Add Domain"
3. Enter: **`getjobping.com`**
4. Copy the DNS records Resend provides
5. Add them to your domain provider (where you bought getjobping.com)
6. Wait 5-10 minutes for verification
7. Confirm domain shows as "Verified" in Resend

**Until the domain is verified, emails WILL NOT SEND.**

## ✅ Step 2: Set Environment Variables in Vercel

Go to: https://vercel.com/your-project/settings/environment-variables

Add these (for Production, Preview, and Development):

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_DOMAIN=getjobping.com
NEXT_PUBLIC_DOMAIN=getjobping.com  
NEXT_PUBLIC_URL=https://getjobping.com
```

## ✅ Step 3: Redeploy

After adding env vars, trigger a redeploy:
- Push any change to trigger auto-deploy
- Or manually redeploy in Vercel dashboard

## ✅ Step 4: Test Email Sending

Visit your deployed site:
```
https://getjobping.com/api/test-email-send
```

This will attempt to send a test email and show you any errors.

## ✅ Step 5: Check Resend Logs

Go to: https://resend.com/emails

This shows:
- All email attempts
- Delivery status
- Error messages
- Whether domain verification is blocking

## 🔍 Common Issues

**Issue 1: Domain not verified**
- Symptom: Resend returns 403 or domain error
- Fix: Complete Step 1 above

**Issue 2: Wrong sender email**
- Symptom: Emails fail with "unauthorized sender"
- Fix: Make sure email uses @getjobping.com

**Issue 3: Missing RESEND_API_KEY in Vercel**
- Symptom: Works locally, fails in production
- Fix: Add env var in Vercel (Step 2)

**Issue 4: Emails in spam**
- Symptom: "Sent" but not received
- Fix: Check spam folder, add SPF/DKIM records

## 📊 Current Status

✅ Code is correct and uses env vars
✅ Email functions exist and work locally
✅ Resend API key is valid
❓ Domain verification status: UNKNOWN
❓ Vercel env vars: UNKNOWN

**Most likely issue: Domain not verified in Resend**

## 🚀 Quick Test

To test if it's a domain issue, temporarily change the sender to:
```typescript
from: 'JobPing <onboarding@resend.dev>'
```

If emails send with this, the issue is 100% domain verification.
