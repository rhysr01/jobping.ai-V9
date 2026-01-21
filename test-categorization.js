const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simple categorization function
function categorizeJob(title, description = '') {
  const text = `${title} ${description}`.toLowerCase();
  const categories = ['early-career']; // Keep existing

  // Add tech categories
  if (text.includes('software') || text.includes('developer') || text.includes('engineer')) {
    categories.push('tech-transformation');
  }
  if (text.includes('data') || text.includes('analyst')) {
    categories.push('data-analytics');
  }

  return [...new Set(categories)]; // Remove duplicates
}

async function testCategorization() {
  console.log('🧪 Testing job categorization...\n');

  try {
    // Get one job that might be tech-related
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, title, description, categories')
      .eq('is_active', true)
      .eq('status', 'active')
      .ilike('title', '%analyst%')
      .limit(1);

    if (error || !jobs || jobs.length === 0) {
      console.log('No analyst jobs found');
      return;
    }

    const job = jobs[0];
    console.log('Original job:');
    console.log(`  Title: ${job.title}`);
    console.log(`  Categories: ${JSON.stringify(job.categories)}`);

    // Categorize it
    const newCategories = categorizeJob(job.title, job.description);
    console.log(`  New categories: ${JSON.stringify(newCategories)}`);

    // Update if changed
    if (JSON.stringify(job.categories) !== JSON.stringify(newCategories)) {
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ categories: newCategories })
        .eq('id', job.id);

      if (updateError) {
        console.error('Update error:', updateError);
      } else {
        console.log('✅ Job updated successfully');
      }
    } else {
      console.log('No changes needed');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testCategorization();