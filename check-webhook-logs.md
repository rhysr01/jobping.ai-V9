# 🔍 Check Webhook Logs in Vercel

## Step 1: Go to Vercel Function Logs

1. Go to: https://vercel.com/your-project
2. Click on your latest deployment (top of the list)
3. Click the **"Functions"** tab
4. Look for `/api/webhook-tally`
5. Click on it to see logs

## Step 2: Look for These Messages

**If webhook fired successfully:**
```
✅ Tally webhook received
✅ User created successfully
📧 Attempting to send email to: your@email.com
✅ Instant matching complete: X jobs found
✅ First job matches email sent
```

**If webhook didn't fire:**
- No logs at all → Tally webhook URL might be wrong
- Check Tally webhook URL is: https://getjobping.com/api/webhook-tally

**If error occurred:**
```
❌ Failed to create user
❌ Instant matching failed
❌ Email failed
```

## Step 3: Common Issues

### Issue 1: No logs at all
**Problem:** Webhook not reaching Vercel
**Fix:** 
- Check Tally webhook URL is correct
- Check Tally webhook is enabled
- Try sending a test webhook from Tally

### Issue 2: "Missing RESEND_API_KEY"
**Problem:** Env var not set
**Fix:** Add RESEND_API_KEY in Vercel env vars for Production

### Issue 3: "Instant matching failed"
**Problem:** Can't call match-users API
**Fix:** Check NEXT_PUBLIC_URL is set to https://getjobping.com

### Issue 4: No error but no email
**Problem:** Email might be suppressed or going to spam
**Fix:** 
- Check spam folder
- Check Resend logs: https://resend.com/emails

## 🚀 Quick Alternative Test

Instead of using Tally, test the webhook directly:

```bash
curl -X POST https://getjobping.com/api/webhook-tally \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "test123",
    "eventType": "FORM_RESPONSE",
    "createdAt": "2025-10-08T12:00:00Z",
    "formId": "test",
    "responseId": "test",
    "data": {
      "fields": [
        {"key": "email", "label": "Email", "type": "EMAIL", "value": "your-email@example.com"},
        {"key": "full_name", "label": "Name", "type": "INPUT_TEXT", "value": "Test User"}
      ]
    }
  }'
```

This will show you the exact error if there is one.
