#!/usr/bin/env node

/**
 * Test the complete signup → matching → email flow
 * This simulates what happens when a user signs up via Tally
 */

const PRODUCTION_URL = 'https://getjobping.com';
const TEST_EMAIL = 'test-' + Date.now() + '@example.com';

console.log('🧪 TESTING COMPLETE SIGNUP FLOW');
console.log('================================\n');

async function testSignupFlow() {
  try {
    // Step 1: Simulate Tally webhook payload
    console.log('📝 Step 1: Simulating Tally form submission...');
    console.log(`   Test email: ${TEST_EMAIL}`);
    
    const tallyPayload = {
      eventId: 'test-' + Date.now(),
      eventType: 'FORM_RESPONSE',
      createdAt: new Date().toISOString(),
      data: {
        responseId: 'test-response-' + Date.now(),
        submissionId: 'test-submission-' + Date.now(),
        respondentId: 'test-respondent-' + Date.now(),
        formId: 'test-form',
        formName: 'JobPing Signup',
        createdAt: new Date().toISOString(),
        fields: [
          {
            key: 'question_name',
            label: 'Full name?',
            type: 'INPUT_TEXT',
            value: 'Test User'
          },
          {
            key: 'question_email',
            label: 'Email address',
            type: 'INPUT_EMAIL',
            value: TEST_EMAIL
          },
          {
            key: 'question_location',
            label: 'What is your preferred work location(s)?',
            type: 'MULTIPLE_CHOICE',
            value: ['London', 'Paris']
          },
          {
            key: 'question_languages',
            label: 'What Language(s) can you speak to a professional level?',
            type: 'MULTIPLE_CHOICE',
            value: ['English', 'French']
          },
          {
            key: 'question_experience',
            label: 'How much professional experience do you currently have?',
            type: 'MULTIPLE_CHOICE',
            value: ['0-1 years']
          },
          {
            key: 'question_level_preference',
            label: 'Whats is your entry level preference?',
            type: 'MULTIPLE_CHOICE',
            value: ['Graduate Programme', 'Internship']
          },
          {
            key: 'question_career_path',
            label: 'Whats your target Career path?',
            type: 'MULTIPLE_CHOICE',
            value: ['Strategy & Business Design']
          },
          {
            key: 'question_roles',
            label: 'Strategy & Business Design roles?',
            type: 'CHECKBOXES',
            value: ['Strategy Analyst', 'Graduate Consultancy']
          }
        ]
      }
    };

    console.log('   ✅ Payload created\n');

    // Step 2: Call Tally webhook endpoint
    console.log('📡 Step 2: Calling Tally webhook endpoint...');
    const webhookUrl = `${PRODUCTION_URL}/api/webhook-tally`;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tallyPayload)
    });

    const responseData = await response.json();
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Response:`, responseData);

    if (!response.ok) {
      console.error('\n❌ WEBHOOK FAILED!');
      console.error('   Check Vercel logs for details');
      return;
    }

    console.log('   ✅ Webhook processed successfully\n');

    // Step 3: Wait a few seconds for async processing
    console.log('⏳ Step 3: Waiting for matching and email to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('   ✅ Wait complete\n');

    // Step 4: Check logs
    console.log('📊 Step 4: Check Vercel logs to verify:');
    console.log('   1. User created in database');
    console.log('   2. Match API called');
    console.log('   3. Matches saved to database');
    console.log('   4. Email sent with job listings');
    console.log('   5. Apply Now buttons included\n');

    console.log('✅ TEST COMPLETE!');
    console.log('================================\n');
    console.log('NEXT STEPS:');
    console.log('1. Check Vercel logs for the flow:');
    console.log(`   https://vercel.com/rhys-rowlands-projects/jobping/logs`);
    console.log('2. Check if email was sent:');
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log('3. Verify email contains:');
    console.log('   - 5 matched jobs');
    console.log('   - Job details (title, company, location, description)');
    console.log('   - Apply Now buttons with working URLs');
    console.log('   - No broken dashboard links\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nFull error:', error);
  }
}

testSignupFlow();

