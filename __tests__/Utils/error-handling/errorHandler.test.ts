/**
 * Tests for Error Handler
 * Tests error classes and handling logic
 */

import {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  DatabaseError,
  ErrorCode,
  ErrorSeverity,
  validateRequired,
  validateEmail,
  validatePositiveNumber,
  validateArray
} from '@/Utils/error-handling/errorHandler';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with all properties', () => {
      const error = new AppError(
        'Test error',
        ErrorCode.INTERNAL_ERROR,
        500,
        ErrorSeverity.HIGH,
        { userId: '123' }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.context.userId).toBe('123');
    });

    it('should have default values', () => {
      const error = new AppError('Test', ErrorCode.INTERNAL_ERROR);

      expect(error.statusCode).toBe(500);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.isOperational).toBe(true);
      expect(error.retryable).toBe(false);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with 400 status', () => {
      const error = new ValidationError('Invalid input');

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('AuthenticationError', () => {
    it('should create auth error with 401 status', () => {
      const error = new AuthenticationError('Unauthorized');

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with 404 status', () => {
      const error = new NotFoundError('Resource not found');

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with 429 status', () => {
      const error = new RateLimitError('Too many requests', 60);

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe(ErrorCode.RATE_LIMITED);
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with 500 status', () => {
      const error = new DatabaseError('Database connection failed');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
      expect(error.retryable).toBe(true);
    });
  });
});

describe('Validation Functions', () => {
  describe('validateRequired', () => {
    it('should pass for valid values', () => {
      expect(() => validateRequired('value', 'field')).not.toThrow();
      expect(() => validateRequired(123, 'field')).not.toThrow();
      expect(() => validateRequired({}, 'field')).not.toThrow();
    });

    it('should throw for null/undefined', () => {
      expect(() => validateRequired(null, 'field')).toThrow(ValidationError);
      expect(() => validateRequired(undefined, 'field')).toThrow(ValidationError);
    });

    it('should throw for empty string', () => {
      expect(() => validateRequired('', 'field')).toThrow(ValidationError);
    });
  });

  describe('validateEmail', () => {
    it('should pass for valid emails', () => {
      expect(() => validateEmail('test@example.com')).not.toThrow();
      expect(() => validateEmail('user+tag@domain.co.uk')).not.toThrow();
    });

    it('should throw for invalid emails', () => {
      expect(() => validateEmail('notanemail')).toThrow(ValidationError);
      expect(() => validateEmail('missing@domain')).toThrow(ValidationError);
      expect(() => validateEmail('@domain.com')).toThrow(ValidationError);
    });

    it('should throw for empty string', () => {
      expect(() => validateEmail('')).toThrow(ValidationError);
    });
  });

  describe('validatePositiveNumber', () => {
    it('should pass for positive numbers', () => {
      expect(() => validatePositiveNumber(1, 'field')).not.toThrow();
      expect(() => validatePositiveNumber(100.5, 'field')).not.toThrow();
    });

    it('should throw for zero', () => {
      expect(() => validatePositiveNumber(0, 'field')).toThrow(ValidationError);
    });

    it('should throw for negative numbers', () => {
      expect(() => validatePositiveNumber(-1, 'field')).toThrow(ValidationError);
      expect(() => validatePositiveNumber(-100.5, 'field')).toThrow(ValidationError);
    });
  });

  describe('validateArray', () => {
    it('should pass for valid arrays', () => {
      expect(() => validateArray([1, 2, 3], 'field')).not.toThrow();
      expect(() => validateArray(['a'], 'field')).not.toThrow();
    });

    it('should throw for empty arrays', () => {
      expect(() => validateArray([], 'field')).toThrow(ValidationError);
    });

    it('should throw for non-arrays', () => {
      expect(() => validateArray('not array' as any, 'field')).toThrow(ValidationError);
      expect(() => validateArray({} as any, 'field')).toThrow(ValidationError);
    });

    it('should respect minLength parameter', () => {
      expect(() => validateArray([1, 2], 'field', 3)).toThrow(ValidationError);
      expect(() => validateArray([1, 2, 3], 'field', 3)).not.toThrow();
    });
  });
});

describe('Error Context', () => {
  it('should store context information', () => {
    const context = {
      userId: 'user123',
      requestId: 'req456',
      endpoint: '/api/test',
      method: 'POST'
    };

    const error = new AppError('Test', ErrorCode.INTERNAL_ERROR, 500, ErrorSeverity.MEDIUM, context);

    expect(error.context).toMatchObject(context);
  });

  it('should handle additional data', () => {
    const context = {
      additionalData: {
        custom: 'value',
        nested: { data: true }
      }
    };

    const error = new AppError('Test', ErrorCode.INTERNAL_ERROR, 500, ErrorSeverity.MEDIUM, context);

    expect(error.context.additionalData).toMatchObject(context.additionalData);
  });
});

describe('Error Properties', () => {
  it('should mark operational errors', () => {
    const operational = new AppError('Test', ErrorCode.VALIDATION_ERROR, 400, ErrorSeverity.LOW, {}, true);
    const nonOperational = new AppError('Test', ErrorCode.INTERNAL_ERROR, 500, ErrorSeverity.CRITICAL, {}, false);

    expect(operational.isOperational).toBe(true);
    expect(nonOperational.isOperational).toBe(false);
  });

  it('should mark retryable errors', () => {
    const retryable = new AppError('Test', ErrorCode.TIMEOUT_ERROR, 503, ErrorSeverity.MEDIUM, {}, true, true);
    const notRetryable = new AppError('Test', ErrorCode.VALIDATION_ERROR, 400, ErrorSeverity.LOW, {}, true, false);

    expect(retryable.retryable).toBe(true);
    expect(notRetryable.retryable).toBe(false);
  });

  it('should have correct severity levels', () => {
    const low = new AppError('Test', ErrorCode.VALIDATION_ERROR, 400, ErrorSeverity.LOW);
    const medium = new AppError('Test', ErrorCode.NOT_FOUND, 404, ErrorSeverity.MEDIUM);
    const high = new AppError('Test', ErrorCode.DATABASE_ERROR, 500, ErrorSeverity.HIGH);
    const critical = new AppError('Test', ErrorCode.INTERNAL_ERROR, 500, ErrorSeverity.CRITICAL);

    expect(low.severity).toBe(ErrorSeverity.LOW);
    expect(medium.severity).toBe(ErrorSeverity.MEDIUM);
    expect(high.severity).toBe(ErrorSeverity.HIGH);
    expect(critical.severity).toBe(ErrorSeverity.CRITICAL);
  });
});

