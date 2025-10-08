#!/usr/bin/env node

/**
 * Test email sending on production deployment
 * This will hit your actual deployed API to test if emails work
 */

const https = require('https');

const PRODUCTION_URL = process.argv[2] || 'https://getjobping.com';

async function testProductionEmail() {
  console.log('🧪 Testing Production Email Endpoint');
  console.log('📡 URL:', PRODUCTION_URL);
  console.log('');
  
  // Test the test-email-send endpoint
  const url = `${PRODUCTION_URL}/api/test-email-send`;
  
  console.log('🔄 Calling:', url);
  
  https.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📊 Response Status:', res.statusCode);
      console.log('📧 Response Body:');
      try {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json, null, 2));
        
        if (json.success) {
          console.log('\n✅ EMAIL SENDING WORKS IN PRODUCTION!');
          console.log('📧 Email ID:', json.emailId);
          console.log('🔍 Check Resend dashboard: https://resend.com/emails');
        } else if (json.error) {
          console.log('\n❌ EMAIL SENDING FAILED');
          console.log('🔴 Error:', json.error);
          
          if (json.error.includes('RESEND_API_KEY')) {
            console.log('\n💡 FIX: Add RESEND_API_KEY to Vercel environment variables');
          } else if (json.error.includes('domain')) {
            console.log('\n💡 FIX: Verify getjobping.com in Resend dashboard');
          }
        }
      } catch (e) {
        console.log(data);
      }
    });
  }).on('error', (err) => {
    console.error('❌ Request failed:', err.message);
    console.log('\n💡 Possible issues:');
    console.log('  - Domain not deployed yet');
    console.log('  - DNS not propagated');
    console.log('  - Vercel deployment failed');
  });
}

testProductionEmail();

