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

    // Get jobs by city with counts (only existing columns)
    const { data: cityData, error: cityError } = await supabase
      .from('jobs')
      .select('location, source, title, company, created_at')
      .not('location', 'is', null);

    if (cityError) {
      console.error('❌ Error getting city data:', cityError);
      return;
    }

    // Process the data
    const cityStats = {};
    const sourceStats = {};
    const recentJobs = cityData.filter(job => {
      const createdAt = new Date(job.created_at);
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return createdAt > oneWeekAgo;
    }).length;

    cityData.forEach(job => {
      const location = job.location || 'Unknown';
      const source = job.source || 'Unknown';
      
      // City stats
      if (!cityStats[location]) {
        cityStats[location] = {
          total: 0,
          sources: {},
          companies: new Set(),
          recent: 0
        };
      }
      
      cityStats[location].total++;
      cityStats[location].companies.add(job.company);
      
      // Check if recent
      const createdAt = new Date(job.created_at);
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (createdAt > oneWeekAgo) {
        cityStats[location].recent++;
      }
      
      // Source tracking per city
      if (!cityStats[location].sources[source]) {
        cityStats[location].sources[source] = 0;
      }
      cityStats[location].sources[source]++;

      // Overall stats
      if (!sourceStats[source]) sourceStats[source] = 0;
      sourceStats[source]++;
    });

    // Sort cities by job count
    const sortedCities = Object.entries(cityStats)
      .sort(([,a], [,b]) => b.total - a.total);

    console.log('🏙️  TOP CITIES BY JOB COUNT:');
    console.log('=' .repeat(90));
    console.log('City'.padEnd(25) + 'Total'.padEnd(8) + 'Recent (7d)'.padEnd(12) + 'Companies'.padEnd(10) + 'Sources');
    console.log('-'.repeat(90));

    sortedCities.slice(0, 25).forEach(([city, stats]) => {
      const sources = Object.entries(stats.sources)
        .sort(([,a], [,b]) => b - a)
        .map(([source, count]) => `${source}(${count})`)
        .join(', ');
      
      console.log(
        city.padEnd(25) + 
        stats.total.toString().padEnd(8) + 
        stats.recent.toString().padEnd(12) + 
        stats.companies.size.toString().padEnd(10) + 
        sources
      );
    });

    console.log('\n📈 SOURCE BREAKDOWN:');
    console.log('=' .repeat(50));
    Object.entries(sourceStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([source, count]) => {
        const percentage = ((count / totalJobs) * 100).toFixed(1);
        console.log(`${source.padEnd(20)} ${count.toString().padEnd(8)} (${percentage}%)`);
      });

    console.log('\n📅 RECENT ACTIVITY:');
    console.log('=' .repeat(30));
    console.log(`Jobs added in last 7 days: ${recentJobs} (${((recentJobs / totalJobs) * 100).toFixed(1)}%)`);

    // Show cities with most recent activity
    console.log('\n🆕 TOP CITIES FOR RECENT JOBS (Last 7 days):');
    console.log('=' .repeat(60));
    console.log('City'.padEnd(25) + 'Recent Jobs'.padEnd(15) + 'Total Jobs');
    console.log('-'.repeat(60));
    
    sortedCities
      .filter(([,stats]) => stats.recent > 0)
      .sort(([,a], [,b]) => b.recent - a.recent)
      .slice(0, 15)
      .forEach(([city, stats]) => {
        console.log(
          city.padEnd(25) + 
          stats.recent.toString().padEnd(15) + 
          stats.total.toString()
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
    const parisJobs = cityStats['Paris']?.total || 0;
    const amsterdamJobs = cityStats['Amsterdam']?.total || 0;
    
    console.log(`Remote Jobs: ${remoteJobs}`);
    console.log(`London Jobs: ${londonJobs}`);
    console.log(`Dublin Jobs: ${dublinJobs}`);
    console.log(`Berlin Jobs: ${berlinJobs}`);
    console.log(`Paris Jobs: ${parisJobs}`);
    console.log(`Amsterdam Jobs: ${amsterdamJobs}`);

    // Show unique companies per city
    console.log('\n🏢 CITIES WITH MOST UNIQUE COMPANIES:');
    console.log('=' .repeat(50));
    console.log('City'.padEnd(25) + 'Companies'.padEnd(12) + 'Jobs/Company');
    console.log('-'.repeat(50));
    
    sortedCities
      .sort(([,a], [,b]) => b.companies.size - a.companies.size)
      .slice(0, 10)
      .forEach(([city, stats]) => {
        const jobsPerCompany = (stats.total / stats.companies.size).toFixed(1);
        console.log(
          city.padEnd(25) + 
          stats.companies.size.toString().padEnd(12) + 
          jobsPerCompany
        );
      });

  } catch (error) {
    console.error('❌ Error analyzing database:', error);
  }
}

analyzeCityJobs();
