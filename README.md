# JobPing

> AI-powered job matching for early-career roles across Europe. 5 perfect matches, weekly.

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Production](https://img.shields.io/badge/Status-Live-green)](https://getjobping.com)

## What It Does

Weekly AI-matched job recommendations for internships, graduate schemes, and junior roles across European cities. No spam, just 5 high-quality matches delivered every week straight to your inbox.

**Live**: [getjobping.com](https://getjobping.com)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes (Serverless)
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Custom email verification system
- **Payments**: Stripe subscriptions
- **Email**: Resend with custom templates
- **AI**: OpenAI for job matching
- **Job Sources**: Adzuna, Reed, JobSpy (LinkedIn, Indeed, Glassdoor)
- **Hosting**: Vercel Edge Network
- **Monitoring**: Sentry + structured logging
- **Testing**: Jest (unit/integration), Playwright (E2E)

## Quick Start

### Prerequisites

- Node.js 20+
- Supabase account
- Resend API key
- OpenAI API key
- Stripe account (for payments)

### Installation

```bash
# Clone repository
npm install

# Environment
cp .env.example .env
# Fill in required keys

# Start
npm run dev
```

Visit http://localhost:3000

## Environment Variables

See `.env.example` for required variables (DB, Email, AI, Stripe, System).

## Key Features

### AI-Powered Matching
- GPT for job scoring with caching and cost controls
- Pre-filtering by location/experience/visa
- Duplicate prevention per user
- Vector embeddings for semantic matching (see [Vector Embeddings Guide](docs/vector-embeddings-batch-processing.md))

### Smart Email Delivery
- Production-ready templates at `Utils/email/productionReadyTemplates.ts`
- Purple brand alignment, hot-match styling, VML buttons for Outlook
- Feedback endpoints wired into emails

### Security
- RLS enabled
- Rate limiting & input validation
- Admin protected via middleware Basic Auth (see Admin Security below)

### Subscriptions
- Free: 5 jobs/week
- Premium: 15 jobs/week (Mon/Wed/Fri)

## Project Structure

```
app/           # Next.js app
components/    # Shared UI
Utils/         # Email + matching + supabase
scripts/       # Automation & SQL
docs/          # API/architecture/deployment
```

## Email Templates (Production-Ready)

- Source: `Utils/email/productionReadyTemplates.ts`
- Exports: `createWelcomeEmail`, `createJobMatchesEmail`
- Brand: Purple gradients; hot match highlighting; table layout for clients
- Outlook: VML fallback buttons for CTAs
- Feedback: Buttons calling `/api/feedback/email` with sentiment/score

## Send Plan (Operational)

- Free: 5 on signup, then 5 weekly (Thu)
- Premium: 10 on signup, then 5 on Mon/Wed/Fri
- See logic in `Utils/sendConfiguration.ts` and scheduled sender route

## Admin Security

- `/admin` requires Basic Auth via env `ADMIN_BASIC_USER` and `ADMIN_BASIC_PASS`
- Upgrade path: move to session-based admin users and audit logging

## Documentation

- **[Project Status](docs/project-status.md)** - Current system status, metrics, and architecture
- **[Email System](docs/email-system.md)** - Email configuration, testing, and troubleshooting
- **[API Documentation](docs/API.md)** - API endpoints and usage
- **[Deployment Guide](docs/deployment/production-guide.md)** - Production setup and deployment
- **[Vector Embeddings](docs/vector-embeddings-batch-processing.md)** - Batch processing guide
- **[Architecture](docs/architecture/system-design.md)** - System design and architecture
- **[Contributing](CONTRIBUTING.md)** - Contribution guidelines

### Archived Documentation

Historical documentation, cleanup reports, and completion summaries are archived in `docs/archive/` for reference.

## Troubleshooting

- Health: `/api/health` (database, email, queue, external APIs)
- Sentry: configure DSN to enable error reporting
- Email: verify `RESEND_API_KEY` and domain (SPF/DKIM/DMARC) - see [Email System Docs](docs/email-system.md)
- Stripe: set API version to a valid stable string

## Development

```bash
npm run dev
npm run build
npm run start
npm test
npm run type-check
```

## Deployment

- Vercel auto-deploy on push to `main`
- Preview URLs for PRs

## License

MIT

## Support

- Website: https://getjobping.com
- Email: support@getjobping.com
