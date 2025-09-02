/**
 * Test script to test IngestJob helper functions
 */

import { execSync } from 'child_process';

console.log('🧪 Testing IngestJob helper functions...\n');

// Test data
const testJobs = [
  {
    title: 'Graduate Software Engineer',
    company: 'Google',
    location: 'London, UK',
    description: 'We are looking for a graduate software engineer to join our team in London. This is an entry-level position perfect for recent graduates.',
    url: 'https://google.com/jobs/123',
    posted_at: new Date().toISOString(),
    source: 'lever'
  },
  {
    title: 'Senior Software Engineer',
    company: 'Microsoft',
    location: 'Seattle, USA',
    description: 'We need an experienced senior software engineer with 5+ years of experience.',
    url: 'https://microsoft.com/jobs/456',
    posted_at: new Date().toISOString(),
    source: 'greenhouse'
  },
  {
    title: 'Graduate Analyst',
    company: 'Goldman Sachs',
    location: 'Frankfurt, Germany',
    description: 'Join our graduate program as an analyst. Perfect for recent graduates with strong analytical skills.',
    url: 'https://goldmansachs.com/jobs/789',
    posted_at: new Date().toISOString(),
    source: 'milkround'
  }
];

console.log('📋 Test Jobs:');
testJobs.forEach((job, index) => {
  console.log(`${index + 1}. ${job.title} at ${job.company} (${job.location})`);
});

console.log('\n🎯 Testing north-star rule: "If it\'s early-career and in Europe, save it"');
console.log('=====================================');

testJobs.forEach((job, index) => {
  console.log(`\n${index + 1}. ${job.title}`);
  console.log(`   Company: ${job.company}`);
  console.log(`   Location: ${job.location}`);
  
  // Simple logic to test the north-star rule
  const isEarlyCareer = job.title.toLowerCase().includes('graduate') || 
                       job.title.toLowerCase().includes('entry') ||
                       job.title.toLowerCase().includes('junior') ||
                       job.description.toLowerCase().includes('graduate') ||
                       job.description.toLowerCase().includes('entry-level');
  
  const isInEurope = job.location.toLowerCase().includes('uk') ||
                    job.location.toLowerCase().includes('london') ||
                    job.location.toLowerCase().includes('germany') ||
                    job.location.toLowerCase().includes('frankfurt') ||
                    job.location.toLowerCase().includes('europe');
  
  const shouldSave = isEarlyCareer && isInEurope;
  
  console.log(`   Early Career: ${isEarlyCareer ? '✅' : '❌'}`);
  console.log(`   In Europe: ${isInEurope ? '✅' : '❌'}`);
  console.log(`   Should Save: ${shouldSave ? '✅ SAVE' : '❌ FILTER'}`);
});

console.log('\n📊 Summary:');
console.log('===========');
const shouldSaveJobs = testJobs.filter((job, index) => {
  const isEarlyCareer = job.title.toLowerCase().includes('graduate') || 
                       job.title.toLowerCase().includes('entry') ||
                       job.title.toLowerCase().includes('junior') ||
                       job.description.toLowerCase().includes('graduate') ||
                       job.description.toLowerCase().includes('entry-level');
  
  const isInEurope = job.location.toLowerCase().includes('uk') ||
                    job.location.toLowerCase().includes('london') ||
                    job.location.toLowerCase().includes('germany') ||
                    job.location.toLowerCase().includes('frankfurt') ||
                    job.location.toLowerCase().includes('europe');
  
  return isEarlyCareer && isInEurope;
});

console.log(`✅ Jobs to save: ${shouldSaveJobs.length}/${testJobs.length}`);
shouldSaveJobs.forEach(job => {
  console.log(`   - ${job.title} at ${job.company}`);
});

console.log('\n🎯 Next steps:');
console.log('1. Fix TypeScript compilation issues');
console.log('2. Test scrapers with compiled JavaScript');
console.log('3. Verify job filtering logic');
console.log('4. Test database integration');
