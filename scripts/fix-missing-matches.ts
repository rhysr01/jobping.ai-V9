#!/usr/bin/env tsx
/**
 * Script to manually create matches for a free tier user who doesn't have matches
 * This can be used to fix users who signed up but matches weren't created
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
import { createConsolidatedMatcher } from '../Utils/consolidatedMatchingV2';
import { preFilterJobsByUserPreferencesEnhanced } from '../Utils/matching/preFilterJobs';
import { getDatabaseCategoriesForForm } from '../Utils/matching/categoryMapper';
import { distributeJobsWithDiversity } from '../Utils/matching/jobDistribution';
import { getCountryFromCity, getCountryVariations } from '../lib/countryFlags';

const userEmail = process.argv[2] || 'tararowlands2023@gmail.com';

async function fixMatches() {
  const supabase = getDatabaseClient();
  
  console.log('='.repeat(80));
  console.log('FIX MISSING MATCHES FOR FREE TIER USER');
  console.log('='.repeat(80));
  console.log(`\n📧 User Email: ${userEmail}\n`);
  
  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', userEmail)
    .eq('subscription_tier', 'free')
    .single();
  
  if (userError || !user) {
    console.error('❌ User not found:', userError);
    return;
  }
  
  console.log('✅ User found:');
  console.log(`   Name: ${user.full_name}`);
  console.log(`   Cities: ${JSON.stringify(user.target_cities)}`);
  console.log(`   Career Path: ${user.career_path}`);
  console.log(`   Entry Level: ${user.entry_level_preference}`);
  
  // Check existing matches
  const { data: existingMatches } = await supabase
    .from('matches')
    .select('job_hash')
    .eq('user_email', userEmail);
  
  console.log(`\n📊 Existing matches: ${existingMatches?.length || 0}`);
  
  if (existingMatches && existingMatches.length > 0) {
    console.log('⚠️  User already has matches. Deleting them to recreate...');
    // Delete existing matches to recreate
    await supabase
      .from('matches')
      .delete()
      .eq('user_email', userEmail);
    console.log('✅ Deleted existing matches');
  }
  
  // Get target cities
  let targetCities: string[] = [];
  if (user.target_cities) {
    if (Array.isArray(user.target_cities)) {
      targetCities = user.target_cities;
    } else if (typeof user.target_cities === 'string') {
      try {
        targetCities = JSON.parse(user.target_cities);
      } catch {
        targetCities = [user.target_cities];
      }
    }
  }
  
  // Build city variations
  const cityVariations = new Set<string>();
  if (targetCities.length > 0) {
    targetCities.forEach(city => {
      cityVariations.add(city);
      cityVariations.add(city.toUpperCase());
      cityVariations.add(city.toLowerCase());
    });
  }
  
  // Get career path categories
  let careerPathCategories: string[] = [];
  if (user.career_path) {
    careerPathCategories = getDatabaseCategoriesForForm(user.career_path);
  }
  
  // Fetch jobs - be less restrictive to find more jobs
  console.log('\n🔍 Fetching jobs...');
  let query = supabase
    .from('jobs')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'active')
    .is('filtered_reason', null);
  
  // Filter by city first (most important)
  if (cityVariations.size > 0) {
    query = query.in('city', Array.from(cityVariations));
  }
  
  // DON'T filter by career path at DB level - too restrictive
  // Let pre-filtering handle career path matching for better results
  
  // Filter for early-career roles (optional - can be removed if too restrictive)
  query = query
    .or('is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}')
    .order('id', { ascending: false })
    .limit(2000);
  
  const { data: allJobs, error: jobsError } = await query;
  
  if (jobsError || !allJobs || allJobs.length === 0) {
    console.error('❌ No jobs found:', jobsError);
    return;
  }
  
  console.log(`✅ Found ${allJobs.length} jobs`);
  
  // Skip pre-filtering - let AI do semantic matching
  console.log('\n🔍 Skipping pre-filtering - using AI semantic matching...');
  const userPrefs = {
    email: user.email,
    target_cities: targetCities,
    career_path: user.career_path ? [user.career_path] : [],
    entry_level_preference: user.entry_level_preference,
    work_environment: user.work_environment,
    languages_spoken: user.languages_spoken || [],
    roles_selected: user.roles_selected || [],
    company_types: user.company_types || [],
    visa_status: user.visa_status,
    professional_expertise: user.career_path || '',
  };
  
  // Use all jobs directly - AI will handle semantic matching
  const preFilteredJobs = allJobs || [];
  
  console.log(`✅ Using ${preFilteredJobs.length} jobs for AI matching (no pre-filtering)`);
  
  if (preFilteredJobs.length === 0) {
    console.error('❌ No jobs found');
    return;
  }
  
  // Run AI matching
  console.log('\n🤖 Running AI matching...');
  const matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);
  
  const sampleSize = Math.min(50, preFilteredJobs.length);
  const jobsForAI = preFilteredJobs.slice(0, sampleSize);
  
  let matchResult;
  try {
    matchResult = await matcher.performMatching(jobsForAI, userPrefs as any);
  } catch (error) {
    console.error('❌ AI matching failed:', error);
    return;
  }
  
  if (!matchResult || !matchResult.matches || matchResult.matches.length === 0) {
    console.error('❌ No matches returned from AI');
    return;
  }
  
  console.log(`✅ AI matched ${matchResult.matches.length} jobs`);
  
  // Get matched jobs with full data
  const matchedJobsRaw: any[] = [];
  for (const m of matchResult.matches) {
    const job = preFilteredJobs.find((j: any) => j.job_hash === m.job_hash);
    if (job) {
      matchedJobsRaw.push({
        ...job,
        match_score: m.match_score,
        match_reason: m.match_reason,
      });
    }
  }
  
  // Sort and filter by quality
  matchedJobsRaw.sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0));
  const qualityThreshold = 60;
  const highQualityJobs = matchedJobsRaw.filter((job: any) => {
    const score = job.match_score || 0;
    return score >= qualityThreshold;
  });
  
  const jobsForDistribution = highQualityJobs.length >= 5 ? highQualityJobs : matchedJobsRaw;
  
  // Distribute jobs
  let targetWorkEnvironments: string[] = [];
  if (user.work_environment) {
    if (Array.isArray(user.work_environment)) {
      targetWorkEnvironments = user.work_environment;
    } else if (typeof user.work_environment === 'string') {
      targetWorkEnvironments = user.work_environment.split(',').map((env: string) => env.trim()).filter(Boolean);
    }
  }
  
  const distributedJobs = distributeJobsWithDiversity(jobsForDistribution as any[], {
    targetCount: 5,
    targetCities: targetCities,
    maxPerSource: 2,
    ensureCityBalance: true,
    targetWorkEnvironments: targetWorkEnvironments,
    ensureWorkEnvironmentBalance: targetWorkEnvironments.length > 0
  });
  
  const finalJobs = distributedJobs.slice(0, 5);
  
  console.log(`\n✅ Final jobs to save: ${finalJobs.length}`);
  
  // Filter valid jobs
  const validJobs = finalJobs.filter((job: any) => job && job.job_hash);
  
  if (validJobs.length === 0) {
    console.error('❌ No valid jobs (all missing job_hash)');
    return;
  }
  
  // Create match records
  const matchRecords = validJobs.map((job: any) => {
    let normalizedScore = 0.75;
    if (job.match_score !== undefined && job.match_score !== null) {
      if (job.match_score > 1) {
        normalizedScore = job.match_score / 100;
      } else {
        normalizedScore = job.match_score;
      }
    }
    
    return {
      user_email: userEmail,
      job_hash: String(job.job_hash),
      match_score: normalizedScore,
      match_reason: job.match_reason || 'AI matched',
      match_quality: 'good', // Use simple value that should pass constraint
      match_tags: user.career_path ? [user.career_path] : [], // Convert to array
      matched_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
  });
  
  // Save matches
  console.log('\n💾 Saving matches...');
  const { data: savedMatches, error: matchesError } = await supabase
    .from('matches')
    .upsert(matchRecords, { onConflict: 'user_email,job_hash' })
    .select();
  
  if (matchesError) {
    console.error('❌ Failed to save matches:', matchesError);
    return;
  }
  
  if (!savedMatches || savedMatches.length === 0) {
    console.error('❌ No matches saved');
    return;
  }
  
  console.log(`\n✅ Successfully saved ${savedMatches.length} matches!`);
  console.log('   Job hashes:', savedMatches.map((m: any) => m.job_hash).join(', '));
  
  console.log('\n' + '='.repeat(80));
  console.log('COMPLETE');
  console.log('='.repeat(80));
}

fixMatches().catch(console.error);

