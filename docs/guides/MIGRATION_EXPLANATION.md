# Why Migrations Don't Show in MCP

## The Problem

The SQL files I created (`fix_all_data_quality_issues.sql`, etc.) are **just SQL scripts**, not tracked Supabase migrations. That's why MCP shows no migrations - they're not in the Supabase migration tracking system.

## Two Types of "Migrations"

### 1. SQL Scripts (What I Created Initially)

- Location: `migrations/` folder
- Status: Just SQL files, not tracked
- Usage: Run manually in Supabase SQL Editor
- Tracking: ❌ Not tracked by Supabase

### 2. Supabase Migrations (What We Need)

- Location: `supabase/migrations/` folder
- Status: Tracked by Supabase CLI/dashboard
- Usage: Applied via `supabase migration up` or dashboard
- Tracking: ✅ Tracked in `supabase_migrations.schema_migrations` table

## What I Just Did

I've now created **proper Supabase migrations** with timestamps:

```
supabase/migrations/
  ├── 20251229174525_fix_all_data_quality_issues.sql
  └── 20251229174525_fix_remaining_location_issues.sql
```

## How to Apply Them

### Option 1: Via Supabase CLI (Recommended)

```bash
cd /Users/rhysrowlands/jobping
supabase migration up
```

### Option 2: Via Supabase Dashboard

1. Go to Supabase Dashboard → Database → Migrations
2. The new migrations should appear
3. Click "Apply" on each one

### Option 3: Manual SQL (What You Already Did)

- You already ran `fix_all_data_quality_issues.sql` manually
- That's why company_name is fixed!
- But it's not tracked as a "migration"

## Why MCP Shows No Migrations

MCP checks the `supabase_migrations.schema_migrations` table, which only tracks migrations applied via:

- Supabase CLI (`supabase migration up`)
- Supabase Dashboard migrations UI
- NOT manual SQL execution

## Current Status

✅ **Data is fixed** - You ran the SQL manually, so company_name is fixed  
❌ **Not tracked** - It's not in the migrations table because it was run manually  
✅ **Proper migrations created** - Now in `supabase/migrations/` with timestamps

## Next Steps

1. **If you want it tracked**: Apply via Supabase CLI or dashboard
2. **If you don't care about tracking**: Keep using manual SQL (it works!)
3. **For future migrations**: Use `supabase/migrations/` folder with timestamps

## Note

Since you already ran the SQL manually, applying the migration again will:

- ✅ Be tracked in migrations table
- ⚠️ May try to update rows that are already fixed (but SQL has WHERE clauses, so it's safe)

The migration SQL has proper WHERE clauses, so running it again is safe (it only updates rows that still need fixing).
