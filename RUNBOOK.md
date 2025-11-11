# JobPing Ops Runbook

This runbook is for engineers and operators who need to evaluate production readiness, execute recoveries, or validate deployments. Update it whenever processes change.

---

## Core Checks Before Every Deploy

1. **Verify Observability**
   - Hit `/api/metrics` with the `SYSTEM_API_KEY` header.
   - Confirm API latency histograms and percentiles are populated.
   - Review Vercel analytics for 4xx/5xx spikes in the last 24 hours.
2. **Smoke-Test the Platform**
   - `npm run build && npm run start` (production mode).
   - `PILOT_BASE_URL=http://localhost:3000 npm run pilot:smoke`
   - `LIMITER_BASE_URL=http://localhost:3000 npm run limiter:test`
   - Store generated reports in your operations knowledge base (internal Notion/Drive).
3. **Security Headers**
   - Inspect `/api/health` response headers for `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.
   - Cross-check `vercel.json` with production Vercel project settings.
4. **Database Posture**
   - Confirm Supabase RLS policies (see migrations and Supabase dashboard).
   - Review index coverage (job hash uniqueness, posted_at ordering, category overlap).

---

## Backup & Restore (Supabase)

JobPing relies on Supabase for primary storage. Treat backup hygiene as a release blocker.

### Nightly Backups

Supabase maintains automatic daily backups. Verify that automated backups are enabled in the Supabase dashboard (`Project Settings → Backups`). Document the last verification date in the internal ops log.

### Manual Snapshot (Before Risky Changes)

```bash
supabase db dump --file backups/jobping-pre-change.sql
```

Store the dump in a secure bucket (never commit raw dumps).

### Point-In-Time Recovery (PITR)

1. Open Supabase → Project Settings → Backups → Point-in-time recovery.
2. Choose the target timestamp (UTC) and click **Prepare PITR**.
3. Wait for the restore database URL to be generated.
4. Re-point staging or a scratch environment to the temporary database and validate:
   - Can users authenticate?
   - Are recent signups present?
   - Do scraper metrics look sane?
5. Once validated, swap the production connection string (or coordinate with Supabase support).
6. Record the incident and findings in the ops log.

### Emergency Restore Checklist

| Step | Owner | Notes |
| --- | --- | --- |
| Notify incident channel | On-call engineer | Include timeline + blast radius |
| Freeze deploys | Tech lead | Lock Vercel / GitHub merges |
| Initiate PITR | DBA / On-call | Record timestamp |
| Validate recovery | QA | Run pilot smoke against restore URL |
| Promote & rotate secrets | On-call | Update Supabase env secrets in Vercel |
| Postmortem | Team | File report in ops log |

---

## Deployment Validation

1. `npm run lint`
2. `npm run build`
3. `PILOT_BASE_URL=https://staging.getjobping.com npm run pilot:smoke`
4. `LIMITER_BASE_URL=https://staging.getjobping.com npm run limiter:test`
5. Review generated markdown reports and archive them with the release notes.
6. Tag release (`git tag vX.Y.Z && git push origin vX.Y.Z`).
7. Trigger Vercel deploy, monitor logs, and verify metrics + email delivery.

---

## Incident Response Contacts

| Role | Name | Contact |
| --- | --- | --- |
| Product | — | — |
| Engineering lead | — | — |
| On-call engineer | PagerDuty → JobPing Rotation |
| Email provider | Resend Support (`support@resend.com`) |
| Payments | Stripe Support |

Populate blanks with the current rotation each time ownership changes. Keep the master contact list in the secure ops vault.


