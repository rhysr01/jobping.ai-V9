import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';

/**
 * Diagnostic endpoint to check Supabase key configuration
 * This helps debug RLS issues by showing what keys are actually configured
 */
export async function GET(req: NextRequest) {
  // Only allow in development or with admin key
  const adminKey = req.headers.get('x-admin-key');
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev && adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const keysMatch = serviceRoleKey && anonKey && serviceRoleKey === anonKey;
  
  // Test if the client can actually insert
  let insertTest = { success: false, error: null as any };
  try {
    const supabase = getDatabaseClient();
    const testEmail = `test-debug-${Date.now()}@example.com`;
    const { error } = await supabase
      .from('users')
      .insert([{
        email: testEmail,
        full_name: 'Debug Test User',
        target_cities: ['London'],
        subscription_tier: 'free',
        email_verified: false,
        subscription_active: false,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      insertTest.error = {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      };
    } else {
      insertTest.success = true;
      // Clean up test user
      await supabase.from('users').delete().eq('email', testEmail);
    }
  } catch (err) {
    insertTest.error = {
      message: err instanceof Error ? err.message : String(err),
    };
  }

  // Expected service role key prefix (from user's key)
  const expectedPrefix = 'eyJhbGciOiJIUzI1NiIs';
  const keyMatchesExpected = serviceRoleKey?.startsWith(expectedPrefix) || false;
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabase: {
      url: supabaseUrl ? '✅ Set' : '❌ Missing',
      urlLength: supabaseUrl?.length || 0,
    },
    serviceRoleKey: {
      present: !!serviceRoleKey,
      length: serviceRoleKey?.length || 0,
      prefix: serviceRoleKey ? serviceRoleKey.substring(0, 20) + '...' : 'N/A',
      expectedPrefix: expectedPrefix + '...',
      matchesExpected: keyMatchesExpected,
      startsWithJWT: serviceRoleKey?.startsWith('eyJ') || false,
      hasCorrectLength: serviceRoleKey ? serviceRoleKey.length >= 200 : false,
    },
    anonKey: {
      present: !!anonKey,
      length: anonKey?.length || 0,
      prefix: anonKey ? anonKey.substring(0, 20) + '...' : 'N/A',
      startsWithJWT: anonKey?.startsWith('eyJ') || false,
    },
    comparison: {
      keysMatch: keysMatch,
      bothPresent: !!serviceRoleKey && !!anonKey,
      bothJWT: serviceRoleKey?.startsWith('eyJ') && anonKey?.startsWith('eyJ'),
      criticalIssue: keysMatch ? 'CRITICAL: Keys are identical! Service role key must be different from anon key.' : null,
    },
    insertTest,
    recommendations: keysMatch
      ? [
          '1. Go to Supabase Dashboard → Settings → API',
          '2. Find the "service_role" key (NOT "anon public")',
          '3. Copy the full service_role key',
          '4. Update SUPABASE_SERVICE_ROLE_KEY in Vercel with the service_role key',
          '5. Redeploy or wait for auto-redeploy',
        ]
      : insertTest.success
      ? ['✅ Configuration looks correct!']
      : [
          '1. Verify SUPABASE_SERVICE_ROLE_KEY is the service_role key (not anon key)',
          '2. Check that RLS policies allow service_role to insert',
          '3. Verify the key hasn\'t been rotated in Supabase',
        ],
  });
}

