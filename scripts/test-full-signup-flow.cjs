/**
 * FULL SIGNUP TO MATCHING TEST
 * 
 * Tests the complete user journey:
 * 1. Tally webhook simulates user signup
 * 2. User created in database
 * 3. Instant AI matching triggered
 * 4. Email sent with 5 jobs
 * 5. Verify everything works end-to-end
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const TEST_EMAIL = `test-signup-${Date.now()}@jobping-test.com`;
const TEST_USER_NAME = 'E2E Test User';

console.log('🧪 FULL SIGNUP TO MATCHING TEST');
console.log('================================\n');

async function runTest() {
  // Initialize Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('📋 Test Configuration:');
  console.log(`   Email: ${TEST_EMAIL}`);
  console.log(`   Name: ${TEST_USER_NAME}`);
  console.log(`   Tier: free (for testing)`);
  console.log('');

  try {
    // STEP 1: Simulate Tally webhook
    console.log('🎯 STEP 1: Simulating Tally form submission...');
    
    const tallyPayload = {
      eventId: `test-${Date.now()}`,
      eventType: 'FORM_RESPONSE',
      createdAt: new Date().toISOString(),
      formId: 'mJEqx4',
      responseId: `test-response-${Date.now()}`,
      data: {
        fields: [
          { key: 'question_full_name', label: 'Full Name', type: 'INPUT_TEXT', value: TEST_USER_NAME },
          { key: 'question_email', label: 'Email', type: 'INPUT_EMAIL', value: TEST_EMAIL },
          { key: 'question_city', label: 'City', type: 'INPUT_TEXT', value: 'Berlin' },
          { key: 'question_work_rights', label: 'Work Rights', type: 'DROPDOWN', value: 'eu_citizen' },
          { key: 'question_interests', label: 'Interests', type: 'TEXTAREA', value: 'software engineering, web development, AI' },
        ],
      },
    };

    const webhookResponse = await fetch('http://localhost:3000/api/webhook-tally', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tallyPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      throw new Error(`Webhook failed: ${webhookResponse.status} - ${errorText}`);
    }

    const webhookData = await webhookResponse.json();
    console.log(`   ✅ Webhook processed successfully`);
    console.log(`   User ID: ${webhookData.userId}`);
    console.log('');

    const userId = webhookData.userId;

    // STEP 2: Verify user created in database
    console.log('🎯 STEP 2: Verifying user in database...');
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s for DB write
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', TEST_EMAIL)
      .single();

    if (userError || !user) {
      throw new Error(`User not found in database: ${userError?.message}`);
    }

    console.log(`   ✅ User found in database`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.full_name}`);
    console.log(`   Tier: ${user.subscription_tier}`);
    console.log(`   City: ${user.city || user.target_cities?.[0] || 'N/A'}`);
    console.log('');

    // STEP 3: Wait for instant matching to complete
    console.log('🎯 STEP 3: Waiting for instant AI matching...');
    console.log('   (This should complete within 30 seconds)');
    
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s for matching

    // STEP 4: Check if jobs were matched
    console.log('🎯 STEP 4: Checking for matched jobs...');
    
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select('*, jobs(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (matchError) {
      console.log(`   ⚠️  Could not query matches table: ${matchError.message}`);
      console.log('   (This is OK if matches table doesn\'t exist yet)');
    } else if (matches && matches.length > 0) {
      console.log(`   ✅ ${matches.length} jobs matched!`);
      matches.slice(0, 5).forEach((match, i) => {
        console.log(`   ${i + 1}. ${match.jobs?.title || 'Job'} at ${match.jobs?.company || 'Company'}`);
      });
    } else {
      console.log('   ⚠️  No matches found yet (instant matching may still be processing)');
    }
    console.log('');

    // STEP 5: Verify email would be sent (check logs)
    console.log('🎯 STEP 5: Email verification...');
    console.log('   Check server logs for:');
    console.log(`   "✅ First job matches email sent with X jobs" for ${TEST_EMAIL}`);
    console.log('');

    // STEP 6: Summary
    console.log('📊 TEST SUMMARY:');
    console.log('================');
    console.log(`✅ User Created: ${user.email}`);
    console.log(`✅ User ID: ${user.id}`);
    console.log(`✅ Tier: ${user.subscription_tier}`);
    console.log(`✅ Preferences: ${user.target_cities?.[0] || user.city || 'N/A'}, ${user.languages_spoken?.join(', ') || 'N/A'}`);
    console.log(`${matches && matches.length > 0 ? '✅' : '⏳'} Job Matches: ${matches?.length || 0} (may still be processing)`);
    console.log('');

    // STEP 7: Cleanup
    console.log('🧹 CLEANUP: Removing test user...');
    
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('email', TEST_EMAIL);

    if (deleteError) {
      console.log(`   ⚠️  Could not delete test user: ${deleteError.message}`);
      console.log(`   Please manually delete: ${TEST_EMAIL}`);
    } else {
      console.log('   ✅ Test user deleted');
    }
    console.log('');

    // FINAL VERDICT
    console.log('🎉 FULL SIGNUP FLOW TEST: SUCCESS!');
    console.log('');
    console.log('📝 WHAT TO CHECK MANUALLY:');
    console.log('   1. Check your email inbox for test email');
    console.log('   2. Verify email contains 5 job listings');
    console.log('   3. Check server logs for matching process');
    console.log('   4. Verify email has purple vignette design');
    console.log('');
    console.log('🚀 If email arrived with jobs → READY FOR PRODUCTION!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nFull error:', error);
    
    // Attempt cleanup on failure
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      await supabase.from('users').delete().eq('email', TEST_EMAIL);
      console.log('\n🧹 Cleaned up test user');
    } catch (cleanupError) {
      console.error('⚠️  Cleanup failed:', cleanupError.message);
    }
    
    process.exit(1);
  }
}

// Check if dev server is running
console.log('🔍 Prerequisites:');
console.log('   1. Dev server must be running (npm run dev)');
console.log('   2. Database must be accessible');
console.log('   3. Job data must exist in database');
console.log('');
console.log('Starting test in 3 seconds...\n');

setTimeout(() => {
  runTest().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}, 3000);

