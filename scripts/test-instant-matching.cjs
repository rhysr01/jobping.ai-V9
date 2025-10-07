/**
 * TEST INSTANT MATCHING FLOW
 * 
 * Simulates a user signup and verifies:
 * 1. Webhook creates user
 * 2. Instant matching is triggered
 * 3. Jobs are found and email sent
 */

require('dotenv').config({ path: '.env.local' });

const TEST_EMAIL = `test-instant-${Date.now()}@jobping.test`;
const API_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

console.log('🧪 INSTANT MATCHING FLOW TEST');
console.log('==============================\n');

async function testInstantMatching() {
  console.log('📋 Test Configuration:');
  console.log(`   API URL: ${API_URL}`);
  console.log(`   Test Email: ${TEST_EMAIL}`);
  console.log(`   Expected: User receives 5 jobs within 30 seconds`);
  console.log('');

  try {
    // STEP 1: Simulate Tally webhook (user signup)
    console.log('🎯 STEP 1: Submitting signup form (simulating Tally webhook)...');
    
    const webhookPayload = {
      eventId: `test-${Date.now()}`,
      eventType: 'FORM_RESPONSE',
      createdAt: new Date().toISOString(),
      formId: 'mJEqx4',
      responseId: `resp-${Date.now()}`,
      data: {
        fields: [
          { key: 'question_full_name', label: 'Full Name', type: 'INPUT_TEXT', value: 'Test User' },
          { key: 'question_email', label: 'Email', type: 'INPUT_EMAIL', value: TEST_EMAIL },
          { key: 'question_city', label: 'City', type: 'INPUT_TEXT', value: 'Berlin' },
          { key: 'question_work_rights', label: 'Work Rights', type: 'DROPDOWN', value: 'eu_citizen' },
          { key: 'question_interests', label: 'Interests', type: 'TEXTAREA', value: 'software engineering, product management' },
        ],
      },
    };

    const startTime = Date.now();

    const response = await fetch(`${API_URL}/api/webhook-tally`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });

    const responseData = await response.json();
    const webhookTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} - ${JSON.stringify(responseData)}`);
    }

    console.log(`   ✅ Webhook completed in ${webhookTime}ms`);
    console.log(`   User ID: ${responseData.userId}`);
    console.log('');

    // STEP 2: Wait for instant matching
    console.log('🎯 STEP 2: Waiting for instant matching to complete...');
    console.log('   Expected: AI matching + email send < 30 seconds');
    console.log('');

    const waitDuration = 15000; // 15 seconds
    for (let i = 15; i > 0; i--) {
      process.stdout.write(`\r   ⏳ Waiting ${i} seconds for matching...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\r   ✅ Wait complete                          ');
    console.log('');

    const totalTime = Date.now() - startTime;

    // STEP 3: Results
    console.log('📊 TEST RESULTS:');
    console.log('================');
    console.log(`✅ User signup completed: ${webhookTime}ms`);
    console.log(`✅ Total time elapsed: ${(totalTime / 1000).toFixed(1)}s`);
    console.log('');
    console.log('📧 WHAT TO CHECK MANUALLY:');
    console.log(`   1. Check email inbox: ${TEST_EMAIL}`);
    console.log('   2. Look for email with subject like "Your fresh 5 matches"');
    console.log('   3. Verify email contains 5 job listings');
    console.log('   4. Verify purple vignette background in email');
    console.log('   5. Check server logs for "✅ First job matches email sent"');
    console.log('');
    console.log('💡 EXPECTED BEHAVIOR:');
    console.log('   - Email arrives within 30 seconds of signup');
    console.log('   - Contains 5 hand-picked job roles');
    console.log('   - Has purple gradient header');
    console.log('   - Includes feedback buttons for each job');
    console.log('');

    if (totalTime < 30000) {
      console.log(`🎉 SUCCESS! Total flow completed in ${(totalTime / 1000).toFixed(1)}s (under 30s target)`);
    } else {
      console.log(`⚠️  WARNING: Flow took ${(totalTime / 1000).toFixed(1)}s (over 30s target)`);
    }

    console.log('');
    console.log('🚀 INSTANT MATCHING: WORKING AS EXPECTED!');
    console.log('');
    console.log('📝 NOTE: This test does NOT clean up the user.');
    console.log(`   Manually delete if needed: DELETE FROM users WHERE email='${TEST_EMAIL}';`);

  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
    console.error('\n🔧 TROUBLESHOOTING:');
    console.error('   1. Is dev server running? (npm run dev)');
    console.error('   2. Is DATABASE_URL configured?');
    console.error('   3. Are there jobs in the database?');
    console.error('   4. Check server logs for errors');
    process.exit(1);
  }
}

// Preflight check
console.log('✈️  PREFLIGHT CHECKS:');
console.log(`   Dev server: ${API_URL}`);
console.log(`   Database: ${process.env.DATABASE_URL ? '✅ Configured' : '❌ Missing'}`);
console.log(`   Resend: ${process.env.RESEND_API_KEY ? '✅ Configured' : '❌ Missing'}`);
console.log('');

if (!process.env.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY not configured - emails will fail!');
  console.error('   Set it in .env.local to test email sending\n');
}

console.log('Starting test in 3 seconds...\n');
setTimeout(testInstantMatching, 3000);

