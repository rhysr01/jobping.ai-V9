# How to Test Your Email System

## Option 1: Using curl (Terminal)

```bash
# Test with default recipient (delivered@resend.dev)
curl http://localhost:3000/api/test-resend

# Test with your email address
curl "http://localhost:3000/api/test-resend?to=your@email.com"

# For production/staging
curl "https://your-domain.com/api/test-resend?to=your@email.com"
```

## Option 2: Using Browser

Just open in your browser:
```
http://localhost:3000/api/test-resend
http://localhost:3000/api/test-resend?to=your@email.com
```

## Option 3: Quick Test Script

Create a test script (`test-email.sh`):
```bash
#!/bin/bash
EMAIL=${1:-"delivered@resend.dev"}
echo "Testing email to: $EMAIL"
curl "http://localhost:3000/api/test-resend?to=$EMAIL" | jq
```

Then run:
```bash
chmod +x test-email.sh
./test-email.sh your@email.com
```

## What the Response Looks Like

```json
{
  "timestamp": "2025-01-XX...",
  "environment": "development",
  "tests": {
    "apiKey": {
      "success": true,
      "details": "Found X domains | getjobping.com verified: true"
    },
    "email": {
      "success": true,
      "emailId": "re_xxxxx",
      "details": "Email sent successfully to your@email.com"
    },
    "environment": {
      "hasApiKey": true,
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

## Expected Results

✅ **SUCCESS** means:
- API key is valid
- Domain is verified
- Email was sent successfully

❌ **FAILED** means:
- Check `RESEND_API_KEY` environment variable
- Verify domain is verified in Resend dashboard
- Check error details in response

