# 🚀 JobPing Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables Setup
```bash
# Copy environment template
cp ENV_TEMPLATE.md .env.local

# Fill in all required variables:
# - NEXT_PUBLIC_SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - RESEND_API_KEY
# - OPENAI_API_KEY
# - STRIPE_SECRET_KEY
# - STRIPE_PUBLIC_KEY
# - TALLY_WEBHOOK_SECRET
# - VERIFICATION_TOKEN_PEPPER
```

### 2. Database Setup
```bash
# Run database optimizations in Supabase SQL Editor
# Execute scripts/database-optimization.sql in parts:
# - Part 1: Core Indexes
# - Part 2: User & Match Indexes  
# - Part 3: Array Indexes & Analytics
# - Part 4: Performance Views & Functions
```

### 3. Pre-Launch Verification
```bash
# Run production readiness check
node scripts/production-launch.js

# Should show: "ALL CHECKS PASSED - READY FOR PRODUCTION!"
```

## Vercel Deployment

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy to Production
```bash
# Deploy to production
vercel --prod

# Or link to existing project
vercel link
vercel --prod
```

### 4. Configure Environment Variables in Vercel
```bash
# Set all environment variables in Vercel dashboard
# Or use CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add RESEND_API_KEY
vercel env add OPENAI_API_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_PUBLIC_KEY
vercel env add TALLY_WEBHOOK_SECRET
vercel env add VERIFICATION_TOKEN_PEPPER
```

## Post-Deployment Configuration

### 1. Webhook Configuration

#### Stripe Webhooks
- URL: `https://your-domain.vercel.app/api/webhooks-stripe`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

#### Tally Webhooks
- URL: `https://your-domain.vercel.app/api/webhook-tally`
- Secret: Use your `TALLY_WEBHOOK_SECRET`

### 2. Domain Configuration
```bash
# Add custom domain in Vercel dashboard
# Update NEXT_PUBLIC_URL and NEXT_PUBLIC_BASE_URL
```

### 3. Monitoring Setup
```bash
# Enable Vercel Analytics
# Set up Sentry for error tracking
# Monitor Supabase usage
```

## Production Testing

### 1. Health Check
```bash
curl https://your-domain.vercel.app/api/health
```

### 2. Email Verification Test
```bash
curl -X POST https://your-domain.vercel.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 3. Payment Flow Test
- Test Stripe checkout
- Verify webhook processing
- Check subscription status

### 4. Job Matching Test
```bash
curl -X POST https://your-domain.vercel.app/api/match-users \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## Performance Monitoring

### 1. Vercel Analytics
- Monitor function execution times
- Track error rates
- Monitor bandwidth usage

### 2. Supabase Monitoring
- Database query performance
- Connection pool usage
- Storage usage

### 3. AI Cost Monitoring
- Track OpenAI API usage
- Monitor cost per user
- Set up cost alerts

## Scaling Considerations

### Current Capacity (No New Subscriptions)
- **Users**: 35-40 users
- **Cost**: $28-32/month
- **Performance**: Sub-50ms queries

### 50+ User Scaling
- **Upgrade**: Supabase Pro ($25/month)
- **Total Cost**: $180/month
- **Performance**: Maintained with optimizations

### 100+ User Scaling
- **Upgrade**: Supabase Pro + Redis
- **Total Cost**: $315/month
- **Performance**: Enterprise-grade

## Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check TypeScript errors
npm run build

# Fix linting issues
npm run lint
```

#### 2. Environment Variable Issues
```bash
# Verify all required variables are set
node scripts/production-launch.js
```

#### 3. Database Connection Issues
- Check Supabase URL and service role key
- Verify database is accessible
- Check connection limits

#### 4. API Rate Limiting
- Monitor rate limit headers
- Adjust limits in productionRateLimiter.ts
- Check Redis connection

### Emergency Procedures

#### 1. Rollback Deployment
```bash
# Rollback to previous version
vercel rollback

# Or redeploy previous commit
git checkout previous-commit
vercel --prod
```

#### 2. Disable Features
```bash
# Set maintenance mode
vercel env add MAINTENANCE_MODE true
```

#### 3. Emergency Scaling
- Increase Vercel function timeout
- Upgrade Supabase plan
- Enable Redis caching

## Security Checklist

### 1. Environment Variables
- [ ] All secrets are properly set
- [ ] No secrets in code or logs
- [ ] Regular secret rotation

### 2. API Security
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Input validation on all endpoints

### 3. Database Security
- [ ] Row Level Security (RLS) enabled
- [ ] Service role key secured
- [ ] Regular backups

### 4. Payment Security
- [ ] Stripe webhooks verified
- [ ] PCI compliance maintained
- [ ] Secure token handling

## Success Metrics

### 1. Performance Targets
- [ ] API response time < 200ms
- [ ] Database queries < 50ms
- [ ] 99.9% uptime
- [ ] < 1% error rate

### 2. User Experience
- [ ] Email delivery success > 95%
- [ ] Job match quality > 4.0/5.0
- [ ] User satisfaction > 4.5/5.0

### 3. Business Metrics
- [ ] User growth rate
- [ ] Conversion rate (free to premium)
- [ ] Revenue per user
- [ ] Churn rate < 5%

---

**Ready for Production Launch!** 🚀

Follow this guide step-by-step for a successful deployment.
