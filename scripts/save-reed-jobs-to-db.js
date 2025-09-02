#!/usr/bin/env node

/**
 * Save Scraped Reed Jobs to Database
 * Processes Reed jobs and saves them to Supabase with job ingestion filtering
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

console.log('🚀 Saving Scraped Reed Jobs to Database...\n');

// Check environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

console.log('✅ Supabase credentials loaded');
console.log(`   URL: ${supabaseUrl.substring(0, 30)}...`);
console.log(`   Key: ${supabaseKey.substring(0, 8)}...\n`);

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Mock job ingestion logic (since we can't import TypeScript directly)
const processJobIngestion = (job) => {
  // Early-career signals
  const earlyCareerSignals = [
    'graduate', 'intern', 'junior', 'entry-level', 'entry level', 'trainee', 'apprentice',
    'new graduate', 'recent graduate', 'student', 'first job', 'stagiair', 'werkstudent',
    'starter', 'afgestudeerde', 'eerste baan', 'beginnersfunctie', 'leerling',
    'praktikum', 'einsteiger', 'berufseinsteiger', 'absolvent', 'neueinsteiger', 'anfänger',
    'ausbildung', 'stagiaire', 'alternance', 'débutant', 'premier emploi', 'étudiant',
    'jeune diplômé', 'sans expérience', 'formation', 'apprenti', 'becario', 'prácticas',
    'nivel inicial', 'primer empleo', 'estudiante', 'recién graduado', 'sin experiencia',
    'aprendiz'
  ];

  // Senior signals
  const seniorSignals = [
    'senior', 'lead', 'manager', 'director', 'head of', 'principal', 'chief',
    '10+ years', '15+ years', '20+ years', 'expert', 'specialist', 'consultant'
  ];

  // European regions
  const europeanRegions = [
    'london', 'uk', 'england', 'scotland', 'wales', 'northern ireland',
    'amsterdam', 'netherlands', 'holland', 'dutch',
    'berlin', 'germany', 'deutschland', 'german',
    'paris', 'france', 'french',
    'madrid', 'barcelona', 'spain', 'españa', 'spanish',
    'rome', 'milan', 'italy', 'italia', 'italian',
    'brussels', 'belgium', 'belgian',
    'vienna', 'austria', 'österreich', 'austrian',
    'zurich', 'geneva', 'switzerland', 'schweiz', 'swiss',
    'stockholm', 'sweden', 'sverige', 'swedish',
    'oslo', 'norway', 'norge', 'norwegian',
    'copenhagen', 'denmark', 'danmark', 'danish',
    'helsinki', 'finland', 'suomi', 'finnish',
    'dublin', 'ireland', 'irish'
  ];

  // Check for early-career signals
  const title = (job.title || '').toLowerCase();
  const description = (job.description || '').toLowerCase();
  const keyword = (job.keyword || '').toLowerCase();
  
  const hasEarlyCareerSignals = earlyCareerSignals.some(signal => 
    title.includes(signal) || description.includes(signal) || keyword.includes(signal)
  );

  // Check for senior signals
  const hasSeniorSignals = seniorSignals.some(signal => 
    title.includes(signal) || description.includes(signal)
  );

  // Check if location is European
  const location = (job.location || '').toLowerCase();
  const isEuropean = europeanRegions.some(region => location.includes(region));

  // Determine eligibility
  let eligibility = 'uncertain';
  let confidence = 0.5;

  if (hasEarlyCareerSignals && !hasSeniorSignals) {
    eligibility = 'early-career';
    confidence = 0.9;
  } else if (hasSeniorSignals) {
    eligibility = 'senior';
    confidence = 0.3;
  } else if (hasEarlyCareerSignals) {
    eligibility = 'early-career';
    confidence = 0.7;
  }

  // Determine if we should save the job
  const shouldSave = isEuropean && (eligibility === 'early-career' || eligibility === 'uncertain');

  // Generate reasons
  const reasons = [];
  if (eligibility === 'early-career') {
    reasons.push('Strong early-career signals detected');
  } else if (eligibility === 'uncertain') {
    reasons.push('Mixed signals - uncertain eligibility');
  } else {
    reasons.push('No early-career signals found');
  }

  if (isEuropean) {
    reasons.push('Clear early-career role in European location - saving for review');
  } else {
    reasons.push('Does not meet minimum criteria for saving');
  }

  return {
    shouldSave,
    eligibility,
    confidence,
    location: isEuropean ? 'europe' : 'other',
    reasons
  };
};

async function saveReedJobsToDB() {
  try {
    // 1. Check for scraped Reed job files
    console.log('📁 Looking for scraped Reed job files...');
    
    const possibleFiles = [
      'reed-jobs-2025-09-02.json',
      'reed-jobs.json',
      'scraped-reed-jobs.json'
    ];

    let scrapedJobs = null;
    let sourceFile = null;

    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        try {
          const fileContent = fs.readFileSync(file, 'utf8');
          scrapedJobs = JSON.parse(fileContent);
          sourceFile = file;
          console.log(`✅ Found scraped Reed jobs in: ${file}`);
          break;
        } catch (parseError) {
          console.log(`⚠️  Could not parse ${file}: ${parseError.message}`);
        }
      }
    }

    if (!scrapedJobs) {
      console.error('❌ No valid scraped Reed job files found');
      console.log('💡 Make sure you have run the Reed scraper first');
      console.log('📁 Looking for files:', possibleFiles.join(', '));
      return;
    }

    // 2. Process and filter jobs
    // Handle different file structures - extract jobs array if needed
    let jobsToProcess = scrapedJobs;
    if (scrapedJobs.jobs && Array.isArray(scrapedJobs.jobs)) {
      jobsToProcess = scrapedJobs.jobs;
      console.log(`📁 Found jobs array with ${jobsToProcess.length} jobs`);
    } else if (Array.isArray(scrapedJobs)) {
      console.log(`📁 Processing ${scrapedJobs.length} direct jobs`);
    } else {
      console.error('❌ Invalid job file structure');
      return;
    }
    
    console.log(`\n🔍 Processing ${jobsToProcess.length} scraped Reed jobs...`);
    
    const processedJobs = [];
    let earlyCareerCount = 0;
    let uncertainCount = 0;
    let seniorCount = 0;
    let europeanCount = 0;
    let remoteCount = 0;

    for (const job of jobsToProcess) {
      // Apply job ingestion logic
      const ingestionResult = processJobIngestion(job);
      
      if (ingestionResult.shouldSave) {
        // Prepare job for database
        const dbJob = {
          title: job.title || 'Unknown Title',
          company: job.company || 'Unknown Company',
          location: job.location || 'Unknown Location',
          description: job.description || '',
          source: 'reed',
          job_hash: `reed_${job.job_id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          job_url: job.url || '',
          company_profile_url: '',
          posted_at: job.posted && job.posted !== 'Not specified' ? job.posted : new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Add optional fields if available
        if (job.categories) dbJob.categories = job.categories;
        if (job.languages_required) dbJob.languages_required = job.languages_required;
        if (job.work_environment) dbJob.work_environment = job.work_environment;

        processedJobs.push(dbJob);

        // Count statistics
        if (ingestionResult.eligibility === 'early-career') earlyCareerCount++;
        else if (ingestionResult.eligibility === 'uncertain') uncertainCount++;
        else seniorCount++;

        if (ingestionResult.location === 'europe') europeanCount++;
        else if (ingestionResult.location === 'remote-europe') remoteCount++;
      }
    }

    console.log(`✅ Processed ${processedJobs.length} Reed jobs for database`);
    console.log(`📊 Eligibility breakdown:`);
    console.log(`   Early-career: ${earlyCareerCount}`);
    console.log(`   Uncertain: ${uncertainCount}`);
    console.log(`   Senior: ${seniorCount}`);
    console.log(`📍 Location breakdown:`);
    console.log(`   European: ${europeanCount}`);
    console.log(`   Remote European: ${remoteCount}`);

    // 3. Save jobs to database in batches
    console.log('\n💾 Saving Reed jobs to database...');
    
    const batchSize = 100;
    let totalSaved = 0;
    let totalErrors = 0;

    for (let i = 0; i < processedJobs.length; i += batchSize) {
      const batch = processedJobs.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(processedJobs.length / batchSize);

      console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} jobs)...`);

      try {
        const { data: insertData, error: insertError } = await supabase
          .from('jobs')
          .insert(batch)
          .select('id');

        if (insertError) {
          console.error(`❌ Batch ${batchNumber} failed:`, insertError.message);
          totalErrors += batch.length;
        } else {
          console.log(`✅ Batch ${batchNumber} saved: ${insertData.length} jobs`);
          totalSaved += insertData.length;
        }

        // Small delay between batches to avoid overwhelming the database
        if (i + batchSize < processedJobs.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (batchError) {
        console.error(`❌ Batch ${batchNumber} error:`, batchError.message);
        totalErrors += batch.length;
      }
    }

    // 4. Final summary
    console.log('\n📊 FINAL SAVE SUMMARY');
    console.log('='.repeat(50));
    console.log(`Source file: ${sourceFile}`);
    console.log(`Total scraped jobs: ${jobsToProcess.length}`);
    console.log(`Jobs processed: ${processedJobs.length}`);
    console.log(`Jobs saved to DB: ${totalSaved}`);
    console.log(`Errors: ${totalErrors}`);
    console.log(`Success rate: ${((totalSaved / processedJobs.length) * 100).toFixed(1)}%`);

    // 5. Verify database count
    console.log('\n🔍 Verifying database count...');
    const { count: totalJobs, error: countError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Failed to get job count:', countError.message);
    } else {
      console.log(`✅ Total jobs in database: ${totalJobs}`);
    }

    console.log('\n🎉 Reed job saving process completed!');
    console.log('🚀 Ready to test the complete pipeline!');

  } catch (error) {
    console.error('❌ Failed to save Reed jobs:', error.message);
  }
}

// Run the job saving process
saveReedJobsToDB().catch(error => {
  console.error('❌ Unexpected error:', error.message);
});
