# Auto-Embedding Generation Setup

This system automatically generates embeddings for new jobs whenever they're added to the database.

## How It Works

1. **Database Trigger**: When a new job is inserted or updated (and doesn't have an embedding), it's automatically added to the `embedding_queue` table.

2. **Queue Processor**: A background job (API endpoint) processes the queue periodically and generates embeddings.

3. **Automatic Retry**: Failed embeddings are retried up to 3 times before giving up.

## Setup Instructions

### 1. Run the Migration

Execute the SQL migration in your Supabase SQL editor:

```sql
-- Run migrations/create_auto_embedding_trigger.sql
```

This creates:
- `embedding_queue` table
- Triggers on `jobs` table
- Helper functions for queue management

### 2. Set Up Cron Job

You need to call the queue processor endpoint periodically. Options:

#### Option A: Vercel Cron (Recommended)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/process-embedding-queue",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Important**: Add `CRON_SECRET` environment variable in Vercel:
- Vercel Dashboard → Project Settings → Environment Variables
- Add: `CRON_SECRET` = any secure random string (e.g., generate with `openssl rand -hex 32`)
- Vercel will automatically send this in the `Authorization: Bearer <CRON_SECRET>` header

The endpoint will automatically authenticate Vercel cron jobs using this secret.

This runs every 5 minutes.

#### Option B: External Cron Service

Use a service like:
- **cron-job.org**
- **EasyCron**
- **GitHub Actions** (if using GitHub)

Call: `POST /api/process-embedding-queue` with HMAC authentication.

### 3. Monitor Queue Status

Check queue status:

```bash
curl https://your-domain.com/api/process-embedding-queue
```

Returns:
```json
{
  "pending": 42,
  "retries": 3,
  "message": "42 jobs pending embedding generation"
}
```

## How It Works

### When Jobs Are Added

1. Job is inserted/updated via `upsert` or `insert`
2. Trigger `trigger_queue_embedding_insert` or `trigger_queue_embedding_update` fires
3. If job is active and has no embedding → added to `embedding_queue`
4. Queue processor picks it up on next run

### Queue Processing

1. Fetches up to 100 jobs from queue (oldest first)
2. Generates embeddings using OpenAI API
3. Stores embeddings in database
4. Marks jobs as processed (or failed with retry count)

### Retry Logic

- Jobs that fail are retried up to 3 times
- After 3 failures, job is marked as permanently failed
- You can manually retry by clearing `processed_at` and `error_message`

## Testing

1. Insert a test job
2. Check it's in queue
3. Process queue (manually or wait for cron)
4. Verify embedding was generated

