# JobPing Production Guide

This guide consolidates everything required to operate JobPing in production. It covers runtime architecture, environment configuration, deploy cadence, monitoring, and incident playbooks at a high level. Pair it with `RUNBOOK.md` for day–to–day operational steps.

---

## 1. Architecture Overview

- **Next.js API & App Routes** – Core services run inside Vercel’s serverless runtime. Every API route enforces the shared patterns below (logging, rate-limiting, secure tokens, structured payloads).
- **Supabase** – Primary datastore (Postgres) plus authentication for internal tooling. Accessed via the shared connection pool defined in `Utils/databasePool.ts`.
- **Redis** – Optional cache layer for rate limiting and matching accelerators (`Utils/productionRateLimiter.ts`).
- **Background & Scraping Jobs** – Triggered via script entry points under `scripts/` and `automation/`, authenticated with system keys and unified locking.
- **Email Delivery** – Resend (transactional) driven by `Utils/email/sender.ts` with signed preference links and verification flows.
- **Billing** – Polar-based checkout/endpoints under `app/api/billing/*`.
- **Dashboards & Monitoring** – `/api/dashboard` and `/api/health` expose health metrics. All structured logging funnels through `lib/monitoring.ts`.

Consistency rules:

1. **Request Lifecycle** – Every route uses the shared logger, rate limiter (`getProductionRateLimiter`), and error helpers (`Utils/errorResponse`).
2. **Security** – API/system endpoints require HMAC or system keys; user-facing flows rely on signed tokens (`Utils/auth/secureTokens.ts`).
3. **Caching & Locks** – Use the helpers in `Utils/productionRateLimiter.ts` and `Utils/matching/*` (avoid ad-hoc caches).
4. **Health** – The `/api/health` endpoint must stay fast (<100 ms) and side effect free.

---

## 2. Environment Configuration

Maintain a single `.env.production` (or Vercel environment values) covering **all** required keys. Validation happens via `lib/env.ts`, so missing values will fail fast.

### Required Variables

| Purpose         | Key                                                                                 | Notes                                                                                  |
| --------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Application     | `NODE_ENV`, `NEXT_PUBLIC_URL`, `NEXT_PUBLIC_DOMAIN`                                 | `NODE_ENV` must be `production`.                                                       |
| Supabase        | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`        | Service role key is used for server-only operations.                                   |
| Email           | `RESEND_API_KEY`, `EMAIL_DOMAIN`, `EMAIL_VERIFICATION_SECRET`, `PREFERENCES_SECRET` | Secrets must be ≥32 chars. See `SECURITY_SECRETS_SETUP.md` for generation.             |
| Auth & Security | `SYSTEM_API_KEY`, `INTERNAL_API_HMAC_SECRET`, `ADMIN_API_KEY`                       | Rotate quarterly; store in secrets manager. See `SECURITY_SECRETS_SETUP.md` for setup. |
| AI Matching     | `OPENAI_API_KEY`, optional overrides (`AI_TIMEOUT_MS`, etc.)                        | Ensure OpenAI usage quotas are monitored.                                              |
| Billing         | Polar configuration                                                                 | Configure Polar webhook secret in Vercel environment (used in route handlers).         |
| Observability   | Logging via structured logs                                                         | Error tracking via application logs.                                                   |
| Axiom           | `NEXT_PUBLIC_AXIOM_INGEST_ENDPOINT`                                                 | Required for next-axiom integration and full-stack observability.                      |

Optional values (`REDIS_URL`, scraper knobs, etc.) are already typed and defaulted in `lib/env.ts`. Review before enabling experimental modes.

---

## 3. Deploy Pipeline

1. **Preflight Checks**
   - `npm run lint`
   - `npm run type-check`
   - `NODE_ENV=production npm run build`
   - Run targeted smoke tests: `npm run pilot:smoke`, `npm run limiter:test`
2. **Database**
   - Apply migrations via Supabase CLI: `supabase db push`
   - Verify `email_verification_requests` table, indexes, and RLS policies.
3. **Deploy**
   - `vercel deploy --prod` (or via GitHub integration) once all checks pass.
   - Monitor logs for 15 minutes post-deploy (`vercel logs`).
4. **Post-Deploy Validation**
   - Hit `/api/health`, `/api/dashboard`, and the marketing landing page.
   - Perform a signup flow end-to-end (ensure verification email arrives).
   - Trigger billing checkout in test mode to confirm Polar connectivity.

---

## 4. Monitoring & Alerting

- **Error Tracking** – Structured logging via `lib/monitoring.ts` for error tracking and debugging.
- **Rate Limiting & Abuse Detection** – Centralised via `Utils/productionRateLimiter.ts`; check Redis metrics if throttle issues trigger.
- **Business Metrics** – Output through `lib/monitoring.ts` (`logger.metric`, `performanceMonitor`). Ensure log streams feed into your observability stack (e.g. DataDog, Vercel Analytics).
- **Health Endpoints**
  - `/api/health` → basic uptime check.
  - `/api/dashboard` → aggregated stats (database, scraper, environment). Behind rate limit and uses signed tokens.

Alerts should be configured for:

- Elevated error rates in logs
- Elevated 5xx rates on Vercel
- Redis unavailability (if enabled)
- Polar webhook failures

---

## 5. Operational Playbooks

### Email Verification & Preferences Links

- Tokens issued via `Utils/auth/secureTokens.ts` expire automatically (default: 24h for verification, 7d for preferences).
- Links embedded in all outbound email copy; no hard-coded placeholders remain.
- To invalidate all tokens (breach rotation), rotate `EMAIL_VERIFICATION_SECRET`/`PREFERENCES_SECRET` and run the cleanup script (future enhancement).

### Scraper & Matching Jobs

- Scripts in `scripts/` and `automation/` authenticate via `SYSTEM_API_KEY` or HMAC.
- Monitor jobs via metrics in `Utils/monitoring/logger.ts`.
- Ensure rate-limits (`SCRAPER_RATE_LIMITS`) align with provider ToS before scaling up.

### Billing & Support Tools

- Admin endpoints require `SYSTEM_API_KEY` headers (`Utils/auth/withAuth.ts`).
- Polar webhook handler (to be implemented); verify signing secret on each deploy.
- Dashboard functionality is exposed via `/api/dashboard`; the UI is an internal Next.js page.

---

## 6. Incident Response Summary

1. Detect issue (log monitoring, synthetic check failure, manual report).
2. Check `/api/health` and `/api/dashboard` to scope the failure (database vs. external services).
3. If database-related, follow PITR guidance in `RUNBOOK.md` and the Supabase dashboards.
4. For critical incidents, freeze deploys, communicate in the #incident channel, and follow the postmortem template (also in `RUNBOOK.md`).

Escalation contacts and detailed steps live in `RUNBOOK.md`; keep them updated.

---

## 7. Compliance & Housekeeping

- Keep dependencies up to date (`npm outdated` monthly). Remove unused packages flagged by `depcheck` or `ts-prune`.
- Audit migrations quarterly to ensure no scratch files remain (`supabase/migrations/*.sql` should all be applied).
- Review Redis usage and purge stale keys routinely.
- Ensure new engineers read `README.md` → `PRODUCTION_GUIDE.md` → `RUNBOOK.md` in that order.

---

**Last reviewed:** _(update on each release)_  
**Owner:** JobPing Platform Engineering
