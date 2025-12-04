# Monitoring Setup - 350 Users Goal

**Status**: ✅ Monitoring endpoints deployed

---

## New Monitoring Endpoints

### 1. Enhanced Health Check (`/api/health`)
**What it does**: Checks scraper health alongside database, Redis, and OpenAI

**Scraper Health Status**:
- ✅ **Healthy**: Last run <3 days ago
- ⚠️ **Degraded**: Last run 3-7 days ago  
- 🚨 **Unhealthy**: Last run >7 days ago or never

**Response Example**:
```json
{
  "ok": true,
  "status": "healthy",
  "services": {
    "scraper": {
      "status": "healthy",
      "message": "All scrapers healthy",
      "details": {
        "sources": {
          "jobspy-indeed": {
            "lastRun": "2025-01-28T10:00:00Z",
            "hoursAgo": 12.5,
            "status": "healthy"
          },
          "adzuna": {
            "lastRun": "2025-01-05T10:00:00Z",
            "hoursAgo": 552,
            "status": "unhealthy"
          }
        },
        "criticalSources": ["adzuna"],
        "staleSources": []
      }
    }
  }
}
```

**How to use**:
```bash
# Check overall health
curl https://your-domain.com/api/health

# Monitor with uptime service (UptimeRobot, Pingdom, etc.)
# Alert if status != "healthy"
```

---

### 2. Zero-Match Monitoring (`/api/monitoring/zero-matches`)
**What it does**: Tracks zero-match incidents and calculates zero-match rate

**Metrics Tracked**:
- Zero-match rate (% of users without matches)
- Active users count
- Users with/without matches
- Active jobs count
- Recent matches count

**Response Example**:
```json
{
  "timestamp": "2025-01-28T12:00:00Z",
  "zeroMatchRate": 0.5,
  "metrics": {
    "activeUsers": 200,
    "usersWithMatches": 199,
    "usersWithoutMatches": 1,
    "activeJobs": 12500,
    "recentMatchesCount": 850
  },
  "status": "healthy",
  "recommendations": []
}
```

**Status Levels**:
- ✅ **Healthy**: Zero-match rate <1%
- ⚠️ **Warning**: Zero-match rate 1-5%
- 🚨 **Critical**: Zero-match rate >5%

**How to use**:
```bash
# Check zero-match rate
curl https://your-domain.com/api/monitoring/zero-matches

# Set up daily check
# Alert if zeroMatchRate > 1%
```

---

## Monitoring Checklist

### Daily Checks
- [ ] Check `/api/health` - ensure scraper status is "healthy"
- [ ] Check `/api/monitoring/zero-matches` - ensure rate <1%
- [ ] Review Sentry for zero-match errors

### Weekly Checks
- [ ] Review scraper health trends
- [ ] Analyze zero-match patterns
- [ ] Check job supply (active jobs count)
- [ ] Review email delivery logs

---

## Alerting Setup

### Recommended Alerts

1. **Scraper Health** (`/api/health`)
   - Alert if: `services.scraper.status === "unhealthy"`
   - Frequency: Every 6 hours
   - Action: Check JobSpy automation

2. **Zero-Match Rate** (`/api/monitoring/zero-matches`)
   - Alert if: `zeroMatchRate > 1`
   - Frequency: Daily
   - Action: Review pre-filter thresholds

3. **Overall Health** (`/api/health`)
   - Alert if: `status === "unhealthy"`
   - Frequency: Every hour
   - Action: Check all services

---

## Integration Examples

### UptimeRobot Setup
```
Monitor Type: HTTP(s)
URL: https://your-domain.com/api/health
Expected Status: 200
Alert if: Response contains "unhealthy"
```

### Custom Monitoring Script
```bash
#!/bin/bash
HEALTH=$(curl -s https://your-domain.com/api/health | jq -r '.status')
ZERO_MATCH=$(curl -s https://your-domain.com/api/monitoring/zero-matches | jq -r '.zeroMatchRate')

if [ "$HEALTH" != "healthy" ]; then
  echo "ALERT: Health check failed - $HEALTH"
fi

if (( $(echo "$ZERO_MATCH > 1" | bc -l) )); then
  echo "ALERT: Zero-match rate too high - $ZERO_MATCH%"
fi
```

---

## Troubleshooting

### Scraper Status "Unhealthy"
1. Check JobSpy automation logs
2. Verify API keys are valid
3. Check database for recent jobs
4. Review scraper error logs

### Zero-Match Rate High
1. Check active jobs count (should be >5,000)
2. Review pre-filter thresholds (may be too strict)
3. Check user preferences (may be too restrictive)
4. Verify matching logic is working

---

## Next Steps

1. ✅ Set up uptime monitoring for `/api/health`
2. ✅ Set up daily check for `/api/monitoring/zero-matches`
3. ✅ Configure alerts in Sentry for zero-match errors
4. ⏳ Monitor for 1 week to establish baseline
5. ⏳ Adjust thresholds if needed

---

**Last Updated**: January 2025  
**Status**: Ready for production monitoring


