/**
 * Validation Middleware for JobPing API Routes
 * Provides consistent input validation across all endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ValidationSchemas, validateInputSafe } from './schemas';

// Validation middleware factory
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  options: {
    body?: boolean;
    query?: boolean;
    headers?: boolean;
    customValidator?: (req: NextRequest) => Promise<T>;
  } = {}
) {
  return async function validationMiddleware(
    req: NextRequest,
    handler: (req: NextRequest, validatedData: T) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      let dataToValidate: unknown;

      if (options.customValidator) {
        dataToValidate = await options.customValidator(req);
      } else if (options.body) {
        const body = await req.json();
        dataToValidate = body;
      } else if (options.query) {
        const url = new URL(req.url);
        const queryParams: Record<string, string> = {};
        url.searchParams.forEach((value, key) => {
          queryParams[key] = value;
        });
        dataToValidate = queryParams;
      } else if (options.headers) {
        const headers: Record<string, string> = {};
        req.headers.forEach((value, key) => {
          headers[key] = value;
        });
        dataToValidate = headers;
      } else {
        // Default to body validation
        const body = await req.json();
        dataToValidate = body;
      }

      const validation = validateInputSafe(schema, dataToValidate);

      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            message: 'Invalid input data',
            details: validation.errors
          },
          { status: 400 }
        );
      }

      return await handler(req, validation.data);
    } catch (error) {
      console.error('Validation middleware error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Failed to validate request data'
        },
        { status: 400 }
      );
    }
  };
}

// Specific validation middleware for common patterns
export const withBodyValidation = <T>(schema: z.ZodSchema<T>) =>
  withValidation(schema, { body: true });

export const withQueryValidation = <T>(schema: z.ZodSchema<T>) =>
  withValidation(schema, { query: true });

export const withHeaderValidation = <T>(schema: z.ZodSchema<T>) =>
  withValidation(schema, { headers: true });

// Pre-configured validation middleware for common endpoints
export const validateTallyWebhook = withBodyValidation(ValidationSchemas.TallyWebhook);
export const validateUserPreferences = withBodyValidation(ValidationSchemas.UserPreferences);
export const validateJobMatchingRequest = withBodyValidation(ValidationSchemas.JobMatchingRequest);
export const validateEmailVerification = withBodyValidation(ValidationSchemas.EmailVerification);
export const validateEmailTest = withBodyValidation(ValidationSchemas.EmailTest);
export const validateStripeCheckout = withBodyValidation(ValidationSchemas.StripeCheckout);
export const validateStripeWebhook = withBodyValidation(ValidationSchemas.StripeWebhook);
export const validateJobScrapingRequest = withBodyValidation(ValidationSchemas.JobScrapingRequest);
export const validateUserFeedback = withBodyValidation(ValidationSchemas.UserFeedback);
export const validateImplicitTracking = withBodyValidation(ValidationSchemas.ImplicitTracking);
export const validateAdminOperation = withBodyValidation(ValidationSchemas.AdminOperation);
export const validatePagination = withQueryValidation(ValidationSchemas.Pagination);
export const validateSearchFilters = withQueryValidation(ValidationSchemas.SearchFilters);

// Custom validation for specific endpoints
export const validateMatchUsersRequest = withValidation(
  ValidationSchemas.JobMatchingRequest,
  {
    customValidator: async (req: NextRequest) => {
      const body = await req.json();
      // Add additional validation for match-users endpoint
      if (body.testMode && !process.env.JOBPING_TEST_MODE) {
        throw new Error('Test mode not enabled');
      }
      return body;
    }
  }
);

export const validateScrapeRequest = withValidation(
  ValidationSchemas.JobScrapingRequest,
  {
    customValidator: async (req: NextRequest) => {
      const body = await req.json();
      // Validate API keys for scraping endpoints
      const source = body.source;
      const requiredKeys: Record<string, string> = {
        'jooble': 'JOOBLE_API_KEY',
        'rapidapi-internships': 'RAPIDAPI_KEY',
        'serp-api': 'SERP_API_KEY'
      };
      
      if (requiredKeys[source] && !process.env[requiredKeys[source]]) {
        throw new Error(`API key not configured for ${source}`);
      }
      
      return body;
    }
  }
);

// Error response helpers
export function validationErrorResponse(errors: string[]): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      message: 'Invalid input data',
      details: errors
    },
    { status: 400 }
  );
}

export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Unauthorized',
      message
    },
    { status: 401 }
  );
}

export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Forbidden',
      message
    },
    { status: 403 }
  );
}

export function notFoundResponse(message: string = 'Not found'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Not found',
      message
    },
    { status: 404 }
  );
}

export function rateLimitResponse(retryAfter?: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later',
      retryAfter
    },
    { 
      status: 429,
      headers: {
        'Retry-After': retryAfter?.toString() || '60'
      }
    }
  );
}

export function internalErrorResponse(message: string = 'Internal server error'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
      message
    },
    { status: 500 }
  );
}

// Success response helpers
export function successResponse<T>(data: T, message?: string): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
}

export function createdResponse<T>(data: T, message?: string): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    },
    { status: 201 }
  );
}

// Authentication helpers
export function requireAuth(req: NextRequest): boolean {
  // Check for API key in headers
  const apiKey = req.headers.get('x-api-key');
  if (apiKey && apiKey === process.env.ADMIN_API_KEY) {
    return true;
  }
  
  // Check for session token
  const sessionToken = req.headers.get('authorization')?.replace('Bearer ', '');
  if (sessionToken) {
    // TODO: Implement session validation
    return true;
  }
  
  return false;
}

export function requireAdmin(req: NextRequest): boolean {
  const apiKey = req.headers.get('x-api-key');
  return apiKey === process.env.ADMIN_API_KEY;
}

// Rate limiting integration
export async function withRateLimitAndValidation<T>(
  req: NextRequest,
  endpoint: string,
  schema: z.ZodSchema<T>,
  handler: (req: NextRequest, validatedData: T) => Promise<NextResponse>
): Promise<NextResponse> {
  // First check rate limit
  const { withRateLimit } = await import('@/Utils/productionRateLimiter');
  const rateLimitResponse = await withRateLimit(req, endpoint);
  
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  // Then validate input
  return withBodyValidation(schema)(req, handler);
}
