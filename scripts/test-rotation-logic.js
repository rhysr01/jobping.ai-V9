#!/usr/bin/env node

/**
 * Test Rotation Logic
 * Simulates the rotation logic without running full scrapers
 */

console.log('🎯 Testing Career Path Rotation Logic\n');

// Test Adzuna daily rotation logic
console.log('📍 Adzuna Scraper - Daily Rotation Logic:');
const adzunaTracks = ['A', 'B', 'C', 'D', 'E'];
const adzunaQueries = {
  'A': 'graduate analyst - Strategy & Business Design',
  'B': 'junior consultant - Consulting & Strategy',
  'C': 'data analyst - Data & Analytics',
  'D': 'trainee manager - Operations & Management',
  'E': 'associate developer - Tech & Product'
};

// Show next 5 days of rotation
for (let day = 0; day < 5; day++) {
  const track = adzunaTracks[day % 5];
  const query = adzunaQueries[track];
  console.log(`   Day ${day + 1}: Track ${track} - ${query}`);
}
console.log('   ... continues in 5-day cycle\n');

// Test Reed per-run rotation logic
console.log('📍 Reed Scraper - Per-Run Rotation Logic:');
const reedTracks = ['A', 'B', 'C', 'D', 'E'];
const reedQueries = {
  'A': '(graduate analyst OR strategy associate) - Strategy & Business Design',
  'B': '(junior consultant OR business analyst) - Consulting & Strategy',
  'C': '(data analyst OR business intelligence) - Data & Analytics',
  'D': '(trainee manager OR operations analyst) - Operations & Management',
  'E': '(associate developer OR product analyst) - Tech & Product'
};

// Simulate 5 consecutive runs
let currentTrack = 'A'; // Starting track
for (let run = 1; run <= 5; run++) {
  const query = reedQueries[currentTrack];
  console.log(`   Run ${run}: Track ${currentTrack} - ${query}`);
  
  // Calculate next track (rotate through A->B->C->D->E->A...)
  const currentIndex = reedTracks.indexOf(currentTrack);
  const nextIndex = (currentIndex + 1) % 5;
  currentTrack = reedTracks[nextIndex];
}
console.log('   ... continues in 5-run cycle\n');

// Test the actual rotation calculation
console.log('🔄 Current Rotation State:');
const today = new Date();
const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
const adzunaCurrentTrack = adzunaTracks[dayOfYear % 5];

console.log(`   • Today: ${today.toDateString()}`);
console.log(`   • Day of Year: ${dayOfYear}`);
console.log(`   • Adzuna Current Track: ${adzunaCurrentTrack}`);
console.log(`   • Adzuna Current Query: ${adzunaQueries[adzunaCurrentTrack]}`);
console.log(`   • Reed Next Track: Will be different on next run`);

console.log('\n✅ Rotation Logic Test Complete!');
console.log('📝 The scrapers will now find different job types each time they run.');
console.log('   • Adzuna: Different career path each day');
console.log('   • Reed: Different career path each run');
console.log('   • Result: Diverse job discovery across all career paths');
