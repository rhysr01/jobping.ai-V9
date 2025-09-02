#!/usr/bin/env node

/**
 * Save Scraped Adzuna Jobs to Database
 * This script takes your scraped jobs and saves them to the database with job ingestion filtering
 * Run with: node scripts/save-scraped-jobs-to-db.js
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function saveScrapedJobsToDB() {
  console.log('🚀 Saving Scraped Adzuna Jobs to Database...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Check for scraped job files
    console.log('📁 Looking for scraped job files...');
    
    const possibleFiles = [
      'adzuna-jobs-2025-09-02.json',
      'adzuna-jobs.json',
      'reliable_scraper_results.json',
      'scraped-jobs.json',
      'jobs-data.json'
    ];

    let scrapedJobs = null;
    let sourceFile = null;

    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        try {
          const fileContent = fs.readFileSync(file, 'utf8');
          scrapedJobs = JSON.parse(fileContent);
          sourceFile = file;
          console.log(`✅ Found scraped jobs in: ${file}`);
          break;
        } catch (parseError) {
          console.log(`⚠️  Could not parse ${file}: ${parseError.message}`);
        }
      }
    }

    if (!scrapedJobs) {
      console.error('❌ No valid scraped job files found');
      console.log('💡 Make sure you have run the Adzuna scraper first');
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
    
    console.log(`\n🔍 Processing ${jobsToProcess.length} scraped jobs...`);
    
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
          title: job.title || job.job_title || 'Unknown Title',
          company: job.company || job.company_name || 'Unknown Company',
          location: job.location || job.city || 'Unknown Location',
          description: job.description || job.summary || '',
          source: 'adzuna', // Now using correct source value
          job_hash: job.id || job.job_id || `adzuna_${Date.now()}_${Math.random()}`,
          job_url: job.url || job.job_url || '',
          company_profile_url: job.company_url || '',
          posted_at: job.posted_at || job.created_at || new Date().toISOString(),
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

    console.log(`✅ Processed ${processedJobs.length} jobs for database`);
    console.log(`📊 Eligibility breakdown:`);
    console.log(`   Early-career: ${earlyCareerCount}`);
    console.log(`   Uncertain: ${uncertainCount}`);
    console.log(`   Senior: ${seniorCount}`);
    console.log(`📍 Location breakdown:`);
    console.log(`   European: ${europeanCount}`);
    console.log(`   Remote European: ${remoteCount}`);

    // 3. Save jobs to database in batches
    console.log('\n💾 Saving jobs to database...');
    
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
    console.log(`Total scraped jobs: ${scrapedJobs.length}`);
    console.log(`Jobs processed: ${processedJobs.length}`);
    console.log(`Jobs saved to DB: ${totalSaved}`);
    console.log(`Errors: ${totalErrors}`);
    console.log(`Success rate: ${((totalSaved / processedJobs.length) * 100).toFixed(1)}%`);

    // 5. Verify database count
    console.log('\n🔍 Verifying database count...');
    
    const { count: dbCount, error: countError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Failed to get database count:', countError.message);
    } else {
      console.log(`✅ Total jobs in database: ${dbCount}`);
    }

    console.log('\n🎉 Job saving process completed!');
    console.log('🚀 Ready to test the complete pipeline!');

  } catch (error) {
    console.error('❌ Process failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Job ingestion logic (same as in the test)
function processJobIngestion(job) {
  const result = {
    shouldSave: false,
    eligibility: 'uncertain',
    location: 'unknown',
    confidence: 0,
    reasons: [],
    metadata: {
      earlyCareerSignals: [],
      seniorSignals: [],
      locationSignals: [],
      careerPathSignals: []
    }
  };

  const title = job.title?.toLowerCase() || job.job_title?.toLowerCase() || '';
  const description = job.description?.toLowerCase() || job.summary?.toLowerCase() || '';
  const location = job.location?.toLowerCase() || job.city?.toLowerCase() || '';
  const combinedText = `${title} ${description}`.toLowerCase();

  // Early-career signals
  const earlyCareerKeywords = [
    'intern', 'internship', 'graduate', 'junior', 'entry-level', 'entry level',
    'trainee', 'apprentice', 'student', 'new graduate', 'recent graduate',
    'first job', 'entry position', 'starter', 'beginner', 'associate',
    '0-2 years', '0 to 2 years', 'no experience required', 'no experience needed',
    'will train', 'we will train', 'mentorship', 'learning opportunity'
  ];

  // Senior signals
  const seniorKeywords = [
    'senior', 'lead', 'principal', 'manager', 'director', 'head of',
    '10+ years', '15+ years', '20+ years', 'expert', 'specialist',
    'architect', 'consultant', 'advisor', 'strategist'
  ];

  // European locations
  const europeanLocations = [
    'london', 'uk', 'england', 'berlin', 'germany', 'paris', 'france',
    'amsterdam', 'netherlands', 'dublin', 'ireland', 'madrid', 'spain',
    'zurich', 'switzerland', 'eu remote', 'europe remote', 'emea remote'
  ];

  // Check early-career signals
  let earlyCareerScore = 0;
  for (const keyword of earlyCareerKeywords) {
    if (combinedText.includes(keyword)) {
      earlyCareerScore++;
      result.metadata.earlyCareerSignals.push(keyword);
    }
  }

  // Check senior signals
  let seniorScore = 0;
  for (const keyword of seniorKeywords) {
    if (combinedText.includes(keyword)) {
      seniorScore++;
      result.metadata.seniorSignals.push(keyword);
    }
  }

  // Check location
  let locationFound = false;
  for (const loc of europeanLocations) {
    if (location.includes(loc)) {
      locationFound = true;
      result.metadata.locationSignals.push(loc);
      break;
    }
  }

  // Determine eligibility
  if (earlyCareerScore === 0) {
    result.eligibility = 'senior';
    result.reasons.push('No early-career signals found');
  } else if (seniorScore > earlyCareerScore) {
    result.eligibility = 'senior';
    result.reasons.push('Senior signals outweigh early-career signals');
  } else if (earlyCareerScore >= 2) {
    result.eligibility = 'early-career';
    result.reasons.push('Strong early-career signals detected');
  } else {
    result.eligibility = 'uncertain';
    result.reasons.push('Mixed signals - uncertain eligibility');
  }

  // Determine location
  if (locationFound) {
    if (location.includes('remote')) {
      result.location = 'remote-europe';
    } else {
      result.location = 'europe';
    }
  } else {
    result.location = 'unknown';
    result.reasons.push('Location not clearly in Europe');
  }

  // Determine if should save
  if (result.eligibility === 'early-career' && result.location !== 'unknown') {
    result.shouldSave = true;
    result.confidence = 0.9;
    result.reasons.push('Clear early-career role in European location');
  } else if (result.eligibility === 'early-career' && result.location === 'unknown') {
    result.shouldSave = true;
    result.confidence = 0.7;
    result.reasons.push('Early-career role with uncertain location - saving for investigation');
  } else if (result.eligibility === 'uncertain' && result.location !== 'unknown') {
    result.shouldSave = true;
    result.confidence = 0.6;
    result.reasons.push('Uncertain eligibility but clear European location - saving for review');
  } else {
    result.shouldSave = false;
    result.confidence = 0.3;
    result.reasons.push('Does not meet minimum criteria for saving');
  }

  return result;
}

// Run the script
saveScrapedJobsToDB().catch(console.error);
