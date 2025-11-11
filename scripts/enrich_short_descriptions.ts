/**
 * Enrich short job descriptions (<100 characters)
 * Attempts to fetch from job_url or uses AI to expand based on title/company
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getDatabaseClient } from '@/Utils/databasePool';

const BATCH_SIZE = 50;
const MIN_DESCRIPTION_LENGTH = 100;

async function enrichShortDescriptions() {
  const supabase = getDatabaseClient();
  
  console.log('Starting description enrichment for short descriptions...');
  
  let offset = 0;
  let totalUpdated = 0;
  
  while (true) {
    // Fetch jobs with short descriptions
    const { data: jobs, error: fetchError } = await supabase
      .from('jobs')
      .select('id, job_url, description, title, company')
      .eq('is_active', true)
      .not('description', 'is', null)
      .limit(BATCH_SIZE)
      .range(offset, offset + BATCH_SIZE - 1);
    
    if (fetchError) {
      console.error('Error fetching jobs:', fetchError);
      break;
    }
    
    if (!jobs || jobs.length === 0) {
      console.log('No more jobs to process');
      break;
    }
    
    // Filter to only short descriptions
    const shortJobs = jobs.filter(job => 
      job.description && job.description.length < MIN_DESCRIPTION_LENGTH
    );
    
    if (shortJobs.length === 0) {
      console.log(`No short descriptions in batch at offset ${offset}`);
      offset += BATCH_SIZE;
      continue;
    }
    
    console.log(`\nProcessing batch: ${shortJobs.length} short descriptions (offset: ${offset})`);
    
    const updates: Array<{ id: number; description: string }> = [];
    
    for (const job of shortJobs) {
      // Future improvement: fetch full description from job_url if available
      // 1. Attempt to fetch full description from job_url
      // 2. Use AI to expand description based on title/company
      // For now, we'll just log them for manual review
      
      console.log(`  Job ${job.id}: "${job.title}" at ${job.company} - ${job.description?.length || 0} chars`);
      
      // Could expand with: "We are looking for a [title] to join our team at [company]. [existing description]"
      // But for now, we'll skip automatic expansion to avoid low-quality content
    }
    
    offset += BATCH_SIZE;
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Limit to first 1000 jobs for now
    if (offset >= 1000) {
      console.log('Reached processing limit');
      break;
    }
  }
  
  console.log('\n=== Description Enrichment Complete ===');
  console.log(`Total jobs reviewed: ${totalUpdated}`);
  console.log('Note: Automatic expansion disabled. Review short descriptions manually.');
}

// Run if executed directly
if (require.main === module) {
  enrichShortDescriptions()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { enrichShortDescriptions };

