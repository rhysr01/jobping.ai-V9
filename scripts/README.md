#  JobPing Pilot Testing Scripts

This directory contains comprehensive testing scripts for validating JobPing system readiness for the 150-user pilot.

##  Available Scripts

### 1. `pilot-smoke.ts` - End-to-End System Validation
Comprehensive smoke test that validates all critical system components.

### 2. `lock-and-rl-check.ts` - Rate Limiting & Lock Harness
Tests concurrent request handling, rate limiting, and Redis lock behavior.

### 3. `pilot-testing.js` - Legacy Pilot Testing
Original pilot testing script (JavaScript version).

##  Quick Start

### Prerequisites
```bash
# Install dependencies
npm install

# Ensure development server is running
npm run dev
```

### Run All Tests
```bash
# Run pilot smoke test
npm run pilot:smoke

# Run lock and rate limit tests
JOBPING_TEST_MODE=1 NODE_ENV=test npx tsx scripts/lock-and-rl-check.ts

# Run legacy pilot testing
JOBPING_TEST_MODE=1 NODE_ENV=test node scripts/pilot-testing.js
```

##  Pilot Smoke Test (`pilot-smoke.ts`)

### Purpose
Validates complete end-to-end functionality for pilot readiness.

### What It Tests
1. **System Health** - `/api/health` endpoint + dependency summaries
2. **Scraper Freshness** - Jobs table volume + new jobs in last 24h
3. **Matching Throughput** - Matches created in the last 7 days
4. **Email Delivery** - Email ledger entries in the last 7 days
5. **Queue Health** - Job queue outcomes over the last 24h

### Usage
```bash
# Basic usage (defaults to http://localhost:3000)
npm run pilot:smoke

# Custom base URL
npm run pilot:smoke -- --base https://staging.jobping.ai

# Production testing
npm run pilot:smoke -- --base https://jobping.ai
```

### Output
- **Console**: Real-time test progress and summary
- **File**: `PILOT_SMOKE.md` - Detailed markdown report
- **Exit Code**: 0 for success, 1 for failures

### Validation Criteria
- **System Health**: All dependencies `healthy`
- **Job Scraping**: Recent jobs count > 0 (last 24h)
- **Matching**: Matches > 0 (last 7 days)
- **Email Delivery**: Ledger entries > 0 (last 7 days)
- **Queue Health**: Failed jobs ≤ 10 (last 24h)
- **Report**: `PILOT_SMOKE.md` saved with detailed metrics

### Environment Requirements
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service role key for metrics queries
- Optional: `PILOT_BASE_URL` or `--base` flag to target staging/production APIs

##  Lock & Rate Limit Harness (`lock-and-rl-check.ts`)

### Purpose
Tests concurrent request handling and rate limiting behavior.

### What It Tests
1. **Concurrent Lock Behavior** - Two simultaneous requests
2. **Rate Limiting** - Sequential request limits
3. **Lock Cleanup** - Redis lock expiration monitoring

### Usage
```bash
# Test mode (locks bypassed)
JOBPING_TEST_MODE=1 NODE_ENV=test npx tsx scripts/lock-and-rl-check.ts

# Production mode (locks active)
npx tsx scripts/lock-and-rl-check.ts --base https://jobping.ai

# Custom Redis URL
REDIS_URL=redis://custom-host:6379 npx tsx scripts/lock-and-rl-check.ts
```

### Expected Behavior
- **Test Mode**: Both concurrent requests succeed (200, 200)
- **Production Mode**: One succeeds, one blocked (200, 409)
- **Rate Limiting**: 30 requests trigger 429 (prod mode only)
- **Lock Cleanup**: All locks clear within 180 seconds

##  Email Verification Testing (`email-verification-test.js`)

**Comprehensive testing for the email verification system:**

```bash
# Run all email verification tests
npm run test:email

# Test with specific email
npm run test:email -- --email=your-email@example.com

# Direct script execution
node scripts/email-verification-test.js --email=your-email@example.com
```

**What it tests:**
1. **User Registration** - User creation via signup form
2. **Database User Creation** - User storage in Supabase
3. **Email Sending** - Verification email delivery
4. **Verification Token** - Token generation and validation
5. **Email Verification** - Complete verification flow
6. **Welcome Email Sequence** - Post-verification emails
7. **Token Expiration** - 24-hour expiration logic

**Test Endpoints (test mode only):**
- `POST /api/test-email` - Send test verification emails
- `POST /api/test-token` - Generate test verification tokens
- `POST /api/test-welcome-email` - Trigger welcome email sequence
- `POST /api/signup?test=email-verification` - Test signup flow

**Output:**
- Console logs with real-time test progress
- Detailed JSON report saved to `email-verification-test-report.json`
- Exit codes for CI/CD integration (0 = success, 1 = failure)

**Environment Requirements:**
- `JOBPING_TEST_MODE=1` or `NODE_ENV=test`
- Valid Resend API key for email testing
- Supabase connection for database tests
- Local development server running on port 3000

##  Legacy Pilot Testing (`pilot-testing.js`)

### Purpose
Original pilot testing script with comprehensive endpoint validation.

### Usage
```bash
JOBPING_TEST_MODE=1 NODE_ENV=test node scripts/pilot-testing.js
```

### What It Tests
- System health endpoints
- User registration flow
- Email verification
- AI matching system
- Email delivery
- Rate limiting
- Error handling

##  Environment Variables

### Required
```bash
NEXT_PUBLIC_URL=http://localhost:3000
SCRAPE_API_KEY=your-api-key
```

### Optional
```bash
REDIS_URL=redis://localhost:6379
JOBPING_TEST_MODE=1  # Enable test mode
NODE_ENV=test        # Test environment
```

## � Success Criteria

### Pilot Ready (90% success rate)
- All critical endpoints responding
- Job scraping working with good funnel metrics
- AI matching generating sufficient matches
- Email delivery functioning
- Rate limiting and locks working correctly

### Pilot Ready with Caution (70-89% success rate)
- Most functionality working
- Minor issues that don't block pilot
- Some scrapers may have issues
- Rate limiting may need adjustment

### Not Ready (<70% success rate)
- Critical failures blocking pilot
- Major system issues
- Need to fix before proceeding

##  Troubleshooting

### Common Issues

1. **API Key Required**
   ```bash
   # Set API key in environment
   export SCRAPE_API_KEY=your-key
   ```

2. **Redis Connection Failed**
   ```bash
   # Check Redis is running
   redis-cli ping
   
   # Or skip Redis tests
   # Scripts handle Redis unavailability gracefully
   ```

3. **Rate Limiting Not Triggered**
   - Expected in test mode (rate limiting bypassed)
   - In production, may need to adjust limits

4. **Insufficient Matches**
   - Check if jobs exist in database
   - Verify AI matching configuration
   - May need to run job scraping first

### Debug Mode
```bash
# Enable verbose logging
DEBUG=1 JOBPING_TEST_MODE=1 npx tsx scripts/pilot-smoke.ts
```

##  Reports

### Generated Files
- `PILOT_SMOKE.md` - Comprehensive smoke test report
- Console output with real-time progress
- Exit codes for CI/CD integration

### Report Contents
- Test summary with pass/fail counts
- Detailed evidence for each test
- Critical failures and remediation steps
- Overall pilot readiness assessment

##  CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Pilot Smoke Test
  run: |
    JOBPING_TEST_MODE=1 NODE_ENV=test npx tsx scripts/pilot-smoke.ts
    cat PILOT_SMOKE.md

- name: Run Lock Tests
  run: |
    JOBPING_TEST_MODE=1 NODE_ENV=test npx tsx scripts/lock-and-rl-check.ts
```

### Exit Codes
- `0` - All tests passed
- `1` - Critical failures detected

## � Next Steps

1. **Run smoke test** to validate system readiness
2. **Review failures** and fix critical issues
3. **Run lock tests** to verify concurrency handling
4. **Check reports** for detailed analysis
5. **Proceed with pilot** if all tests pass

---

*For questions or issues, check the generated reports and system logs for detailed error information.*
