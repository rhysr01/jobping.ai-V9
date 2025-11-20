# Troubleshooting "Failed to fetch (api.supabase.com)" Error

## Issue
Error: `Failed to fetch (api.supabase.com)`

## Root Causes

1. **Missing Client-Side Environment Variable**
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is not set
   - Client-side code needs the anon key, not the service role key

2. **CORS Configuration**
   - Supabase project may have CORS restrictions
   - Browser blocking cross-origin requests

3. **Network/Firewall Issues**
   - Corporate firewall blocking Supabase
   - DNS resolution issues

4. **Incorrect URL Format**
   - Using `api.supabase.com` instead of `[project-ref].supabase.co`

## Solutions

### 1. Add Client-Side Environment Variable

Add to `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Get your anon key from:
- Supabase Dashboard → Project Settings → API → `anon` `public` key

### 2. Verify Environment Variables

Run the diagnostic script:
```bash
npx tsx scripts/test-supabase-connection.ts
```

### 3. Check Supabase CORS Settings

In Supabase Dashboard:
1. Go to Project Settings → API
2. Check "CORS" settings
3. Ensure your domain is allowed (or use `*` for development)

### 4. Verify URL Format

Your Supabase URL should be:
```
https://[project-ref].supabase.co
```

NOT:
```
https://api.supabase.com
```

### 5. Check Browser Console

Open browser DevTools → Console:
- Look for CORS errors
- Check Network tab for failed requests
- Verify the URL being called

### 6. Test Connection

```bash
# Test server-side connection
npx tsx scripts/test-supabase-connection.ts

# Test from browser console
fetch('https://[your-project].supabase.co/rest/v1/', {
  headers: {
    'apikey': 'your-anon-key',
    'Authorization': 'Bearer your-anon-key'
  }
})
```

## Quick Fix Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set in `.env.local`
- [ ] URL format is correct: `https://[project-ref].supabase.co`
- [ ] Environment variables are loaded (restart dev server)
- [ ] CORS is configured in Supabase dashboard
- [ ] No firewall blocking Supabase domains
- [ ] Browser console shows no CORS errors

## Common Errors

### "Missing Supabase configuration"
- **Fix**: Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`

### "CORS policy: No 'Access-Control-Allow-Origin' header"
- **Fix**: Configure CORS in Supabase Dashboard → Project Settings → API

### "Network request failed"
- **Fix**: Check network connectivity, firewall settings, DNS resolution

## Still Having Issues?

1. Check Supabase status: https://status.supabase.com
2. Review Supabase logs: Dashboard → Logs
3. Test with curl:
   ```bash
   curl -H "apikey: YOUR_ANON_KEY" \
        -H "Authorization: Bearer YOUR_ANON_KEY" \
        https://[project-ref].supabase.co/rest/v1/
   ```


