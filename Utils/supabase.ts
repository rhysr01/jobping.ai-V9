/**
 * Centralized Supabase Client Management
 * Professional pattern for consistent database access across the application
 * Enhanced with retry logic and timeout handling
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

  // Validate environment variables (try multiple var names for compatibility)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                      process.env.SUPABASE_KEY || 
                      process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(' Supabase env vars missing:', {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_KEY: !!process.env.SUPABASE_KEY,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY
    });
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

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                      process.env.SUPABASE_KEY || 
                      process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(' Supabase env vars missing in createSupabaseClient');
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

// ============================================
// ENHANCED DATABASE OPERATIONS
// ============================================

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000
};

/**
 * Executes a database operation with retry logic and timeout
 */
export async function executeWithRetry<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<DatabaseResponse<T>> {
  const { maxRetries, retryDelay, timeout } = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database operation timeout')), timeout);
      });

      // Race between operation and timeout
      const result = await Promise.race([operation(), timeoutPromise]);
      
      if (result.error) {
        lastError = result.error;
        
        // Don't retry on certain errors
        if (isNonRetryableError(result.error)) {
          break;
        }
        
        if (attempt < maxRetries) {
          await delay(retryDelay * attempt);
          continue;
        }
      }

      return wrapDatabaseResponse(result);
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        await delay(retryDelay * attempt);
      }
    }
  }

  return {
    data: null,
    error: lastError instanceof Error ? lastError : new Error(String(lastError)),
    success: false
  };
}

/**
 * Checks if an error should not be retried
 */
function isNonRetryableError(error: any): boolean {
  if (!error) return false;
  
  const errorCode = error.code || error.status;
  const nonRetryableCodes = ['PGRST116', 'PGRST301', '23505']; // Not found, unauthorized, unique violation
  
  return nonRetryableCodes.includes(errorCode);
}

/**
 * Simple delay utility
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Health check for database connectivity
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; message: string }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      return { healthy: false, message: 'Database connection failed' };
    }
    
    return { healthy: true, message: 'Database connection OK' };
  } catch (error) {
    return { 
      healthy: false, 
      message: error instanceof Error ? error.message : 'Unknown database error' 
    };
  }
}
