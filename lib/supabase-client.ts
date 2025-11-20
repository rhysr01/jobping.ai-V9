/**
 * Supabase Client Configuration
 * Handles both server-side and client-side Supabase connections
 * Fixes "Failed to fetch" errors by ensuring proper URL configuration
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side client (uses service role key)
export function getServerSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration for server-side client');
  }

  // Validate URL format
  if (!supabaseUrl.includes('.supabase.co')) {
    throw new Error(`Invalid Supabase URL format: ${supabaseUrl}. Expected format: https://[project-ref].supabase.co`);
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'jobping-server'
      }
    }
  });
}

// Client-side client (uses anon key)
export function getClientSupabaseClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    // Server-side: use service role key
    return getServerSupabaseClient();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseAnonKey) {
    console.warn('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY - some features may not work');
  }

  // Validate URL format
  if (!supabaseUrl.includes('.supabase.co')) {
    throw new Error(`Invalid Supabase URL format: ${supabaseUrl}. Expected format: https://[project-ref].supabase.co`);
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey || '', {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'jobping-client'
      }
    }
  });
}

// Default export for convenience
export const supabase = typeof window === 'undefined' 
  ? getServerSupabaseClient() 
  : getClientSupabaseClient();


