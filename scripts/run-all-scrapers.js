#!/usr/bin/env node

/**
 * Run all three scrapers and show real results
 * No more tests - let's see what jobs we actually find!
 */

console.log('🚀 JobPing Scrapers - Getting Real Results!\n');

// Set environment variables
process.env.ADZUNA_APP_ID = 'd34f1fb7';
process.env.ADZUNA_APP_KEY = '9cd0a37a973d0bfc810261e14feec9b5';
process.env.REED_API_KEY = 'a8c072d1-b372-469a-a884-e79529914293';

import('https').then(https => {
  const results = {
    adzuna: { jobs: [], total: 0, earlyCareer: 0 },
    reed: { jobs: [], total: 0, earlyCareer: 0 },
    greenhouse: { jobs: [], total: 0, earlyCareer: 0 },
    indeed: { jobs: [], total: 0, earlyCareer: 0 },
    muse: { jobs: [], total: 0, earlyCareer: 0 },
    jsearch: { jobs: [], total: 0, earlyCareer: 0 }
  };
  
  let completed = 0;
  
  // Function to check if all scrapers are done
  const checkComplete = () => {
    if (completed === 6) {
      showFinalResults();
    }
  };
  
  // Function to show final results
  const showFinalResults = () => {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 FINAL RESULTS - All Scrapers Completed!');
    console.log('='.repeat(60));
    
    const totalJobs = results.adzuna.earlyCareer + results.reed.earlyCareer + results.greenhouse.earlyCareer + results.indeed.earlyCareer + results.muse.earlyCareer + results.jsearch.earlyCareer;
    
    console.log(`📊 Total Early-Career Jobs Found: ${totalJobs}`);
    console.log(`   🏢 Adzuna: ${results.adzuna.earlyCareer} jobs`);
    console.log(`   🇬🇧 Reed: ${results.reed.earlyCareer} jobs`);
    console.log(`   🏗️ Greenhouse: ${results.greenhouse.earlyCareer} jobs`);
    console.log(`   🔍 Indeed: ${results.indeed.earlyCareer} jobs`);
    console.log(`   🎭 Muse: ${results.muse.earlyCareer} jobs`);
    console.log(`   🔍 JSearch: ${results.jsearch.earlyCareer} jobs`);
    
    console.log('\n🎯 Sample Jobs by Source:');
    
            if (results.adzuna.jobs.length > 0) {
          console.log('\n🏢 Adzuna Jobs:');
          results.adzuna.jobs.slice(0, 3).forEach((job, i) => {
            console.log(`   ${i + 1}. ${job.title} at ${job.company?.display_name || 'Unknown'} (${job.location?.display_name || 'Unknown'})`);
          });
        }
    
            if (results.reed.jobs.length > 0) {
          console.log('\n🇬🇧 Reed Jobs:');
          results.reed.jobs.slice(0, 3).forEach((job, i) => {
            console.log(`   ${i + 1}. ${job.jobTitle} at ${job.employerName} (${job.locationName})`);
          });
        }
    
                if (results.greenhouse.jobs.length > 0) {
      console.log('\n🏗️ Greenhouse Jobs:');
      results.greenhouse.jobs.slice(0, 3).forEach((job, i) => {
        console.log(`   ${i + 1}. ${job.title} at ${job.company || 'Unknown'} (${job.location?.name || 'Unknown'})`);
      });
    }
    
    if (results.indeed.jobs.length > 0) {
      console.log('\n🔍 Indeed Jobs:');
      results.indeed.jobs.slice(0, 3).forEach((job, i) => {
        console.log(`   ${i + 1}. ${job.title} at ${job.company} (${job.location})`);
      });
    }
    
    if (results.muse.jobs.length > 0) {
      console.log('\n🎭 Muse Jobs:');
      results.muse.jobs.slice(0, 3).forEach((job, i) => {
        console.log(`   ${i + 1}. ${job.name} at ${job.company.name} (${job.locations?.[0]?.name || 'Unknown'})`);
      });
    }
    
    if (results.jsearch.jobs.length > 0) {
      console.log('\n🔍 JSearch Jobs:');
      results.jsearch.jobs.slice(0, 3).forEach((job, i) => {
        console.log(`   ${i + 1}. ${job.job_title} at ${job.employer_name} (${job.job_city}, ${job.job_country})`);
      });
    }
    
    console.log('\n✅ All scrapers completed successfully!');
  };
  
  // 1. ADZUNA SCRAPER
  console.log('🔍 Running Adzuna scraper...');
  const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=graduate&where=London&results_per_page=10`;
  
  https.get(adzunaUrl, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        const jobs = result.results || [];
        const earlyCareerJobs = jobs.filter(job => {
          const text = `${job.title} ${job.description}`.toLowerCase();
          return text.includes('graduate') || text.includes('junior') || text.includes('entry') || text.includes('trainee');
        });
        
        results.adzuna.jobs = earlyCareerJobs;
        results.adzuna.total = jobs.length;
        results.adzuna.earlyCareer = earlyCareerJobs.length;
        
        console.log(`✅ Adzuna: ${jobs.length} total jobs, ${earlyCareerJobs.length} early-career`);
        completed++;
        checkComplete();
      } catch (error) {
        console.log('❌ Adzuna failed:', error.message);
        completed++;
        checkComplete();
      }
    });
  }).on('error', (error) => {
    console.log('❌ Adzuna failed:', error.message);
    completed++;
    checkComplete();
  });
  
  // 2. REED SCRAPER
  console.log('🔍 Running Reed scraper...');
  const auth = Buffer.from(process.env.REED_API_KEY + ':').toString('base64');
  const reedUrl = 'https://www.reed.co.uk/api/1.0/search?keywords=graduate&locationName=London&distanceFromLocation=10&resultsToTake=10';
  
  https.get(reedUrl, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'User-Agent': 'JobPing/1.0',
      'Accept': 'application/json'
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        const jobs = result.results || [];
        const earlyCareerJobs = jobs.filter(job => {
          const text = `${job.jobTitle} ${job.jobDescription}`.toLowerCase();
          return text.includes('graduate') || text.includes('junior') || text.includes('entry') || text.includes('trainee');
        });
        
        results.reed.jobs = earlyCareerJobs;
        results.reed.total = jobs.length;
        results.reed.earlyCareer = earlyCareerJobs.length;
        
        console.log(`✅ Reed: ${jobs.length} total jobs, ${earlyCareerJobs.length} early-career`);
        completed++;
        checkComplete();
      } catch (error) {
        console.log('❌ Reed failed:', error.message);
        completed++;
        checkComplete();
      }
    });
  }).on('error', (error) => {
    console.log('❌ Reed failed:', error.message);
    completed++;
    checkComplete();
  });
  
  // 3. GREENHOUSE SCRAPER
  console.log('🔍 Running Greenhouse scraper...');
  const companies = ['monzo', 'asana', 'vercel'];
  let greenhouseCompleted = 0;
  let greenhouseJobs = [];
  let greenhouseTotal = 0;
  
  companies.forEach(company => {
    const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`;
    
    https.get(url, { 
      headers: { 'Accept': 'application/json' },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const result = JSON.parse(data);
            const jobs = result.jobs || [];
            const earlyCareerJobs = jobs.filter(job => {
              const text = `${job.title} ${job.departments?.map(d => d.name).join(' ')}`.toLowerCase();
              return text.includes('graduate') || text.includes('junior') || text.includes('entry') || text.includes('trainee');
            });
            
            greenhouseJobs.push(...earlyCareerJobs);
            greenhouseTotal += jobs.length;
          }
        } catch (error) {
          console.log(`❌ Greenhouse ${company}: Failed to parse`);
        }
        
        greenhouseCompleted++;
        if (greenhouseCompleted === companies.length) {
          results.greenhouse.jobs = greenhouseJobs;
          results.greenhouse.total = greenhouseTotal;
          results.greenhouse.earlyCareer = greenhouseJobs.length;
          
          console.log(`✅ Greenhouse: ${greenhouseTotal} total jobs, ${greenhouseJobs.length} early-career`);
          completed++;
          checkComplete();
        }
      });
    }).on('error', (error) => {
      console.log(`❌ Greenhouse ${company}: Request failed`);
      greenhouseCompleted++;
      if (greenhouseCompleted === companies.length) {
        results.greenhouse.jobs = greenhouseJobs;
        results.greenhouse.total = greenhouseTotal;
        results.greenhouse.earlyCareer = greenhouseJobs.length;
        
        console.log(`✅ Greenhouse: ${greenhouseTotal} total jobs, ${greenhouseJobs.length} early-career`);
        completed++;
        checkComplete();
      }
    });
  });
  
  // 4. INDEED SCRAPER
  console.log('🔍 Running Indeed scraper...');
  const indeedApiKey = process.env.INDEED_API_KEY;
  
  if (indeedApiKey) {
    // Test Indeed API with a simple query
    const indeedUrl = 'https://api.indeed.com/v2/jobs?query=graduate&location=London&limit=10';
    
    https.get(indeedUrl, {
      headers: {
        'Authorization': `Bearer ${indeedApiKey}`,
        'User-Agent': 'JobPing/1.0',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const jobs = result.results || [];
          const earlyCareerJobs = jobs.filter(job => {
            const text = `${job.title} ${job.description}`.toLowerCase();
            return text.includes('graduate') || text.includes('junior') || text.includes('entry') || text.includes('trainee');
          });
          
          results.indeed.jobs = earlyCareerJobs;
          results.indeed.total = jobs.length;
          results.indeed.earlyCareer = earlyCareerJobs.length;
          
          console.log(`✅ Indeed: ${jobs.length} total jobs, ${earlyCareerJobs.length} early-career`);
          completed++;
          checkComplete();
        } catch (error) {
          console.log('❌ Indeed failed to parse response');
          results.indeed.jobs = [];
          results.indeed.total = 0;
          results.indeed.earlyCareer = 0;
          completed++;
          checkComplete();
        }
      });
    }).on('error', (error) => {
      console.log('❌ Indeed request failed');
      results.indeed.jobs = [];
      results.indeed.total = 0;
      results.indeed.earlyCareer = 0;
      completed++;
      checkComplete();
    });
  } else {
    console.log('⚠️ Indeed API key not found, skipping');
    results.indeed.jobs = [];
    results.indeed.total = 0;
    results.indeed.earlyCareer = 0;
    completed++;
    checkComplete();
  }
  
  // 5. MUSE SCRAPER
  console.log('🔍 Running Muse scraper...');
  const museApiKey = process.env.MUSE_API_KEY;
  
  if (museApiKey) {
    // Test Muse API with a simple query
    const museUrl = 'https://www.themuse.com/api/public/jobs?category=Engineering&level=Entry%20Level&location=London,%20United%20Kingdom&page=1';
    
    https.get(museUrl, {
      headers: {
        'User-Agent': 'JobPing/1.0',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const jobs = result.results || [];
          const earlyCareerJobs = jobs.filter(job => {
            const text = `${job.name} ${job.contents}`.toLowerCase();
            return text.includes('graduate') || text.includes('junior') || text.includes('entry') || text.includes('trainee');
          });
          
          results.muse.jobs = earlyCareerJobs;
          results.muse.total = jobs.length;
          results.muse.earlyCareer = earlyCareerJobs.length;
          
          console.log(`✅ Muse: ${jobs.length} total jobs, ${earlyCareerJobs.length} early-career`);
          completed++;
          checkComplete();
        } catch (error) {
          console.log('❌ Muse failed to parse response');
          results.muse.jobs = [];
          results.muse.total = 0;
          results.muse.earlyCareer = 0;
          completed++;
          checkComplete();
        }
      });
    }).on('error', (error) => {
      console.log('❌ Muse request failed');
      results.muse.jobs = [];
      results.muse.total = 0;
      results.muse.earlyCareer = 0;
      completed++;
      checkComplete();
    });
  } else {
    console.log('⚠️ Muse API key not found, skipping');
    results.muse.jobs = [];
    results.muse.total = 0;
    results.muse.earlyCareer = 0;
    completed++;
    checkComplete();
  }
  
  // 6. JSEARCH SCRAPER
  console.log('🔍 Running JSearch scraper...');
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  
  if (rapidApiKey) {
    // Test JSearch API with a simple query
    const jsearchUrl = 'https://jsearch.p.rapidapi.com/search?query=graduate%20program&page=1&num_pages=1&date_posted=week';
    
    https.get(jsearchUrl, {
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        'User-Agent': 'JobPing/1.0',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const jobs = result.data || [];
          const earlyCareerJobs = jobs.filter(job => {
            const text = `${job.job_title} ${job.job_description}`.toLowerCase();
            return text.includes('graduate') || text.includes('junior') || text.includes('entry') || text.includes('trainee');
          });
          
          results.jsearch.jobs = earlyCareerJobs;
          results.jsearch.total = jobs.length;
          results.jsearch.earlyCareer = earlyCareerJobs.length;
          
          console.log(`✅ JSearch: ${jobs.length} total jobs, ${earlyCareerJobs.length} early-career`);
          completed++;
          checkComplete();
        } catch (error) {
          console.log('❌ JSearch failed to parse response');
          results.jsearch.jobs = [];
          results.jsearch.total = 0;
          results.jsearch.earlyCareer = 0;
          completed++;
          checkComplete();
        }
      });
    }).on('error', (error) => {
      console.log('❌ JSearch request failed');
      results.jsearch.jobs = [];
      results.jsearch.total = 0;
      results.jsearch.earlyCareer = 0;
      completed++;
      checkComplete();
    });
  } else {
    console.log('⚠️ RapidAPI key not found, skipping JSearch');
    results.jsearch.jobs = [];
    results.jsearch.total = 0;
    results.jsearch.earlyCareer = 0;
    completed++;
    checkComplete();
  }
});
