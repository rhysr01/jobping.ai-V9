import { NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { apiLogger } from '@/lib/api-logger';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getDatabaseClient();

    // Delete free users whose expiration date has passed
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('subscription_tier', 'free') // Use YOUR column name
      .lt('free_expires_at', new Date().toISOString())
      .select('id');

    if (error) throw error;

    const deletedCount = data?.length || 0;
    console.log(`[CLEANUP] ✅ Deleted ${deletedCount} expired free users`);
    apiLogger.info('Cleanup completed', { deletedCount });

    return NextResponse.json({ 
      success: true, 
      deleted: deletedCount 
    });

  } catch (error) {
    console.error('[CLEANUP ERROR]', error);
    apiLogger.error('Cleanup failed', error as Error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}

