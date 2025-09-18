/**
 * Sentry Server Configuration
 * 
 * This file configures Sentry for server-side error tracking in Next.js.
 * It's automatically loaded by the Sentry Next.js plugin.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || '1.0.0',
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Enhanced error filtering for server-side
  beforeSend(event, hint) {
    const error = hint.originalException;
    
    if (error instanceof Error) {
      // Filter out expected business errors that are handled
      const expectedErrors = [
        'Rate limit exceeded',
        'Validation error',
        'Authentication required',
        'Resource not found',
        'Insufficient permissions',
      ];
      
      if (expectedErrors.some(expected => error.message.includes(expected))) {
        // Still log to console but don't send to Sentry
        console.warn('Expected error handled:', error.message);
        return null;
      }
      
      // Filter out Next.js build-time errors
      if (error.message.includes('NEXT_') ||
          error.message.includes('webpack') ||
          error.stack?.includes('webpack')) {
        return null;
      }
      
      // Filter out database connection timeouts in development
      if (process.env.NODE_ENV === 'development' &&
          (error.message.includes('connection timeout') ||
           error.message.includes('ECONNREFUSED'))) {
        return null;
      }
    }
    
    return event;
  },
  
  // Leave transactions unchanged (SDK typing for TransactionEvent is limited)
  beforeSendTransaction(transaction) {
    return transaction;
  },
  
  // Use default integrations provided by @sentry/nextjs
  
  // Breadcrumb configuration
  beforeBreadcrumb(breadcrumb) {
    // Filter out noisy HTTP breadcrumbs
    if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
      // Skip health checks and static assets
      if (breadcrumb.data.url.includes('/api/health') ||
          breadcrumb.data.url.includes('/_next/') ||
          breadcrumb.data.url.includes('/favicon')) {
        return null;
      }
      
      // Sanitize sensitive data from URLs
      if (breadcrumb.data.url.includes('token=') ||
          breadcrumb.data.url.includes('key=') ||
          breadcrumb.data.url.includes('password=')) {
        breadcrumb.data.url = breadcrumb.data.url.replace(
          /([&?])(token|key|password|secret)=[^&]*/gi,
          '$1$2=***'
        );
      }
    }
    
    // Filter out console breadcrumbs in production
    if (process.env.NODE_ENV === 'production' && 
        breadcrumb.category === 'console' &&
        breadcrumb.level !== 'error') {
      return null;
    }
    
    return breadcrumb;
  },
  
  // Additional configuration
  maxBreadcrumbs: 100,
  attachStacktrace: true,
  // Rely on defaults for unhandled rejections and uncaught exceptions
  
  // Use default request data behavior
  
  // Additional tags for server context
  initialScope: {
    tags: {
      component: 'backend',
      runtime: 'nodejs',
    },
  },
});

// Export Sentry for use in other modules
export { Sentry };
