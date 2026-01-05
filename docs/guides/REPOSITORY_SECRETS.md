# Repository Secrets Configuration

This guide documents all secrets and tokens required for JobPing's CI/CD pipelines, deployments, and external service integrations.

## GitHub Repository Secrets

Configure these in: **Settings → Secrets and variables → Actions**

### CI/CD Pipeline Secrets

#### Vercel Deployment (Production)
```
VERCEL_TOKEN          # Vercel API token for deployments
VERCEL_ORG_ID         # Vercel organization ID
VERCEL_PROJECT_ID     # Vercel project ID for jobping
```

#### Supabase Integration
```
SUPABASE_ACCESS_TOKEN # Supabase CLI access token (for migrations)
SUPABASE_PROJECT_REF  # Supabase project reference
```

#### External Service API Keys (for E2E Testing)
```
TEST_SUPABASE_URL           # Test database URL
TEST_SUPABASE_ANON_KEY      # Test database anonymous key
TEST_RESEND_API_KEY         # Test email service key
TEST_OPENAI_API_KEY         # Test OpenAI API key
```

### Code Quality & Security

#### CodeQL/Security Scanning
```
GITHUB_TOKEN               # Auto-provided by GitHub Actions
```

#### Dependency Management
```
NPM_TOKEN                   # NPM registry token (if publishing packages)
```

## Environment Variables for Production

These should be configured in your deployment platform (Vercel, etc.):

### Required for All Environments
```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Authentication & Security
SYSTEM_API_KEY=your-system-api-key
INTERNAL_API_HMAC_SECRET=your-hmac-secret-32-chars
EMAIL_VERIFICATION_SECRET=your-email-verification-secret
PREFERENCES_SECRET=your-preferences-secret
UNSUBSCRIBE_SECRET=your-unsubscribe-secret

# Email Service
RESEND_API_KEY=re_your-resend-api-key
EMAIL_DOMAIN=getjobping.com
```

### Optional Services
```bash
# AI Features
OPENAI_API_KEY=sk-your-openai-key
AI_TIMEOUT_MS=20000
AI_MAX_RETRIES=3

# Payments
POLAR_ACCESS_TOKEN=your-polar-token
POLAR_WEBHOOK_SECRET=your-polar-webhook-secret
STRIPE_SECRET_KEY=sk_test_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook

# Caching
REDIS_URL=redis://your-redis-instance:6379

# External APIs
REED_API_KEY=your-reed-api-key
ADZUNA_APP_ID=your-adzuna-app-id
ADZUNA_APP_KEY=your-adzuna-app-key
```

## Setting Up Secrets

### 1. Generate Required Tokens

#### Vercel Token
1. Go to [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
2. Create a new token with appropriate permissions
3. Copy the token value

#### Supabase Access Token
1. Go to [Supabase Account Settings → Access Tokens](https://supabase.com/dashboard/account/tokens)
2. Generate a new access token
3. Copy the token value

#### NPM Token (if publishing)
1. Go to [NPM Account → Access Tokens](https://www.npmjs.com/settings/tokens)
2. Generate a new token
3. Copy the token value

### 2. Configure in GitHub

1. Navigate to your repository
2. Go to **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Add each secret with its corresponding value

### 3. Verify Configuration

Run a test workflow to ensure secrets are properly configured:

```bash
# Test CI pipeline
git push origin main

# Check Actions tab for workflow status
# Visit: https://github.com/your-username/jobping.ai-V9/actions
```

## Security Best Practices

### Secret Management
- ✅ **Never commit secrets to code**
- ✅ **Use environment-specific secrets**
- ✅ **Rotate secrets regularly**
- ✅ **Limit secret scope to minimum required**
- ✅ **Monitor secret usage in logs**

### Access Control
- 🔒 **Repository admins only** can manage secrets
- 🔒 **Use personal access tokens** with minimal permissions
- 🔒 **Enable branch protection** to prevent direct pushes to main

### Rotation Guidelines
- **API Keys**: Rotate every 90 days or on compromise
- **Access Tokens**: Rotate every 30 days
- **Database Credentials**: Rotate on any security incident

## Troubleshooting

### Common Issues

**"Secret not found" error:**
- Verify secret name matches exactly (case-sensitive)
- Check secret is added to repository, not organization
- Ensure workflow has permission to access secrets

**"Invalid token" error:**
- Regenerate token if expired
- Verify token has correct permissions
- Check token format (some require prefixes like `sk-`, `re_`)

**Deployment fails:**
- Verify Vercel tokens are valid and have deployment permissions
- Check Supabase project access and permissions
- Ensure environment variables are properly configured in deployment platform

## Related Documentation

- [Vercel Deployment Guide](PRODUCTION_GUIDE.md)
- [Environment Setup](README.md#quick-start)
- [Security Policy](../SECURITY.md)
- [CI/CD Workflows](../.github/workflows/)
