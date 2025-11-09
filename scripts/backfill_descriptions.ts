/**
 * Backfill missing job descriptions
 * Attempts to fetch from job_url or generates placeholder
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getDatabaseClient } from '@/Utils/databasePool';

const BATCH_SIZE = 100;
const PLACEHOLDER_DESCRIPTION = 'Description not available. See job posting for details.';

async function backfillDescriptions() {
  const supabase = getDatabaseClient();
  
  console.log('Starting description backfill...');
  
  let offset = 0;
  let totalUpdated = 0;
  
  while (true) {
    // Fetch jobs with missing descriptions
    const { data: jobs, error: fetchError } = await supabase
      .from('jobs')
      .select('id, job_url, description, title, company')
      .eq('is_active', true)
      .or('description.is.null,description.eq.')
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
    
    console.log(`\nProcessing batch: ${jobs.length} jobs (offset: ${offset})`);
    
    const updates: Array<{ id: number; description: string }> = [];
    
    for (const job of jobs) {
      let newDescription = job.description;
      
      // If description is missing or empty
      if (!newDescription || newDescription.trim() === '') {
        // TODO: In future, could attempt to fetch from job_url
        // For now, use placeholder
        newDescription = PLACEHOLDER_DESCRIPTION;
        
        updates.push({
          id: job.id,
          description: newDescription
        });
      }
    }
    
    // Batch update
    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ 
            description: update.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);
        
        if (updateError) {
          console.error(`Error updating job ${update.id}:`, updateError);
        } else {
          totalUpdated++;
        }
      }
      
      console.log(`✓ Updated ${updates.length} jobs in this batch`);
    }
    
    offset += BATCH_SIZE;
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n=== Description Backfill Complete ===');
  console.log(`Total jobs updated: ${totalUpdated}`);
}

// Run if executed directly
if (require.main === module) {
  backfillDescriptions()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { backfillDescriptions };

