/**
 * Centralized Supabase Client Management
 * 
 * @deprecated This module is deprecated. Use getDatabaseClient() from '@/Utils/databasePool' instead.
 * 
 * This module now delegates to the canonical databasePool implementation for consistency.
 * The utility functions (wrapDatabaseResponse, executeWithRetry, etc.) are still available.
 * 
 * Migration guide:
 * - Replace: import { getSupabaseClient } from '@/Utils/supabase'
 * - With: import { getDatabaseClient } from '@/Utils/databasePool'
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getDatabaseClient } from './databasePool';

// Singleton pattern for server-side Supabase client
let _supabaseClient: SupabaseClient | null = null;

/**
 * Gets a server-side Supabase client with proper error handling
 * Uses singleton pattern to avoid multiple client creation
 * 
 * @deprecated Use getDatabaseClient() from '@/Utils/databasePool' instead.
 * This function now delegates to databasePool for consistency.
 * Will be removed in v2.0.0
 */
export function getSupabaseClient(): SupabaseClient {
  // Show deprecation warning in development
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    const stack = new Error().stack;
    const caller = stack?.split('\n')[2]?.trim() || 'unknown';
    console.warn(
      `[DEPRECATED] getSupabaseClient() is deprecated. ` +
      `Use getDatabaseClient() from '@/Utils/databasePool' instead.\n` +
      `Called from: ${caller}`
    );
  }
  
  // Delegate to the canonical implementation
  return getDatabaseClient();
}

/**
 * Creates a new Supabase client (for special cases where singleton isn't appropriate)
 * 
 * @deprecated Use getDatabaseClient() from '@/Utils/databasePool' instead.
 * The databasePool uses a singleton pattern which is recommended for all use cases.
 * Will be removed in v2.0.0
 */
export function createSupabaseClient(): SupabaseClient {
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    const stack = new Error().stack;
    const caller = stack?.split('\n')[2]?.trim() || 'unknown';
    console.warn(
      `[DEPRECATED] createSupabaseClient() is deprecated. ` +
      `Use getDatabaseClient() from '@/Utils/databasePool' instead.\n` +
      `Called from: ${caller}`
    );
  }
  
  // Delegate to the canonical implementation (singleton is fine for all cases)
  return getDatabaseClient();
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
    // Use the canonical implementation
    const supabase = getDatabaseClient();
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
