import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';

export async function POST(request: NextRequest) {
  try {
    const { event, properties } = await request.json();

    const supabase = getDatabaseClient();

    // Store event (optional - or send to Mixpanel/PostHog)
    // Note: You may need to create an analytics_events table if it doesn't exist
    try {
      await supabase.from('analytics_events').insert({
        event_name: event,
        properties,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      // Table might not exist - that's okay, just log
      console.log('[ANALYTICS] Analytics table not found, skipping storage');
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[ANALYTICS ERROR]', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

