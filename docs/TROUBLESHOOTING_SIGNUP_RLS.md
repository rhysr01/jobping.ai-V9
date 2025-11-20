# Troubleshooting Signup RLS Error

## Error
```
"new row violates row-level security policy for table \"users\""
```

## Root Cause
The signup API route uses `getDatabaseClient()` which should use `SUPABASE_SERVICE_ROLE_KEY`. The service role key should bypass RLS, but if it's not configured correctly, RLS will block the insert.

## Quick Fix

### 1. Verify Environment Variable in Production
Check that `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify `SUPABASE_SERVICE_ROLE_KEY` exists and is the **service role key** (not the anon key)
3. Service role keys are typically ~200+ characters long and start with `eyJ...`

### 2. Apply Migration
Run the migration to ensure RLS policies are correct:

```sql
-- Apply migrations/fix_signup_rls_service_role.sql
-- Or run this SQL in Supabase Dashboard:

BEGIN;

DROP POLICY IF EXISTS users_insert_service_role ON public.users;

CREATE POLICY users_insert_service_role
ON public.users
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS users_insert_consolidated ON public.users;

CREATE POLICY users_insert_consolidated
ON public.users
FOR INSERT
TO anon, public
WITH CHECK (true);

COMMIT;
```

### 3. Verify Service Role Key
The service role key should:
- Be ~200+ characters long
- Start with `eyJ` (JWT format)
- Be different from the anon key
- Have full database access

You can find it in Supabase Dashboard → Settings → API → Service Role Key

### 4. Test Locally
Run the diagnostic script:
```bash
npx tsx scripts/diagnose-signup-rls.ts
```

This will:
- Check environment variables
- Verify service role key format
- Test connection
- Check RLS policies
- Test insert permissions

## Common Issues

### Issue: Service Role Key Not Set in Production
**Symptom**: Error 42501 (RLS violation)  
**Fix**: Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel environment variables

### Issue: Wrong Key Type
**Symptom**: Error 42501 (RLS violation)  
**Fix**: Make sure you're using the **service role key**, not the anon key. They're different!

### Issue: Migration Not Applied
**Symptom**: Error 42501 (RLS violation)  
**Fix**: Apply `migrations/fix_signup_rls_service_role.sql` in Supabase Dashboard

### Issue: Client Not Using Service Role Key
**Symptom**: Error 42501 (RLS violation)  
**Fix**: Verify `Utils/databasePool.ts` is using `process.env.SUPABASE_SERVICE_ROLE_KEY`

## Verification

After applying fixes, test signup:
1. Try signing up with a test email
2. Check logs for RLS errors
3. Verify user was created in database

## Related Files
- `app/api/signup/route.ts` - Signup endpoint
- `Utils/databasePool.ts` - Database client (uses service role key)
- `migrations/fix_signup_rls_service_role.sql` - Migration to fix RLS
- `scripts/diagnose-signup-rls.ts` - Diagnostic script

