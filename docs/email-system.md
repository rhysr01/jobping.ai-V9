# Email System Documentation

## Overview

JobPing uses Resend for email delivery with domain verification on `getjobping.com`. This document covers configuration, troubleshooting, and testing.

## Configuration

### Environment Variables

- **RESEND_API_KEY**: Your Resend API key (starts with `re_`)
- **EMAIL_DOMAIN**: Email domain (defaults to `getjobping.com`)

### Domain Setup

1. **API Keys are Account-Level**: You don't need a new API key after domain verification
2. **Domain Verification**: Once `getjobping.com` is verified in Resend, your existing API key works
3. **From Address**: `JobPing <noreply@getjobping.com>`

## Core Functions

- `sendWelcomeEmail()` - Welcome emails for new users
- `sendMatchedJobsEmail()` - Job match emails
- `sendBatchEmails()` - Batch sending with rate limiting

## Features

- ✅ Retry logic with exponential backoff (3 retries)
- ✅ Rate limiting protection
- ✅ Email tracking/metrics
- ✅ Production-ready HTML templates
- ✅ VML fallbacks for Outlook
- ✅ Webhook handling for bounces/complaints

## Testing

### Test Endpoint

**URL**: `/api/test-resend?to=your@email.com`

**What it tests**:
1. API key validation
2. Domain verification status
3. Email sending capability

### Using curl

```bash
# Test with default recipient (delivered@resend.dev)
curl http://localhost:3000/api/test-resend

# Test with your email address
curl "http://localhost:3000/api/test-resend?to=your@email.com"
```

### Using Browser

Open in your browser:
```
http://localhost:3000/api/test-resend
http://localhost:3000/api/test-resend?to=your@email.com
```

### Test Script

A test script is available at `test-email.sh`:

```bash
./test-email.sh your@email.com
```

## Troubleshooting

### Issue: Endpoint Times Out

**Possible Causes**:
1. Resend API is slow/not responding
2. Network connectivity issue
3. Resend API key doesn't have proper permissions

**Solution**: The endpoint now includes timeouts and better error messages. Check the response for specific error details.

### Issue: RESEND_API_KEY Not Found

**Check**:
- Is `RESEND_API_KEY` set in `.env.local` (local) or Vercel environment variables (production)?
- Does the key start with `re_`?
- Have you restarted the dev server after adding the key?

**Solution**:
1. Add `RESEND_API_KEY=re_your_key_here` to `.env.local`
2. Restart dev server: `npm run dev`
3. Test endpoint again

### Issue: Domain Not Verified

**Check**:
- Go to https://resend.com/domains
- Verify `getjobping.com` shows as "Verified"

**Solution**: Complete DNS verification in Resend dashboard if not already done.

## API Key vs Domain Verification

**Important**: API keys are account-level, not domain-specific.

- ✅ Your existing API key works after domain verification
- ✅ No need to regenerate or create a new key
- ✅ Domain verification just adds permissions to send from that domain

## Response Format

The test endpoint returns:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development",
  "duration": 1234,
  "tests": {
    "apiKey": {
      "success": true,
      "details": "Found 1 domains | getjobping.com verified: true"
    },
    "email": {
      "success": true,
      "emailId": "email_id_here",
      "details": "Email sent successfully to your@email.com"
    },
    "environment": {
      "hasApiKey": true,
      "apiKeyFormat": "valid",
      "emailDomain": "getjobping.com",
      "fromAddress": "JobPing <noreply@getjobping.com>"
    }
  },
  "summary": {
    "apiKeyWorking": true,
    "emailSending": true,
    "domainVerified": true,
    "overallStatus": "SUCCESS"
  }
}
```

## Additional Resources

- Resend Dashboard: https://resend.com
- Resend API Docs: https://resend.com/docs
- Domain Management: https://resend.com/domains

