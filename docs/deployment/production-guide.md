# JobPing Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying JobPing to production, including environment setup, configuration, monitoring, and maintenance procedures.

## Prerequisites

### Required Accounts & Services
- [ ] Vercel account (for hosting)
- [ ] Supabase account (for database)
- [ ] OpenAI account (for AI matching)
- [ ] Stripe account (for payments)
- [ ] Resend account (for email)
- [ ] Sentry account (for error tracking)
- [ ] Redis account (for caching)

### Required Tools
- [ ] Node.js 18+ installed locally
- [ ] Git configured with SSH keys
- [ ] Vercel CLI installed (`npm i -g vercel`)
- [ ] Supabase CLI installed (`npm i -g supabase`)

## Environment Setup

### 1. **Repository Setup**

```bash
# Clone the repository
git clone https://github.com/your-org/jobping.git
cd jobping

# Install dependencies
npm install

# Verify installation
npm run build
```

### 2. **Environment Variables**

Create `.env.local` file with the following variables:

```bash
# ================================
# CORE APPLICATION
# ================================
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://jobping.ai
NEXT_PUBLIC_APP_NAME=JobPing

# ================================
# DATABASE (Supabase)
# ================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# ================================
# AI SERVICES (OpenAI)
# ================================
OPENAI_API_KEY=sk-your-openai-key
AI_TIMEOUT_MS=20000
AI_MAX_RETRIES=3
AI_FAILURE_THRESHOLD=3

# ================================
# CACHING (Redis)
# ================================
REDIS_URL=redis://your-redis-url:6379
CACHE_TTL_MS=1800000
CACHE_MAX_SIZE=10000

# ================================
# PAYMENTS (Stripe)
# ================================
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_PRICE_ID_MONTHLY=price_your-monthly-price-id
STRIPE_PRICE_ID_YEARLY=price_your-yearly-price-id

# ================================
# EMAIL (Resend)
# ================================
RESEND_API_KEY=re_your-resend-api-key
FROM_EMAIL=noreply@jobping.ai
ADMIN_EMAIL=admin@jobping.ai

# ================================
# MONITORING (Sentry)
# ================================
SENTRY_DSN=https://your-sentry-dsn
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=jobping
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# ================================
# SECURITY
# ================================
JWT_SECRET=your-super-secure-jwt-secret-256-bits
ADMIN_API_KEY=your-admin-api-key
SYSTEM_API_KEY=your-system-api-key

# ================================
# PERFORMANCE & RATE LIMITING
# ================================
RATE_LIMIT_WINDOW_MS=240000
MAX_CONCURRENT_USERS=1000
MAX_JOBS_PER_USER=50
MAX_MATCHES_PER_USER=50

# ================================
# SCRAPING CONFIGURATION
# ================================
SCRAPER_RATE_LIMIT_MS=5000
SCRAPER_MAX_RETRIES=3
SCRAPER_TIMEOUT_MS=30000
ENABLE_SCRAPING=true

# ================================
# ANALYTICS & TRACKING
# ================================
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
MIXPANEL_TOKEN=your-mixpanel-token
```

### 3. **Database Setup (Supabase)**

#### **Create Supabase Project**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down the project URL and API keys
4. Enable Row Level Security (RLS)

#### **Run Database Migrations**
```bash
# Connect to Supabase
supabase login
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Verify schema
supabase db diff
```

#### **Set Up Database Functions**
```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom functions for job matching
CREATE OR REPLACE FUNCTION calculate_match_score(
  job_categories TEXT[],
  user_preferences JSONB
) RETURNS INTEGER AS $$
-- Implementation here
$$ LANGUAGE plpgsql;
```

### 4. **Redis Setup**

#### **Create Redis Instance**
1. Go to [Redis Cloud](https://redis.com/redis-enterprise-cloud/overview/)
2. Create a new database
3. Note down the connection URL
4. Configure memory and persistence settings

#### **Test Redis Connection**
```bash
# Test connection
redis-cli -u $REDIS_URL ping
# Should return: PONG
```

## Vercel Deployment

### 1. **Project Configuration**

#### **Connect to Vercel**
```bash
# Login to Vercel
vercel login

# Link project
vercel link

# Configure project settings
vercel env add NODE_ENV production
vercel env add NEXT_PUBLIC_APP_URL https://jobping.ai
# ... add all environment variables
```

#### **Vercel Configuration (`vercel.json`)**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    },
    "app/api/match-users/route.ts": {
      "maxDuration": 300
    },
    "app/api/send-scheduled-emails/route.ts": {
      "maxDuration": 300
    }
  },
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/admin",
      "destination": "/admin/dashboard",
      "permanent": false
    }
  ]
}
```

### 2. **Deploy to Production**

```bash
# Deploy to production
vercel --prod

# Verify deployment
vercel ls
vercel inspect https://jobping.ai
```

### 3. **Custom Domain Setup**

1. **Add Domain in Vercel Dashboard**
   - Go to Project Settings � Domains
   - Add `jobping.ai` and `www.jobping.ai`
   - Configure DNS records as instructed

2. **DNS Configuration**
   ```
   Type: A
   Name: @
   Value: 76.76.19.61

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

3. **SSL Certificate**
   - Vercel automatically provisions SSL certificates
   - Verify HTTPS is working: `https://jobping.ai`

## Service Configuration

### 1. **Stripe Webhook Setup**

1. **Create Webhook Endpoint**
   - Go to Stripe Dashboard � Webhooks
   - Add endpoint: `https://jobping.ai/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

2. **Configure Webhook Secret**
   ```bash
   vercel env add STRIPE_WEBHOOK_SECRET whsec_your-webhook-secret
   ```

### 2. **Sentry Error Tracking**

1. **Create Sentry Project**
   - Go to [sentry.io](https://sentry.io)
   - Create new project for Next.js
   - Note down the DSN

2. **Configure Sentry**
   ```bash
   vercel env add SENTRY_DSN https://your-sentry-dsn
   vercel env add SENTRY_AUTH_TOKEN your-sentry-auth-token
   ```

### 3. **Email Service (Resend)**

1. **Create Resend Account**
   - Go to [resend.com](https://resend.com)
   - Verify domain: `jobping.ai`
   - Create API key

2. **Configure Email Templates**
   - Welcome email template
   - Job match notification template
   - Payment confirmation template

## Monitoring Setup

### 1. **Health Check Endpoint**

Verify the health check is working:
```bash
curl https://jobping.ai/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "uptime": 86400,
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "openai": "healthy"
  }
}
```

### 2. **Uptime Monitoring**

Set up uptime monitoring with:
- **UptimeRobot**: Monitor key endpoints
- **Pingdom**: External monitoring
- **Vercel Analytics**: Built-in monitoring

### 3. **Error Alerting**

Configure Sentry alerts for:
- Error rate > 5%
- Critical errors
- Performance degradation
- Failed API calls

## Performance Optimization

### 1. **Database Optimization**

```sql
-- Create performance indexes
CREATE INDEX CONCURRENTLY idx_jobs_categories_gin ON jobs USING GIN(categories);
CREATE INDEX CONCURRENTLY idx_jobs_posted_at_desc ON jobs(posted_at DESC);
CREATE INDEX CONCURRENTLY idx_matches_user_email_created ON matches(user_email, created_at DESC);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM jobs WHERE categories @> '["tech"]' ORDER BY posted_at DESC LIMIT 50;
```

### 2. **Caching Strategy**

```bash
# Test Redis performance
redis-cli -u $REDIS_URL --latency-history -i 1

# Monitor cache hit rate
redis-cli -u $REDIS_URL info stats | grep keyspace
```

### 3. **API Performance**

Monitor key metrics:
- Response time < 2 seconds for matching
- Cache hit rate > 60%
- Error rate < 2%
- 99.9% uptime

## Security Hardening

### 1. **Environment Security**

```bash
# Rotate secrets regularly
vercel env rm JWT_SECRET
vercel env add JWT_SECRET new-secure-secret

# Use strong passwords
openssl rand -base64 32
```

### 2. **Database Security**

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY "Users can only see their own data" ON users
  FOR ALL USING (auth.uid() = id);
```

### 3. **API Security**

- Rate limiting enabled
- Input validation on all endpoints
- CORS properly configured
- Security headers implemented

## Backup & Recovery

### 1. **Database Backups**

```bash
# Automated daily backups (configured in Supabase)
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup_20240115.sql
```

### 2. **Code Backups**

```bash
# Git repository is the source of truth
git tag v1.0.0
git push origin v1.0.0

# Create release archive
git archive --format=tar.gz --prefix=jobping-v1.0.0/ HEAD > jobping-v1.0.0.tar.gz
```

### 3. **Configuration Backups**

```bash
# Export environment variables
vercel env pull .env.production

# Backup Vercel configuration
vercel project ls > vercel-projects.txt
```

## Maintenance Procedures

### 1. **Regular Maintenance Tasks**

#### **Daily**
- [ ] Check error rates and alerts
- [ ] Monitor system performance
- [ ] Review user feedback
- [ ] Check backup status

#### **Weekly**
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Analyze performance metrics
- [ ] Clean up old data

#### **Monthly**
- [ ] Rotate API keys and secrets
- [ ] Review and update documentation
- [ ] Performance optimization review
- [ ] Security audit

### 2. **Scaling Procedures**

#### **When to Scale**
- Response time > 5 seconds
- Error rate > 5%
- CPU usage > 80%
- Memory usage > 80%

#### **Scaling Actions**
1. **Increase Vercel function timeout**
2. **Add Redis cache nodes**
3. **Optimize database queries**
4. **Implement request queuing**

### 3. **Troubleshooting Guide**

#### **Common Issues**

**High Error Rate**
```bash
# Check Sentry for error details
# Review application logs
# Check external service status
# Verify environment variables
```

**Slow Performance**
```bash
# Check database query performance
# Monitor Redis cache hit rate
# Review API response times
# Check external service latency
```

**Database Issues**
```bash
# Check connection pool status
# Review slow query log
# Monitor database metrics
# Check for deadlocks
```

## Rollback Procedures

### 1. **Code Rollback**

```bash
# Rollback to previous version
vercel --prod --confirm

# Or rollback specific deployment
vercel rollback <deployment-url>
```

### 2. **Database Rollback**

```bash
# Restore from backup
psql $DATABASE_URL < backup_previous.sql

# Or use Supabase point-in-time recovery
```

### 3. **Configuration Rollback**

```bash
# Restore environment variables
vercel env pull .env.previous
vercel env add NODE_ENV production
# ... restore all variables
```

## Post-Deployment Verification

### 1. **Functional Testing**

```bash
# Test key endpoints
curl -X POST https://jobping.ai/api/health
curl -X GET https://jobping.ai/api/dashboard
curl -X POST https://jobping.ai/api/webhook-tally -d '{"test": true}'
```

### 2. **Performance Testing**

```bash
# Load test with artillery
npm install -g artillery
artillery quick --count 100 --num 10 https://jobping.ai/api/health
```

### 3. **Security Testing**

```bash
# Test security headers
curl -I https://jobping.ai
# Verify: X-Frame-Options, X-Content-Type-Options, etc.

# Test rate limiting
for i in {1..25}; do curl https://jobping.ai/api/health; done
# Should get 429 after rate limit
```

## Support & Maintenance

### 1. **Monitoring Dashboard**

Access monitoring at:
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Sentry Dashboard**: https://sentry.io
- **Stripe Dashboard**: https://dashboard.stripe.com

### 2. **Alert Configuration**

Set up alerts for:
- Error rate > 5%
- Response time > 5 seconds
- Database connection failures
- External service outages
- Payment processing failures

### 3. **Documentation Updates**

Keep documentation updated:
- API documentation
- Architecture diagrams
- Deployment procedures
- Troubleshooting guides

## Conclusion

This deployment guide provides comprehensive instructions for deploying JobPing to production. Follow these steps carefully and maintain regular monitoring to ensure optimal performance and reliability.

For additional support, refer to:
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
