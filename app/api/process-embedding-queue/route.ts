/**
 * API endpoint to process embedding queue
 * This endpoint should be called periodically (e.g., via cron) to generate embeddings for queued jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { embeddingService } from '@/Utils/matching/embedding.service';

export async function POST(request: NextRequest) {
  try {
    // Vercel Cron sends CRON_SECRET in Authorization header
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const systemKey = process.env.SYSTEM_API_KEY;
    
    // Check if request is authorized (Vercel cron or system API key)
    const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const apiKey = request.headers.get('x-api-key');
    const isSystemKey = systemKey && apiKey === systemKey;
    
    if (!isVercelCron && !isSystemKey) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing authentication' },
        { status: 401 }
      );
    }

    const supabase = getDatabaseClient();
    const BATCH_SIZE = 100; // Process 100 jobs at a time

    // Fetch jobs from queue that need embeddings
    const { data: queueItems, error: queueError } = await supabase
      .from('embedding_queue')
      .select('job_hash, job_id')
      .is('processed_at', null)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (queueError) {
      console.error('Error fetching embedding queue:', queueError);
      return NextResponse.json(
        { error: 'Failed to fetch queue', details: queueError.message },
        { status: 500 }
      );
    }

    if (!queueItems || queueItems.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No jobs in queue'
      });
    }

    // Fetch the actual job data
    const jobHashes = queueItems.map(item => item.job_hash);
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .in('job_hash', jobHashes)
      .eq('is_active', true);

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return NextResponse.json(
        { error: 'Failed to fetch jobs', details: jobsError.message },
        { status: 500 }
      );
    }

    if (!jobs || jobs.length === 0) {
      // Mark queue items as processed (jobs may have been deleted)
      await supabase
        .from('embedding_queue')
        .update({ processed_at: new Date().toISOString() })
        .in('job_hash', jobHashes);

      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No active jobs found for queue items'
      });
    }

    // Generate embeddings
    const embeddings = await embeddingService.batchGenerateJobEmbeddings(jobs as any[]);

    // Store embeddings
    await embeddingService.storeJobEmbeddings(embeddings);

    // Mark successfully processed items
    const processedHashes = Array.from(embeddings.keys());
    for (const hash of processedHashes) {
      await supabase.rpc('mark_embedding_processed', { job_hash_param: hash });
    }

    // Mark failed items (jobs that were in queue but didn't get embeddings)
    const failedHashes = jobHashes.filter(hash => !processedHashes.includes(hash));
    for (const hash of failedHashes) {
      await supabase.rpc('mark_embedding_failed', {
        job_hash_param: hash,
        error_msg: 'Failed to generate embedding'
      });
    }

    return NextResponse.json({
      success: true,
      processed: embeddings.size,
      failed: failedHashes.length,
      totalInQueue: queueItems.length,
      message: `Processed ${embeddings.size} embeddings, ${failedHashes.length} failed`
    });

  } catch (error) {
    console.error('Error processing embedding queue:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check queue status
export async function GET(request: NextRequest) {
  try {
    // Optional: Add HMAC verification for GET requests too
    // For now, allow unauthenticated GET for monitoring

    const supabase = getDatabaseClient();

    const { data: stats, error } = await supabase
      .from('embedding_queue')
      .select('processed_at, retry_count')
      .is('processed_at', null);

    const pending = stats?.length || 0;
    const retries = stats?.filter(s => s.retry_count > 0).length || 0;

    return NextResponse.json({
      pending,
      retries,
      message: `${pending} jobs pending embedding generation`
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}

