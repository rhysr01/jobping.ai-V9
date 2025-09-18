/**
 * Centralized Supabase Client Management
 * Professional pattern for consistent database access across the application
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton pattern for server-side Supabase client
let _supabaseClient: SupabaseClient | null = null;

/**
 * Gets a server-side Supabase client with proper error handling
 * Uses singleton pattern to avoid multiple client creation
 */
export function getSupabaseClient(): SupabaseClient {
  // Return existing client if available
  if (_supabaseClient) {
    return _supabaseClient;
  }

  // Prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error('Supabase client should only be used server-side');
  }

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  // Create and cache client
  _supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return _supabaseClient;
}

/**
 * Creates a new Supabase client (for special cases where singleton isn't appropriate)
 */
export function createSupabaseClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase client should only be used server-side');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Type-safe database response wrapper
 */
export interface DatabaseResponse<T> {
  data: T | null;
  error: Error | null;
  success: boolean;
}

/**
 * Wraps Supabase responses in a consistent format
 */
export function wrapDatabaseResponse<T>(
  response: { data: T | null; error: any }
): DatabaseResponse<T> {
  return {
    data: response.data,
    error: response.error ? new Error(response.error.message || 'Database error') : null,
    success: !response.error && response.data !== null,
  };
}
