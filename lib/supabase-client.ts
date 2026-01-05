/**
 * Supabase Client Configuration
 *
 * @deprecated For server-side usage, use getDatabaseClient() from '@/Utils/databasePool' instead.
 *
 * This module is kept for client-side Supabase connections only.
 * Server-side functions now delegate to the canonical databasePool implementation.
 *
 * Migration guide:
 * - Server-side: Replace getServerSupabaseClient() with getDatabaseClient() from '@/Utils/databasePool'
 * - Client-side: Keep using getClientSupabaseClient() or create a dedicated client-side module
 */

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { getDatabaseClient } from "@/Utils/databasePool";

// Server-side client (uses service role key)
/**
 * @deprecated Use getDatabaseClient() from '@/Utils/databasePool' instead.
 * This function now delegates to databasePool for consistency.
 * Will be removed in v2.0.0
 */
export function getServerSupabaseClient(): SupabaseClient {
  // Show deprecation warning in development
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NODE_ENV !== "test"
  ) {
    const stack = new Error().stack;
    const caller = stack?.split("\n")[2]?.trim() || "unknown";
    console.warn(
      `[DEPRECATED] getServerSupabaseClient() is deprecated. ` +
        `Use getDatabaseClient() from '@/Utils/databasePool' instead.\n` +
        `Called from: ${caller}`,
    );
  }

  // Delegate to the canonical implementation
  return getDatabaseClient();
}

// Client-side client (uses anon key)
/**
 * Client-side Supabase client for browser usage.
 *
 * Note: For server-side usage, use getDatabaseClient() from '@/Utils/databasePool' instead.
 */
export function getClientSupabaseClient(): SupabaseClient {
  if (typeof window === "undefined") {
    // Server-side: delegate to databasePool
    return getServerSupabaseClient();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseAnonKey) {
    console.warn(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY - some features may not work",
    );
  }

  // Validate URL format
  if (!supabaseUrl.includes(".supabase.co")) {
    throw new Error(
      `Invalid Supabase URL format: ${supabaseUrl}. Expected format: https://[project-ref].supabase.co`,
    );
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey || "", {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
    db: {
      schema: "public",
    },
    global: {
      headers: {
        "X-Client-Info": "jobping-client",
      },
    },
  });
}

// Default export for convenience
// Note: This will use getServerSupabaseClient() on server-side, which now delegates to databasePool
export const supabase =
  typeof window === "undefined"
    ? getServerSupabaseClient()
    : getClientSupabaseClient();
