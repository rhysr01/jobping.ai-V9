// 🔒 AUTHENTICATION & AUTHORIZATION WRAPPER
// Phase 0: Lock the doors - prevent abuse and misconfig

import { NextRequest, NextResponse } from 'next/server';

interface AuthOptions {
  requireSystemKey?: boolean;
  allowedMethods?: string[];
  rateLimit?: boolean;
}

interface AuthContext {
  isSystem: boolean;
  isAuthenticated: boolean;
  userEmail?: string;
  userId?: string;
}

export function withAuth(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { requireSystemKey = false, allowedMethods = ['GET'], rateLimit = true } = options;

    // 1. METHOD CHECK
    if (!allowedMethods.includes(request.method)) {
      return NextResponse.json(
        { error: 'Method not allowed', allowed: allowedMethods },
        { status: 405 }
      );
    }

    // 2. SYSTEM KEY CHECK (for automation endpoints)
    if (requireSystemKey) {
      const systemKey = request.headers.get('x-system-api-key') || 
                       request.headers.get('authorization')?.replace('Bearer ', '');
      
      const expectedSystemKey = process.env.SYSTEM_API_KEY;
      
      if (!expectedSystemKey) {
        console.error('❌ SYSTEM_API_KEY not configured');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      // Allow internal Vercel calls (same deployment calling itself)
      const isInternalCall = request.headers.get('x-vercel-deployment-url') || 
                            request.headers.get('x-forwarded-host')?.includes('vercel.app');

      if (!systemKey || systemKey !== expectedSystemKey) {
        if (isInternalCall) {
          console.log('✅ Allowing internal Vercel call');
        } else {
          console.warn(`🚫 Unauthorized system access attempt from ${request.headers.get('x-forwarded-for') || 'unknown'}`);
          console.warn(`   Received key: ${systemKey?.substring(0, 10)}...`);
          console.warn(`   Expected key: ${expectedSystemKey?.substring(0, 10)}...`);
          return NextResponse.json(
            { error: 'Unauthorized', message: 'System API key required' },
            { status: 401 }
          );
        }
      }
    }

    // 3. RATE LIMITING (if enabled)
    if (rateLimit) {
      // Basic rate limiting - could be enhanced with Redis/memory store
      const rateLimitKey = request.headers.get('x-forwarded-for') || 
                          request.headers.get('x-real-ip') || 
                          'unknown';
      
      // For now, just log rate limit attempts
      console.log(`📊 Rate limit check for ${rateLimitKey} on ${request.url}`);
    }

    // 4. BUILD AUTH CONTEXT
    const context: AuthContext = {
      isSystem: requireSystemKey,
      isAuthenticated: false, // TODO: Add JWT verification if needed
      userEmail: undefined,
      userId: undefined
    };

    // 5. CALL THE ACTUAL HANDLER
    try {
      return await handler(request, context);
    } catch (error) {
      console.error('❌ Auth wrapper error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// 🔒 PRODUCTION SECRET VALIDATION
export function validateProductionSecrets(): { ready: boolean; errors: string[] } {
  const errors: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const requiredSecrets = [
      'UNSUBSCRIBE_SECRET',
      'RESEND_WEBHOOK_SECRET',
      'SYSTEM_API_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_SUPABASE_URL'
    ];

    for (const secret of requiredSecrets) {
      if (!process.env[secret]) {
        errors.push(`Missing required secret: ${secret}`);
      }
    }
  }

  return {
    ready: errors.length === 0,
    errors
  };
}

// 🔒 ENVIRONMENT HYGIENE CHECK
export function validateEnvHygiene(): { clean: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check for server code using browser env vars
  const serverEnvVars = Object.keys(process.env).filter(key => 
    key.startsWith('NEXT_PUBLIC_') && 
    !key.includes('SUPABASE_URL') // Allow this one
  );

  if (serverEnvVars.length > 0) {
    violations.push(`Server code should not use: ${serverEnvVars.join(', ')}`);
  }

  // Check for misleading names
  const misleadingNames = Object.keys(process.env).filter(key =>
    key.includes('ANON') && key.includes('SERVICE') ||
    key.includes('SERVICE') && key.includes('ANON')
  );

  if (misleadingNames.length > 0) {
    violations.push(`Misleading env names: ${misleadingNames.join(', ')}`);
  }

  return {
    clean: violations.length === 0,
    violations
  };
}
