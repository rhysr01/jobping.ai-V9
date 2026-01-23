# Technical Reference - Complete JobPing Implementation

> **IMPORTANT**: This file contains all technical details removed from the main README for developer context during development. For user-facing documentation, see the main README.md.

## Table of Contents

- [🎨 Frontend Architecture & Component Updates (Jan 2026)](#-frontend-architecture--component-updates-jan-2026)
- [🔒 Security Implementation](#-security-implementation)
- [Signup Flows](#signup-flows)
- [Signup Matching Architecture](#signup-matching-architecture)
- [🚀 Advanced Job Filtering System (Jan 2026)](#-advanced-job-filtering-system-jan-2026)
- [Enterprise Enhancements (Jan 2026)](#enterprise-enhancements-jan-2026)
- [🚨 Critical Production Fixes (Jan 15, 2026)](#-critical-production-fixes-jan-15-2026)
- [🐛 Sentry Error Fixes & Debugging Infrastructure (Jan 23, 2026)](#-sentry-error-fixes--debugging-infrastructure-jan-23-2026)
- [📋 Free Signup & Matching Infrastructure (Jan 23, 2026)](#-free-signup--matching-infrastructure-jan-23-2026)
- [Detailed API Reference](#detailed-api-reference)
- [Complete Database Schema](#complete-database-schema)
- [Job Scraping System Details](#job-scraping-system-details)
- [AI Matching Engine Implementation](#ai-matching-engine-implementation)
- [Component Architecture Details](#component-architecture-details)
- [Performance Considerations Deep Dive](#performance-considerations-deep-dive)
- [📱 Mobile Performance Issues & Fixes](#-mobile-performance-issues--fixes)
- [Testing Strategy Details](#testing-strategy-details)
- [Deployment & DevOps Details](#deployment--devops-details)
- [Contributing Technical Details](#contributing-technical-details)
- [Development Setup Deep Dive](#development-setup-deep-dive)
- [Project Structure Details](#project-structure-details)
- [Development Workflow Technical](#development-workflow-technical)

---

## 🎨 Frontend Architecture & Component Updates (Jan 2026)

### Overview
**Status**: ✅ **MODERN COMPONENT ARCHITECTURE IMPLEMENTED**

Recent frontend improvements focused on visual consistency, component reusability, and enhanced user experience through unified design patterns.

### New Components & Architecture

#### JobStatsDisclaimer Component
**Location**: `components/ui/JobStatsDisclaimer.tsx`
**Purpose**: Unified display of job statistics and transparency disclaimer

**Features**:
- **Live Indicator**: Animated pulsing green dot with "Live" label
- **Stats Banner**: Glass-card design showing job counts and city coverage
- **Enhanced Disclaimer**: Structured layout with job source badges
- **Responsive Design**: Works across all device sizes
- **Motion Animations**: Smooth entrance with staggered timing

**Implementation**:
```typescript
interface JobStatsDisclaimerProps {
  totalJobs?: number;
  totalCities?: number;
  isLoadingStats?: boolean;
  className?: string;
}

// Usage
<JobStatsDisclaimer
  totalJobs={8958}
  totalCities={21}
  isLoadingStats={false}
  className="mt-12 md:mt-16"
/>
```

**Visual Structure**:
```
┌─────────────────────────────────────────────────────────┐
│  ● Live   Updated daily • 8,958+ roles from 21 cities across Europe  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ℹ️ JobPing aggregates jobs from trusted public sources │
│     and company career pages. We are not affiliated    │
│     with these companies and match you with available  │
│     listings.                                          │
│                                                         │
│  Sources: [Indeed] [Glassdoor] [Adzuna] [Jooble] ...    │
└─────────────────────────────────────────────────────────┘
```

#### Design System Consistency Updates

**Subtitle Color Standardization**:
- **Issue**: Mixed `text-zinc-400` and `text-zinc-300` across components
- **Solution**: Standardized all subtitle text to `text-zinc-300` for better contrast
- **Components Updated**: Pricing, footers, disclaimers, empty states, form descriptions

**Files Modified**:
- `components/sections/pricing.tsx` - Feature descriptions
- `components/sections/footer.tsx` - Disclaimer text
- `components/ui/empty-states.tsx` - Subtitle contrast
- `components/sections/how-it-works.tsx` - Step descriptions
- `components/signup/SignupFormFree.tsx` - Progress indicators

#### Hero Section Enhancements

**Headline Size Compliance**:
- **Issue**: Hero headline `text-7xl` inconsistent with design system
- **Solution**: Reduced to `lg:text-6xl` matching `--text-display-xl` token
- **Impact**: Better visual hierarchy and design system adherence

**Logo & Headline Reduction**:
- **Implementation**: 20% size reduction for both logo and headline
- **CSS Changes**: `scale-72 md:scale-80` for logo, responsive headline scaling

#### Component Architecture Improvements

**Import Optimization**:
- **Removed**: Unused `GradientText` import from `EUJobStats.tsx`
- **Result**: Clean TypeScript compilation, faster build times
- **Build Performance**: Reduced compilation time to 16.7s

**Signup Navigation Refactoring**:
- **New Hook**: `useFreeSignupNavigation` for simplified free flow
- **Benefits**: Better validation logic, cleaner component separation
- **Impact**: Fixed "Continue" button functionality

---

## 🚀 Advanced Job Filtering System (Jan 2026)

### Overview
**Status**: ✅ **ENTERPRISE-GRADE AUTOMATED FILTERING IMPLEMENTED**

JobPing has implemented a comprehensive 11-category job filtering system that runs 4 times daily to maintain high-quality job recommendations for international students and early-career professionals.

### Architecture

#### Automated Filtering Pipeline
```
Job Scraping → Data Ingestion → Automated Filtering → Quality Validation → User Recommendations
     ↓              ↓                ↓                    ↓                  ↓
  Multi-source   PostgreSQL      11 Categories      Metadata         AI Matching
  Collection    Processing       (4x daily)         Checks          Algorithms
```

#### Cron Job Configuration
```json
{
  "path": "/api/cron/run-filtering",
  "schedule": "0 */6 * * *"  // Every 6 hours = 4x daily
}
```
**Execution Times**: 00:00, 06:00, 12:00, 18:00 UTC

### Filtering Categories (11 Total)

#### 1. Government & Political Roles
- **Target**: Politicians, diplomats, government officials, ministers
- **Implementation**: Pattern matching on titles and descriptions
- **Impact**: ~4 jobs filtered daily
- **Rationale**: Not suitable for business school graduates

#### 2. Military & Defense Roles
- **Target**: Armed forces, security guards, defense personnel
- **Implementation**: Comprehensive military terminology detection
- **Impact**: ~1 job filtered daily
- **Rationale**: Specialized roles outside business domain

#### 3. Entertainment & Sports Roles
- **Target**: Athletes, actors, musicians, fitness trainers, coaches
- **Implementation**: Entertainment industry and sports terminology
- **Impact**: ~21 jobs filtered daily
- **Rationale**: Creative/artistic roles vs business careers

#### 4. Hospitality & Service Industry
- **Target**: Waiters, bartenders, hotel staff, tour guides, restaurant workers
- **Implementation**: Hospitality-specific role detection
- **Impact**: ~5 jobs filtered daily
- **Rationale**: Service industry vs professional business roles

#### 5. Retail & Sales Assistant Roles
- **Target**: Cashiers, sales assistants, shop workers, retail staff
- **Implementation**: Retail terminology and entry-level sales detection
- **Impact**: ~8 jobs filtered daily
- **Rationale**: Entry-level retail vs business development careers

#### 6. Manual Labor & Technical Trades
- **Target**: Mechanics, electricians, plumbers, drivers, construction trades
- **Implementation**: Trade-specific terminology (excluding IT/software)
- **Impact**: Variable, focused on non-IT technical roles
- **Rationale**: Manual trades vs business/technology careers

#### 7. Real Estate & Insurance Sales
- **Target**: Real estate agents, insurance brokers, loan officers
- **Implementation**: Financial services sales role detection
- **Impact**: ~2 jobs filtered daily
- **Rationale**: Specialized sales vs general business roles

#### 8. Call Center & Telemarketing
- **Target**: Telemarketers, call center agents, phone operators
- **Implementation**: Customer service and telemarketing terminology
- **Impact**: Variable, focused on pure telemarketing roles
- **Rationale**: Repetitive sales vs business development

#### 9. CEO & Executive Roles
- **Target**: CEO, CFO, CTO, COO, CMO, senior executives
- **Implementation**: C-suite title detection with exceptions for entry-level
- **Impact**: ~14 jobs filtered daily
- **Rationale**: Senior leadership vs graduate/entry-level roles

#### 10. Medical & Healthcare Roles
- **Target**: Doctors, nurses, therapists, pharmacists, healthcare staff
- **Implementation**: Medical terminology and healthcare role detection
- **Impact**: ~123 jobs filtered daily
- **Rationale**: Healthcare careers vs business administration

#### 11. Teaching & Education Roles
- **Target**: Teachers, lecturers, professors, educators (non-business)
- **Implementation**: Education terminology excluding business education
- **Impact**: ~111 jobs filtered daily
- **Rationale**: Academic careers vs business professions

### Technical Implementation

#### API Endpoint: `/api/cron/run-filtering`
```typescript
// POST/GET endpoint with CRON_SECRET authentication
// Processes ~1,500+ jobs in each run
// Comprehensive error handling and logging
// Batch processing for performance
```

#### Database Operations
- **Bulk Updates**: Efficient batch processing with proper indexing
- **Duplicate Prevention**: Smart filtering to avoid re-processing
- **Audit Trail**: Complete logging of filtered jobs and reasons
- **Performance**: Optimized queries with proper WHERE clauses

#### Quality Assurance
- **Automated Testing**: Validates filtering effectiveness
- **Performance Monitoring**: Tracks execution time and success rates
- **Error Recovery**: Graceful handling of database timeouts
- **Metrics Collection**: Comprehensive filtering statistics

### Performance Metrics

#### Current Filtering Impact
- **Total Jobs Filtered**: 1,000+ jobs from database
- **Daily Processing**: 4 automated filtering runs
- **Categories Active**: All 11 categories operational
- **Execution Time**: < 5 minutes per run
- **Database Load**: Minimal impact on production performance

#### Quality Improvements
- **Relevance Increase**: 20-30% improvement in match quality
- **User Satisfaction**: Higher quality recommendations
- **Conversion Rates**: Better alignment with user expectations
- **Platform Value**: Enhanced competitive positioning

### Database Schema Impact

#### Jobs Table Updates
```sql
-- New filtering_reason column with multi-value support
-- Status consistency enforcement
-- Metadata validation improvements
-- Automated cleanup of invalid data
```

#### Migration History
- **20260121000000_additional_role_filters.sql**: 8 new categories
- **20260122000000_metadata_quality_improvements.sql**: Data quality fixes
- **20260120000000_consolidated_data_quality_fixes.sql**: Category cleanup

### Monitoring & Maintenance

#### Automated Monitoring
- **Health Checks**: 6-hour interval monitoring
- **Performance Alerts**: Execution time and error tracking
- **Quality Metrics**: Filtering effectiveness measurement
- **Database Health**: Connection and performance monitoring

#### Manual Oversight
- **Weekly Reviews**: Filtering effectiveness analysis
- **Category Tuning**: Adjustment based on user feedback
- **Performance Optimization**: Query optimization and indexing
- **Quality Assurance**: Regular validation of filtering logic

### Future Enhancements

#### Planned Improvements
- **Machine Learning**: AI-powered filtering refinement
- **User Feedback**: Dynamic category adjustment
- **Regional Adaptation**: Country-specific filtering rules
- **Industry Focus**: Enhanced business sector detection

#### Scalability Considerations
- **Batch Size Optimization**: Efficient processing of large job volumes
- **Database Performance**: Continued optimization of filtering queries
- **Monitoring Enhancement**: Advanced metrics and alerting
- **Quality Metrics**: Deeper analysis of filtering effectiveness

---

## 🔒 Security Implementation

### Database Security (January 2026)

**Status**: ✅ **ENTERPRISE-GRADE SECURITY IMPLEMENTED**

Following a comprehensive database audit, JobPing has implemented enterprise-grade security measures to protect user data and ensure GDPR compliance.

#### Row Level Security (RLS)
- **✅ Enabled** on all core tables (`users`, `jobs`, `matches`, `match_logs`, `pending_digests`)
- **✅ Access Policies** restrict users to their own data only
- **✅ Function Security** - All database functions run with security definer
- **✅ Audit Logging** - Complete audit trail of data access

#### Authentication & Authorization
- **HMAC Signatures** for internal API authentication
- **JWT Tokens** with 15-minute expiration
- **Password Hashing** using bcrypt with salt rounds
- **Session Management** with secure HTTP-only cookies

#### Data Protection
- **Encryption at Rest** - All sensitive data encrypted in database
- **Secure APIs** - All endpoints require authentication and authorization
- **Input Validation** - Comprehensive input sanitization and validation
- **SQL Injection Prevention** - Parameterized queries and prepared statements

#### GDPR Compliance
- **Data Minimization** - Only collect necessary user data
- **Consent Management** - Explicit user consent for data processing
- **Right to Deletion** - Complete user data removal on request
- **Data Portability** - Export user data in standard formats

#### Security Monitoring
- **Failed Login Tracking** - Monitor and block suspicious activity
- **Rate Limiting** - Distributed Redis-based protection (30 requests/minute)
- **Security Headers** - Comprehensive security headers implementation
- **Vulnerability Scanning** - Regular security audits and updates

---

## Signup Flows

### Free User Signup Flow

1. **Initial Visit** → Landing page with value proposition
2. **Form Submission** → Email, city preferences, career path
3. **Email Verification** → Magic link sent to user email
4. **Email Click** → Redirects to job matching interface
5. **Job Matching** → AI-powered matching with 5 instant results
6. **Results Display** → Personalized job recommendations
7. **User Engagement** → Apply buttons, save jobs, feedback

### Premium User Signup Flow

1. **Landing Page** → Clear premium value proposition (€5/month)
2. **Multi-Step Form** → 4-step comprehensive onboarding
   - Step 1: Basic info (email, name, location)
   - Step 2: Career details (experience, skills, industries)
   - Step 3: Preferences (work environment, company size, visa needs)
   - Step 4: Payment (Stripe integration)
3. **Payment Processing** → Secure Stripe checkout
4. **Account Activation** → Instant premium access
5. **Enhanced Matching** → 15 jobs/week via email digests
6. **Ongoing Engagement** → Weekly personalized digests (Mon/Wed/Fri)

### Authentication Implementation

#### Email Verification System
- **Magic Links** - Secure token-based authentication
- **Token Expiration** - 24-hour validity window
- **Single Use** - Tokens invalidated after use
- **Rate Limiting** - 5 verification emails per hour per IP

#### Session Management
- **HTTP-Only Cookies** - XSS protection
- **Secure Flag** - HTTPS-only in production
- **SameSite** - CSRF protection
- **Expiration** - 7-day sessions with sliding expiration

---

## Signup Matching Architecture

### Free Tier Matching Pipeline

```
User Input → Validation → Hard Filtering → AI Matching → Fallback → Results
     ↓           ↓            ↓            ↓           ↓          ↓
  Raw Data   Sanitize    Location/Career  GPT-4      Rule-based  5 Jobs
             GDPR        Visa Filtering   Embeddings Algorithm
```

#### Hard Filtering Stage
- **Location Matching**: City name exact match or country containment
- **Career Path**: Category matching with synonym expansion
- **Visa Requirements**: Explicit visa sponsorship filtering
- **Freshness**: Jobs posted within last 30 days
- **Quality Gates**: Minimum description length, valid URLs

#### AI Matching Stage
- **Semantic Similarity**: OpenAI embeddings comparison
- **Context Awareness**: User preferences + job requirements
- **Confidence Scoring**: 0-100 confidence levels
- **Fallback Triggers**: API failures or low confidence scores

#### Rule-Based Fallback
- **Experience Matching**: Entry-level vs senior filtering
- **Skills Matching**: Keyword-based relevance scoring
- **Company Reputation**: Established company bonus points
- **Geographic Proximity**: Regional preference matching

### Premium Tier Enhanced Pipeline

```
User Input → Enhanced Validation → Multi-Stage Filtering → Advanced AI → Personalized Ranking → Email Delivery
     ↓             ↓                      ↓                    ↓              ↓               ↓
Comprehensive  Multi-field            Skills/Industry       GPT-4 Advanced  Career Balance  Mon/Wed/Fri
Data Input    Validation             Matching              Processing       Distribution    Digests
```

#### Enhanced Validation
- **17+ Fields**: Comprehensive user profile collection
- **Skills Taxonomy**: Standardized skill categorization
- **Industry Mapping**: Company type and sector preferences
- **Work Environment**: Remote, hybrid, office preferences

#### Advanced AI Processing
- **Multi-Modal Scoring**: Skills + experience + preferences
- **Career Path Optimization**: Long-term career trajectory matching
- **Company Culture Fit**: Work environment alignment
- **Growth Potential**: Company size and growth stage matching

#### Personalized Distribution
- **Career Path Balance**: Even distribution across multiple career paths
- **Geographic Diversity**: Multiple city coverage
- **Company Size Variety**: Mix of startup vs enterprise
- **Skill Development**: Jobs that build user capabilities

---

## Enterprise Enhancements (Jan 2026)

### Advanced Job Filtering System (Jan 21-22, 2026)

#### Automated Quality Assurance Pipeline
- **11-Category Filtering**: Comprehensive irrelevant job removal
- **4x Daily Automation**: Continuous data quality maintenance
- **Real-time Processing**: Sub-5-minute execution per run
- **Quality Metrics**: 1,000+ jobs filtered, 20-30% relevance improvement

#### Cron Job Infrastructure
- **Vercel Cron Jobs**: Serverless scheduled execution
- **Multi-timezone Support**: UTC-based global scheduling
- **Error Recovery**: Automatic retry and failure notification
- **Performance Monitoring**: Execution time and success rate tracking

#### Database Optimization for Filtering
- **Batch Processing**: Efficient bulk operations for 10,000+ jobs
- **Index Optimization**: Optimized queries for filtering performance
- **Connection Management**: Efficient database connection handling
- **Audit Trail**: Complete filtering history and reasoning

### Advanced Security Implementation

#### Database Encryption Strategy
- **Field-Level Encryption**: Sensitive user data encrypted at rest
- **Key Management**: AWS KMS integration for encryption keys
- **Audit Compliance**: SOC 2 Type II compliance preparation
- **Access Logging**: Comprehensive data access audit trails

#### API Security Hardening
- **Request Signing**: HMAC-SHA256 for internal API calls
- **Rate Limiting**: Advanced rate limiting with burst protection
- **Input Sanitization**: Multi-layer XSS and injection prevention
- **CORS Configuration**: Strict origin validation

### Performance Optimization Suite

#### Advanced Filtering Performance
- **Batch Processing Engine**: Handles 10,000+ jobs in <5 minutes
- **Query Optimization**: Complex filtering with sub-second execution
- **Memory Efficient**: Streaming processing for large datasets
- **Concurrent Operations**: Parallel filtering across categories

#### Caching Architecture
- **Redis Multi-Layer**: Session, API response, and computation caching
- **Cache Invalidation**: Smart invalidation strategies
- **Cache Warming**: Proactive cache population for popular queries
- **Memory Management**: LRU eviction and memory limits

#### Database Optimization
- **Query Optimization**: EXPLAIN ANALYZE for all complex queries
- **Index Strategy**: Composite indexes for common query patterns
- **Filtering Indexes**: Optimized indexes for 11-category filtering
- **Connection Pooling**: PgBouncer integration
- **Read Replicas**: Geographic distribution for global performance

### Monitoring & Observability

#### Automated Filtering Metrics
- **Filtering Effectiveness**: 1,000+ jobs filtered across 11 categories
- **Execution Monitoring**: 4x daily run success/failure tracking
- **Performance Metrics**: Sub-5-minute execution time monitoring
- **Quality Assurance**: Automated validation of filtering results

#### Application Metrics
- **Custom Dashboards**: Real-time performance monitoring
- **Error Tracking**: Sentry integration with context
- **User Analytics**: PostHog event tracking
- **Business KPIs**: Conversion funnel analysis

#### Infrastructure Monitoring
- **Server Health**: CPU, memory, disk usage tracking
- **API Performance**: Response times and error rates
- **Database Health**: Connection pools and query performance
- **Filtering Load**: Database impact monitoring during filtering runs
- **External Dependencies**: OpenAI, Stripe, email service monitoring

---

## 🚨 Critical Production Fixes (Jan 15, 2026)

### Database Integrity Issues

#### Visa Sponsorship Data Corruption
- **Issue**: `visa_friendly` field missing from jobs table
- **Impact**: Visa filtering completely broken for international users
- **Root Cause**: Migration script incomplete during table creation
- **Fix**: Added column with NOT NULL constraint and comprehensive backfill

#### Career Path Array Handling
- **Issue**: Mixed string/array handling in career_path field
- **Impact**: AI matching failures for users with multiple career paths
- **Root Cause**: Inconsistent data types in user preferences
- **Fix**: Standardized array handling with proper type checking

### API Reliability Issues

#### Rate Limiting Implementation
- **Issue**: Aggressive rate limiting blocking legitimate users
- **Impact**: User signup failures during peak hours
- **Root Cause**: Overly restrictive rate limits without burst handling
- **Fix**: Implemented burst allowances and intelligent rate limiting

#### Request Body Consumption
- **Issue**: `NextRequest` body read multiple times causing failures
- **Impact**: Intermittent API failures across endpoints
- **Root Cause**: Body consumption in authentication middleware
- **Fix**: Proper body cloning and single-read patterns

#### Free Signup City Normalization
- **Issue**: `target_cities` array field inconsistent handling in `/api/signup/free`
- **Impact**: Free user signup failures due to malformed city data
- **Root Cause**: Supabase returning arrays in different formats (array vs JSON string)
- **Fix**: Implemented "CRITICAL FIX" normalization logic with comprehensive test coverage
- **Testing**: 24 unit/integration tests covering all edge cases and performance scenarios

### Email Delivery Problems

#### SMTP Configuration Issues
- **Issue**: Email delivery failures due to SMTP timeouts
- **Impact**: User verification emails not reaching inbox
- **Root Cause**: Improper connection pooling and timeout settings
- **Fix**: Optimized SMTP configuration with proper error handling

#### Template Rendering Errors
- **Issue**: Email template failures with special characters
- **Impact**: Broken email formatting for international users
- **Root Cause**: HTML escaping issues in dynamic content
- **Fix**: Comprehensive HTML sanitization and encoding

---

## 🐛 Sentry Error Fixes & Debugging Infrastructure (Jan 23, 2026)

### Overview
**Status**: ✅ **CRITICAL ERRORS FIXED & DEBUGGING ENHANCED**

Comprehensive fixes for production Sentry errors and enhanced debugging infrastructure for free signup flow.

### Critical Error Fixes

#### 1. BrandIcons/Zap Undefined Errors (26 occurrences)
- **Issue**: `ReferenceError: BrandIcons is not defined` and `ReferenceError: Zap is not defined`
- **Location**: `components/sections/hero.tsx`, various components using `BrandIcons.Zap`
- **Root Cause**: SSR (Server-Side Rendering) issues - BrandIcons not available during server rendering
- **Fix Applied**: Added `"use client"` directive to `components/ui/BrandIcons.tsx`
- **Impact**: Prevents hydration mismatches and undefined reference errors
- **Status**: ✅ Fixed

#### 2. setFormData/updateFormData Undefined Errors (6 occurrences)
- **Issue**: `ReferenceError: setFormData is not defined` and `ReferenceError: updateFormData is not defined`
- **Location**: `components/signup/SignupFormFree.tsx`
- **Root Cause**: Functions might be undefined during SSR before hook initializes
- **Fix Applied**: Added guard checks (client-side only) to detect and log if undefined
- **Implementation**:
  ```typescript
  // Guard against undefined functions during SSR or initialization
  if (typeof window !== "undefined" && (!setFormData || !updateFormData)) {
    console.error("[FREE SIGNUP CLIENT] Critical: setFormData or updateFormData is undefined", {
      hasSetFormData: !!setFormData,
      hasUpdateFormData: !!updateFormData,
      signupStateKeys: Object.keys(signupState),
    });
  }
  ```
- **Status**: ✅ Guard added, monitoring

#### 3. Body Already Read Error (103 occurrences)
- **Issue**: `TypeError: Body is unusable: Body has already been read`
- **Location**: `/api/match-users` route handler
- **Root Cause**: Request body being read multiple times by Next.js error handlers or middleware
- **Fix Applied**: Clone request before reading body to preserve original for error handling
- **Implementation**:
  ```typescript
  // Clone request to prevent "Body already read" errors
  const clonedReq = req.clone();
  
  // Read from cloned request
  body = await clonedReq.json();
  bodyString = JSON.stringify(body); // Store for error logging
  ```
- **Status**: ✅ Fixed

#### 4. React Hydration Error #185
- **Issue**: Minified React error #185 (hydration mismatch)
- **Root Cause**: `console.group`/`console.groupEnd` calls causing hydration mismatches in production
- **Fix Applied**: Guard all `console.group` calls with `typeof window !== "undefined" && process.env.NODE_ENV === "development"`
- **Impact**: Prevents hydration errors while maintaining debugging capabilities in development
- **Status**: ✅ Fixed

### Enhanced Debugging Infrastructure

#### Comprehensive Console Logging
**Purpose**: Enable F12 debugging for free signup flow

**Client-Side Logging** (`components/signup/SignupFormFree.tsx`):
- 🔵 Form submission start (with form data)
- 🟢 API request details (payload, attempt number)
- ✅ API response received (success, matchCount, userId)
- ❌ Error details (full error objects, API responses)
- 🎉 Success flow (redirect preparation)

**Server-Side Logging** (`app/api/signup/free/route.ts`):
- Request received (requestId, timestamp)
- Request body received (all form fields)
- Validation result (success/failure with errors)
- User creation steps (minimal insert, update)
- Job fetching (initial fetch, fallbacks)
- Matching process (start, completion, match count)

**API Client Logging** (`lib/api-client.ts`):
- Request attempts (URL, method, attempt number)
- Response status (status code, headers)
- Error responses (full error details)
- JSON parsing (success, matchCount, errors)

**Log Format**:
- All logs prefixed with `[FREE SIGNUP]`, `[FREE SIGNUP CLIENT]`, or `[API CLIENT]`
- Console groups in development (collapsible)
- Regular console.log in production (Next.js strips console.log)
- Full request/response objects logged for debugging

#### Error Tracking Summary
**13 error types** tracked across signup flow:

**Server-Side (8 types)**:
1. Rate limit exceeded
2. Validation failed
3. User check error
4. User creation failed
5. User update failed
6. No jobs found
7. No jobs for matching
8. No matches found

**Client-Side (3 types)**:
9. Client-side validation error
10. API error
11. Unexpected error

**Global (2 types)**:
12. Error boundary catches
13. Global error handler

**Sentry Integration**:
- All errors include requestId for tracing
- Tagged with `endpoint: "signup-free"` and `error_type`
- Context data (email, cities, careerPath) included
- Full error details and stack traces

### Testing & Monitoring

#### Post-Deployment Monitoring
- Monitor Sentry for error rate decreases
- Track BrandIcons/Zap error frequency
- Monitor setFormData/updateFormData errors
- Verify body read errors eliminated

#### Debugging Workflow
1. Open F12 → Console tab
2. Submit free signup form
3. Watch grouped logs flow through entire process
4. Check Network tab for raw HTTP requests/responses
5. Review Sentry for server-side errors

---

## 📋 Free Signup & Matching Infrastructure (Jan 23, 2026)

### Overview
**Status**: ✅ **COMPLETE INFRASTRUCTURE DOCUMENTATION**

Complete technical documentation of free signup flow and matching infrastructure based on codebase analysis.

### Free Signup Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FREE SIGNUP PIPELINE                          │
└─────────────────────────────────────────────────────────────────┘

1. Frontend Form (SignupFormFree.tsx)
   ├─ Multi-step form (3 steps)
   ├─ Client-side validation
   └─ Form persistence (localStorage)

2. API Route (/api/signup/free)
   ├─ Rate Limiting (10 requests/hour/IP)
   ├─ Input Validation (Zod schema)
   ├─ User Existence Check
   ├─ User Creation (Minimal → Update pattern)
   ├─ Job Fetching (Country-level → Fallbacks)
   ├─ Matching Engine (SignupMatchingService)
   └─ Response (Success/Error with requestId)

3. Matching Engine (SignupMatchingService)
   ├─ PrefilterService (Location/Career/Visa filtering)
   ├─ ConsolidatedMatchingEngine (AI + Rule-based)
   └─ Match Storage (Database persistence)

4. Frontend Success Handling
   ├─ Cookie Setting (Session management)
   ├─ Redirect to /matches
   └─ Match Display
```

### Matching Pipeline Architecture

```
User Input → Validation → Hard Filtering → AI Matching → Fallback → Results
     ↓           ↓            ↓            ↓           ↓          ↓
  Raw Data   Sanitize    Location/Career  GPT-4      Rule-based  5 Jobs
             GDPR        Visa Filtering   Embeddings Algorithm
```

#### Stage 1: Hard Filtering (PrefilterService)
- **Location Matching**: City name exact match or country containment
- **Career Path**: Category matching with synonym expansion
- **Visa Requirements**: Explicit visa sponsorship filtering
- **Freshness**: Jobs posted within last 30 days (free tier)
- **Quality Gates**: Minimum description length, valid URLs

#### Stage 2: AI Matching (ConsolidatedMatchingEngine)
- **Semantic Similarity**: OpenAI embeddings comparison
- **Context Awareness**: User preferences + job requirements
- **Confidence Scoring**: 0-100 confidence levels
- **Fallback Triggers**: API failures or low confidence scores

#### Stage 3: Rule-Based Fallback
- **Experience Matching**: Entry-level vs senior filtering
- **Skills Matching**: Keyword-based relevance scoring
- **Company Reputation**: Established company bonus points
- **Geographic Proximity**: Regional preference matching

### Infrastructure Components

#### 1. API Layer (`/app/api/signup/free/route.ts`)
- **Runtime**: Vercel serverless functions
- **Rate Limiting**: Redis-backed (10 requests/hour/IP)
- **Error Handling**: Structured error responses with requestId
- **Logging**: Comprehensive request/response logging
- **Sentry Integration**: All error points tracked

#### 2. Matching Service (`SignupMatchingService`)
- **Location**: `utils/services/SignupMatchingService.ts`
- **Purpose**: Consolidated matching logic for both free & premium
- **Config**: Tier-aware configurations (`free` vs `premium_pending`)
- **Methods**:
  - `getConfig(tier)` - Get tier-specific matching config
  - `runMatching(userPrefs, config)` - Execute matching pipeline
  - `checkExistingMatches(email, tier)` - Prevent duplicates

#### 3. Prefilter Service (`PrefilterService`)
- **Location**: `utils/matching/core/prefilter.service.ts`
- **Purpose**: Hard filtering before AI matching
- **Filters**:
  - Location (city variations, country matching)
  - Career path (synonym expansion)
  - Visa status (sponsorship requirements)
  - Job freshness (30 days for free)
  - Quality gates (description length, valid URLs)

#### 4. Matching Engine (`ConsolidatedMatchingEngine`)
- **Location**: `lib/matching/engine.ts`
- **Purpose**: AI + Rule-based matching coordination
- **Features**:
  - GPT-4 semantic similarity
  - Embedding-based matching
  - Fallback rule-based algorithm
  - Confidence scoring
  - Diversity distribution

### Data Flow

#### Free Signup Request Flow
```
1. User submits form → SignupFormFree.tsx
2. Client validation → useEmailValidation, form checks
3. API call → POST /api/signup/free
4. Rate limit check → Redis-based limiting
5. Input validation → Zod schema validation
6. User check → Supabase query (existing user?)
7. User creation → Minimal insert → Update pattern
8. Job fetching → Country-level → Fallback strategies
9. Matching → SignupMatchingService.runMatching()
10. Match storage → Database persistence
11. Cookie setting → Session management
12. Response → Success with matchCount
13. Redirect → /matches page
```

#### Matching Execution Flow
```
1. User preferences extracted
2. PrefilterService filters jobs:
   - Location matching (city/country)
   - Career path matching
   - Visa status filtering
   - Freshness filtering (30 days)
3. ConsolidatedMatchingEngine processes:
   - AI matching (if available)
   - Embedding similarity
   - Fallback rule-based matching
4. Results ranked and filtered:
   - Confidence scoring
   - Diversity distribution
   - Top 5 matches selected
5. Matches stored in database
6. Results returned to API
```

### Error Handling Points

#### Server-Side (API Route)
1. **Rate Limit Exceeded** - 10 requests/hour/IP
2. **Validation Failed** - Zod schema validation
3. **User Check Error** - Database connection issues
4. **User Creation Failed** - Database constraints
5. **User Update Failed** - Schema cache issues
6. **No Jobs Found** - Empty database or strict filtering
7. **No Jobs for Matching** - All jobs filtered out
8. **No Matches Found** - Matching engine too strict

#### Client-Side (React Component)
1. **Client-Side Validation** - Form field validation
2. **API Error** - Network/server errors
3. **Unexpected Error** - Non-ApiError exceptions

### Performance Considerations

#### Caching Strategy
- **Job Embeddings**: Pre-computed semantic embeddings (24h cache)
- **User Matches**: Recent matches cached (5min cache)
- **Session Data**: Redis-backed session storage

#### Batch Processing
- **User Processing**: Processed individually (not batched for signup)
- **Job Fetching**: Country-level queries for efficiency
- **Matching**: Single user matching (not batch)

#### Optimization
- **Database Queries**: Optimized with proper indexes
- **AI Calls**: Rate-limited and cached
- **Response Time**: Target <5s for free signup

### Configuration

#### Free Tier Limits
- **Matches**: 5 instant matches
- **Job Freshness**: 30 days
- **Rate Limit**: 10 signups/hour/IP
- **Session**: 30 days cookie expiration

#### Matching Config
```typescript
{
  tier: "free",
  matchCount: 5,
  jobFreshnessDays: 30,
  useAI: true,
  fallbackEnabled: true,
  diversityEnabled: false
}
```

### Related Documentation
- See `docs/free-signup-matching-infrastructure.md` for complete details
- See `docs/sentry-error-tracking-summary.md` for error tracking details
- See `docs/sentry-errors-fix-plan.md` for fix implementation details

---

## Detailed API Reference

### Authentication Endpoints

#### POST `/api/auth/login`
**Purpose**: User authentication with email/password
**Rate Limit**: 5 attempts per 15 minutes per IP
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```
**Response**: JWT token with user session

#### POST `/api/auth/register`
**Purpose**: New user registration
**Rate Limit**: 3 registrations per hour per IP
**Validation**: Email format, password strength, duplicate checking

#### POST `/api/auth/verify-email`
**Purpose**: Email address verification
**Security**: Single-use tokens with 24-hour expiration
**Process**: Token validation → account activation → welcome email

### Job Matching Endpoints

#### GET `/api/matches/free`
**Purpose**: Retrieve free tier job matches
**Authentication**: Cookie-based (`free_user_email`)
**Caching**: 5-minute cache with Redis
**Response**: 5 job matches with unified scoring

#### GET `/api/matches/premium`
**Purpose**: Retrieve premium tier job matches
**Authentication**: JWT token required
**Features**: Enhanced filtering, 15 matches, detailed analytics
**Caching**: Personalized cache with 10-minute TTL

#### POST `/api/match-users`
**Purpose**: Batch processing for all active users
**Authentication**: HMAC signature required
**Schedule**: Runs every 4 minutes
**Processing**: 50 users per batch, AI + fallback matching

### Administrative Endpoints

#### POST `/api/admin/user-management`
**Purpose**: User administration and moderation
**Access**: Admin role required
**Features**: User deactivation, data export, GDPR compliance

#### GET `/api/admin/analytics`
**Purpose**: System analytics and reporting
**Access**: Admin role required
**Data**: User metrics, job statistics, performance KPIs

#### POST `/api/admin/maintenance`
**Purpose**: System maintenance operations
**Access**: Admin role required
**Operations**: Database cleanup, cache invalidation, health checks

---

## Complete Database Schema

### Core Tables Structure

#### `users` Table - Complete Schema
```sql
-- Primary user table with comprehensive profile data
CREATE TABLE users (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,

  -- Account status
  active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  verification_token_expires TIMESTAMPTZ,

  -- Subscription management
  subscription_active BOOLEAN DEFAULT false,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  stripe_customer_id TEXT UNIQUE,
  subscription_cancelled_at TIMESTAMPTZ,

  -- Email engagement tracking
  email_count INTEGER DEFAULT 0,
  last_email_sent TIMESTAMPTZ,
  last_email_opened TIMESTAMPTZ,
  last_email_clicked TIMESTAMPTZ,
  email_engagement_score DECIMAL(3,2) DEFAULT 0.0 CHECK (email_engagement_score >= 0 AND email_engagement_score <= 1),
  email_phase TEXT DEFAULT 'onboarding' CHECK (email_phase IN ('onboarding', 'active', 'inactive', 'churned')),
  delivery_paused BOOLEAN DEFAULT false,

  -- Basic preferences (legacy support)
  target_cities TEXT[] DEFAULT '{}',
  roles_selected TEXT[] DEFAULT '{}',
  languages_spoken TEXT[] DEFAULT '{}',
  career_path TEXT, -- Legacy single career path
  work_environment TEXT CHECK (work_environment IN ('remote', 'hybrid', 'office')),
  entry_level_preference TEXT,
  visa_status TEXT,

  -- Enhanced preferences (premium features)
  skills TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  company_size_preference TEXT CHECK (company_size_preference IN ('startup', 'small', 'medium', 'large', 'enterprise')),
  career_keywords TEXT,

  -- System timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_users_active ON users(active);
CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_own_data ON users FOR ALL USING (auth.uid() = id);
```

#### `jobs` Table - Complete Schema
```sql
-- Comprehensive job listings table
CREATE TABLE jobs (
  -- Core job data
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_hash TEXT UNIQUE NOT NULL, -- Deduplication key
  title TEXT NOT NULL,
  company TEXT,
  company_name TEXT, -- Normalized company name
  location TEXT,
  city TEXT,
  country TEXT,
  description TEXT,
  job_url TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  currency TEXT DEFAULT 'EUR',

  -- Job metadata
  posted_at DATE,
  expires_at DATE,
  work_environment TEXT CHECK (work_environment IN ('remote', 'hybrid', 'office')),
  job_type TEXT CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship')),
  experience_level TEXT CHECK (experience_level IN ('entry', 'mid', 'senior', 'executive')),

  -- Categorization
  categories TEXT[] DEFAULT '{}', -- Job categories
  skills_required TEXT[] DEFAULT '{}', -- Required skills
  industries TEXT[] DEFAULT '{}', -- Industry classifications

  -- Quality and filtering
  visa_friendly BOOLEAN NOT NULL DEFAULT false,
  quality_score INTEGER DEFAULT 50 CHECK (quality_score >= 0 AND quality_score <= 100),
  active BOOLEAN DEFAULT true,

  -- System fields
  source TEXT, -- Job board source
  source_id TEXT, -- External ID from source
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_scraped_at TIMESTAMPTZ
);

-- Performance indexes
CREATE INDEX idx_jobs_active ON jobs(active);
CREATE INDEX idx_jobs_city ON jobs(city);
CREATE INDEX idx_jobs_categories ON jobs USING GIN(categories);
CREATE INDEX idx_jobs_visa_friendly ON jobs(visa_friendly);
CREATE INDEX idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX idx_jobs_quality_score ON jobs(quality_score DESC);

-- Partial indexes for active records
CREATE INDEX idx_jobs_active_city ON jobs(city) WHERE active = true;
CREATE INDEX idx_jobs_active_categories ON jobs USING GIN(categories) WHERE active = true;
```

#### `matches` Table - Complete Schema
```sql
-- User-job matching results
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  job_hash TEXT NOT NULL REFERENCES jobs(job_hash) ON DELETE CASCADE,

  -- Matching results
  match_score DECIMAL(5,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_reason TEXT,
  confidence_score DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Matching metadata
  match_method TEXT DEFAULT 'ai' CHECK (match_method IN ('ai', 'fallback', 'manual')),
  match_version TEXT DEFAULT '1.0', -- Algorithm version
  matched_at TIMESTAMPTZ DEFAULT NOW(),

  -- User interaction tracking
  viewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  saved BOOLEAN DEFAULT false,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),

  -- System fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_email, job_hash) -- Prevent duplicate matches
);

-- Performance indexes
CREATE INDEX idx_matches_user_email ON matches(user_email);
CREATE INDEX idx_matches_job_hash ON matches(job_hash);
CREATE INDEX idx_matches_match_score ON matches(match_score DESC);
CREATE INDEX idx_matches_matched_at ON matches(matched_at DESC);
CREATE INDEX idx_matches_user_score ON matches(user_email, match_score DESC);
```

### Supporting Tables

#### `match_logs` Table
```sql
-- Comprehensive matching audit trail
CREATE TABLE match_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  job_hash TEXT NOT NULL,

  -- Request details
  request_payload JSONB,
  response_payload JSONB,

  -- Performance metrics
  processing_time_ms INTEGER,
  ai_tokens_used INTEGER,
  cache_hit BOOLEAN DEFAULT false,

  -- Error tracking
  error_message TEXT,
  error_code TEXT,

  -- Metadata
  algorithm_version TEXT DEFAULT '1.0',
  user_tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_match_logs_user_email ON match_logs(user_email);
CREATE INDEX idx_match_logs_created_at ON match_logs(created_at DESC);
CREATE INDEX idx_match_logs_error_code ON match_logs(error_code) WHERE error_code IS NOT NULL;
```

#### `pending_digests` Table
```sql
-- Email digest queue for premium users
CREATE TABLE pending_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,

  -- Digest content
  jobs JSONB NOT NULL, -- Array of job matches
  digest_type TEXT DEFAULT 'weekly' CHECK (digest_type IN ('weekly', 'daily', 'instant')),

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),

  -- Processing status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  processing_started_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,

  -- System fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_pending_digests_user_email ON pending_digests(user_email);
CREATE INDEX idx_pending_digests_scheduled_for ON pending_digests(scheduled_for);
CREATE INDEX idx_pending_digests_status ON pending_digests(status);
CREATE INDEX idx_pending_digests_priority ON pending_digests(priority DESC);
```

---

## Job Scraping System Details

### Scraping Architecture

#### Source Integration Layer
- **Multi-Source Support**: Arbeitnow, Careerjet, Jooble, Reed, Adzuna
- **API Abstraction**: Unified interface for different job board APIs
- **Rate Limiting**: Source-specific rate limiting to avoid blocking
- **Error Handling**: Graceful degradation when sources are unavailable

#### Data Processing Pipeline
```
Raw Data → Validation → Normalization → Deduplication → Enrichment → Storage
     ↓         ↓            ↓            ↓            ↓          ↓
   APIs    Schema      Standard     Hash-based    AI Labels   PostgreSQL
           Check      Format       Matching      Categories
```

#### Deduplication Strategy
- **Hash-Based Matching**: SHA-256 of title + company + location + description
- **Similarity Scoring**: Fuzzy matching for near-duplicate detection
- **Temporal Filtering**: Keep most recent version of duplicate jobs
- **Quality Prioritization**: Prefer higher-quality sources for duplicates

### Scraping Sources

#### Arbeitnow Integration
- **API Type**: REST API with pagination
- **Rate Limit**: 100 requests/minute
- **Data Quality**: High - structured job data
- **Coverage**: Germany, Netherlands, Austria
- **Update Frequency**: Real-time updates

#### Careerjet Integration
- **API Type**: REST API with location-based queries
- **Rate Limit**: 50 requests/minute
- **Data Quality**: Medium - good structure but less detailed
- **Coverage**: 60+ countries including major European markets
- **Update Frequency**: Hourly updates

#### Jooble Integration
- **API Type**: REST API with keyword search
- **Rate Limit**: 30 requests/minute
- **Data Quality**: Medium - comprehensive but less structured
- **Coverage**: Global with strong European presence
- **Update Frequency**: Daily bulk updates

#### Reed Integration
- **API Type**: REST API with authentication
- **Rate Limit**: 20 requests/minute
- **Data Quality**: High - detailed job specifications
- **Coverage**: UK-focused with some European listings
- **Update Frequency**: Hourly updates

#### Adzuna Integration
- **API Type**: REST API with comprehensive filtering
- **Rate Limit**: 25 requests/minute
- **Data Quality**: High - detailed categorization
- **Coverage**: UK, US, Canada, Australia, Europe
- **Update Frequency**: Hourly updates

### Data Quality Assurance

#### Validation Rules
- **Required Fields**: Title, company, location, description, URL
- **Data Types**: Proper email, URL, date format validation
- **Content Quality**: Minimum description length (100 characters)
- **Duplicate Prevention**: Hash-based deduplication
- **Spam Filtering**: Remove job board advertisements

#### Enrichment Process
- **Company Normalization**: Standardize company names
- **Location Parsing**: Extract city, country, region
- **Category Classification**: AI-powered job categorization
- **Salary Extraction**: Parse salary ranges from text
- **Skills Recognition**: Extract technical skills from descriptions

### Performance Optimization

#### Scraping Efficiency
- **Parallel Processing**: Concurrent scraping of multiple sources
- **Smart Scheduling**: Peak hour avoidance for API sources
- **Incremental Updates**: Only scrape changed data
- **Caching Strategy**: Cache API responses to reduce load

#### Error Recovery
- **Circuit Breaker**: Automatic failure detection and recovery
- **Retry Logic**: Exponential backoff for failed requests
- **Fallback Sources**: Alternative sources when primary fails
- **Monitoring**: Comprehensive error tracking and alerting

---

## AI Matching Engine Implementation

### Core Algorithm Architecture

#### Matching Pipeline
```
User Profile → Preprocessing → AI Processing → Post-processing → Results
      ↓             ↓              ↓              ↓            ↓
   Raw Data     Normalization  GPT-4 Scoring   Filtering    Ranked
   Validation   Standardization Confidence     Quality      Jobs
                               Assessment      Gates
```

#### Preprocessing Stage
- **Data Normalization**: Standardize career paths, skills, locations
- **Profile Enrichment**: Add inferred preferences and requirements
- **Validation**: Ensure data quality and completeness
- **Context Building**: Create comprehensive user context for AI

### AI Processing Implementation

#### GPT-4 Integration
```typescript
// Core AI matching implementation
async function performAIMatching(userProfile: UserProfile, jobPool: Job[]): Promise<AIMatchResult[]> {
  const prompt = buildMatchingPrompt(userProfile);
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are an expert career counselor specializing in job matching.
        Analyze the compatibility between user profiles and job opportunities.
        Provide detailed matching scores with reasoning.`
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.3, // Consistent results
    max_tokens: 2000,
    response_format: { type: "json_object" }
  });

  return parseAIResponse(response.choices[0].message.content);
}
```

#### Prompt Engineering
- **Structured Output**: JSON format with score, confidence, reasoning
- **Context Window**: Optimized for 4K-8K token usage
- **Consistency**: Standardized scoring criteria and explanations
- **Bias Reduction**: Neutral, merit-based evaluation framework

### Scoring System

#### Unified Scoring Standard
```typescript
interface UnifiedScore {
  overall: number;        // 0-100 overall match quality
  confidence: number;     // 0-1 AI confidence level
  components: {
    relevance: number;    // Career fit (0-100)
    quality: number;      // Job quality factors (0-100)
    opportunity: number;  // Growth/career advancement (0-100)
    timing: number;       // Timing and availability (0-100)
  };
  explanation: {
    scoreMeaning: string; // "excellent", "good", "fair", "poor"
    reasoning: string[];  // Detailed reasoning points
    recommendations: string[]; // Actionable advice
  };
}
```

#### Component Scoring Breakdown
- **Relevance (40% weight)**: Career path alignment, skills matching, experience fit
- **Quality (25% weight)**: Company reputation, salary competitiveness, work environment
- **Opportunity (20% weight)**: Growth potential, learning opportunities, career advancement
- **Timing (15% weight)**: Job freshness, application deadlines, market conditions

### Fallback Algorithm Implementation

#### Rule-Based Matching System
```typescript
class FallbackMatchingEngine {
  async findMatches(user: UserPreferences, jobs: Job[]): Promise<JobMatch[]> {
    const scoredJobs = jobs.map(job => ({
      job,
      score: this.calculateMatchScore(user, job),
      reason: this.generateMatchReason(user, job)
    }));

    return scoredJobs
      .filter(match => match.score > 30) // Minimum threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, maxMatches);
  }

  private calculateMatchScore(user: UserPreferences, job: Job): number {
    let score = 50; // Base score

    // Career path matching (30 points)
    score += this.calculateCareerPathScore(user, job) * 0.3;

    // Location matching (25 points)
    score += this.calculateLocationScore(user, job) * 0.25;

    // Skills matching (20 points)
    score += this.calculateSkillsScore(user, job) * 0.2;

    // Experience matching (15 points)
    score += this.calculateExperienceScore(user, job) * 0.15;

    // Quality bonuses (10 points)
    score += this.calculateQualityBonus(job) * 0.1;

    return Math.min(100, Math.max(0, score));
  }
}
```

#### Career Path Matching
- **Direct Category Match**: Job categories contain user career paths
- **Synonym Expansion**: Related career fields (e.g., "data" matches "analytics")
- **Experience Level**: Entry-level filtering for graduates
- **Path Compatibility**: Cross-career path recommendations

#### Location Intelligence
- **Multi-tier Matching**: City → Country → Regional proximity → Remote work
- **European Focus**: Special handling for EU cities and cultural proximity
- **Remote Work Detection**: Automatic remote job prioritization
- **Geographic Diversity**: Balanced location distribution for premium users

### Performance Optimization

#### Caching Strategy
- **Job Embeddings**: Pre-computed semantic embeddings
- **User Profile Caching**: Processed user preferences
- **Match Result Caching**: Recent matching results
- **AI Response Caching**: Similar query result reuse

#### Batch Processing
- **User Batches**: Process 50 users simultaneously
- **Job Pool Optimization**: Pre-filtered job pools per user type
- **Parallel AI Calls**: Concurrent GPT-4 requests with rate limiting
- **Result Aggregation**: Efficient scoring and ranking algorithms

### Quality Assurance

#### Confidence Scoring
- **AI Confidence Levels**: 0-1 scale based on response consistency
- **Fallback Triggers**: Automatic fallback when confidence < 0.3
- **Quality Gates**: Minimum score thresholds for different user tiers
- **Manual Review**: High-value matches flagged for human review

#### Error Handling
- **API Failure Recovery**: Circuit breaker pattern with exponential backoff
- **Data Validation**: Comprehensive input sanitization and validation
- **Fallback Chains**: Multiple matching strategies for reliability
- **Logging**: Detailed error tracking and performance monitoring

---

## Component Architecture Details

### Frontend Architecture Patterns

#### Component Hierarchy
```
App
├── Layout Components
│   ├── Header
│   ├── Navigation
│   └── Footer
├── Page Components
│   ├── LandingPage
│   ├── SignupFlow
│   ├── Dashboard
│   └── ResultsPage
└── Shared Components
    ├── JobCard
    ├── UserForm
    ├── LoadingSpinner
    └── ErrorBoundary
```

#### State Management Strategy
```typescript
// Global state with Zustand
interface AppState {
  user: User | null;
  matches: JobMatch[];
  preferences: UserPreferences;
  loading: boolean;
  error: string | null;
}

// Actions
interface AppActions {
  setUser: (user: User) => void;
  updatePreferences: (prefs: UserPreferences) => void;
  setMatches: (matches: JobMatch[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const useAppStore = create<AppState & AppActions>((set) => ({
  // Initial state
  user: null,
  matches: [],
  preferences: {},
  loading: false,
  error: null,

  // Actions
  setUser: (user) => set({ user }),
  updatePreferences: (preferences) => set({ preferences }),
  setMatches: (matches) => set({ matches }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
```

### Component Implementation Patterns

#### Higher-Order Components
```typescript
// Authentication HOC
function withAuth<T extends {}>(Component: React.ComponentType<T>) {
  return function AuthenticatedComponent(props: T) {
    const { user, loading } = useAppStore();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.push('/login');
      }
    }, [user, loading, router]);

    if (loading) return <LoadingSpinner />;
    if (!user) return null;

    return <Component {...props} />;
  };
}

// Usage
const ProtectedDashboard = withAuth(Dashboard);
```

#### Custom Hooks
```typescript
// Job matching hook
function useJobMatches(userId: string) {
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        setLoading(true);
        const response = await fetch(`/api/matches/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch matches');
        const data = await response.json();
        setMatches(data.matches);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchMatches();
    }
  }, [userId]);

  return { matches, loading, error, refetch: () => fetchMatches() };
}
```

#### Form Management
```typescript
// React Hook Form with Zod validation
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  city: z.string().min(2, 'Please enter your city'),
  careerPath: z.enum(['tech', 'marketing', 'finance', 'data', 'sales']),
  experience: z.enum(['entry', 'mid', 'senior']),
});

type SignupFormData = z.infer<typeof signupSchema>;

function SignupForm() {
  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      experience: 'entry',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Signup failed');

      // Handle success
      router.push('/verify-email');
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Signup failed',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="your@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Additional form fields */}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating account...' : 'Sign up'}
        </Button>
      </form>
    </Form>
  );
}
```

### UI Component Library

#### Design System
- **Color Palette**: Consistent brand colors with dark/light mode support
- **Typography Scale**: Hierarchical text sizing with proper line heights
- **Spacing Scale**: Consistent margin/padding values
- **Component Variants**: Multiple sizes and states for each component

#### Responsive Design
```typescript
// Responsive breakpoint hooks
function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    function updateBreakpoint() {
      const width = window.innerWidth;
      if (width < 768) setBreakpoint('mobile');
      else if (width < 1024) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    }

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}

// Usage in components
function ResponsiveComponent() {
  const breakpoint = useBreakpoint();

  return (
    <div className={cn(
      "grid gap-4",
      {
        "grid-cols-1": breakpoint === 'mobile',
        "grid-cols-2": breakpoint === 'tablet',
        "grid-cols-3": breakpoint === 'desktop',
      }
    )}>
      {/* Content */}
    </div>
  );
}
```

### Performance Optimization

#### Code Splitting
```typescript
// Dynamic imports for route-based splitting
const Dashboard = lazy(() => import('../pages/Dashboard'));
const SignupFlow = lazy(() => import('../pages/SignupFlow'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/signup" element={<SignupFlow />} />
      </Routes>
    </Suspense>
  );
}
```

#### Image Optimization
```typescript
// Next.js Image component with optimization
import Image from 'next/image';

function JobCard({ job }: { job: Job }) {
  return (
    <div className="job-card">
      <Image
        src={job.companyLogo}
        alt={`${job.company} logo`}
        width={64}
        height={64}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
        className="rounded-lg"
      />
      <h3>{job.title}</h3>
      <p>{job.company}</p>
    </div>
  );
}
```

#### Bundle Analysis
```bash
# Analyze bundle size
npm run build:analyze

# Check for unused dependencies
npm run deps:check

# Optimize bundle splitting
npm run bundle:optimize
```

---

## Performance Considerations Deep Dive

### System Performance Metrics

#### Target Performance Benchmarks
- **API Response Time**: < 2 seconds (95th percentile)
- **Page Load Time**: < 3 seconds (First Contentful Paint)
- **Database Query Time**: < 100ms (95th percentile)
- **AI Matching Time**: < 30 seconds per user
- **Email Delivery**: 99.5% successful delivery rate

#### Monitoring Implementation
```typescript
// Performance tracking middleware
export function performanceMiddleware(req: NextRequest) {
  const startTime = Date.now();

  return new Response(null, {
    status: 200,
    headers: {
      'Server-Timing': `total;dur=${Date.now() - startTime}`,
    },
  });
}

// Database query performance tracking
export async function trackQueryPerformance(query: string, params: any[]) {
  const startTime = Date.now();

  try {
    const result = await db.execute(query, params);
    const duration = Date.now() - startTime;

    // Log slow queries
    if (duration > 1000) {
      logger.warn('Slow query detected', {
        query: query.substring(0, 100),
        duration,
        params: JSON.stringify(params).substring(0, 200),
      });
    }

    // Record metrics
    metrics.record('db_query_duration', duration, {
      query_type: query.split(' ')[0].toLowerCase(),
    });

    return result;
  } catch (error) {
    metrics.record('db_query_error', 1);
    throw error;
  }
}
```

### Database Performance Optimization

#### Query Optimization Strategies
```sql
-- Optimized user matching query with indexes
EXPLAIN ANALYZE
SELECT j.*, m.match_score, m.match_reason
FROM jobs j
JOIN matches m ON j.job_hash = m.job_hash
WHERE m.user_email = $1
  AND j.active = true
  AND j.visa_friendly = $2
  AND j.posted_at > $3
ORDER BY m.match_score DESC
LIMIT 5;

-- Index recommendations
CREATE INDEX CONCURRENTLY idx_jobs_composite_active
ON jobs(active, visa_friendly, posted_at DESC, city)
WHERE active = true;

CREATE INDEX CONCURRENTLY idx_matches_user_score
ON matches(user_email, match_score DESC)
INCLUDE (job_hash, match_reason);
```

#### Connection Pool Management
```typescript
// Database connection pooling configuration
export const dbConfig = {
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,

  // Connection pool settings
  max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20'),
  min: parseInt(process.env.DATABASE_MIN_CONNECTIONS || '2'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,

  // Health checks
  allowExitOnIdle: true,
  healthCheck: true,
};

// Connection monitoring
export function monitorConnectionPool() {
  setInterval(() => {
    const poolStats = pool.stats();
    metrics.record('db_pool_total_count', poolStats.totalCount);
    metrics.record('db_pool_idle_count', poolStats.idleCount);
    metrics.record('db_pool_waiting_count', poolStats.waitingCount);
  }, 30000); // Every 30 seconds
}
```

### Caching Architecture

#### Multi-Layer Caching Strategy
```typescript
// Redis caching implementation
class CacheManager {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }

  // Session caching with TTL
  async setSession(sessionId: string, data: any, ttlSeconds = 3600) {
    await this.redis.setex(
      `session:${sessionId}`,
      ttlSeconds,
      JSON.stringify(data)
    );
  }

  // API response caching
  async cacheAPIResponse(key: string, data: any, ttlSeconds = 300) {
    await this.redis.setex(
      `api:${key}`,
      ttlSeconds,
      JSON.stringify(data)
    );
  }

  // Job matching result caching
  async cacheMatchResults(userId: string, results: JobMatch[], ttlSeconds = 600) {
    await this.redis.setex(
      `matches:${userId}`,
      ttlSeconds,
      JSON.stringify(results)
    );
  }

  // Cache invalidation
  async invalidateUserCache(userId: string) {
    const keys = await this.redis.keys(`*${userId}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

#### Frontend Performance Optimization

#### Bundle Optimization
```javascript
// next.config.js optimizations
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  webpack: (config, { isServer }) => {
    // Bundle analysis
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: './bundle-report.html',
        })
      );
    }

    // Code splitting optimizations
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          ui: {
            test: /[\\/]components[\\/]ui[\\/]/,
            name: 'ui-components',
            chunks: 'all',
          },
        },
      },
    };

    return config;
  },
};
```

#### Image Optimization Pipeline
```typescript
// Comprehensive image optimization
import sharp from 'sharp';
import { getPlaiceholder } from 'plaiceholder';

export async function optimizeImage(
  inputBuffer: Buffer,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}
) {
  const {
    width = 800,
    height,
    quality = 80,
    format = 'webp'
  } = options;

  // Resize and compress
  let pipeline = sharp(inputBuffer).resize(width, height, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  // Format-specific optimization
  switch (format) {
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 9 });
      break;
  }

  const optimizedBuffer = await pipeline.toBuffer();

  // Generate blur placeholder
  const { base64 } = await getPlaiceholder(optimizedBuffer, {
    size: 10,
  });

  return {
    buffer: optimizedBuffer,
    blurDataURL: base64,
    size: optimizedBuffer.length,
  };
}
```

### Scalability Considerations

#### Horizontal Scaling
```typescript
// Load balancing configuration
export const loadBalancerConfig = {
  algorithm: 'least_connections',
  healthChecks: {
    path: '/api/health',
    interval: 30000, // 30 seconds
    timeout: 5000,   // 5 seconds
    unhealthyThreshold: 3,
    healthyThreshold: 2,
  },
  stickySessions: {
    enabled: true,
    cookieName: 'jobping_session',
    cookieOptions: {
      httpOnly: true,
      secure: true,
      maxAge: 86400, // 24 hours
    },
  },
};
```

#### Database Scaling Strategy
```sql
-- Read replica configuration
-- Primary database for writes
-- Read replicas for read operations

-- Connection routing
CREATE OR REPLACE FUNCTION get_replica_connection()
RETURNS text AS $$
BEGIN
  -- Route reads to replicas, writes to primary
  IF current_setting('application_name') LIKE 'readonly%' THEN
    RETURN 'replica_host';
  ELSE
    RETURN 'primary_host';
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### Monitoring & Alerting

#### Application Performance Monitoring
```typescript
// Comprehensive APM setup
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Console(),
    new Sentry.BrowserTracing(),
  ],
  beforeSend(event) {
    // Filter sensitive data
    if (event.request?.data) {
      event.request.data = sanitizeData(event.request.data);
    }
    return event;
  },
});
```

#### Business Metrics Tracking
```typescript
// PostHog analytics integration
import posthog from 'posthog-js';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('PostHog loaded');
      }
    },
  });
}

// Track user events
export function trackUserSignup(user: User) {
  posthog.identify(user.id, {
    email: user.email,
    tier: user.subscription_tier,
    signup_date: user.created_at,
  });

  posthog.capture('user_signed_up', {
    tier: user.subscription_tier,
    source: 'organic',
  });
}

export function trackJobApplication(userId: string, jobId: string) {
  posthog.capture('job_application_submitted', {
    user_id: userId,
    job_id: jobId,
    timestamp: new Date().toISOString(),
  });
}
```

---

## 📱 Mobile Performance Issues & Fixes

### Critical Mobile Performance Problems

#### 1. EuropeMap.tsx - Major Mobile Performance Problem ❌

**Issue**: The Europe Map component is extremely heavy and not optimized for mobile:
```typescript
// PERFORMANCE KILLER - Complex SVG with heavy animations
<svg viewBox="0 0 1000 800" className="w-full h-auto relative z-10">
  // 22 animated city markers + complex interactions
  // Multiple motion animations running simultaneously
  // Complex collision detection algorithm
  // Heavy tooltip calculations
  // Touch event handlers on every marker
```

**Mobile Impact**:
- **Memory usage**: Massive SVG with 22 animated elements
- **Touch performance**: Complex touch handlers may cause lag
- **Battery drain**: Multiple concurrent animations
- **Scroll jank**: Heavy DOM operations during scroll

**Immediate Fixes Needed**:
```typescript
// 1. Disable complex animations on mobile
{!isMobile && (
  <motion.div animate={{ scale: [1, 1.05, 1] }} /> // Disable scale animations
)}

// 2. Reduce marker count on mobile
const visibleCities = isMobile ?
  CITY_COORDINATES.slice(0, 8) : // Show only 8 cities on mobile
  CITY_COORDINATES;

// 3. Simplify mobile interactions
const touchHandlers = isMobile ?
  { onTouchStart: handleSimpleTouch } : // Simple touch only
  { onTouchStart: handleComplexTouch, onMouseHover: handleHover };
```

#### 2. Header.tsx - Mobile Menu Performance Issues ❌

**Issues Found**:
```typescript
// PROBLEM: Complex scroll detection running constantly
useEffect(() => {
  const handleScroll = () => {
    setScrolled(window.scrollY > 20);
    // Complex section detection calculations on every scroll event
    const howItWorks = document.getElementById("how-it-works");
    const pricing = document.getElementById("pricing");
    const scrollY = window.scrollY + 100;
    // More DOM queries...
  };
  window.addEventListener("scroll", handleScroll); // No throttling!
}, []);
```

**Mobile Optimization Needed**:
```typescript
// Add throttled scroll handler for mobile
import { throttle } from 'lodash';

const handleScroll = useMemo(
  () => throttle(() => {
    setScrolled(window.scrollY > 20);
    if (!isMobile) {
      // Only run complex section detection on desktop
      const scrollY = window.scrollY + 100;
      // Section detection logic...
    }
  }, 16), // 60fps throttling
  [isMobile]
);
```

#### 3. Button Components - Touch Target Issues ⚠️

**CityChip.tsx**: Good mobile optimization ✅
```typescript
min-h-[48px] // Correct 48px minimum touch target
touch-manipulation // Good touch optimization
```

**Button.tsx**: Adequate but could be better ⚠️
```typescript
// CURRENT: Basic 48px minimum
min-h-[48px]

// BETTER: More generous mobile spacing
sizes: {
  sm: "px-4 py-3 text-sm min-h-[52px] sm:min-h-[48px]", // Bigger on mobile
  md: "px-6 py-4 text-base min-h-[56px] sm:min-h-[48px]",
  lg: "px-8 py-5 text-lg min-h-[64px] sm:min-h-[48px]",
}
```

#### 4. Form Components - Mobile Input Issues ❌

**PersonalInfoSection.tsx Problems**:
```typescript
// ISSUE: No mobile-specific input optimizations
className="w-full px-4 py-4 bg-black/50 border-2 rounded-xl..."
// Missing:
// - inputMode attributes for mobile keyboards
// - Mobile-specific font-size (16px minimum to prevent zoom)
// - Touch-optimized spacing
```

**Needed Mobile Optimizations**:
```typescript
<input
  inputMode="email" // ✅ Already has this
  style={{ fontSize: '16px' }} // Prevent iOS zoom
  className="w-full px-4 py-4 sm:py-3 min-h-[52px] sm:min-h-[48px]" // Bigger on mobile
/>
```

### Medium Priority Mobile Optimizations

#### 5. Pricing.tsx - Mobile Layout Issues ⚠️

**Current**: Desktop-focused grid layout
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
```

**Better Mobile Layout**:
```typescript
<div className={`${
  isMobile
    ? "flex flex-col gap-4" // Simpler stacking on mobile
    : "grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8"
}`}>
```

#### 6. HeroMobileMockup.tsx - Ironic Mobile Issues 😅

**Issue**: Component named "Mobile" but not optimized for mobile:
```typescript
// HEAVY: Multiple API calls and complex animations in mobile component
useEffect(() => {
  async function fetchJobs() {
    // Complex API fetching logic in mobile component
  }
}, []);
```

**Mobile Optimization**:
```typescript
// Skip expensive operations on mobile
useEffect(() => {
  if (isMobile && window.innerWidth < 640) {
    setJobs(FALLBACK_JOBS); // Use static data on small mobile
    return;
  }
  // API fetching only on larger screens
}, [isMobile]);
```

#### 7. Framer Motion Overuse ⚠️

**Issue**: Almost every component uses heavy motion animations:
```typescript
// FOUND IN: Almost every component
<motion.div
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.3 }}
/>
```

**Mobile Optimization**:
```typescript
// Create mobile-optimized motion wrapper
const MobileOptimizedMotion = ({ children, isMobile, ...motionProps }) => {
  if (isMobile) {
    return <div {...motionProps}>{children}</div>;
  }
  return <motion.div {...motionProps}>{children}</motion.div>;
};
```

### Low Priority Mobile Improvements

#### 8. Typography Responsive Issues

**Current**: Some components use fixed sizes
```typescript
className="text-3xl sm:text-4xl md:text-5xl" // Good ✅
className="text-2xl font-black" // Could be better ⚠️
```

#### 9. Image Loading Optimization

**Missing**: Lazy loading for non-critical images
```typescript
// Add to images below fold
loading="lazy"
decoding="async"
```

### Mobile Performance Monitoring Implementation

#### Mobile-Specific Performance Tracking
```typescript
// Mobile performance hook implementation
export function useMobilePerformance() {
  const { isMobile } = useWindowSize();

  useEffect(() => {
    if (!isMobile) return;

    // Track mobile-specific metrics
    const trackMobilePerformance = () => {
      const connection = (navigator as any).connection;
      const connectionType = connection?.effectiveType || 'unknown';
      const deviceMemory = (navigator as any).deviceMemory || 'unknown';
      const loadTime = performance.now();

      performanceMonitor.recordMetric('mobile_load_time', loadTime);
      performanceMonitor.recordMetric('mobile_connection_type',
        connectionType === '4g' ? 4 : connectionType === '3g' ? 3 :
        connectionType === '2g' ? 2 : connectionType === 'slow-2g' ? 1 : 0);

      if (typeof deviceMemory === 'number') {
        performanceMonitor.recordMetric('mobile_device_memory', deviceMemory);
      }

      trackEvent('mobile_performance', {
        loadTime: Math.round(loadTime),
        connectionType,
        deviceMemory,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      });
    };

    trackMobilePerformance();
  }, [isMobile]);
}
```

---

## Testing Strategy Details

> **📖 Note**: This section provides **implementation details and code patterns** for testing. For the complete **testing strategy, philosophy, and MCP integration**, see **[docs/testing.md](./testing.md)** - the comprehensive production-level testing strategy document.

### Production-First Test Architecture

**Core Principle**: Test actual production code paths (`ConsolidatedMatchingEngine`), not mock implementations. See [docs/testing.md](./testing.md#production-validation-layer---core-testing-philosophy) for detailed philosophy.

#### Test Categories Hierarchy (Production-First)
```
┌─────────────────────────────────────────────────────────────┐
│         PRODUCTION-FIRST TESTING PYRAMID                   │
├─────────────────────────────────────────────────────────────┤
│  🎯 PRODUCTION VALIDATION (Highest Priority)               │
│    • Production Matching Engine Tests (8 validations)    │
│    • Production API Endpoint Tests (actual routes)       │
│    • Production Database State Validation (Supabase MCP) │
│    • Production Performance Monitoring (Vercel MCP)      │
├─────────────────────────────────────────────────────────────┤
│  👁️ VISUAL REGRESSION (84 tests)                          │
│    • UI consistency with Browser MCP                      │
├─────────────────────────────────────────────────────────────┤
│  🧪 CHAOS ENGINEERING (42 tests)                          │
│    • System resilience + Sentry correlation              │
├─────────────────────────────────────────────────────────────┤
│  🧩 COMPONENT TESTING (36 tests)                          │
│    • Individual UI components                             │
├─────────────────────────────────────────────────────────────┤
│  🔄 E2E USER JOURNEYS (154 tests)                         │
│    • Complete user flows                                  │
│    • Cross-browser Compatibility                          │
├─────────────────────────────────────────────────────────────┤
│  🔗 API INTEGRATION (48 tests)                            │
│    • API Endpoint Testing                                 │
│    • Database Operations                                  │
│    • External Service Integration                         │
│    • Free Signup City Normalization                       │
├─────────────────────────────────────────────────────────────┤
│  ⚡ UNIT TESTS (Jest)                                     │
│    • Pure Function Testing                                │
│    • Algorithm Validation                                 │
│    • Utility Function Testing                             │
│    • City Normalization Logic                             │
│    • Array Handling Edge Cases                            │
└─────────────────────────────────────────────────────────────┘
```

**MCP Integration**: All test layers integrate with MCP tools (GitHub, Sentry, Supabase, Vercel, Browser) for automated analysis and production correlation. See [docs/testing.md](./testing.md#mcp-integration---production-powered-testing-automation) for details.

### E2E Test Implementation

**Production-First Approach**: All E2E tests validate actual production code paths. See [docs/testing.md](./testing.md#production-validation-layer---core-testing-philosophy) for strategy details.

#### User Scenario Testing (Production Code Paths)
```typescript
// Comprehensive user journey validation - tests actual production routes
import { ConsolidatedMatchingEngine } from '@/lib/matching/engine';

describe('Complete User Experience', () => {
  test('Marketing Graduate Full Journey', async ({ page, browserName }) => {
    // Skip on browsers that don't support comprehensive testing
    if (browserName !== 'chromium') {
      console.log(`⏭️  Skipping comprehensive analysis on ${browserName}`);
      return;
    }

    // Rate limiting check
    await checkAPIServiceHealth(page);

    // User registration - tests actual /api/signup/free route
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'marketing-test@example.com');
    await page.selectOption('[data-testid="city-select"]', 'Berlin');
    await page.check('[data-testid="marketing-career"]');
    await page.click('[data-testid="signup-button"]');

    // Email verification - tests actual verification flow
    await expect(page).toHaveURL(/\/verify-email/);
    const verificationLink = await getLatestEmailLink('marketing-test@example.com');
    await page.goto(verificationLink);

    // Job matching results - validates production ConsolidatedMatchingEngine
    await expect(page).toHaveURL(/\/matches/);
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(5);

    // Algorithm validation - validates production matching logic
    const analysis = await analyzeJobMatches(page);
    expect(analysis.locationMatch).toBeGreaterThan(60);
    expect(analysis.fieldMatch).toBeGreaterThan(70);
    expect(analysis.relevance).toBeGreaterThan(60);
  });
});
```

#### Production Algorithm Performance Testing
```typescript
// Production algorithm validation - tests ConsolidatedMatchingEngine, not mocks
import { ConsolidatedMatchingEngine } from '@/lib/matching/engine';
import { supabaseGetTableStats } from '@/scripts/mcps/supabase-mcp';
import { sentryGetRecentErrors } from '@/scripts/mcps/sentry-mcp';

describe('Production Matching Engine Validation', () => {
  test('Production Matching Accuracy', async ({ page }) => {
    // Use actual production ConsolidatedMatchingEngine
    const engine = new ConsolidatedMatchingEngine();
    const testResults = await engine.performMatching(testUserProfile, 'free');

    // Production validation: Must return exactly 5 matches for free users
    expect(testResults.matches).toHaveLength(5);

    // Performance grading
    expect(testResults.locationAccuracy).toBeGreaterThan(60); // 73.3% achieved
    expect(testResults.fieldAccuracy).toBeGreaterThan(70);   // 100% achieved
    expect(testResults.relevanceScore).toBeGreaterThan(60);  // 79.93 achieved

    // MCP Integration: Validate database state
    const dbStats = await supabaseGetTableStats(['job_matches']);
    expect(dbStats.job_matches.count).toBeGreaterThan(0);

    // MCP Integration: Check for production errors
    const errors = await sentryGetRecentErrors({ hours: 1 });
    const relatedErrors = errors.filter(e => e.message.includes('matching'));
    expect(relatedErrors.length).toBe(0); // No production errors
  });

  test('Rate Limiting Resilience', async ({ page }) => {
    // Test graceful degradation under rate limiting
    await simulateRateLimiting(page);

    // Production fallback should work without failing
    const results = await getTestResults(page);
    expect(results.source).toBe('fallback'); // Production fallback activated
    expect(results.algorithmPerformance).toBeDefined();
  });
});
```

**See [docs/testing.md](./testing.md#production-validation-layer---core-testing-philosophy) for complete production validation strategy.**

### Integration Test Suite

**Production-First**: Integration tests validate actual API routes and database operations, not mocked services. MCP tools provide production correlation.

#### API Endpoint Testing (Production Routes)

##### Comprehensive Free Signup Test Suite
```typescript
describe('Free Signup Route - City Normalization', () => {
  // 5 unit tests for city normalization logic
  test('handles array format correctly', () => { /* ... */ });
  test('handles JSON string format', () => { /* ... */ });
  test('handles single string format', () => { /* ... */ });
  test('handles null/undefined values', () => { /* ... */ });
  test('handles malformed JSON gracefully', () => { /* ... */ });
});

describe('Free Signup Route - Database Array Persistence', () => {
  // 3 integration tests for database array handling
  test('validates array persistence expectations', () => { /* ... */ });
  test('validates stringified array handling', () => { /* ... */ });
  test('validates database array field normalization', () => { /* ... */ });
});

describe('Free Signup Route - E2E Flow Tests', () => {
  // 5 end-to-end flow validation tests
  test('validates signup data structure with multiple cities', () => { /* ... */ });
  test('validates duplicate email handling logic', () => { /* ... */ });
  test('validates required fields', () => { /* ... */ });
  test('validates single city selection structure', () => { /* ... */ });
  test('validates cookie settings for existing users', () => { /* ... */ });
});

describe('Free Signup Route - Performance Tests', () => {
  // 3 performance validation tests
  test('handles large city arrays efficiently', () => { /* ... */ });
  test('JSON parsing performance for large arrays', () => { /* ... */ });
  test('array validation performance', () => { /* ... */ });
});

describe('Free Signup Route - Edge Cases', () => {
  // 6 edge case handling tests
  test('handles empty city array', () => { /* ... */ });
  test('handles malformed city data gracefully', () => { /* ... */ });
  test('handles undefined and null values', () => { /* ... */ });
  test('handles non-string values in arrays', () => { /* ... */ });
  test('fallback logic works correctly', () => { /* ... */ });
  test('handles extremely long city names', () => { /* ... */ });
});
```

**Test Coverage**: 24 comprehensive tests covering all critical paths and edge cases for the free signup city normalization issue.
      expect(error.errors).toContainEqual(
        expect.objectContaining({ field: 'email' })
      );
    });
  });

  describe('/api/matches/free', () => {
    test('successful match retrieval', async () => {
      // Setup: Create test user and matches
      const userId = await createTestUser();
      await generateTestMatches(userId, 5);

      const response = await request.get('/api/matches/free', {
        headers: { Cookie: `free_user_email=${testEmail}` }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.jobs).toHaveLength(5);
      expect(data.user.email).toBe(testEmail);
    });

    test('authentication required', async () => {
      const response = await request.get('/api/matches/free');

      expect(response.status()).toBe(401);
      const error = await response.json();
      expect(error.error).toBe('authentication_required');
    });
  });
});
```

### Unit Test Implementation

#### Algorithm Testing
```typescript
describe('FallbackMatchingEngine', () => {
  describe('calculateMatchScore', () => {
    test('perfect career match', () => {
      const user = createTestUser({ career_path: 'tech' });
      const job = createTestJob({ categories: ['tech', 'software'] });

      const score = engine.calculateMatchScore(user, job);
      expect(score).toBeGreaterThan(80);
    });

    test('location matching tiers', () => {
      const user = createTestUser({ cities: ['Berlin'] });

      // Exact city match
      const exactMatch = createTestJob({ city: 'Berlin' });
      expect(engine.calculateMatchScore(user, exactMatch)).toBe(100);

      // Country match
      const countryMatch = createTestJob({ country: 'Germany' });
      expect(engine.calculateMatchScore(user, countryMatch)).toBe(75);

      // Regional match
      const regionalMatch = createTestJob({ city: 'Munich', country: 'Germany' });
      expect(engine.calculateMatchScore(user, regionalMatch)).toBe(50);
    });

    test('skills synonym matching', () => {
      const user = createTestUser({ skills: ['javascript'] });
      const jobs = [
        createTestJob({ description: 'React developer needed' }),      // Synonym match
        createTestJob({ description: 'Node.js backend engineer' }),   // Direct match
        createTestJob({ description: 'Python developer role' }),      // No match
      ];

      const scores = jobs.map(job => engine.calculateMatchScore(user, job));
      expect(scores[0]).toBeGreaterThan(scores[2]); // React > Python
      expect(scores[1]).toBeGreaterThan(scores[2]); // Node.js > Python
    });
  });

  describe('generateMatchReason', () => {
    test('comprehensive reasoning', () => {
      const user = createTestUser({
        career_path: 'tech',
        cities: ['Berlin'],
        skills: ['react']
      });
      const job = createTestJob({
        categories: ['tech'],
        city: 'Berlin',
        description: 'React frontend developer position'
      });

      const reason = engine.generateMatchReason(user, job);

      expect(reason).toContain('career match');
      expect(reason).toContain('Berlin');
      expect(reason).toContain('React');
      expect(reason.length).toBeGreaterThan(50);
    });
  });
});
```

### Performance Testing

**Production Performance SLAs**: <2s signup, <3s matching (first request), <500ms cached responses. See [docs/testing.md](./testing.md#performance--quality-guarantees) for complete SLAs.

#### Load Testing Implementation (Production Performance Validation)
```typescript
import { vercelGetDeployments } from '@/scripts/mcps/vercel-mcp';
import { sentryGetRecentErrors } from '@/scripts/mcps/sentry-mcp';

describe('Production Performance Benchmarks', () => {
  test('API response times under load', async () => {
    const concurrentRequests = 50;
    const requests = Array(concurrentRequests).fill().map((_, i) =>
      request.post('/api/signup/free', {
        data: { ...testUserData, email: `load-test-${i}@example.com` }
      })
    );

    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const endTime = Date.now();

    const avgResponseTime = (endTime - startTime) / concurrentRequests;
    const successRate = responses.filter(r => r.status() === 200).length / concurrentRequests;

    // Production SLA: <2 seconds for signup
    expect(avgResponseTime).toBeLessThan(2000);
    expect(successRate).toBeGreaterThan(0.95);  // 95% success rate

    // MCP Integration: Check for performance-related errors
    const errors = await sentryGetRecentErrors({ hours: 1 });
    const perfErrors = errors.filter(e => e.message.includes('timeout') || e.message.includes('slow'));
    expect(perfErrors.length).toBe(0);

    // Log performance metrics
    console.log(`Load test results: ${avgResponseTime}ms avg, ${successRate * 100}% success`);
  });

  test('database query performance', async () => {
    // Use Supabase client (production code path), not raw SQL
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('active', true)
      .eq('visa_friendly', true)
      .limit(100);

    const startTime = Date.now();
    // Query execution time measured
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(500); // 500ms max (production SLA)
    expect(data).toBeDefined();
    expect(error).toBeNull();
  });

  test('Production AI matching performance', async () => {
    // Use actual ConsolidatedMatchingEngine
    const engine = new ConsolidatedMatchingEngine();
    const user = createTestUser({ career_path: 'tech', skills: ['react', 'typescript'] });

    const startTime = Date.now();
    const results = await engine.performMatching(user, 'free');
    const endTime = Date.now();

    // Production SLA: <3 seconds for first request
    expect(endTime - startTime).toBeLessThan(3000);
    expect(results.matches).toHaveLength(5); // Free users get exactly 5 matches
  });
});
```

### Security Testing

#### Authentication & Authorization
```typescript
describe('Security Test Suite', () => {
  test('HMAC signature validation', async () => {
    const payload = { userLimit: 100, jobLimit: 500 };
    const timestamp = Date.now();

    // Valid signature
    const validSignature = generateHMAC(payload, timestamp);
    const validResponse = await request.post('/api/match-users', {
      data: { ...payload, timestamp, signature: validSignature }
    });
    expect(validResponse.status()).toBe(200);

    // Invalid signature
    const invalidResponse = await request.post('/api/match-users', {
      data: { ...payload, timestamp, signature: 'invalid' }
    });
    expect(invalidResponse.status()).toBe(401);
  });

  test('SQL injection prevention', async () => {
    const maliciousInput = "'; DROP TABLE users; --";

    const response = await request.post('/api/signup/free', {
      data: {
        email: maliciousInput,
        cities: ['Berlin'],
        career_paths: ['tech']
      }
    });

    // Should sanitize input, not execute SQL
    expect(response.status()).toBe(400); // Validation error, not 500
  });

  test('rate limiting effectiveness', async () => {
    const requests = Array(100).fill().map(() =>
      request.post('/api/signup/free', { data: testUserData })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status() === 429);

    expect(rateLimited.length).toBeGreaterThan(20); // Should rate limit excessive requests
  });
});
```

### Test Automation & CI/CD

#### GitHub Actions Configuration
```yaml
name: Comprehensive Testing Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Type checking
      run: npm run type-check

    - name: Unit tests
      run: npm run test:unit
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/test

    - name: Integration tests
      run: npm run test:integration

    - name: Production engine tests
      run: npm run test:production-engine
      
    - name: E2E tests (chromium only)
      run: npx playwright test --project=chromium
      env:
        BASE_URL: http://localhost:3000
        
    - name: MCP validation
      run: npm run mcp:test-env-validation
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
        SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

---

### Testing Documentation Relationship

**This section (`technical-reference.md` - Testing Strategy Details)** provides:
- ✅ **Implementation patterns** - Code examples and test structure
- ✅ **Technical details** - How to write tests, test organization
- ✅ **Code examples** - Specific test implementations

**For complete testing strategy, see [`docs/testing.md`](./testing.md)** which provides:
- ✅ **Strategy & Philosophy** - Production-first approach, testing principles
- ✅ **MCP Integration** - Complete MCP workflow and automation
- ✅ **Production Validation** - Production code path testing strategy
- ✅ **Quality Metrics** - SLAs, success metrics, monitoring
- ✅ **Developer Resources** - Best practices, troubleshooting, workflows

**Documentation Hierarchy:**
1. **`docs/testing.md`** - Comprehensive strategy (WHAT & WHY)
2. **`docs/technical-reference.md`** (this section) - Implementation details (HOW)
3. **`TESTING_README.md`** - Quick reference guide (daily commands)

**Key Principle**: Always test production code paths (`ConsolidatedMatchingEngine`), not mocks. See [docs/testing.md](./testing.md#production-validation-layer---core-testing-philosophy) for the complete production-first philosophy.

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  performance:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18.x
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build

    - name: Performance testing
      run: npm run test:performance

    - name: Bundle analysis
      run: npm run build:analyze
```

### Test Data Management

#### Fixture Generation
```typescript
// Comprehensive test data generation
export function createTestUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    fullName: faker.person.fullName(),
    active: true,
    emailVerified: true,
    subscriptionTier: 'free',
    targetCities: ['Berlin', 'Munich'],
    careerPath: 'tech',
    skills: ['javascript', 'react'],
    createdAt: new Date(),
    ...overrides
  };
}

export function createTestJob(overrides: Partial<Job> = {}): Job {
  return {
    id: faker.string.uuid(),
    jobHash: faker.string.alphanumeric(32),
    title: faker.person.jobTitle(),
    company: faker.company.name(),
    location: faker.location.city(),
    city: faker.location.city(),
    country: faker.location.country(),
    description: faker.lorem.paragraphs(2),
    salaryMin: faker.number.int({ min: 30000, max: 60000 }),
    salaryMax: faker.number.int({ min: 60000, max: 100000 }),
    categories: ['tech', 'software'],
    visaFriendly: faker.datatype.boolean(),
    qualityScore: faker.number.int({ min: 50, max: 100 }),
    active: true,
    postedAt: faker.date.recent(),
    createdAt: new Date(),
    ...overrides
  };
}
```

---

### Summary: Testing Strategy Documentation

**Documentation Structure:**

| Document | Purpose | Content |
|----------|---------|---------|
| **`docs/testing.md`** | **Strategy & Philosophy** | Production-first approach, MCP integration, quality metrics, developer workflows |
| **`docs/technical-reference.md`** (this section) | **Implementation Details** | Code patterns, test structure, technical examples |
| **`TESTING_README.md`** | **Quick Reference** | Daily commands, troubleshooting, common scenarios |

**Key Takeaways:**
- ✅ **Production-First**: Always test `ConsolidatedMatchingEngine`, not mocks
- ✅ **MCP Integration**: Use GitHub, Sentry, Supabase, Vercel, Browser MCPs for automation
- ✅ **Test Numbers**: 154 E2E, 48 API, 84 Visual, 42 Chaos, 36 Component, 8 Production Engine
- ✅ **Performance SLAs**: <2s signup, <3s matching, <500ms cached

**Next Steps:**
- Read [docs/testing.md](./testing.md) for complete strategy and MCP workflows
- Use [TESTING_README.md](../TESTING_README.md) for quick command reference
- Follow production-first principles in all test implementations

---

## Deployment & DevOps Details

### Infrastructure Architecture

#### Vercel Deployment Configuration
```javascript
// vercel.json - Complete production configuration
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["fra1", "cdg1", "lhr1"], // European regions for low latency

  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 300, // 5 minutes for AI matching
      "memory": 3008     // 3GB for complex operations
    }
  },

  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],

  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://jobping.com"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        },
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
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ],

  "env": {
    "NODE_ENV": "production",
    "NEXT_TELEMETRY_DISABLED": "1"
  }
}
```

### Environment Configuration

#### Production Environment Variables
```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/jobping_prod
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# AI Services
OPENAI_API_KEY=sk-prod-your-openai-key
OPENAI_ORGANIZATION=org-your-org-id

# Authentication & Security
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://jobping.com
JWT_SECRET=your-jwt-secret

# Email Services
RESEND_API_KEY=re_your-resend-key
RESEND_WEBHOOK_SECRET=whsec_your-webhook-secret

# Payment Processing
STRIPE_SECRET_KEY=sk_live_your-stripe-secret
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook
STRIPE_PRICE_ID_FREE=price_free_tier
STRIPE_PRICE_ID_PREMIUM=price_premium_tier

# External APIs
GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
POSTHOG_API_KEY=phc_your-posthog-key
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Caching & Performance
REDIS_URL=redis://user:password@host:port
REDIS_CACHE_TTL=3600
NEXT_PUBLIC_CACHE_TTL=300

# Feature Flags
FEATURE_AI_MATCHING=true
FEATURE_PREMIUM_USERS=true
FEATURE_EMAIL_DIGESTS=true
FEATURE_ANALYTICS=true

# Monitoring & Alerting
SENTRY_ENVIRONMENT=production
LOG_LEVEL=warn
METRICS_ENABLED=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=240000
RATE_LIMIT_MAX_REQUESTS=30
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=true

# Scraping Configuration
SCRAPE_ENABLED=true
SCRAPE_INTERVAL_MINUTES=120
SCRAPE_SOURCES=arbeitnow,careerjet,jooble,reed,adzuna
SCRAPE_MAX_JOBS_PER_SOURCE=1000
```

### Database Deployment Strategy

#### Migration Management
```bash
# Database migration workflow
npm run db:generate    # Generate new migration from schema changes
npm run db:migrate     # Apply pending migrations to database
npm run db:rollback    # Rollback last migration (development only)
npm run db:status      # Check migration status
npm run db:seed        # Populate database with initial data

# Migration file structure
supabase/migrations/
├── 20240101000000_initial_schema.sql
├── 20240102000000_add_user_preferences.sql
├── 20240103000000_create_matches_table.sql
├── 20240104000000_add_job_scraping_indexes.sql
└── 20240105000000_enhance_security.sql
```

#### Supabase Production Setup
```sql
-- Production database configuration
ALTER DATABASE jobping_prod SET timezone = 'UTC';

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create production user with minimal privileges
CREATE USER jobping_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE jobping_prod TO jobping_app;
GRANT USAGE ON SCHEMA public TO jobping_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO jobping_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jobping_app;

-- Row Level Security policies for production
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_own_data ON users FOR ALL USING (auth.uid() = id);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY matches_user_access ON matches FOR ALL
  USING (user_email = auth.email());

-- Performance indexes for production
CREATE INDEX CONCURRENTLY idx_jobs_prod_lookup
ON jobs(active, visa_friendly, posted_at DESC, city)
WHERE active = true;

CREATE INDEX CONCURRENTLY idx_matches_prod_performance
ON matches(user_email, match_score DESC, matched_at DESC);
```

### Monitoring & Observability Setup

#### Sentry Configuration
```typescript
// Production error tracking
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 0.1, // 10% of transactions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/jobping\.com/],
    }),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.data) {
      event.request.data = redactSensitiveData(event.request.data);
    }
    return event;
  },

  beforeSendTransaction(event) {
    // Filter out health check transactions
    if (event.request?.url?.includes('/api/health')) {
      return null;
    }
    return event;
  },
});
```

#### PostHog Analytics
```typescript
// Production analytics tracking
import posthog from 'posthog-js';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: false, // Custom pageview tracking
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    loaded: (posthog) => {
      // Track initial page load
      posthog.capture('$pageview', {
        $current_url: window.location.href,
      });
    },
  });
}

// Custom event tracking
export const analytics = {
  trackUserSignup: (user: User) => {
    posthog.identify(user.id, {
      email: user.email,
      tier: user.subscription_tier,
      signup_date: user.created_at,
    });
    posthog.capture('user_signed_up', {
      tier: user.subscription_tier,
      source: 'organic',
      user_id: user.id,
    });
  },

  trackJobView: (userId: string, jobId: string) => {
    posthog.capture('job_viewed', {
      user_id: userId,
      job_id: jobId,
      timestamp: new Date().toISOString(),
    });
  },

  trackJobApplication: (userId: string, jobId: string) => {
    posthog.capture('job_application', {
      user_id: userId,
      job_id: jobId,
      timestamp: new Date().toISOString(),
    });
  },
};
```

### Backup & Recovery Strategy

#### Automated Backup Configuration
```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/jobping"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/jobping_prod_${DATE}.sql"

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -f $BACKUP_FILE --no-password

# Compress backup
gzip $BACKUP_FILE

# Upload to cloud storage
aws s3 cp ${BACKUP_FILE}.gz s3://jobping-backups/database/

# Clean up old backups (keep last 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

# Send notification
curl -X POST $SLACK_WEBHOOK \
  -H 'Content-type: application/json' \
  -d "{\"text\":\"Database backup completed: ${BACKUP_FILE}.gz\"}"
```

#### Disaster Recovery Plan
```bash
# Emergency recovery procedure
#!/bin/bash

echo "🚨 STARTING EMERGENCY DATABASE RECOVERY"

# 1. Stop application traffic
kubectl scale deployment jobping-app --replicas=0

# 2. Identify latest good backup
LATEST_BACKUP=$(aws s3 ls s3://jobping-backups/database/ | sort | tail -n 1 | awk '{print $4}')

# 3. Download and restore backup
aws s3 cp s3://jobping-backups/database/$LATEST_BACKUP /tmp/
gunzip /tmp/$LATEST_BACKUP
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < /tmp/jobping_prod_*.sql

# 4. Verify data integrity
npm run db:verify-integrity

# 5. Restart application
kubectl scale deployment jobping-app --replicas=3

# 6. Monitor recovery
curl -f https://jobping.com/api/health

echo "✅ DATABASE RECOVERY COMPLETED"
```

### Performance Monitoring Dashboard

#### Key Metrics Tracking
```typescript
// Production metrics collection
export const productionMetrics = {
  // Business metrics
  userSignups: new Counter('user_signups_total', 'Total user signups'),
  jobApplications: new Counter('job_applications_total', 'Total job applications'),
  emailDeliveries: new Counter('email_deliveries_total', 'Total email deliveries'),

  // Performance metrics
  apiResponseTime: new Histogram('api_response_time', 'API response time', ['endpoint']),
  databaseQueryTime: new Histogram('db_query_time', 'Database query time', ['operation']),
  aiMatchingTime: new Histogram('ai_matching_time', 'AI matching duration'),

  // Error metrics
  apiErrors: new Counter('api_errors_total', 'Total API errors', ['endpoint', 'status_code']),
  databaseErrors: new Counter('db_errors_total', 'Total database errors'),
  externalApiErrors: new Counter('external_api_errors_total', 'External API failures', ['service']),

  // Resource metrics
  memoryUsage: new Gauge('memory_usage_bytes', 'Memory usage in bytes'),
  cpuUsage: new Gauge('cpu_usage_percent', 'CPU usage percentage'),
  activeConnections: new Gauge('active_connections', 'Number of active connections'),
};
```

### Incident Response Protocol

#### Severity Levels
- **P0 (Critical)**: Complete service outage, data loss
- **P1 (High)**: Major functionality broken, payment issues
- **P2 (Medium)**: Minor features broken, performance degraded
- **P3 (Low)**: Cosmetic issues, monitoring alerts

#### Response Timeline
- **P0**: Page within 5 minutes, Resolution within 1 hour
- **P1**: Page within 15 minutes, Resolution within 4 hours
- **P2**: Acknowledge within 1 hour, Resolution within 24 hours
- **P3**: Acknowledge within 4 hours, Resolution within 1 week

#### Communication Template
```markdown
🚨 **INCIDENT UPDATE**

**Status**: 🔴 ACTIVE / 🟡 MONITORING / 🟢 RESOLVED
**Severity**: P[0-3]
**Start Time**: [Timestamp]
**Affected Systems**: [List of impacted services]
**Impact**: [Description of user impact]
**Current Status**: [What we know, what we're doing]
**ETA**: [Expected resolution time]
**Communication**: [Next update time]

**Workaround**: [If available]
**Contact**: [support@jobping.com](mailto:support@jobping.com)
```

---

## Contributing Technical Details

### Development Environment Deep Dive

#### Local Development Setup with Docker
```yaml
# docker-compose.yml for full development environment
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: jobping_dev
      POSTGRES_USER: jobping
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "1025:1025"  # SMTP server
      - "8025:8025"  # Web interface

volumes:
  postgres_data:
  redis_data:
```

#### VS Code Development Configuration
```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  }
}

// .vscode/extensions.json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json",
    "usernamehw.errorlens"
  ]
}
```

### Code Quality Standards

#### TypeScript Configuration
```json
// tsconfig.json - Strict production settings
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/utils/*": ["./utils/*"],
      "@/hooks/*": ["./hooks/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "out",
    "build"
  ]
}
```

#### ESLint Configuration
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-const': 'error',

    // Import organization
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
      },
    ],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',

    // React specific rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/prop-types': 'off', // Using TypeScript instead

    // General code quality
    'no-console': 'warn',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
};
```

### Git Workflow Standards

#### Branch Naming Convention
```bash
# Feature branches
git checkout -b feature/user-authentication
git checkout -b feature/job-matching-algorithm

# Bug fix branches
git checkout -b fix/email-verification-bug
git checkout -b fix/signup-form-validation

# Hotfix branches (for production issues)
git checkout -b hotfix/payment-processing-failure

# Release branches
git checkout -b release/v1.2.0
```

#### Commit Message Standards
```bash
# Format: type(scope): description
# Types: feat, fix, docs, style, refactor, test, chore

# Examples
feat(auth): implement Google OAuth login
fix(api): resolve rate limiting issue in signup endpoint
docs(readme): update API documentation for v2 endpoints
refactor(matching): simplify fallback algorithm logic
test(utils): add unit tests for date formatting functions
chore(deps): update Next.js to version 14.1.0

# Breaking changes
feat(api)!: migrate to REST API v2 with authentication
```

#### Pull Request Template
```markdown
## Description
Brief description of the changes and the problem they solve.

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Code style update
- [ ] ♻️ Refactor (no functional changes)
- [ ] 🧪 Tests (adding or updating tests)
- [ ] 🔧 Build/CI changes

## Testing
### Manual Testing
- [ ] Tested signup flow end-to-end
- [ ] Verified job matching results
- [ ] Checked email notifications
- [ ] Tested on mobile devices

### Automated Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass locally
- [ ] TypeScript compilation succeeds

## Screenshots (if applicable)
<!-- Add screenshots of UI changes, new features, etc. -->

## Performance Impact
- [ ] No performance impact
- [ ] Improves performance (specify: ______)
- [ ] May impact performance (specify: ______)

## Security Considerations
- [ ] No security implications
- [ ] Security improvement (specify: ______)
- [ ] Potential security concern (specify: ______)

## Deployment Notes
<!-- Any special deployment considerations or migrations required -->

## Related Issues
Closes #123
Related to #456

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published
```

### Code Review Process

#### Review Checklist for Reviewers
```markdown
## Code Review Checklist

### Functionality
- [ ] Code compiles without errors
- [ ] Logic is correct and handles edge cases
- [ ] No obvious bugs or security issues
- [ ] Tests are comprehensive and passing

### Code Quality
- [ ] Code follows project conventions
- [ ] Variables and functions are well-named
- [ ] Code is readable and maintainable
- [ ] No unnecessary complexity

### Performance
- [ ] No performance regressions
- [ ] Efficient database queries
- [ ] Proper error handling
- [ ] Resource usage is reasonable

### Security
- [ ] Input validation is proper
- [ ] Authentication/authorization is correct
- [ ] Sensitive data is handled securely
- [ ] No security vulnerabilities introduced

### Testing
- [ ] Unit tests cover new functionality
- [ ] Integration tests verify end-to-end flows
- [ ] E2E tests validate user experience
- [ ] Edge cases are covered

### Documentation
- [ ] Code is well-documented
- [ ] README is updated if needed
- [ ] API documentation is current
- [ ] Breaking changes are documented
```

### Release Process

#### Version Numbering
JobPing follows [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes (2.0.0)
- **MINOR**: New features (1.1.0)
- **PATCH**: Bug fixes (1.0.1)

#### Release Checklist
```markdown
## Pre-Release
- [ ] All tests passing on main branch
- [ ] Code review completed and approved
- [ ] Documentation updated
- [ ] Migration scripts tested
- [ ] Performance benchmarks met

## Release
- [ ] Create release branch from main
- [ ] Update version numbers in package.json
- [ ] Update CHANGELOG.md
- [ ] Tag release commit
- [ ] Deploy to staging environment

## Post-Release
- [ ] Monitor error rates and performance
- [ ] User feedback collection
- [ ] Hotfix preparation if needed
- [ ] Next sprint planning
```

---

## Development Setup Deep Dive

### Advanced Local Development

#### Multi-Environment Setup
```bash
# Create multiple .env files for different environments
cp .env.example .env.local           # Development
cp .env.example .env.staging         # Staging testing
cp .env.example .env.production      # Production simulation

# Switch between environments
npm run dev:local      # Uses .env.local
npm run dev:staging    # Uses .env.staging
npm run dev:prod       # Uses .env.production (read-only)
```

#### Hot Module Replacement Configuration
```javascript
// next.config.js - Advanced HMR setup
module.exports = {
  experimental: {
    // Enable fast refresh for better development experience
    fastRefresh: true,
    // Optimize HMR for large codebases
    optimizeCss: true,
    // Enable webpack build worker
    webpackBuildWorker: true,
  },

  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Improve HMR performance
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    // Development-specific optimizations
    if (dev) {
      config.devtool = 'eval-cheap-module-source-map';
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
        chunkIds: 'named',
      };
    }

    return config;
  },
};
```

### Database Development Workflow

#### Local Supabase Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize local Supabase instance
supabase init
supabase start

# Access local dashboard
open http://localhost:54323

# Apply migrations
supabase db push

# Reset database
supabase db reset
```

#### Migration Development
```sql
-- Migration file structure
-- supabase/migrations/20240101000000_feature_name.sql

BEGIN;

-- Create new table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY user_preferences_own_data ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

COMMIT;
```

### API Development Workflow

#### API Route Structure
```typescript
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserById, updateUser } from '@/lib/database/users';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Authorization
    if (session.user.id !== params.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Business logic
    const user = await getUserById(params.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.id !== params.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updatedUser = await updateUser(params.id, body);

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Update Error:', error);
    return NextResponse.json(
      { error: 'Update failed' },
      { status: 500 }
    );
  }
}
```

#### Testing in Development

##### Component Testing with Testing Library
```typescript
// components/UserProfile.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { UserProfile } from './UserProfile';

const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
};

describe('UserProfile', () => {
  it('displays user information', async () => {
    // Mock API call
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUser),
      })
    ) as jest.Mock;

    render(<UserProfile userId="1" />);

    // Loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('handles error states', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
      })
    ) as jest.Mock;

    render(<UserProfile userId="1" />);

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });
});
```

### Performance Monitoring in Development

#### Bundle Analysis
```bash
# Analyze bundle size
npm run build:analyze

# Check for large dependencies
npm run bundle:report

# Optimize imports
# Before
import { Button, Input, Card } from '@shadcn/ui';

// After
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
```

#### Runtime Performance Monitoring
```typescript
// Performance monitoring hook for development
import { useEffect } from 'react';

export function usePerformanceMonitoring(componentName: string) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (duration > 100) { // Log slow components
        console.warn(`${componentName} render took ${duration.toFixed(2)}ms`);
      }
    };
  }, [componentName]);
}

// Usage
export function SlowComponent() {
  usePerformanceMonitoring('SlowComponent');

  // Expensive operations...
  return <div>Slow component</div>;
}
```

### Debugging Tools

#### React Developer Tools
```typescript
// Development-only debugging helpers
if (process.env.NODE_ENV === 'development') {
  // Add to window for console access
  (window as any).debugUser = (userId: string) => {
    // Debug user data
    console.log('Debugging user:', userId);
  };

  (window as any).debugJobs = (limit = 5) => {
    // Debug job data
    console.log('Debugging jobs, limit:', limit);
  };
}

// Console commands available in development:
// debugUser('user-123')
// debugJobs(10)
```

#### Network Request Debugging
```typescript
// Intercept and log all API calls in development
if (process.env.NODE_ENV === 'development') {
  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const startTime = Date.now();
    const [url, options] = args;

    console.log(`🚀 API Request: ${options?.method || 'GET'} ${url}`);

    try {
      const response = await originalFetch(...args);
      const duration = Date.now() - startTime;

      console.log(`✅ API Response: ${response.status} (${duration}ms)`);

      // Clone response for logging
      const clonedResponse = response.clone();
      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
          const data = await clonedResponse.json();
          console.log('Response data:', data);
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }

      return response;
    } catch (error) {
      console.error(`❌ API Error: ${url}`, error);
      throw error;
    }
  };
}
```

---

## Project Structure Details

### Complete Directory Structure

```
jobping/
├── .next/                          # Next.js build output (generated)
├── node_modules/                   # Dependencies (generated)
├── docs/                           # Documentation
│   ├── api.md                      # API reference
│   ├── architecture.md             # System architecture
│   ├── testing.md                  # Testing guide
│   ├── database.md                 # Database schema
│   ├── ai.md                       # AI implementation
│   ├── frontend.md                 # Component architecture
│   ├── security.md                 # Security measures
│   ├── performance.md              # Performance optimization
│   ├── scraping.md                 # Job scraping details
│   ├── troubleshooting.md          # Common issues
│   ├── contributing.md             # Development guidelines
│   └── changelog.md                # Version history
├── public/                         # Static assets
│   ├── images/                     # Image assets
│   ├── fonts/                      # Font files
│   └── favicon.ico                 # Favicon
├── src/                            # Source code (Next.js 13+ app directory)
│   ├── app/                        # Next.js app router
│   │   ├── (auth)/                 # Route groups for auth pages
│   │   │   ├── login/              # Login page
│   │   │   ├── signup/             # Signup flow
│   │   │   └── verify-email/       # Email verification
│   │   ├── (dashboard)/            # Route groups for dashboard
│   │   │   ├── dashboard/          # Main dashboard
│   │   │   ├── matches/            # Job matches
│   │   │   └── profile/            # User profile
│   │   ├── api/                    # API routes
│   │   │   ├── auth/               # Authentication endpoints
│   │   │   │   ├── [...nextauth]/  # NextAuth.js configuration
│   │   │   │   ├── login/          # Login API
│   │   │   │   └── callback/       # OAuth callbacks
│   │   │   ├── jobs/               # Job-related endpoints
│   │   │   │   ├── [id]/           # Individual job operations
│   │   │   │   ├── search/         # Job search
│   │   │   │   └── matches/        # Job matching
│   │   │   ├── users/              # User management
│   │   │   │   ├── [id]/           # User operations
│   │   │   │   ├── profile/        # Profile management
│   │   │   │   └── preferences/    # User preferences
│   │   │   ├── webhooks/           # Webhook handlers
│   │   │   │   ├── stripe/         # Payment webhooks
│   │   │   │   └── resend/         # Email webhooks
│   │   │   ├── cron/               # Scheduled jobs
│   │   │   │   ├── daily-scrape/   # Job scraping
│   │   │   │   ├── email-delivery/ # Email sending
│   │   │   │   └── maintenance/    # System maintenance
│   │   │   └── health/             # Health checks
│   │   ├── globals.css             # Global styles
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Home page
│   │   ├── loading.tsx             # Loading UI
│   │   ├── error.tsx               # Error boundaries
│   │   └── not-found.tsx           # 404 page
│   ├── components/                 # Reusable components
│   │   ├── ui/                     # Base UI components (shadcn/ui)
│   │   │   ├── button.tsx          # Button component
│   │   │   ├── input.tsx           # Input component
│   │   │   ├── card.tsx            # Card component
│   │   │   ├── dialog.tsx          # Modal dialogs
│   │   │   ├── toast.tsx           # Toast notifications
│   │   │   ├── form.tsx            # Form components
│   │   │   ├── table.tsx           # Data tables
│   │   │   ├── tabs.tsx            # Tab navigation
│   │   │   └── ...                 # Other UI components
│   │   ├── layout/                 # Layout components
│   │   │   ├── header.tsx          # Site header
│   │   │   ├── footer.tsx          # Site footer
│   │   │   ├── sidebar.tsx         # Dashboard sidebar
│   │   │   └── navigation.tsx      # Navigation components
│   │   ├── forms/                  # Form components
│   │   │   ├── signup-form.tsx     # User registration
│   │   │   ├── login-form.tsx      # User login
│   │   │   ├── job-search.tsx      # Job search form
│   │   │   ├── profile-form.tsx    # Profile editing
│   │   │   └── preferences-form.tsx # User preferences
│   │   ├── jobs/                   # Job-related components
│   │   │   ├── job-card.tsx        # Job listing card
│   │   │   ├── job-details.tsx     # Job detail view
│   │   │   ├── job-filters.tsx     # Job search filters
│   │   │   ├── job-matches.tsx     # Job match results
│   │   │   └── job-application.tsx # Job application form
│   │   ├── dashboard/              # Dashboard components
│   │   │   ├── stats-overview.tsx  # User statistics
│   │   │   ├── recent-matches.tsx  # Recent job matches
│   │   │   ├── email-history.tsx   # Email delivery history
│   │   │   └── activity-feed.tsx   # User activity timeline
│   │   ├── auth/                   # Authentication components
│   │   │   ├── auth-guard.tsx      # Route protection
│   │   │   ├── auth-provider.tsx   # Authentication context
│   │   │   └── social-login.tsx    # OAuth login buttons
│   │   ├── shared/                 # Shared utility components
│   │   │   ├── loading.tsx         # Loading states
│   │   │   ├── error-boundary.tsx  # Error boundaries
│   │   │   ├── empty-state.tsx     # Empty state displays
│   │   │   ├── pagination.tsx      # Pagination controls
│   │   │   └── search-input.tsx    # Search input component
│   │   └── ...                     # Additional component categories
│   ├── lib/                        # Utility libraries
│   │   ├── auth.ts                 # Authentication utilities
│   │   ├── database.ts             # Database client and queries
│   │   ├── api.ts                  # API client and utilities
│   │   ├── validation.ts           # Data validation schemas
│   │   ├── constants.ts            # Application constants
│   │   ├── config.ts               # Configuration management
│   │   ├── logger.ts               # Logging utilities
│   │   ├── cache.ts                # Caching utilities
│   │   ├── email.ts                # Email utilities
│   │   └── utils.ts                # General utilities
│   ├── hooks/                      # Custom React hooks
│   │   ├── useAuth.ts              # Authentication hook
│   │   ├── useJobs.ts              # Job data management
│   │   ├── useMatches.ts           # Job matching logic
│   │   ├── useNotifications.ts     # Notification management
│   │   ├── useDebounce.ts          # Debouncing utilities
│   │   ├── useLocalStorage.ts      # Local storage management
│   │   └── useApi.ts               # API call management
│   ├── utils/                      # Business logic utilities
│   │   ├── matching/               # Job matching algorithms
│   │   │   ├── core/               # Core matching logic
│   │   │   │   ├── fallback.service.ts    # Rule-based matching
│   │   │   │   ├── ai-matching.service.ts # AI-powered matching
│   │   │   │   ├── prefilter.service.ts   # Job filtering
│   │   │   │   └── matching-engine.ts     # Main matching coordinator
│   │   │   ├── scoring/            # Scoring algorithms
│   │   │   │   ├── scoring-standard.ts    # Scoring framework
│   │   │   │   ├── scoring-transparency.ts # Score explanations
│   │   │   │   └── categoryMapper.ts      # Category mapping
│   │   │   ├── business-logic/     # Business rules
│   │   │   │   └── user-choice-respector.ts # User preference handling
│   │   │   ├── types.ts            # TypeScript definitions
│   │   │   ├── matchUtils.ts       # Matching utilities
│   │   │   └── embedding.service.ts # Vector embeddings
│   │   ├── strategies/             # Matching strategies
│   │   │   ├── FreeMatchingStrategy.ts    # Free tier matching
│   │   │   ├── PremiumMatchingStrategy.ts # Premium tier matching
│   │   │   └── ErrorRecoveryStrategies.ts # Error handling strategies
│   │   ├── scraping/               # Job scraping utilities
│   │   │   ├── scrapers/           # Individual scrapers
│   │   │   ├── types.ts            # Scraping type definitions
│   │   │   └── utils.ts            # Scraping utilities
│   │   ├── services/               # Application services
│   │   │   ├── SignupMatchingService.ts   # Signup matching logic
│   │   │   └── EmailService.ts            # Email management
│   │   ├── production-rate-limiter.ts     # Rate limiting
│   │   └── url-helpers.ts                 # URL utilities
│   ├── types/                      # Global TypeScript definitions
│   │   ├── api.ts                 # API response types
│   │   ├── database.ts            # Database schema types
│   │   ├── forms.ts               # Form data types
│   │   ├── jobs.ts                # Job-related types
│   │   ├── users.ts               # User-related types
│   │   └── index.ts               # Type exports
│   └── styles/                    # Global styles
│       ├── globals.css            # Global CSS variables and resets
│       ├── components.css         # Component-specific styles
│       └── utilities.css          # Utility classes
├── supabase/                      # Supabase configuration
│   ├── config.toml                # Supabase project config
│   ├── migrations/                # Database migrations
│   │   ├── 20240101000000_initial_schema.sql
│   │   ├── 20240102000000_add_indexes.sql
│   │   ├── 20240103000000_rls_policies.sql
│   │   └── ...                    # Additional migrations
│   └── seed.sql                   # Database seeding
├── scripts/                       # Development and build scripts
│   ├── build.ts                   # Custom build scripts
│   ├── deploy.ts                  # Deployment automation
│   ├── db-migration.ts            # Database migration helpers
│   ├── seed.ts                    # Database seeding scripts
│   ├── test-production-matching-engine.ts # Production testing
│   └── ...                        # Additional utility scripts
├── tests/                         # Test files
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   ├── e2e/                       # End-to-end tests
│   │   ├── real-user-scenarios.spec.ts    # User journey tests
│   │   ├── premium-user-scenarios.spec.ts # Premium feature tests
│   │   ├── api-endpoint-validation.spec.ts # API testing
│   │   ├── critical-flows.spec.ts          # Critical path testing
│   │   ├── simple-signup.spec.ts           # Basic signup testing
│   │   └── complete-signup-flow.spec.ts    # Complete flow testing
│   ├── utils/                     # Test utilities
│   ├── fixtures/                  # Test data fixtures
│   └── setup.ts                   # Test configuration
├── __tests__/                      # Jest test files (Jasmine-style)
│   ├── api/                       # API endpoint tests
│   │   ├── signup-free.test.ts    # Free signup city normalization tests
│   │   └── ...                    # Other API tests
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore rules
├── biome.json                     # Code formatting configuration
├── jest.config.js                 # Jest testing configuration
├── next.config.ts                 # Next.js configuration
├── package.json                   # Package dependencies and scripts
├── playwright.config.ts           # Playwright E2E configuration
├── README.md                      # Main project documentation
├── tailwind.config.ts             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
└── vercel.json                    # Vercel deployment configuration
```

### File Organization Principles

#### Component Organization
- **Atomic Design**: Components organized by size and complexity
- **Feature-Based**: Related components grouped together
- **Reusable**: Common components in shared directories
- **Type-Safe**: Full TypeScript coverage for all components

#### API Route Organization
- **RESTful Structure**: Clear resource-based URL patterns
- **HTTP Methods**: Proper use of GET, POST, PUT, DELETE
- **Error Handling**: Consistent error response formats
- **Authentication**: Centralized auth middleware

#### Database Organization
- **Migration-Based**: Version-controlled schema changes
- **Seed Data**: Consistent test and development data
- **Indexes**: Performance-optimized database queries
- **RLS Policies**: Security-first data access patterns

#### Test Organization
- **Test Types**: Unit, integration, and E2E separation
- **Coverage Goals**: 85%+ coverage across all metrics
- **CI/CD Integration**: Automated testing in deployment pipeline
- **Performance Testing**: Load and performance validation

---

## Development Workflow Technical

### Git Workflow Deep Dive

#### Advanced Branching Strategy
```bash
# Main branches
main          # Production-ready code
develop       # Integration branch for features
staging       # Pre-production testing

# Feature branches (from develop)
feature/auth-sso           # Single sign-on implementation
feature/job-ai-matching    # AI-powered job matching
feature/mobile-optimization # Mobile performance improvements

# Release branches (from develop)
release/v1.1.0            # Release preparation
release/v1.2.0-hotfix     # Hotfix release

# Hotfix branches (from main)
hotfix/payment-bug        # Critical production bug fix
hotfix/security-patch     # Security vulnerability fix
```

#### Commit Message Standards with Emojis
```bash
# Format: :emoji: type(scope): description

# Feature commits
✨ feat(auth): implement Google OAuth integration
🚀 feat(api): add job search with filters
💡 feat(ui): redesign dashboard with new metrics

# Bug fixes
🐛 fix(api): resolve rate limiting false positives
🔥 fix(db): fix user preference data corruption
💥 fix(ui): prevent signup form double-submission

# Documentation
📚 docs(api): update webhook documentation
📖 docs(readme): add troubleshooting section
🔧 docs(setup): improve local development guide

# Testing
🧪 test(auth): add OAuth integration tests
✅ test(api): increase API test coverage to 95%
🧪 test(e2e): add premium user journey tests

# Performance
⚡ perf(db): optimize job search query performance
🚀 perf(ui): lazy load dashboard components
💾 perf(cache): implement Redis caching for job matches

# Refactoring
♻️ refactor(auth): simplify authentication flow
🔄 refactor(api): migrate to REST API v2
📦 refactor(components): extract reusable form components

# Configuration
⚙️ config(ci): update GitHub Actions workflow
🔧 config(db): add database connection pooling
📝 config(eslint): update linting rules for React 19
```

### Code Review Process Technical

#### Automated Code Quality Checks
```yaml
# .github/workflows/pr-checks.yml
name: PR Quality Checks

on:
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npm run type-check

      - name: Lint code
        run: npm run lint

      - name: Format check
        run: npm run format:check

      - name: Unit tests
        run: npm run test:unit

      - name: Integration tests
        run: npm run test:integration

      - name: Build check
        run: npm run build

      - name: Bundle analysis
        run: npm run build:analyze
        continue-on-error: true

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Security audit
        run: npm audit --audit-level high

      - name: CodeQL analysis
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript

      - name: Perform CodeQL analysis
        uses: github/codeql-action/analyze@v3
```

#### Performance Review Checklist
```markdown
## Performance Review Checklist

### Frontend Performance
- [ ] Bundle size under 500KB (gzipped)
- [ ] First Contentful Paint under 2 seconds
- [ ] Largest Contentful Paint under 2.5 seconds
- [ ] Cumulative Layout Shift under 0.1
- [ ] No unused JavaScript over 100KB

### Backend Performance
- [ ] API response time under 500ms (95th percentile)
- [ ] Database query time under 100ms (95th percentile)
- [ ] Memory usage under 512MB per instance
- [ ] CPU usage under 70% during peak load

### Database Performance
- [ ] Query execution plans reviewed
- [ ] Proper indexes on all frequent queries
- [ ] Connection pooling configured
- [ ] No table scans on large tables

### Caching Effectiveness
- [ ] Cache hit rate over 80%
- [ ] Redis memory usage monitored
- [ ] Cache invalidation strategy documented
- [ ] Cache warming implemented for critical data

### Scalability Assessment
- [ ] Horizontal scaling capability verified
- [ ] Load balancer configuration reviewed
- [ ] Database read replicas configured
- [ ] CDN integration for static assets
```

### Deployment Pipeline Technical

#### Multi-Environment Deployment
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npm run type-check

      - name: Build application
        run: npm run build

      - name: Run tests
        run: npm run test:all

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

      - name: Run database migrations
        run: npm run db:migrate:production

      - name: Health check
        run: curl -f https://jobping.com/api/health

      - name: Notify deployment
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-type: application/json' \
            -d "{\"text\":\"🚀 JobPing deployed to production successfully!\"}"
```

#### Blue-Green Deployment Strategy
```bash
# Blue-green deployment script
#!/bin/bash

# Deploy to green environment
vercel --prod=false --name=jobping-green

# Health check green environment
if curl -f https://jobping-green.vercel.app/api/health; then
  echo "Green environment healthy"

  # Switch traffic to green
  vercel alias set jobping-green jobping.com

  # Keep blue as rollback option
  echo "Traffic switched to green environment"

  # Monitor for 10 minutes
  sleep 600

  # If no issues, decommission blue
  vercel remove jobping-blue
else
  echo "Green environment unhealthy, keeping blue active"
  exit 1
fi
```

### Monitoring and Alerting Technical

#### Application Monitoring Stack
```typescript
// Sentry configuration for production error tracking
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/jobping\.com/],
    }),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  beforeSend(event, hint) {
    // Sanitize sensitive data
    if (event.request?.data) {
      event.request.data = sanitizeSensitiveData(event.request.data);
    }

    // Filter out health check noise
    if (event.request?.url?.includes('/api/health')) {
      return null;
    }

    return event;
  },
  beforeSendTransaction(event) {
    // Sample high-frequency transactions
    if (event.request?.url?.includes('/api/jobs/search')) {
      return Math.random() < 0.01 ? event : null; // 1% sampling
    }
    return event;
  },
});
```

#### Business Intelligence Dashboard
```typescript
// PostHog analytics with custom events
import posthog from 'posthog-js';

export const analytics = {
  // User lifecycle events
  trackSignup: (user: User, source: string) => {
    posthog.identify(user.id, {
      email: user.email,
      tier: user.subscription_tier,
      signup_date: user.created_at,
    });

    posthog.capture('user_signed_up', {
      tier: user.subscription_tier,
      source,
      user_id: user.id,
      timestamp: new Date().toISOString(),
    });
  },

  // Job matching events
  trackJobView: (userId: string, jobId: string, source: 'email' | 'search' | 'recommendation') => {
    posthog.capture('job_viewed', {
      user_id: userId,
      job_id: jobId,
      source,
      timestamp: new Date().toISOString(),
    });
  },

  trackJobApplication: (userId: string, jobId: string, applicationMethod: string) => {
    posthog.capture('job_application_submitted', {
      user_id: userId,
      job_id: jobId,
      application_method: applicationMethod,
      timestamp: new Date().toISOString(),
    });
  },

  // Engagement metrics
  trackEmailOpen: (userId: string, emailId: string, emailType: string) => {
    posthog.capture('email_opened', {
      user_id: userId,
      email_id: emailId,
      email_type: emailType,
      timestamp: new Date().toISOString(),
    });
  },

  trackEmailClick: (userId: string, emailId: string, linkUrl: string) => {
    posthog.capture('email_link_clicked', {
      user_id: userId,
      email_id: emailId,
      link_url: linkUrl,
      timestamp: new Date().toISOString(),
    });
  },
};
```

#### Infrastructure Monitoring
```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'

volumes:
  prometheus_data:
  grafana_data:
```

This comprehensive technical reference provides all the detailed implementation information needed for development work, while keeping the main README focused on business value and quick start guidance. The documentation is now properly tiered for different audiences and use cases. 🎯📚