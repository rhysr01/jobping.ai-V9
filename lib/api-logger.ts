/**
 * Structured Logger for API Routes
 * Provides consistent logging across all API endpoints
 * Replaces console.log with structured, production-ready logging
 */

import { logger } from "@/lib/monitoring";

export const apiLogger = {
  debug: (message: string, context?: Record<string, any>) => {
    logger.debug(message, { component: "api", ...context });
  },

  info: (message: string, context?: Record<string, any>) => {
    logger.info(message, { component: "api", ...context });
  },

  warn: (
    message: string,
    error?: Error | Record<string, any>,
    context?: Record<string, any>,
  ) => {
    if (error instanceof Error) {
      logger.warn(message, { component: "api", error, ...context });
    } else {
      logger.warn(message, { component: "api", ...(error || {}), ...context });
    }
  },

  error: (message: string, error?: Error, context?: Record<string, any>) => {
    logger.error(message, {
      component: "api",
      error,
      ...context,
    });
  },

  perf: (step: string, duration: number, context?: Record<string, any>) => {
    logger.info(`PERF: ${step}`, {
      component: "api",
      duration,
      metadata: { step, ms: duration, ...context },
    });
  },
};
