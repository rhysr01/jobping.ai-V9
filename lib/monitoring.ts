/**
 * Comprehensive Monitoring and Error Tracking System
 * 
 * This module provides centralized error tracking, performance monitoring,
 * and structured logging for the JobPing application.
 * 
 * Features:
 * - Centralized Sentry configuration and initialization
 * - Structured logging with multiple output formats
 * - Performance monitoring and metrics collection
 * - Business metrics tracking for key operations
 * - Context-aware error reporting
 * - Development vs production logging strategies
 */

import * as Sentry from '@sentry/nextjs';

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Configuration
const MONITORING_CONFIG = {
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || '1.0.0',
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    profilesSampleRate: isProduction ? 0.1 : 1.0,
    enableTracing: true,
    debug: isDevelopment,
  },
  logging: {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    structured: process.env.STRUCTURED_LOGS !== 'false',
    console: !isTest,
  },
};

// Initialize Sentry with comprehensive configuration
let sentryInitialized = false;

export function initializeMonitoring(): void {
  if (sentryInitialized || isTest) return;

  if (MONITORING_CONFIG.sentry.dsn) {
    Sentry.init({
      dsn: MONITORING_CONFIG.sentry.dsn,
      environment: MONITORING_CONFIG.sentry.environment,
      release: MONITORING_CONFIG.sentry.release,
      tracesSampleRate: MONITORING_CONFIG.sentry.tracesSampleRate,
      profilesSampleRate: MONITORING_CONFIG.sentry.profilesSampleRate,
      debug: MONITORING_CONFIG.sentry.debug,

      // Enhanced error filtering
      beforeSend(event, hint) {
        // Filter out noisy errors in development
        if (isDevelopment) {
          const error = hint.originalException;
          if (error instanceof Error) {
            // Skip Next.js development errors
            if (error.message.includes('NEXT_') || 
                error.message.includes('webpack') ||
                error.message.includes('HMR')) {
              return null;
            }
          }
        }

        // Filter out expected errors that shouldn't be reported
        const expectedErrors = [
          'Rate limit exceeded',
          'Unauthorized',
          'Validation error',
          'Not found',
        ];

        if (event.exception?.values?.[0]?.value) {
          const errorMessage = event.exception.values[0].value;
          if (expectedErrors.some(expected => errorMessage.includes(expected))) {
            return null;
          }
        }

        return event;
      },

      // Optional transaction filtering or tagging
      beforeSendTransaction(transaction) {
        return transaction;
      },

      // Use default integrations provided by @sentry/nextjs

      // Additional configuration
      maxBreadcrumbs: 50,
      attachStacktrace: true,

      // Tags for better organization
      initialScope: {
        tags: {
          component: 'backend',
          version: MONITORING_CONFIG.sentry.release,
        },
      },
    });

    sentryInitialized = true;
    logger.info('Sentry monitoring initialized', {
      metadata: {
        environment: MONITORING_CONFIG.sentry.environment,
        release: MONITORING_CONFIG.sentry.release,
      }
    });
  } else {
    logger.warn('Sentry DSN not configured - error tracking disabled');
  }
}

// Enhanced logging system
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  operation?: string;
  component?: string;
  duration?: number;
  action?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
  error?: Error;
  [key: string]: any; // Allow additional properties
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  environment: string;
  service: string;
}

class Logger {
  private serviceName = 'jobping';

  private shouldLog(level: LogLevel): boolean {
    if (isTest && level !== LogLevel.ERROR && level !== LogLevel.CRITICAL) {
      return false;
    }

    const configLevel = MONITORING_CONFIG.logging.level;
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.CRITICAL];
    const currentLevelIndex = levels.indexOf(level);
    const configLevelIndex = levels.indexOf(configLevel as LogLevel);
    
    return currentLevelIndex >= configLevelIndex;
  }

  private formatLog(level: LogLevel, message: string, context: LogContext = {}): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      context,
      environment: MONITORING_CONFIG.sentry.environment,
      service: this.serviceName,
    };

    if (MONITORING_CONFIG.logging.structured) {
      // Structured JSON logging for production
      if (MONITORING_CONFIG.logging.console) {
        console.log(JSON.stringify(logEntry));
      }
    } else {
      // Human-readable logging for development
      const emoji = {
        [LogLevel.DEBUG]: '🐛',
        [LogLevel.INFO]: 'ℹ️',
        [LogLevel.WARN]: '⚠️',
        [LogLevel.ERROR]: '❌',
        [LogLevel.CRITICAL]: '🚨',
      }[level];

      const contextStr = Object.keys(context).length > 0 
        ? ` ${JSON.stringify(context)}`
        : '';

      if (MONITORING_CONFIG.logging.console) {
        console.log(`[${timestamp}] ${emoji} ${level.toUpperCase()}: ${message}${contextStr}`);
      }
    }

    // Send critical errors to Sentry
    if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
      this.reportError(message, context);
    }
  }

  private reportError(message: string, context: LogContext): void {
    if (!sentryInitialized || isTest) return;

    Sentry.withScope((scope) => {
      // Set user context
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }

      // Set operation context
      if (context.operation) {
        scope.setTag('operation', context.operation);
      }

      if (context.component) {
        scope.setTag('component', context.component);
      }

      if (context.requestId) {
        scope.setTag('requestId', context.requestId);
      }

      // Set additional context
      if (context.metadata) {
        scope.setContext('metadata', context.metadata);
      }

      if (context.duration) {
        scope.setTag('duration', context.duration.toString());
      }

      // Capture the error
      if (context.error) {
        Sentry.captureException(context.error);
      } else {
        Sentry.captureMessage(message, 'error');
      }
    });
  }

  debug(message: string, context: LogContext = {}): void {
    this.formatLog(LogLevel.DEBUG, message, context);
  }

  info(message: string, context: LogContext = {}): void {
    this.formatLog(LogLevel.INFO, message, context);
  }

  warn(message: string, context: LogContext = {}): void {
    this.formatLog(LogLevel.WARN, message, context);
  }

  error(message: string, context: LogContext = {}): void {
    this.formatLog(LogLevel.ERROR, message, context);
  }

  critical(message: string, context: LogContext = {}): void {
    this.formatLog(LogLevel.CRITICAL, message, context);
  }

  // Business metrics logging
  metric(metricName: string, value: number, unit: string = 'count', context: LogContext = {}): void {
    this.info(`METRIC: ${metricName}`, {
      ...context,
      metadata: {
        ...context.metadata,
        metric: {
          name: metricName,
          value,
          unit,
        },
      },
    });

    // Optional: forward as breadcrumb instead of metrics (metrics API not available in nextjs SDK)
    if (sentryInitialized) {
      Sentry.addBreadcrumb({
        category: 'metric',
        message: metricName,
        level: 'info',
        data: { value, unit, component: context.component, operation: context.operation },
      });
    }
  }

  // Performance timing
  timer(operation: string, context: LogContext = {}) {
    const startTime = Date.now();
    
    return {
      end: (additionalContext: LogContext = {}) => {
        const duration = Date.now() - startTime;
        this.info(`TIMING: ${operation}`, {
          ...context,
          ...additionalContext,
          duration,
          metadata: {
            ...context.metadata,
            ...additionalContext.metadata,
            timing: {
              operation,
              duration,
              startTime,
              endTime: Date.now(),
            },
          },
        });

        // Optional: record timing as breadcrumb
        if (sentryInitialized) {
          Sentry.addBreadcrumb({
            category: 'timing',
            message: operation,
            level: 'info',
            data: { durationMs: duration },
          });
        }

        return duration;
      },
    };
  }
}

// Export singleton logger instance
export const logger = new Logger();

/**
 * USER ACTION TRACKING - Simple helper for debugging user flows
 * Usage: logUserAction('signup', { email: user.email, tier: 'free' })
 */
export function logUserAction(
  action: string,
  metadata?: Record<string, any>
): void {
  logger.info(`USER_ACTION: ${action}`, {
    action,
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);

    // Log significant metrics
    if (name.includes('error') || name.includes('failure')) {
      logger.warn(`Performance metric: ${name} = ${value}`);
    }
  }

  getMetricStats(name: string): { count: number; avg: number; min: number; max: number } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    return {
      count: values.length,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [name, values] of this.metrics.entries()) {
      result[name] = this.getMetricStats(name);
    }
    return result;
  }

  reset(): void {
    this.metrics.clear();
  }
}

// Business metrics tracking
export class BusinessMetrics {
  static recordJobCleanup(deleted: number, total: number, duration: number): void {
    logger.metric('jobs.cleanup.deleted', deleted, 'count', {
      operation: 'job-cleanup',
      component: 'database',
      duration,
      metadata: { total, deletionPercentage: (deleted / total) * 100 },
    });
  }

  static recordUserMatching(users: number, jobsMatched: number, duration: number): void {
    logger.metric('users.matched', users, 'count', {
      operation: 'user-matching',
      component: 'ai-service',
      duration,
      metadata: { jobsMatched, avgJobsPerUser: jobsMatched / users },
    });
  }

  static recordEmailSent(emails: number, success: number, duration: number): void {
    logger.metric('emails.sent', emails, 'count', {
      operation: 'email-sending',
      component: 'email-service',
      duration,
      metadata: { success, successRate: (success / emails) * 100 },
    });
  }

  static recordScraperRun(scraper: string, jobsFound: number, duration: number, errors: number = 0): void {
    logger.metric('scraper.jobs.found', jobsFound, 'count', {
      operation: 'scraper-execution',
      component: scraper,
      duration,
      metadata: { errors, successRate: errors === 0 ? 100 : 0 },
    });
  }

  static recordAPICall(endpoint: string, method: string, statusCode: number, duration: number): void {
    logger.metric('api.calls', 1, 'count', {
      operation: 'api-call',
      component: 'api',
      duration,
      metadata: { endpoint, method, statusCode, success: statusCode < 400 },
    });
  }
}

// Context management for request tracking
export class RequestContext {
  private static context: Map<string, LogContext> = new Map();

  static set(requestId: string, context: LogContext): void {
    this.context.set(requestId, context);
  }

  static get(requestId: string): LogContext | undefined {
    return this.context.get(requestId);
  }

  static update(requestId: string, updates: Partial<LogContext>): void {
    const existing = this.context.get(requestId) || {};
    this.context.set(requestId, { ...existing, ...updates });
  }

  static clear(requestId: string): void {
    this.context.delete(requestId);
  }

  static cleanup(): void {
    // Clean up old contexts (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [requestId, context] of this.context.entries()) {
      if (context.metadata?.timestamp && context.metadata.timestamp < oneHourAgo) {
        this.context.delete(requestId);
      }
    }
  }
}

// Initialize monitoring when module is imported
if (!isTest) {
  initializeMonitoring();
}

// Export monitoring utilities
export const performanceMonitor = PerformanceMonitor.getInstance();
export { Sentry };
