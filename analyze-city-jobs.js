#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeCityJobs() {
  console.log('🔍 Analyzing job distribution by city...\n');

  try {
    // Get total job count
    const { count: totalJobs, error: countError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error getting total count:', countError);
      return;
    }

    console.log(`📊 Total jobs in database: ${totalJobs}\n`);

    // Get jobs by city with counts
    const { data: cityData, error: cityError } = await supabase
      .from('jobs')
      .select('location, is_early_career, is_eu, source')
      .not('location', 'is', null);

    if (cityError) {
      console.error('❌ Error getting city data:', cityError);
      return;
    }

    // Process the data
    const cityStats = {};
    const sourceStats = {};
    const earlyCareerStats = { total: 0, eu: 0 };
    const euStats = { total: 0 };

    cityData.forEach(job => {
      const location = job.location || 'Unknown';
      const source = job.source || 'Unknown';
      
      // City stats
      if (!cityStats[location]) {
        cityStats[location] = {
          total: 0,
          earlyCareer: 0,
          eu: 0,
          sources: {}
        };
      }
      
      cityStats[location].total++;
      if (job.is_early_career) cityStats[location].earlyCareer++;
      if (job.is_eu) cityStats[location].eu++;
      
      // Source tracking per city
      if (!cityStats[location].sources[source]) {
        cityStats[location].sources[source] = 0;
      }
      cityStats[location].sources[source]++;

      // Overall stats
      if (!sourceStats[source]) sourceStats[source] = 0;
      sourceStats[source]++;
      
      if (job.is_early_career) earlyCareerStats.total++;
      if (job.is_early_career && job.is_eu) earlyCareerStats.eu++;
      if (job.is_eu) euStats.total++;
    });

    // Sort cities by job count
    const sortedCities = Object.entries(cityStats)
      .sort(([,a], [,b]) => b.total - a.total);

    console.log('🏙️  TOP CITIES BY JOB COUNT:');
    console.log('=' .repeat(80));
    console.log('City'.padEnd(25) + 'Total'.padEnd(8) + 'Early Career'.padEnd(15) + 'EU'.padEnd(8) + 'Sources');
    console.log('-'.repeat(80));

    sortedCities.slice(0, 20).forEach(([city, stats]) => {
      const sources = Object.entries(stats.sources)
        .sort(([,a], [,b]) => b - a)
        .map(([source, count]) => `${source}(${count})`)
        .join(', ');
      
      console.log(
        city.padEnd(25) + 
        stats.total.toString().padEnd(8) + 
        stats.earlyCareer.toString().padEnd(15) + 
        stats.eu.toString().padEnd(8) + 
        sources
      );
    });

    console.log('\n📈 SOURCE BREAKDOWN:');
    console.log('=' .repeat(40));
    Object.entries(sourceStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([source, count]) => {
        const percentage = ((count / totalJobs) * 100).toFixed(1);
        console.log(`${source.padEnd(20)} ${count.toString().padEnd(8)} (${percentage}%)`);
      });

    console.log('\n🎯 EARLY CAREER & EU STATS:');
    console.log('=' .repeat(40));
    console.log(`Total Early Career Jobs: ${earlyCareerStats.total} (${((earlyCareerStats.total / totalJobs) * 100).toFixed(1)}%)`);
    console.log(`EU Early Career Jobs: ${earlyCareerStats.eu} (${((earlyCareerStats.eu / totalJobs) * 100).toFixed(1)}%)`);
    console.log(`Total EU Jobs: ${euStats.total} (${((euStats.total / totalJobs) * 100).toFixed(1)}%)`);

    // Show cities with most early career jobs
    console.log('\n🎓 TOP CITIES FOR EARLY CAREER JOBS:');
    console.log('=' .repeat(60));
    console.log('City'.padEnd(25) + 'Early Career'.padEnd(15) + 'EU Early Career');
    console.log('-'.repeat(60));
    
    sortedCities
      .filter(([,stats]) => stats.earlyCareer > 0)
      .sort(([,a], [,b]) => b.earlyCareer - a.earlyCareer)
      .slice(0, 15)
      .forEach(([city, stats]) => {
        console.log(
          city.padEnd(25) + 
          stats.earlyCareer.toString().padEnd(15) + 
          stats.eu.toString()
        );
      });

    // Show some interesting patterns
    console.log('\n🔍 INTERESTING PATTERNS:');
    console.log('=' .repeat(50));
    
    const remoteJobs = cityData.filter(job => 
      job.location && job.location.toLowerCase().includes('remote')
    ).length;
    
    const londonJobs = cityStats['London']?.total || 0;
    const dublinJobs = cityStats['Dublin']?.total || 0;
    const berlinJobs = cityStats['Berlin']?.total || 0;
    
    console.log(`Remote Jobs: ${remoteJobs}`);
    console.log(`London Jobs: ${londonJobs}`);
    console.log(`Dublin Jobs: ${dublinJobs}`);
    console.log(`Berlin Jobs: ${berlinJobs}`);

  } catch (error) {
    console.error('❌ Error analyzing database:', error);
  }
}

analyzeCityJobs();
