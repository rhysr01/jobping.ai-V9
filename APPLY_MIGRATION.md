# How to Apply the pending_digests Migration

## Option 1: Using Supabase CLI (Recommended)

If you have Supabase CLI installed:

```bash
# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push
```

Or apply the specific migration file:

```bash
supabase migration up --file supabase/migrations/20260121_create_pending_digests_table.sql
```

---

## Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20260121_create_pending_digests_table.sql`
4. Paste into the SQL Editor
5. Click **Run**

---

## Option 3: Using Supabase MCP (If Available)

If you have write access enabled:

```bash
# The migration file is ready at:
supabase/migrations/20260121_create_pending_digests_table.sql
```

---

## Verify Migration Applied

After applying, verify the table exists:

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'pending_digests'
);
-- Should return: true
```

Or check table structure:

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'pending_digests'
ORDER BY ordinal_position;
```

---

## Quick Check Commands

```bash
# Check if Supabase CLI is installed
which supabase

# If installed, check version
supabase --version

# List migrations
supabase migration list
```

---

## Migration File Location

The migration file is located at:
```
supabase/migrations/20260121_create_pending_digests_table.sql
```

This migration creates:
- ✅ `pending_digests` table with proper schema
- ✅ Indexes for performance
- ✅ RLS policies (service role only)
- ✅ Constraints and validation

---

## After Migration

Once applied, the digest processing endpoint (`/api/cron/process-digests`) will work correctly and no longer return 404 errors.
