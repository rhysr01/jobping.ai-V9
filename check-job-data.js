require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'set' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJobData() {
  console.log('🔍 Checking real production job data...\n');

  try {
    // Check total jobs
    const { data: allJobs, error: countError } = await supabase
      .from('jobs')
      .select('id', { count: 'exact' })
      .eq('is_active', true)
      .eq('status', 'active');

    if (countError) {
      console.error('Error counting jobs:', countError);
      return;
    }

    console.log(`📊 Total active jobs: ${allJobs.length}\n`);

    // Check sample of job data structure
    const { data: sampleJobs, error: sampleError } = await supabase
      .from('jobs')
      .select('id, title, company, location, city, country, categories, experience_required')
      .eq('is_active', true)
      .eq('status', 'active')
      .limit(10);

    if (sampleError) {
      console.error('Error fetching sample jobs:', sampleError);
      return;
    }

    console.log('📋 Sample job data structure:');
    sampleJobs.forEach((job, i) => {
      console.log(`${i + 1}. ${job.title} @ ${job.company}`);
      console.log(`   Location: ${job.location} | City: ${job.city} | Country: ${job.country}`);
      console.log(`   Categories: ${JSON.stringify(job.categories)}`);
      console.log(`   Experience: ${job.experience_required}`);
      console.log('');
    });

    // Check category distribution
    const { data: categoryData, error: catError } = await supabase
      .rpc('get_category_distribution');

    if (catError) {
      console.log('❌ Category distribution RPC not available, using fallback query...');

      // Fallback: count jobs by category
      const { data: catJobs, error: catFallbackError } = await supabase
        .from('jobs')
        .select('categories')
        .eq('is_active', true)
        .eq('status', 'active')
        .not('categories', 'is', null);

      if (catFallbackError) {
        console.error('Error fetching categories:', catFallbackError);
      } else {
        const categoryCounts = {};
        catJobs.forEach(job => {
          if (job.categories && Array.isArray(job.categories)) {
            job.categories.forEach(cat => {
              categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
          }
        });

        console.log('📈 Category distribution:');
        Object.entries(categoryCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .forEach(([cat, count]) => {
            console.log(`   ${cat}: ${count} jobs`);
          });
      }
    } else {
      console.log('📈 Category distribution from RPC:');
      categoryData.forEach(row => {
        console.log(`   ${row.category}: ${row.count} jobs`);
      });
    }

    // Check location distribution
    const { data: locationData, error: locError } = await supabase
      .from('jobs')
      .select('city, country')
      .eq('is_active', true)
      .eq('status', 'active')
      .not('city', 'is', null)
      .limit(100);

    if (locError) {
      console.error('Error fetching locations:', locError);
    } else {
      const locationCounts = {};
      locationData.forEach(job => {
        const key = `${job.city}, ${job.country}`;
        locationCounts[key] = (locationCounts[key] || 0) + 1;
      });

      console.log('\n📍 Top locations:');
      Object.entries(locationCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([location, count]) => {
          console.log(`   ${location}: ${count} jobs`);
        });
    }

    // Check for London jobs specifically
    const { data: londonJobs, error: londonError } = await supabase
      .from('jobs')
      .select('id, title, company, city, categories')
      .eq('is_active', true)
      .eq('status', 'active')
      .ilike('city', '%london%')
      .limit(5);

    if (londonError) {
      console.error('Error fetching London jobs:', londonError);
    } else {
      console.log(`\n🇬🇧 London jobs found: ${londonJobs.length}`);
      londonJobs.forEach(job => {
        console.log(`   ${job.title} @ ${job.company} - Categories: ${JSON.stringify(job.categories)}`);
      });
    }

    // Check for tech-related jobs
    const { data: techJobs, error: techError } = await supabase
      .from('jobs')
      .select('id, title, categories')
      .eq('is_active', true)
      .eq('status', 'active')
      .contains('categories', ['tech'])
      .limit(5);

    if (techError) {
      console.error('Error fetching tech jobs:', techError);
    } else {
      console.log(`\n💻 Tech jobs found: ${techJobs.length}`);
      techJobs.forEach(job => {
        console.log(`   ${job.title} - Categories: ${JSON.stringify(job.categories)}`);
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkJobData();