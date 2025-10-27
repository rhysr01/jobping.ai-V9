/**
 * Tests for Error Response Utilities
 */

import { getRequestId, errorJson, errorResponse } from '@/Utils/errorResponse';
import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS, ERROR_CODES } from '@/Utils/constants';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, options) => ({
      status: options?.status || 200,
      headers: new Map(),
      json: jest.fn().mockResolvedValue(body),
    })),
  },
}));

// Mock NextRequest and NextResponse
const mockRequest = {
  headers: {
    get: jest.fn(),
  },
} as unknown as NextRequest;

describe('Error Response Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock crypto.randomUUID for consistent random IDs in tests
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('mock-uuid-123');
  });

  describe('getRequestId', () => {
    it('should return x-request-id header if present', () => {
      mockRequest.headers.get.mockReturnValue('header-request-id-456');
      const requestId = getRequestId(mockRequest);
      expect(requestId).toBe('header-request-id-456');
      expect(mockRequest.headers.get).toHaveBeenCalledWith('x-request-id');
    });

    it('should generate random ID when header is empty', () => {
      mockRequest.headers.get.mockReturnValue('');
      const requestId = getRequestId(mockRequest);
      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
      expect(requestId.length).toBeGreaterThan(0);
    });

    it('should generate random ID when header is null', () => {
      mockRequest.headers.get.mockReturnValue(null);
      const requestId = getRequestId(mockRequest);
      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
      expect(requestId.length).toBeGreaterThan(0);
    });

    it('should generate random ID when header is undefined', () => {
      mockRequest.headers.get.mockReturnValue(undefined);
      const requestId = getRequestId(mockRequest);
      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
      expect(requestId.length).toBeGreaterThan(0);
    });
  });

  describe('errorJson', () => {
    it('should create error response with all fields', () => {
      mockRequest.headers.get.mockReturnValue('test-request-id');
      const response = errorJson(
        mockRequest,
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid input',
        HTTP_STATUS.BAD_REQUEST,
        { field: 'email', value: 'invalid' }
      );

      expect(response).toBeDefined();
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.headers.get('x-request-id')).toBe('test-request-id');

      // Parse the JSON body
      response.json().then(body => {
        expect(body).toEqual({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid input',
          details: { field: 'email', value: 'invalid' },
          requestId: 'test-request-id',
        });
      });
    });

    it('should create error response without details', () => {
      mockRequest.headers.get.mockReturnValue('another-request-id');
      const response = errorJson(
        mockRequest,
        ERROR_CODES.UNAUTHORIZED,
        'Unauthorized',
        HTTP_STATUS.UNAUTHORIZED
      );

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(response.headers.get('x-request-id')).toBe('another-request-id');

      response.json().then(body => {
        expect(body).toEqual({
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Unauthorized',
          requestId: 'another-request-id',
        });
      });
    });

    it('should use default status code when not provided', () => {
      mockRequest.headers.get.mockReturnValue('default-status-test');
      const response = errorJson(
        mockRequest,
        ERROR_CODES.VALIDATION_ERROR,
        'Default status test'
      );

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    it('should handle custom status codes', () => {
      mockRequest.headers.get.mockReturnValue('custom-status-test');
      const response = errorJson(
        mockRequest,
        'CUSTOM_ERROR',
        'Custom error',
        418 // I'm a teapot
      );

      expect(response.status).toBe(418);
    });

    it('should handle string error codes', () => {
      mockRequest.headers.get.mockReturnValue('string-code-test');
      const response = errorJson(
        mockRequest,
        'STRING_ERROR_CODE',
        'String error code test'
      );

      response.json().then(body => {
        expect(body.code).toBe('STRING_ERROR_CODE');
      });
    });
  });

  describe('errorResponse convenience functions', () => {
    it('badRequest should return 400 with VALIDATION_ERROR', () => {
      mockRequest.headers.get.mockReturnValue('req-1');
      const response = errorResponse.badRequest(mockRequest, 'Bad data');
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      response.json().then(body => {
        expect(body.code).toBe(ERROR_CODES.VALIDATION_ERROR);
        expect(body.message).toBe('Bad data');
        expect(body.requestId).toBe('req-1');
      });
    });

    it('badRequest should include details when provided', () => {
      mockRequest.headers.get.mockReturnValue('req-1-details');
      const response = errorResponse.badRequest(mockRequest, 'Bad data', { field: 'email' });
      response.json().then(body => {
        expect(body.details).toEqual({ field: 'email' });
      });
    });

    it('unauthorized should return 401 with UNAUTHORIZED', () => {
      mockRequest.headers.get.mockReturnValue('req-2');
      const response = errorResponse.unauthorized(mockRequest);
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      response.json().then(body => {
        expect(body.code).toBe(ERROR_CODES.UNAUTHORIZED);
        expect(body.message).toBe('Authentication required');
        expect(body.requestId).toBe('req-2');
      });
    });

    it('unauthorized should use custom message when provided', () => {
      mockRequest.headers.get.mockReturnValue('req-2-custom');
      const response = errorResponse.unauthorized(mockRequest, 'Custom auth message');
      response.json().then(body => {
        expect(body.message).toBe('Custom auth message');
      });
    });

    it('forbidden should return 403 with FORBIDDEN', () => {
      mockRequest.headers.get.mockReturnValue('req-3');
      const response = errorResponse.forbidden(mockRequest, 'Not allowed');
      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
      response.json().then(body => {
        expect(body.code).toBe(ERROR_CODES.FORBIDDEN);
        expect(body.message).toBe('Not allowed');
        expect(body.requestId).toBe('req-3');
      });
    });

    it('forbidden should use default message when not provided', () => {
      mockRequest.headers.get.mockReturnValue('req-3-default');
      const response = errorResponse.forbidden(mockRequest);
      response.json().then(body => {
        expect(body.message).toBe('Access denied');
      });
    });

    it('notFound should return 404 with NOT_FOUND', () => {
      mockRequest.headers.get.mockReturnValue('req-4');
      const response = errorResponse.notFound(mockRequest);
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      response.json().then(body => {
        expect(body.code).toBe(ERROR_CODES.NOT_FOUND);
        expect(body.message).toBe('Resource not found');
        expect(body.requestId).toBe('req-4');
      });
    });

    it('notFound should use custom message when provided', () => {
      mockRequest.headers.get.mockReturnValue('req-4-custom');
      const response = errorResponse.notFound(mockRequest, 'Custom not found message');
      response.json().then(body => {
        expect(body.message).toBe('Custom not found message');
      });
    });

    it('rateLimited should return 429 with RATE_LIMITED', () => {
      mockRequest.headers.get.mockReturnValue('req-5');
      const response = errorResponse.rateLimited(mockRequest);
      expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
      response.json().then(body => {
        expect(body.code).toBe(ERROR_CODES.RATE_LIMITED);
        expect(body.message).toBe('Too many requests');
        expect(body.requestId).toBe('req-5');
      });
    });

    it('rateLimited should use custom message when provided', () => {
      mockRequest.headers.get.mockReturnValue('req-5-custom');
      const response = errorResponse.rateLimited(mockRequest, 'Custom rate limit message');
      response.json().then(body => {
        expect(body.message).toBe('Custom rate limit message');
      });
    });

    it('internal should return 500 with INTERNAL_ERROR', () => {
      mockRequest.headers.get.mockReturnValue('req-6');
      const response = errorResponse.internal(mockRequest, 'Server oops');
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_ERROR);
      response.json().then(body => {
        expect(body.code).toBe(ERROR_CODES.INTERNAL_ERROR);
        expect(body.message).toBe('Server oops');
        expect(body.requestId).toBe('req-6');
      });
    });

    it('internal should use default message when not provided', () => {
      mockRequest.headers.get.mockReturnValue('req-6-default');
      const response = errorResponse.internal(mockRequest);
      response.json().then(body => {
        expect(body.message).toBe('Internal server error');
      });
    });

    it('internal should include details when provided', () => {
      mockRequest.headers.get.mockReturnValue('req-6-details');
      const response = errorResponse.internal(mockRequest, 'Server oops', { error: 'Database connection failed' });
      response.json().then(body => {
        expect(body.details).toEqual({ error: 'Database connection failed' });
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long request IDs', () => {
      const longRequestId = 'x'.repeat(1000);
      mockRequest.headers.get.mockReturnValue(longRequestId);
      const requestId = getRequestId(mockRequest);
      expect(requestId).toBe(longRequestId);
    });

    it('should handle special characters in request IDs', () => {
      const specialRequestId = 'req-123!@#$%^&*()_+-=[]{}|;:,.<>?';
      mockRequest.headers.get.mockReturnValue(specialRequestId);
      const requestId = getRequestId(mockRequest);
      expect(requestId).toBe(specialRequestId);
    });

    it('should handle empty error messages', () => {
      mockRequest.headers.get.mockReturnValue('empty-message-test');
      const response = errorJson(mockRequest, ERROR_CODES.VALIDATION_ERROR, '');
      response.json().then(body => {
        expect(body.message).toBe('');
      });
    });

    it('should handle very long error messages', () => {
      const longMessage = 'x'.repeat(10000);
      mockRequest.headers.get.mockReturnValue('long-message-test');
      const response = errorJson(mockRequest, ERROR_CODES.VALIDATION_ERROR, longMessage);
      response.json().then(body => {
        expect(body.message).toBe(longMessage);
      });
    });

    it('should handle complex details objects', () => {
      const complexDetails = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
          null: null,
          undefined: undefined,
          boolean: true
        },
        circular: {} as any
      };
      complexDetails.circular.self = complexDetails.circular;

      mockRequest.headers.get.mockReturnValue('complex-details-test');
      const response = errorJson(mockRequest, ERROR_CODES.VALIDATION_ERROR, 'Complex details', HTTP_STATUS.BAD_REQUEST, complexDetails);
      response.json().then(body => {
        expect(body.details).toBeDefined();
      });
    });

    it('should handle null details', () => {
      mockRequest.headers.get.mockReturnValue('null-details-test');
      const response = errorJson(mockRequest, ERROR_CODES.VALIDATION_ERROR, 'Null details', HTTP_STATUS.BAD_REQUEST, null);
      response.json().then(body => {
        expect(body.details).toBeNull();
      });
    });

    it('should handle undefined details', () => {
      mockRequest.headers.get.mockReturnValue('undefined-details-test');
      const response = errorJson(mockRequest, ERROR_CODES.VALIDATION_ERROR, 'Undefined details', HTTP_STATUS.BAD_REQUEST, undefined);
      response.json().then(body => {
        expect(body.details).toBeUndefined();
      });
    });
  });
});