/**
 * Test endpoint for previewing email templates in E2E tests
 * This endpoint is only available in development/test environments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createWelcomeEmail, createJobMatchesEmail } from '@/Utils/email/templates';

export async function POST(request: NextRequest) {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_TEST_ENDPOINTS !== 'true') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { type, userName, matchCount, matches } = body;

    let html = '';

    if (type === 'welcome') {
      html = createWelcomeEmail(userName, matchCount);
    } else if (type === 'job-matches') {
      html = createJobMatchesEmail(
        matches || [],
        userName,
        'free',
        false
      );
    } else {
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Email preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate email preview' },
      { status: 500 }
    );
  }
}
