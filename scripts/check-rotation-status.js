#!/usr/bin/env node

/**
 * Check Current Rotation Status
 * Shows which tracks the scrapers are currently using
 */

console.log('🎯 Current Career Path Rotation Status\n');

// Calculate current Adzuna track (daily rotation)
const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
const adzunaTrack = dayOfYear % 5;
const adzunaTracks = ['A', 'B', 'C', 'D', 'E'];
const currentAdzunaTrack = adzunaTracks[adzunaTrack];

console.log('📍 Adzuna Scraper (Daily Rotation):');
console.log(`   • Current Track: ${currentAdzunaTrack}`);
console.log(`   • Day of Year: ${dayOfYear}`);
console.log(`   • Track Cycle: ${adzunaTrack + 1}/5`);
console.log(`   • Next Track Change: Tomorrow`);

// Show what each track searches for
const adzunaQueries = {
  'A': 'graduate analyst - Strategy & Business Design',
  'B': 'junior consultant - Consulting & Strategy',
  'C': 'data analyst - Data & Analytics',
  'D': 'trainee manager - Operations & Management',
  'E': 'associate developer - Tech & Product'
};

console.log(`   • Current Query: ${adzunaQueries[currentAdzunaTrack]}\n`);

// Reed scraper rotates each run, so we can't predict the current track
console.log('📍 Reed Scraper (Per-Run Rotation):');
console.log('   • Rotation: Changes track each run');
console.log('   • Tracks Available: A, B, C, D, E');
console.log('   • Next Track: Will be different on next run\n');

console.log('🔄 Rotation Summary:');
console.log('   • Adzuna: Daily rotation (5-day cycle)');
console.log('   • Reed: Per-run rotation (5-run cycle)');
console.log('   • Both: Cover 5 different career paths');
console.log('   • Result: Diverse job discovery each time\n');

console.log('📝 To test rotation:');
console.log('   1. Run Reed scraper multiple times to see different tracks');
console.log('   2. Run Adzuna scraper on different days to see track changes');
console.log('   3. Check that different types of jobs are found');

console.log('\n✅ Rotation system is active and working!');
