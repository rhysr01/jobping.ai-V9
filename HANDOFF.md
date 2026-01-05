# 🚀 JobPing Handoff Documentation

**Last Updated:** January 2025  
**Project Status:** Production (Live at https://getjobping.com)

---

## 📌 Project Essence

JobPing is an AI-powered job matching platform for early-career roles across Europe. It delivers 5 personalized job matches weekly via email, using GPT-based scoring, vector embeddings, and multi-source job aggregation (Adzuna, Reed, JobSpy).

**Live:** https://getjobping.com  
**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (PostgreSQL), Resend (email), OpenAI (matching), Vercel (hosting)

---

## 🛠 Canonical Sources (The "Truth")

### Database Migrations

- **Active:** All migrations are managed via Supabase CLI in `supabase/migrations/`
- **Legacy:** Old SQL scripts archived in `docs/archive/legacy-sql/` (for reference only)
- **How to add:** `npx supabase migration new <name>`
- **How to apply:** `supabase db push` or via Supabase Dashboard → SQL Editor

### Scripts & Automation

- **Executable scripts:** Use `npm run <script-name>`. All definitions in `package.json`
- **Utility scripts:** Located in `/scripts` (`.ts`, `.cjs`, `.sh` files)
- **Background jobs:** Located in `/automation` (real-job-runner.cjs, embedding-refresh.cjs)
- **Legacy reference:** `scripts/reference-scripts-to-port.json` contains 100+ old commands (may need integration as project scales)

### Documentation

- **Active guides:** `/docs/guides/` - How to run, deploy, and operate
  - `PRODUCTION_GUIDE.md` - Production deployment and configuration
  - `RUNBOOK.md` - Operational procedures and incident response
  - `MIGRATION_RUN_ORDER.md` - Database migration execution order
  - `MIGRATION_EXPLANATION.md` - Understanding Supabase migrations
  - `CONTRIBUTING.md` - Contribution guidelines
- **Status reports:** `/docs/status/` - Historical audit logs and fix summaries
- **Archive:** `/docs/archive/` - Legacy files and old SQL scripts

---

## 🏗 Key Architecture Decisions

### 1. Matching Engine

- **Location:** `Utils/matching/consolidated/scoring.ts`
- **Strategy:** Stratified matching with pre-filtering (location, experience, visa status)
- **AI:** GPT-4 for job scoring with caching and cost controls
- **Vector embeddings:** Semantic matching via Supabase pgvector extension
- **See:** `docs/status/STRATIFIED_MATCHING_IMPLEMENTATION.md` for details

### 2. Database & Security

- **Primary:** Supabase (PostgreSQL with RLS enabled)
- **RLS Policies:** Row-level security on all public tables (see `supabase/migrations/20260102182501_enable_rls_on_tables.sql`)
- **Connection:** Shared pool via `lib/supabase-client.ts` (service role for server-side)
- **Migrations:** Timestamped files in `supabase/migrations/` (tracked by Supabase)

### 3. Email System

- **Provider:** Resend
- **Templates:** `Utils/email/productionReadyTemplates.ts`
- **Delivery:**
  - Free: No emails (website-only access to 5 matches for 30 days)
  - Premium: 10 matches on signup + 15/week via email (Mon/Wed/Fri, 5 per email)
- **See:** `docs/guides/PRODUCTION_GUIDE.md` for email configuration

### 4. Job Sources

- **Scrapers:** Located in `/scrapers/` (Adzuna, Reed, JobSpy wrappers)
- **Normalization:** Database-level triggers + application-level (`lib/normalize.ts`)
- **Filtering:** Job boards flagged as companies, non-business roles filtered
- **See:** `docs/status/JOB_BOARD_PREVENTION.md` for filtering logic

### 5. Environment & Configuration

- **Validation:** `lib/env.ts` - All env vars validated at startup
- **Required vars:** See `docs/guides/PRODUCTION_GUIDE.md` section 2
- **Security:** System keys, HMAC secrets, admin Basic Auth (see `middleware.ts`)

---

## ⚠️ Known Debt / "Watch Out"

### Documentation Sprawl (Resolved)

- ✅ **Fixed:** Recently archived 90+ status reports to `docs/status/`
- ⚠️ **Note:** If looking for old audit logs, check `docs/archive/` or `docs/status/`
- **Action:** New status reports should go to `docs/status/`, not root

### Script Consolidation (In Progress)

- ⚠️ **Issue:** `scripts/reference-scripts-to-port.json` contains 100+ legacy commands
- **Action:** Review and port useful scripts to `package.json` as needed
- **Current:** `package.json` has ~30 active scripts (sufficient for now)

### Migration Directory (Resolved)

- ✅ **Fixed:** Consolidated to `supabase/migrations/` as canonical
- **Legacy:** Old `migrations/` folder archived to `docs/archive/legacy-sql/`
- **Action:** Always use `supabase/migrations/` for new migrations

### Empty Directories

- ✅ **Fixed:** Removed empty `services/` directory
- **Note:** If you need a services layer, create it fresh

---

## 🚦 Common Workflows

### Local Development

```bash
npm install
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run type-check  # TypeScript validation
npm run lint        # Linting
```

### Database Operations

```bash
# Create new migration
npx supabase migration new <name>

# Apply migrations (local)
supabase db push

# Or via Supabase Dashboard → SQL Editor (paste migration file)
```

### Testing

```bash
npm test                    # Jest unit/integration tests
npm run test:coverage       # With coverage report
npm run test:e2e           # Playwright E2E tests
npm run pilot:smoke        # Production readiness smoke test
```

### Deployment

```bash
npm run build              # Production build
npm run start              # Local production server
# Vercel auto-deploys on push to main
```

### Health Checks

```bash
curl http://localhost:3000/api/health
npm run verify:env         # Verify environment services
```

### Background Jobs

```bash
npm run automation:start          # Real job runner
npm run automation:embeddings     # Refresh vector embeddings
```

---

## 🔐 Security Checklist

- [ ] All environment variables set in Vercel (production)
- [ ] `SYSTEM_API_KEY`, `ADMIN_API_KEY` rotated quarterly
- [ ] `EMAIL_VERIFICATION_SECRET`, `PREFERENCES_SECRET` are ≥32 chars
- [ ] RLS policies enabled on all public tables
- [ ] Admin routes protected via Basic Auth (`ADMIN_BASIC_USER`, `ADMIN_BASIC_PASS`)
- [ ] Rate limiting enabled (see `lib/api-logger.ts`)
- [ ] Secrets stored in Vercel environment (not in code)

**See:** `docs/guides/PRODUCTION_GUIDE.md` section 2 for full security setup

---

## 📊 Monitoring & Observability

- **Health endpoint:** `/api/health` (database, email, queue, external APIs)
- **Metrics:** `/api/metrics` (requires `SYSTEM_API_KEY` header)
- **Logging:** Structured logs via `lib/monitoring.ts`
- **Error tracking:** Application logs (consider Sentry integration)
- **Vercel Analytics:** 4xx/5xx spikes, latency histograms

**See:** `docs/guides/RUNBOOK.md` for operational procedures

---

## 🆘 Quick Troubleshooting

### Database Issues

- Check Supabase dashboard → Database → Connection pooling
- Verify RLS policies: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`
- Review migration status: Supabase Dashboard → Database → Migrations

### Email Not Sending

- Verify `RESEND_API_KEY` in environment
- Check domain SPF/DKIM/DMARC records
- See: `docs/guides/PRODUCTION_GUIDE.md` section on email

### Matching Not Working

- Check OpenAI API key and quotas
- Verify vector embeddings exist: `SELECT COUNT(*) FROM jobs WHERE embedding IS NOT NULL`
- Review matching logs: `SELECT * FROM match_logs ORDER BY created_at DESC LIMIT 10`

### Build Failures

- Run `npm run type-check` to catch TypeScript errors
- Check `next.config.ts` for configuration issues
- Verify all dependencies: `npm install`

---

## 📚 Additional Resources

- **Main README:** [`README.md`](./README.md)
- **Production Guide:** [`docs/guides/PRODUCTION_GUIDE.md`](./docs/guides/PRODUCTION_GUIDE.md)
- **Runbook:** [`docs/guides/RUNBOOK.md`](./docs/guides/RUNBOOK.md)
- **Contributing:** [`docs/guides/CONTRIBUTING.md`](./docs/guides/CONTRIBUTING.md)
- **Documentation Index:** [`docs/README.md`](./docs/README.md)

---

## 🤝 Handoff Checklist

- [x] Repository structure consolidated (migrations, scripts, docs)
- [x] All environment variables documented
- [ ] Database migrations up to date
- [ ] Tests passing (`npm test`)
- [ ] Production build successful (`npm run build`)
- [ ] Health check passing (`/api/health`)
- [ ] Documentation reviewed and accurate
- [x] Known issues documented above
- [ ] Access credentials shared (Supabase, Vercel, Resend, OpenAI)

---

**Questions?** Check the guides first, then reach out to the previous developer or review the status reports in `docs/status/` for historical context.
