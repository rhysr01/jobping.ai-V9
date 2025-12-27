#!/usr/bin/env tsx
/**
 * Debug Free Signup Flow
 * 
 * Helps diagnose why free signup isn't generating matches
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
try {
  dotenv.config({ path: envPath });
  console.log('✅ Loaded environment variables from .env.local\n');
} catch (error) {
  console.warn('⚠️  Could not load .env.local, using process.env\n');
}

import { getDatabaseClient } from '../Utils/databasePool';

const testEmail = process.argv[2] || `test-debug-${Date.now()}@testjobping.com`;

console.log('🔍 Debugging Free Signup Flow\n');
console.log(`📧 Test Email: ${testEmail}\n`);

async function debug() {
  const supabase = getDatabaseClient();

  console.log('='.repeat(60));
  console.log('STEP 1: Check if user exists');
  console.log('='.repeat(60));
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', testEmail)
    .eq('subscription_tier', 'free')
    .maybeSingle();
  
  if (userError) {
    console.log('❌ Error checking user:', userError);
    return;
  }
  
  if (!user) {
    console.log('⚠️  User does not exist - need to sign up first');
    console.log('   Run: curl -X POST http://localhost:3000/api/signup/free \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"email":"' + testEmail + '","full_name":"Test User","preferred_cities":["Prague"],"career_paths":["finance"],"entry_level_preferences":["graduate"]}\'');
    return;
  }
  
  console.log('✅ User exists:', {
    id: user.id,
    email: user.email,
    subscription_tier: user.subscription_tier,
    target_cities: user.target_cities,
    career_path: user.career_path,
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('STEP 2: Check for matches');
  console.log('='.repeat(60));
  
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('*')
    .eq('user_email', testEmail);
  
  if (matchesError) {
    console.log('❌ Error fetching matches:', matchesError);
    return;
  }
  
  console.log(`📊 Found ${matches?.length || 0} matches`);
  
  if (!matches || matches.length === 0) {
    console.log('⚠️  No matches found! Checking why...\n');
    
    console.log('='.repeat(60));
    console.log('STEP 3: Check if jobs exist for user cities');
    console.log('='.repeat(60));
    
    const cities = Array.isArray(user.target_cities) 
      ? user.target_cities 
      : typeof user.target_cities === 'string' 
        ? [user.target_cities] 
        : [];
    
    console.log('User cities:', cities);
    
    if (cities.length === 0) {
      console.log('❌ No cities selected!');
      return;
    }
    
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title, company, city, is_active, status')
      .in('city', cities)
      .eq('is_active', true)
      .eq('status', 'active')
      .is('filtered_reason', null)
      .limit(10);
    
    if (jobsError) {
      console.log('❌ Error fetching jobs:', jobsError);
      return;
    }
    
    console.log(`📊 Found ${jobs?.length || 0} active jobs in user cities`);
    
    if (!jobs || jobs.length === 0) {
      console.log('❌ No jobs found for cities:', cities);
      console.log('\n💡 Possible issues:');
      console.log('   1. No jobs in database for these cities');
      console.log('   2. All jobs are inactive or filtered');
      console.log('   3. City names don\'t match (case-sensitive)');
      
      // Check what cities exist
      const { data: allCities } = await supabase
        .from('jobs')
        .select('city')
        .eq('is_active', true)
        .eq('status', 'active')
        .limit(100);
      
      const uniqueCities = [...new Set(allCities?.map(j => j.city).filter(Boolean) || [])];
      console.log('\n📋 Available cities in database:', uniqueCities.slice(0, 20));
      return;
    }
    
    console.log('\n✅ Jobs exist! The issue might be:');
    console.log('   1. AI matching failed');
    console.log('   2. Pre-filtering removed all jobs');
    console.log('   3. Matches were created but not saved');
    console.log('   4. OPENAI_API_KEY not set or invalid');
    
    // Check OpenAI key
    console.log('\n' + '='.repeat(60));
    console.log('STEP 4: Test OpenAI API Key');
    console.log('='.repeat(60));
    
    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ OPENAI_API_KEY not set! AI matching will fail.');
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      console.log('✅ OPENAI_API_KEY is set');
      console.log(`   Length: ${apiKey.length} chars`);
      console.log(`   Starts with: ${apiKey.substring(0, 7)}...`);
      
      // Test the API key
      console.log('\n🔄 Testing OpenAI API call...');
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: apiKey.trim() });
        
        const startTime = Date.now();
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Say "API key is working" if you can read this.' }
          ],
          max_tokens: 20,
        });
        
        const responseTime = Date.now() - startTime;
        const message = response.choices[0]?.message?.content || 'No response';
        
        console.log('✅ OpenAI API key is WORKING!');
        console.log(`   Response time: ${responseTime}ms`);
        console.log(`   Model: ${response.model}`);
        console.log(`   Response: ${message}`);
        console.log(`   Tokens used: ${response.usage?.total_tokens || 'N/A'}`);
      } catch (error: any) {
        console.log('❌ OpenAI API test FAILED!');
        console.log(`   Error: ${error.message || error}`);
        
        if (error.status === 401) {
          console.log('\n💡 This means:');
          console.log('   - API key is invalid or expired');
          console.log('   - Check your OpenAI account billing/credits');
        } else if (error.status === 429) {
          console.log('\n💡 This means:');
          console.log('   - Rate limit exceeded');
          console.log('   - Wait a few minutes and try again');
        }
      }
    }
  } else {
    console.log('\n✅ Matches found! Checking job details...\n');
    
    const jobHashes = matches.map(m => m.job_hash).filter(Boolean);
    
    const { data: matchedJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title, company, city, job_hash')
      .in('job_hash', jobHashes)
      .eq('is_active', true);
    
    if (jobsError) {
      console.log('❌ Error fetching matched jobs:', jobsError);
    } else {
      console.log(`📊 Found ${matchedJobs?.length || 0} active jobs for matches`);
      
      if (matchedJobs && matchedJobs.length < matches.length) {
        console.log(`⚠️  ${matches.length - matchedJobs.length} matches point to inactive/deleted jobs`);
      }
      
      matchedJobs?.forEach((job, i) => {
        console.log(`   ${i + 1}. ${job.title} at ${job.company} (${job.city})`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('STEP 5: Check API endpoint');
  console.log('='.repeat(60));
  
  console.log('Test the matches API:');
  console.log(`curl http://localhost:3000/api/matches/free \\`);
  console.log(`  -H "Cookie: free_user_email=${testEmail}"`);
}

debug().catch(console.error);

