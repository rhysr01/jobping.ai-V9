#!/usr/bin/env node

// Debug Muse deduplication issue
const { searchMuseJobs } = require('./scripts/muse-location-based.js');
const { normalize, dedupeKey } = require('./scrapers/utils.js');

async function debugDedup() {
    console.log('🔍 Debugging Muse deduplication...\n');
    
    const jobs = await searchMuseJobs();
    console.log(`📊 Raw jobs found: ${jobs.length}\n`);
    
    // Show some sample jobs
    console.log('📋 Sample jobs (first 5):');
    jobs.slice(0, 5).forEach((job, i) => {
        console.log(`${i+1}. ${job.title} at ${job.company}`);
        console.log(`   URL: ${job.url}`);
        console.log(`   Location: ${job.location}`);
        console.log('');
    });
    
    // Check dedupe keys
    const normalizedJobs = jobs.map(job => normalize(job, 'muse'));
    const dedupeKeys = normalizedJobs.map(job => dedupeKey(job));
    
    console.log('🔑 Sample dedupe keys (first 10):');
    dedupeKeys.slice(0, 10).forEach((key, i) => {
        console.log(`${i+1}. ${key}`);
    });
    
    // Count unique keys
    const uniqueKeys = new Set(dedupeKeys);
    console.log(`\n📊 Deduplication stats:`);
    console.log(`   Total jobs: ${jobs.length}`);
    console.log(`   Unique dedupe keys: ${uniqueKeys.size}`);
    console.log(`   Duplicates: ${jobs.length - uniqueKeys.size}`);
    console.log(`   Deduplication rate: ${((jobs.length - uniqueKeys.size) / jobs.length * 100).toFixed(1)}%`);
    
    // Find most common duplicates
    const keyCounts = {};
    dedupeKeys.forEach(key => {
        keyCounts[key] = (keyCounts[key] || 0) + 1;
    });
    
    const duplicates = Object.entries(keyCounts)
        .filter(([key, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    if (duplicates.length > 0) {
        console.log('\n🔄 Most common duplicates:');
        duplicates.forEach(([key, count]) => {
            console.log(`   ${key}: ${count} times`);
        });
    }
}

debugDedup().catch(console.error);
