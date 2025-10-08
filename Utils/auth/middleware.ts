/**
 * Authentication Middleware for JobPing API Routes
 * Provides consistent authentication and authorization across all endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// Initialize Supabase client for auth
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// JWT secret for token validation
const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback-secret';

// Authentication levels
export enum AuthLevel {
  NONE = 'none',
  USER = 'user',
  ADMIN = 'admin',
  SYSTEM = 'system'
}

// User session interface
export interface UserSession {
  email: string;
  userId: string;
  role: 'user' | 'admin' | 'system';
  verified: boolean;
  subscriptionTier?: 'free' | 'premium';
}

// Authentication middleware factory
export function withAuth(
  requiredLevel: AuthLevel = AuthLevel.USER,
  options: {
    allowTestMode?: boolean;
    requireEmailVerification?: boolean;
    requireSubscription?: 'free' | 'premium';
  } = {}
) {
  return async function authMiddleware(
    req: NextRequest,
    handler: (req: NextRequest, session: UserSession | null) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      // Skip auth in test mode if allowed
      if (options.allowTestMode && (process.env.NODE_ENV === 'test' || process.env.JOBPING_TEST_MODE === '1')) {
        return await handler(req, null);
      }

      // Skip auth if not required
      if (requiredLevel === AuthLevel.NONE) {
        return await handler(req, null);
      }

      // Extract authentication from request
      const session = await extractSession(req);

      if (!session) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized',
            message: 'Authentication required'
          },
          { status: 401 }
        );
      }

      // Check authorization level
      if (!isAuthorized(session, requiredLevel)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden',
            message: 'Insufficient permissions'
          },
          { status: 403 }
        );
      }

      // Check email verification if required
      if (options.requireEmailVerification && !session.verified) {
        return NextResponse.json(
          {
            success: false,
            error: 'Email verification required',
            message: 'Please verify your email address'
          },
          { status: 403 }
        );
      }

      // Check subscription tier if required
      if (options.requireSubscription && session.subscriptionTier !== options.requireSubscription) {
        return NextResponse.json(
          {
            success: false,
            error: 'Subscription required',
            message: `${options.requireSubscription} subscription required`
          },
          { status: 403 }
        );
      }

      return await handler(req, session);
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication error',
          message: 'Failed to authenticate request'
        },
        { status: 500 }
      );
    }
  };
}

// Extract session from request
async function extractSession(req: NextRequest): Promise<UserSession | null> {
  // Method 1: Check for API key (system/admin access)
  const apiKey = req.headers.get('x-api-key');
  if (apiKey) {
    return await validateApiKey(apiKey);
  }

  // Method 2: Check for JWT token in Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return await validateJwtToken(token);
  }

  // Method 3: Check for session cookie
  const sessionCookie = req.cookies.get('jobping-session');
  if (sessionCookie) {
    return await validateSessionCookie(sessionCookie.value);
  }

  // Method 4: Check for Supabase session
  const supabaseToken = req.headers.get('x-supabase-token');
  if (supabaseToken) {
    return await validateSupabaseToken(supabaseToken);
  }

  return null;
}

// Validate API key
async function validateApiKey(apiKey: string): Promise<UserSession | null> {
  // System API key
  if (apiKey === process.env.SYSTEM_API_KEY) {
    return {
      email: 'system@getjobping.com',
      userId: 'system',
      role: 'system',
      verified: true
    };
  }

  // Admin API key
  if (apiKey === process.env.ADMIN_API_KEY) {
    return {
      email: 'admin@getjobping.com',
      userId: 'admin',
      role: 'admin',
      verified: true
    };
  }

  // Check if it's a user API key
  const { data: user, error } = await supabase
    .from('users')
    .select('email, id, email_verified, subscription_tier')
    .eq('api_key', apiKey)
    .single();

  if (error || !user) {
    return null;
  }

  return {
    email: user.email,
    userId: user.id,
    role: 'user',
    verified: user.email_verified || false,
    subscriptionTier: user.subscription_tier
  };
}

// Validate JWT token
async function validateJwtToken(token: string): Promise<UserSession | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Get user details from database
    const { data: user, error } = await supabase
      .from('users')
      .select('email, id, email_verified, subscription_tier')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return null;
    }

    return {
      email: user.email,
      userId: user.id,
      role: decoded.role || 'user',
      verified: user.email_verified || false,
      subscriptionTier: user.subscription_tier
    };
  } catch (error) {
    console.error('JWT validation error:', error);
    return null;
  }
}

// Validate session cookie
async function validateSessionCookie(cookieValue: string): Promise<UserSession | null> {
  try {
    const decoded = jwt.verify(cookieValue, JWT_SECRET) as any;
    
    // Get user details from database
    const { data: user, error } = await supabase
      .from('users')
      .select('email, id, email_verified, subscription_tier')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return null;
    }

    return {
      email: user.email,
      userId: user.id,
      role: decoded.role || 'user',
      verified: user.email_verified || false,
      subscriptionTier: user.subscription_tier
    };
  } catch (error) {
    console.error('Session cookie validation error:', error);
    return null;
  }
}

// Validate Supabase token
async function validateSupabaseToken(token: string): Promise<UserSession | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    // Get user details from database
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('email, id, email_verified, subscription_tier')
      .eq('id', user.id)
      .single();

    if (dbError || !userData) {
      return null;
    }

    return {
      email: userData.email,
      userId: userData.id,
      role: 'user',
      verified: userData.email_verified || false,
      subscriptionTier: userData.subscription_tier
    };
  } catch (error) {
    console.error('Supabase token validation error:', error);
    return null;
  }
}

// Check if user is authorized for required level
function isAuthorized(session: UserSession, requiredLevel: AuthLevel): boolean {
  switch (requiredLevel) {
    case AuthLevel.NONE:
      return true;
    case AuthLevel.USER:
      return session.role === 'user' || session.role === 'admin' || session.role === 'system';
    case AuthLevel.ADMIN:
      return session.role === 'admin' || session.role === 'system';
    case AuthLevel.SYSTEM:
      return session.role === 'system';
    default:
      return false;
  }
}

// Pre-configured auth middleware
export const requireUser = withAuth(AuthLevel.USER);
export const requireAdmin = withAuth(AuthLevel.ADMIN);
export const requireSystem = withAuth(AuthLevel.SYSTEM);
export const requireVerifiedUser = withAuth(AuthLevel.USER, { requireEmailVerification: true });
export const requirePremiumUser = withAuth(AuthLevel.USER, { requireSubscription: 'premium' });

// Public endpoints (no auth required)
export const publicEndpoint = withAuth(AuthLevel.NONE);

// Generate JWT token for user
export function generateUserToken(userId: string, role: string = 'user'): string {
  return jwt.sign(
    { userId, role, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Generate session cookie
export function generateSessionCookie(userId: string, role: string = 'user'): string {
  return jwt.sign(
    { userId, role, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Generate API key for user
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'jpk_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Validate email verification token
export async function validateEmailToken(token: string): Promise<{ email: string; valid: boolean }> {
  try {
    const { data, error } = await supabase
      .from('email_verification_tokens')
      .select('email, expires_at')
      .eq('token', token)
      .single();

    if (error || !data) {
      return { email: '', valid: false };
    }

    if (new Date(data.expires_at) < new Date()) {
      return { email: data.email, valid: false };
    }

    return { email: data.email, valid: true };
  } catch (error) {
    console.error('Email token validation error:', error);
    return { email: '', valid: false };
  }
}

// Rate limiting with authentication
export async function withAuthAndRateLimit(
  req: NextRequest,
  endpoint: string,
  requiredLevel: AuthLevel = AuthLevel.USER,
  handler: (req: NextRequest, session: UserSession | null) => Promise<NextResponse>
): Promise<NextResponse> {
  // First check rate limit
  const { withRateLimit } = await import('@/Utils/productionRateLimiter');
  const rateLimitResponse = await withRateLimit(req, endpoint);
  
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  // Then check authentication
  return withAuth(requiredLevel)(req, handler);
}
