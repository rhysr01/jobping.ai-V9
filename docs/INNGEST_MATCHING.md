# Inngest Integration for Durable AI Matching

## Overview

Inngest has been integrated into the matching system to provide **durable workflows** that prevent Vercel function timeouts. This is especially important for AI matching operations that can take 30+ seconds.

## Benefits

- ✅ **No Timeouts**: Inngest functions can run for hours, not limited by Vercel's 10-60s timeout
- ✅ **Automatic Retries**: Built-in retry logic (3 retries by default)
- ✅ **Durable Workflows**: If matching fails mid-way, Inngest automatically retries
- ✅ **Step-by-Step Execution**: Each step is tracked and can be retried independently
- ✅ **Free Tier**: 50,000 events per month

## Architecture

```
API Route → Trigger Inngest Event → Inngest Function → Save Matches to DB
                ↓
         (Optional: Continue with sync matching for immediate response)
```

## Setup

### 1. Environment Variable

Enable Inngest for matching by setting:

```bash
USE_INNGEST_FOR_MATCHING=true
```

### 2. Inngest Functions

The matching function is defined in `lib/inngest/functions.ts`:

- **Function ID**: `perform-ai-matching`
- **Event**: `matching/perform`
- **Retries**: 3 attempts
- **Steps**:
  1. Initialize matching engine
  2. Perform AI matching (with fallback to rule-based)
  3. Save matches to database

### 3. API Routes Updated

The following routes now support Inngest:

- ✅ `/api/signup/free` - Free signup matching
- ✅ `/api/match-users` - Batch user matching
- ⏳ `/api/send-scheduled-emails` - Scheduled email matching (pending)

## Usage

### Triggering Matching Events

```typescript
import { triggerMatchingEvent } from "@/lib/inngest/matching-helpers";

await triggerMatchingEvent({
  userPrefs: userPreferences,
  jobs: jobsArray,
  context: {
    source: "signup/free",
    requestId: crypto.randomUUID(),
  },
});
```

### Event Data Structure

```typescript
interface MatchingEventData {
  userPrefs: UserPreferences;
  jobs: Job[];
  userId?: string;
  context?: {
    source?: string;
    requestId?: string;
  };
}
```

## How It Works

1. **API Route** triggers Inngest event (non-blocking)
2. **Inngest Function** processes matching in background:
   - Initializes matching engine
   - Performs AI matching (with automatic fallback to rule-based)
   - Saves matches to `matches` table
3. **Matches are saved** automatically by Inngest function
4. **API Route** can continue with synchronous matching for immediate response (optional)

## Monitoring

View Inngest function runs at:
- **Local**: http://127.0.0.1:8288/functions
- **Production**: Your Inngest dashboard

## Current Behavior

When `USE_INNGEST_FOR_MATCHING=true`:

1. Inngest event is triggered (async, durable)
2. API route continues with synchronous matching for immediate response
3. Inngest processes matching in background with retries
4. Both results are saved (Inngest result takes precedence due to upsert)

This provides:
- **Immediate response** for users (synchronous matching)
- **Durable backup** with retries (Inngest matching)

## Future Improvements

1. **Fully Async**: Return immediately and send email when Inngest completes
2. **Webhook Callbacks**: Notify API route when matching completes
3. **Batch Processing**: Process multiple users in a single Inngest function
4. **Priority Queues**: Prioritize premium users in matching queue

## Testing

### Local Development

1. Start Inngest DevServer:
   ```bash
   npx inngest-cli@latest dev
   ```

2. Start Next.js app:
   ```bash
   npm run dev
   ```

3. Trigger matching (set `USE_INNGEST_FOR_MATCHING=true` in `.env.local`)

4. View runs at http://127.0.0.1:8288/functions

### Production

1. Deploy to Vercel (Inngest integration auto-detects)
2. Set `USE_INNGEST_FOR_MATCHING=true` in Vercel environment variables
3. View runs in Inngest dashboard

## Troubleshooting

### Matches Not Saving

- Check Inngest function logs in dashboard
- Verify database connection in Inngest function
- Check `matches` table for saved records

### Timeout Still Occurring

- Ensure `USE_INNGEST_FOR_MATCHING=true` is set
- Check that Inngest DevServer is running (local)
- Verify Inngest is connected (production)

### Duplicate Matches

- This is expected - both sync and Inngest save matches
- Database upsert prevents duplicates (conflict on `user_email,job_hash`)

## References

- [Inngest Docs](https://www.inngest.com/docs)
- [Inngest Next.js Integration](https://www.inngest.com/docs/quick-start/nextjs)
- [Durable Workflows](https://www.inngest.com/docs/concepts/durable-workflows)

