#  JobPing API Documentation

## Base URL

- **Production**: `https://getjobping.com/api`
- **Local Development**: `http://localhost:3000/api`

## Authentication

Most endpoints are public. System endpoints require API key authentication:

```http
POST /api/match-users
x-system-api-key: your_system_api_key_here
```

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/webhook-tally` | 10 | 1 min |
| `/subscribe` | 3 | 5 min |
| `/match-users` | 3 | 4 min |
| Default | 20 | 1 min |

Rate limit headers included in all responses:

```http
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 2025-01-15T10:30:00Z
```

## Endpoints

### Public Endpoints

#### `GET /api/health`

Health check endpoint.

**Request**:
```bash
curl https://getjobping.com/api/health
```

**Response** (200):
```json
{
  "status": "healthy",
  "timestamp": "2025-10-13T12:00:00Z",
  "duration": 45,
  "components": {
    "database": {
      "status": "healthy",
      "response_time": 23
    },
    "email": {
      "status": "healthy",
      "response_time": 12
    }
  }
}
```

**Status Codes**:
- `200` - System healthy
- `503` - System unhealthy

---

#### `POST /api/feedback/email`

Submit feedback on a job match.

**Request**:
```bash
curl -X GET "https://getjobping.com/api/feedback/email?action=positive&score=5&job=abc123&email=user@example.com"
```

**Parameters**:
- `action`: `positive` | `negative` | `neutral`
- `score`: 1-5 (optional)
- `job`: job_hash
- `email`: user email

**Response**: HTML thank you page

---

#### `GET /api/redirect-to-job`

Redirect to job application page.

**Request**:
```bash
curl "https://getjobping.com/api/redirect-to-job?hash=abc123"
```

**Response**: 307 redirect to job URL

---

### System Endpoints (Require API Key)

#### `POST /api/match-users`

Run AI matching for all users or specific user.

**Request**:
```bash
curl -X POST https://getjobping.com/api/match-users \
  -H "x-system-api-key: your_key"
```

**Response** (200):
```json
{
  "success": true,
  "processed_users": 45,
  "total_matches": 234,
  "cache_hits": 38,
  "ai_calls": 7,
  "duration": 12500
}
```

**Errors**:
- `401` - Unauthorized (invalid API key)
- `429` - Rate limit exceeded
- `500` - Internal error

---

#### `POST /api/send-scheduled-emails`

Send job match emails to users with pending matches.

**Request**:
```bash
curl -X POST https://getjobping.com/api/send-scheduled-emails \
  -H "x-system-api-key: your_key"
```

**Response** (200):
```json
{
  "success": true,
  "emails_sent": 42,
  "failed": 0,
  "users_processed": 42,
  "duration": 8900
}
```

---

### User Registration

#### `POST /api/signup`

User registration via signup form.

**Request**:
```http
POST /api/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "full_name": "John Doe",
  "target_cities": ["London"],
  "roles_selected": ["Analyst"],
  ...
}
```

**Response** (200):
```json
{
  "success": true,
  "userId": "uuid",
  "matchesFound": 12
}
```

---

#### `POST /api/webhooks/stripe`

Stripe webhook handler.

**Request**:
```http
POST /api/webhooks/stripe
stripe-signature: t=timestamp,v1=signature
Content-Type: application/json

{
  "type": "checkout.session.completed",
  "data": { ... }
}
```

**Supported Events**:
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `customer.subscription.deleted`

---

#### `POST /api/webhooks/resend`

Resend email webhook handler.

**Request**:
```http
POST /api/webhooks/resend
Content-Type: application/json

{
  "type": "email.delivered",
  "data": { ... }
}
```

**Supported Events**:
- `email.delivered`
- `email.delivery_delayed`
- `email.bounced`
- `email.complained`

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error context"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing or invalid auth |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Testing

### Health Check

```bash
curl -f https://getjobping.com/api/health || echo "System unhealthy"
```

### Local Development

```bash
# Start server
npm run dev

# Test endpoints
curl http://localhost:3000/api/health

# Test with system key
curl -X POST http://localhost:3000/api/match-users \
  -H "x-system-api-key: $SYSTEM_API_KEY"
```

---

## Monitoring

### Logs

All requests are logged with structured data:

```json
{
  "timestamp": "2025-10-13T12:00:00Z",
  "level": "info",
  "message": "Request completed",
  "context": {
    "method": "POST",
    "path": "/api/subscribe",
    "status": 200,
    "duration": 145
  }
}
```

### Metrics

Key metrics tracked:
- API request count
- Response times (p50, p95, p99)
- Error rates
- Cache hit rates
- AI matching costs

---

## Support

- **Documentation**: This file
- **Issues**: GitHub Issues
- **Email**: support@getjobping.com

---

**Last Updated**: October 2025

