const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugTestJobs() {
  console.log('🔍 Debugging test job fetching...\n');

  try {
    // Replicate the exact query from fetchRealTestJobs
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("is_active", true)
      .eq("status", "active")
      .gte("created_at", sixtyDaysAgo.toISOString())
      .or(
        "is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching jobs:', error);
      return;
    }

    console.log(`📊 Fetched ${jobs.length} jobs for testing\n`);

    // Show sample of job titles
    console.log('📋 Sample job titles:');
    jobs.slice(0, 10).forEach((job, i) => {
      console.log(`   ${i + 1}. ${job.title} (${job.city || 'No city'})`);
    });
    console.log('');

    // Check categories in these jobs
    const categories = {};
    jobs.forEach(job => {
      if (job.categories && Array.isArray(job.categories)) {
        job.categories.forEach(cat => {
          categories[cat] = (categories[cat] || 0) + 1;
        });
      }
    });

    console.log('📈 Categories in test jobs:');
    Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count} jobs`);
      });

    // Check for tech categories specifically
    const techJobs = jobs.filter(job =>
      job.categories &&
      Array.isArray(job.categories) &&
      (job.categories.includes('tech-transformation') || job.categories.includes('data-analytics'))
    );

    console.log(`\n💻 Tech-related jobs in test set: ${techJobs.length}`);

    if (techJobs.length > 0) {
      techJobs.forEach(job => {
        console.log(`   ${job.title} - ${JSON.stringify(job.categories)}`);
      });
    }

    // Check London jobs
    const londonJobs = jobs.filter(job => job.city && job.city.toLowerCase().includes('london'));
    console.log(`\n🇬🇧 London jobs in test set: ${londonJobs.length}`);

    if (londonJobs.length > 0) {
      londonJobs.forEach(job => {
        console.log(`   ${job.title} @ ${job.company} - ${job.city} - ${JSON.stringify(job.categories)}`);
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

debugTestJobs();