import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger, RequestContext, BusinessMetrics } from '@/lib/monitoring';

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  // Set up request context for monitoring
  const requestContext = {
    requestId,
    operation: 'http-request',
    component: 'middleware',
    metadata: {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()) || 
          request.headers.get('x-real-ip') || 
          'unknown',
      timestamp: Date.now(),
    },
  };
  
  RequestContext.set(requestId, requestContext);
  
  // Log API requests for monitoring
  if (request.nextUrl.pathname.startsWith('/api/')) {
    logger.debug('API request started', requestContext);
  }

  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production') {
    const proto = request.headers.get('x-forwarded-proto');
    if (proto === 'http') {
      const url = request.nextUrl.clone();
      url.protocol = 'https:';
      return NextResponse.redirect(url, 301);
    }
  }

  const response = NextResponse.next();
  
  // Add request tracking headers
  response.headers.set('X-Request-ID', requestId);
  response.headers.set('X-Response-Time', (Date.now() - startTime).toString());
  
  // Enhanced security headers
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://*.supabase.co https://cdn.jsdelivr.net https://js.stripe.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: blob:; " +
    "connect-src 'self' https://*.supabase.co https://api.resend.com https://api.openai.com https://api.stripe.com; " +
    "frame-src https://js.stripe.com; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Log request completion for API endpoints
  const duration = Date.now() - startTime;
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Get response status from headers or assume 200
    const statusCode = response.status || 200;
    
    // Record API metrics
    BusinessMetrics.recordAPICall(
      request.nextUrl.pathname,
      request.method,
      statusCode,
      duration
    );
    
    logger.debug('API request completed', {
      ...requestContext,
      duration,
      metadata: {
        ...requestContext.metadata,
        statusCode,
        success: statusCode < 400,
      },
    });
  }
  
  // Clean up request context after a delay to allow for async operations
  setTimeout(() => {
    RequestContext.clear(requestId);
  }, 5000);
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
