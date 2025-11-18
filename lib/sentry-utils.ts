/**
 * Sentry Utilities - Safe wrapper for optional Sentry usage
 * 
 * This module provides safe wrappers for Sentry functions that gracefully
 * handle cases where Sentry is not installed or configured.
 */

// Try to import Sentry, but don't fail if it's not available
// Using any type to avoid TypeScript errors when package is not installed
let Sentry: any;
try {
  Sentry = require('@sentry/nextjs');
} catch {
  // Sentry not installed - that's okay
  Sentry = undefined;
}

/**
 * Check if Sentry is available
 */
export function isSentryAvailable(): boolean {
  return Sentry !== undefined;
}

/**
 * Safe wrapper for Sentry.captureException
 */
export function captureException(error: Error | unknown, context?: Record<string, any>): void {
  if (!Sentry) return;
  
  // Ensure error is an Error instance
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  if (context) {
    Sentry.withScope((scope: any) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureException(errorObj);
    });
  } else {
    Sentry.captureException(errorObj);
  }
}

/**
 * Safe wrapper for Sentry.captureMessage
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (!Sentry) return;
  Sentry.captureMessage(message, level);
}

/**
 * Safe wrapper for Sentry.addBreadcrumb
 */
export function addBreadcrumb(breadcrumb: {
  message?: string;
  category?: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}): void {
  if (!Sentry) return;
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Safe wrapper for Sentry.setUser
 */
export function setUser(user: { id?: string; email?: string; username?: string }): void {
  if (!Sentry) return;
  Sentry.setUser(user);
}

/**
 * Safe wrapper for Sentry.setContext
 */
export function setContext(key: string, context: Record<string, any>): void {
  if (!Sentry) return;
  Sentry.setContext(key, context);
}

/**
 * Safe wrapper for Sentry.setTag
 */
export function setTag(key: string, value: string): void {
  if (!Sentry) return;
  Sentry.setTag(key, value);
}

/**
 * Safe wrapper for Sentry.withScope
 */
export function withScope(callback: (scope: any) => void): void {
  if (!Sentry) return;
  Sentry.withScope(callback as any);
}

