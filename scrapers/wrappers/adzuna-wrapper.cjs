#!/usr/bin/env node

// Wrapper for Adzuna scraper - standardizes output format
function parseJson(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);
    }
    return [];
  } catch (error) {
    console.warn('⚠️  Failed to parse TARGET JSON:', error.message);
    return [];
  }
}

const { recordScraperRun } = require('../shared/telemetry.cjs');
const { classifyEarlyCareer, makeJobHash } = require('../shared/helpers.cjs');

async function main() {
  const startTime = Date.now();
  try {
    process.env.INCLUDE_REMOTE = process.env.INCLUDE_REMOTE || 'false';
    const targetCities = parseJson(process.env.TARGET_CITIES);
    const targetCareerPaths = parseJson(process.env.TARGET_CAREER_PATHS);
    const targetIndustries = parseJson(process.env.TARGET_INDUSTRIES);
    const targetRoles = parseJson(process.env.TARGET_ROLES);

    const adzunaModule = require('../../scripts/adzuna-categories-scraper.cjs');
    const includeRemote = String(process.env.INCLUDE_REMOTE).toLowerCase() === 'true';
    const result = await adzunaModule.scrapeAllCitiesCategories({
      verbose: true, // Enable verbose to see filtering details
      targetCities,
      targetCareerPaths,
      targetIndustries,
      targetRoles,
      includeRemote,
    });
    
    // Save jobs to database
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Helper functions
    function localParseLocation(location) {
      const loc = String(location || '').toLowerCase();
      const isRemote = /\b(remote|work\s*from\s*home|wfh|anywhere|distributed|virtual)\b/i.test(loc);
      return { isRemote };
    }
    
    // Get all role names from signup form for matching
    const { getAllRoles } = require('../shared/roles.cjs');
    const allFormRoles = getAllRoles().map(r => r.toLowerCase());
    
    function convertToDatabaseFormat(job) {
      const { isRemote } = localParseLocation(job.location);
      const job_hash = makeJobHash(job);
      const nowIso = new Date().toISOString();
      
      const titleLower = (job.title || '').toLowerCase();
      const descLower = (job.description || '').toLowerCase();
      const fullText = `${titleLower} ${descLower}`;
      
      // Check multiple criteria for early-career classification
      const hasEarlyTerms = classifyEarlyCareer(job);
      
      // Check if title matches any role from signup form (all form roles are early-career)
      const matchesFormRole = allFormRoles.some(role => {
        const roleWords = role.split(' ').filter(w => w.length > 3); // Skip short words
        return roleWords.length > 0 && roleWords.every(word => titleLower.includes(word));
      });
      
      // More lenient: accept if it matches form role OR has early-career terms
      // We're searching with early-career queries, so trust the results more
      const isEarly = hasEarlyTerms || matchesFormRole;
      
      // Only save jobs that pass early-career filter
      if (!isEarly) {
        return null;
      }
      
      return {
        job_hash,
        title: (job.title || '').trim(),
        company: (job.company || '').trim(),
        location: (job.location || '').trim(),
        description: (job.description || '').trim(),
        job_url: (job.url || '').trim(),
        source: (job.source || 'adzuna').trim(),
        posted_at: job.posted_at || nowIso,
        categories: ['early-career'],
        work_environment: isRemote ? 'remote' : 'on-site',
        experience_required: 'entry-level',
        original_posted_date: job.posted_at || nowIso,
        last_seen_at: nowIso,
        is_active: true,
        created_at: nowIso
      };
    }
    
    // Filter remote jobs if needed
    const filteredJobs = includeRemote ? result.jobs : result.jobs.filter(j => !localParseLocation(j.location).isRemote);
    
    // Convert to database format
    const dbJobs = filteredJobs
      .map(job => convertToDatabaseFormat(job))
      .filter(job => job !== null);
    
    // Deduplicate by job_hash
    const uniqueJobs = dbJobs.reduce((acc, job) => {
      if (!acc.has(job.job_hash)) {
        acc.set(job.job_hash, job);
      }
      return acc;
    }, new Map());
    
    const finalJobs = Array.from(uniqueJobs.values());
    
    // Save in batches
    let savedCount = 0;
    let skippedCount = 0;
    const batchSize = 50;
    
    for (let i = 0; i < finalJobs.length; i += batchSize) {
      const batch = finalJobs.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('jobs')
        .upsert(batch, { onConflict: 'job_hash', ignoreDuplicates: true })
        .select('id');
      
      if (!error) {
        const inserted = Array.isArray(data) ? data.length : 0;
        const skipped = batch.length - inserted;
        savedCount += inserted;
        skippedCount += skipped;
      } else {
        console.error('❌ Batch error:', error.message);
      }
    }
    
    console.log(`✅ Adzuna: ${savedCount} jobs saved to database`);
    recordScraperRun('adzuna', savedCount, Date.now() - startTime);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Adzuna failed: ${error.message}`);
    console.error('Stack:', error.stack);
    recordScraperRun('adzuna', 0, Date.now() - startTime, 1);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };


