/**
 * Sentry Utils - No-op Implementation
 * 
 * Since Sentry has been removed, these are no-op functions that maintain
 * API compatibility without actually sending data to Sentry.
 */

/**
 * Capture an exception (no-op)
 */
export function captureException(error: Error | unknown, context?: Record<string, any>): void {
  // No-op: Sentry removed
  if (process.env.NODE_ENV === 'development') {
    console.debug('[Sentry no-op] captureException:', error, context);
  }
}

/**
 * Add a breadcrumb (no-op)
 * Supports both object and string signatures
 */
export function addBreadcrumb(
  messageOrOptions: string | { message: string; level?: string; data?: Record<string, any> },
  data?: Record<string, any>
): void {
  // No-op: Sentry removed
  if (process.env.NODE_ENV === 'development') {
    if (typeof messageOrOptions === 'string') {
      console.debug('[Sentry no-op] addBreadcrumb:', messageOrOptions, data);
    } else {
      console.debug('[Sentry no-op] addBreadcrumb:', messageOrOptions);
    }
  }
}

/**
 * Set context (no-op)
 */
export function setContext(key: string, context: Record<string, any>): void {
  // No-op: Sentry removed
  if (process.env.NODE_ENV === 'development') {
    console.debug('[Sentry no-op] setContext:', key, context);
  }
}

/**
 * Capture a message (no-op)
 */
export function captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void {
  // No-op: Sentry removed
  if (process.env.NODE_ENV === 'development') {
    console.debug('[Sentry no-op] captureMessage:', message, level);
  }
}

/**
 * Set a tag (no-op)
 */
export function setTag(key: string, value: string | number | boolean): void {
  // No-op: Sentry removed
  if (process.env.NODE_ENV === 'development') {
    console.debug('[Sentry no-op] setTag:', key, value);
  }
}

