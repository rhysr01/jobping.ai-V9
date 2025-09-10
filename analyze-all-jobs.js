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

async function analyzeAllJobs() {
  console.log('🔍 COMPREHENSIVE ANALYSIS OF ALL 2,974 JOBS\n');

  try {
    // Get all jobs with all available columns
    const { data: allJobs, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error getting jobs:', error);
      return;
    }

    console.log(`📊 Total jobs analyzed: ${allJobs.length}\n`);

    // 1. SOURCE ANALYSIS
    console.log('📈 SOURCE BREAKDOWN:');
    console.log('=' .repeat(50));
    const sourceStats = {};
    allJobs.forEach(job => {
      const source = job.source || 'Unknown';
      sourceStats[source] = (sourceStats[source] || 0) + 1;
    });
    
    Object.entries(sourceStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([source, count]) => {
        const percentage = ((count / allJobs.length) * 100).toFixed(1);
        console.log(`${source.padEnd(20)} ${count.toString().padEnd(8)} (${percentage}%)`);
      });

    // 2. LOCATION ANALYSIS
    console.log('\n🏙️  LOCATION ANALYSIS:');
    console.log('=' .repeat(50));
    
    const locationStats = {};
    const countryStats = {};
    const remoteJobs = [];
    
    allJobs.forEach(job => {
      const location = job.location || 'Unknown';
      locationStats[location] = (locationStats[location] || 0) + 1;
      
      // Extract country from location
      const country = extractCountry(location);
      countryStats[country] = (countryStats[country] || 0) + 1;
      
      // Check for remote jobs
      if (location.toLowerCase().includes('remote')) {
        remoteJobs.push(job);
      }
    });

    console.log('Top 20 Cities:');
    Object.entries(locationStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .forEach(([city, count]) => {
        const percentage = ((count / allJobs.length) * 100).toFixed(1);
        console.log(`  ${city.padEnd(30)} ${count.toString().padEnd(6)} (${percentage}%)`);
      });

    console.log('\nTop Countries:');
    Object.entries(countryStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([country, count]) => {
        const percentage = ((count / allJobs.length) * 100).toFixed(1);
        console.log(`  ${country.padEnd(20)} ${count.toString().padEnd(6)} (${percentage}%)`);
      });

    console.log(`\nRemote Jobs: ${remoteJobs.length} (${((remoteJobs.length / allJobs.length) * 100).toFixed(1)}%)`);

    // 3. COMPANY ANALYSIS
    console.log('\n🏢 COMPANY ANALYSIS:');
    console.log('=' .repeat(50));
    
    const companyStats = {};
    allJobs.forEach(job => {
      const company = job.company || 'Unknown';
      companyStats[company] = (companyStats[company] || 0) + 1;
    });

    console.log('Top 15 Companies by Job Count:');
    Object.entries(companyStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .forEach(([company, count]) => {
        console.log(`  ${company.padEnd(40)} ${count} jobs`);
      });

    console.log(`\nTotal Unique Companies: ${Object.keys(companyStats).length}`);
    console.log(`Average Jobs per Company: ${(allJobs.length / Object.keys(companyStats).length).toFixed(1)}`);

    // 4. TITLE ANALYSIS
    console.log('\n💼 JOB TITLE ANALYSIS:');
    console.log('=' .repeat(50));
    
    const titleKeywords = {};
    const seniorKeywords = ['senior', 'lead', 'principal', 'manager', 'director', 'head', 'vp', 'chief'];
    const juniorKeywords = ['junior', 'entry', 'graduate', 'trainee', 'intern', 'assistant', 'analyst'];
    const techKeywords = ['developer', 'engineer', 'software', 'frontend', 'backend', 'full stack', 'devops'];
    
    let seniorJobs = 0;
    let juniorJobs = 0;
    let techJobs = 0;
    
    allJobs.forEach(job => {
      const title = (job.title || '').toLowerCase();
      
      // Count keywords
      title.split(' ').forEach(word => {
        if (word.length > 3) {
          titleKeywords[word] = (titleKeywords[word] || 0) + 1;
        }
      });
      
      // Check for senior/junior/tech
      if (seniorKeywords.some(keyword => title.includes(keyword))) seniorJobs++;
      if (juniorKeywords.some(keyword => title.includes(keyword))) juniorJobs++;
      if (techKeywords.some(keyword => title.includes(keyword))) techJobs++;
    });

    console.log(`Senior-level jobs: ${seniorJobs} (${((seniorJobs / allJobs.length) * 100).toFixed(1)}%)`);
    console.log(`Junior-level jobs: ${juniorJobs} (${((juniorJobs / allJobs.length) * 100).toFixed(1)}%)`);
    console.log(`Tech jobs: ${techJobs} (${((techJobs / allJobs.length) * 100).toFixed(1)}%)`);

    console.log('\nTop 15 Job Title Keywords:');
    Object.entries(titleKeywords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .forEach(([keyword, count]) => {
        console.log(`  ${keyword.padEnd(20)} ${count} occurrences`);
      });

    // 5. TEMPORAL ANALYSIS
    console.log('\n📅 TEMPORAL ANALYSIS:');
    console.log('=' .repeat(50));
    
    const dailyStats = {};
    const hourlyStats = {};
    
    allJobs.forEach(job => {
      const date = new Date(job.created_at);
      const day = date.toISOString().split('T')[0];
      const hour = date.getHours();
      
      dailyStats[day] = (dailyStats[day] || 0) + 1;
      hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
    });

    console.log('Jobs by Day (Last 10 days):');
    Object.entries(dailyStats)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 10)
      .forEach(([day, count]) => {
        console.log(`  ${day} ${count} jobs`);
      });

    console.log('\nJobs by Hour (Peak Hours):');
    Object.entries(hourlyStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .forEach(([hour, count]) => {
        console.log(`  ${hour}:00 ${count} jobs`);
      });

    // 6. DATA QUALITY ANALYSIS
    console.log('\n🔍 DATA QUALITY ANALYSIS:');
    console.log('=' .repeat(50));
    
    let missingTitle = 0;
    let missingCompany = 0;
    let missingLocation = 0;
    let missingDescription = 0;
    let duplicateTitles = 0;
    
    const titleCounts = {};
    
    allJobs.forEach(job => {
      if (!job.title || job.title.trim() === '') missingTitle++;
      if (!job.company || job.company.trim() === '') missingCompany++;
      if (!job.location || job.location.trim() === '') missingLocation++;
      if (!job.description || job.description.trim() === '') missingDescription++;
      
      if (job.title) {
        titleCounts[job.title] = (titleCounts[job.title] || 0) + 1;
        if (titleCounts[job.title] > 1) duplicateTitles++;
      }
    });

    console.log(`Missing titles: ${missingTitle} (${((missingTitle / allJobs.length) * 100).toFixed(1)}%)`);
    console.log(`Missing companies: ${missingCompany} (${((missingCompany / allJobs.length) * 100).toFixed(1)}%)`);
    console.log(`Missing locations: ${missingLocation} (${((missingLocation / allJobs.length) * 100).toFixed(1)}%)`);
    console.log(`Missing descriptions: ${missingDescription} (${((missingDescription / allJobs.length) * 100).toFixed(1)}%)`);
    console.log(`Duplicate titles: ${duplicateTitles} (${((duplicateTitles / allJobs.length) * 100).toFixed(1)}%)`);

    // 7. SOURCE-SPECIFIC ANALYSIS
    console.log('\n📊 SOURCE-SPECIFIC ANALYSIS:');
    console.log('=' .repeat(50));
    
    Object.keys(sourceStats).forEach(source => {
      const sourceJobs = allJobs.filter(job => job.source === source);
      const sourceLocations = {};
      const sourceCompanies = {};
      
      sourceJobs.forEach(job => {
        const location = job.location || 'Unknown';
        const company = job.company || 'Unknown';
        
        sourceLocations[location] = (sourceLocations[location] || 0) + 1;
        sourceCompanies[company] = (sourceCompanies[company] || 0) + 1;
      });
      
      console.log(`\n${source.toUpperCase()} (${sourceJobs.length} jobs):`);
      console.log(`  Top locations: ${Object.entries(sourceLocations).sort(([,a], [,b]) => b - a).slice(0, 3).map(([loc, count]) => `${loc}(${count})`).join(', ')}`);
      console.log(`  Unique companies: ${Object.keys(sourceCompanies).length}`);
      console.log(`  Avg jobs/company: ${(sourceJobs.length / Object.keys(sourceCompanies).length).toFixed(1)}`);
    });

  } catch (error) {
    console.error('❌ Error analyzing jobs:', error);
  }
}

function extractCountry(location) {
  if (!location) return 'Unknown';
  
  const locationLower = location.toLowerCase();
  
  // Common country patterns
  if (locationLower.includes('uk') || locationLower.includes('united kingdom') || locationLower.includes('london')) return 'UK';
  if (locationLower.includes('deutschland') || locationLower.includes('germany') || locationLower.includes('berlin')) return 'Germany';
  if (locationLower.includes('spain') || locationLower.includes('madrid') || locationLower.includes('barcelona')) return 'Spain';
  if (locationLower.includes('netherlands') || locationLower.includes('amsterdam')) return 'Netherlands';
  if (locationLower.includes('france') || locationLower.includes('paris')) return 'France';
  if (locationLower.includes('ireland') || locationLower.includes('dublin')) return 'Ireland';
  if (locationLower.includes('italy') || locationLower.includes('milan') || locationLower.includes('rome')) return 'Italy';
  if (locationLower.includes('remote')) return 'Remote';
  
  // Try to extract from comma-separated location
  const parts = location.split(',').map(part => part.trim());
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  
  return 'Other';
}

analyzeAllJobs();
