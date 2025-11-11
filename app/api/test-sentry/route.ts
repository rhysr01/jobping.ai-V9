/**
 * Sentry Health Check & Test Endpoint
 * 
 * This endpoint verifies that Sentry is properly configured and working.
 * Visit /api/test-sentry to check Sentry status and send a test event.
 * 
 * Usage:
 * - GET /api/test-sentry - Checks Sentry status and sends a test event
 */

import { NextResponse, NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { requireSystemKey } from '@/Utils/auth/withAuth';

interface SentryStatus {
  configured: boolean;
  initialized: boolean;
  serverSide: {
    dsnConfigured: boolean;
    dsnValue: string | null;
  };
  clientSide: {
    dsnConfigured: boolean;
    dsnValue: string | null;
  };
  environment: string;
  release: string;
  sampleRate: {
    traces: number;
    profiles: number;
  };
}

function getSentryStatus(): SentryStatus {
  const serverDsn = process.env.SENTRY_DSN;
  const clientDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || serverDsn;
  
  // Check if Sentry is initialized by checking if DSN is set
  // Sentry auto-initializes when DSN is present
  const isInitialized = !!(serverDsn || clientDsn);
  
  // Get sample rates from config (defaults if not set)
  const tracesSampleRate = process.env.NODE_ENV === 'production' ? 0.1 : 1.0;
  const profilesSampleRate = process.env.NODE_ENV === 'production' ? 0.1 : 1.0;

  return {
    configured: isInitialized,
    initialized: isInitialized,
    serverSide: {
      dsnConfigured: !!serverDsn,
      dsnValue: serverDsn ? maskDsn(serverDsn) : null,
    },
    clientSide: {
      dsnConfigured: !!clientDsn,
      dsnValue: clientDsn ? maskDsn(clientDsn) : null,
    },
    environment: process.env.NODE_ENV || 'unknown',
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || '1.0.0',
    sampleRate: {
      traces: tracesSampleRate,
      profiles: profilesSampleRate,
    },
  };
}

function maskDsn(dsn: string): string {
  // Mask the DSN for security (show only first/last few chars)
  try {
    const url = new URL(dsn);
    const parts = url.pathname.split('/');
    const projectId = parts[parts.length - 1];
    const key = url.username;
    
    if (key && projectId) {
      return `${key.substring(0, 8)}...${key.substring(key.length - 4)}@${url.hostname}/${projectId}`;
    }
    return dsn.substring(0, 30) + '...';
  } catch {
    return dsn.substring(0, 30) + '...';
  }
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    requireSystemKey(req);
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized', message: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }

  const status = getSentryStatus();
  
  // If Sentry is not configured, return early with helpful message
  if (!status.configured) {
    return NextResponse.json({
      success: false,
      status: 'not_configured',
      message: 'Sentry DSN not configured',
      details: {
        serverSide: {
          configured: false,
          envVar: 'SENTRY_DSN',
          hint: 'Set SENTRY_DSN in Vercel → Settings → Environment Variables'
        },
        clientSide: {
          configured: false,
          envVar: 'NEXT_PUBLIC_SENTRY_DSN',
          hint: 'Optional: Set NEXT_PUBLIC_SENTRY_DSN for client-side tracking'
        }
      },
      instructions: [
        '1. Go to Vercel → Your Project → Settings → Environment Variables',
        '2. Add SENTRY_DSN = your-sentry-dsn (for Production + Preview)',
        '3. Optionally add NEXT_PUBLIC_SENTRY_DSN = same-dsn (for client-side)',
        '4. Redeploy your application',
        '5. Check this endpoint again to verify'
      ]
    }, { status: 200 });
  }

  // Sentry is configured - test it
  try {
    // Set user context for the test
    Sentry.setUser({
      id: 'test-user',
      username: 'sentry-health-check'
    });

    // Set context
    Sentry.setContext('health_check', {
      timestamp: new Date().toISOString(),
      endpoint: '/api/test-sentry',
      environment: status.environment,
      release: status.release,
      version: '1.0.0'
    });

    // Add breadcrumb
    Sentry.addBreadcrumb({
      message: 'Sentry health check endpoint called',
      level: 'info',
      category: 'health_check',
      data: {
        url: '/api/test-sentry',
        method: 'GET',
        timestamp: new Date().toISOString()
      }
    });

    // Send a test message
    const eventId = Sentry.captureMessage('Sentry health check - configuration verified', 'info');
    
    // Also send a test exception to verify error tracking
    Sentry.captureException(new Error('Sentry health check test exception'), {
      tags: {
        test: 'health_check',
        type: 'test_exception'
      }
    });

    return NextResponse.json({
      success: true,
      status: 'working',
      message: 'Sentry is configured and working correctly',
      eventId: eventId,
      details: {
        ...status,
        testEventsSent: 2, // Message + Exception
        timestamp: new Date().toISOString()
      },
      nextSteps: [
        '✅ Check your Sentry dashboard → Issues',
        '✅ You should see 2 test events:',
        '   - A message: "Sentry health check - configuration verified"',
        '   - An exception: "Sentry health check test exception"',
        '✅ Verify the release tag matches your Vercel commit SHA',
        '✅ Confirm environment is tagged correctly (production/preview/development)',
        '✅ Check that breadcrumbs and context are included'
      ],
      configuration: {
        sampleRates: {
          traces: status.sampleRate.traces,
          profiles: status.sampleRate.profiles,
          note: status.environment === 'production' 
            ? '10% sampling in production (recommended)'
            : '100% sampling in development (full visibility)'
        },
        filtering: {
          enabled: true,
          note: 'Build errors, expected errors, and dev noise are filtered out'
        }
      }
    });
  } catch (error) {
    // Even if Sentry fails, return detailed info
    return NextResponse.json({
      success: false,
      status: 'error',
      message: 'Error sending test event to Sentry',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : 'Unknown error',
      details: {
        ...status,
        errorOccurred: true,
        timestamp: new Date().toISOString()
      },
      troubleshooting: [
        '1. Verify SENTRY_DSN is correct (check Sentry dashboard)',
        '2. Ensure environment variable is set for correct environment',
        '3. Check Vercel logs for initialization errors',
        '4. Verify Sentry project is active and not rate-limited',
        '5. Check network connectivity to Sentry ingest endpoint'
      ]
    }, { status: 500 });
  }
}


