/**
 * Sentry Health Check Utility
 * 
 * Provides functions to check if Sentry is configured and working
 */

export interface SentryHealthStatus {
  configured: boolean;
  serverSide: boolean;
  clientSide: boolean;
  environment: string;
  release: string;
}

/**
 * Check if Sentry is configured
 */
export function isSentryConfigured(): boolean {
  return !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
}

/**
 * Get detailed Sentry health status
 */
export function getSentryHealthStatus(): SentryHealthStatus {
  const serverDsn = !!process.env.SENTRY_DSN;
  const clientDsn = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
  
  return {
    configured: serverDsn || clientDsn,
    serverSide: serverDsn,
    clientSide: clientDsn,
    environment: process.env.NODE_ENV || 'unknown',
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || '1.0.0',
  };
}

/**
 * Verify Sentry is working by attempting to send a test event
 * This should be called sparingly (e.g., health checks)
 */
export async function verifySentryWorking(): Promise<{
  working: boolean;
  error?: string;
}> {
  if (!isSentryConfigured()) {
    return {
      working: false,
      error: 'Sentry DSN not configured'
    };
  }

  try {
    // Try to require Sentry to avoid TypeScript errors with dynamic import
    let Sentry: any;
    try {
      Sentry = require('@sentry/nextjs');
    } catch {
      return {
        working: false,
        error: 'Sentry package is not installed'
      };
    }
    
    if (!Sentry) {
      return {
        working: false,
        error: 'Sentry package is not installed'
      };
    }
    
    // Try to capture a silent test message
    Sentry.captureMessage('Sentry health check', 'debug');
    
    return {
      working: true
    };
  } catch (error) {
    return {
      working: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

