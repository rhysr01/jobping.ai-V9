# 🏗️ GetJobPing Architecture

**Last Updated:** January 2025  
**Status:** Production (Live at https://getjobping.com)

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture Patterns](#architecture-patterns)
4. [Matching Engine](#matching-engine)
5. [Data Flow](#data-flow)
6. [Security Architecture](#security-architecture)
7. [Infrastructure](#infrastructure)
8. [API Design](#api-design)
9. [Database Schema](#database-schema)
10. [Background Jobs](#background-jobs)

---

## System Overview

GetJobPing is a **multi-stage AI-powered job matching platform** for early-career roles across Europe. The system combines:

- **SQL pre-filtering** (90% job pool reduction)
- **AI semantic matching** (GPT-4o-mini with LRU caching)
- **Rule-based fallbacks** (guaranteed matches)
- **Multi-source job aggregation** (8 scrapers)

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Request                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Middleware                          │
│  • CSRF Protection  • Security Headers  • Rate Limiting          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Routes (47 routes)                      │
│  • Auth & User Mgmt  • Matching  • Billing  • Webhooks          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│  Supabase    │  │  Matching Engine │  │  External    │
│  (Postgres)  │  │  (5-stage)       │  │  APIs        │
│  • RLS       │  │  • AI + Rules    │  │  • OpenAI    │
│  • pgvector  │  │  • Caching       │  │  • Resend    │
└──────────────┘  └──────────────────┘  └──────────────┘
```

---

## Tech Stack

### Core Framework

- **Next.js 16** - App Router, React Server Components, API Routes
- **React 19** - UI framework with hooks and suspense
- **TypeScript** - 100% typed codebase with strict mode

### Backend & Database

- **Supabase** - PostgreSQL with Row-Level Security (RLS)
- **pgvector** - Vector embeddings for semantic search
- **Redis** (optional) - Rate limiting and caching

### AI & Matching

- **OpenAI GPT-4o-mini** - Semantic job scoring
- **LRU Cache** - 60-80% hit rate, reduces AI costs by 60-80%
- **Circuit Breaker** - Prevents cascade failures

### External Services

- **Resend** - Transactional email delivery
- **Polar** - Subscription management (€5/month premium)
- **Sentry** - Error tracking (multi-runtime)
- **Axiom** - Structured logging aggregation
- **Vercel** - Hosting & edge network

### Job Sources (8 scrapers)

- JobSpy (Indeed, Glassdoor)
- Adzuna, Reed, CareerJet
- Arbeitnow, Jooble

---

## Architecture Patterns

### 1. Layered Architecture

```
app/                  # Presentation Layer (UI + API Routes)
├── api/              # API Routes (47 endpoints)
├── (pages)/          # Next.js pages
└── components/       # React components

components/           # Shared UI Components
├── ui/               # Base UI components
├── sections/         # Page sections
└── signup/           # Signup flow components

Utils/                # Business Logic Layer
├── matching/         # Matching engine (2,656 lines, refactored)
├── email/            # Email templates and delivery
├── auth/             # Authentication helpers
└── monitoring/       # Logging and metrics

lib/                  # Infrastructure Layer
├── env.ts            # Environment validation
├── supabase-client.ts # Database client
└── monitoring.ts     # Centralized logging

scrapers/             # Data Acquisition Layer
├── wrappers/         # API integrations
└── shared/           # Common scraper utilities
```

### 2. Middleware Pipeline

Every request goes through:

1. **Request Tracking** - Unique ID, timing, context
2. **CSRF Protection** - State-changing methods require token
3. **HTTPS Enforcement** - 301 redirect in production
4. **Admin Auth** - Basic Auth for /admin routes
5. **Security Headers** - CSP, HSTS, X-Frame-Options, etc.
6. **Cookie Hardening** - SameSite=Lax, Secure flag
7. **Performance Logging** - Duration tracking, business metrics

### 3. Error Handling Strategy

**Three-Layer Error Handling:**

1. **React Error Boundaries** (`components/ErrorBoundary.tsx`)
   - Catches UI rendering errors
   - Sends to Sentry with component stack
   - Shows user-friendly fallback UI

2. **API Route Error Handling** (`lib/errors.ts`)
   - `asyncHandler` wrapper for route errors
   - Structured error responses
   - Comprehensive logging with context

3. **Sentry Integration** (multi-runtime)
   - Server: sentry.server.config.ts
   - Client: sentry.client.config.ts
   - Edge: sentry.edge.config.ts

---

## Matching Engine

### 5-Stage Matching Pipeline

**Stage 1: SQL Pre-filtering** (Cost: $0, 90% reduction)

```typescript
// Location: Utils/matching/jobSearchService.ts
- Filter by: city, categories, active status
- Uses: Postgres indexes, JSONB queries
- Result: Job pool reduced from 10,000 → 1,000
```

**Stage 2: AI Matching** (Cost: $0.001-0.01/user with caching)

```typescript
// Location: Utils/matching/consolidated/engine.ts
- Model: GPT-4o-mini with function calling
- Input: Top 20-50 pre-ranked jobs
- Caching: LRU cache (60-80% hit rate)
- Fallback: Rule-based if AI fails/timeouts
- Circuit Breaker: Prevents cascade failures
```

**Stage 3: Guaranteed Fallback** (Cost: $0, rule-based)

```typescript
// Location: Utils/matching/guaranteed/index.ts
- Triggers: If < 10 matches after Stage 2
- Strategy: Location expansion + criteria relaxation
- Relaxation Levels: 0-10+ for location proximity
- Visa Scoring: Confidence-based matching
```

**Stage 4: Custom Scan** (Cost: Medium, background)

```typescript
// Location: Utils/matching/guaranteed/historical-alerts.ts
- Triggers: If < 10 matches after Stage 3
- Strategy: Historical company matching
- Scope: Related fields/locations
```

**Stage 5: Diversity Pass** (Cost: $0, in-memory)

```typescript
// Location: Utils/matching/consolidated/diversity.ts
- Ensures: Variety in companies, locations, roles
- Prevents: Clustering of similar jobs
```

### Matching Engine Architecture

```
Utils/matching/
├── consolidated/              # Main matching engine (refactored)
│   ├── engine.ts             # Orchestrator (676 lines)
│   ├── scoring.ts            # Match scoring (1,131 lines)
│   ├── prompts.ts            # AI prompts (376 lines)
│   ├── validation.ts         # Output validation (266 lines)
│   ├── cache.ts              # LRU cache (116 lines)
│   └── circuitBreaker.ts     # Circuit breaker (56 lines)
├── guaranteed/               # Fallback matching
│   ├── index.ts              # Guaranteed match logic
│   ├── coordinator.ts        # Premium coordination
│   └── historical-alerts.ts  # Historical matching
├── prefilter/                # Pre-filtering modules
├── jobSearchService.ts       # SQL pre-filtering
└── rule-based-matcher.service.ts # Rule-based fallback
```

**Total Lines:** 2,656 (consolidated from 2,797-line monolith)

### Scoring Algorithm

**Weighted Scoring** (Utils/matching/consolidated/scoring.ts):

```typescript
Base Score Components (0-100):
├── Location Match (30%)      # City, country proximity
├── Career Path (25%)          # Category alignment
├── Experience Level (20%)     # Entry-level preference
├── Work Environment (10%)     # Remote/hybrid/office
├── Language Requirements (10%) # User languages vs job
└── Company Tier (5%)          # Premium companies

Bonuses:
├── Visa Sponsorship (+10)     # If user requires visa
├── Graduate Program (+8)      # If user prefers graduate roles
├── Premium Company (+5)       # Well-known companies
└── Perfect Location (+5)      # Exact city match

Penalties:
├── Feedback Penalty (-20 to -50) # User negative feedback
├── Cold Start Bonus (removed)    # For new users
└── Over-application (-10)        # Applied too many times
```

---

## Data Flow

### User Signup → Match Generation

```
1. User Signs Up
   └─> app/api/signup/route.ts or app/api/signup/free/route.ts

2. Profile Validation
   └─> Zod schema validation
   └─> City normalization (München → Munich)
   └─> Career path to database categories

3. Insert to Database
   └─> Supabase users table
   └─> Row-Level Security applied

4. Trigger Matching
   └─> app/api/match-users/route.ts (or Inngest workflow)

5. Fetch Candidate Jobs
   └─> Utils/matching/jobSearchService.ts
   └─> SQL filters: city, categories, active=true
   └─> Result: ~1,000 jobs (from ~10,000 total)

6. Pre-rank Jobs
   └─> Utils/matching/rule-based-matcher.service.ts
   └─> Quick scoring: location, category, experience
   └─> Top 50 jobs selected

7. AI Matching
   └─> Utils/matching/consolidated/engine.ts
   └─> Check cache (LRU)
   └─> Call OpenAI GPT-4o-mini (if cache miss)
   └─> Validate output
   └─> Store in cache

8. Guaranteed Fallback (if < 10 matches)
   └─> Utils/matching/guaranteed/index.ts
   └─> Relax criteria (location, categories)
   └─> Score with penalties

9. Diversity Filter
   └─> Ensure variety in companies/locations

10. Save Matches
    └─> Supabase matches table
    └─> Deduplicate by job_hash

11. Send Email (Premium only)
    └─> Utils/email/sender.ts
    └─> Resend API
    └─> Production-ready templates
```

### Job Scraping → Database

```
1. Cron Trigger (2x daily: 8am, 6pm UTC)
   └─> vercel.json cron or automation/real-job-runner.cjs

2. Execute Scrapers (parallel)
   └─> scrapers/wrappers/*.cjs
   └─> 8 scrapers: JobSpy, Adzuna, Reed, CareerJet, etc.

3. Data Normalization
   └─> scrapers/shared/processor.cjs
   └─> City names (Praha → Prague)
   └─> Company names (remove Ltd, GmbH)
   └─> Infer categories from title/description

4. Validation
   └─> scrapers/shared/jobValidator.cjs
   └─> Required: work-type category, location, company
   └─> Reject: Non-business roles, job board companies

5. Insert to Database
   └─> Supabase jobs table
   └─> Batch insert for performance

6. Database Trigger (automatic)
   └─> migration: 20260104000005_prevent_missing_work_type_categories.sql
   └─> Final normalization & category enforcement

7. Generate Embeddings (every 72 hours)
   └─> automation/embedding-refresh.cjs
   └─> OpenAI text-embedding-3-small
   └─> Store in pgvector column
```

---

## Security Architecture

### Multi-Layer Security

**1. Middleware Security** (middleware.ts)

- CSRF Protection (x-csrf-token: "jobping-request")
- Security Headers (CSP with nonces, HSTS, X-Frame-Options)
- Cookie Hardening (SameSite=Lax, Secure)
- HTTPS Enforcement (301 redirect in production)
- Admin Basic Auth (/admin routes)

**2. Database Security** (Supabase)

- Row-Level Security (RLS) enabled on all public tables
- Users can only see their own data
- Service role has full access for admin operations

**3. API Security**

- Rate Limiting (Redis-backed, leaky bucket algorithm)
- Auth Middleware (`Utils/auth/apiAuth.ts`)
- HMAC Authentication for system endpoints
- Input Validation (Zod schemas)

**4. Webhook Security**

- Polar: Official SDK with signature verification
- Resend: HMAC with timing-safe comparison
- Stripe: Signature verification via SDK

**5. Environment Variables**

- Validated at startup (`lib/env.ts`)
- Type-safe access via ENV constant
- No hardcoded secrets (158 files scanned)

### Security Headers

```typescript
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-${nonce}' 'sha256-...' https://...;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  connect-src 'self' https://*.supabase.co https://api.openai.com ...;

Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## Infrastructure

### Hosting & Deployment

**Vercel** - Serverless Next.js deployment

- Edge Network: Global CDN
- Automatic Deployments: Push to `main`
- Preview URLs: For PRs
- Environment Variables: Validated at startup

**Function Timeouts** (vercel.json):

- Default: 60 seconds
- Match-users: 300 seconds (5 min)
- Send-emails: 300 seconds
- Process-queue: 300 seconds

**Cron Jobs** (5 scheduled):

1. Process embedding queue: Every 5 minutes
2. Send scheduled emails: Daily at 9am
3. Process digests: Hourly
4. Cleanup free users: Daily at 2am
5. Check link health: Every 6 hours

**Inngest Workflows** - Durable Background Jobs

- Endpoint: `/api/inngest` (GET, POST, PUT)
- Functions: `helloWorld`, `performAIMatching`
- Features:
  - Automatic retries (3x on failure)
  - Timeout protection (handles >60s operations)
  - Step-by-step execution with error recovery
  - Fallback to rule-based matching if AI fails
- Use Cases:
  - Long-running AI matching operations
  - Premium user onboarding workflows
  - Bulk matching jobs that exceed Vercel limits

### Monitoring & Observability

**Sentry** - Error Tracking

- Multi-runtime: Server, Client, Edge
- Sampling: 10% in production
- ErrorBoundary integration
- Component stack traces

**Axiom** - Structured Logging

- JSON format logs
- Auto-configured via Vercel
- Query-able log aggregation

**apiLogger** - Structured Logging Helper

```typescript
// lib/api-logger.ts
apiLogger.info("Message", { context });
apiLogger.warn("Warning", { context });
apiLogger.error("Error", error as Error, { context });
```

**Health Endpoints**:

- `/api/health` - Multi-service health checks with SLO tracking (<100ms target)
  - Status: Database, Redis, OpenAI, Scrapers
  - Response time monitoring
  - Automatic degradation detection
- `/api/metrics` - System metrics (requires SYSTEM_API_KEY)
- `/api/monitoring/dashboard` - Admin monitoring dashboard
- `/api/dashboard` - Comprehensive admin dashboard (rate-limited: 50 req/min)
  - Real-time database metrics (jobs, users, matches)
  - Scraper health and performance stats
  - System resource monitoring
  - Environment configuration status
  - Performance metrics with SLO tracking

---

## API Design

### API Route Organization

**47 API Routes** across 9 categories:

1. **Auth & User** (6 routes)
2. **Matching** (8 routes)
3. **Billing & Payments** (11 routes - 9 Stripe Connect + Polar)
4. **Webhooks** (4 routes)
5. **Cron Jobs** (5 routes)
6. **Monitoring** (4 routes)
7. **Admin** (4 routes)
8. **Email & Engagement** (6 routes)
9. **Feedback & Tracking** (3 routes)

### Payment Infrastructure

**Stripe Connect** (9 endpoints) - `/api/stripe-connect/*`

- **Account Management**:
  - `POST /create-account` - Create connected Stripe accounts
  - `POST /create-account-link` - Generate account onboarding links
  - `GET /get-account` - Retrieve account details
  - `GET /health` - Stripe API connectivity check
- **Billing & Products**:
  - `POST /billing-portal` - Customer billing portal access
  - `POST /create-checkout` - Checkout session creation
  - `POST /create-product` - Product/price management
  - `GET /list-products` - Product catalog
  - `POST /create-subscription` - Subscription management
- **Webhook Handling**: Signature verification for payment events
- **Use Cases**: Marketplace features, multi-vendor payments (future)

**Polar** - Subscription Management

- Handles €5/month premium subscriptions
- Webhook integration for subscription events
- Official SDK with signature verification

### Feedback & Analytics

**Advanced Feedback System** - `/api/feedback/enhanced`

- **Multi-Signal Feedback**:
  - Explicit: thumbs_up, thumbs_down, save, hide, not_relevant
  - Implicit: click, open, dwell (tracked separately)
- **Email-Based Feedback**: One-click feedback links in job emails
- **Cache Invalidation**: Automatic LRU cache updates based on feedback
- **Scoring Impact**: Negative feedback applies -20 to -50 penalties
- **Data Model**: Stored in `job_feedback` table with timestamps

**Implicit Signal Tracking** - `/api/tracking/implicit`

- **Behavioral Signals**:
  - Dwell time (time spent on job listing)
  - Click patterns (job card clicks, apply button clicks)
  - Scroll depth tracking
- **Session Management**:
  - Browser fingerprinting for anonymous users
  - IP geolocation for regional insights (no PII stored)
  - Session ID tracking across page views
- **Privacy-First**: Aggregated data only, no personal tracking
- **Use Cases**: Improve match scoring, A/B testing, UX optimization

### Route Patterns

**Public Routes** (with rate limiting):

```typescript
// app/api/companies/route.ts
export const GET = withApiAuth(
  async (req: NextRequest) => { ... },
  {
    allowPublic: true,
    rateLimitConfig: { maxRequests: 50, windowMs: 60000 }
  }
);
```

**System Routes** (require SYSTEM_API_KEY):

```typescript
// app/api/match-users/route.ts
const apiKey = req.headers.get("x-system-api-key");
if (apiKey !== ENV.SYSTEM_API_KEY) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Webhook Routes** (signature verification):

```typescript
// app/api/webhooks/polar/route.ts
export const POST = Webhooks({
  webhookSecret: ENV.POLAR_WEBHOOK_SECRET,
  onPayload: async (payload) => { ... }
});
```

---

## Database Schema

### Core Tables

**users** - User profiles

```sql
- id (uuid, primary key)
- email (text, unique)
- full_name (text)
- subscription_tier (text: 'free' | 'premium')
- target_cities (text[])
- career_path (text[])
- work_environment (text)
- visa_sponsorship_required (boolean)
- preferences (jsonb)
- created_at, updated_at (timestamp)
```

**jobs** - Job postings

```sql
- id (uuid, primary key)
- job_hash (text, unique) -- Deduplication
- title, company, location, city, country (text)
- description (text)
- job_url (text)
- categories (text[]) -- Work-type categories
- work_environment (text)
- experience_required (text)
- is_internship, is_graduate (boolean)
- salary_min, salary_max, currency (numeric, text)
- language_requirements (text[])
- is_active (boolean)
- source (text) -- Scraper source
- posted_date, last_seen_at (timestamp)
- embedding (vector(1536)) -- pgvector
```

**matches** - User-job matches

```sql
- id (uuid, primary key)
- user_email (text, foreign key → users.email)
- job_hash (text, foreign key → jobs.job_hash)
- match_score (numeric) -- 0-100
- match_reason (text)
- confidence_score (numeric)
- created_at (timestamp)
```

**companies** - Company metadata

```sql
- id (uuid, primary key)
- name (text, unique)
- visa_sponsorship (boolean)
- size (text)
- industry (text)
- description (text)
```

### Indexes

**Performance Optimization:**

```sql
-- jobs table
CREATE INDEX idx_jobs_city ON jobs(city);
CREATE INDEX idx_jobs_categories ON jobs USING GIN(categories);
CREATE INDEX idx_jobs_active ON jobs(is_active);
CREATE INDEX idx_jobs_posted_date ON jobs(posted_date DESC);
CREATE INDEX idx_jobs_embedding ON jobs USING ivfflat(embedding);

-- matches table
CREATE INDEX idx_matches_user_email ON matches(user_email);
CREATE INDEX idx_matches_job_hash ON matches(job_hash);
CREATE INDEX idx_matches_score ON matches(match_score DESC);
```

---

## Background Jobs

### Scraping Pipeline

**Executor:** `automation/real-job-runner.cjs`

**Schedule:** 2x daily (8am, 6pm UTC)

**8 Active Scrapers:**

1. **JobSpy** - Indeed, Glassdoor
2. **JobSpy Internships** - Internship-only variant
3. **Career Path Roles** - Role-specific scraping
4. **Adzuna** - European job aggregator
5. **Reed** - UK job board
6. **CareerJet** - International jobs
7. **Arbeitnow** - European startups
8. **Jooble** - Global aggregator

**Features:**

- Parallel execution for speed
- Smart stop conditions per scraper
- Daily health checks
- Database monitoring
- Error recovery

### Embedding Refresh

**Executor:** `automation/embedding-refresh.cjs`

**Schedule:** Every 72 hours

**Process:**

1. Fetch jobs without embeddings
2. Generate embeddings via OpenAI (text-embedding-3-small)
3. Store in pgvector column
4. Used for semantic search

---

## Performance Optimizations

### 1. Database Query Optimization

- Pre-filtering reduces job pool by 90%
- Proper indexes on city, categories, active status
- JSONB queries for categories (GIN index)
- pgvector for semantic search

### 2. AI Cost Optimization

- LRU Cache: 60-80% hit rate
- Reduces AI costs by 60-80%
- Cache invalidation on user feedback
- Circuit breaker prevents cascade failures

### 3. Image Optimization

- Next.js Image component
- WebP and AVIF formats
- Responsive sizing
- Lazy loading

### 4. Code Splitting

- Dynamic imports for heavy components
- Route-based code splitting
- Component-level code splitting

### 5. Caching Strategy

- Redis for rate limiting (optional)
- In-memory LRU cache for AI results
- HTTP caching headers
- Vercel Edge caching

---

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Environment setup
# Copy .env.example to .env.local and configure

# Start development server
npm run dev

# Run tests
npm test

# Type check
npm run type-check

# Build for production
npm run build
```

### Deployment

```bash
# Automatic via Vercel
git push origin main

# Manual deployment (if needed)
vercel --prod
```

### Database Migrations

```bash
# Create new migration
npx supabase migration new <name>

# Apply migrations
supabase db push

# Reset database (dev only)
supabase db reset
```

---

## References

- **[README.md](README.md)** - Quick start and project overview
- **[CODE_AUDIT_REPORT.md](CODE_AUDIT_REPORT.md)** - Complete code audit (1,807 lines)
- **[HANDOFF.md](HANDOFF.md)** - Project handoff guide
- **[docs/guides/PRODUCTION_GUIDE.md](docs/guides/PRODUCTION_GUIDE.md)** - Production deployment
- **[docs/guides/RUNBOOK.md](docs/guides/RUNBOOK.md)** - Operational procedures

---

**Last Updated:** January 2025  
**Production Ready:** ✅ Yes (Score: 94/100)
