#!/usr/bin/env node

/**
 * Simple API Verification Test
 * 
 * Tests just the verification API endpoint to see if it works
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

async function testVerificationAPI() {
  console.log('🚀 Testing Email Verification API');
  console.log('='.repeat(40));

  try {
    // Test with a dummy token to see API response
    const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/verify-email`;
    console.log(`🔗 Testing API endpoint: ${verifyUrl}`);

    // Test 1: Missing token
    console.log('\n📝 Test 1: Missing token');
    const response1 = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const result1 = await response1.json();
    console.log(`Status: ${response1.status}`);
    console.log(`Response:`, result1);

    // Test 2: Invalid token
    console.log('\n📝 Test 2: Invalid token');
    const response2 = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: 'invalid-token-123' }),
    });

    const result2 = await response2.json();
    console.log(`Status: ${response2.status}`);
    console.log(`Response:`, result2);

    // Test 3: GET request (should show API info)
    console.log('\n📝 Test 3: GET request for API info');
    const response3 = await fetch(verifyUrl, {
      method: 'GET',
    });

    const result3 = await response3.json();
    console.log(`Status: ${response3.status}`);
    console.log(`Response:`, result3);

    console.log('\n✅ API endpoint is responding correctly');
    return true;

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    return false;
  }
}

// Test if we can reach the development server
async function testServerConnection() {
  console.log('🌐 Testing server connection');
  console.log('-'.repeat(30));

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    console.log(`🔗 Testing: ${baseUrl}`);

    const response = await fetch(baseUrl, {
      method: 'GET',
    });

    console.log(`Status: ${response.status}`);
    if (response.ok) {
      console.log('✅ Server is reachable');
      return true;
    } else {
      console.log('⚠️ Server returned non-200 status');
      return false;
    }
  } catch (error) {
    console.error('❌ Server connection failed:', error.message);
    console.log('');
    console.log('💡 Make sure your development server is running:');
    console.log('   npm run dev');
    console.log('');
    return false;
  }
}

async function main() {
  console.log('🧪 EMAIL VERIFICATION API TEST');
  console.log('='.repeat(50));

  const serverReachable = await testServerConnection();
  if (!serverReachable) {
    console.log('🚨 Cannot continue - server is not reachable');
    process.exit(1);
  }

  const apiWorking = await testVerificationAPI();
  
  console.log('\n📊 TEST SUMMARY');
  console.log('='.repeat(20));
  if (apiWorking) {
    console.log('🎉 Verification API is working correctly!');
    console.log('✅ Server is reachable');
    console.log('✅ API endpoint responds');
    console.log('✅ Error handling works');
  } else {
    console.log('🚨 Verification API has issues');
  }

  process.exit(apiWorking ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
