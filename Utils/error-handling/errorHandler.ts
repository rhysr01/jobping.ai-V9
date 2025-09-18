/**
 * Comprehensive Error Handling System
 * Provides standardized error handling, logging, and user-friendly responses
 */

import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

// ================================
// ERROR TYPES AND CLASSES
// ================================

export enum ErrorCode {
  // Validation Errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Authentication Errors (4xx)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Resource Errors (4xx)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // External Service Errors (5xx)
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EMAIL_SERVICE_ERROR = 'EMAIL_SERVICE_ERROR',
  PAYMENT_SERVICE_ERROR = 'PAYMENT_SERVICE_ERROR',
  
  // System Errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp?: string;
  additionalData?: Record<string, any>;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly isOperational: boolean;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: ErrorContext = {},
    isOperational: boolean = true,
    retryable: boolean = false
  ) {
    super(message);
    
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.context = {
      timestamp: new Date().toISOString(),
      ...context,
    };
    this.isOperational = isOperational;
    this.retryable = retryable;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// ================================
// SPECIFIC ERROR CLASSES
// ================================

export class ValidationError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, ErrorSeverity.LOW, context);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context: ErrorContext = {}) {
    super(message, ErrorCode.UNAUTHORIZED, 401, ErrorSeverity.MEDIUM, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context: ErrorContext = {}) {
    super(message, ErrorCode.FORBIDDEN, 403, ErrorSeverity.MEDIUM, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', context: ErrorContext = {}) {
    super(`${resource} not found`, ErrorCode.NOT_FOUND, 404, ErrorSeverity.LOW, context);
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter: number = 60, context: ErrorContext = {}) {
    super(message, ErrorCode.RATE_LIMITED, 429, ErrorSeverity.MEDIUM, context, true, true);
    this.retryAfter = retryAfter;
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context: ErrorContext = {}) {
    super(`${service} error: ${message}`, ErrorCode.EXTERNAL_SERVICE_ERROR, 502, ErrorSeverity.HIGH, context, true, true);
  }
}

export class AIServiceError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(`AI service error: ${message}`, ErrorCode.AI_SERVICE_ERROR, 502, ErrorSeverity.HIGH, context, true, true);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(`Database error: ${message}`, ErrorCode.DATABASE_ERROR, 500, ErrorSeverity.CRITICAL, context, true, true);
  }
}

export class TimeoutError extends AppError {
  constructor(operation: string, timeout: number, context: ErrorContext = {}) {
    super(`${operation} timed out after ${timeout}ms`, ErrorCode.TIMEOUT_ERROR, 504, ErrorSeverity.HIGH, context, true, true);
  }
}

// ================================
// ERROR HANDLER CLASS
// ================================

export class ErrorHandler {
  private static instance: ErrorHandler;
  private readonly isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle and process errors with comprehensive logging and user-friendly responses
   */
  public handleError(error: Error | AppError, context: ErrorContext = {}): NextResponse {
    const appError = this.normalizeError(error, context);
    
    // Log error with appropriate level
    this.logError(appError);
    
    // Report to monitoring service
    this.reportError(appError);
    
    // Generate user-friendly response
    return this.createErrorResponse(appError);
  }

  /**
   * Normalize any error into an AppError
   */
  private normalizeError(error: Error | AppError, context: ErrorContext): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Handle specific error types
    if (error.name === 'ValidationError') {
      return new ValidationError(error.message, context);
    }

    if (error.name === 'UnauthorizedError') {
      return new AuthenticationError(error.message, context);
    }

    if (error.name === 'ForbiddenError') {
      return new AuthorizationError(error.message, context);
    }

    if (error.name === 'NotFoundError') {
      return new NotFoundError(error.message, context);
    }

    // Handle network/timeout errors
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return new TimeoutError('Request', 30000, context);
    }

    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return new NetworkError('Network connection failed', context);
    }

    // Handle database errors
    if (error.message.includes('database') || error.message.includes('SQL')) {
      return new DatabaseError(error.message, context);
    }

    // Handle AI service errors
    if (error.message.includes('OpenAI') || error.message.includes('AI')) {
      return new AIServiceError(error.message, context);
    }

    // Default to internal error
    return new AppError(
      error.message || 'An unexpected error occurred',
      ErrorCode.INTERNAL_ERROR,
      500,
      ErrorSeverity.HIGH,
      context,
      false, // Not operational
      false  // Not retryable
    );
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(error: AppError): void {
    const logData = {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      severity: error.severity,
      context: error.context,
      stack: this.isDevelopment ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🚨 CRITICAL ERROR:', logData);
        break;
      case ErrorSeverity.HIGH:
        console.error('❌ HIGH SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️ MEDIUM SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.LOW:
        console.info('ℹ️ LOW SEVERITY ERROR:', logData);
        break;
    }
  }

  /**
   * Report error to monitoring service (Sentry)
   */
  private reportError(error: AppError): void {
    // Only report high/critical errors to Sentry
    if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
      Sentry.withScope((scope) => {
        scope.setTag('errorCode', error.code);
        scope.setTag('severity', error.severity);
        scope.setTag('statusCode', error.statusCode.toString());
        scope.setContext('errorContext', error.context as Record<string, any>);
        
        if (error.context.userId) {
          scope.setUser({ id: error.context.userId });
        }

        Sentry.captureException(error);
      });
    }
  }

  /**
   * Create user-friendly error response
   */
  private createErrorResponse(error: AppError): NextResponse {
    const response: any = {
      error: this.getUserFriendlyMessage(error),
      code: error.code,
      timestamp: error.context.timestamp,
    };

    // Add retry information for retryable errors
    if (error.retryable) {
      response.retryable = true;
      if (error instanceof RateLimitError) {
        response.retryAfter = error.retryAfter;
      }
    }

    // Add request ID for tracking
    if (error.context.requestId) {
      response.requestId = error.context.requestId;
    }

    // Add additional context in development
    if (this.isDevelopment) {
      response.details = {
        message: error.message,
        stack: error.stack,
        context: error.context,
      };
    }

    return NextResponse.json(response, { status: error.statusCode });
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(error: AppError): string {
    const userFriendlyMessages: Record<ErrorCode, string> = {
      [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again',
      [ErrorCode.INVALID_INPUT]: 'The provided data is invalid',
      [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required information is missing',
      [ErrorCode.INVALID_FORMAT]: 'The data format is incorrect',
      [ErrorCode.UNAUTHORIZED]: 'Please log in to continue',
      [ErrorCode.FORBIDDEN]: 'You don\'t have permission to perform this action',
      [ErrorCode.INVALID_TOKEN]: 'Your session has expired, please log in again',
      [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired, please log in again',
      [ErrorCode.NOT_FOUND]: 'The requested resource was not found',
      [ErrorCode.RESOURCE_CONFLICT]: 'This resource already exists',
      [ErrorCode.RATE_LIMITED]: 'Too many requests, please try again later',
      [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'A service is temporarily unavailable',
      [ErrorCode.AI_SERVICE_ERROR]: 'Our AI service is temporarily unavailable',
      [ErrorCode.DATABASE_ERROR]: 'A database error occurred',
      [ErrorCode.EMAIL_SERVICE_ERROR]: 'Email service is temporarily unavailable',
      [ErrorCode.PAYMENT_SERVICE_ERROR]: 'Payment service is temporarily unavailable',
      [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred',
      [ErrorCode.TIMEOUT_ERROR]: 'The request took too long to process',
      [ErrorCode.CONFIGURATION_ERROR]: 'Service configuration error',
      [ErrorCode.NETWORK_ERROR]: 'Network connection failed',
    };

    return userFriendlyMessages[error.code] || 'An unexpected error occurred';
  }
}

// ================================
// CONVENIENCE FUNCTIONS
// ================================

export const errorHandler = ErrorHandler.getInstance();

export function handleError(error: Error | AppError, context: ErrorContext = {}): NextResponse {
  return errorHandler.handleError(error, context);
}

export function createErrorResponse(
  message: string,
  code: ErrorCode,
  statusCode: number = 500,
  context: ErrorContext = {}
): NextResponse {
  const appError = new AppError(message, code, statusCode, ErrorSeverity.MEDIUM, context);
  return errorHandler.handleError(appError);
}

// ================================
// ASYNC ERROR WRAPPER
// ================================

export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: ErrorContext = {}
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw errorHandler.normalizeError(error as Error, context);
    }
  };
}

// ================================
// VALIDATION HELPERS
// ================================

export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }
}

export function validatePositiveNumber(value: number, fieldName: string): void {
  if (typeof value !== 'number' || value <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number`);
  }
}

export function validateArray(value: any[], fieldName: string, minLength: number = 1): void {
  if (!Array.isArray(value) || value.length < minLength) {
    throw new ValidationError(`${fieldName} must be an array with at least ${minLength} item(s)`);
  }
}

// ================================
// NETWORK ERROR CLASS
// ================================

export class NetworkError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(`Network error: ${message}`, ErrorCode.NETWORK_ERROR, 503, ErrorSeverity.HIGH, context, true, true);
  }
}
