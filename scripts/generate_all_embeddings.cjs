#!/usr/bin/env node
/**
 * Generate embeddings for all jobs in the queue
 * Standalone script that can be run via: node scripts/generate_all_embeddings.cjs
 */

// Load environment variables FIRST
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });

console.log('✅ Environment loaded');
console.log(`📊 Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}`);
console.log(`📊 Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'}`);
console.log(`📊 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Set' : 'Missing'}`);

async function generateAllEmbeddings() {
  console.log('\n🚀 Starting embedding generation...');
  const startTime = Date.now();
  
  try {
    // Dynamically import after env is loaded
    // Note: This requires tsx or ts-node to run TypeScript files
    // For pure Node.js, use: npx tsx scripts/generate_all_embeddings.ts
    const { embeddingService } = await import('../Utils/matching/embedding.service');
    const { getDatabaseClient } = await import('../Utils/databasePool');
    
    const supabase = getDatabaseClient();
    const BATCH_SIZE = 100; // Process 100 jobs at a time
    let totalProcessed = 0;
    let totalFailed = 0;
    let hasMore = true;
    
    // Get initial queue count
    const { count: initialCount } = await supabase
      .from('embedding_queue')
      .select('*', { count: 'exact', head: true })
      .is('processed_at', null);
    
    console.log(`📊 Found ${initialCount || 0} jobs in queue\n`);
    
    if (!initialCount || initialCount === 0) {
      console.log('✅ No jobs in queue - all done!');
      process.exit(0);
    }
    
    let batchNum = 0;
    
    while (hasMore) {
      batchNum++;
      
      // Fetch jobs from queue that need embeddings
      const { data: queueItems, error: queueError } = await supabase
        .from('embedding_queue')
        .select('job_hash, job_id')
        .is('processed_at', null)
        .order('created_at', { ascending: true })
        .limit(BATCH_SIZE);
      
      if (queueError) {
        console.error('❌ Error fetching queue:', queueError);
        throw queueError;
      }
      
      if (!queueItems || queueItems.length === 0) {
        hasMore = false;
        break;
      }
      
      console.log(`\n🔄 Batch ${batchNum}: Processing ${queueItems.length} jobs...`);
      
      // Fetch the actual job data
      const jobHashes = queueItems.map(item => item.job_hash);
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .in('job_hash', jobHashes)
        .eq('is_active', true);
      
      if (jobsError) {
        console.error('❌ Error fetching jobs:', jobsError);
        throw jobsError;
      }
      
      if (!jobs || jobs.length === 0) {
        // Mark queue items as processed (jobs may have been deleted)
        await supabase
          .from('embedding_queue')
          .update({ processed_at: new Date().toISOString() })
          .in('job_hash', jobHashes);
        
        console.log('⚠️  No active jobs found for queue items, marked as processed');
        continue;
      }
      
      console.log(`   📝 Generating embeddings for ${jobs.length} jobs...`);
      
      // Generate embeddings
      const embeddings = await embeddingService.batchGenerateJobEmbeddings(jobs);
      
      console.log(`   💾 Storing ${embeddings.size} embeddings...`);
      
      // Store embeddings
      await embeddingService.storeJobEmbeddings(embeddings);
      
      // Mark successfully processed items
      const processedHashes = Array.from(embeddings.keys());
      for (const hash of processedHashes) {
        await supabase.rpc('mark_embedding_processed', { job_hash_param: hash });
      }
      
      // Mark failed items
      const failedHashes = jobHashes.filter(hash => !processedHashes.includes(hash));
      for (const hash of failedHashes) {
        await supabase.rpc('mark_embedding_failed', {
          job_hash_param: hash,
          error_msg: 'Failed to generate embedding'
        });
      }
      
      totalProcessed += embeddings.size;
      totalFailed += failedHashes.length;
      
      console.log(`   ✅ Processed: ${embeddings.size}, Failed: ${failedHashes.length}`);
      console.log(`   📈 Total so far: ${totalProcessed} processed, ${totalFailed} failed`);
      
      // Check remaining count
      const { count: remainingCount } = await supabase
        .from('embedding_queue')
        .select('*', { count: 'exact', head: true })
        .is('processed_at', null);
      
      console.log(`   📊 Remaining in queue: ${remainingCount || 0}`);
      
      // Small delay between batches to avoid rate limits
      if (queueItems.length === BATCH_SIZE && remainingCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        hasMore = false; // Last batch or no more items
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Get final coverage stats
    const coverage = await embeddingService.checkEmbeddingCoverage();
    
    console.log('\n✅ Embedding generation complete!');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📊 Results:`);
    console.log(`   - Processed: ${totalProcessed} jobs`);
    console.log(`   - Failed: ${totalFailed} jobs`);
    console.log(`   - Coverage: ${coverage.percentCovered}% (${coverage.withEmbeddings}/${coverage.totalActive})`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run
generateAllEmbeddings();

