const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLondonTechJobs() {
  console.log('🔍 Checking for London jobs with tech categories...\n');

  try {
    // Check for jobs that are both in London AND have tech categories
    const { data: londonTechJobs, error } = await supabase
      .from('jobs')
      .select('id, title, company, city, categories')
      .eq('is_active', true)
      .eq('status', 'active')
      .ilike('city', '%london%')
      .contains('categories', ['tech-transformation']);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(`London + Tech jobs found: ${londonTechJobs.length}`);
    londonTechJobs.forEach(job => {
      console.log(`   ${job.title} @ ${job.company}`);
      console.log(`   Categories: ${JSON.stringify(job.categories)}`);
      console.log('');
    });

    // Also check how many London jobs total
    const { data: allLondonJobs, error: londonError } = await supabase
      .from('jobs')
      .select('id', { count: 'exact' })
      .eq('is_active', true)
      .eq('status', 'active')
      .ilike('city', '%london%');

    if (londonError) {
      console.error('London count error:', londonError);
    } else {
      console.log(`Total London jobs: ${allLondonJobs.length}`);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkLondonTechJobs();