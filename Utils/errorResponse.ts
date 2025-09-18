import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { HTTP_STATUS, ERROR_CODES, type HttpStatusCode, type ErrorCode } from './constants';

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
};

export function getRequestId(req: NextRequest): string {
  const headerVal = req.headers.get('x-request-id');
  return headerVal && headerVal.length > 0 ? headerVal : cryptoRandomId();
}

export function errorJson(
  req: NextRequest,
  code: ErrorCode | string,
  message: string,
  status: HttpStatusCode | number = HTTP_STATUS.BAD_REQUEST,
  details?: unknown
) {
  const requestId = getRequestId(req);
  const body: ApiErrorBody = { code, message, details, requestId };
  const res = NextResponse.json(body, { status });
  res.headers.set('x-request-id', requestId);
  return res;
}

// Convenience functions for common error responses
export const errorResponse = {
  badRequest: (req: NextRequest, message: string, details?: unknown) =>
    errorJson(req, ERROR_CODES.VALIDATION_ERROR, message, HTTP_STATUS.BAD_REQUEST, details),
    
  unauthorized: (req: NextRequest, message: string = 'Authentication required') =>
    errorJson(req, ERROR_CODES.UNAUTHORIZED, message, HTTP_STATUS.UNAUTHORIZED),
    
  forbidden: (req: NextRequest, message: string = 'Access denied') =>
    errorJson(req, ERROR_CODES.FORBIDDEN, message, HTTP_STATUS.FORBIDDEN),
    
  notFound: (req: NextRequest, message: string = 'Resource not found') =>
    errorJson(req, ERROR_CODES.NOT_FOUND, message, HTTP_STATUS.NOT_FOUND),
    
  rateLimited: (req: NextRequest, message: string = 'Too many requests') =>
    errorJson(req, ERROR_CODES.RATE_LIMITED, message, HTTP_STATUS.TOO_MANY_REQUESTS),
    
  internal: (req: NextRequest, message: string = 'Internal server error', details?: unknown) =>
    errorJson(req, ERROR_CODES.INTERNAL_ERROR, message, HTTP_STATUS.INTERNAL_ERROR, details),
};

function cryptoRandomId(): string {
  // Use native crypto if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto');
    return nodeCrypto.randomUUID ? nodeCrypto.randomUUID() : nodeCrypto.randomBytes(16).toString('hex');
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}


