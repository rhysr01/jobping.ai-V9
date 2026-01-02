# Rate Limit Configuration

All rate limits are now configurable via environment variables, allowing you to scale limits based on your infrastructure capacity.

## Quick Start

To increase rate limits, set the appropriate environment variables. For example, to allow 200 requests per minute for the default endpoint:

```bash
RATE_LIMIT_DEFAULT_MAX=200
RATE_LIMIT_DEFAULT_WINDOW_MS=60000
```

## Available Configuration Variables

### Default Endpoint
- `RATE_LIMIT_DEFAULT_MAX` - Maximum requests per window (default: 500)
- `RATE_LIMIT_DEFAULT_WINDOW_MS` - Time window in milliseconds (default: 60000 = 1 minute)

### Match Users Endpoint
- `RATE_LIMIT_MATCH_USERS_MAX` - Maximum requests per window (default: 30)
- `RATE_LIMIT_WINDOW_MS` - Time window in milliseconds (default: 240000 = 4 minutes)

### Scrape Endpoint
- `RATE_LIMIT_SCRAPE_MAX` - Maximum requests per window (default: 50)
- `RATE_LIMIT_SCRAPE_WINDOW_MS` - Time window in milliseconds (default: 60000 = 1 minute)

### Email Sending
- `RATE_LIMIT_EMAILS_MAX` - Maximum requests per window (default: 20)
- `RATE_LIMIT_EMAILS_WINDOW_MS` - Time window in milliseconds (default: 60000 = 1 minute)

### Checkout Session
- `RATE_LIMIT_CHECKOUT_MAX` - Maximum requests per window (default: 30)
- `RATE_LIMIT_CHECKOUT_WINDOW_MS` - Time window in milliseconds (default: 300000 = 5 minutes)

### User Matches Endpoint
- `RATE_LIMIT_USER_MATCHES_MAX` - Maximum requests per window (default: 100)
- `RATE_LIMIT_USER_MATCHES_WINDOW_MS` - Time window in milliseconds (default: 60000 = 1 minute)

### Dashboard Endpoint
- `RATE_LIMIT_DASHBOARD_MAX` - Maximum requests per window (default: 200)
- `RATE_LIMIT_DASHBOARD_WINDOW_MS` - Time window in milliseconds (default: 60000 = 1 minute)

### Email Verification
- `RATE_LIMIT_VERIFY_EMAIL_MAX` - Maximum requests per window (default: 50)
- `RATE_LIMIT_VERIFY_EMAIL_WINDOW_MS` - Time window in milliseconds (default: 300000 = 5 minutes)

### Cleanup Jobs
- `RATE_LIMIT_CLEANUP_MAX` - Maximum requests per window (default: 20)
- `RATE_LIMIT_CLEANUP_WINDOW_MS` - Time window in milliseconds (default: 300000 = 5 minutes)

### Consume Method (Internal)
- `RATE_LIMIT_CONSUME_MAX` - Maximum requests per window (default: 500)
- `RATE_LIMIT_CONSUME_WINDOW_SEC` - Time window in seconds (default: 60)

## Default Values (Increased from Previous Limits)

The following limits have been significantly increased to support higher traffic:

- **Default endpoint**: 20 → **500 requests/minute** (25x increase)
- **Match users**: 3 → **30 requests/4 minutes** (10x increase)
- **Scrape**: 2 → **50 requests/minute** (25x increase)
- **User matches**: 5 → **100 requests/minute** (20x increase)
- **Dashboard**: 30 → **200 requests/minute** (6.7x increase)
- **Email verification**: 10 → **50 requests/5 minutes** (5x increase)
- **Checkout**: 3 → **30 requests/5 minutes** (10x increase)
- **Cleanup**: 2 → **20 requests/5 minutes** (10x increase)
- **Email sending**: 1 → **20 requests/minute** (20x increase)
- **Consume method**: 100 → **500 requests/minute** (5x increase)

## Infrastructure Considerations

When setting rate limits, consider:

1. **Database capacity**: Higher limits mean more database queries
2. **API costs**: Some endpoints call external APIs (e.g., OpenAI)
3. **Redis capacity**: Rate limiting uses Redis for distributed tracking
4. **Server resources**: CPU and memory usage scales with request volume

## Example: High-Volume Setup

For a high-traffic production environment:

```bash
# Allow more general API usage
RATE_LIMIT_DEFAULT_MAX=500
RATE_LIMIT_DEFAULT_WINDOW_MS=60000

# Allow more frequent matching
RATE_LIMIT_MATCH_USERS_MAX=20
RATE_LIMIT_WINDOW_MS=240000

# Allow more user match queries
RATE_LIMIT_USER_MATCHES_MAX=100
RATE_LIMIT_USER_MATCHES_WINDOW_MS=60000

# Allow more dashboard refreshes
RATE_LIMIT_DASHBOARD_MAX=120
RATE_LIMIT_DASHBOARD_WINDOW_MS=60000
```

## Monitoring

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: ISO timestamp when the limit resets
- `Retry-After`: Seconds to wait before retrying (when rate limited)

## Testing

Rate limiting is automatically disabled in test mode (`NODE_ENV=test` or `JOBPING_TEST_MODE=1`).

