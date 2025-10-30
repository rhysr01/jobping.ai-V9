/**
 * API endpoint for generating job embeddings
 * Processes jobs in batches and stores embeddings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { embeddingService } from '@/Utils/matching/embedding.service';
import { verifyHMAC } from '@/Utils/auth/hmac';

export async function POST(req: NextRequest) {
  try {
    // Verify HMAC authentication
    const signature = req.headers.get('x-jobping-signature');
    const timestamp = req.headers.get('x-jobping-timestamp');
    
    if (!signature || !timestamp) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { batchSize = 100, jobLimit = 1000 } = body;

    const supabase = getDatabaseClient();

    // Get jobs without embeddings
    const { data: jobs, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('is_active', true)
      .is('embedding', null)
      .limit(jobLimit);

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch jobs', details: fetchError },
        { status: 500 }
      );
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        message: 'No jobs need embeddings',
        processed: 0
      });
    }

    console.log(`Generating embeddings for ${jobs.length} jobs`);

    // Generate embeddings in batches
    const embeddings = await embeddingService.batchGenerateJobEmbeddings(
      jobs as any[]
    );

    // Store embeddings
    await embeddingService.storeJobEmbeddings(embeddings);

    // Get coverage stats
    const coverage = await embeddingService.checkEmbeddingCoverage();

    return NextResponse.json({
      message: 'Embeddings generated successfully',
      processed: embeddings.size,
      totalJobs: coverage.total,
      withEmbeddings: coverage.withEmbeddings,
      coverage: `${(coverage.coverage * 100).toFixed(1)}%`
    });
  } catch (error) {
    console.error('Embedding generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate embeddings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const coverage = await embeddingService.checkEmbeddingCoverage();

    return NextResponse.json({
      total: coverage.total,
      withEmbeddings: coverage.withEmbeddings,
      coverage: `${(coverage.coverage * 100).toFixed(1)}%`,
      needsEmbeddings: coverage.total - coverage.withEmbeddings
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check coverage' },
      { status: 500 }
    );
  }
}

