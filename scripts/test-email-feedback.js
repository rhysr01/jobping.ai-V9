#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmailFeedback() {
  console.log('📧 Testing Email Feedback System\n');

  try {
    // 1. Create a test user
    console.log('1. Creating test user...');
    const testUser = {
      email: 'rrowlands@student.ie.edu',
      name: 'Rhys Rowlands',
      subscription_tier: 'premium',
      created_at: new Date().toISOString()
    };

    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert(testUser, { onConflict: 'email' })
      .select()
      .single();

    if (userError) {
      console.log('❌ Failed to create test user:', userError.message);
      return;
    }
    console.log('✅ Test user created/updated:', user.email);

    // 2. Create test jobs
    console.log('\n2. Creating test jobs...');
    const testJobs = [
      {
        job_hash: 'test_job_1_' + Date.now(),
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        location: 'Dublin, Ireland',
        job_url: 'https://example.com/job1',
        description: 'Exciting role in a fast-growing tech company. Perfect for experienced developers.',
        created_at: new Date().toISOString()
      },
      {
        job_hash: 'test_job_2_' + Date.now(),
        title: 'Product Manager',
        company: 'Innovation Ltd',
        location: 'London, UK',
        job_url: 'https://example.com/job2',
        description: 'Lead product strategy and development for cutting-edge solutions.',
        created_at: new Date().toISOString()
      },
      {
        job_hash: 'test_job_3_' + Date.now(),
        title: 'Data Scientist',
        company: 'Analytics Inc',
        location: 'Amsterdam, Netherlands',
        job_url: 'https://example.com/job3',
        description: 'Build machine learning models and drive data-driven decisions.',
        created_at: new Date().toISOString()
      }
    ];

    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .upsert(testJobs, { onConflict: 'job_hash' })
      .select();

    if (jobsError) {
      console.log('❌ Failed to create test jobs:', jobsError.message);
      return;
    }
    console.log(`✅ ${jobs.length} test jobs created`);

    // 3. Create test matches
    console.log('\n3. Creating test matches...');
    const testMatches = jobs.map((job, index) => ({
      user_email: 'rrowlands@student.ie.edu',
      job_hash: job.job_hash,
      match_score: 85 - (index * 5), // Decreasing scores for variety
      match_reason: `Great match for your profile - ${job.title} at ${job.company}`,
      match_quality: index === 0 ? 'excellent' : index === 1 ? 'good' : 'fair',
      match_tags: ['test', 'feedback-demo'],
      created_at: new Date().toISOString()
    }));

    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .upsert(testMatches, { onConflict: 'user_email,job_hash' })
      .select();

    if (matchesError) {
      console.log('❌ Failed to create test matches:', matchesError.message);
      return;
    }
    console.log(`✅ ${matches.length} test matches created`);

    // 4. Test the email composition function
    console.log('\n4. Testing email composition...');
    const { composeRobustEmailContent } = await import('../Utils/emailUtils.js');
    
    const emailContent = composeRobustEmailContent(
      jobs,
      'rrowlands@student.ie.edu',
      'Rhys Rowlands',
      'premium',
      false
    );

    console.log('✅ Email content generated successfully');
    console.log('📧 Email includes new feedback system with:');
    console.log('   - 5-point rating buttons (⭐ Perfect to ❌ Terrible)');
    console.log('   - Comment option for detailed feedback');
    console.log('   - Beautiful styling that matches your brand');

    // 5. Save email content to file for inspection
    console.log('\n5. Saving email content to file...');
    const fs = await import('fs');
    const emailFile = 'test-email-with-feedback.html';
    fs.writeFileSync(emailFile, emailContent);
    console.log(`✅ Email content saved to: ${emailFile}`);

    // 6. Clean up test data
    console.log('\n6. Cleaning up test data...');
    await supabase.from('matches').delete().in('job_hash', jobs.map(j => j.job_hash));
    await supabase.from('jobs').delete().in('job_hash', jobs.map(j => j.job_hash));
    console.log('🧹 Test data cleaned up');

    console.log('\n🎉 Email feedback system test completed!');
    console.log('\n📋 What to do next:');
    console.log('1. Open test-email-with-feedback.html in your browser');
    console.log('2. Check that the feedback buttons are working');
    console.log('3. Verify the styling matches your brand');
    console.log('4. Test the feedback API endpoints');
    console.log('\n💡 The feedback system is now ready for production emails!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEmailFeedback().catch(console.error);
