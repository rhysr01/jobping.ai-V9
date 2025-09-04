#!/usr/bin/env node

// Quick test of Greenhouse scraper - let's see what we get!
console.log('🚀 Quick Greenhouse Test - Getting Real Results!\n');

// Test a few company boards to see what jobs we get
console.log('🔍 Testing Greenhouse company boards...');

import('https').then(https => {
  const companies = [
    'monzo',
    'stripe', 
    'coinbase',
    'asana',
    'vercel'
  ];
  
  let completed = 0;
  let totalJobs = 0;
  
  companies.forEach(company => {
    const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`;
    
    https.get(url, { 
      headers: { 'Accept': 'application/json' },
      timeout: 10000
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const result = JSON.parse(data);
            const jobs = result.jobs || [];
            const earlyCareerJobs = jobs.filter(job => {
              const text = `${job.title} ${job.departments?.map(d => d.name).join(' ')}`.toLowerCase();
              return text.includes('graduate') || text.includes('junior') || text.includes('entry') || text.includes('trainee');
            });
            
            console.log(`✅ ${company}: ${jobs.length} total jobs, ${earlyCareerJobs.length} early-career`);
            totalJobs += earlyCareerJobs.length;
            
            if (earlyCareerJobs.length > 0) {
              console.log(`   🎯 Sample: ${earlyCareerJobs[0].title}`);
            }
          } else {
            console.log(`❌ ${company}: ${res.statusCode} - ${res.statusMessage}`);
          }
        } catch (error) {
          console.log(`❌ ${company}: Failed to parse response`);
        }
        
        completed++;
        if (completed === companies.length) {
          console.log(`\n🎯 Total early-career jobs found: ${totalJobs}`);
        }
      });
    }).on('error', (error) => {
      console.log(`❌ ${company}: Request failed - ${error.message}`);
      completed++;
      if (completed === companies.length) {
        console.log(`\n🎯 Total early-career jobs found: ${totalJobs}`);
      }
    });
  });
});
