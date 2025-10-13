/**
 * Unified Error Handling for JobPing
 * Centralizes error handling across all API routes
 */

import { logger } from './monitoring';
import { NextRequest, NextResponse } from 'next/server';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT', { retryAfter });
  }
}

/**
 * Centralized error handler
 * Logs errors and returns consistent JSON response
 */
export function handleError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    logger.warn(error.message, {
      metadata: {
        statusCode: error.statusCode,
        code: error.code,
        details: error.details,
      },
    });

    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // Unknown error - log with full stack
  logger.error('Unhandled error', { error: error instanceof Error ? error : new Error(String(error)) });

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

/**
 * Async handler wrapper - wraps API route handlers
 * Automatically catches and handles all errors
 * 
 * Usage:
 * export const POST = asyncHandler(async (req) => {
 *   // Your code here
 *   // Errors are auto-caught and handled
 * });
 */
export function asyncHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleError(error);
    }
  };
}

