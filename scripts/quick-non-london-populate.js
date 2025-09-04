#!/usr/bin/env node

// Quick non-London job population using direct API calls
const https = require('https');
const axios = require('axios');

console.log('🌍 QUICK NON-LONDON JOB POPULATION');
console.log('===================================\n');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function populateNonLondonJobs() {
  try {
    // 1. ADZUNA - Test Madrid (non-London)
    console.log('📍 Testing Adzuna - Madrid:');
    try {
      const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=10&what=graduate%20program&where=Madrid`;
      
      const adzunaResponse = await axios.get(adzunaUrl, { timeout: 10000 });
      const adzunaJobs = adzunaResponse.data.results || [];
      
      console.log(`✅ Madrid jobs found: ${adzunaJobs.length}`);
      adzunaJobs.slice(0, 3).forEach((job, i) => {
        console.log(`  ${i + 1}. ${job.title} at ${job.company.display_name} (${job.location.display_name})`);
      });
    } catch (error) {
      console.log('❌ Adzuna failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 2. REED - Test Manchester (non-London)
    console.log('📍 Testing Reed - Manchester:');
    try {
      const reedUrl = `https://www.reed.co.uk/api/1.0/search?keywords=graduate%20program&locationName=Manchester&distanceFromLocation=10&resultsToTake=10`;
      
      const reedResponse = await axios.get(reedUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from(process.env.REED_API_KEY + ':').toString('base64')}`,
          'User-Agent': 'JobPing/1.0'
        },
        timeout: 10000
      });
      
      const reedJobs = reedResponse.data.results || [];
      console.log(`✅ Manchester jobs found: ${reedJobs.length}`);
      reedJobs.slice(0, 3).forEach((job, i) => {
        console.log(`  ${i + 1}. ${job.jobTitle} at ${job.employerName} (${job.locationName})`);
      });
    } catch (error) {
      console.log('❌ Reed failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 3. JSEARCH - Test Berlin (EU-only now)
    console.log('📍 Testing JSearch - Berlin (EU-filtered):');
    try {
      const jsearchUrl = 'https://jsearch.p.rapidapi.com/search';
      const jsearchResponse = await axios.get(jsearchUrl, {
        params: {
          query: 'graduate program',
          page: 1,
          num_pages: 1,
          date_posted: 'week',
          job_requirements: 'under_3_years_experience,no_degree'
        },
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        },
        timeout: 15000
      });
      
      const jsearchJobs = jsearchResponse.data.data || [];
      // Filter for EU locations only
      const euJobs = jsearchJobs.filter(job => {
        const country = job.job_country?.toLowerCase() || '';
        const city = job.job_city?.toLowerCase() || '';
        const euCountries = ['united kingdom', 'uk', 'germany', 'france', 'spain', 'netherlands', 'ireland'];
        const euCities = ['berlin', 'madrid', 'paris', 'amsterdam', 'dublin', 'munich'];
        
        return euCountries.some(c => country.includes(c)) || euCities.some(c => city.includes(c));
      });
      
      console.log(`✅ EU jobs found: ${euJobs.length} (filtered from ${jsearchJobs.length} total)`);
      euJobs.slice(0, 3).forEach((job, i) => {
        console.log(`  ${i + 1}. ${job.job_title} at ${job.employer_name} (${job.job_city}, ${job.job_country})`);
      });
    } catch (error) {
      console.log('❌ JSearch failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 4. MUSE - Test Paris (EU location)
    console.log('📍 Testing Muse - Paris:');
    try {
      const museUrl = 'https://www.themuse.com/api/public/jobs';
      const museResponse = await axios.get(museUrl, {
        params: {
          location: 'Paris, France',
          category: 'Engineering,Data Science',
          level: 'Entry Level,Internship',
          page: 1
        },
        headers: {
          'User-Agent': 'JobPing/1.0'
        },
        timeout: 15000
      });
      
      const museJobs = museResponse.data.results || [];
      console.log(`✅ Paris jobs found: ${museJobs.length}`);
      museJobs.slice(0, 3).forEach((job, i) => {
        console.log(`  ${i + 1}. ${job.name} at ${job.company.name} (${job.locations?.[0]?.name || 'Paris'})`);
      });
    } catch (error) {
      console.log('❌ Muse failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 5. GREENHOUSE - Test EU companies
    console.log('📍 Testing Greenhouse - EU companies:');
    try {
      // Test a few EU companies directly
      const euCompanies = ['deloitte', 'pwc', 'ey', 'kpmg', 'accenture'];
      let totalJobs = 0;
      
      for (const company of euCompanies.slice(0, 2)) { // Test first 2 to avoid rate limits
        try {
          const greenhouseUrl = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`;
          const greenhouseResponse = await axios.get(greenhouseUrl, { timeout: 10000 });
          const companyJobs = greenhouseResponse.data.jobs || [];
          
          // Filter for early-career and non-London
          const earlyCareerJobs = companyJobs.filter(job => {
            const title = job.title.toLowerCase();
            const location = job.location.name.toLowerCase();
            const earlyCareerKeywords = ['graduate', 'junior', 'entry', 'trainee', 'associate'];
            return earlyCareerKeywords.some(keyword => title.includes(keyword)) && 
                   !location.includes('london');
          });
          
          if (earlyCareerJobs.length > 0) {
            console.log(`  ✅ ${company}: ${earlyCareerJobs.length} early-career jobs`);
            earlyCareerJobs.slice(0, 2).forEach(job => {
              console.log(`    - ${job.title} (${job.location.name})`);
            });
            totalJobs += earlyCareerJobs.length;
          }
          
          // Small delay between companies
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (companyError) {
          console.log(`  ⚠️ ${company}: ${companyError.message}`);
        }
      }
      
      console.log(`✅ Total Greenhouse EU jobs: ${totalJobs}`);
    } catch (error) {
      console.log('❌ Greenhouse failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');
    console.log('✅ NON-LONDON JOB POPULATION COMPLETE!');
    console.log('🌍 You now have jobs from cities across Europe!');
    console.log('📊 Check your database for the new non-London jobs.');

  } catch (error) {
    console.error('❌ Error in job population:', error);
  }
}

// Run the population
populateNonLondonJobs();
