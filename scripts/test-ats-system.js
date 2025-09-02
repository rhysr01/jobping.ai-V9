#!/usr/bin/env node

async function testATSSystem() {
  console.log('🧪 Testing ATS-API Scraping System');
  console.log('=====================================');
  
  try {
    // Dynamic import to handle TypeScript modules
    const { ATSOrchestrator } = await import('../scrapers/ATSOrchestrator.ts');
    const orchestrator = new ATSOrchestrator();
    
    console.log('📋 Company List:');
    // This will be loaded from the config file
    console.log('   - Loading companies from src/config/companyList.json');
    
    console.log('\n🚀 Starting ATS scraping...');
    const results = await orchestrator.scrapeAllCompanies();
    
    console.log('\n📊 Results Summary:');
    console.log('===================');
    
    const totalJobs = results.reduce((sum, r) => sum + r.jobsSaved, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const successfulCompanies = results.filter(r => r.jobsSaved > 0).length;
    const failedCompanies = results.filter(r => r.errors.length > 0).length;
    
    console.log(`✅ Total Companies: ${results.length}`);
    console.log(`✅ Successful: ${successfulCompanies}`);
    console.log(`❌ Failed: ${failedCompanies}`);
    console.log(`📈 Total Jobs Found: ${results.reduce((sum, r) => sum + r.jobsFound, 0)}`);
    console.log(`💾 Total Jobs Saved: ${totalJobs}`);
    console.log(`⚠️  Total Errors: ${totalErrors}`);
    
    if (totalJobs > 0) {
      console.log('\n🎉 SUCCESS: ATS system is working!');
      console.log(`   Found ${totalJobs} graduate jobs from ${successfulCompanies} companies`);
    } else {
      console.log('\n⚠️  WARNING: No jobs found. Check company configurations.');
    }
    
    if (totalErrors > 0) {
      console.log('\n❌ Errors encountered:');
      results.forEach(result => {
        if (result.errors.length > 0) {
          console.log(`   ${result.company} (${result.platform}): ${result.errors.join(', ')}`);
        }
      });
    }
    
  } catch (error) {
    console.error('💥 ATS System Test Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testATSSystem().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
