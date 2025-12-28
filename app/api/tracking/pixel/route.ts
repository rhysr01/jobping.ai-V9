/**
 * EMAIL TRACKING PIXEL ENDPOINT
 * Returns a 1x1 transparent PNG and records 'shown' signal for email impressions
 * Used in email templates as: <img src="/api/tracking/pixel?jobHash=...&email=...&token=..." />
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { verifySecureToken } from '@/Utils/auth/secureTokens';

// 1x1 transparent PNG (base64)
const TRANSPARENT_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobHash = searchParams.get('jobHash');
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    // Verify token if provided (for security)
    if (token && email) {
      const verification = verifySecureToken(email, token, 'match_evidence');
      if (!verification.valid) {
        // Still return pixel, but don't track (invalid token)
        return new NextResponse(TRANSPARENT_PIXEL, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      }
    }

    // Record 'shown' signal if we have required data
    if (jobHash && email) {
      // Deduplicate: Check if we've already recorded 'shown' for this job+user in last 24h
      const supabase = getDatabaseClient();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: existing } = await supabase
        .from('implicit_signals')
        .select('id')
        .eq('user_email', email)
        .eq('job_hash', jobHash)
        .eq('signal_type', 'shown')
        .gte('created_at', twentyFourHoursAgo)
        .limit(1)
        .single();

      // Only record if not already recorded in last 24h (deduplication)
      if (!existing) {
        // Record to implicit_signals table
        const { error: insertError } = await supabase
          .from('implicit_signals')
          .insert({
            user_email: email,
            job_hash: jobHash,
            signal_type: 'shown',
            source: 'email',
            timestamp: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
        
        if (insertError) {
          // Fail silently - tracking is not critical
          console.warn('Failed to record shown signal:', insertError);
        }

        // Also record to match_logs for CTR calculation
        const { error: matchLogsError } = await supabase
          .from('match_logs')
          .insert({
            user_email: email,
            job_hash: jobHash,
            match_score: 0,
            match_reason: 'Match shown to user (email)',
            match_quality: 'neutral',
            match_tags: {
              signal_type: 'shown',
              source: 'email',
              implicit_signal: true
            },
            matched_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            match_algorithm: 'implicit_tracking',
            ai_model: null,
            prompt_version: null,
            ai_latency_ms: null,
            ai_cost_usd: null,
            cache_hit: false,
            fallback_reason: null
          });
        
        if (matchLogsError) {
          // Fail silently - tracking is not critical
          console.warn('Failed to record shown signal to match_logs:', matchLogsError);
        }
      }
    }

    // Return 1x1 transparent PNG
    return new NextResponse(TRANSPARENT_PIXEL, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    // Always return pixel even on error (to prevent broken images in email)
    return new NextResponse(TRANSPARENT_PIXEL, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

