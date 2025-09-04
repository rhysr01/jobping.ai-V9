#!/usr/bin/env node

// 🚀 Railway Entry Point for JobPing Automation
// This bypasses Next.js build and directly runs our automation

console.log('🚀 Starting JobPing Automation on Railway...');
console.log('============================================');

// Railway provides environment variables directly - no need for dotenv
// require('dotenv').config();

// Debug: Show available environment variables
console.log('🔍 Environment Variables Check:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT || 'Not set');

// Import and start our real job runner
const RealJobRunner = require('./automation/real-job-runner.js');

console.log('✅ Real Job Runner loaded successfully');
console.log('🔄 Starting automation system...');

// The RealJobRunner will start automatically when imported
// It has its own start() method that gets called

console.log('🎯 JobPing Automation is now running on Railway!');
console.log('   - Hourly scraping cycles');
console.log('   - All 6 standardized scrapers');
console.log('   - Real database population');
console.log('   - Health monitoring');

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});
